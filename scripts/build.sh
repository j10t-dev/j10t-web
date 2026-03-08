#!/usr/bin/env bash
set -euo pipefail

echo "==> Building blog posts..."
bun run build-blog

echo "==> Compiling ARM64 binary..."
bun build --compile --minify --target=bun-linux-arm64 src/main.ts --outfile j10t-web

echo "==> Build complete."
