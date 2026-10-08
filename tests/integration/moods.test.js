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
const schema = `moods_${randomUUID().replaceAll('-', '')}`;
process.env.RATE_LIMIT_NAMESPACE = schema;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.set('options', `-c search_path=${schema}`);
process.env.DATABASE_URL = databaseUrl.toString();
const { db } = await import('../../server/db.js');
const { createApp } = await import('../../server/app.js');
const { deliverMoodPush } = await import('../../server/push.js');
const { redis, queue, queueConnection } = await import('../../server/infra.js');

test('private mood check-ins, deduplication, expiry, and notification delivery', async t => {
  let server;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    const migrationSource = await readFile(new URL('../../server/migrate.js', import.meta.url), 'utf8');
    const migrations = [...migrationSource.matchAll(/new URL\('\.\/([^']+\.sql)'/g)].map(m => m[1]);
    for (const migration of migrations) await db.query(await readFile(new URL('../../server/' + migration, import.meta.url), 'utf8'));
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
      const registered = await request('/auth/register', null, {
        name, handle: `${name.toLowerCase()}_${schema.slice(-8)}`, email: `${name}_${schema}@example.test`,
        password: 'a long strong password', language: name === 'Bob' ? 'ml' : 'en', ai_consent: false,
      });
      assert.equal(registered.status, 201, JSON.stringify(registered.data));
      people.push({ cookie: registered.cookie, csrf: registered.data.csrf, user: registered.data.user });
    }
    const [alice, bob, eve] = people;
    const conversation = await request('/conversations', alice, { handle: bob.user.handle });
    assert.equal(conversation.status, 201);
    const cid = conversation.data.id;
    const endpoint = `/conversations/${cid}/moods`;
    let status;
    const pushJob = revision => ({ conversation_id: cid, sender_id: alice.user.id, user_id: bob.user.id, revision });
    await t.test('requires session, membership, valid mood, and CSRF', async () => {
      assert.equal((await request(endpoint)).status, 401);
      assert.equal((await request(endpoint, eve)).status, 404);
      assert.equal((await request(endpoint, eve, { mood: 'happy' })).status, 404);
      assert.equal((await request(endpoint, alice, { mood: 'sad' })).status, 400);
      assert.equal((await request(endpoint, { ...alice, csrf: 'wrong' }, { mood: 'happy' })).status, 403);
      assert.deepEqual((await request(endpoint, alice)).data.statuses, []);
    });
    await t.test('concurrent retries save once and notify only the partner', async () => {
      const results = await Promise.all([request(endpoint, alice, { mood: 'happy' }), request(endpoint, alice, { mood: 'happy' })]);
      assert.ok(results.every(r => r.status === 200), JSON.stringify(results));
      assert.equal(results.filter(r => r.data.changed).length, 1);
      status = results[0].data.status;
      assert.equal(status.revision, 1);
      assert.equal(new Date(status.expires_at) - new Date(status.updated_at), 86400000);
      const events = (await db.query("SELECT payload FROM outbox WHERE kind='event' AND payload->>'event'='mood:changed'")).rows;
      assert.equal(events.length, 1);
      assert.deepEqual(new Set(events[0].payload.users), new Set([alice.user.id, bob.user.id]));
      const pushes = (await db.query("SELECT payload FROM outbox WHERE kind='mood_push'")).rows;
      assert.deepEqual(pushes.map(p => p.payload.user_id), [bob.user.id]);
      assert.equal((await request(endpoint, bob)).data.statuses[0].mood, 'happy');
      assert.equal((await request(endpoint, bob)).data.statuses[0].sender_name, 'Alice');
    });
    await t.test('both people can update independently and newer status replaces older', async () => {
      assert.equal((await request(endpoint, bob, { mood: 'tired' })).status, 200);
      status = (await request(endpoint, alice, { mood: 'need_a_hug' })).data.status;
      assert.equal(status.revision, 2);
      const statuses = (await request(endpoint, alice)).data.statuses;
      assert.equal(statuses.length, 2);
      assert.equal(statuses.find(s => s.user_id === bob.user.id).mood, 'tired');
    });
    await t.test('push uses recipient language and skips stale jobs, blocked users, and expired sessions', async () => {
      const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/mood-test', keys: { p256dh: keys.publicKey, auth: 'A'.repeat(22) } };
      assert.equal((await request('/notifications/subscription', bob, subscription)).status, 200);
      const delivered = [];
      const send = async (_subscription, payload) => delivered.push(JSON.parse(payload));
      await deliverMoodPush(pushJob(1), send);
      assert.equal(delivered.length, 0);
      await deliverMoodPush(pushJob(2), send);
      assert.equal(delivered.length, 1);
      assert.match(delivered[0].body, /ആലിംഗനം/);
      assert.equal(delivered[0].data.user_id, bob.user.id);
      await db.query('INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2)', [bob.user.id, alice.user.id]);
      assert.equal((await request(endpoint, alice)).status, 403);
      assert.equal((await request(endpoint, alice, { mood: 'happy' })).status, 403);
      await deliverMoodPush(pushJob(2), send);
      assert.equal(delivered.length, 1);
      await db.query('DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2', [bob.user.id, alice.user.id]);
      await db.query('UPDATE sessions SET expires_at=now()-interval \'1 minute\' WHERE user_id=$1', [bob.user.id]);
      await deliverMoodPush(pushJob(2), send);
      assert.equal(delivered.length, 1);
    });
    await t.test('expired moods disappear and can be checked in again', async () => {
      await db.query("UPDATE mood_check_ins SET expires_at=now()-interval '1 second' WHERE conversation_id=$1", [cid]);
      assert.deepEqual((await request(endpoint, alice)).data.statuses, []);
      const result = await request(endpoint, alice, { mood: 'need_a_hug' });
      assert.equal(result.data.changed, true);
      assert.equal(result.data.status.revision, 3);
      assert.equal((await request(endpoint, alice)).data.statuses.length, 1);
    });
    await t.test('group moods are rejected and membership deletion removes status', async () => {
      const groupId = randomUUID();
      await db.query('INSERT INTO conversations(id,direct_key,name) VALUES($1,NULL,$2)', [groupId, 'Group']);
      await db.query('INSERT INTO members(conversation_id,user_id) VALUES($1,$2)', [groupId, alice.user.id]);
      assert.equal((await request(`/conversations/${groupId}/moods`, alice)).status, 400);
      assert.equal((await request(`/conversations/${groupId}/moods`, alice, { mood: 'happy' })).status, 400);
      await db.query('DELETE FROM members WHERE conversation_id=$1 AND user_id=$2', [cid, alice.user.id]);
      assert.equal((await db.query('SELECT * FROM mood_check_ins WHERE conversation_id=$1 AND user_id=$2', [cid, alice.user.id])).rowCount, 0);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await queue.close();
    await queueConnection.quit();
    await redis.quit();
    await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
