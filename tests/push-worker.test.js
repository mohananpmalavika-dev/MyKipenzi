import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const userId = '11111111-1111-4111-8111-111111111111';
const conversationId = '22222222-2222-4222-8222-222222222222';
const payload = { title: 'Bestie', body: 'സുഖമാണോ?', tag: 'kipenzi-message-test', data: { user_id: userId, conversation_id: conversationId } };
async function worker(user = { id: userId }, windows = []) {
  const handlers = new Map(), shown = [], opened = [];
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    URL,
    self: {
      addEventListener: (event, handler) => handlers.set(event, handler),
      location: { origin: 'https://kipenzi.example' },
      registration: { showNotification: async (title, options) => shown.push({ title, ...options }) },
      clients: { matchAll: async () => windows, openWindow: async url => opened.push(url) },
    },
    fetch: async () => ({ ok: true, json: async () => ({ user }) }),
  });
  const dispatch = async (name, properties) => {
    const waits = [];
    handlers.get(name)({ ...properties, waitUntil: promise => waits.push(promise) });
    await Promise.all(waits);
  };
  return { shown, opened, dispatch };
}
test('push worker shows sender and translated preview without an open app window', async () => {
  const app = await worker();
  await app.dispatch('push', { data: { json: () => payload } });
  assert.equal(app.shown[0].title, 'Bestie');
  assert.equal(app.shown[0].body, 'സുഖമാണോ?');
  assert.equal(app.shown[0].renotify, false);
});
test('push worker hides previews after logout, account switching, or malformed payloads', async () => {
  for (const user of [null, { id: 'other-user' }]) {
    const app = await worker(user);
    await app.dispatch('push', { data: { json: () => payload } });
    assert.equal(app.shown.length, 0);
  }
  const app = await worker();
  await app.dispatch('push', { data: { json: () => ({ ...payload, data: { ...payload.data, conversation_id: 'https://attacker.example' } }) } });
  assert.equal(app.shown.length, 0);
});
test('notification click opens the correct conversation on the app origin', async () => {
  const app = await worker();
  let closed = false;
  await app.dispatch('notificationclick', { notification: { data: payload.data, close: () => { closed = true; } } });
  const url = new URL(app.opened[0]);
  assert.equal(closed, true);
  assert.equal(url.origin, 'https://kipenzi.example');
  assert.equal(url.searchParams.get('chat'), conversationId);
  assert.equal(url.searchParams.get('account'), userId);
});
test('notification click focuses an existing app and sends the conversation ID', async () => {
  let focused = false, received;
  const app = await worker({ id: userId }, [{ url: 'https://kipenzi.example/', focus: async () => { focused = true; }, postMessage: message => { received = message; } }]);
  await app.dispatch('notificationclick', { notification: { data: payload.data, close() {} } });
  assert.equal(focused, true);
  assert.equal(received.type, 'OPEN_CHAT');
  assert.equal(received.conversation_id, conversationId);
  assert.equal(app.opened.length, 0);
});
