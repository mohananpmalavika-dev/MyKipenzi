const OFFLINE_CACHE = 'kipenzi-offline-v1';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add('/offline.html')));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_PUSH') void self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('kipenzi-offline-') && key !== OFFLINE_CACHE).map((key) => caches.delete(key)))));
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data?.json(); } catch { return; }
    if (!uuid.test(payload?.data?.user_id) || !uuid.test(payload?.data?.conversation_id)) return;
    try {
      const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
      if (response.ok && (await response.json()).user?.id !== payload.data.user_id) return;
    } catch { /* Notifications can arrive during a temporary server outage. */ }
    await self.registration.showNotification(String(payload.title || 'Kipenzi').slice(0, 80), {
      body: String(payload.body || 'New message').slice(0, 400),
      icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      tag: String(payload.tag || 'kipenzi-message').slice(0, 100),
      data: payload.data, renotify: false,
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const data = event.notification.data;
    if (!uuid.test(data?.conversation_id) || !uuid.test(data?.user_id)) return;
    const url = new URL('/', self.location.origin);
    url.searchParams.set('chat', data.conversation_id);
    url.searchParams.set('account', data.user_id);
    for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      await client.focus();
      client.postMessage({ type: 'OPEN_CHAT', ...data });
      return;
    }
    await self.clients.openWindow(url.href);
  })());
});
