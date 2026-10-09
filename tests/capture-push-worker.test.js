import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const uid = '11111111-1111-4111-8111-111111111111';
const cid = '22222222-2222-4222-8222-222222222222';
const payload = { title: 'My Secret Partner', body: 'Private romantic text', tag: 'kipenzi-message-test', data: { user_id: uid, conversation_id: cid } };
async function push(privatePreview) {
  const handlers = new Map(), shown = [];
  const source = (await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
  vm.runInNewContext(source, {
    URL, readNotificationPrivacy: async () => privatePreview,
    offlineStore: { session: async () => null }, flushOutbox: async () => {}, refreshOfflineHistory: async () => {}, SYNC_TAG: 'test',
    self: { addEventListener: (name, handler) => handlers.set(name, handler), location: { origin: 'https://example.test' },
      registration: { showNotification: async (title, options) => shown.push({ title, ...options }) } },
    fetch: async () => ({ ok: true, json: async () => ({ user: { id: uid } }) }),
  });
  const tasks = [];
  handlers.get('push')({ data: { json: () => payload }, waitUntil: promise => tasks.push(promise) });
  await Promise.all(tasks);
  return shown;
}
test('decoy notification policy removes sender, content, and identifying app icon', async () => {
  const [notification] = await push(true);
  assert.equal(notification.title, 'Update');
  assert.equal(notification.body, 'You have a new update.');
  assert.equal(notification.icon, undefined);
  assert.equal(notification.badge, undefined);
  assert.ok(!JSON.stringify(notification).includes('My Secret Partner'));
  assert.ok(!JSON.stringify(notification).includes('Private romantic text'));
});
test('ordinary notification policy preserves useful private chat previews', async () => {
  const [notification] = await push(false);
  assert.equal(notification.title, payload.title);
  assert.equal(notification.body, payload.body);
});
