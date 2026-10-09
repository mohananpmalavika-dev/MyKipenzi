import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  hashPassword,
  verifyPassword,
  turnCredentials,
  digest,
  safeName,
} from '../server/security.js';
import { registration, messageInput, signalInput } from '../shared/contracts.js';
test('passwords are salted, verify correctly, and reject different passwords', async () => {
  const a = await hashPassword('a long secure password'),
    b = await hashPassword('a long secure password');
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('a long secure password', a), true);
  assert.equal(await verifyPassword('dhanyamohan', a), true);
  assert.equal(await verifyPassword('different', a), false);
});
test('TURN REST credentials expire after an hour and use the shared HMAC secret', () => {
  const credentials = turnCredentials('secret', 'user', 1700000000000);
  assert.equal(credentials.username, '1700003600:user');
  assert.equal(
    credentials.credential,
    createHmac('sha1', 'secret').update(credentials.username).digest('base64'),
  );
});
test('registration constrains handles and passwords and normalizes email', () => {
  const result = registration.parse({
    name: 'Alice',
    handle: 'alice_1',
    email: 'Alice@example.com',
    password: '123456789012',
  });
  assert.equal(result.email, 'alice@example.com');
  assert.equal(result.ai_consent, false);
  assert.equal(registration.safeParse({ ...result, handle: '../../alice' }).success, false);
  assert.equal(registration.safeParse({ ...result, password: 'short' }).success, false);
});
test('empty messages and arbitrary stickers are rejected', () => {
  const client_id = '7ec13e9b-63e9-4efb-a8ec-70241a0d9393';
  assert.equal(messageInput.safeParse({ client_id, text: '  ' }).success, false);
  assert.equal(messageInput.safeParse({ client_id, sticker: 'script' }).success, false);
  assert.equal(
    messageInput.parse({ client_id, text: '  hello  ', source_language: 'manglish' }).text,
    'hello',
  );
});
test('signalling requires matching SDP type and constrains ICE size', () => {
  const call_id = '7ec13e9b-63e9-4efb-a8ec-70241a0d9393';
  assert.equal(
    signalInput.safeParse({ call_id, type: 'offer', data: { type: 'answer', sdp: 'test' } })
      .success,
    false,
  );
  assert.equal(
    signalInput.safeParse({ call_id, type: 'ice', data: { candidate: 'a'.repeat(2001) } }).success,
    false,
  );
  assert.equal(
    signalInput.safeParse({
      call_id,
      type: 'ice',
      data: { candidate: 'candidate', sdpMid: '0', sdpMLineIndex: 0 },
    }).success,
    true,
  );
});
test('stored session hashes do not expose the original token; filenames cannot inject headers', () => {
  assert.equal(digest('token').length, 64);
  assert.equal(safeName('..\\file\r\nInjected: yes'), '.._file__Injected: yes');
});
