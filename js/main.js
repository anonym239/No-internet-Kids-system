/* Nova OS – Start */
(function () {
  'use strict';
  const Nova = window.Nova;
  if (Nova.store.resume()) Nova.shell.showHome();
  else Nova.shell.showLogin();

  // Offline-Fähigkeit: Service Worker cached alle Dateien (nur über http/https möglich)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
