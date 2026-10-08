import test from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteForEveryone, expirationLabel } from '../shared/messageStatus.js';
test('delete-for-everyone closes at exactly 24 hours and excludes deleted messages', () => {
  const created = Date.parse('2026-10-09T10:00:00Z');
  const message = { created_at: new Date(created).toISOString() };
  assert.equal(canDeleteForEveryone(message, created + 86400000 - 1), true);
  assert.equal(canDeleteForEveryone(message, created + 86400000), false);
  assert.equal(canDeleteForEveryone({ ...message, deleted_at: message.created_at }, created), false);
});
test('expiration labels count down to expiration without negative values', () => {
  const now = Date.now();
  assert.equal(expirationLabel(now - 1000, now), 'Expired');
  assert.equal(expirationLabel(now + 15000, now), 'Expires in 15s');
  assert.equal(expirationLabel(now + 300000, now), 'Expires in 5m');
});
