# Operational Intelligence Upgrade Plan

Date: 2026-05-16  
POC: AdaL  
TL;DR: Implement the 5 requested capabilities in four controlled phases: (1) data model + telemetry foundation, (2) predictive analytics/reorder engine, (3) real persistent offline sync queue, (4) admin intelligence surfaces and role-gated activity insights. Keep dashboard static, preserve admin/staff permission boundaries, and migrate persisted data safely.

## Scope (Requested)

1. AI Reorder Recommendation System (predictive forecasting)
2. Real Offline Sync Queue (persistent, no simulation)
3. Daily Manager Operational Summary
4. Advanced Inventory Intelligence (trend + cost)
5. Admin-only Employee Activity Feed + manager insights

---

## Current-State Notes (from codebase)

- App state and persistence are centralized in `src/hooks/useAppState.ts` and `src/lib/storage.ts`.
- Sync behavior is currently simulated (`src/lib/sync.ts`).
- Analytics utilities exist (`src/lib/analytics.ts`) but are lightweight, mostly static derivations.
- Dashboard is now static/fixed (no customization paths in `useAppState` runtime anymore).
- Role model is `admin | staff`; assignment changes are admin-only, staff update own status/notes.

---

## Design Principles

- Minimal blast radius: add modules and wire them in, avoid broad rewrites.
- Backward-compatible persistence migration for existing local data.
- Deterministic outputs for forecasting (no external model dependency required for core logic).
- Strict role-gating: sensitive/manager insights visible only to admin.
- Idempotent sync semantics with retry + status tracking.

---

## Phase Plan

## Phase 1 — Data & Telemetry Foundation (Required for all other phases)

### Why
Forecasting, trend analysis, and manager summaries require richer historical signals than current state carries.

### Files to update
- `src/types/inventory.ts`
- `src/hooks/useAppState.ts`
- `src/lib/storage.ts`
- `src/data/seedInventory.ts` (defaults for new fields)

### Changes
1. Extend `InventoryItem` with intelligence fields:
   - `costPerUnit?: number`
   - `supplierLeadTimeDays?: number`
   - `reorderPoint?: number`
   - `safetyStock?: number`
2. Add structured usage telemetry:
   - New `UsageEvent` type (itemId, deltaUsed, timestamp, source)
   - State slice `usageEvents: UsageEvent[]`
3. Enrich activity entries for manager insights:
   - actor metadata (`actorId`, `actorRole`)
   - optional category/severity (`inventory | task | sync | map`, `low | med | high`)
4. Storage migration:
   - Version persisted shape and default missing fields on load.

### Risks
- Persisted data shape mismatch.
- Increased local state size.

### Mitigation
- Defensive migration in `loadState` (nullable checks + defaults).
- Bounded event history (retain recent N days window).

---

## Phase 2 — Predictive Procurement + Advanced Inventory Intelligence

### Why
Delivers item (1) and major parts of (4) directly from usage telemetry.

### New modules
- `src/lib/procurement.ts` (forecast + reorder recommendation engine)
- `src/lib/intelligence.ts` (WoW deltas, inefficiency, cost impact analysis)

### Forecasting model (MANDATORY hybrid)
For each tracked item:
1. Short-term velocity (last 48h weighted heavily)
2. Weekly average daily usage baseline
3. Week-over-week trend multiplier
4. Day-of-week adjustment factor (weekend/weekday)
5. Runway:
   - `days_remaining = current_stock / avg_daily_usage`
   - `adjusted_days_remaining = days_remaining / demand_trend_multiplier`

### Output schema (always returned)
- `daysUntilStockout`
- `expectedStockoutWindow` (e.g., Saturday afternoon)
- `confidence` (`high | medium | low`)
- `suggestedReorderQty`
- `reasoningSummary`
- diagnostics:
  - weekly change %
  - 48h spike %
  - cost impact estimate
  - inefficiency signal (e.g., lids vs beverage volume divergence)

### Files to integrate
- `src/hooks/useAppState.ts` (derive recommendations/intelligence)
- `src/pages/DashboardPage.tsx` (replace low-stock static list with recommendations panel)
- Optional component additions:
  - `src/components/dashboard/ReorderRecommendationsCard.tsx`
  - `src/components/dashboard/InventoryIntelligenceCard.tsx`

### Risks
- Noisy predictions with sparse early telemetry.
- CPU overhead from recomputation.

### Mitigation
- Confidence downgrades when sample size is low.
- Memoized calculations + bounded history window.

---

## Phase 3 — Real Offline Sync Queue (No simulation)

### Why
Delivers item (2) with durability and retry semantics.

### New module
- `src/lib/syncQueue.ts`

### Queue shape
```ts
type SyncQueueEntry = {
  id: string;
  type: "inventory_update" | "employee_update" | "task_update" | "stock_adjustment" | "map_update";
  payload: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
  status: "pending" | "failed" | "synced";
};
```

### Behavior
- Offline:
  - enqueue action instead of network call
  - UI status: `Offline + Queued (X items)`
- Online:
  - replay queue FIFO
  - per-item idempotency key = queue entry `id`
  - exponential backoff for failures
  - mark `synced` on success
- Replace simulated timers in `src/lib/sync.ts` usage paths with queue processor.

### State/UI integration
- `useAppState.ts`: queue selectors + replay trigger on reconnect.
- Sync indicator variants:
  - `Online + Synced`
  - `Online + Syncing (X items)`
  - `Offline + Queued (X items)`
  - `Error (retry available)`

### Risks
- Duplicate execution across retries.
- Queue corruption on abrupt close.

### Mitigation
- Idempotency token propagation.
- Atomic persistence writes and status transitions.

---

## Phase 4 — Daily Ops Summary + Admin Activity Intelligence

### Why
Delivers items (3) and (5) with role-safe visibility.

### New modules/components
- `src/lib/dailyOps.ts` (daily report builder)
- `src/components/admin/DailyOpsReport.tsx`
- `src/components/admin/AdminActivityInsights.tsx`

### Daily report sections (auto-generated)
A. Summary overview:
- total orders processed proxy
- total inventory consumed
- fastest-growing usage
- slowest-moving inventory

B. Key anomalies:
- spikes/drops, forecast misses, demand shifts

C. Operational risk forecast:
- 24–72h stockout risks
- supply pressure points
- cost inefficiencies

D. Action items:
- suggested reorders
- staffing adjustments (correlated demand spikes)
- inventory redistribution suggestions

### Admin-only activity feed rules
- Full team activity insights visible only for `admin`.
- Staff can submit updates but only view self-relevant entries.
- Structured insights:
  - task completion speed vs team average
  - idle gap patterns during peaks
  - top performer signal

### Files to touch
- `src/pages/ResponsibilitiesPage.tsx` (role-filtered visibility)
- `src/pages/DashboardPage.tsx` (admin cards/sections)
- `src/hooks/useAppState.ts` (role-filtered selectors and insights derivation)

### Risks
- Perceived surveillance concerns.
- Role leakage bugs.

### Mitigation
- Explicit UX copy: optimization/workload balancing.
- Centralized role guards in selectors and components.

---

## Alternatives Considered (and rejected)

1. External AI API for core forecasting  
   Rejected for baseline implementation because deterministic local model is faster, cheaper, and testable offline.

2. Full migration to IndexedDB immediately  
   Deferred. Current app can ship with localStorage + bounded queue/events first. IndexedDB can be phase 2 hardening if size limits are reached.

3. Big-bang rewrite of `useAppState.ts`  
   Rejected to minimize regression risk. Prefer additive modules + targeted wiring.

---

## Validation Strategy

1. Type/build validation:
- `npm run build`

2. Behavioral checks:
- offline enqueue + reconnect replay order
- retry + backoff + failed status transitions
- idempotency duplicate-prevention test path
- admin/staff visibility checks for activity insights
- forecast output always includes required fields

3. Regression checks:
- existing responsibilities permissions unchanged
- static dashboard layout remains fixed

---

## Proposed Execution Order (Implementation)

1. Phase 1 schema + migration + telemetry wiring
2. Phase 2 procurement/intelligence engine + dashboard cards
3. Phase 3 persistent sync queue + upgraded sync indicator
4. Phase 4 daily ops/admin insights surfaces + role gating
5. Final build validation and targeted smoke tests

---

## Approval Gate

If approved, implementation will proceed phase-by-phase with build verification after each phase and no unrelated refactors.
