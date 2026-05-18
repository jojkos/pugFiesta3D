// Minimal service worker — exists so Chrome marks the site PWA-installable.
// Network-first passthrough; no caching strategy on purpose (game assets
// are already revisioned by Vite and the leaderboard needs fresh data).

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
