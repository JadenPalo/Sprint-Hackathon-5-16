# GetStream Integration Plan (Non-Destructive)

**Date:** 2026-05-16  
**POC:** AdaL  
**TL;DR:** Integrate Stream Chat + realtime safely by adding a minimal backend token/channel service, mapping existing IDs (employees/zones) directly to Stream users/channels, and layering chat/feed UI into existing pages without replacing inventory/map business logic.

---

## 1) Architecture findings (current codebase)

- Frontend-only React/Vite app (`src/`), no existing backend service.
- State + domain logic centralized in `src/hooks/useAppState.ts`.
- Persistence in `localStorage` (`src/lib/storage.ts`).
- Existing IDs already present:
  - `employees[].id`
  - `zones[].id`
  - `inventory[].id`
- Existing role model: `admin` / `staff`.
- Existing dashboard + map + responsibilities already functional and must remain intact.

---

## 2) Security-first integration model

## Why backend is mandatory
Stream user tokens **must** be generated server-side using `STREAM_API_SECRET`.  
No secret or static user token will be shipped to frontend.

## Environment variables

### Backend only
- `STREAM_API_KEY`
- `STREAM_API_SECRET`

### Frontend
- `VITE_STREAM_API_KEY`

## Secret hygiene changes
- Add/update `.gitignore` to include `.env`, `.env.*`, local secret files, logs, build artifacts.
- Remove any frontend usage of static Stream user token env values.
- Ensure token endpoint returns short-lived user token only.

---

## 3) Chosen implementation approach (smallest blast radius)

Because no backend exists yet, add a **minimal Node API layer inside repo**:

- `server/` with lightweight Express app
- Purpose-limited endpoints:
  - issue Stream user token
  - create/update zone channels
  - post system messages for inventory/responsibility/assignment events
- Keep domain data/storage in existing frontend store (no DB replacement).

This gives production-safe secret handling and clear migration path later.

---

## 4) File-by-file change plan

## New backend files

1. `server/index.ts`
   - start API server
   - JSON middleware, health endpoint
   - register auth + stream routes

2. `server/services/stream.service.ts`  ✅ requested
   - singleton Stream server client (`stream-chat`)
   - helpers:
     - `upsertStreamUser`
     - `createUserToken`
     - `upsertZoneChannel`
     - `syncZoneMembers`
     - `sendZoneSystemMessage`
     - `sendInventoryAttachmentMessage`

3. `server/routes/stream.routes.ts`
   - `POST /api/stream/token`
   - `POST /api/stream/channels/zone`
   - `POST /api/stream/channels/:zoneId/system-message`
   - `POST /api/stream/channels/:zoneId/inventory-event`

4. `server/types/stream.ts`
   - DTO types for payload validation

5. `server/middleware/auth.ts` (minimal)
   - adapter placeholder for current app role identity
   - validates user identity payload and role for protected operations

## New frontend files

6. `src/lib/streamClient.ts`
   - Stream Chat client singleton for browser
   - `connectStreamUser(user)` using backend token endpoint
   - `disconnectStreamUser()`

7. `src/lib/streamApi.ts`
   - typed calls to backend stream routes

8. `src/components/chat/ZoneChatPanel.tsx`
   - Stream React components (`ChannelList`, `Channel`, `MessageList`, `MessageInput`, `Thread`)
   - channel filter by assigned zones + admin role

9. `src/components/chat/InventoryAttachmentPreview.tsx`
   - render custom `inventory_item` message attachments

10. `src/components/dashboard/StreamActivityFeed.tsx`
   - surface stream-based activity timeline while preserving existing local activity card fallback

## Modified frontend files

11. `src/hooks/useAppState.ts`
   - on user/employee context, connect Stream user using existing IDs
   - on zone creation/update, call channel upsert API
   - on inventory move/responsibility update/employee assignment, emit system messages/events to corresponding zone channels
   - preserve existing state mutations and activity logic

12. `src/pages/MapPage.tsx`
   - clicking/opening zone exposes zone chat panel for that zone channel

13. `src/pages/DashboardPage.tsx`
   - include Stream activity feed widget (non-destructive additive)

14. `src/pages/ResponsibilitiesPage.tsx`
   - when responsibility created/updated/assigned, emit zone system event message

15. `src/pages/AdminDashboardPage.tsx`
   - maintain existing admin flows; emit assignment/payroll change notifications to relevant channels if mapped zone exists

16. `package.json`
   - add dependencies/scripts:
     - backend: `stream-chat`, `express`, `cors`, `dotenv`
     - frontend: `stream-chat-react`, `stream-chat`
     - dev scripts to run app + server

17. `.gitignore`
   - add secret-safe and noisy artifacts ignores

---

## 5) Data mapping rules (no duplicate user system)

- Stream user `id` = existing employee/user id (no new identity table)
- Stream user `name` = existing employee name
- Stream user `role` = mapped from current app role (`admin` / `employee`)
- Zone channel:
  - type: `team`
  - id: `zone.id`
  - name: `zone.name`
  - members: assigned employees + admins

---

## 6) Core feature mapping to your goals

1. **Real-time team communication**
   - Zone channels with threads + mentions via Stream components

2. **Live updates**
   - Existing state actions emit Stream system events/messages

3. **Zone/item/responsibility collaboration**
   - custom message metadata attachments, e.g.:
   - `{ type: "inventory_item", itemId, name, quantity }`

4. **Dashboard timeline**
   - Stream-backed feed component + local fallback

5. **AI integration hooks**
   - add stubs in existing assistant layer for:
     - `post_message_to_zone`
     - `summarize_zone_activity`

---

## 7) Non-destructive guardrails

- Inventory/map logic stays in current store.
- Stream used only for comms/realtime/activity.
- Existing pages/components preserved; enhancements are additive.
- Keep local activity as fallback if Stream unavailable.

---

## 8) Validation checklist

- Build passes frontend + backend type checks
- Zone creation creates/updates Stream channel
- Assigned employees can see/post in assigned zone chat
- Inventory move posts system message with attachment
- Responsibility updates post zone event
- Dashboard feed updates without breaking existing cards
- No secret values in git-tracked files
- `.env` files ignored

---

## 9) Notes on endpoint contract equivalence

Requested API-style capabilities will be exposed as backend routes:
- `/stream/token` (secure token generation)
- `/stream/channels/zone` (zone channel creation/sync)
- `/stream/channels/:zoneId/system-message` (realtime events)
- plus frontend wiring for zone chat panel and dashboard feed

---

## 10) Implementation sequence

1. Add `.gitignore` hardening + env schema docs
2. Add backend Stream service + token/channel routes
3. Add frontend Stream client provider + API wrappers
4. Wire zone chat panel (Map/Zone UI)
5. Wire event emitters in inventory/responsibility/assignment actions
6. Add dashboard Stream activity feed
7. Add AI tool stubs for zone posting/summarization
8. Build/test regression sweep
