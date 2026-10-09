import test from 'node:test';
import assert from 'node:assert/strict';
import { pinRecord, pinDestination, failedAttempt, matchesPin } from '../src/appLockSecurity.js';
import { privateNotifications, readNotificationPrivacy } from '../shared/lockPrivacy.js';

test('real and decoy PINs select different destinations and share the same attempt budget', async () => {
  const record = { pin: await pinRecord('123456'), decoyPin: await pinRecord('654321'), failures: 4 };
  assert.equal(await pinDestination('123456', record), 'private');
  assert.equal(await pinDestination('654321', record), 'decoy');
  assert.equal(await pinDestination('000000', record), null);
  assert.equal(await pinDestination('123', record), null);
  assert.equal(await pinDestination('654321', { pin: record.pin }), null);
  assert.equal(await pinDestination('123456', { pin: record.pin }), 'private');
  assert.equal(await matchesPin('123456', null), false);
  assert.equal(await pinDestination('123456', null), null);
  const failed = failedAttempt(record, 1000);
  assert.equal(failed.retryAt, 31000);
  assert.equal(failed.decoyPin.hash, record.decoyPin.hash);
  assert.notEqual(record.pin.salt, record.decoyPin.salt);
  assert.ok(!JSON.stringify(record).includes('654321'));
});
test('configured decoys always mask notification previews; storage failure fails closed', async () => {
  assert.equal(privateNotifications(null), false);
  assert.equal(privateNotifications({ privacyMode: false }), false);
  assert.equal(privateNotifications({ privacyMode: true }), true);
  assert.equal(privateNotifications({ decoyPin: { hash: 'hash' }, privacyMode: false }), true);
  assert.equal(await readNotificationPrivacy('user', null), true);
  const broken = { open() { const request = {}; queueMicrotask(() => request.onerror()); return request; } };
  assert.equal(await readNotificationPrivacy('user', broken), true);
});
