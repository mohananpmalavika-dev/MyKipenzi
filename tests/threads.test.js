import test from 'node:test';
import assert from 'node:assert/strict';
import { messagePreview } from '../shared/notifications.js';
test('reply alerts carry context and preserve translated previews', () => {
  assert.equal(messagePreview({ text: 'Hello', reply_to_id: 'parent', reply: { sender: 'Alice' } }), 'Thread reply to Alice: Hello');
  assert.equal(messagePreview({ text: 'Hello', reply_to_id: 'parent', translation: { status: 'ready', text: 'Hola' } }), 'Thread reply: Hola');
  assert.equal(messagePreview({ text: 'Hello' }), 'Hello');
  assert.ok(Array.from(messagePreview({ reply_to_id: 'parent', text: 'x'.repeat(300) })).length <= 180);
});
