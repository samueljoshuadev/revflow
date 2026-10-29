#!/usr/bin/env bash
# Build and release the CRM on the Hostinger VPS.
#
#   /var/www/loovimob/repo    bare-ish git checkout, origin = GitHub
#   /var/www/loovimob/shared  .env.production (root-owned, chmod 600)
#   /var/www/loovimob/current symlink to the live release
#   /var/www/loovimob/releases/<timestamp>
#
# Usage: deploy/deploy.sh [branch]   (default: main)

set -euo pipefail

BRANCH="${1:-main}"
ROOT="/var/www/loovimob"
REPO="$ROOT/repo"
SHARED="$ROOT/shared"
RELEASE="$ROOT/releases/$(date -u +%Y%m%d%H%M%S)"

test -f "$SHARED/.env.production" || {
  echo "missing $SHARED/.env.production" >&2
  exit 1
}

git -C "$REPO" fetch --prune origin
git -C "$REPO" checkout -q "$BRANCH"
git -C "$REPO" reset --hard "origin/$BRANCH"

mkdir -p "$RELEASE"
git -C "$REPO" archive "origin/$BRANCH" | tar -x -C "$RELEASE"

cd "$RELEASE"
cp "$SHARED/.env.production" .env.production
npm ci
npm run lint
npm run typecheck
npm run build

# output: "standalone" emits a server bundle that does not include public/ or
# the client chunks, so assemble a self-contained tree before switching over.
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static

ln -sfn "$RELEASE" "$ROOT/current"

if pm2 describe loovimob >/dev/null 2>&1; then
  pm2 reload "$RELEASE/deploy/ecosystem.config.cjs" --update-env
else
  pm2 start "$RELEASE/deploy/ecosystem.config.cjs"
fi
pm2 save

# Wait for the app to answer before declaring the release good.
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/api/health; then
    echo "release $RELEASE is live"
    # Keep the five most recent releases.
    ls -1dt "$ROOT"/releases/* | tail -n +6 | xargs -r rm -rf
    exit 0
  fi
  sleep 2
done

echo "health check failed for $RELEASE" >&2
exit 1
