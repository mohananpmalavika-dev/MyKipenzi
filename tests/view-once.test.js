import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { messageInput } from '../shared/contracts.js';
import { supportsViewOnce } from '../shared/viewOnce.js';
import { messagePreview } from '../shared/notifications.js';

test('view once requires an attachment without captions or stickers', () => {
  const base = { client_id: randomUUID(), view_once: true, attachment_id: randomUUID() };
  assert.equal(messageInput.safeParse(base).success, true);
  for (const input of [{ ...base, attachment_id: undefined }, { ...base, text: 'caption' }, { ...base, sticker: 'love' }, { ...base, view_once: 'true' }]) assert.equal(messageInput.safeParse(input).success, false);
  assert.equal(messageInput.parse({ client_id: randomUUID(), text: 'Normal message' }).view_once, false);
});
test('only photos and videos qualify, excluding voice notes and custom stickers', () => {
  for (const mime of ['image/png', 'image/jpeg', 'video/mp4', 'video/webm']) assert.equal(supportsViewOnce({ mime, name: 'memory' }), true);
  assert.equal(supportsViewOnce({ type: 'video/mp4', name: 'video.mp4' }), true);
  for (const attachment of [null, { mime: 'audio/ogg' }, { mime: 'application/pdf' }, { mime: 'video/webm', name: 'voice-note-123.webm' }, { mime: 'image/png', name: 'sticker-123.png' }]) assert.equal(supportsViewOnce(attachment), false);
});
test('notification previews describe the single-view status without revealing content', () => {
  assert.equal(messagePreview({ view_once: true, text: 'private', attachment: { name: 'private.png' } }), '① View-once media');
  assert.equal(messagePreview({ view_once: true, view_once_opened_at: new Date().toISOString() }), 'View-once media · Opened');
});
