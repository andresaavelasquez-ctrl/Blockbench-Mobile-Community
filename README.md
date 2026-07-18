# Blockbench Mobile Community

Adaptación comunitaria **no oficial** de Blockbench para Android. El repositorio descarga una versión fija del código original, compila la aplicación web, aplica ajustes táctiles y la empaqueta como APK mediante Capacitor y GitHub Actions.

## Estado de esta primera versión

Esta base genera una APK Android `debug` instalable que incluye:

- Blockbench 5.1.5 compilado dentro de la aplicación.
- Funcionamiento principal sin cargar la página oficial desde Internet.
- Interfaz con ajustes conservadores para controles táctiles.
- Importación mediante el selector de archivos del WebView/Android.
- Intercepción de exportaciones tipo descarga y apertura del panel Android para guardar o compartir el archivo.
- Soporte de botón Atrás y almacenamiento local de la aplicación.
- Compilación automática en GitHub Actions.

Limitaciones conocidas de la versión inicial:

- Es una adaptación híbrida basada en la versión web, no una reescritura nativa completa.
- Algunos plugins que dependan de Electron, Node.js o acceso directo al sistema de archivos no funcionarán.
- La apertura directa mediante “Abrir con” desde otras aplicaciones todavía no está implementada.
- La interfaz original de Blockbench es compleja; teléfonos pequeños funcionan mejor en orientación horizontal.

## Estructura

```text
.github/workflows/build-android.yml  Compilación automática
config/upstream.json                Versión exacta de Blockbench
scripts/                            Descarga, compilación y empaquetado
src/mobile-bridge.js                Puente móvil de exportación y botón Atrás
src/mobile.css                      Ajustes táctiles
capacitor.config.json               Configuración Android
install.sh                          Preparación desde Termux/Linux
```

`upstream/`, `www/` y `android/` se generan automáticamente y no se suben al repositorio.

## Subirlo a un repositorio nuevo desde Termux

Instala herramientas:

```bash
pkg update -y
pkg install git gh nodejs-lts unzip -y
termux-setup-storage
```

Descomprime el ZIP descargado y entra en la carpeta:

```bash
cd /sdcard/Download
unzip Blockbench-Mobile-Community-v0.1.0.zip
cd Blockbench-Mobile-Community
```

Configura Git la primera vez:

```bash
git config --global user.name "Andres Acevedo"
git config --global user.email "TU_CORREO_DE_GITHUB"
```

Inicia sesión con GitHub CLI:

```bash
gh auth login
```

Elige `GitHub.com`, `HTTPS` y la autenticación mediante navegador. Luego crea el repositorio, realiza el commit y súbelo:

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit: Blockbench Mobile Community Android"
gh repo create Blockbench-Mobile-Community --public --source=. --remote=origin --push
```

El repositorio quedará en tu cuenta conectada. Para usar directamente tu usuario conocido:

```bash
git remote -v
# Debe mostrar algo similar a:
# https://github.com/andresaavelasquez-ctrl/Blockbench-Mobile-Community.git
```

### Alternativa sin GitHub CLI

Crea manualmente un repositorio vacío llamado `Blockbench-Mobile-Community` en GitHub y ejecuta:

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit: Blockbench Mobile Community Android"
git remote add origin https://github.com/andresaavelasquez-ctrl/Blockbench-Mobile-Community.git
git push -u origin main
```

## Obtener la APK desde GitHub

Después del primer `push`:

1. Abre el repositorio en GitHub.
2. Entra en **Actions**.
3. Abre el flujo **Compilar APK Android**.
4. Espera a que el trabajo termine correctamente.
5. Abre la ejecución y descarga el artefacto **Blockbench-Mobile-APK**.
6. Descomprime el artefacto; dentro estará `Blockbench-Mobile-5.1.5-debug.apk`.

También puedes iniciar una compilación manual desde **Actions → Compilar APK Android → Run workflow**.

## Actualizar Blockbench más adelante

Edita `config/upstream.json` y cambia:

```json
"ref": "v5.1.5"
```

por una etiqueta nueva y estable. Después:

```bash
git add config/upstream.json
git commit -m "Update Blockbench upstream"
git push
```

## Preparación local opcional

En Termux o Linux puedes descargar y compilar la parte web:

```bash
chmod +x install.sh scripts/*.sh
./install.sh
npm run upstream:fetch
npm run upstream:install
npm run upstream:build
npm run web:prepare
```

La compilación APK local requiere Android SDK, Java y Gradle correctamente configurados. Para un teléfono con Termux, GitHub Actions es la opción recomendada.

## Licencia

Este repositorio y sus modificaciones se distribuyen bajo GPL-3.0-or-later. Blockbench también declara GPL-3.0-or-later. Consulta `LICENSE` y `NOTICE.md`.
