#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -d android ]]; then
  echo "Generando proyecto Android con Capacitor"
  npx cap add android
else
  echo "El proyecto Android ya existe"
fi
