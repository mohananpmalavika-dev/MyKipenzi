import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import 'dotenv/config';
const schema = `test_${randomUUID().replaceAll('-', '')}`;
process.env.RATE_LIMIT_NAMESPACE = schema;
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await admin.query(`CREATE SCHEMA ${schema}`);
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('options', `-c search_path=${schema}`);
process.env.DATABASE_URL = url.toString();
const { db } = await import('../../server/db.js');
const { createApp } = await import('../../server/app.js');
const { redis, queue, queueConnection } = await import('../../server/infra.js');
await db.query(await readFile(new URL('../../server/schema.sql', import.meta.url), 'utf8'));
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
    await t.test('logout invalidates the session', async () => {
      assert.equal((await request('/auth/logout', {}, alice)).status, 200);
      assert.equal((await request('/conversations', undefined, alice)).status, 401);
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
