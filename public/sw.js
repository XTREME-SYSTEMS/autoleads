// AutoLeads Service Worker — PWA install + offline shell.
// IMPORTANT: only navigation requests fall back to the cached HTML shell.
// Module/asset requests are network-only so a transient fetch failure can never
// serve HTML to a JS import (which corrupts dynamic imports with
// "Failed to fetch dynamically imported module").
const CACHE_NAME = 'autoleads-v2';
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/').then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Everything else (JS modules, CSS, assets, API): network-only.
  // Never fall back to cached HTML for these — that would corrupt dynamic imports.
  event.respondWith(fetch(req));
});
