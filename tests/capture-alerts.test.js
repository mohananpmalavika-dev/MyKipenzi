import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { captureInput, captureNotification, captureShortcut } from '../shared/captureAlerts.js';

test('only observed capture shortcuts qualify, never blur, ordinary keys, or synthetic events', () => {
  const event = { isTrusted: true, repeat: false };
  assert.equal(captureShortcut({ ...event, key: 'PrintScreen' }), 'screenshot_shortcut');
  assert.equal(captureShortcut({ ...event, code: 'PrintScreen' }), 'screenshot_shortcut');
  assert.equal(captureShortcut({ ...event, code: 'Digit3', metaKey: true, shiftKey: true }), 'screenshot_shortcut');
  assert.equal(captureShortcut({ ...event, code: 'KeyS', metaKey: true, shiftKey: true }), 'screenshot_shortcut');
  assert.equal(captureShortcut({ ...event, code: 'Digit5', metaKey: true, shiftKey: true }), 'recording_shortcut');
  assert.equal(captureShortcut({ ...event, code: 'KeyR', metaKey: true, altKey: true }), 'recording_shortcut');
  for (const key of ['Escape', 'F12', 'F5', 'p', 's']) assert.equal(captureShortcut({ ...event, key }), null);
  assert.equal(captureShortcut({ ...event, isTrusted: false, key: 'PrintScreen' }), null);
  assert.equal(captureShortcut({ ...event, repeat: true, key: 'PrintScreen' }), null);
});
test('capture reports validate identifiers and distinguish attempts from confirmed captures', () => {
  for (const kind of ['screenshot_shortcut', 'recording_shortcut', 'screen_sharing'])
    assert.equal(captureInput.parse({ client_id: randomUUID(), kind }).kind, kind);
  for (const input of [{ kind: 'screenshot_shortcut' }, { client_id: randomUUID(), kind: 'screenshot' },
    { client_id: randomUUID(), kind: 'screenshot_shortcut', sender_id: randomUUID() },
    { client_id: randomUUID(), kind: 'screenshot_shortcut', message_id: 'bad' },
    { client_id: randomUUID(), kind: 'screen_sharing', message_id: randomUUID() }])
    assert.equal(captureInput.safeParse(input).success, false);
  for (const kind of ['screenshot_shortcut', 'recording_shortcut']) {
    const preview = captureNotification({ kind, sender_name: 'Bestie', context: 'view_once' });
    assert.match(preview.body, /Bestie/);
    assert.match(preview.body, /view-once/);
    assert.match(preview.body, /cannot be confirmed/);
    assert.ok(!preview.body.includes('took a screenshot'));
  }
  assert.match(captureNotification({ kind: 'screenshot_shortcut', sender_name: 'Dhanya' }, 'ml').body, /ഉറപ്പിക്കാനാവില്ല/);
  assert.match(captureNotification({ kind: 'screen_sharing', sender_name: 'Bestie' }).body, /may include/);
  assert.equal(captureNotification({ kind: 'unknown' }), null);
});
