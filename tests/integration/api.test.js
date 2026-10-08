import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import 'dotenv/config';
import webpush from 'web-push';
const testPushKeys = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = testPushKeys.publicKey;
process.env.VAPID_PRIVATE_KEY = testPushKeys.privateKey;
const schema = `test_${randomUUID().replaceAll('-', '')}`;
process.env.RATE_LIMIT_NAMESPACE = schema;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await admin.query(`CREATE SCHEMA ${schema}`);
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('options', `-c search_path=${schema}`);
process.env.DATABASE_URL = url.toString();
const { db } = await import('../../server/db.js');
const { createApp } = await import('../../server/app.js');
const { deliverMessagePush, deliverSchedulePush } = await import('../../server/push.js');
const { redis, queue, queueConnection } = await import('../../server/infra.js');
await db.query(await readFile(new URL('../../server/schema.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/message-actions-schema.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/message-status-schema.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/forward-schema.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/safety-schema.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/reactions-schema.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/group-schema.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/group-features-migration.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/saved-messages-schema.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/daily-prompt-schema.sql', import.meta.url), 'utf8'));
await db.query(await readFile(new URL('../../server/disappearing-schema.sql', import.meta.url), 'utf8'));
const { expireMessages } = await import('../../server/disappearing.js');
await db.query(await readFile(new URL('../../server/scheduled-schema.sql', import.meta.url), 'utf8'));
const { processSchedules } = await import('../../server/scheduled.js');
const server = createServer(createApp());
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const origin = process.env.APP_ORIGIN;
async function request(path, body, session, method = body ? 'POST' : 'GET', headers = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      origin,
      ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(session ? { cookie: session.cookie, 'x-csrf-token': session.csrf } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
let alice, bob, eve, conversation;
test('API integration against an isolated PostgreSQL schema', async (t) => {
  try {
    await t.test('account sessions, CSRF and origin enforcement', async () => {
      for (const handle of ['alice', 'bob', 'eve']) {
        const result = await request('/auth/register', {
          handle: `${handle}_${schema.slice(-8)}`,
          name: handle,
          email: `${handle}_${schema}@example.com`,
          password: 'a long strong password',
          language: handle === 'bob' ? 'sw' : 'manglish',
          ai_consent: true,
        });
        assert.equal(result.status, 201, JSON.stringify(result.data));
        const session = { cookie: result.cookie, csrf: result.data.csrf, user: result.data.user };
        if (handle === 'alice') alice = session;
        else if (handle === 'bob') bob = session;
        else eve = session;
      }
      assert.equal((await request('/conversations', undefined)).status, 401);
      assert.equal(
        (await request('/conversations', { handle: bob.user.handle }, { ...alice, csrf: 'wrong' }))
          .status,
        403,
      );
      assert.equal(
        (
          await request('/conversations', { handle: bob.user.handle }, alice, 'POST', {
            origin: 'https://attacker.example',
          })
        ).status,
        403,
      );
      assert.equal(
        (await request('/auth/session', undefined, alice)).data.user.handle,
        alice.user.handle,
      );
    });
    await t.test('user directory requires login, exposes only public fields, searches and paginates every other user', async () => {
      assert.equal((await request('/users')).status, 401);
      const directory = await request('/users', undefined, alice);
      assert.equal(directory.status, 200);
      assert.equal(directory.data.users.length, 2);
      assert.ok(directory.data.users.every(person => person.id !== alice.user.id));
      for (const person of directory.data.users)
        assert.deepEqual(Object.keys(person).sort(), ['avatar_id', 'blocked_by_me', 'contact_blocked', 'handle', 'id', 'last_seen', 'name', 'online']);
      assert.equal((await request('/users?q=%40BOB', undefined, alice)).data.users[0].id, bob.user.id);
      assert.equal((await request('/users?q=eve', undefined, alice)).data.users[0].id, eve.user.id);
      assert.equal((await request('/users?q=%25', undefined, alice)).data.users.length, 0);
      assert.equal((await request('/users?offset=-1', undefined, alice)).status, 400);
      await db.query("INSERT INTO users(id,handle,name,email,password_hash) SELECT gen_random_uuid(),'directory_'||n,'Directory '||lpad(n::text,3,'0'),'directory_'||n||'@example.com','unused-test-hash' FROM generate_series(1,55) n");
      const first = (await request('/users', undefined, alice)).data;
      const second = (await request('/users?offset=50', undefined, alice)).data;
      assert.equal(first.users.length, 50);
      assert.equal(first.has_more, true);
      assert.equal(second.users.length, 7);
      assert.equal(second.has_more, false);
      assert.equal(new Set([...first.users, ...second.users].map(person => person.id)).size, 57);
      await db.query("DELETE FROM users WHERE name LIKE 'Directory %'");
    });
    await t.test('direct conversation creation is idempotent and isolated', async () => {
      const first = await request('/conversations', { handle: bob.user.handle }, alice);
      assert.equal(first.status, 201);
      conversation = first.data.id;
      assert.equal(
        (await request('/conversations', { handle: alice.user.handle }, bob)).data.id,
        conversation,
      );
      assert.equal(
        (await request(`/conversations/${conversation}/messages`, undefined, eve)).status,
        404,
      );
      assert.equal(
        (await request('/conversations', undefined, bob)).data[0].peer.handle,
        alice.user.handle,
      );
    });
    let message;
    await t.test('concurrent retries store one message and retain original text', async () => {
      const input = { client_id: randomUUID(), text: 'sughamano?', source_language: 'manglish' };
      const results = await Promise.all([
        request(`/conversations/${conversation}/messages`, input, alice),
        request(`/conversations/${conversation}/messages`, input, alice),
      ]);
      assert.ok(
        results.every((r) => r.status === 201),
        JSON.stringify(results),
      );
      assert.equal(results[0].data.id, results[1].data.id);
      const history = await request(`/conversations/${conversation}/messages`, undefined, bob);
      assert.equal(history.data.messages.length, 1);
      message = history.data.messages[0];
      assert.equal(message.text, 'sughamano?');
      assert.equal(message.source_language, 'manglish');
      assert.equal(
        (
          await request(
            `/conversations/${conversation}/messages`,
            { ...input, client_id: randomUUID(), text: ' ' },
            alice,
          )
        ).status,
        400,
      );
    });
    await t.test('message alert previews are private, translated, and only queued once for recipients', async () => {
      assert.equal((await request(`/messages/${message.id}`, undefined, eve)).status, 404);
      assert.equal((await request(`/messages/${message.id}`)).status, 401);
      await db.query('UPDATE users SET language=$2 WHERE id=$1', [bob.user.id, 'ml']);
      await db.query("INSERT INTO translations(message_id,language,status,text) VALUES($1,'ml','ready','സുഖമാണോ?') ON CONFLICT(message_id,language) DO UPDATE SET status='ready',text=EXCLUDED.text", [message.id]);
      const preview = await request(`/messages/${message.id}`, undefined, bob);
      assert.equal(preview.status, 200);
      assert.equal(preview.data.translation.text, 'സുഖമാണോ?');
      assert.equal(preview.data.sender.id, alice.user.id);
      const events = await db.query("SELECT payload FROM outbox WHERE kind='event' AND payload->>'event'='message:arrived' AND payload->'data'->>'message_id'=$1", [message.id]);
      assert.equal(events.rows.length, 1);
      assert.deepEqual(events.rows[0].payload.users, [bob.user.id]);
      await db.query('UPDATE users SET language=$2 WHERE id=$1', [bob.user.id, bob.user.language]);
    });
    await t.test('background pushes are session-bound, translated, unread-only, and remove expired subscriptions', async () => {
      const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/isolated-test', keys: { p256dh: testPushKeys.publicKey, auth: 'A'.repeat(22) } };
      assert.equal((await request('/notifications/config')).status, 401);
      const pushConfig = (await request('/notifications/config', undefined, bob)).data;
      assert.equal(pushConfig.enabled, true);
      assert.deepEqual(Object.keys(pushConfig).sort(), ['enabled', 'public_key']);
      assert.equal((await request('/notifications/subscription', subscription, { ...bob, csrf: 'wrong' })).status, 403);
      assert.equal((await request('/notifications/subscription', { ...subscription, endpoint: 'https://127.0.0.1/internal' }, bob)).status, 400);
      assert.equal((await request('/notifications/subscription', subscription, bob)).status, 200);
      await db.query('UPDATE users SET language=$2 WHERE id=$1', [bob.user.id, 'ml']);
      const delivered = [];
      const send = async (_subscription, payload, options) => delivered.push({ ...JSON.parse(payload), ttl: options.TTL });
      await deliverMessagePush({ message_id: message.id, user_id: bob.user.id }, 0, send);
      assert.equal(delivered.length, 1);
      assert.equal(delivered[0].title, alice.user.name);
      assert.equal(delivered[0].body, 'സുഖമാണോ?');
      assert.equal(delivered[0].data.user_id, bob.user.id);
      assert.equal(delivered[0].ttl, 300);
      await db.query('UPDATE messages SET deleted_at=now() WHERE id=$1', [message.id]);
      await deliverMessagePush({ message_id: message.id, user_id: bob.user.id }, 0, send);
      assert.equal(delivered.length, 1);
      await db.query('UPDATE messages SET deleted_at=NULL WHERE id=$1', [message.id]);
      await deliverMessagePush({ message_id: message.id, user_id: alice.user.id }, 0, send);
      await deliverMessagePush({ message_id: message.id, user_id: eve.user.id }, 0, send);
      assert.equal(delivered.length, 1);
      await request('/notifications/subscription', { endpoint: subscription.endpoint }, eve, 'DELETE');
      assert.equal((await db.query('SELECT endpoint FROM push_subscriptions')).rowCount, 1);
      const queued = await db.query("SELECT payload FROM outbox WHERE kind='push' AND payload->>'message_id'=$1", [message.id]);
      assert.deepEqual(queued.rows.map(row => row.payload.user_id), [bob.user.id]);
      await deliverMessagePush({ message_id: message.id, user_id: bob.user.id }, 0, async () => { throw { statusCode: 410 }; });
      assert.equal((await db.query('SELECT endpoint FROM push_subscriptions')).rowCount, 0);
      await request('/notifications/subscription', subscription, bob);
      const tokenHash = (await db.query('SELECT session_token_hash FROM push_subscriptions')).rows[0].session_token_hash;
      await db.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1", [tokenHash]);
      await deliverMessagePush({ message_id: message.id, user_id: bob.user.id }, 0, send);
      assert.equal(delivered.length, 1);
      await db.query("UPDATE sessions SET expires_at=now()+interval '1 day' WHERE token_hash=$1", [tokenHash]);
      await db.query('UPDATE members SET read_seq=$3 WHERE conversation_id=$1 AND user_id=$2', [conversation, bob.user.id, message.seq]);
      await deliverMessagePush({ message_id: message.id, user_id: bob.user.id }, 0, send);
      assert.equal(delivered.length, 1);
      await db.query('UPDATE members SET read_seq=0 WHERE conversation_id=$1 AND user_id=$2', [conversation, bob.user.id]);
      await request('/notifications/subscription', { endpoint: subscription.endpoint }, bob, 'DELETE');
      await db.query('UPDATE users SET language=$2 WHERE id=$1', [bob.user.id, bob.user.language]);
      await db.query(await readFile(new URL('../../server/push-schema.sql', import.meta.url), 'utf8'));
    });
    await t.test('read receipts are monotonic and require a real conversation cursor', async () => {
      assert.equal(
        (await request(`/conversations/${conversation}/read`, { seq: Number(message.seq) }, bob))
          .status,
        200,
      );
      await request(`/conversations/${conversation}/read`, { seq: 0 }, bob);
      const list = await request('/conversations', undefined, alice);
      assert.equal(Number(list.data[0].peer_read_seq), Number(message.seq));
      assert.equal(
        (await request(`/conversations/${conversation}/read`, { seq: 999999 }, bob)).status,
        400,
      );
    });
    await t.test(
      'uploads validate bytes and private files enforce participant access',
      async () => {
        const form = new FormData();
        form.append(
          'file',
          new Blob(
            [
              Buffer.from(
                '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082',
                'hex',
              ),
            ],
            { type: 'image/png' },
          ),
          'pixel.png',
        );
        const uploaded = await request(`/conversations/${conversation}/uploads`, form, alice);
        assert.equal(uploaded.status, 201, JSON.stringify(uploaded.data));
        const aid = uploaded.data.id;
        assert.equal((await request(`/attachments/${aid}`, undefined, bob)).status, 404);
        assert.equal(
          (
            await request(
              `/conversations/${conversation}/messages`,
              { client_id: randomUUID(), attachment_id: aid },
              bob,
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/conversations/${conversation}/messages`,
              { client_id: randomUUID(), attachment_id: aid },
              alice,
            )
          ).status,
          201,
        );
        assert.equal((await request(`/attachments/${aid}`, undefined, bob)).status, 200);
        assert.equal((await request(`/attachments/${aid}`, undefined, eve)).status, 404);
        const fake = new FormData();
        fake.append('file', new Blob(['<script>bad</script>'], { type: 'image/png' }), 'fake.png');
        assert.equal(
          (await request(`/conversations/${conversation}/uploads`, fake, alice)).status,
          415,
        );
        const bytes = await fetch(`${base}/api/attachments/${aid}/content`, {
          headers: { cookie: bob.cookie },
        });
        assert.equal(bytes.status, 200);
        assert.equal(bytes.headers.get('content-type'), 'image/png');
        assert.ok((await bytes.arrayBuffer()).byteLength > 0);
      },
    );
    await t.test(
      'reconnect cursors recover every missed message across multiple pages',
      async () => {
        const previous = (
          await db.query('SELECT max(seq) AS seq FROM messages WHERE conversation_id=$1', [
            conversation,
          ])
        ).rows[0].seq;
        await db.query(
          "INSERT INTO messages(id,conversation_id,sender_id,client_id,text,source_language) SELECT gen_random_uuid(),$1,$2,gen_random_uuid(),'missed message '||n,'en' FROM generate_series(1,55) AS n",
          [conversation, alice.user.id],
        );
        const first = await request(
          `/conversations/${conversation}/messages?after=${previous}`,
          undefined,
          bob,
        );
        assert.equal(first.status, 200);
        assert.equal(first.data.messages.length, 50);
        assert.equal(first.data.has_more, true);
        const second = await request(
          `/conversations/${conversation}/messages?after=${first.data.messages.at(-1).seq}`,
          undefined,
          bob,
        );
        assert.equal(second.data.messages.length, 5);
        assert.equal(second.data.has_more, false);
        const rows = [...first.data.messages, ...second.data.messages];
        assert.equal(new Set(rows.map((m) => m.id)).size, 55);
        assert.ok(rows.every((m, i) => !i || Number(m.seq) > Number(rows[i - 1].seq)));
        assert.equal(
          (
            await request(
              `/conversations/${conversation}/messages?before=1&after=0`,
              undefined,
              bob,
            )
          ).status,
          400,
        );
      },
    );
    await t.test('call state enforces roles, busy locks and terminal transitions', async () => {
      const started = await request(
        `/conversations/${conversation}/calls`,
        { kind: 'video' },
        alice,
      );
      assert.equal(started.status, 201);
      const cid = started.data.id;
      assert.equal(
        (await request(`/calls/${cid}`, { action: 'accept' }, alice, 'PATCH')).status,
        409,
      );
      assert.equal(
        (await request(`/calls/${cid}`, { action: 'accept' }, eve, 'PATCH')).status,
        404,
      );
      assert.equal(
        (await request(`/conversations/${conversation}/calls`, { kind: 'audio' }, bob)).status,
        409,
      );
      assert.equal(
        (await request(`/calls/${cid}`, { action: 'accept' }, bob, 'PATCH')).data.state,
        'active',
      );
      assert.equal(
        (await request(`/calls/${cid}`, { action: 'end' }, alice, 'PATCH')).data.state,
        'ended',
      );
      assert.equal((await request(`/calls/${cid}`, { action: 'end' }, bob, 'PATCH')).status, 200);
      const next = await request(`/conversations/${conversation}/calls`, { kind: 'audio' }, bob);
      assert.equal(next.status, 201);
      await request(`/calls/${next.data.id}`, { action: 'decline' }, alice, 'PATCH');
    });
    await t.test(
      'AI processing requires consent and unavailable providers fail explicitly',
      async () => {
        const updated = await request(
          '/profile',
          { name: 'Alice', language: 'en', ai_consent: false, likeness_consent: false },
          alice,
          'PATCH',
        );
        assert.equal(updated.status, 200);
        assert.equal(
          (await request(`/messages/${message.id}/media`, { kind: 'speech' }, alice)).status,
          403,
        );
        assert.equal(
          (await request(`/messages/${message.id}/translate`, { language: 'sw' }, bob)).status,
          403,
        );
      },
    );
    await t.test('replies remain private and only senders may edit or delete messages', async () => {
      const original = await request(`/conversations/${conversation}/messages`, { client_id: randomUUID(), text: 'Original message' }, alice);
      const mid = original.data.id;
      const reply = await request(`/conversations/${conversation}/messages`, { client_id: randomUUID(), text: 'A specific reply', reply_to_id: mid }, bob);
      assert.equal(reply.status, 201);
      assert.equal((await request(`/messages/${reply.data.id}`, undefined, bob)).data.reply.text, 'Original message');
      assert.equal((await request(`/messages/${mid}`, { text: 'Unauthorized' }, bob, 'PATCH')).status, 403);
      assert.equal((await request(`/messages/${mid}`, undefined, eve, 'DELETE')).status, 404);
      assert.equal((await request(`/messages/${mid}`, { text: ' ' }, alice, 'PATCH')).status, 400);
      const edited = await request(`/messages/${mid}`, { text: 'Edited message' }, alice, 'PATCH');
      assert.equal(edited.status, 200);
      assert.ok(edited.data.edited_at);
      assert.equal((await request(`/messages/${reply.data.id}`, undefined, bob)).data.reply.text, 'Edited message');
      assert.equal((await request(`/messages/${mid}`, undefined, bob, 'DELETE')).status, 403);
      const deleted = await request(`/messages/${mid}`, undefined, alice, 'DELETE');
      assert.equal(deleted.status, 200);
      assert.ok(deleted.data.deleted_at);
      assert.equal(deleted.data.text, 'Message deleted');
      assert.equal((await request(`/messages/${mid}`, { text: 'Restore' }, alice, 'PATCH')).status, 409);
      assert.equal((await request(`/messages/${reply.data.id}`, undefined, bob)).data.reply.text, 'Message deleted');
      assert.equal((await request(`/conversations/${conversation}/messages`, { client_id: randomUUID(), text: 'Reply', reply_to_id: mid }, bob)).status, 400);
      const other = (await request('/conversations', { handle: eve.user.handle }, alice)).data.id;
      assert.equal((await request(`/conversations/${other}/messages`, { client_id: randomUUID(), text: 'Wrong conversation', reply_to_id: reply.data.id }, alice)).status, 400);
    });
    await t.test('editing history is private, deletion has a time limit, and expiration removes revisions', async () => {
      const sent = await request(`/conversations/${conversation}/messages`, { client_id: randomUUID(), text: 'First version', expires_in_seconds: 300 }, alice);
      assert.equal(sent.status, 201);
      const mid = sent.data.id;
      assert.ok(Math.abs(Date.parse(sent.data.expires_at) - Date.parse(sent.data.created_at) - 300000) < 1000);
      assert.equal((await request(`/messages/${mid}`, { text: 'Second version' }, alice, 'PATCH')).status, 200);
      assert.equal((await request(`/messages/${mid}`, { text: 'Third version' }, alice, 'PATCH')).status, 200);
      assert.equal((await request(`/messages/${mid}`, { text: 'Third version' }, alice, 'PATCH')).status, 200);
      const history = await request(`/messages/${mid}/history`, undefined, bob);
      assert.equal(history.status, 200);
      assert.deepEqual(history.data.history.map((revision) => revision.text), ['First version', 'Second version']);
      assert.equal(history.data.current.text, 'Third version');
      assert.equal((await request(`/messages/${mid}/history`, undefined, eve)).status, 404);
      await db.query("UPDATE messages SET expires_at=now()-interval '1 second' WHERE id=$1", [mid]);
      assert.equal((await request(`/messages/${mid}/history`, undefined, bob)).status, 404);
      const { transaction } = await import('../../server/db.js');
      await transaction(expireMessages);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM message_edit_history WHERE message_id=$1', [mid])).rows[0].n, 0);
      const old = (await request(`/conversations/${conversation}/messages`, { client_id: randomUUID(), text: 'Old message' }, alice)).data;
      await db.query("UPDATE messages SET created_at=now()-interval '24 hours 1 second' WHERE id=$1", [old.id]);
      assert.equal((await request(`/messages/${old.id}`, undefined, alice, 'DELETE')).status, 409);
      assert.equal((await db.query('SELECT deleted_at FROM messages WHERE id=$1', [old.id])).rows[0].deleted_at, null);
      const fresh = (await request(`/conversations/${conversation}/messages`, { client_id: randomUUID(), text: 'Delete revision' }, alice)).data;
      await request(`/messages/${fresh.id}`, { text: 'Delete edited' }, alice, 'PATCH');
      assert.equal((await request(`/messages/${fresh.id}`, undefined, alice, 'DELETE')).status, 200);
      assert.equal((await request(`/messages/${fresh.id}/history`, undefined, bob)).status, 404);
      assert.equal((await db.query('SELECT count(*)::int AS n FROM message_edit_history WHERE message_id=$1', [fresh.id])).rows[0].n, 0);
      assert.equal((await request(`/conversations/${conversation}/messages`, { client_id: randomUUID(), text: 'Invalid timer', expires_in_seconds: 1 }, alice)).status, 400);
      await request(`/conversations/${conversation}/disappearing`, { seconds: 3600 }, alice, 'PATCH');
      const longer = (await request(`/conversations/${conversation}/messages`, { client_id: randomUUID(), text: 'Respect chat timer', expires_in_seconds: 86400 }, alice)).data;
      assert.ok(Math.abs(Date.parse(longer.expires_at) - Date.parse(longer.created_at) - 3600000) < 1000);
      await request(`/conversations/${conversation}/disappearing`, { seconds: 0 }, alice, 'PATCH');
    });
    await t.test('chat library searches full history literally and protects private media', async () => {
      assert.equal((await request(`/conversations/${conversation}/library`, undefined, eve)).status,404);
      assert.equal((await request(`/conversations/${conversation}/library`)).status,401);
      await db.query("INSERT INTO messages(id,conversation_id,sender_id,client_id,text,source_language) VALUES(gen_random_uuid(),$1,$2,gen_random_uuid(),'literal 100%_unique','en')",[conversation,alice.user.id]);
      const literal = await request(`/conversations/${conversation}/library?q=100%25_unique`,undefined,bob);
      assert.equal(literal.status,200,JSON.stringify(literal.data));
      assert.equal(literal.data.messages.length,1);
      const first = (await request(`/conversations/${conversation}/library`,undefined,bob)).data;
      assert.equal(first.messages.length,30); assert.equal(first.has_more,true);
      const second = (await request(`/conversations/${conversation}/library?before=${first.messages.at(-1).seq}`,undefined,bob)).data;
      assert.ok(second.messages.every(m=>Number(m.seq)<Number(first.messages.at(-1).seq)));
      assert.ok(first.messages.every(m=>!m.deleted_at));
      const photos = (await request(`/conversations/${conversation}/library?kind=photos`,undefined,bob)).data;
      assert.ok(photos.messages.length); assert.ok(photos.messages.every(m=>m.attachment.mime.startsWith('image/')));
      const files = (await request(`/conversations/${conversation}/library?kind=documents`,undefined,bob)).data;
      assert.equal(files.messages.length,0);
      assert.equal((await request(`/conversations/${conversation}/library?kind=invalid`,undefined,bob)).status,400);
      assert.equal((await request(`/conversations/${conversation}/library?before=-1`,undefined,bob)).status,400);
    });
    await t.test('blocks stop contact in both directions and reports remain private', async () => {
      assert.equal((await request(`/users/${alice.user.id}/block`,{},alice,'PUT')).status,400);
      assert.equal((await request(`/users/${bob.user.id}/block`,{},alice,'PUT')).status,200);
      assert.equal((await request(`/users/${bob.user.id}/block`,{},alice,'PUT')).status,200);
      for (const session of [alice,bob]) {
        assert.equal((await request(`/conversations/${conversation}/messages`,{client_id:randomUUID(),text:'blocked'},session)).status,403);
        assert.equal((await request(`/conversations/${conversation}/calls`,{kind:'audio'},session)).status,403);
        assert.equal((await request(`/conversations/${conversation}/messages`,undefined,session)).status,200);
      }
      const directory=(await request('/users?q='+bob.user.handle,undefined,alice)).data.users[0];
      assert.equal(directory.blocked_by_me,true); assert.equal(directory.contact_blocked,true); assert.equal(directory.online,null);
      assert.equal((await request('/conversations',{handle:alice.user.handle},bob)).status,403);
      assert.equal((await request(`/users/${bob.user.id}/block`,undefined,bob,'DELETE')).status,200);
      assert.equal((await request(`/conversations/${conversation}/messages`,{client_id:randomUUID(),text:'still blocked'},bob)).status,403);
      const report=await request(`/users/${bob.user.id}/report`,{reason:'harassment',details:'Repeated unwanted contact'},alice);
      assert.equal(report.status,201);
      assert.equal((await db.query('SELECT details FROM user_reports WHERE id=$1',[report.data.id])).rows[0].details,'Repeated unwanted contact');
      assert.equal((await request(`/users/${bob.user.id}/report`,{reason:'invalid'},alice)).status,400);
      assert.equal((await request(`/users/${alice.user.id}/report`,{reason:'spam'},alice)).status,400);
      assert.equal((await request(`/users/${bob.user.id}/block`,undefined,alice,'DELETE')).status,200);
      assert.equal((await request(`/conversations/${conversation}/messages`,{client_id:randomUUID(),text:'unblocked'},bob)).status,201);
    });
    await t.test('groups show one conversation and each member’s selected translation', async () => {
      await db.query('UPDATE users SET ai_consent=true WHERE id=ANY($1::uuid[])', [[alice.user.id, bob.user.id, eve.user.id]]);
      const result = await request('/conversations/groups', { name: 'Our group', handles: [bob.user.handle, eve.user.handle] }, alice);
      assert.equal(result.status, 201, JSON.stringify(result.data));
      const cid = result.data.id;
      for (const session of [alice, bob, eve]) {
        const groups = (await request('/conversations', undefined, session)).data.filter(item => item.id === cid);
        assert.equal(groups.length, 1);
        assert.equal(groups[0].peer.name, 'Our group');
        assert.equal(groups[0].members.length, 3);
        assert.equal(groups[0].is_group, true);
      }
      assert.equal((await request(`/conversations/${cid}/calls`, { kind: 'audio' }, alice)).status, 400);
      const sent = await request(`/conversations/${cid}/messages`, { client_id: randomUUID(), text: 'Hello everyone', source_language: 'en' }, alice);
      assert.equal(sent.status, 201, JSON.stringify(sent.data));
      for (const [lang, text] of [['sw', 'Habari wote'], ['manglish', 'Ellavarkkum namaskaram']]) {
        await db.query("INSERT INTO translations(message_id,language,status,text) VALUES($1,$2,'ready',$3) ON CONFLICT(message_id,language) DO UPDATE SET status='ready',text=EXCLUDED.text", [sent.data.id, lang, text]);
      }
      for (const [session, expected] of [[bob, 'Habari wote'], [eve, 'Ellavarkkum namaskaram']]) {
        const page = await request(`/conversations/${cid}/messages`, undefined, session);
        assert.equal(page.status, 200, JSON.stringify(page.data));
        assert.equal(page.data.messages[0].translation.text, expected);
        assert.equal(page.data.messages[0].receiver_translation, null);
        const single = await request(`/messages/${sent.data.id}`, undefined, session);
        assert.equal(single.data.translation.text, expected);
      }
      // The two recipients now share a language: sending must still succeed,
      // and translation fan-out must create only one job for that language.
      await db.query("UPDATE users SET language='sw' WHERE id=$1", [eve.user.id]);
      const { config } = await import('../../server/config.js');
      const originalKey = config.GEMINI_API_KEY;
      config.GEMINI_API_KEY ||= 'integration-test-key';
      let shared;
      try {
        shared = await request(`/conversations/${cid}/messages`, { client_id: randomUUID(), text: 'Same language', source_language: 'en' }, alice);
      } finally { config.GEMINI_API_KEY = originalKey; }
      assert.equal(shared.status, 201, JSON.stringify(shared.data));
      const jobs = (await db.query("SELECT payload FROM outbox WHERE kind='translate' AND payload->>'message_id'=$1", [shared.data.id])).rows;
      assert.equal(jobs.length, 1);
      assert.equal(jobs[0].payload.language, 'sw');
      assert.equal(jobs[0].payload.requester_ids.length, 2);
      assert.equal((await request('/conversations/groups', { name: 'Invalid', handles: [bob.user.handle, bob.user.handle] }, alice)).status, 400);
    });
    await t.test('stars are personal, pins are shared, and deleted messages leave saved lists', async () => {
      const sent = await request(`/conversations/${conversation}/messages`,{client_id:randomUUID(),text:'Important address: 12 Garden Road'},alice);
      const mid=sent.data.id;
      assert.equal((await request(`/messages/${mid}/star`,{},alice,'PUT')).status,200);
      assert.equal((await request(`/messages/${mid}/star`,{},alice,'PUT')).status,200);
      assert.equal((await request(`/messages/${mid}`,undefined,alice)).data.starred,true);
      assert.equal((await request(`/messages/${mid}`,undefined,bob)).data.starred,false);
      assert.equal((await request(`/messages/${mid}/star`,{},eve,'PUT')).status,404);
      assert.equal((await request(`/messages/${mid}/pin`,{},eve,'PUT')).status,404);
      assert.equal((await request(`/messages/${mid}/pin`,{},bob,'PUT')).status,200);
      assert.equal((await request(`/messages/${mid}`,undefined,alice)).data.pinned,true);
      const starred=(await request(`/conversations/${conversation}/library?kind=starred&q=Garden`,undefined,alice)).data;
      assert.equal(starred.messages[0].id,mid);
      assert.equal((await request(`/conversations/${conversation}/library?kind=starred`,undefined,bob)).data.messages.length,0);
      assert.equal((await request(`/conversations/${conversation}/library?kind=pinned`,undefined,bob)).data.messages[0].id,mid);
      await request(`/messages/${mid}/pin`,undefined,alice,'DELETE');
      assert.equal((await request(`/messages/${mid}`,undefined,bob)).data.pinned,false);
      await request(`/messages/${mid}/star`,undefined,alice,'DELETE');
      assert.equal((await request(`/messages/${mid}`,undefined,alice)).data.starred,false);
      await request(`/messages/${mid}/star`,{},bob,'PUT');
      await request(`/messages/${mid}/pin`,{},alice,'PUT');
      await request(`/messages/${mid}`,undefined,alice,'DELETE');
      assert.equal((await request(`/conversations/${conversation}/library?kind=starred`,undefined,bob)).data.messages.length,0);
      assert.equal((await request(`/conversations/${conversation}/library?kind=pinned`,undefined,bob)).data.messages.length,0);
      assert.equal((await request(`/messages/${mid}/star`,{},alice,'PUT')).status,409);
    });
    await t.test('disappearing settings apply to new messages and expired content is inaccessible', async () => {
      assert.equal((await request(`/conversations/${conversation}/disappearing`,{seconds:123},alice,'PATCH')).status,400);
      assert.equal((await request(`/conversations/${conversation}/disappearing`,{seconds:86400},eve,'PATCH')).status,404);
      const previous = (await request(`/conversations/${conversation}/messages`,{client_id:randomUUID(),text:'Keep previous message'},alice)).data;
      for(const seconds of [3600,86400,604800,2592000]) {
        assert.equal((await request(`/conversations/${conversation}/disappearing`,{seconds},alice,'PATCH')).status,200);
        const sent = (await request(`/conversations/${conversation}/messages`,{client_id:randomUUID(),text:'Temporary '+seconds},alice)).data;
        assert.ok(Math.abs((new Date(sent.expires_at)-new Date(sent.created_at))/1000-seconds)<2);
        assert.equal((await request(`/messages/${previous.id}`,undefined,bob)).data.expires_at,null);
        await request(`/messages/${sent.id}/star`,{},bob,'PUT');
        await request(`/messages/${sent.id}/pin`,{},alice,'PUT');
        await db.query("UPDATE messages SET expires_at=now()-interval '1 second' WHERE id=$1",[sent.id]);
        assert.equal((await request(`/messages/${sent.id}`,undefined,bob)).status,404);
        assert.equal((await request(`/messages/${sent.id}`,{text:'Restore'},alice,'PATCH')).status,404);
        assert.equal((await request(`/messages/${sent.id}/star`,{},bob,'PUT')).status,404);
        assert.equal((await request(`/conversations/${conversation}/library?q=Temporary`,undefined,bob)).data.messages.length,0);
        assert.equal((await request(`/conversations/${conversation}/messages`,{client_id:randomUUID(),text:'Reply',reply_to_id:sent.id},bob)).status,400);
        const client=await db.connect();
        try{await client.query('BEGIN');assert.ok(await expireMessages(client)>0);await client.query('COMMIT');}finally{client.release();}
        assert.equal((await db.query('SELECT text FROM messages WHERE id=$1',[sent.id])).rows[0].text,'Message expired');
        assert.equal((await db.query('SELECT count(*)::int AS count FROM message_stars WHERE message_id=$1',[sent.id])).rows[0].count,0);
      }
      assert.equal((await request(`/conversations/${conversation}/disappearing`,{seconds:0},bob,'PATCH')).status,200);
      const permanent=(await request(`/conversations/${conversation}/messages`,{client_id:randomUUID(),text:'Permanent'},bob)).data;
      assert.equal(permanent.expires_at,null);
    });
    await t.test('export is member-only, paginates a fixed range, and excludes deleted and expired messages', async () => {
      assert.equal((await request('/conversations/'+conversation+'/export',undefined,eve)).status,404);
      assert.equal((await request('/conversations/'+conversation+'/export?after=-1',undefined,alice)).status,400);
      const start = (await db.query('SELECT coalesce(max(seq),0)::text AS seq FROM messages WHERE conversation_id=$1',[conversation])).rows[0].seq;
      await db.query(`INSERT INTO messages(id,conversation_id,sender_id,client_id,text,source_language)
        SELECT gen_random_uuid(),$1,$2,gen_random_uuid(),'Export line ' || i,'en' FROM generate_series(1,205) i`,[conversation,alice.user.id]);
      await db.query("UPDATE messages SET deleted_at=now() WHERE conversation_id=$1 AND text='Export line 2'",[conversation]);
      await db.query("UPDATE messages SET expires_at=now()-interval '1 second' WHERE conversation_id=$1 AND text='Export line 3'",[conversation]);
      const first=await request('/conversations/'+conversation+'/export?after='+start,undefined,alice);
      assert.equal(first.status,200); assert.equal(first.data.messages.length,200); assert.equal(first.data.has_more,true);
      await request('/conversations/'+conversation+'/messages',{client_id:randomUUID(),text:'Sent after export began'},alice);
      const last=await request('/conversations/'+conversation+'/export?after='+first.data.messages.at(-1).seq+'&through='+first.data.through,undefined,alice);
      assert.equal(last.data.messages.length,3); assert.equal(last.data.has_more,false);
      const messages=[...first.data.messages,...last.data.messages];
      assert.ok(messages.every(message => !['Export line 2','Export line 3','Sent after export began'].includes(message.text)));
      assert.ok(messages.every(message => !Object.hasOwn(message,'client_id')));
    });
    await t.test('schedules are private, editable, cancellable and deliver once with permission checks', async () => {
      const input = { client_id: randomUUID(), text: 'Later hello', source_language: 'en', delivery_at: new Date(Date.now() + 3600000).toISOString(), time_zone: 'Asia/Kolkata', reminder_minutes: 15 };
      const created = await request(`/conversations/${conversation}/scheduled`, input, alice);
      assert.equal(created.status, 201, JSON.stringify(created.data));
      const row = created.data;
      assert.equal((await request(`/conversations/${conversation}/scheduled`, input, alice)).data.id, row.id);
      assert.equal((await request(`/conversations/${conversation}/scheduled`, undefined, bob)).data.scheduled.length, 0);
      assert.equal((await request(`/conversations/${conversation}/scheduled`, undefined, eve)).status, 404);
      const { client_id: _clientId, ...edit } = input;
      assert.equal((await request(`/scheduled/${row.id}`, { ...edit, revision: 1, text: 'Edited later' }, bob, 'PATCH')).status, 404);
      assert.equal((await request(`/scheduled/${row.id}`, { ...edit, revision: 1, text: 'Edited later' }, alice, 'PATCH')).status, 200);
      assert.equal((await request(`/scheduled/${row.id}`, { ...edit, revision: 1 }, alice, 'PATCH')).status, 409);
      const stalePushes = [];
      await deliverSchedulePush({ id: row.id, revision: 1 }, async (_subscription, payload) => stalePushes.push(payload));
      assert.equal(stalePushes.length, 0);
      await db.query("UPDATE scheduled_messages SET delivery_at=now()+interval '10 minutes' WHERE id=$1", [row.id]);
      await processSchedules();
      await processSchedules();
      assert.equal((await db.query("SELECT count(*)::int AS n FROM outbox WHERE kind='schedule_push' AND payload->>'id'=$1", [row.id])).rows[0].n, 1);
      assert.equal((await request('/notifications/subscription', { endpoint: 'https://fcm.googleapis.com/fcm/send/schedule-test', keys: { p256dh: testPushKeys.publicKey, auth: 'A'.repeat(22) } }, alice)).status, 200);
      const reminderPushes = [];
      await deliverSchedulePush({ id: row.id, revision: 2 }, async (_subscription, payload) => reminderPushes.push(JSON.parse(payload)));
      assert.ok(reminderPushes.length > 0);
      assert.equal(reminderPushes[0].data.user_id, alice.user.id);
      assert.match(reminderPushes[0].body, /Asia\/Kolkata/);
      assert.ok(!reminderPushes[0].body.includes('Edited later'));
      await db.query("UPDATE scheduled_messages SET delivery_at=now()-interval '1 second' WHERE id=$1", [row.id]);
      await Promise.all([processSchedules(), processSchedules()]);
      await processSchedules();
      const delivered = (await db.query('SELECT * FROM scheduled_messages WHERE id=$1', [row.id])).rows[0];
      assert.equal(delivered.status, 'sent');
      assert.equal((await db.query('SELECT text FROM messages WHERE id=$1', [delivered.message_id])).rows[0].text, 'Edited later');
      assert.equal((await db.query('SELECT count(*)::int AS n FROM messages WHERE sender_id=$1 AND client_id=$2', [alice.user.id, row.id])).rows[0].n, 1);
      assert.equal((await request(`/scheduled/${row.id}`, undefined, alice, 'DELETE')).status, 409);
      const cancelled = (await request(`/conversations/${conversation}/scheduled`, { ...input, client_id: randomUUID() }, alice)).data;
      assert.equal((await request(`/scheduled/${cancelled.id}`, undefined, alice, 'DELETE')).status, 200);
      const cancelledPushes = [];
      await deliverSchedulePush({ id: cancelled.id, revision: 1 }, async (_subscription, payload) => cancelledPushes.push(payload));
      assert.equal(cancelledPushes.length, 0);
      await db.query("UPDATE scheduled_messages SET delivery_at=now()-interval '1 second' WHERE id=$1", [cancelled.id]);
      await processSchedules();
      assert.equal((await db.query('SELECT status FROM scheduled_messages WHERE id=$1', [cancelled.id])).rows[0].status, 'cancelled');
      const denied = (await request(`/conversations/${conversation}/scheduled`, { ...input, client_id: randomUUID() }, alice)).data;
      await db.query('INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [bob.user.id, alice.user.id]);
      try {
        await db.query("UPDATE scheduled_messages SET delivery_at=now()-interval '1 second' WHERE id=$1", [denied.id]);
        await processSchedules();
        assert.equal((await db.query('SELECT status FROM scheduled_messages WHERE id=$1', [denied.id])).rows[0].status, 'failed');
      } finally { await db.query('DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2', [bob.user.id, alice.user.id]); }
    });
    await t.test('logout invalidates the session', async () => {
      await request('/notifications/subscription', { endpoint: 'https://fcm.googleapis.com/fcm/send/logout-test', keys: { p256dh: testPushKeys.publicKey, auth: 'A'.repeat(22) } }, alice);
      assert.equal((await request('/auth/logout', {}, alice)).status, 200);
      assert.equal((await request('/conversations', undefined, alice)).status, 401);
      assert.equal((await db.query('SELECT endpoint FROM push_subscriptions WHERE user_id=$1', [alice.user.id])).rowCount, 0);
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await queue.close();
    await queueConnection.quit();
    await redis.quit();
    await db.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
