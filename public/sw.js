import { offlineStore } from './offline-store.js';
import { flushOutbox, refreshOfflineHistory, SYNC_TAG } from './offline-sync.js';

const OFFLINE_CACHE = 'kipenzi-shell-v2';
const PRECACHE = [];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(async cache => {
    await cache.addAll(PRECACHE.length ? PRECACHE : ['/', '/offline.html', '/icons/icon-192.png']);
    await self.skipWaiting();
  }));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_PUSH') void self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => (key.startsWith('kipenzi-offline-') || key.startsWith('kipenzi-shell-')) && key !== OFFLINE_CACHE).map((key) => caches.delete(key)))));
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => (await caches.open(OFFLINE_CACHE)).match('/')
      .then(response => response || caches.match('/offline.html'))));
  } else if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith((async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok && response.type !== 'opaque') await cache.put(event.request, response.clone());
      return response;
    })());
  }
});
self.addEventListener('sync', event => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil((async () => {
    try {
      const session = await offlineStore.session();
      if (session?.user) {
        await flushOutbox(session.user.id);
        await refreshOfflineHistory(session.user.id);
      }
    } finally {
      for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage({ type: 'OUTBOX_SYNCED' });
    }
  })());
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
    await refreshOfflineHistory(payload.data.user_id).catch(() => {});
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
