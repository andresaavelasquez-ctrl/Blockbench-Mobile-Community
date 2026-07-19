import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upstream = path.join(root, 'upstream', 'blockbench');
const www = path.join(root, 'www');

function ensureExists(target, description) {
  if (!fs.existsSync(target)) throw new Error(`Falta ${description}: ${target}`);
}

ensureExists(path.join(upstream, 'index.html'), 'index.html de Blockbench');
ensureExists(path.join(upstream, 'dist', 'bundle.js'), 'dist/bundle.js; ejecuta npm run upstream:build');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

const directories = ['assets', 'css', 'font', 'lib', 'lang', 'dist'];
for (const directory of directories) {
  const source = path.join(upstream, directory);
  if (fs.existsSync(source)) {
    fs.cpSync(source, path.join(www, directory), { recursive: true });
  }
}

const files = [
  'index.html',
  'favicon.png',
  'icon.png',
  'icon_full.png',
  'manifest.webmanifest',
];
for (const filename of files) {
  const source = path.join(upstream, filename);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(www, filename));
}

const mobileDir = path.join(www, 'mobile');
fs.mkdirSync(mobileDir, { recursive: true });
fs.copyFileSync(path.join(root, 'src', 'mobile.css'), path.join(mobileDir, 'mobile.css'));

await build({
  entryPoints: [path.join(root, 'src', 'mobile-bridge.js')],
  outfile: path.join(mobileDir, 'mobile-bridge.js'),
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: 'browser',
  format: 'iife',
  target: ['chrome100'],
  legalComments: 'eof',
});

const indexPath = path.join(www, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace('<html lang="en">', '<html lang="es">');
html = html.replace('<title>Blockbench</title>', '<title>Blockbench Mobile Community</title>');
html = html.replace(
  /<meta\s+name="viewport"[^>]*>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content">',
);
html = html.replace(
  '<link rel="stylesheet" href="css/setup.css" id="setup_stylesheet">',
  '<link rel="stylesheet" href="css/setup.css" id="setup_stylesheet">\n\t<link rel="stylesheet" href="mobile/mobile.css">',
);
html = html.replace(
  '<script type="module" src="dist/bundle.js"></script>',
  '<script src="mobile/mobile-bridge.js"></script>\n\t<script type="module" src="dist/bundle.js"></script>',
);
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '<!-- PWA manifest disabled inside Android container -->');
fs.writeFileSync(indexPath, html);

const metadata = {
  generatedAt: new Date().toISOString(),
  upstreamVersion: JSON.parse(fs.readFileSync(path.join(upstream, 'package.json'), 'utf8')).version,
  mobileVersion: '0.2.0',
  immersive: true,
  persistentExternalPlugins: true,
};
fs.writeFileSync(path.join(www, 'mobile-build.json'), JSON.stringify(metadata, null, 2));

console.log(`Web app inmersiva preparada en ${www} usando Blockbench ${metadata.upstreamVersion}`);
