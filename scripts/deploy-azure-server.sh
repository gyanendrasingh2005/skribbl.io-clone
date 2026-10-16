#!/usr/bin/env bash
# Deploy API (server workspace) to Azure App Service. Client stays on Vercel.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RG="${AZURE_RESOURCE_GROUP:-skribble-rg}"
LOCATION="${AZURE_LOCATION:-centralindia}"
PLAN="${AZURE_APP_SERVICE_PLAN:-skribble-plan}"
APP="${AZURE_WEBAPP_NAME:-skribbleio-api}"
SKU="${AZURE_APP_SERVICE_SKU:-B1}"
CLIENT_ORIGIN="${CLIENT_ORIGIN:-https://skribbleio.vercel.app}"

if ! command -v az >/dev/null; then
  echo "Install Azure CLI: https://learn.microsoft.com/cli/azure/install-azure-cli"
  exit 1
fi

az account show >/dev/null || { echo "Run: az login"; exit 1; }

if ! az group show --name "$RG" >/dev/null 2>&1; then
  echo "==> Resource group ($RG) in $LOCATION"
  az group create --name "$RG" --location "$LOCATION" --output none
fi

if ! az appservice plan show --name "$PLAN" --resource-group "$RG" >/dev/null 2>&1; then
  echo "==> App Service plan ($PLAN, $SKU)"
  az appservice plan create \
    --name "$PLAN" \
    --resource-group "$RG" \
    --sku "$SKU" \
    --is-linux \
    --output none
fi

if ! az webapp show --name "$APP" --resource-group "$RG" >/dev/null 2>&1; then
  echo "==> Web app $APP (NODE 22)"
  az webapp create \
    --name "$APP" \
    --resource-group "$RG" \
    --plan "$PLAN" \
    --runtime "NODE:22-lts" \
    --output none
fi

echo "==> WebSockets + app settings"
az webapp config set \
  --resource-group "$RG" \
  --name "$APP" \
  --web-sockets-enabled true \
  --startup-file "node server/dist/index.js" \
  --output none

az webapp config appsettings set \
  --resource-group "$RG" \
  --name "$APP" \
  --settings \
    "CLIENT_ORIGIN=$CLIENT_ORIGIN" \
    "SCM_DO_BUILD_DURING_DEPLOYMENT=false" \
    "ENABLE_ORYX_BUILD=false" \
    "WEBSITE_NODE_DEFAULT_VERSION=~22" \
  --output none

echo "==> Build (monorepo workspaces)"
cd "$ROOT"
npm ci
npm run build --workspace=server
npm prune --omit=dev

ZIP="$ROOT/skribble-server-azure.zip"
rm -f "$ZIP"
zip -qr "$ZIP" \
  package.json \
  package-lock.json \
  node_modules \
  server/package.json \
  server/dist

echo "==> Zip deploy to https://${APP}.azurewebsites.net ($(du -h "$ZIP" | cut -f1))"
az webapp deploy \
  --resource-group "$RG" \
  --name "$APP" \
  --src-path "$ZIP" \
  --type zip \
  --clean true \
  --restart true \
  --async true \
  --output none

rm -f "$ZIP"

API_URL="https://${APP}.azurewebsites.net"
echo ""
echo "Server URL: $API_URL"
echo "Health:     $API_URL/api/health"
echo "(Give Azure 1–2 minutes after deploy, then curl health.)"
echo ""
echo "Point the Vercel client at this host:"
echo "  cd client && vercel env rm VITE_SOCKET_URL production -y 2>/dev/null; printf '%s' '$API_URL' | vercel env add VITE_SOCKET_URL production"
echo "  cd client && vercel --prod"
