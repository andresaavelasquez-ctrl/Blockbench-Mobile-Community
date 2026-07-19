import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginLoaderPath = path.join(root, 'upstream', 'blockbench', 'js', 'plugin_loader.ts');

if (!fs.existsSync(pluginLoaderPath)) {
  throw new Error(`No se encontró plugin_loader.ts: ${pluginLoaderPath}`);
}

let source = fs.readFileSync(pluginLoaderPath, 'utf8');
const marker = 'BLOCKBENCH_MOBILE_PERSISTENT_PLUGINS_V1';

if (source.includes(marker)) {
  console.log('Persistencia móvil de plugins ya aplicada');
  process.exit(0);
}

function requireReplacement(description, before, after) {
  if (!source.includes(before)) {
    throw new Error(`No se pudo aplicar "${description}". Blockbench upstream cambió y necesita revisión.`);
  }
  source = source.replace(before, after);
}

const importAnchor = 'import { markerColors } from "./marker_colors";';
requireReplacement(
  'puente de almacenamiento persistente',
  importAnchor,
  `${importAnchor}

// BLOCKBENCH_MOBILE_PERSISTENT_PLUGINS_V1
const MobilePluginStorage = (globalThis as any).__BLOCKBENCH_MOBILE_PLUGIN_STORAGE__;
`,
);

requireReplacement(
  'permitir recarga de plugins móviles desde archivo',
  'if (!isApp && !first) return this;',
  'if (!isApp && !first && !MobilePluginStorage) return this;',
);

requireReplacement(
  'guardar contenido del plugin seleccionado',
  '\t\t\tthis.#runCode(file.content as string);',
  `\t\t\tconst pluginCode = file.content as string;
\t\t\tthis.#runCode(pluginCode);
\t\t\tscope.path = file.path || file.name || \`\${this.id}.js\`;
\t\t\tif (MobilePluginStorage && first) {
\t\t\t\ttry {
\t\t\t\t\tconst persisted = await MobilePluginStorage.save(this.id, pluginCode, file.name || scope.path);
\t\t\t\t\tif (persisted?.path) scope.path = persisted.path;
\t\t\t\t} catch (error) {
\t\t\t\t\tconsole.error('No se pudo conservar el plugin externo en Android', error);
\t\t\t\t}
\t\t\t}`,
);

const fileLoadPattern = /if \(isApp && fs\.existsSync\(installation\.path\)\) \{([\s\S]*?)\n\s*\} else \{\n\s*Plugins\.installed\.remove\(installation\);\n\s*\}/;
const fileLoadMatch = source.match(fileLoadPattern);
if (!fileLoadMatch) {
  throw new Error('No se encontró el bloque de restauración de plugins desde archivo.');
}

const originalDesktopBody = fileLoadMatch[1];
const mobileFileLoader = `if (isApp && fs.existsSync(installation.path)) {${originalDesktopBody}
\t\t\t\t} else if (MobilePluginStorage) {
\t\t\t\t\tconst mobileInstance = new Plugin(installation.id, {disabled: installation.disabled});
\t\t\t\t\tconst mobilePromise = MobilePluginStorage.read(installation.id).then((saved) => {
\t\t\t\t\t\tif (!saved || typeof saved.code !== 'string' || saved.code.length < 20) {
\t\t\t\t\t\t\tPlugins.installed.remove(installation);
\t\t\t\t\t\t\tStateMemory.save('installed_plugins');
\t\t\t\t\t\t\tconsole.warn(\`No se encontró la copia persistente del plugin "\${installation.id}"\`);
\t\t\t\t\t\t\treturn;
\t\t\t\t\t\t}
\t\t\t\t\t\treturn mobileInstance.loadFromFile({
\t\t\t\t\t\t\tpath: \`\${installation.id}.js\`,
\t\t\t\t\t\t\tname: \`\${installation.id}.js\`,
\t\t\t\t\t\t\tcontent: saved.code,
\t\t\t\t\t\t}, false);
\t\t\t\t\t}).catch((error) => {
\t\t\t\t\t\tconsole.error(\`Error restaurando plugin móvil "\${installation.id}"\`, error);
\t\t\t\t\t});
\t\t\t\t\tinstall_promises.push(mobilePromise);
\t\t\t\t\tload_counter++;
\t\t\t\t\tconsole.log(\`🧩📱 Restaurando plugin móvil "\${installation.id}"\`);
\t\t\t\t} else {
\t\t\t\t\tPlugins.installed.remove(installation);
\t\t\t\t}`;

source = source.replace(fileLoadPattern, mobileFileLoader);

requireReplacement(
  'eliminar copia persistente al desinstalar',
  '\t\tthis.disabled = false;\n',
  `\t\tthis.disabled = false;

\t\tif (!isApp && this.source == 'file' && MobilePluginStorage) {
\t\t\tvoid MobilePluginStorage.remove(this.id).catch((error) => {
\t\t\t\tconsole.error(\`No se pudo borrar la copia móvil del plugin "\${this.id}"\`, error);
\t\t\t});
\t\t}
`,
);

fs.writeFileSync(pluginLoaderPath, source);
console.log('Blockbench upstream parcheado: plugins externos persistentes en Android');
