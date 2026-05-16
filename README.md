# LocalOps AI

Offline-first inventory dashboard and chatbot assistant for small local businesses, especially cafes and restaurants.

Built as an 8-hour hackathon MVP for the GetStream track.

## What it does

LocalOps AI gives staff a mobile/tablet-friendly web app to:

- track inventory locally
- update quantities with large touch-friendly controls
- see low-stock and critical-stock items quickly
- keep working offline
- queue local changes for sync when back online
- use a natural-language assistant for simple inventory actions

## Core MVP features

### Dashboard
- total item count
- low-stock count
- critical count
- healthy count
- recent update log
- visible sync status badge

### Inventory
- browse cafe inventory items
- add new item
- edit existing item
- delete item
- increment/decrement quantity
- search by item name or category

### Offline-first demo behavior
- toggle between online and offline mode
- continue making changes while offline
- mark offline changes as pending sync
- return online and show successful sync state

### Assistant
- answer low-stock and reorder questions
- summarize today's updates
- parse simple commands like:
  - `What items are low?`
  - `Add 12 oat milks`
  - `We used 50 large cups`
  - `What should I reorder today?`
  - `Summarize today's changes`

### GetStream relevance
- assistant UI is structured as a GetStream-ready chat experience
- includes Stream environment variable placeholders
- designed so real Stream SDK wiring can be added without reworking the UX

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS
- localStorage for persistence

## Project structure

```text
src/
  components/
    chat/
    common/
    dashboard/
    inventory/
    layout/
  data/
  hooks/
  lib/
  pages/
  types/
```

## Local setup

### 1. Install Node.js
This environment did not have Node/npm available, so install Node.js locally first:

- https://nodejs.org/

### 2. Install dependencies

```bash
npm install
```

### 3. Start the app

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

## Environment variables

Create a `.env` file from `.env.example`.

```env
VITE_STREAM_API_KEY=your_stream_api_key_here
VITE_STREAM_USER_ID=localops_demo_user
VITE_STREAM_USER_TOKEN=your_stream_user_token_here
VITE_ENABLE_STREAM_CHAT=false
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_KEY=your_optional_openai_key_here
```

## GetStream integration notes

Current state:
- local chat UI works without external services
- Stream config is read from environment variables
- assistant page shows whether Stream credentials are configured

To connect real Stream later:
1. install Stream Chat SDK packages
2. create a client in `src/lib/stream.ts`
3. wrap the assistant UI with Stream chat components
4. provide real user auth/token flow

## Demo script for judges

### 1. Open the dashboard
Show:
- total tracked items
- low and critical alerts
- recent updates
- sync badge

### 2. Go to inventory
Show:
- editable cafe inventory
- tap-friendly add/subtract controls
- adding or editing an item

### 3. Switch offline mode on
Explain:
- staff can keep working during internet outages
- changes stay local and are marked pending sync

### 4. Make offline changes
Examples:
- reduce large cups
- restock oat milk
- edit an item threshold

### 5. Open the assistant
Try prompts like:
- `What items are low?`
- `Add 12 oat milks`
- `We used 50 large cups`
- `What should I reorder today?`

### 6. Return online
Show:
- pending changes clear
- sync status recovers
- dashboard reflects the latest values

### 7. Close with the GetStream angle
Explain:
- this is a local-business operations assistant
- the chat UX is intentionally GetStream-ready
- the app demonstrates a clear path to production chat infrastructure

## Seed data included

The app starts with demo cafe inventory such as:

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

## Known hackathon tradeoffs

Intentional MVP decisions:
- no backend required
- no auth
- no real multi-user sync
- localStorage instead of IndexedDB
- Stream integration prepared but not fully wired by default

These choices keep the demo reliable and realistic for an 8-hour sprint.

## Notes

Implementation plan lives in:

- `LOCALOPS_AI_HACKATHON_PLAN.md`
