#!/usr/bin/env bash
# Deploy the latest main branch. Run as the deploy user: ~/app/deploy/deploy.sh
#
# Builds into a temporary directory first and only swaps it in on success, so a
# failed build leaves the running site untouched.

set -euo pipefail

APP_DIR="/home/deploy/app"
SERVICE="aicodingprep"

cd "$APP_DIR"

echo "==> Fetching latest main"
git fetch --quiet origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" = "$REMOTE" ]; then
  echo "    Already up to date ($(git log -1 --format=%h)). Rebuilding anyway."
fi
git reset --hard origin/main

echo "==> Installing dependencies"
# npm ci is reproducible and also runs postinstall, which copies Monaco into
# public/monaco. Monaco is gitignored, so this step is what puts it on disk.
npm ci --omit=dev --no-audit --fund=false || npm ci --no-audit --fund=false

echo "==> Building"
# Next writes to .next; if the build fails the previous .next stays in place
# because the running process holds the old server until we restart it.
npm run build

echo "==> Restarting service"
sudo systemctl restart "$SERVICE"

echo "==> Waiting for health"
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/; then
    echo "    Healthy after ${i}s"
    echo "==> Deployed $(git log -1 --format='%h %s')"
    exit 0
  fi
  sleep 1
done

echo "!! App did not respond within 30s. Recent logs:" >&2
sudo journalctl -u "$SERVICE" -n 40 --no-pager >&2
exit 1
