import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import 'dotenv/config';
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = keys.publicKey;
process.env.VAPID_PRIVATE_KEY = keys.privateKey;
const schema = `capture_${randomUUID().replaceAll('-', '')}`;
process.env.RATE_LIMIT_NAMESPACE = schema;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('options', `-c search_path=${schema}`);
process.env.DATABASE_URL = url.toString();
const { db } = await import('../../server/db.js');
const { createApp } = await import('../../server/app.js');
const { deliverCapturePush } = await import('../../server/push.js');
const { redis, queue, queueConnection } = await import('../../server/infra.js');

test('capture reports remain private, idempotent, correctly scoped, and session-bound', async t => {
  let server;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    const source = await readFile(new URL('../../server/migrate.js', import.meta.url), 'utf8');
    for (const match of source.matchAll(/new URL\('\.\/([^']+\.sql)'/g))
      await db.query(await readFile(new URL('../../server/' + match[1], import.meta.url), 'utf8'));
    server = createServer(createApp());
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (path, session, body, method = body ? 'POST' : 'GET') => {
      const response = await fetch(base + path, { method, headers: {
        origin: process.env.APP_ORIGIN, 'content-type': 'application/json',
        ...(session ? { cookie: session.cookie, 'x-csrf-token': session.csrf } : {}),
      }, body: body ? JSON.stringify(body) : undefined });
      return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
    };
    const people = [];
    for (const name of ['Alice', 'Bob', 'Eve']) {
      const result = await request('/auth/register', null, {
        name, handle: `${name.toLowerCase()}_${schema.slice(-8)}`, email: `${name}_${schema}@example.test`,
        password: 'a long strong password', language: name === 'Bob' ? 'ml' : 'en', ai_consent: false,
      });
      assert.equal(result.status, 201, JSON.stringify(result.data));
      people.push({ cookie: result.cookie, csrf: result.data.csrf, user: result.data.user });
    }
    const [alice, bob, eve] = people;
    const cid = (await request('/conversations', alice, { handle: bob.user.handle })).data.id;
    const endpoint = `/conversations/${cid}/capture-alerts`;
    const input = { client_id: randomUUID(), kind: 'screenshot_shortcut' };
    let alert;
    await t.test('rejects unauthorized users, foreign identifiers, and CSRF violations', async () => {
      assert.equal((await request(endpoint)).status, 401);
      assert.equal((await request(endpoint, eve)).status, 404);
      assert.equal((await request(endpoint, eve, input)).status, 404);
      assert.equal((await request(endpoint, { ...alice, csrf: 'bad' }, input)).status, 403);
      assert.equal((await request(endpoint, alice, { ...input, kind: 'confirmed_screenshot' })).status, 400);
      assert.equal((await request(endpoint, alice, { ...input, message_id: randomUUID() })).status, 400);
    });
    await t.test('concurrent retries persist once and notify the partner only', async () => {
      const results = await Promise.all([request(endpoint, alice, input), request(endpoint, alice, input)]);
      assert.ok(results.every(r => r.status === 201), JSON.stringify(results));
      assert.equal(results.filter(r => r.data.duplicate).length, 1);
      alert = results[0].data.alert;
      assert.equal(alert.context, 'chat');
      assert.equal((await request('/capture-alerts/' + alert.id, eve)).status, 404);
      const events = (await db.query("SELECT payload FROM outbox WHERE kind='event' AND payload->>'event'='privacy:capture'")).rows;
      assert.equal(events.length, 1);
      assert.deepEqual(events[0].payload.users, [bob.user.id]);
      assert.equal((await db.query("SELECT * FROM outbox WHERE kind='capture_push'")).rowCount, 1);
      assert.equal((await request(endpoint, bob)).data.alerts[0].sender_name, 'Alice');
      assert.equal((await request(endpoint, alice, { ...input, kind: 'recording_shortcut' })).status, 409);
    });
    await t.test('screen-sharing signals require an active call and cannot claim a view-once context', async () => {
      const sharing = { client_id: randomUUID(), kind: 'screen_sharing' };
      assert.equal((await request(endpoint, alice, sharing)).status, 400);
      assert.equal((await request(endpoint, alice, { ...sharing, message_id: randomUUID() })).status, 400);
      const call = randomUUID();
      await db.query("INSERT INTO calls(id,conversation_id,caller_id,callee_id,kind,state) VALUES($1,$2,$3,$4,'video','active')", [call, cid, alice.user.id, bob.user.id]);
      assert.equal((await request(endpoint, alice, sharing)).status, 201);
      await db.query("UPDATE calls SET state='ended',ended_at=now() WHERE id=$1", [call]);
    });
    await t.test('view-once scope must refer to opened incoming media in this conversation', async () => {
      const mid = randomUUID();
      await db.query("INSERT INTO messages(id,conversation_id,sender_id,client_id,text,source_language,view_once) VALUES($1,$2,$3,$4,'test','en',true)", [mid, cid, bob.user.id, randomUUID()]);
      const mediaInput = { client_id: randomUUID(), kind: 'screenshot_shortcut', message_id: mid };
      assert.equal((await request(endpoint, alice, mediaInput)).status, 400);
      await db.query('UPDATE messages SET view_once_opened_at=now() WHERE id=$1', [mid]);
      const result = await request(endpoint, alice, mediaInput);
      assert.equal(result.status, 201);
      assert.equal(result.data.alert.context, 'view_once');
      assert.equal(result.data.alert.message_id, mid);
      assert.equal((await request(endpoint, bob, { ...mediaInput, client_id: randomUUID() })).status, 400);
    });
    await t.test('push is truthful, translated, blocked-contact aware, and removes expired subscriptions', async () => {
      const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/capture-test', keys: { p256dh: keys.publicKey, auth: 'A'.repeat(22) } };
      assert.equal((await request('/notifications/subscription', bob, subscription)).status, 200);
      const delivered = [];
      const send = async (_subscription, payload) => delivered.push(JSON.parse(payload));
      await deliverCapturePush({ alert_id: alert.id, user_id: bob.user.id }, send);
      assert.equal(delivered.length, 1);
      assert.match(delivered[0].body, /ഉറപ്പിക്കാനാവില്ല/);
      assert.equal(delivered[0].data.capture_alert_id, alert.id);
      await db.query('INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2)', [bob.user.id, alice.user.id]);
      assert.equal((await request(endpoint, alice, { ...input, client_id: randomUUID() })).status, 403);
      assert.equal((await request(endpoint, alice)).status, 403);
      await deliverCapturePush({ alert_id: alert.id, user_id: bob.user.id }, send);
      assert.equal(delivered.length, 1);
      await db.query('DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2', [bob.user.id, alice.user.id]);
      await deliverCapturePush({ alert_id: alert.id, user_id: bob.user.id }, async () => { throw Object.assign(new Error('Expired'), { statusCode: 410 }); });
      assert.equal((await db.query('SELECT * FROM push_subscriptions WHERE endpoint=$1', [subscription.endpoint])).rowCount, 0);
    });
    await t.test('group chats are rejected, and expired sessions cannot receive pushes', async () => {
      const group = randomUUID();
      await db.query('INSERT INTO conversations(id,direct_key,name) VALUES($1,NULL,$2)', [group, 'Group']);
      await db.query('INSERT INTO members(conversation_id,user_id) VALUES($1,$2)', [group, alice.user.id]);
      assert.equal((await request(`/conversations/${group}/capture-alerts`, alice, { ...input, client_id: randomUUID() })).status, 400);
      await db.query('UPDATE sessions SET expires_at=now()-interval \'1 minute\' WHERE user_id=$1', [bob.user.id]);
      let delivered = 0;
      await deliverCapturePush({ alert_id: alert.id, user_id: bob.user.id }, async () => { delivered++; });
      assert.equal(delivered, 0);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await queue.close(); await queueConnection.quit(); await redis.quit(); await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end();
  }
});
