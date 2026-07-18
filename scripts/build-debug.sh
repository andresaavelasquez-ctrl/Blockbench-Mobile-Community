#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm install
npm run upstream:fetch
npm run upstream:install
npm run upstream:build
npm run web:prepare
npm run android:ensure
npx cap sync android
npm run android:patch

cd android
chmod +x gradlew
./gradlew assembleDebug --stacktrace

mkdir -p "$ROOT/dist"
VERSION="$(node -e "const p=require('$ROOT/upstream/blockbench/package.json'); process.stdout.write(p.version)")"
cp app/build/outputs/apk/debug/app-debug.apk "$ROOT/dist/Blockbench-Mobile-${VERSION}-debug.apk"
echo "APK: $ROOT/dist/Blockbench-Mobile-${VERSION}-debug.apk"
