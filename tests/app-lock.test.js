import test from 'node:test';
import assert from 'node:assert/strict';
import { encode, pinRecord, matchesPin, failedAttempt, rawSignature, verifyDeviceAssertion } from '../src/appLockSecurity.js';

test('PIN is salted, verified, and failures back off', async () => {
  const record = await pinRecord('123456');
  assert.equal(await matchesPin('123456', record), true);
  assert.equal(await matchesPin('654321', record), false);
  assert.notEqual((await pinRecord('123456')).salt, record.salt);
  await assert.rejects(pinRecord('123'), /6-digit/);
  assert.equal(failedAttempt({ failures: 4 }, 1000).retryAt, 31000);
  assert.equal(failedAttempt({ failures: 100 }, 1000).retryAt, 301000);
});

async function assertion() {
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const auth = new Uint8Array(37);
  auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('localhost'))));
  auth[32] = 5;
  const clientDataJSON = new TextEncoder().encode(JSON.stringify({ type: 'webauthn.get', challenge: encode(challenge), origin: 'http://localhost' }));
  const data = new Uint8Array(69); data.set(auth); data.set(new Uint8Array(await crypto.subtle.digest('SHA-256', clientDataJSON)), 37);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, data));
  const integers = [signature.slice(0, 32), signature.slice(32)].map(part => {
    while (part.length > 1 && part[0] === 0) part = part.slice(1);
    return part[0] & 128 ? [0, ...part] : [...part];
  });
  const der = Uint8Array.from([48, integers[0].length + integers[1].length + 4, 2, integers[0].length, ...integers[0], 2, integers[1].length, ...integers[1]]);
  const credential = { rawId: Uint8Array.of(1, 2, 3), response: { clientDataJSON, authenticatorData: auth, signature: der } };
  const record = { id: encode(credential.rawId), publicKey: encode(await crypto.subtle.exportKey('spki', keys.publicKey)) };
  return { credential, record, challenge };
}

test('WebAuthn accepts valid signature and rejects replay, origin, RP, credential and missing verification', async () => {
  const { credential, record, challenge } = await assertion();
  const verify = (c = credential, r = record, ch = challenge, origin = 'http://localhost', rp = 'localhost') => verifyDeviceAssertion(c, r, ch, origin, rp);
  await verify();
  await assert.rejects(verify(credential, record, new Uint8Array(32)));
  await assert.rejects(verify(credential, record, challenge, 'https://attacker.example'));
  await assert.rejects(verify(credential, record, challenge, 'http://localhost', 'attacker.example'));
  await assert.rejects(verify(credential, { ...record, id: 'other' }));
  credential.response.authenticatorData[32] = 1;
  await assert.rejects(verify());
  credential.response.authenticatorData[32] = 5;
  credential.response.authenticatorData[36] ^= 1;
  await assert.rejects(verify(), /signature/);
  assert.throws(() => rawSignature(Uint8Array.of(48, 0)), /signature/);
});
