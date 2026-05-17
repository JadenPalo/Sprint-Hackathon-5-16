# Operational Dashboard Extension Plan

**Date:** 2026-05-16  
**POC:** AdaL  
**TL;DR:** Extend the current React + localStorage architecture non-destructively by introducing independent zone responsibilities, employee payroll tracking, per-user dashboard layout persistence, and a full-width brand header. Preserve all existing inventory and map behavior by adding fields/types/state transitions and compatibility hydration defaults (no rewrites).

---

## 1) Scope and constraints

### In scope
1. Independent zone responsibilities (per-responsibility notes)
2. Employee payroll tracking + dashboard employee stats/filtering
3. Dashboard customization (reorder + hide/show widgets + per-user persistence)
4. Full-width branding header persistent across app

### Hard constraints
- Preserve existing inventory system behavior and UI flows
- Preserve existing map/zone editing behavior
- Do not rebuild existing systems
- Maintain localStorage backward compatibility
- Follow current architecture (`useAppState` store pattern, typed models in `src/types/inventory.ts`)

---

## 2) Current architecture summary (for implementation decisions)

- Single state store in `src/hooks/useAppState.ts`
- Typed models in `src/types/inventory.ts`
- Persistence and hydration in `src/lib/storage.ts`
- Dashboard composition in `src/pages/DashboardPage.tsx`
- Responsibilities UI in `src/pages/ResponsibilitiesPage.tsx`
- Global shell/header in `src/components/layout/AppShell.tsx` and `src/components/layout/Header.tsx`
- No backend API layer; “API changes” should be implemented as typed store actions/service boundaries compatible with future real endpoints

**Why this matters:** Implementing as store actions + persistence extensions keeps changes consistent with existing app design and avoids introducing an incompatible pseudo-backend.

---

## 3) Data model design (non-breaking)

## 3.1 New/extended interfaces (`src/types/inventory.ts`)

### New: `ZoneResponsibility`
- `id: string`
- `zoneId: string`
- `title: string`
- `description: string`
- `assignedPersonId?: string`
- `status: "active" | "pending" | "completed"`
- `notes: string`  ← per responsibility (critical)
- `createdAt: string`

### Extend existing employee model (currently `EmployeeResponsibility`)
Add:
- `isOnPayroll: boolean`
- `assignedResponsibilityIds: string[]` (enables multi-responsibility per person)

Keep existing:
- `assignedZoneIds: string[]`

### New: Dashboard layout types
- `DashboardWidgetId` union for known widgets:
  - `"inventory-summary" | "zone-map-preview" | "employee-stats" | "active-responsibilities" | "alerts-notifications"`
- `DashboardWidgetLayout`:
  - `widgetId: DashboardWidgetId`
  - `visible: boolean`
  - `order: number`
  - `position?: { x: number; y: number; w: number; h: number }` (for future true grid coordinates)
- `UserDashboardLayout`:
  - `userId: string` (mapped to current role/user identity primitive)
  - `widgets: DashboardWidgetLayout[]`
  - `updatedAt: string`

### Zone extension strategy
- Keep `Zone` intact unless field removal is safe
- If zone-level shared responsibility notes currently exist, deprecate in UI and hydration; do not hard-delete immediately to avoid old-state breakage

**Why this approach:** additive schema avoids breaking existing serialized state and enables gradual deprecation of shared notes.

---

## 4) Persistence & migration strategy (`src/lib/storage.ts`)

## 4.1 Extend persisted root state
Add persisted collections/fields:
- `zoneResponsibilities: ZoneResponsibility[]`
- employee added fields defaults:
  - `isOnPayroll ?? true`
  - `assignedResponsibilityIds ?? []`
- `dashboardLayouts: UserDashboardLayout[]` OR `dashboardLayoutByUser` map
- preserve any existing `responsibilityNotes` on employee for migration fallback only

## 4.2 Compatibility hydration rules
On `loadState()`:
- If no responsibilities found → default to `[]`
- If old employee lacks `isOnPayroll` → default `true`
- If old employee lacks `assignedResponsibilityIds` → default `[]`
- If legacy employee-level `responsibilityNotes` exists and no new responsibilities exist:
  - keep old field untouched (read-compatible)
  - do not inject fake responsibilities automatically unless explicitly requested
- If no saved dashboard layout for current user → initialize default widget list + order + visible=true

**Risk avoided:** runtime crashes or blank dashboard when older localStorage schema loads.

---

## 5) Store/API surface changes (`src/hooks/useAppState.ts`)

Implement typed actions that serve as internal API endpoints equivalent:

### Employee module actions
- `addEmployee(employeeInput)`
- `updateEmployee(employeeId, patch)`
- `getEmployeeStats()` → `{ total, onPayroll, offPayroll }`
- `listEmployees(filter?: { isOnPayroll?: boolean })`

### Responsibility module actions
- `createResponsibility(zoneId, input)`
- `updateResponsibility(responsibilityId, patch)`
- `assignResponsibility(responsibilityId, employeeId?)`
- `listResponsibilities(filter?: { zoneId?: string; assignedPersonId?: string; status?: ... })`

### Dashboard layout module actions
- `getDashboardLayout(userId)`
- `saveDashboardLayout(userId, widgets)`
- `moveDashboardWidget(userId, widgetId, targetOrder)`
- `setDashboardWidgetVisibility(userId, widgetId, visible)`

### API route mapping (future backend parity)
Documented mapping (store action names align to requested endpoints):
- `/employees` → employee list/create/update actions
- `/employees/stats` → `getEmployeeStats`
- `/responsibilities` → create/list/update responsibilities
- `/responsibilities/assign` → `assignResponsibility`
- `/dashboard/layout` → `getDashboardLayout`
- `/dashboard/layout/save` → `saveDashboardLayout`

**Why this approach:** satisfies requested API surface without introducing a contradictory network backend in a client-only app.

---

## 6) UI implementation plan

## 6.1 Dashboard customization (`src/pages/DashboardPage.tsx` + new components)
- Replace static hardcoded widget rendering with widget registry map:
  - `widgetId -> component`
- Render widgets sorted by current user layout order
- Add drag-and-drop reordering using existing native DnD pattern from map pages
- Add widget visibility toggle menu

### New components
1. `src/components/dashboard/DashboardWidgetContainer.tsx`
   - Common draggable wrapper + header controls
2. `src/components/dashboard/DashboardLayoutControls.tsx`
   - Show/hide toggles for each widget
3. `src/components/dashboard/widgets/EmployeeStatsWidget.tsx`
4. `src/components/dashboard/widgets/ActiveResponsibilitiesWidget.tsx`
5. `src/components/dashboard/widgets/ZoneMapPreviewWidget.tsx` (reuse existing map summary data)
6. `src/components/dashboard/widgets/AlertsNotificationsWidget.tsx` (reuse activity/sync alerts)

## 6.2 Responsibilities UI (`src/pages/ResponsibilitiesPage.tsx`)
- Replace shared-notes presentation with:
  - Zone responsibility list
  - Expandable responsibility cards
  - Each expanded card shows own `notes`
- Add assignment control per responsibility (`assignedPersonId`)
- Preserve ability for one employee to hold many responsibilities across zones

### New component
- `src/components/responsibilities/ResponsibilityCard.tsx`

## 6.3 Employee management UI
- Add panel (initially in dashboard to minimize nav churn):
  - total / on payroll / off payroll
  - payroll filter dropdown/tabs
- Optionally add standalone `EmployeesPage` only if needed after scoped review

### New component
- `src/components/employees/EmployeePanel.tsx`

## 6.4 Header full-width branding
- Update shell/header classes so header spans viewport width edge-to-edge
- Keep existing controls (role toggle, sync status) and avoid layout regressions
- Ensure content area can remain constrained while header is not

Likely touched:
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Header.tsx`

---

## 7) Exact file change set (proposed minimal)

## Modify
1. `src/types/inventory.ts`
2. `src/lib/storage.ts`
3. `src/hooks/useAppState.ts`
4. `src/pages/DashboardPage.tsx`
5. `src/pages/ResponsibilitiesPage.tsx`
6. `src/components/layout/Header.tsx`
7. `src/components/layout/AppShell.tsx`
8. `src/App.tsx` (only if wiring additional panel/page route state is required)
9. `src/components/layout/BottomNav.tsx` (only if new page is added)

## Create
1. `src/components/dashboard/DashboardWidgetContainer.tsx`
2. `src/components/dashboard/DashboardLayoutControls.tsx`
3. `src/components/dashboard/widgets/EmployeeStatsWidget.tsx`
4. `src/components/dashboard/widgets/ActiveResponsibilitiesWidget.tsx`
5. `src/components/dashboard/widgets/ZoneMapPreviewWidget.tsx`
6. `src/components/dashboard/widgets/AlertsNotificationsWidget.tsx`
7. `src/components/responsibilities/ResponsibilityCard.tsx`
8. `src/components/employees/EmployeePanel.tsx`
9. `src/lib/dashboardLayout.ts` (optional helper for defaults/reorder logic)

---

## 8) Risks, alternatives, and chosen decisions

### Decision A: Keep client-side “API-equivalent” actions instead of adding real endpoints
- **Chosen because:** current architecture has no backend; adding one now is a large risky rewrite
- **Alternative:** add mock fetch endpoints; rejected due to unnecessary complexity/regression risk

### Decision B: Add new responsibility collection instead of overloading employee notes
- **Chosen because:** requirement explicitly demands independent responsibility notes per item
- **Alternative:** embed responsibility array inside zone directly; possible, but central collection plus `zoneId` simplifies cross-zone assignment/filtering

### Decision C: Native DnD reuse vs adding `react-grid-layout`
- **Chosen initial path:** native DnD reorder to match existing pattern and minimize dependencies
- **Alternative:** `react-grid-layout` gives richer positioning; defer unless user explicitly wants freeform drag grid coordinates immediately

### Decision D: Header width change in shell rather than ad-hoc page-level override
- **Chosen because:** guarantees persistent full-screen brand banner across all pages

---

## 9) Validation plan (must pass before completion)

1. Existing inventory actions still work:
   - add/edit/adjust quantity
2. Existing map interactions still work:
   - block drag/drop and zone editing
3. Responsibilities:
   - create multiple responsibilities per zone
   - each responsibility has independent notes
   - assign one employee to multiple responsibilities across zones
4. Employee stats:
   - totals, on payroll, off payroll update live
   - filter works
5. Dashboard customization:
   - reorder widgets
   - hide/show widgets
   - persisted per current user identity and restored on reload
6. Header:
   - full width visible on all pages
7. Backward compatibility:
   - load old localStorage without runtime errors or blank states

---

## 10) Implementation sequence (small blast radius)

1. Types + defaults
2. Storage hydration/migration
3. Store actions (employees/responsibilities/layout)
4. Responsibilities UI replacement (no removal of old data fields yet)
5. Dashboard widget layout system + controls
6. Employee panel widget
7. Full-width header adjustments
8. Regression checks (inventory/map + new flows)

---

## 11) Open confirmation points before coding

1. Dashboard drag behavior:
   - Is ordered-list drag sufficient now, or do you require freeform grid coordinates immediately?
2. Employee UI placement:
   - Embed in Dashboard only, or add dedicated Employees page + nav item?
3. Legacy shared notes:
   - Keep hidden but preserved for backward compatibility (recommended), or migrate/discard now?

Once you confirm these three points, implementation can proceed with surgical edits and regression verification.
