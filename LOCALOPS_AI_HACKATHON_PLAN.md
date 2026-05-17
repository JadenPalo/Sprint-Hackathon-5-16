# LocalOps AI — Hackathon Build Plan

Date: 2026-05-16  
POC: AdaL  
TL;DR: Build a mobile/tablet-first React + TypeScript + Tailwind single-page app with offline-first inventory management, sync-state simulation, and a GetStream-ready chat assistant UI. Prioritize a polished frontend MVP with local persistence and a lightweight natural-language inventory command parser over backend complexity.

## 1. Product Summary

**LocalOps AI** is an offline-first inventory dashboard and chatbot assistant for small local businesses, especially cafes and restaurants.

### Core demo promise
- Staff can track inventory on a tablet-friendly dashboard
- Staff can adjust quantities manually or through chat
- The app still works offline
- Changes made offline are marked as pending sync
- When the app returns online, pending changes sync visually
- The assistant feels human and helpful
- The chat experience is visibly aligned with the GetStream track, with a clean path to real SDK integration

## 2. Recommended MVP Scope for 8 Hours

### Must-have
1. Dashboard page
2. Inventory management page
3. Offline/online demo toggle
4. Local persistence
5. Pending sync simulation
6. Chat assistant page
7. Simple command parser for inventory actions
8. Demo cafe seed data
9. GetStream-ready chat integration notes and env placeholders
10. Polished mobile/tablet UI

### Nice-to-have if time remains
1. IndexedDB instead of localStorage
2. Real GetStream Chat SDK wiring
3. Charts on dashboard
4. Activity filtering
5. Supplier/reorder view

## 3. Why This Approach

### Chosen approach
- **Frontend-first SPA**
- **No required backend**
- **Local-only state with sync simulation**
- **GetStream integration as one of:**
  - actual SDK wrapper if setup is quick
  - or a faithful GetStream-ready chat shell if setup time is tight

### Why this is the best hackathon tradeoff
- Lowest risk in an 8-hour sprint
- Strongest demo value quickly
- Clean story for “offline-first local business operations”
- Easy to understand and modify
- Lets the team focus on product polish and storytelling

### Alternatives considered
#### A. Full-stack app with backend and auth
- Rejected for MVP because it increases risk, setup time, and debugging burden
- Not necessary to prove the core concept in a hackathon

#### B. Pure dashboard without chatbot
- Rejected because it weakens differentiation and GetStream relevance

#### C. Real-time syncing backend
- Rejected for initial build because simulated sync communicates the product concept with much lower implementation cost

## 4. Proposed Tech Stack

- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **localStorage** for persistence
- Optional:
  - **GetStream Chat React SDK**
  - AI provider placeholder for future chatbot intelligence

## 5. Proposed File Structure

```text
README.md
LOCALOPS_AI_HACKATHON_PLAN.md
package.json
tsconfig.json
vite.config.ts
tailwind.config.js
postcss.config.js
index.html

src/
  main.tsx
  App.tsx
  index.css

  components/
    layout/
      AppShell.tsx
      BottomNav.tsx
      Header.tsx
    dashboard/
      MetricCard.tsx
      SyncBadge.tsx
      RecentUpdatesCard.tsx
      LowStockList.tsx
    inventory/
      InventoryCard.tsx
      InventoryList.tsx
      InventoryTable.tsx
      ItemStatusBadge.tsx
      ItemFormModal.tsx
    chat/
      ChatWindow.tsx
      ChatMessageBubble.tsx
      ChatComposer.tsx
      SuggestedPrompts.tsx
    common/
      EmptyState.tsx
      SectionTitle.tsx
      TogglePill.tsx

  pages/
    DashboardPage.tsx
    InventoryPage.tsx
    AssistantPage.tsx

  lib/
    constants.ts
    dates.ts
    format.ts
    storage.ts
    sync.ts
    inventory.ts
    parser.ts
    chatbot.ts
    stream.ts

  hooks/
    useAppState.ts
    useOnlineStatus.ts
    useLocalInventory.ts

  types/
    inventory.ts
    chat.ts
    sync.ts

  data/
    seedInventory.ts
    demoPrompts.ts
```

## 6. Planned Functional Architecture

### App-wide state
Use a single custom hook or lightweight app-state layer to manage:
- inventory items
- activity log
- chat messages
- online/offline mode
- pending sync queue
- sync status

### Why this state approach
- Fast to implement
- No external state library required
- Easier for judges and teammates to read
- Low overhead versus Redux/Zustand in a short sprint

### Data flow
1. Seed initial data on first load
2. Persist app state to localStorage
3. When the user edits inventory:
   - update local state immediately
   - append activity log entry
   - if offline, mark pending sync
   - if online, mark synced
4. When online mode is re-enabled:
   - flush pending changes
   - update sync badge
   - show sync success state
5. Chat actions call the same inventory mutation functions as the UI

## 7. Data Models

### InventoryItem
```ts
type ItemStatus = "healthy" | "low" | "critical";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  criticalThreshold: number;
  updatedAt: string;
}
```

### ActivityEntry
```ts
interface ActivityEntry {
  id: string;
  type: "add" | "update" | "delete" | "sync";
  message: string;
  timestamp: string;
  pendingSync: boolean;
}
```

### SyncStatus
```ts
type SyncStatus = "online" | "offline" | "pending-sync" | "synced";
```

### ChatMessage
```ts
type ChatRole = "user" | "assistant" | "system";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
}
```

## 8. Main Pages

### Dashboard Page
Displays:
- total inventory items
- low-stock count
- critical count
- recent updates
- visible sync status badge
- quick low-stock recommendations

### Inventory Page
Displays:
- list or responsive card grid
- quantity controls
- add item button
- edit/delete actions
- item status badge
- last updated time

### Assistant Page
Displays:
- message list
- friendly bot welcome state
- suggested prompts
- chat composer
- optional “GetStream-ready” badge or integration section

## 9. Inventory Logic Plan

### Item status rules
- **Healthy**: quantity > lowStockThreshold
- **Low**: quantity <= lowStockThreshold and quantity > criticalThreshold
- **Critical**: quantity <= criticalThreshold

### Inventory mutations to implement
- add item
- edit item
- delete item
- increment quantity
- decrement quantity
- set exact quantity

### Reason for centralizing mutations
All updates should go through shared helper functions so:
- UI and chatbot stay consistent
- activity log stays accurate
- sync queue logic stays in one place
- bugs are easier to avoid

## 10. Offline-First Logic Plan

### Behavior
- App has a visible demo toggle for online/offline
- If offline:
  - edits still work
  - changes persist locally
  - updates are flagged pending sync
- If online again:
  - app simulates sync completion
  - pending actions are cleared
  - success activity is added

### Storage approach
Use **localStorage** for the MVP because:
- fast to implement
- enough for demo-scale data
- no async complexity
- minimal integration risk

### Alternative
IndexedDB is more scalable, but it adds complexity that is unlikely to improve the judged demo enough in 8 hours.

## 11. Chatbot Logic Plan

### Supported user intents
- ask for low-stock items
- ask what to reorder
- ask for summary of changes
- add stock to an item
- reduce stock from an item
- ask general inventory counts

### Example supported commands
- “What items are low?”
- “What should I reorder today?”
- “Add 12 oat milks”
- “We used 50 cups”
- “Summarize today’s changes”

### Parser strategy
Use simple rule-based parsing, not LLM-dependent parsing.

#### Why
- deterministic
- fast
- works offline
- hackathon-safe
- easy to demo

### Parser rules
- detect action verbs like add, used, remove, subtract, restock
- detect number
- detect item phrase
- fuzzy-match item phrase against known inventory items
- route to inventory mutation
- generate natural-language response

## 12. Humanizer Layer Plan

The assistant response generator will:
- confirm what changed
- mention the new total
- explain whether the stock is healthy/low/critical
- suggest next action when useful

### Example response style
- “Done — I logged 50 large cups as used. You have 120 left, which is still healthy.”
- “I added 12 oat milk cartons. You’re now at 16 total, so you’re back above the low-stock threshold.”
- “You’re currently low on whole milk, lids, and receipt paper. I’d prioritize reordering those today.”

### Why this matters
This is a major differentiation point. The app should feel like a friendly operations assistant, not a CRUD demo.

## 13. GetStream Strategy

### Preferred implementation
If setup time is manageable:
- add GetStream Chat SDK packages
- create a small integration wrapper
- document env variables and where to plug in credentials
- use demo/fallback UI if credentials are missing

### Safe fallback
If real GetStream setup is too time-consuming:
- implement the chat UI in a component structure compatible with later Stream integration
- include `stream.ts` abstraction and clear integration notes
- label the page as “GetStream-ready assistant experience”

### Why this is acceptable
It preserves the hackathon track relevance while protecting the MVP from integration blockers.

## 14. Environment Variables

Planned `.env.example`:
```env
VITE_STREAM_API_KEY=your_stream_api_key_here
VITE_STREAM_USER_ID=localops_demo_user
VITE_STREAM_USER_TOKEN=your_stream_user_token_here
VITE_ENABLE_STREAM_CHAT=false
VITE_AI_PROVIDER=gemini
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-1.5-flash
```

## 15. Styling Direction

### Visual goals
- mobile/tablet-first
- large tap targets
- rounded cards
- soft shadows
- subtle gradients or warm neutral surfaces
- clear status colors

### Status color mapping
- healthy: green
- low: amber/yellow
- critical: red
- offline: slate/gray
- synced: blue/green accent

### Why this approach
Cafes and restaurants need a simple operational interface that can be read at a glance during busy shifts.

## 16. Demo Seed Data

Planned cafe items:
- Espresso beans
- Oat milk
- Whole milk
- Large cups
- Small cups
- Lids
- Napkins
- Vanilla syrup
- Caramel syrup
- Sandwich boxes
- Cleaning spray
- Receipt paper

Some items will intentionally start near low or critical thresholds so the dashboard looks alive immediately.

## 17. Build Order

### Phase 1 — Scaffold
- initialize Vite React TypeScript app
- install Tailwind
- create app shell and routing/tab state

### Phase 2 — Data + Persistence
- add types
- add seed data
- add localStorage persistence helpers
- add centralized inventory mutations

### Phase 3 — Dashboard + Inventory UI
- metric cards
- inventory list/cards
- add/edit/delete item modal
- status badges
- recent updates

### Phase 4 — Offline Sync Simulation
- online/offline toggle
- pending sync queue
- sync badge
- simulated sync completion

### Phase 5 — Chat Assistant
- chat page UI
- prompt suggestions
- parser
- humanized responses
- chat actions modifying shared inventory state

### Phase 6 — GetStream Readiness + README
- env example
- integration placeholders
- setup instructions
- demo script

## 18. Risks and Mitigations

### Risk 1: Real GetStream integration takes too long
**Mitigation:** Keep chat components decoupled and ship a polished GetStream-ready chat shell with clear setup notes.

### Risk 2: Offline state bugs
**Mitigation:** Centralize all writes through shared helper functions and keep sync simulation simple.

### Risk 3: Too much UI surface area
**Mitigation:** Limit to three pages and reuse card/list components.

### Risk 4: Parser misunderstanding inventory names
**Mitigation:** Use a constrained seed dataset and simple fuzzy matching against known items.

## 19. Files I Expect to Create or Change

Because the repository is nearly empty, the implementation will mostly be new files:

### Root
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `index.html`
- `.env.example`
- `README.md`

### App source
- `src/**` files listed above

## 20. What I Will Not Build in MVP

To control scope, I will intentionally avoid:
- authentication
- server backend
- multi-user collaboration
- real database sync
- advanced analytics
- role permissions
- full AI orchestration
- production-grade Stream auth backend

## 21. Demo Script Outline

1. Open dashboard and show inventory health
2. Point out low and critical alerts
3. Go offline using the demo toggle
4. Update a few inventory items while offline
5. Show pending sync state
6. Open assistant and type:
   - “What items are low?”
   - “Add 12 oat milk”
   - “We used 50 cups”
7. Show humanized assistant responses
8. Return online
9. Show sync success and updated dashboard metrics
10. Mention GetStream-ready chat architecture and env variables

## 22. Confirmation Request

If you approve this plan, the next implementation step will be:

1. Scaffold the React + TypeScript + Tailwind app
2. Build the offline inventory state layer
3. Add dashboard, inventory, and assistant pages
4. Add the parser and humanized chatbot logic
5. Add setup instructions and demo script in README

This is the smallest high-polish MVP with the best odds of success in 8 hours.
