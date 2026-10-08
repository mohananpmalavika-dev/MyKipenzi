const OFFLINE_CACHE = 'kipenzi-offline-v1';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add('/offline.html')));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('kipenzi-offline-') && key !== OFFLINE_CACHE).map((key) => caches.delete(key)))));
});
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
