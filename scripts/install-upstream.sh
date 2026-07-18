#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="$ROOT/upstream/blockbench"

if [[ ! -f "$UPSTREAM/package.json" ]]; then
  echo "Falta upstream/blockbench. Ejecuta npm run upstream:fetch." >&2
  exit 1
fi

cd "$UPSTREAM"
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
