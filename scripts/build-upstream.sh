#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="$ROOT/upstream/blockbench"

[[ -f "$UPSTREAM/package.json" ]] || { echo "Falta Blockbench upstream" >&2; exit 1; }

node "$ROOT/scripts/patch-upstream.mjs"

cd "$UPSTREAM"
npm run build-web
