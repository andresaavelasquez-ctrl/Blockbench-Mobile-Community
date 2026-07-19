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
    ['android:resizeableActivity', 'true'],
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

function walk(directory, visitor) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, visitor);
    else visitor(target, entry.name);
  }
}

const immersiveStyleItems = [
  ['android:windowFullscreen', 'true'],
  ['android:windowNoTitle', 'true'],
  ['android:windowActionModeOverlay', 'true'],
  ['android:windowDrawsSystemBarBackgrounds', 'true'],
  ['android:statusBarColor', '@android:color/transparent'],
  ['android:navigationBarColor', '@android:color/transparent'],
  ['android:windowLightStatusBar', 'false'],
  ['android:windowLightNavigationBar', 'false'],
  ['android:enforceStatusBarContrast', 'false'],
  ['android:enforceNavigationBarContrast', 'false'],
  ['android:windowLayoutInDisplayCutoutMode', 'shortEdges'],
];

const resRoot = path.join(android, 'app', 'src', 'main', 'res');
walk(resRoot, (target, name) => {
  if (name !== 'styles.xml') return;
  let styles = fs.readFileSync(target, 'utf8');
  styles = styles.replace(
    /<style\s+name="([^"]*AppTheme\.NoActionBar[^"]*)"[^>]*>[\s\S]*?<\/style>/g,
    (block) => {
      let patched = block;
      for (const [itemName, value] of immersiveStyleItems) {
        if (!patched.includes(`name="${itemName}"`)) {
          patched = patched.replace(
            '</style>',
            `    <item name="${itemName}">${value}</item>\n    </style>`,
          );
        }
      }
      return patched;
    },
  );
  fs.writeFileSync(target, styles);
});

const javaRoot = path.join(android, 'app', 'src', 'main', 'java');
let mainActivityPath = null;
walk(javaRoot, (target, name) => {
  if (name === 'MainActivity.java') mainActivityPath = target;
});

if (mainActivityPath) {
  const original = fs.readFileSync(mainActivityPath, 'utf8');
  const packageMatch = original.match(/package\s+([\w.]+);/);
  const packageName = packageMatch?.[1] || 'com.andres.blockbenchmobile.community';

  const content = `package ${packageName};

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final long IMMERSIVE_REAPPLY_DELAY_MS = 180L;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        configureDisplayCutout();
        applyImmersiveMode();

        View decorView = getWindow().getDecorView();
        decorView.setOnSystemUiVisibilityChangeListener(visibility ->
            decorView.postDelayed(this::applyImmersiveMode, IMMERSIVE_REAPPLY_DELAY_MS)
        );

        if (getBridge() != null && getBridge().getWebView() != null) {
            View webView = getBridge().getWebView();
            webView.setFitsSystemWindows(false);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

            WebSettings settings = getBridge().getWebView().getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
        }
    }

    private void configureDisplayCutout() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                attributes.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
            } else {
                attributes.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            }
            getWindow().setAttributes(attributes);
        }
    }

    private void applyImmersiveMode() {
        Window window = getWindow();
        View decorView = window.getDecorView();

        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, decorView);
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        controller.hide(WindowInsetsCompat.Type.systemBars());

        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        );
    }

    @Override
    public void onResume() {
        super.onResume();
        getWindow().getDecorView().postDelayed(
            this::applyImmersiveMode,
            IMMERSIVE_REAPPLY_DELAY_MS
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            getWindow().getDecorView().postDelayed(
                this::applyImmersiveMode,
                IMMERSIVE_REAPPLY_DELAY_MS
            );
        }
    }
}
`;
  fs.writeFileSync(mainActivityPath, content);
}

console.log('Proyecto Android parcheado: pantalla inmersiva, cutout completo y WebView persistente');
