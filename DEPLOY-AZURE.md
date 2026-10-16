# API on Azure App Service + client on Vercel

Socket.IO needs a **long-running Node process**. Vercel serverless often returns **400** on polling/`sid` and unstable WebSockets. Run the **server on Azure App Service** and keep the **React client on Vercel**.

| Piece | Host | URL example |
|-------|------|-------------|
| Client | Vercel project `skribble.io` | `https://skribbleio.vercel.app` |
| API + Socket.IO | Azure Linux Web App | `https://<app-name>.azurewebsites.net` |

## One-time setup

1. Install [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli).
2. Sign in (required — tokens expire after ~90 days):

   ```bash
   az login
   ```

3. Pick a **globally unique** web app name (letters/numbers only), e.g. `skribbleio-socket-0322`.

**Azure for Students:** free (F1) plans are limited to a small number of apps. If you see `QuotaExceeded` or **403 web app stopped**, either delete an unused free web app in the portal or deploy onto an existing **Basic** plan (this repo’s live API uses `skribbleio-socket-0322` on plan `streamhelper971-plan` in `twitch-bot-rg`).

## Deploy the server

From the repo root:

```bash
export AZURE_RESOURCE_GROUP=twitch-bot-rg          # or your RG
export AZURE_APP_SERVICE_PLAN=streamhelper971-plan # existing Linux plan
export AZURE_WEBAPP_NAME=skribbleio-socket-0322    # change if taken
export CLIENT_ORIGIN=https://skribbleio.vercel.app,https://client-834r.vercel.app

./scripts/deploy-azure-server.sh
```

The script creates (if missing):

- Resource group `skribble-rg` (default region `centralindia`)
- Linux App Service plan + Web App on **Node 22**
- **WebSockets enabled**
- `CLIENT_ORIGIN` for CORS
- Zip deploy of `server/` (`node dist/index.js`)

Verify:

```bash
curl "https://${AZURE_WEBAPP_NAME}.azurewebsites.net/api/health"
# {"ok":true,"mode":"azure-app-service"}
```

## Point the Vercel client at Azure

`VITE_SOCKET_URL` is baked in at build time:

```bash
cd client
printf '%s' "https://${AZURE_WEBAPP_NAME}.azurewebsites.net" | vercel env add VITE_SOCKET_URL production
# update if it already exists: remove then re-add, or use Vercel dashboard
vercel --prod
```

Open https://skribbleio.vercel.app — status should stay **Connected**; create/join rooms should work.

## Optional: stop using the Vercel server project

You can leave `skribble-server` unused or delete it in the Vercel dashboard to avoid confusion. Only the client project needs `VITE_SOCKET_URL`.

## Troubleshooting

- **`contentscript.js` / `ObjectMultiplex`** in the console → browser extension (e.g. MetaMask), not this app; safe to ignore.
- **502 / app not starting** → Azure Portal → Web App → **Log stream**; ensure startup is `node dist/index.js`.
- **CORS errors** → `CLIENT_ORIGIN` must include the exact client origin (no trailing slash).
- **Cold start on F1** → first request after idle can take 30–60s; retry or use **B1** + Always On.

## Manual Azure (without script)

```bash
az group create -n skribble-rg -l centralindia
az appservice plan create -n skribble-plan -g skribble-rg --sku F1 --is-linux
az webapp create -n YOUR_APP -g skribble-rg -p skribble-plan --runtime "NODE:22-lts"
az webapp config set -g skribble-rg -n YOUR_APP --web-sockets-enabled true --startup-file "node dist/index.js"
az webapp config appsettings set -g skribble-rg -n YOUR_APP --settings CLIENT_ORIGIN=https://skribbleio.vercel.app
# then zip deploy from server/ after npm ci && npm run build (see deploy-azure-server.sh)
```
