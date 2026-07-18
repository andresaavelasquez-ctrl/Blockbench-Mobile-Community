#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/config/upstream.json"

REPOSITORY="${BLOCKBENCH_REPOSITORY:-$(node -e "const c=require('$CONFIG'); process.stdout.write(c.repository)")}" 
REF="${BLOCKBENCH_REF:-$(node -e "const c=require('$CONFIG'); process.stdout.write(c.ref)")}" 
REL_DIR="$(node -e "const c=require('$CONFIG'); process.stdout.write(c.directory)")"
TARGET="$ROOT/$REL_DIR"

mkdir -p "$(dirname "$TARGET")"

if [[ -d "$TARGET/.git" ]]; then
  echo "Actualizando Blockbench en $TARGET"
  git -C "$TARGET" fetch --depth 1 origin "$REF"
  git -C "$TARGET" checkout --force FETCH_HEAD
  git -C "$TARGET" clean -fdx
else
  rm -rf "$TARGET"
  echo "Clonando Blockbench $REF"
  git clone --depth 1 --branch "$REF" "$REPOSITORY" "$TARGET"
fi

echo "Blockbench listo: $(git -C "$TARGET" describe --tags --always)"
