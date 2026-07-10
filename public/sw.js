// Minimal service worker — exists for PWA installability, deliberately NOT
// an aggressive cache: Vite assets are content-hashed (safe forever), but
// index.html must always come from the network first or deploys go stale.
const CACHE = 'bt-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add('./')).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    // Network-first: fresh deploys always win; cache only as offline fallback.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./'))
    );
  }
  // Everything else (hashed assets, API calls): straight to network.
});
