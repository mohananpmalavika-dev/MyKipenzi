import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { config, production } from './config.js';
import { db, one, transaction } from './db.js';
import { authenticate, getSession, issueSession, publicUser, requireOrigin } from './auth.js';
import { hashPassword, verifyPassword, HttpError, turnCredentials } from './security.js';
import { limit, aiLimit, redis, logger } from './infra.js';
import { inspectFile, putObject, removeObject, getObject, storageReady } from './storage.js';
import { cloneVoice, voiceVerified } from './providers.js';
import {
  membership,
  messageSelect,
  sendMessage,
  changeCall,
  conversationEvent,
  enqueue,
} from './service.js';
import {
  registration,
  login,
  profile,
  messageInput,
  id,
  language,
  stickers,
} from '../shared/contracts.js';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 4, fieldSize: 1000 },
});
async function streamObject(req, res, key, mime, name) {
  const range = req.headers.range;
  if (range && !/^bytes=\d+-\d*$/.test(range)) throw new HttpError(416, 'Invalid byte range.');
  const object = await getObject(key, range);
  res.status(range ? 206 : 200);
  res.set({
    'Content-Type': mime,
    'Content-Length': String(object.ContentLength),
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `${mime.startsWith('image/') || mime.startsWith('audio/') || mime.startsWith('video/') ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`,
  });
  if (object.ContentRange) res.set('Content-Range', object.ContentRange);
  res.on('close', () => object.Body.destroy());
  await pipeline(object.Body, res);
}
export function createApp(io) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);
  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'blob:', 'data:'],
              mediaSrc: ["'self'", 'blob:'],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', requireOrigin);
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/health/ready', async (_req, res) => {
    await Promise.all([db.query('SELECT 1'), redis.ping(), storageReady()]);
    res.json({ status: 'ok' });
  });
  app.get('/api/capabilities', (_req, res) =>
    res.json({
      registration: config.ALLOW_REGISTRATION,
      translation: !!config.GEMINI_API_KEY,
      speech: true,
      voice_clone: !!config.ELEVENLABS_API_KEY,
      avatar: !!config.DID_API_KEY && !!config.ELEVENLABS_API_KEY,
      turn: !!config.TURN_URL,
      stickers,
    }),
  );
  app.get('/api/auth/session', async (req, res) => {
    const user = await getSession(req.headers.cookie);
    res.json({ user: user ? publicUser(user) : null, csrf: user?.csrf || null });
  });
  app.post('/api/auth/register', async (req, res) => {
    if (!config.ALLOW_REGISTRATION) throw new HttpError(403, 'Registration is closed.');
    await limit(`auth:${req.ip}`, 10, 900);
    const input = registration.parse(req.body);
    const user = await one(
      'INSERT INTO users(id,handle,name,email,password_hash,language,ai_consent) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [
        randomUUID(),
        input.handle,
        input.name,
        input.email,
        await hashPassword(input.password),
        input.language,
        input.ai_consent,
      ],
    );
    const csrf = await issueSession(res, user.id);
    res.status(201).json({ user: publicUser(user), csrf });
  });
  app.post('/api/auth/login', async (req, res) => {
    await limit(`auth:${req.ip}`, 10, 900);
    const input = login.parse(req.body);
    const user = await one('SELECT * FROM users WHERE email=$1', [input.email]);
    const dummy = 'scrypt:00000000000000000000000000000000:' + '00'.repeat(64);
    if (!(await verifyPassword(input.password, user?.password_hash || dummy)) || !user)
      throw new HttpError(401, 'Email or password is incorrect.');
    const csrf = await issueSession(res, user.id);
    res.json({ user: publicUser(user), csrf });
  });
  app.use('/api', authenticate);
  app.use('/api', async (req, _res, next) => {
    try {
      await limit(`api:${req.user.id}`, 180, 60);
      next();
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/auth/logout', async (req, res) => {
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.user.token_hash]);
    io?.in(`session:${req.user.token_hash}`).disconnectSockets(true);
    res.clearCookie('kipenzi_session', {
      httpOnly: true,
      secure: production,
      sameSite: 'strict',
      path: '/',
    });
    res.json({ ok: true });
  });
  app.patch('/api/profile', async (req, res) => {
    const input = profile.parse(req.body);
    const user = await transaction(async (c) => {
      const current = await one('SELECT * FROM users WHERE id=$1 FOR UPDATE', [req.user.id], c);
      if (!input.likeness_consent && current.voice_id)
        await enqueue(c, 'delete_voice', { voice_id: current.voice_id });
      return one(
        `UPDATE users SET name=$2,language=$3,ai_consent=$4,likeness_consent=$5,voice_id=CASE WHEN $5 THEN voice_id ELSE NULL END,voice_verified=CASE WHEN $5 THEN voice_verified ELSE false END WHERE id=$1 RETURNING *`,
        [req.user.id, input.name, input.language, input.ai_consent, input.likeness_consent],
        c,
      );
    });
    res.json(publicUser(user));
  });
  app.post('/api/profile/photo', upload.single('file'), async (req, res) => {
    const type = await inspectFile(req.file, 'avatar');
    const fileId = randomUUID(),
      key = `photos/${req.user.id}/${fileId}.${type.ext}`;
    await putObject(key, req.file.buffer, type.mime);
    try {
      const user = await transaction(async (c) => {
        await c.query(
          "INSERT INTO attachments(id,owner_id,purpose,object_key,name,mime,size) VALUES($1,$2,'avatar',$3,$4,$5,$6)",
          [fileId, req.user.id, key, type.name, type.mime, req.file.size],
        );
        return one(
          'UPDATE users SET avatar_id=$2 WHERE id=$1 RETURNING *',
          [req.user.id, fileId],
          c,
        );
      });
      res.json(publicUser(user));
    } catch (e) {
      await removeObject(key);
      throw e;
    }
  });
  app.delete('/api/profile/photo', async (req, res) => {
    const user = await one('UPDATE users SET avatar_id=NULL WHERE id=$1 RETURNING *', [
      req.user.id,
    ]);
    res.json(publicUser(user));
  });
  app.post('/api/profile/voice', upload.single('file'), async (req, res) => {
    if (!req.user.ai_consent || !req.user.likeness_consent)
      throw new HttpError(
        403,
        'Enable AI processing and confirm this is your own voice in settings.',
      );
    if (req.user.voice_id)
      throw new HttpError(409, 'Remove your existing voice before uploading another sample.');
    await aiLimit(req.user.id);
    const type = await inspectFile(req.file, 'voice');
    // Serialize clone creation across replicas. Re-check consent under the user lock.
    const user = await transaction(async (c) => {
      const current = await one('SELECT * FROM users WHERE id=$1 FOR UPDATE', [req.user.id], c);
      if (current.voice_id || !current.ai_consent || !current.likeness_consent)
        throw new HttpError(409, 'Voice or consent settings changed.');
      const result = await cloneVoice(
        `${current.handle} · Kipenzi`,
        req.file.buffer,
        type.mime,
        `sample.${type.ext}`,
      );
      if (!result.voice_id) throw new HttpError(502, 'Provider did not return a voice.');
      return one(
        'UPDATE users SET voice_id=$2,voice_verified=$3 WHERE id=$1 RETURNING *',
        [req.user.id, result.voice_id, result.requires_verification === false],
        c,
      );
    });
    res.json(publicUser(user));
  });
  app.delete('/api/profile/voice', async (req, res) => {
    const user = await transaction(async (c) => {
      const current = await one('SELECT * FROM users WHERE id=$1 FOR UPDATE', [req.user.id], c);
      if (current.voice_id) await enqueue(c, 'delete_voice', { voice_id: current.voice_id });
      return one(
        'UPDATE users SET voice_id=NULL,voice_verified=false WHERE id=$1 RETURNING *',
        [req.user.id],
        c,
      );
    });
    res.json(publicUser(user));
  });
  app.post('/api/profile/voice/refresh', async (req, res) => {
    if (!req.user.voice_id || !req.user.likeness_consent || !req.user.ai_consent)
      throw new HttpError(400, 'Upload your voice and enable consent first.');
    await limit(`voice-status:${req.user.id}`, 10, 600);
    const verified = await voiceVerified(req.user.voice_id);
    const updated = await one(
      'UPDATE users SET voice_verified=$3 WHERE id=$1 AND voice_id=$2 AND likeness_consent AND ai_consent RETURNING *',
      [req.user.id, req.user.voice_id, verified],
    );
    if (!updated) throw new HttpError(409, 'Your voice or consent settings changed.');
    res.json(publicUser(updated));
  });
  app.post('/api/conversations', async (req, res) => {
    const { handle } = z.object({ handle: z.string().regex(/^[a-z0-9_]{3,30}$/) }).parse(req.body);
    const peer = await one('SELECT id FROM users WHERE handle=$1', [handle]);
    if (!peer || peer.id === req.user.id)
      throw new HttpError(404, 'Friend not found. Ask them for their exact Kipenzi handle.');
    const result = await transaction(async (c) => {
      const direct = [req.user.id, peer.id].sort().join(':');
      const conversation = await one(
        'INSERT INTO conversations(id,direct_key) VALUES($1,$2) ON CONFLICT(direct_key) DO UPDATE SET direct_key=excluded.direct_key RETURNING id',
        [randomUUID(), direct],
        c,
      );
      await c.query(
        'INSERT INTO members(conversation_id,user_id) VALUES($1,$2),($1,$3) ON CONFLICT DO NOTHING',
        [conversation.id, req.user.id, peer.id],
      );
      await conversationEvent(c, conversation.id, 'conversation:changed', {
        conversation_id: conversation.id,
      });
      return conversation;
    });
    res.status(201).json(result);
  });
  app.get('/api/conversations', async (req, res) => {
    const result = await db.query(
      `SELECT c.id,me.read_seq,jsonb_build_object('id',u.id,'name',u.name,'handle',u.handle,'language',u.language,'avatar_id',u.avatar_id) AS peer,
      (SELECT count(*)::int FROM messages m WHERE m.conversation_id=c.id AND m.seq>me.read_seq AND m.sender_id<>$1) AS unread,
      (SELECT jsonb_build_object('text',m.text,'sticker',m.sticker,'attachment',m.attachment_id IS NOT NULL,'created_at',m.created_at) FROM messages m WHERE m.conversation_id=c.id ORDER BY m.seq DESC LIMIT 1) AS last_message,
      (SELECT coalesce(max(m.created_at),c.created_at) FROM messages m WHERE m.conversation_id=c.id) AS updated_at,
      other.read_seq AS peer_read_seq FROM conversations c JOIN members me ON me.conversation_id=c.id AND me.user_id=$1 JOIN members other ON other.conversation_id=c.id AND other.user_id<>$1 JOIN users u ON u.id=other.user_id ORDER BY updated_at DESC LIMIT 200`,
      [req.user.id],
    );
    res.json(result.rows);
  });
  app.get('/api/conversations/:id/messages', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    const cursorSchema = z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
    const before = cursorSchema.safeParse(req.query.before),
      after = cursorSchema.safeParse(req.query.after);
    if (
      (req.query.before !== undefined && !before.success) ||
      (req.query.after !== undefined && !after.success) ||
      (req.query.before !== undefined && req.query.after !== undefined)
    )
      throw new HttpError(400, 'Invalid message cursor.');
    if (req.query.after !== undefined) {
      const result = await db.query(
        `${messageSelect} WHERE m.conversation_id=$1 AND m.seq>$3 ORDER BY m.seq ASC LIMIT 50`,
        [cid, req.user.language, after.data],
      );
      res.json({ messages: result.rows, has_more: result.rows.length === 50 });
      return;
    }
    const result = await db.query(
      `${messageSelect} WHERE m.conversation_id=$1 AND ($3::bigint IS NULL OR m.seq<$3) ORDER BY m.seq DESC LIMIT 50`,
      [cid, req.user.language, before.success ? before.data : null],
    );
    res.json({ messages: result.rows.reverse(), has_more: result.rows.length === 50 });
  });
  app.post('/api/conversations/:id/messages', async (req, res) => {
    await limit(`messages:${req.user.id}`, 40, 60);
    const cid = id.parse(req.params.id),
      input = messageInput.parse(req.body);
    const result = await sendMessage(req.user, input, cid);
    res.status(201).json(result);
  });
  app.post('/api/conversations/:id/read', async (req, res) => {
    const cid = id.parse(req.params.id),
      input = z.object({ seq: z.coerce.number().int().nonnegative() }).parse(req.body);
    await transaction(async (c) => {
      await membership(req.user.id, cid, c);
      if (
        input.seq &&
        !(await one(
          'SELECT 1 FROM messages WHERE conversation_id=$1 AND seq=$2',
          [cid, input.seq],
          c,
        ))
      )
        throw new HttpError(400, 'Invalid read cursor.');
      await c.query(
        'UPDATE members SET read_seq=GREATEST(read_seq,$3) WHERE conversation_id=$1 AND user_id=$2',
        [cid, req.user.id, input.seq],
      );
      await conversationEvent(c, cid, 'receipt:changed', {
        conversation_id: cid,
        user_id: req.user.id,
        seq: input.seq,
      });
    });
    res.json({ ok: true });
  });
  app.post('/api/conversations/:id/uploads', upload.single('file'), async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await limit(`uploads:${req.user.id}`, 20, 3600);
    const type = await inspectFile(req.file, 'chat'),
      fileId = randomUUID(),
      key = `files/${cid}/${fileId}.${type.ext}`;
    await putObject(key, req.file.buffer, type.mime);
    try {
      const attachment = await one(
        "INSERT INTO attachments(id,owner_id,conversation_id,purpose,object_key,name,mime,size) VALUES($1,$2,$3,'chat',$4,$5,$6,$7) RETURNING id,name,mime,size",
        [fileId, req.user.id, cid, key, type.name, type.mime, req.file.size],
      );
      res.status(201).json(attachment);
    } catch (e) {
      await removeObject(key);
      throw e;
    }
  });
  const authorizedAttachment = async (req) => {
    const attachment = await one('SELECT * FROM attachments WHERE id=$1', [
      id.parse(req.params.id),
    ]);
    if (!attachment) throw new HttpError(404, 'File not found.');
    if (attachment.owner_id !== req.user.id) {
      if (attachment.purpose === 'chat') {
        await membership(req.user.id, attachment.conversation_id);
        if (!(await one('SELECT 1 FROM messages WHERE attachment_id=$1', [attachment.id])))
          throw new HttpError(404, 'File not found.');
      } else if (
        !(await one(
          'SELECT 1 FROM users u JOIN members theirs ON theirs.user_id=u.id JOIN members mine ON mine.conversation_id=theirs.conversation_id AND mine.user_id=$2 WHERE u.avatar_id=$1',
          [attachment.id, req.user.id],
        ))
      )
        throw new HttpError(404, 'Photo not found.');
    }
    return attachment;
  };
  app.get('/api/attachments/:id', async (req, res) => {
    const attachment = await authorizedAttachment(req);
    res.json({ url: `/api/attachments/${attachment.id}/content`, mime: attachment.mime });
  });
  app.get('/api/attachments/:id/content', async (req, res) => {
    const attachment = await authorizedAttachment(req);
    await streamObject(req, res, attachment.object_key, attachment.mime, attachment.name);
  });
  app.post('/api/messages/:id/translate', async (req, res) => {
    const mid = id.parse(req.params.id),
      target = language.parse(req.body.language);
    const m = await one(
      'SELECT m.*,u.ai_consent FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1',
      [mid],
    );
    if (!m) throw new HttpError(404, 'Message not found.');
    await membership(req.user.id, m.conversation_id);
    if (!m.ai_consent || !req.user.ai_consent)
      throw new HttpError(
        403,
        'You and your friend both need to allow AI translation and voice reading.',
      );
    if (!m.text) throw new HttpError(400, 'Only text messages can be translated.');
    if (!config.GEMINI_API_KEY) throw new HttpError(503, 'Translation is not configured.');
    await aiLimit(req.user.id);
    await transaction(async (c) => {
      await c.query(
        "INSERT INTO translations(message_id,language) VALUES($1,$2) ON CONFLICT(message_id,language) DO UPDATE SET status=CASE WHEN translations.status='ready' THEN 'ready' ELSE 'pending' END",
        [mid, target],
      );
      await enqueue(c, 'translate', {
        message_id: mid,
        language: target,
        requester_id: req.user.id,
      });
    });
    res.status(202).json({ status: 'pending' });
  });
  app.post('/api/messages/:id/media', async (req, res) => {
    const mid = id.parse(req.params.id),
      input = z
        .object({ kind: z.enum(['speech', 'avatar']), own_voice: z.boolean().default(false) })
        .parse(req.body);
    const m = await one(
      'SELECT m.*,u.ai_consent FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1',
      [mid],
    );
    if (!m) throw new HttpError(404, 'Message not found.');
    await membership(req.user.id, m.conversation_id);
    if (!m.text) throw new HttpError(400, 'Choose a text message.');
    if (!req.user.ai_consent || !m.ai_consent)
      throw new HttpError(
        403,
        'You and your friend both need to allow AI translation and voice reading.',
      );
    if (!config.ELEVENLABS_API_KEY || (!input.own_voice && !config.ELEVENLABS_VOICE_ID))
      throw new HttpError(503, 'Natural voice reading is not configured.');
    if (
      input.own_voice &&
      (!req.user.likeness_consent || !req.user.voice_id || !req.user.voice_verified)
    )
      throw new HttpError(400, 'Upload and verify your own voice first.');
    if (
      input.kind === 'avatar' &&
      (!config.DID_API_KEY || !req.user.avatar_id || !req.user.likeness_consent)
    )
      throw new HttpError(
        400,
        'Talking photo needs the avatar provider, your profile photo, and likeness consent.',
      );
    await aiLimit(req.user.id);
    const jobId = randomUUID();
    await transaction(async (c) => {
      await c.query(
        'INSERT INTO media_jobs(id,user_id,message_id,kind,own_voice) VALUES($1,$2,$3,$4,$5)',
        [jobId, req.user.id, mid, input.kind, input.own_voice],
      );
      await enqueue(c, 'media', { job_id: jobId });
    });
    res.status(202).json({ id: jobId, status: 'pending' });
  });
  app.get('/api/media/:id', async (req, res) => {
    const job = await one('SELECT * FROM media_jobs WHERE id=$1 AND user_id=$2', [
      id.parse(req.params.id),
      req.user.id,
    ]);
    if (!job) throw new HttpError(404, 'Media not found.');
    res.json({
      id: job.id,
      status: job.status,
      kind: job.kind,
      error: job.error,
      url: job.status === 'ready' ? `/api/media/${job.id}/content` : null,
    });
  });
  app.get('/api/media/:id/content', async (req, res) => {
    const job = await one(
      "SELECT * FROM media_jobs WHERE id=$1 AND user_id=$2 AND status='ready'",
      [id.parse(req.params.id), req.user.id],
    );
    if (!job) throw new HttpError(404, 'Media not found.');
    await streamObject(
      req,
      res,
      job.object_key,
      job.mime,
      job.kind === 'avatar' ? 'talking-photo.mp4' : 'message.mp3',
    );
  });
  app.get('/api/calls/ice', (_req, res) => {
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    if (config.TURN_URL)
      iceServers.push({
        urls: config.TURN_URL.split(','),
        ...turnCredentials(config.TURN_SECRET, _req.user.id),
      });
    res.json({ iceServers });
  });
  app.get('/api/calls/current', async (req, res) =>
    res.json(
      (await one(
        "SELECT * FROM calls WHERE (caller_id=$1 OR callee_id=$1) AND state IN ('ringing','active') ORDER BY created_at DESC LIMIT 1",
        [req.user.id],
      )) || null,
    ),
  );
  app.get('/api/conversations/:id/calls', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    res.json(
      (
        await db.query(
          'SELECT * FROM calls WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 30',
          [cid],
        )
      ).rows,
    );
  });
  app.post('/api/conversations/:id/calls', async (req, res) => {
    const cid = id.parse(req.params.id),
      kind = z.enum(['audio', 'video']).parse(req.body.kind);
    await limit(`calls:${req.user.id}`, 10, 600);
    const call = await transaction(async (c) => {
      await membership(req.user.id, cid, c);
      const peer = await one(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [cid, req.user.id],
        c,
      );
      const result = await one(
        'INSERT INTO calls(id,conversation_id,caller_id,callee_id,kind) VALUES($1,$2,$3,$4,$5) RETURNING *',
        [randomUUID(), cid, req.user.id, peer.user_id, kind],
        c,
      );
      try {
        await c.query('INSERT INTO call_locks(user_id,call_id) VALUES($1,$3),($2,$3)', [
          req.user.id,
          peer.user_id,
          result.id,
        ]);
      } catch (e) {
        if (e.code === '23505')
          throw new HttpError(409, 'You or your friend are already in a call.');
        throw e;
      }
      await conversationEvent(c, cid, 'call:changed', result);
      return result;
    });
    res.status(201).json(call);
  });
  app.patch('/api/calls/:id', async (req, res) => {
    const action = z.enum(['accept', 'decline', 'end']).parse(req.body.action);
    res.json(await changeCall(req.user.id, id.parse(req.params.id), action));
  });
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API route not found.')));
  if (production) {
    app.use(express.static('dist'));
    app.get('/{*path}', (_req, res) => res.sendFile('index.html', { root: 'dist' }));
  }
  app.use((error, req, res, _next) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    let status = error.status || 500,
      message = error.message;
    if (error instanceof z.ZodError) {
      status = 400;
      message = error.issues.map((i) => `${i.path.join('.') || 'Input'}: ${i.message}`).join('; ');
    }
    if (error.code === '23505') {
      status = 409;
      message = 'This account or identifier already exists.';
    }
    if (error instanceof multer.MulterError) {
      status = 400;
      message =
        error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 25 MB.' : 'Upload limits exceeded.';
    }
    if (status >= 500) {
      logger.error({ error: error.message, path: req.path }, 'Request failed');
      if (status === 500) message = 'Service unavailable. Please try again.';
    }
    res.status(status).json({ error: message });
  });
  return app;
}
