# Skribble.io Clone

Multiplayer drawing and guessing game built with **React + Vite**, **Node.js + Express**, and **Socket.IO**.

## Live URL

**Recommended:** client on **Vercel**, API on **Azure App Service** (stable Socket.IO) — **[DEPLOY-AZURE.md](./DEPLOY-AZURE.md)**.

| Piece | Host | Env |
|-------|------|-----|
| **Client** | Vercel (`client/`) | `VITE_SOCKET_URL` → Azure API URL |
| **API** | Azure Linux Web App (`server/`) | `CLIENT_ORIGIN` → `https://skribbleio.vercel.app` |

Example: UI `https://skribbleio.vercel.app` · API `https://<your-app>.azurewebsites.net`

Vercel-only split deploy is documented in **[DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)** but is unreliable for realtime (400/`sid` errors).

## Local setup

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173  
- Backend + WebSockets: http://localhost:3100 (see root `.env`; port **3001** is avoided because it is often already taken)

Optional env (root `.env`):

- `PORT` — game server port (default **3100**)
- `VITE_DEV_API_URL` — must match `PORT` (Vite proxies `/socket.io` and `/api` here)
- `CLIENT_ORIGIN` — default `http://localhost:5173`
- `VITE_SOCKET_URL` — leave empty in dev; set only for split production deploy

## Production build

```bash
npm run build
npm start
```

The server serves the built client from `client/dist` and handles Socket.IO on the same port.

## Architecture overview

```
Browser (React)
  ├─ Canvas: normalized stroke coordinates (800×500 logical space)
  ├─ UI: lobby, word pick, chat/guesses, scoreboard
  └─ socket.io-client ──WebSocket──► Express HTTP server
                                        ├─ RoomManager / Room / Game / Player (OOP)
                                        └─ MessageHandler (event routing)
```

### Drawing sync

1. **Drawer** pointer events map to logical canvas coordinates.
2. `draw_start` creates a stroke on the server (`Game.addStroke`) and broadcasts `draw_data` (`action: add`).
3. `draw_move` appends points; server broadcasts `action: move`.
4. All clients repaint from the `strokes` array in `game_state` / incremental `draw_data` updates.
5. Undo/clear mutate server stroke list and broadcast to the room.

### Game state

- **Room**: players, settings, chat history.
- **Game**: phase (`lobby` → `word_select` → `drawing` → `round_end` → `game_over`), round index, drawer rotation, timer, hints, current word.
- Turn order: each player draws once per “round” setting; total turns = `rounds × playerCount`.
- Scoring: guessers earn points based on time left; drawer gets bonus on correct guesses.

### Word matching

Guesses are `trim()` + `toLowerCase()` + collapsed whitespace, compared to the chosen word (exact match).

### WebSocket events

See assignment spec — implemented: `create_room`, `join_room`, `start_game`, `round_start`, `word_chosen`, `draw_*`, `guess`, `chat`, `game_state`, `round_end`, `game_over`, `lobby_state`, `list_public_rooms`.

## Code walkthrough tips

- Server entry: `server/src/index.ts`
- OOP core: `server/src/Room.ts`, `Game.ts`, `Player.ts`, `MessageHandler.ts`
- Client canvas: `client/src/components/DrawingCanvas.tsx`
- Socket state: `client/src/GameContext.tsx`

## Deployment notes

See **[DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)** for step-by-step two-project Vercel setup.

**Monolith (optional):** `npm run build && npm start` on Render/Railway (`render.yaml`) — one URL, full WebSockets, no `VITE_SOCKET_URL`.
