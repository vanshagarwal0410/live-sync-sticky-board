# Live-Sync Sticky Board

A real-time collaborative sticky-note board where every open browser tab sees every other tab's changes live — no manual refresh required.

Built as a first-year technical-recruitment submission.

Deployed it using AWS with integration of Vercel - https://client-nu-ashen-25.vercel.app

![Tech Stack](https://img.shields.io/badge/React-Vite-blue) ![WebSocket](https://img.shields.io/badge/WebSocket-ws-green) ![Node.js](https://img.shields.io/badge/Node.js-Express-orange)

## What It Does

- **Add a note** — click the floating "+" button to create a colorful sticky note
- **Edit a note** — click into its text and type; the edit broadcasts to every connected tab
- **Delete a note** — click the × icon to remove it everywhere
- **Move a note** — drag it anywhere; other tabs see it glide smoothly (position updates are throttled at ~60ms, not sent on every pixel)
- **Live sync** — every action above shows up in all open tabs within about a second
- **Connection indicator** — 🟢 Live / 🔴 Disconnected badge with auto-reconnect (exponential backoff: 1s → 2s → 4s → … → 30s cap)
- **Export board** — download the current notes as a `.json` file (client-side, no server round-trip)
- **Connected count** — shows how many tabs are connected

## Architecture

```
Browser Tab A ──┐                    ┌── Browser Tab B
Browser Tab C ──┤   WebSocket (ws)   ├── Browser Tab D
                └───────┬────────────┘
                        │
              ┌─────────▼──────────┐
              │  Node.js / Express │
              │   + ws package     │
              │                    │
              │  In-memory state   │
              │        │           │
              │  board.json (disk) │
              └────────────────────┘
```

**Frontend**: React + Vite — fast HMR in development, optimized static bundle for production.

**Backend**: Node.js + Express + the `ws` package. Using raw WebSockets (not Socket.IO) keeps the connection lifecycle transparent: one TCP upgrade, one persistent connection, plain JSON messages in both directions.

**Persistence**: A single JSON file (`server/data/board.json`), debounce-written 300ms after the last change. This is basic reliability — the board survives a server restart — not a database. A flat file keeps the stack minimal for a first-year project.

## WebSocket Message Contract

```jsonc
// Client → Server
{ "type": "ADD_NOTE",    "payload": { "id": "uuid", "text": "", "color": "mint", "x": 120, "y": 80 } }
{ "type": "EDIT_NOTE",   "payload": { "id": "uuid", "text": "new text" } }
{ "type": "DELETE_NOTE", "payload": { "id": "uuid" } }
{ "type": "MOVE_NOTE",   "payload": { "id": "uuid", "x": 240, "y": 160 } }

// Server → Client
{ "type": "SYNC_STATE",   "payload": { "notes": [ /* full array */ ] } }
{ "type": "NOTE_ADDED",   "payload": { /* the new note */ } }
{ "type": "NOTE_EDITED",  "payload": { "id": "uuid", "text": "new text" } }
{ "type": "NOTE_DELETED", "payload": { "id": "uuid" } }
{ "type": "NOTE_MOVED",   "payload": { "id": "uuid", "x": 240, "y": 160 } }
{ "type": "CLIENT_COUNT", "payload": { "count": 3 } }
```

Each client message also includes a `sourceClientId` field, which the server echoes back in broadcasts. This lets the client distinguish its own echoed actions from remote updates — remote updates trigger a brief pulse animation to make "liveness" visually obvious.

## Design System — "Candy Board"

| Role | Name | Hex |
|------|------|-----|
| Note color 1 | Tangerine | `#FFB347` |
| Note color 2 | Rose | `#FF6B8A` |
| Note color 3 | Lavender | `#B48BFF` |
| Note color 4 | Mint | `#6BCB77` |
| Note color 5 | Sky | `#61C0FF` |
| Note color 6 | Lemon | `#FFE066` |
| Background | Cream | `#F5F0E8` |
| Grid dots | Warm gray | `#D5CFC5` |
| Toolbar | Charcoal | `#2D2D2D` |

**Typography**: [Fredoka](https://fonts.google.com/specimen/Fredoka) (display, app title only) + [Inter](https://fonts.google.com/specimen/Inter) (body, everything else).

The dotted-grid canvas, soft drop shadows, and vivid pastel note colors are inspired by two reference mockups — a colorful ideation board and a compact sticky-notes app — combined into one deliberate visual direction.

## Running Locally

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/live-sync-sticky-board.git
cd live-sync-sticky-board

# 2. Install server dependencies
cd server && npm install && cd ..

# 3. Install client dependencies
cd client && npm install && cd ..

# 4. Create client env files (or copy from .env.example)
echo "VITE_WS_URL=ws://localhost:3001" > client/.env.development
echo "VITE_WS_URL=ws://localhost:3001" > client/.env.production

# 5. Start the server
cd server && npm start
# In a separate terminal:

# 6. Start the client (dev mode)
cd client && npm run dev
```

Open **http://localhost:5173** in two browser tabs and start adding notes!

## Project Structure

```
live-sync-sticky-board/
├── client/                         # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Board.jsx           # Dotted-grid canvas, maps notes
│   │   │   ├── StickyNote.jsx      # Draggable, editable note
│   │   │   ├── AddNoteButton.jsx   # Floating "+" button
│   │   │   ├── ConnectionStatus.jsx # 🟢/🔴 badge + count
│   │   │   └── ExportButton.jsx    # Download board as JSON
│   │   ├── hooks/
│   │   │   └── useBoardSocket.js   # WebSocket + reconnect + state
│   │   ├── constants.js            # Color palette definitions
│   │   ├── App.jsx                 # Root component
│   │   ├── App.css                 # All styles (CSS variables)
│   │   └── main.jsx                # Entry point
│   ├── .env.example                # Environment variable template
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── src/
│   │   ├── index.js                # Express + ws bootstrap
│   │   ├── wsHandlers.js           # Message routing + broadcast
│   │   └── store.js                # In-memory store + JSON persistence
│   ├── data/                       # board.json lives here (gitignored)
│   └── package.json
├── .gitignore
└── README.md
```

## Scope & Deliberate Choices

### What this project IS (basic reliability)

- When a client connects or reconnects, the server sends the full board state so new tabs see existing notes
- Board state is persisted to a JSON file so it survives server restarts
- The client auto-reconnects with exponential backoff

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React + Vite | Fast dev with HMR, optimized production builds |
| Backend | Node.js + Express | Simple, well-documented, first-year friendly |
| WebSocket | `ws` package | Raw protocol — easy to reason about, easy to explain on camera |
| Persistence | JSON file | Minimal, no database to set up or explain |
| Styling | Plain CSS + CSS variables | No build-step overhead from Tailwind/SCSS |

## Accessibility

- Visible `:focus-visible` outlines on all interactive elements
- `aria-label` attributes on buttons and inputs
- `aria-live="polite"` on the connection status for screen reader announcements
- `@media (prefers-reduced-motion: no-preference)` wraps the pulse animation — it's suppressed for users who prefer reduced motion
