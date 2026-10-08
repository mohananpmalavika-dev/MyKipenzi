import test from 'node:test';
import assert from 'node:assert/strict';
import { pushEndpoint, pushSubscription } from '../shared/push.js';
import webpush from 'web-push';
import { randomBytes } from 'node:crypto';

test('push endpoints accept browser providers and reject arbitrary or impersonated hosts', () => {
  for (const url of ['https://fcm.googleapis.com/fcm/send/test', 'https://updates.push.services.mozilla.com/wpush/v2/test', 'https://web.push.apple.com/test', 'https://wns.notify.windows.com/test'])
    assert.equal(pushEndpoint.safeParse(url).success, true);
  for (const url of ['http://fcm.googleapis.com/test', 'https://127.0.0.1/test', 'https://fcm.googleapis.com.attacker.test/test', 'https://user:password@fcm.googleapis.com/test', 'https://fcm.googleapis.com:8080/test'])
    assert.equal(pushEndpoint.safeParse(url).success, false);
});
test('push subscriptions need complete encryption keys and generated requests encrypt previews', () => {
  const keys = webpush.generateVAPIDKeys();
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: keys.publicKey, auth: randomBytes(16).toString('base64url') } };
  assert.equal(pushSubscription.safeParse(subscription).success, true);
  assert.equal(pushSubscription.safeParse({ ...subscription, keys: { auth: 'invalid' } }).success, false);
  const request = webpush.generateRequestDetails(subscription, 'Private sender and message preview', { vapidDetails: { subject: 'https://kipenzi.example', publicKey: keys.publicKey, privateKey: keys.privateKey } });
  assert.equal(request.headers['Content-Encoding'], 'aes128gcm');
  assert.equal(request.body.includes(Buffer.from('Private sender and message preview')), false);
});
