/* Nova OS – Brücke zu den nativen Hüllen
 *  - Windows/PC: Electron (window.novaElectron aus electron/preload.js)
 *  - Android:    Capacitor (AppLauncher, App, eigenes NovaKiosk-Plugin)
 *  - Browser:    Fallbacks
 */
(function () {
  'use strict';
  const Nova = window.Nova;
  const cap = window.Capacitor;
  const isAndroid = !!(cap && cap.isNativePlatform && cap.isNativePlatform() && cap.getPlatform() === 'android');
  const isElectron = !!window.novaElectron;
  const plugin = (name) => {
    if (!cap) return null;
    try { return (cap.Plugins && cap.Plugins[name]) || (cap.registerPlugin && cap.registerPlugin(name)); } catch (e) { return null; }
  };

  const native = {
    platform: isAndroid ? 'android' : isElectron ? 'electron' : 'web',
    isAndroid, isElectron,
    canInstallStoreApps: isAndroid,

    async isInstalled(pkg) {
      if (!isAndroid) return false;
      try { const r = await plugin('AppLauncher').canOpenUrl({ url: pkg }); return !!r.value; } catch (e) { return false; }
    },
    async launch(pkg, deadline) {
      if (!isAndroid) return false;
      try {
        await native.setKiosk(false, true);
        await native.guard.setGame(pkg, deadline || 0);
        await plugin('AppLauncher').openUrl({ url: pkg });
        return true;
      } catch (e) { return false; }
    },
    async openStore(pkg) {
      const web = 'https://play.google.com/store/apps/details?id=' + pkg;
      if (isAndroid) {
        await native.setKiosk(false, true);
        await native.guard.allow(['com.android.vending', 'com.google.android.gms', 'com.google.android.packageinstaller', 'com.android.packageinstaller', pkg], 900);
        try { await plugin('AppLauncher').openUrl({ url: 'market://details?id=' + pkg }); return true; }
        catch (e) { try { await plugin('AppLauncher').openUrl({ url: web }); return true; } catch (_) { return false; } }
      }
      if (isElectron) { window.novaElectron.openExternal(web); return true; }
      window.open(web, '_blank', 'noopener');
      return true;
    },
    openExternal(url) {
      if (isElectron) return window.novaElectron.openExternal(url);
      if (isAndroid) { try { return plugin('AppLauncher').openUrl({ url }); } catch (e) {} }
      window.open(url, '_blank', 'noopener');
    },

    /* Kiosk: PC = Vollbild ohne Fensterleiste, Android = App fixieren (Lock Task) */
    _kioskWanted: false,
    async setKiosk(on, temporary) {
      if (!temporary) native._kioskWanted = !!on;
      try {
        if (isElectron) window.novaElectron.setKiosk(!!on);
        else if (isAndroid) { const k = plugin('NovaKiosk'); if (k) await (on ? k.start() : k.stop()); }
      } catch (e) { /* nicht unterstützt */ }
    },
    restoreKiosk() { if (native._kioskWanted) native.setKiosk(true, true); },
    openHomeSettings() { const k = plugin('NovaKiosk'); if (k) k.openHomeSettings().catch(() => {}); },

    /* Nova-Schutz (nur Android): holt Nova zurück, wenn Home/Übersicht gedrückt wird */
    guard: {
      available: isAndroid,
      async status() { try { return await plugin('NovaGuard').status(); } catch (e) { return { usage: false, overlay: false, running: false }; } },
      async start() { try { await plugin('NovaGuard').start(); return true; } catch (e) { return false; } },
      async stop() { try { await plugin('NovaGuard').stop(); } catch (e) {} },
      async setGame(pkg, deadline) { try { await plugin('NovaGuard').setGame({ pkg: pkg || null, deadline: deadline || 0 }); } catch (e) {} },
      async allow(packages, seconds) { try { await plugin('NovaGuard').allow({ packages, seconds }); } catch (e) {} },
      openUsage() { const g = plugin('NovaGuard'); if (g) g.openUsageSettings().catch(() => {}); },
      openOverlay() { const g = plugin('NovaGuard'); if (g) g.openOverlaySettings().catch(() => {}); },
      async consumeReason() { try { return (await plugin('NovaGuard').consumeReason()).reason; } catch (e) { return null; } }
    },

    async exit() {
      Nova.store.flush();
      if (isAndroid) await native.guard.stop();
      if (isElectron) return window.novaElectron.exit();
      if (isAndroid) { await native.setKiosk(false, true); try { await plugin('App').exitApp(); } catch (e) {} return; }
      window.close();
    },

    init({ onBack, onExitRequest, onResume, onGuardReturn }) {
      if (isAndroid) {
        const G = plugin('NovaGuard');
        if (G && onGuardReturn) {
          G.addListener('returned', (d) => onGuardReturn(d && d.reason));
          native.guard.consumeReason().then((r) => { if (r) setTimeout(() => onGuardReturn(r), 600); });
        }
      }
      if (isElectron && window.novaElectron.onExitRequest) window.novaElectron.onExitRequest(onExitRequest);
      if (isAndroid) {
        const App = plugin('App');
        if (App) {
          App.addListener('backButton', onBack);
          App.addListener('resume', onResume);
        }
      }
      document.addEventListener('visibilitychange', () => { if (!document.hidden) onResume(); });
    }
  };
  Nova.native = native;
})();
