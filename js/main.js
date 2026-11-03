/* Nova OS – Start */
(function () {
  'use strict';
  const Nova = window.Nova;
  // Windows: Daten aus der alten Version (vor dem Wechsel auf nova://) übernehmen
  try {
    const old = window.novaElectron && window.novaElectron.takeMigration && window.novaElectron.takeMigration();
    if (old) for (const k in old) if (localStorage.getItem(k) == null) localStorage.setItem(k, old[k]);
  } catch (e) { /* nichts zu übernehmen */ }
  Nova.native.init({
    onBack: () => Nova.shell.handleBack(),
    onExitRequest: () => Nova.shell.requestExit(),
    onResume: () => Nova.shell.onResume(),
    onGuardReturn: (r) => Nova.shell.onGuardReturn(r)
  });
  if (Nova.store.resume()) Nova.shell.showHome();
  else Nova.shell.showLogin();

  // Offline-Fähigkeit: Service Worker cached alle Dateien (nur über http/https möglich)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && Nova.native.platform === 'web') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
