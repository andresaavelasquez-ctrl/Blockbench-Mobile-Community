import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const isNative = Capacitor.isNativePlatform();
const originalAnchorClick = HTMLAnchorElement.prototype.click;
let exportInProgress = false;

window.__BLOCKBENCH_MOBILE__ = {
  native: isNative,
  version: '0.1.0',
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
