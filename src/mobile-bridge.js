import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const isNative = Capacitor.isNativePlatform();
const originalAnchorClick = HTMLAnchorElement.prototype.click;
const PLUGIN_DIRECTORY = 'blockbench-mobile/plugins';
let exportInProgress = false;

window.__BLOCKBENCH_MOBILE__ = {
  native: isNative,
  version: '0.2.0',
  immersive: true,
  persistentExternalPlugins: true,
};

function message(text, duration = 2200) {
  try {
    if (window.Blockbench?.showQuickMessage) {
      window.Blockbench.showQuickMessage(text, duration);
      return;
    }
  } catch (_) {}
  console.info(`[Blockbench Mobile] ${text}`);
}

function sanitizeFilename(filename) {
  const cleaned = String(filename || 'blockbench-export.bin')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .trim();
  return cleaned || 'blockbench-export.bin';
}

function sanitizePluginId(id) {
  const cleaned = String(id || 'external_plugin')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'external_plugin';
}

function pluginPath(id) {
  return `${PLUGIN_DIRECTORY}/${sanitizePluginId(id)}.js`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo exportado'));
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

async function saveExternalPlugin(id, code, originalName) {
  if (!isNative) return null;
  if (typeof code !== 'string' || code.length < 20) {
    throw new Error('El archivo del plugin está vacío o no es texto JavaScript válido');
  }

  const path = pluginPath(id);
  await Filesystem.writeFile({
    path,
    data: code,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  await Filesystem.writeFile({
    path: `${path}.metadata.json`,
    data: JSON.stringify({
      id: String(id),
      originalName: String(originalName || `${id}.js`),
      installedAt: new Date().toISOString(),
      mobileVersion: window.__BLOCKBENCH_MOBILE__.version,
    }),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  console.info(`[Blockbench Mobile] Plugin persistido: ${id}`);
  return { path: `${id}.js` };
}

async function readExternalPlugin(id) {
  if (!isNative) return null;
  try {
    const result = await Filesystem.readFile({
      path: pluginPath(id),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    const code = typeof result.data === 'string' ? result.data : await result.data.text();
    return { code, path: `${id}.js` };
  } catch (error) {
    console.warn(`[Blockbench Mobile] No se encontró el plugin persistido: ${id}`, error);
    return null;
  }
}

async function removeExternalPlugin(id) {
  if (!isNative) return;
  const paths = [pluginPath(id), `${pluginPath(id)}.metadata.json`];
  for (const path of paths) {
    try {
      await Filesystem.deleteFile({ path, directory: Directory.Data });
    } catch (_) {
      // Puede no existir; la desinstalación debe continuar.
    }
  }
}

window.__BLOCKBENCH_MOBILE_PLUGIN_STORAGE__ = {
  save: saveExternalPlugin,
  read: readExternalPlugin,
  remove: removeExternalPlugin,
};

async function shareDownload(href, filename) {
  if (!isNative || exportInProgress) return false;
  if (!href || (!href.startsWith('blob:') && !href.startsWith('data:'))) return false;

  exportInProgress = true;
  const safeName = sanitizeFilename(filename);
  message(`Preparando ${safeName}…`);

  try {
    const response = await fetch(href);
    if (!response.ok) throw new Error(`No se pudo leer la descarga (${response.status})`);

    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    const cachePath = `exports/${Date.now()}-${safeName}`;

    await Filesystem.writeFile({
      path: cachePath,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });

    const { uri } = await Filesystem.getUri({
      path: cachePath,
      directory: Directory.Cache,
    });

    await Share.share({
      title: `Exportar ${safeName}`,
      text: 'Archivo exportado desde Blockbench Mobile Community',
      files: [uri],
      dialogTitle: 'Guardar o compartir archivo',
    });

    message('Archivo listo para guardar o compartir');
    return true;
  } catch (error) {
    console.error('[Blockbench Mobile] Error al exportar', error);
    message(`Error al exportar: ${error?.message || error}`, 5000);
    return false;
  } finally {
    exportInProgress = false;
  }
}

HTMLAnchorElement.prototype.click = function mobileDownloadClick() {
  if (isNative && this.download && this.href) {
    void shareDownload(this.href, this.download).then((handled) => {
      if (!handled) originalAnchorClick.call(this);
    });
    return;
  }
  return originalAnchorClick.call(this);
};

document.addEventListener('click', (event) => {
  if (!isNative) return;
  const anchor = event.target instanceof Element ? event.target.closest('a[download]') : null;
  if (!anchor?.href) return;
  if (!anchor.href.startsWith('blob:') && !anchor.href.startsWith('data:')) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  void shareDownload(anchor.href, anchor.download);
}, true);

if (isNative) {
  document.documentElement.classList.add('blockbench-mobile-native');

  App.addListener('resume', () => {
    document.documentElement.classList.add('blockbench-mobile-native');
    window.dispatchEvent(new Event('resize'));
  });

  App.addListener('backButton', () => {
    const openMenu = document.querySelector('.contextMenu, .menu.open, dialog[open], .dialog_wrapper.open');
    if (openMenu) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      return;
    }

    const onStartScreen = document.querySelector('#page_wrapper.start_screen');
    if (onStartScreen) {
      void App.exitApp();
      return;
    }

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  });
}
