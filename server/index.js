import { expireMessages } from './disappearing.js';
import { processSchedules } from './scheduled.js';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from './config.js';
import { db, one, transaction } from './db.js';
import { redis, queue, queueConnection, logger, limit } from './infra.js';
import { getSession } from './auth.js';
import { createApp } from './app.js';
import { signalInput, id } from '../shared/contracts.js';
import { assertCanContact, membership, conversationEvent } from './service.js';
let app;
const http = createServer((req, res) => app(req, res));
const io = new Server(http, {
  cors: { origin: config.APP_ORIGIN, credentials: true },
  transports: ['websocket'],
  maxHttpBufferSize: 120000,
  allowRequest: (req, done) => done(null, req.headers.origin === config.APP_ORIGIN),
});
const pub = redis.duplicate(),
  sub = redis.duplicate(),
  events = redis.duplicate();
for (const connection of [pub, sub, events])
  connection.on('error', (e) => logger.error({ error: e.message }, 'Redis subscription error'));
io.adapter(createAdapter(pub, sub));
io.use(async (socket, next) => {
  try {
    const user = await getSession(socket.request.headers.cookie);
    if (!user || socket.handshake.auth.csrf !== user.csrf) return next(new Error('Unauthorized'));
    socket.data.user = user;
    next();
  } catch {
    next(new Error('Service unavailable'));
  }
});
io.on('connection', (socket) => {
  const user = socket.data.user;
  socket.join(`user:${user.id}`);
  socket.join(`session:${user.token_hash}`);
  const expiry = setTimeout(
    () => socket.disconnect(true),
    Math.max(0, new Date(user.expires_at).getTime() - Date.now()),
  );
  expiry.unref();
  socket.once('disconnect', () => clearTimeout(expiry));
  socket.on('call:signal', async (payload, ack) => {
    try {
      const current = await getSession(socket.request.headers.cookie);
      if (!current) throw new Error('Session expired');
      await limit(`signal:${user.id}`, 300, 60);
      const signal = signalInput.parse(payload);
      const call = await one(
        "SELECT * FROM calls WHERE id=$1 AND state='active' AND (caller_id=$2 OR callee_id=$2)",
        [signal.call_id, user.id],
      );
      if (!call) throw new Error('Call unavailable');
      await assertCanContact(user.id, call.conversation_id);
      if (
        (signal.type === 'offer' && call.caller_id !== user.id) ||
        (signal.type === 'answer' && call.callee_id !== user.id)
      )
        throw new Error('Invalid signal role');
      const peer = call.caller_id === user.id ? call.callee_id : call.caller_id;
      io.to(`user:${peer}`).emit('call:signal', signal);
      if (typeof ack === 'function') ack({ ok: true });
    } catch (e) {
      if (typeof ack === 'function') ack({ error: e.message });
    }
  });
  socket.on('typing', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      await limit(`typing:${user.id}`, 30, 60);
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      await assertCanContact(user.id, cid);
      const peer = await one(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [cid, user.id],
      );
      io.to(`user:${peer.user_id}`).emit('typing', { conversation_id: cid, user_id: user.id });
    } catch {
      /* typing is best effort */
    }
  });
  socket.on('call:heartbeat', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      await limit(`heartbeat:${user.id}`, 10, 60);
      const callId = id.parse(payload.call_id);
      const call = await one(
        "SELECT id FROM calls WHERE id=$1 AND state='active' AND (caller_id=$2 OR callee_id=$2)",
        [callId, user.id],
      );
      if (call) await redis.set(`call-alive:${callId}:${user.id}`, '1', 'EX', 90);
    } catch {
      /* Call maintenance closes expired sessions. */
    }
  });
  socket.on('call:reaction', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      await limit(`call-reaction:${user.id}`, 120, 60);
      const callId = id.parse(payload.call_id);
      const call = await one(
        "SELECT id, caller_id, callee_id, conversation_id FROM calls WHERE id=$1 AND (caller_id=$2 OR callee_id=$2)",
        [callId, user.id],
      );
      if (!call) return;
      const peer = call.caller_id === user.id ? call.callee_id : call.caller_id;
      io.to(`user:${peer}`).emit('call:reaction', {
        call_id: callId,
        sender_id: user.id,
        sender_name: user.name,
        reaction: payload.reaction,
      });
    } catch {
      /* Call reaction is best effort */
    }
  });
  socket.on('doodle:sync', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const peer = await one(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [cid, user.id],
      );
      if (peer) {
        io.to(`user:${peer.user_id}`).emit('doodle:sync', {
          ...payload,
          sender_id: user.id,
          sender_name: user.name,
        });
      }
    } catch {
      /* doodle sync is best effort */
    }
  });
  socket.on('doodle:invite', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const peer = await one(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [cid, user.id],
      );
      if (peer) {
        io.to(`user:${peer.user_id}`).emit('doodle:invite', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
        });
      }
    } catch {
      /* doodle invite is best effort */
    }
  });
  socket.on('heartbeat:pulse', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const peer = await one(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [cid, user.id],
      );
      if (peer) {
        io.to(`user:${peer.user_id}`).emit('heartbeat:pulse', {
          ...payload,
          sender_id: user.id,
          sender_name: user.name,
        });
      }
    } catch {
      /* heartbeat pulse is best effort */
    }
  });
  socket.on('heartbeat:invite', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const peer = await one(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [cid, user.id],
      );
      if (peer) {
        io.to(`user:${peer.user_id}`).emit('heartbeat:invite', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
        });
      }
    } catch {
      /* heartbeat invite is best effort */
    }
  });
  socket.on('heartbeat:status', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const peer = await one(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [cid, user.id],
      );
      if (peer) {
        io.to(`user:${peer.user_id}`).emit('heartbeat:status', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
          active: Boolean(payload.active),
        });
      }
    } catch {
      /* heartbeat status is best effort */
    }
  });
  socket.on('daily_prompt:nudge', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const peer = await one(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [cid, user.id],
      );
      if (peer) {
        io.to(`user:${peer.user_id}`).emit('daily_prompt:nudge', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
          date: payload.date,
        });
      }
    } catch {
      /* daily prompt nudge is best effort */
    }
  });
  socket.on('music:sync', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const members = (
        await db.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [
          cid,
          user.id,
        ])
      ).rows;
      for (const m of members) {
        io.to(`user:${m.user_id}`).emit('music:sync', {
          ...payload,
          sender_id: user.id,
          sender_name: user.name,
        });
      }
    } catch {
      /* music sync is best effort */
    }
  });
  socket.on('music:invite', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const members = (
        await db.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [
          cid,
          user.id,
        ])
      ).rows;
      for (const m of members) {
        io.to(`user:${m.user_id}`).emit('music:invite', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
          track: payload.track,
        });
      }
    } catch {
      /* music invite is best effort */
    }
  });
  socket.on('music:reaction', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const members = (
        await db.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [
          cid,
          user.id,
        ])
      ).rows;
      for (const m of members) {
        io.to(`user:${m.user_id}`).emit('music:reaction', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
          reaction: payload.reaction,
        });
      }
    } catch {
      /* music reaction is best effort */
    }
  });
  socket.on('music:status', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const members = (
        await db.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [
          cid,
          user.id,
        ])
      ).rows;
      for (const m of members) {
        io.to(`user:${m.user_id}`).emit('music:status', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
          active: Boolean(payload.active),
          track_id: payload.track_id,
        });
      }
    } catch {
      /* music status is best effort */
    }
  });
  socket.on('video:sync', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const members = (
        await db.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [
          cid,
          user.id,
        ])
      ).rows;
      for (const m of members) {
        io.to(`user:${m.user_id}`).emit('video:sync', {
          ...payload,
          sender_id: user.id,
          sender_name: user.name,
        });
      }
    } catch {
      /* video sync is best effort */
    }
  });
  socket.on('video:invite', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const members = (
        await db.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [
          cid,
          user.id,
        ])
      ).rows;
      for (const m of members) {
        io.to(`user:${m.user_id}`).emit('video:invite', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
          video: payload.video,
        });
      }
    } catch {
      /* video invite is best effort */
    }
  });
  socket.on('video:reaction', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const members = (
        await db.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [
          cid,
          user.id,
        ])
      ).rows;
      for (const m of members) {
        io.to(`user:${m.user_id}`).emit('video:reaction', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
          reaction: payload.reaction,
        });
      }
    } catch {
      /* video reaction is best effort */
    }
  });
  socket.on('video:status', async (payload) => {
    try {
      if (!(await getSession(socket.request.headers.cookie))) return;
      const cid = id.parse(payload.conversation_id);
      await membership(user.id, cid);
      const members = (
        await db.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [
          cid,
          user.id,
        ])
      ).rows;
      for (const m of members) {
        io.to(`user:${m.user_id}`).emit('video:status', {
          conversation_id: cid,
          sender_id: user.id,
          sender_name: user.name,
          active: Boolean(payload.active),
          video_id: payload.video_id,
        });
      }
    } catch {
      /* video status is best effort */
    }
  });
});
await events.subscribe('kipenzi-events');
events.on('message', (_channel, body) => {
  try {
    const event = JSON.parse(body);
    for (const userId of event.users) io.local.to(`user:${userId}`).emit(event.event, event.data);
  } catch (e) {
    logger.error({ error: e.message }, 'Invalid internal event');
  }
});
app = createApp(io);
let flushing = false;
async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    await transaction(async (c) => {
      const rows = (
        await c.query('SELECT * FROM outbox ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED')
      ).rows;
      for (const row of rows) {
        if (row.kind === 'event')
          await redis.publish('kipenzi-events', JSON.stringify(row.payload));
        else
          await queue.add(row.kind, row.payload, {
            jobId: `outbox-${row.id}`,
            priority: row.kind === 'translate' ? 1 : 5,
            ...(row.kind === 'push' ? { delay: 2000 } : {}),
          });
        await c.query('DELETE FROM outbox WHERE id=$1', [row.id]);
      }
    });
  } catch (e) {
    logger.error({ error: e.message }, 'Outbox delivery delayed');
  } finally {
    flushing = false;
  }
}
const flushTimer = setInterval(flush, 150);
flushTimer.unref();
let sweeping = false;
let scheduling = false;
const scheduleTimer = setInterval(async () => {
  if (scheduling) return;
  scheduling = true;
  try { await processSchedules(); }
  catch (error) { logger.error({ error: error.message }, 'Scheduled delivery delayed'); }
  finally { scheduling = false; }
}, 1000);
scheduleTimer.unref();
const sweepTimer = setInterval(async () => {
  if (sweeping) return;
  sweeping = true;
  try {
    await transaction(async (c) => {
      const expired = (
        await c.query(
          "UPDATE calls SET state=CASE WHEN state='ringing' THEN 'missed' ELSE 'ended' END,ended_at=now() WHERE (state='ringing' AND created_at<now()-interval '45 seconds') OR (state='active' AND accepted_at<now()-interval '2 hours') RETURNING *",
        )
      ).rows;
      for (const call of expired) {
        await c.query('DELETE FROM call_locks WHERE call_id=$1', [call.id]);
        await conversationEvent(c, call.conversation_id, 'call:changed', call);
      }
      const active = (
        await c.query(
          "SELECT * FROM calls WHERE state='active' AND accepted_at<now()-interval '120 seconds' FOR UPDATE SKIP LOCKED",
        )
      ).rows;
      for (const call of active) {
        const alive = await redis.mget(
          `call-alive:${call.id}:${call.caller_id}`,
          `call-alive:${call.id}:${call.callee_id}`,
        );
        if (alive.some((value) => !value)) {
          await c.query("UPDATE calls SET state='ended',ended_at=now() WHERE id=$1", [call.id]);
          await c.query('DELETE FROM call_locks WHERE call_id=$1', [call.id]);
          await conversationEvent(c, call.conversation_id, 'call:changed', {
            ...call,
            state: 'ended',
          });
        }
      }
      await expireMessages(c);
      await c.query('DELETE FROM sessions WHERE expires_at<now()');
      // Clean up old drafts (older than 30 days)
      await c.query("DELETE FROM message_drafts WHERE updated_at < now() - interval '30 days'");
    });
  } catch (e) {
    logger.error({ error: e.message }, 'Maintenance delayed');
  } finally {
    sweeping = false;
  }
}, 5000);
sweepTimer.unref();
http.listen(config.PORT, '0.0.0.0', () =>
  logger.info({ port: config.PORT }, 'Kipenzi API listening'),
);
async function shutdown() {
  clearInterval(flushTimer);
  clearInterval(sweepTimer);
  clearInterval(scheduleTimer);
  await new Promise((resolve) => io.close(resolve));
  await Promise.all([
    pub.quit(),
    sub.quit(),
    events.quit(),
    queue.close(),
    queueConnection.quit(),
    redis.quit(),
    db.end(),
  ]);
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
