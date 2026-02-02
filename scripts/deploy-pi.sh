#!/usr/bin/env bash
set -euo pipefail

PI_HOST="admin@pihost.local"
PI_DIR="/home/admin/opt/j10t-web"

echo "==> Building blog posts..."
bun run build-blog

echo "==> Compiling ARM64 binary..."
bun build --compile --minify --target=bun-linux-arm64 src/main.ts --outfile j10t-web

echo "==> Syncing to Pi..."
rsync -av \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='bun.lock' \
    --exclude='backlog.md' \
    --exclude='docs/' \
    --exclude='content/' \
    ./ "$PI_HOST:$PI_DIR/"

echo "==> Restarting service..."
ssh "$PI_HOST" 'sudo systemctl restart j10t-web.service'

echo "==> Done!"
