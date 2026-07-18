import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'package.json',
  'capacitor.config.json',
  'config/upstream.json',
  'src/mobile-bridge.js',
  'src/mobile.css',
  'scripts/fetch-upstream.sh',
  'scripts/prepare-web.mjs',
  '.github/workflows/build-android.yml',
  'LICENSE',
  'README.md',
];

let failed = false;
for (const item of required) {
  const target = path.join(root, item);
  if (!fs.existsSync(target)) {
    console.error(`FALTA: ${item}`);
    failed = true;
  } else {
    console.log(`OK: ${item}`);
  }
}

const upstream = JSON.parse(fs.readFileSync(path.join(root, 'config/upstream.json'), 'utf8'));
if (!/^v\d+\.\d+\.\d+/.test(upstream.ref)) {
  console.error('La referencia de Blockbench no parece una etiqueta estable');
  failed = true;
}

if (failed) process.exit(1);
console.log(`Validación completada. Blockbench fijado a ${upstream.ref}.`);
