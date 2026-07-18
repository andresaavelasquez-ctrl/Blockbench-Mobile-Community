#!/usr/bin/env bash
set -euo pipefail

printf '\nBlockbench Mobile Community - preparación del repositorio\n\n'

for command in git node npm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Falta el comando: $command" >&2
    echo "En Termux: pkg install git nodejs-lts -y" >&2
    exit 1
  fi
done

node scripts/validate-project.mjs
npm install

echo
echo "Dependencias instaladas."
echo "Para preparar el código web: npm run upstream:fetch && npm run upstream:install && npm run upstream:build && npm run web:prepare"
echo "La compilación Android recomendada se realiza desde GitHub Actions."
