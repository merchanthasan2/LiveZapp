#!/usr/bin/env bash
# Run this script ON the VPS from the app repo root (after git is configured).
# Usage: ./scripts/vps-deploy.sh
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-live-zapp_prod_v01}"
SERVICE="${SYSTEMD_SERVICE:-livezapp.service}"

echo "==> LiveZapp deploy: branch=$BRANCH service=$SERVICE"
echo "==> $(git rev-parse --short HEAD 2>/dev/null || echo 'not a git repo')"

git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Installing deps (ci)..."
npm ci

echo "==> Building..."
npm run build

if systemctl is-active --quiet "$SERVICE" 2>/dev/null; then
  echo "==> Restarting $SERVICE..."
  sudo systemctl restart "$SERVICE"
elif command -v pm2 >/dev/null 2>&1; then
  echo "==> PM2 detected — restart your process manually if needed (e.g. pm2 restart livezapp)"
else
  echo "==> No systemd unit '$SERVICE' and no pm2; start the app yourself (e.g. npm start)."
fi

echo "==> Done. HEAD: $(git rev-parse HEAD)"
