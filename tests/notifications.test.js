import test from 'node:test';
import assert from 'node:assert/strict';
import { messagePreview } from '../shared/notifications.js';

test('message previews use the receiver translation and indicate pending translation', () => {
  assert.equal(messagePreview({ text: 'How are you?', translation: { status: 'ready', text: 'സുഖമാണോ?' } }), 'സുഖമാണോ?');
  assert.equal(messagePreview({ text: 'How are you?', translation: { status: 'pending' } }), 'New message · Translating…');
  assert.equal(messagePreview({ text: 'Hello', translation: { status: 'failed' } }), 'Hello');
});
test('previews cover stickers, photos, voice notes, and attachments without exposing filenames', () => {
  assert.equal(messagePreview({ sticker: 'hello' }), '👋 Sticker');
  assert.equal(messagePreview({ attachment: { mime: 'image/png', name: 'private.png' } }), '📷 Photo');
  assert.equal(messagePreview({ attachment: { mime: 'video/webm', name: 'voice-note-123.webm' } }), '🎤 Voice message');
  assert.equal(messagePreview({ attachment: { mime: 'application/pdf', name: 'private.pdf' } }), '📎 Attachment');
});
test('previews collapse whitespace and truncate without splitting emoji', () => {
  assert.equal(messagePreview({ text: 'Hello\n   there' }), 'Hello there');
  assert.equal(messagePreview({ text: '💚'.repeat(200) }), '💚'.repeat(180));
});
