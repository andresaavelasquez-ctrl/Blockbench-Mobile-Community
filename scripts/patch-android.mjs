import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
if (!fs.existsSync(android)) throw new Error('Falta android/. Ejecuta npm run android:ensure');

const stringsPath = path.join(android, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsPath)) {
  let strings = fs.readFileSync(stringsPath, 'utf8');
  strings = strings
    .replace(/<string name="app_name">[\s\S]*?<\/string>/, '<string name="app_name">Blockbench Mobile Community</string>')
    .replace(/<string name="title_activity_main">[\s\S]*?<\/string>/, '<string name="title_activity_main">Blockbench Mobile Community</string>');
  fs.writeFileSync(stringsPath, strings);
}

const manifestPath = path.join(android, 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  if (!manifest.includes('android.permission.INTERNET')) {
    manifest = manifest.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.INTERNET" />');
  }

  const appAttributes = [
    ['android:hardwareAccelerated', 'true'],
    ['android:largeHeap', 'true'],
    ['android:usesCleartextTraffic', 'false'],
  ];
  for (const [attribute, value] of appAttributes) {
    if (!manifest.includes(`${attribute}=`)) {
      manifest = manifest.replace(/<application\s+/, `<application\n        ${attribute}="${value}"\n        `);
    }
  }

  const activityAttributes = [
    ['android:windowSoftInputMode', 'adjustResize'],
    ['android:screenOrientation', 'unspecified'],
  ];
  for (const [attribute, value] of activityAttributes) {
    if (!manifest.includes(`${attribute}=`)) {
      manifest = manifest.replace(
        /android:name="\.MainActivity"/,
        `android:name=".MainActivity"\n            ${attribute}="${value}"`,
      );
    }
  }

  fs.writeFileSync(manifestPath, manifest);
}

const javaRoot = path.join(android, 'app', 'src', 'main', 'java');
let mainActivityPath = null;
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name === 'MainActivity.java') mainActivityPath = target;
  }
}
walk(javaRoot);

if (mainActivityPath) {
  const original = fs.readFileSync(mainActivityPath, 'utf8');
  const packageMatch = original.match(/package\s+([\w.]+);/);
  const packageName = packageMatch?.[1] || 'com.andres.blockbenchmobile.community';
  const content = `package ${packageName};\n\nimport android.os.Bundle;\nimport android.view.WindowManager;\nimport android.webkit.WebSettings;\n\nimport com.getcapacitor.BridgeActivity;\n\npublic class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);\n\n        if (getBridge() != null && getBridge().getWebView() != null) {\n            WebSettings settings = getBridge().getWebView().getSettings();\n            settings.setDomStorageEnabled(true);\n            settings.setDatabaseEnabled(true);\n            settings.setMediaPlaybackRequiresUserGesture(false);\n        }\n    }\n}\n`;
  fs.writeFileSync(mainActivityPath, content);
}

console.log('Proyecto Android parcheado para Blockbench Mobile Community');
