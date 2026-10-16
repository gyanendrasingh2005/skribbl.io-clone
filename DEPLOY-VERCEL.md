# Two Vercel deployments (client + server)

Use **two Vercel projects** from the same GitHub repo. Do not use one project with both UI and API on the same domain — Socket.IO is unreliable that way.

## Project 1 — Server (API + Socket.IO)

1. Vercel → **Add New Project** → same repo.
2. **Project name:** e.g. `skribble-server`
3. **Root Directory:** `server` (important)
4. Framework should pick up `server/vercel.json`.
5. **Environment variables (Production):**
   - `CLIENT_ORIGIN` = your client URL, e.g. `https://skribbleio.vercel.app`  
     (comma-separate multiple: `https://a.vercel.app,https://b.vercel.app`)
6. Deploy.
7. Test: `https://<server-project>.vercel.app/api/health` → `{"ok":true,...}`
8. Test: `https://<server-project>.vercel.app/socket.io/?EIO=4&transport=polling` → starts with `0{"sid":`

Copy the server URL (no trailing slash). Vercel assigns a unique hostname (e.g. `https://skribble-server-theta.vercel.app`) — use **Project → Settings → Domains** or `vercel project ls` for the live URL, not a guessed `*.vercel.app` name.

### Deploy server from CLI

```bash
cd server
vercel link --project skribble-server   # once
printf '%s' 'https://skribbleio.vercel.app' | vercel env add CLIENT_ORIGIN production
vercel --prod
```

## Project 2 — Client (static UI)

1. Vercel → **Add New Project** → same repo again.
2. **Project name:** e.g. `skribbleio` or `skribble-client`
3. **Root Directory:** `client`
4. **Environment variables (Production):**
   - `VITE_SOCKET_URL` = server URL from step 1 (e.g. `https://skribble-server-theta.vercel.app`)
5. **Redeploy** after setting the variable (Vite bakes it into the bundle).

### Deploy client from CLI

```bash
cd client
vercel link --project skribble.io   # once
printf '%s' 'https://<your-server-host>.vercel.app' | vercel env add VITE_SOCKET_URL production
vercel --prod
```

6. Open the client URL → **Connected** → create/join rooms.

**Current production pair:** [skribbleio.vercel.app](https://skribbleio.vercel.app) → [skribble-server-theta.vercel.app](https://skribble-server-theta.vercel.app)

## Optional: deploy from repo root

If you use **one** Vercel project with root = repository root, root `vercel.json` builds **only the client**. You still need a **second** project with root `server` for the API.

## Local dev

No `VITE_SOCKET_URL`. Run from repo root:

```bash
npm run dev
```

## Notes

- Vercel server must use **WebSocket-only** Socket.IO (no HTTP long-polling — each poll can hit a different instance and return 400). The server entry exports the **HTTP server**, not Express alone.
- Turn off **Deployment Protection** on both projects for public demos, or connections may fail.
- 400 logs for bare `GET /socket.io/` without `?EIO=4&transport=polling` are normal; the client uses the full polling URL.
