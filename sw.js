/* Nova OS – Service Worker: macht die App komplett offline-fähig */
const VERSION = 'nova-beta-0.2.0';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './js/core/sha256.js', './js/core/util.js', './js/core/icons.js', './js/core/store.js',
  './js/core/screentime.js', './js/core/persona.js', './js/core/native.js', './js/core/shell.js', './js/core/onboarding.js',
  './js/apps/kit.js', './js/apps/games.js', './js/apps/storegames.js', './js/apps/learn.js', './js/apps/learn-de.js', './js/apps/creative.js', './js/apps/tools.js', './js/apps/system.js',
  './js/main.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Cache zuerst – das Internet wird nie benötigt
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
