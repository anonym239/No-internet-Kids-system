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
    /* ---- Dateien: Token speichern, teilen, Sicherungen finden ---- */
    BACKUP_DIR: 'Nova',
    async saveFile(name, text) {
      if (isAndroid) {
        const FS = plugin('Filesystem');
        try {
          await FS.writeFile({ path: native.BACKUP_DIR + '/' + name, data: text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true });
          return { ok: true, where: 'Dokumente › Nova › ' + name };
        } catch (e) {
          try { await native.shareFile(name, text); return { ok: true, where: 'über „Teilen"' }; } catch (_) { return { ok: false, error: e.message }; }
        }
      }
      if (isElectron) {
        const r = await window.novaElectron.saveFile(name, text);
        return r && r.path ? { ok: true, where: r.path } : { ok: false, cancelled: true };
      }
      Nova.download(name, text, 'text/plain');
      return { ok: true, where: 'Downloads › ' + name };
    },
    async shareFile(name, text) {
      if (isAndroid) {
        const FS = plugin('Filesystem');
        const w = await FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
        await plugin('Share').share({ title: 'Nova Konto-Token', text: 'Mein Nova Konto-Token (gut aufbewahren!)', files: [w.uri], dialogTitle: 'Token speichern oder senden' });
        return true;
      }
      if (navigator.canShare) {
        const f = new File([text], name, { type: 'text/plain' });
        if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Nova Konto-Token' }); return true; }
      }
      Nova.download(name, text, 'text/plain');
      return true;
    },
    /* Automatische Sicherung (überschreibt immer dieselbe Datei pro Konto) */
    async autoBackup(name, text) {
      try {
        if (isAndroid) { await plugin('Filesystem').writeFile({ path: native.BACKUP_DIR + '/' + name, data: text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true }); return true; }
        if (isElectron) { await window.novaElectron.backupWrite(name, text); return true; }
      } catch (e) { /* kein Zugriff */ }
      return false;
    },
    async listBackups() {
      try {
        if (isElectron) return (await window.novaElectron.backupList()) || [];
        if (isAndroid) {
          const FS = plugin('Filesystem');
          const r = await FS.readdir({ path: native.BACKUP_DIR, directory: 'DOCUMENTS' });
          const out = [];
          for (const f of r.files || []) {
            const nm = typeof f === 'string' ? f : f.name;
            if (!/\.novakey$/i.test(nm)) continue;
            try { const d = await FS.readFile({ path: native.BACKUP_DIR + '/' + nm, directory: 'DOCUMENTS', encoding: 'utf8' }); out.push({ name: nm, text: d.data, mtime: f.mtime || 0 }); } catch (e) {}
          }
          return out;
        }
      } catch (e) { /* Ordner existiert nicht / kein Zugriff */ }
      return [];
    },
    canAutoBackup: isAndroid || isElectron,

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
        document.documentElement.classList.add('is-android');
        const setInsets = async () => {
          try {
            const r = await plugin('NovaKiosk').insets();
            const st = document.documentElement.style;
            st.setProperty('--sat', (r.top || 0) + 'px'); st.setProperty('--sab', (r.bottom || 0) + 'px');
            st.setProperty('--sal', (r.left || 0) + 'px'); st.setProperty('--sar', (r.right || 0) + 'px');
          } catch (e) {}
        };
        setInsets(); setTimeout(setInsets, 600); window.addEventListener('resize', () => setTimeout(setInsets, 200));
      }
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
