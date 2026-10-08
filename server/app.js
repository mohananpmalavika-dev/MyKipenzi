import { hasExpired } from '../shared/disappearing.js';
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
import { pushEnabled } from './push.js';
import { pushEndpoint, pushSubscription } from '../shared/push.js';
import {
  membership,
  assertCanContact,
  messageSelect,
  sendMessage,
  ensureReaderTranslations,
  changeMessage,
  saveMessage,
  toggleReaction,
  changeCall,
  conversationEvent,
  enqueue,
} from './service.js';
import {
  updateGroupProfile,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  promoteToAdmin,
  demoteFromAdmin,
  updateMemberPermissions,
  toggleGroupMute,
  deleteGroup,
  getGroupDetails,
  createInviteLink,
  getInviteLinks,
  revokeInviteLink,
  joinViaInviteLink,
  getJoinRequests,
  respondToJoinRequest,
  getGroupActivity,
} from './group-management.js';
import {
  registration,
  login,
  profile,
  messageInput,
  messageEdit,
  id,
  language,
  stickers,
} from '../shared/contracts.js';
import { getPromptForDate, getTodayDateKey } from '../shared/dailyPrompts.js';
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
      avatar: true,
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
  app.get('/api/notifications/config', (_req, res) => res.json({ enabled: pushEnabled, public_key: pushEnabled ? config.VAPID_PUBLIC_KEY : null }));
  app.post('/api/notifications/subscription', async (req, res) => {
    if (!pushEnabled) throw new HttpError(503, 'Message notifications are not configured.');
    await limit(`push-subscribe:${req.user.id}`, 20, 60);
    const subscription = pushSubscription.parse(req.body);
    if (!(await one('SELECT endpoint FROM push_subscriptions WHERE endpoint=$1', [subscription.endpoint])) &&
        Number((await one('SELECT count(*) AS count FROM push_subscriptions WHERE user_id=$1', [req.user.id])).count) >= 10)
      throw new HttpError(429, 'Message alerts are already enabled on ten devices.');
    await db.query('INSERT INTO push_subscriptions(endpoint,user_id,session_token_hash,p256dh,auth) VALUES($1,$2,$3,$4,$5) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,session_token_hash=EXCLUDED.session_token_hash,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth', [subscription.endpoint, req.user.id, req.user.token_hash, subscription.keys.p256dh, subscription.keys.auth]);
    res.json({ ok: true });
  });
  app.delete('/api/notifications/subscription', async (req, res) => {
    const endpoint = pushEndpoint.parse(req.body.endpoint);
    await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2 AND session_token_hash=$3', [endpoint, req.user.id, req.user.token_hash]);
    res.json({ ok: true });
  });
  app.patch('/api/profile', async (req, res) => {
    const input = profile.parse(req.body);
    const extraFields = z.object({
      who_can_add_to_groups: z.enum(['everyone','contacts','nobody']).optional(),
      require_group_approval: z.boolean().optional(),
    }).parse(req.body);
    const user = await transaction(async (c) => {
      const current = await one('SELECT * FROM users WHERE id=$1 FOR UPDATE', [req.user.id], c);
      if (!input.likeness_consent && current.voice_id)
        await enqueue(c, 'delete_voice', { voice_id: current.voice_id });
      return one(
        `UPDATE users SET name=$2,language=$3,ai_consent=$4,likeness_consent=$5,voice_id=CASE WHEN $5 THEN voice_id ELSE NULL END,voice_verified=CASE WHEN $5 THEN voice_verified ELSE false END,online_status_visibility=COALESCE($6,online_status_visibility),last_seen_visibility=COALESCE($7,last_seen_visibility),who_can_add_to_groups=COALESCE($8,who_can_add_to_groups),require_group_approval=COALESCE($9,require_group_approval) WHERE id=$1 RETURNING *`,
        [req.user.id, input.name, input.language, input.ai_consent, input.likeness_consent, input.online_status_visibility, input.last_seen_visibility, extraFields.who_can_add_to_groups, extraFields.require_group_approval],
        c,
      );
    });
    res.json(publicUser(user));
  });
  app.get('/api/messages/:id', async (req, res) => {
    const mid = id.parse(req.params.id);
    const message = await one(`${messageSelect} WHERE m.id=$1`, [mid, req.user.language, req.user.id]);
    if (!message) throw new HttpError(404, 'Message not found.');
    await membership(req.user.id, message.conversation_id);
    await ensureReaderTranslations(req.user, [message]);
    res.json(message);
  });
  for (const kind of ['star','pin']) {
    for (const method of ['put','delete']) app[method](`/api/messages/:id/${kind}`, async (req,res) => {
      await limit(`saved-messages:${req.user.id}`,60,60);
      res.json(await saveMessage(req.user,id.parse(req.params.id),kind,method==='put'));
    });
  }
  app.patch('/api/messages/:id', async (req, res) => {
    await limit(`messages:${req.user.id}`, 40, 60);
    res.json(await changeMessage(req.user, id.parse(req.params.id), messageEdit.parse(req.body).text));
  });
  app.delete('/api/messages/:id', async (req, res) => {
    await limit(`messages:${req.user.id}`, 40, 60);
    res.json(await changeMessage(req.user, id.parse(req.params.id)));
  });
  app.post('/api/messages/:id/reactions', async (req, res) => {
    await limit(`reactions:${req.user.id}`, 60, 60);
    const mid = id.parse(req.params.id);
    const emoji = z.enum(['❤️','😂','👍','😮','😢','🙏']).parse(req.body.emoji);
    const result = await toggleReaction(req.user, mid, emoji);
    res.json(result);
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
  app.post('/api/conversations/:id/photo', upload.single('file'), async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    const type = await inspectFile(req.file, 'avatar');
    const fileId = randomUUID(),
      key = `group-photos/${cid}/${fileId}.${type.ext}`;
    await putObject(key, req.file.buffer, type.mime);
    try {
      await transaction(async (c) => {
        const group = await one('SELECT id FROM conversations WHERE id=$1 AND direct_key IS NULL', [cid], c);
        if (!group) throw new HttpError(400, 'Only groups can have profile photos.');
        const member = await one('SELECT is_admin FROM members WHERE conversation_id=$1 AND user_id=$2', [cid, req.user.id], c);
        if (!member || !member.is_admin) throw new HttpError(403, 'Only group admins can update the group photo.');
        await c.query(
          "INSERT INTO attachments(id,owner_id,conversation_id,purpose,object_key,name,mime,size) VALUES($1,$2,$3,'group_avatar',$4,$5,$6,$7)",
          [fileId, req.user.id, cid, key, type.name, type.mime, req.file.size],
        );
        await c.query('UPDATE conversations SET avatar_id=$2 WHERE id=$1', [cid, fileId]);
        await c.query('INSERT INTO group_activities(id,conversation_id,actor_id,action,metadata) VALUES($1,$2,$3,$4,$5)', [randomUUID(), cid, req.user.id, 'group_updated', JSON.stringify({ field: 'avatar' })]);
        await c.query('INSERT INTO system_messages(id,conversation_id,message_type,actor_id) VALUES($1,$2,$3,$4)', [randomUUID(), cid, 'group_avatar_changed', req.user.id]);
        await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
      });
      res.json({ ok: true, avatar_id: fileId });
    } catch (e) {
      await removeObject(key);
      throw e;
    }
  });
  app.delete('/api/conversations/:id/photo', async (req, res) => {
    const cid = id.parse(req.params.id);
    await transaction(async (c) => {
      await membership(req.user.id, cid, c);
      const group = await one('SELECT id FROM conversations WHERE id=$1 AND direct_key IS NULL', [cid], c);
      if (!group) throw new HttpError(400, 'Only groups have profile photos.');
      const member = await one('SELECT is_admin FROM members WHERE conversation_id=$1 AND user_id=$2', [cid, req.user.id], c);
      if (!member || !member.is_admin) throw new HttpError(403, 'Only group admins can update the group photo.');
      await c.query('UPDATE conversations SET avatar_id=NULL WHERE id=$1', [cid]);
      await conversationEvent(c, cid, 'conversation:changed', { conversation_id: cid });
    });
    res.json({ ok: true });
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
  app.put('/api/users/:id/block', async (req, res) => {
    const target = id.parse(req.params.id);
    if (target===req.user.id) throw new HttpError(400, 'You cannot block yourself.');
    if (!(await one('SELECT id FROM users WHERE id=$1',[target]))) throw new HttpError(404,'User not found.');
    await transaction(async c => {
      await c.query('INSERT INTO user_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,target]);
      const calls = (await c.query("UPDATE calls SET state='ended',ended_at=now() WHERE state IN ('ringing','active') AND ((caller_id=$1 AND callee_id=$2) OR (caller_id=$2 AND callee_id=$1)) RETURNING *",[req.user.id,target])).rows;
      for (const call of calls) { await c.query('DELETE FROM call_locks WHERE call_id=$1',[call.id]); await conversationEvent(c,call.conversation_id,'call:changed',call); }
      await enqueue(c,'event',{users:[req.user.id,target],event:'conversation:changed',data:{}});
    });
    res.json({blocked:true});
  });
  app.delete('/api/users/:id/block', async (req, res) => {
    await db.query('DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[req.user.id,id.parse(req.params.id)]);
    await enqueue(db,'event',{users:[req.user.id,req.params.id],event:'conversation:changed',data:{}});
    res.json({blocked:false});
  });
  app.post('/api/users/:id/report', async (req, res) => {
    await limit(`reports:${req.user.id}`,10,3600);
    const target = id.parse(req.params.id);
    const input = z.object({reason:z.enum(['spam','harassment','impersonation','other']),details:z.string().trim().max(2000).default('')}).parse(req.body);
    if (target===req.user.id) throw new HttpError(400,'You cannot report yourself.');
    if (!(await one('SELECT id FROM users WHERE id=$1',[target]))) throw new HttpError(404,'User not found.');
    const reportId=randomUUID();
    await db.query('INSERT INTO user_reports(id,reporter_id,reported_id,reason,details) VALUES($1,$2,$3,$4,$5)',[reportId,req.user.id,target,input.reason,input.details]);
    res.status(201).json({id:reportId,status:'submitted'});
  });
  app.get('/api/users', async (req, res) => {
    const query = z.object({ q: z.string().max(80).default(''), offset: z.coerce.number().int().min(0).max(1000000).default(0) }).parse(req.query);
    const result = await db.query(
      `SELECT EXISTS(SELECT 1 FROM user_blocks WHERE blocker_id=$1 AND blocked_id=u.id) AS blocked_by_me, EXISTS(SELECT 1 FROM user_blocks WHERE (blocker_id=$1 AND blocked_id=u.id) OR (blocker_id=u.id AND blocked_id=$1)) AS contact_blocked,u.id,u.name,u.handle,u.avatar_id,u.last_seen,u.online_status_visibility,u.last_seen_visibility,
      EXISTS(SELECT 1 FROM conversations c JOIN members m1 ON m1.conversation_id=c.id AND m1.user_id=$1 JOIN members m2 ON m2.conversation_id=c.id AND m2.user_id=u.id) AS is_contact
      FROM users u WHERE u.id<>$1 AND ($2='' OR strpos(lower(u.name),lower($2))>0 OR strpos(u.handle,lower(ltrim($2,'@')))>0) ORDER BY lower(u.name),u.handle,u.id LIMIT 51 OFFSET $3`,
      [req.user.id, query.q.trim(), query.offset],
    );
    // Apply privacy filtering for each user
    const users = result.rows.slice(0, 50).map(u => {
      const canSeeOnline = u.online_status_visibility === 'everyone' || (u.online_status_visibility === 'contacts' && u.is_contact);
      const canSeeLastSeen = u.last_seen_visibility === 'everyone' || (u.last_seen_visibility === 'contacts' && u.is_contact);
      const isOnline = u.last_seen && (new Date() - new Date(u.last_seen)) < 60000; // Online if activity within last 60 seconds
      return {
        id: u.id,
        name: u.name,
        handle: u.handle,
        avatar_id: u.avatar_id,
        blocked_by_me: u.blocked_by_me,
        contact_blocked: u.contact_blocked,
        online: canSeeOnline && !u.contact_blocked ? isOnline : null,
        last_seen: canSeeLastSeen && !u.contact_blocked ? u.last_seen : null,
      };
    });
    res.json({ users, has_more: result.rows.length > 50 });
  });
  app.post('/api/conversations', async (req, res) => {
    const { handle } = z.object({ handle: z.string().regex(/^[a-z0-9_]{3,30}$/) }).parse(req.body);
    const peer = await one('SELECT id FROM users WHERE handle=$1', [handle]);
    if (!peer || peer.id === req.user.id)
      throw new HttpError(404, 'Friend not found. Ask them for their exact Kipenzi handle.');
    const result = await transaction(async (c) => {
      if (await one('SELECT 1 FROM user_blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',[req.user.id,peer.id],c)) throw new HttpError(403,'Contact is unavailable while a user is blocked.');
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
  app.post('/api/conversations/groups', async (req, res) => {
    const input = z.object({ name: z.string().trim().min(1).max(80), handles: z.array(z.string().regex(/^[a-z0-9_]{3,30}$/)).min(2).max(49), description: z.string().trim().max(500).optional() }).parse(req.body);
    const handles = [...new Set(input.handles)].filter(handle => handle !== req.user.handle);
    if (handles.length < 2) throw new HttpError(400, 'Choose at least two other members.');
    const conversation = await transaction(async c => {
      const peers = (await c.query('SELECT id FROM users WHERE handle=ANY($1::text[])', [handles])).rows;
      if (peers.length !== handles.length) throw new HttpError(404, 'One or more members were not found.');
      const ids = [req.user.id, ...peers.map(peer => peer.id)];
      if (await one('SELECT 1 FROM user_blocks WHERE blocker_id=ANY($1::uuid[]) AND blocked_id=ANY($1::uuid[]) LIMIT 1', [ids], c)) throw new HttpError(403, 'A blocked contact cannot be added to this group.');
      const result = await one('INSERT INTO conversations(id,name,description,created_by_id) VALUES($1,$2,$3,$4) RETURNING id', [randomUUID(), input.name, input.description || null, req.user.id], c);
      // Add creator as admin, others as regular members
      await c.query('INSERT INTO members(conversation_id,user_id,is_admin,added_by_id) VALUES($1,$2,true,NULL)', [result.id, req.user.id]);
      for (const peerId of peers.map(p => p.id)) {
        await c.query('INSERT INTO members(conversation_id,user_id,is_admin,added_by_id) VALUES($1,$2,false,$3)', [result.id, peerId, req.user.id]);
      }
      // Log group creation
      await c.query('INSERT INTO group_activities(id,conversation_id,actor_id,action,metadata) VALUES($1,$2,$3,$4,$5)', [randomUUID(), result.id, req.user.id, 'group_created', JSON.stringify({ member_count: ids.length })]);
      await c.query('INSERT INTO system_messages(id,conversation_id,message_type,actor_id,metadata) VALUES($1,$2,$3,$4,$5)', [randomUUID(), result.id, 'group_created', req.user.id, JSON.stringify({ name: input.name })]);
      await conversationEvent(c, result.id, 'conversation:changed', { conversation_id: result.id });
      return result;
    });
    res.status(201).json(conversation);
  });
  app.get('/api/conversations', async (req, res) => {
    // Update last_seen timestamp on activity
    await db.query('UPDATE users SET last_seen=now() WHERE id=$1', [req.user.id]);
    const result = await db.query(
      `SELECT EXISTS(SELECT 1 FROM user_blocks WHERE blocker_id=$1 AND blocked_id=u.id) AS blocked_by_me, EXISTS(SELECT 1 FROM user_blocks b JOIN members bm ON bm.user_id=CASE WHEN b.blocker_id=$1 THEN b.blocked_id ELSE b.blocker_id END WHERE bm.conversation_id=c.id AND (b.blocker_id=$1 OR b.blocked_id=$1)) AS contact_blocked,c.disappearing_seconds,c.id,c.name,c.description,c.avatar_id,c.direct_key IS NULL AS is_group,me.read_seq,me.is_admin,me.can_send_messages,me.can_add_members,me.muted,
      (SELECT jsonb_agg(jsonb_build_object('id',gu.id,'name',gu.name,'handle',gu.handle,'language',gu.language,'is_admin',gm.is_admin) ORDER BY gm.is_admin DESC, gu.name) FROM members gm JOIN users gu ON gu.id=gm.user_id WHERE gm.conversation_id=c.id) AS members,
      jsonb_build_object('id',u.id,'name',u.name,'handle',u.handle,'language',u.language,'avatar_id',u.avatar_id,'last_seen',u.last_seen,'online_status_visibility',u.online_status_visibility,'last_seen_visibility',u.last_seen_visibility) AS peer,
      (SELECT count(*)::int FROM messages m WHERE (m.expires_at IS NULL OR m.expires_at>now()) AND m.conversation_id=c.id AND m.seq>me.read_seq AND m.sender_id<>$1) AS unread,
      (SELECT jsonb_build_object('text',m.text,'sticker',m.sticker,'attachment',m.attachment_id IS NOT NULL,'created_at',m.created_at) FROM messages m WHERE (m.expires_at IS NULL OR m.expires_at>now()) AND m.conversation_id=c.id ORDER BY m.seq DESC LIMIT 1) AS last_message,
      (SELECT coalesce(max(m.created_at),c.created_at) FROM messages m WHERE (m.expires_at IS NULL OR m.expires_at>now()) AND m.conversation_id=c.id) AS updated_at,
      (SELECT min(read_seq) FROM members WHERE conversation_id=c.id AND user_id<>$1) AS peer_read_seq FROM conversations c JOIN members me ON me.conversation_id=c.id AND me.user_id=$1 JOIN LATERAL (SELECT user_id FROM members WHERE conversation_id=c.id AND user_id<>$1 ORDER BY user_id LIMIT 1) other ON true JOIN users u ON u.id=other.user_id WHERE c.deleted_at IS NULL ORDER BY updated_at DESC LIMIT 200`,
      [req.user.id],
    );
    // Apply privacy filtering for peer status
    const conversations = result.rows.map(conv => {
      const peer = conv.peer;
      const canSeeOnline = peer.online_status_visibility === 'everyone' || peer.online_status_visibility === 'contacts';
      const canSeeLastSeen = peer.last_seen_visibility === 'everyone' || peer.last_seen_visibility === 'contacts';
      const isOnline = peer.last_seen && (new Date() - new Date(peer.last_seen)) < 60000;
      return {
        ...conv,
        peer: conv.is_group ? { name: conv.name, handle: '', language: req.user.language } : {
          id: peer.id,
          name: peer.name,
          handle: peer.handle,
          language: peer.language,
          avatar_id: peer.avatar_id,
          online: canSeeOnline && !conv.contact_blocked ? isOnline : null,
          last_seen: canSeeLastSeen && !conv.contact_blocked ? peer.last_seen : null,
        }
      };
    });
    res.json(conversations);
  });
  
  // Group management endpoints
  app.get('/api/conversations/:id/details', getGroupDetails);
  app.patch('/api/conversations/:id/profile', updateGroupProfile);
  app.post('/api/conversations/:id/members', addGroupMember);
  app.delete('/api/conversations/:id/members/:userId', removeGroupMember);
  app.post('/api/conversations/:id/leave', leaveGroup);
  app.post('/api/conversations/:id/members/:userId/promote', promoteToAdmin);
  app.post('/api/conversations/:id/members/:userId/demote', demoteFromAdmin);
  app.patch('/api/conversations/:id/members/:userId/permissions', updateMemberPermissions);
  app.patch('/api/conversations/:id/mute', toggleGroupMute);
  app.delete('/api/conversations/:id', deleteGroup);
  app.post('/api/conversations/:id/invites', createInviteLink);
  app.get('/api/conversations/:id/invites', getInviteLinks);
  app.delete('/api/conversations/:id/invites/:inviteId', revokeInviteLink);
  app.post('/api/groups/join', joinViaInviteLink);
  app.get('/api/conversations/:id/join-requests', getJoinRequests);
  app.post('/api/conversations/:id/join-requests/:requestId', respondToJoinRequest);
  app.get('/api/conversations/:id/activity', getGroupActivity);
  // Daily "Us" Prompts endpoints (Question of the Day with double-blind mutual reveal)
  app.get('/api/conversations/:id/daily-prompt', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().parse(req.query.date);
    const offsetInput = z.coerce.number().int().default(0).parse(req.query.offset || 0);
    const targetDate = dateInput || getTodayDateKey();
    const prompt = getPromptForDate(targetDate, offsetInput);

    const peer = await one(
      'SELECT u.id as user_id, u.name, u.handle FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );

    const answers = (
      await db.query(
        'SELECT a.*, u.name as user_name FROM daily_prompt_answers a JOIN users u ON u.id=a.user_id WHERE a.conversation_id=$1 AND a.prompt_date=$2',
        [cid, targetDate],
      )
    ).rows;

    const myAnswerRow = answers.find((a) => a.user_id === req.user.id);
    const partnerAnswerRow = peer ? answers.find((a) => a.user_id === peer.user_id) : null;
    const revealed = Boolean(myAnswerRow && partnerAnswerRow);

    res.json({
      date: targetDate,
      prompt_id: prompt.id,
      question_ml: prompt.question_ml,
      question_en: prompt.question_en,
      category: prompt.category,
      icon: prompt.icon,
      sparks: prompt.sparks,
      revealed,
      my_answer: myAnswerRow ? myAnswerRow.answer : null,
      my_answered_at: myAnswerRow ? myAnswerRow.created_at : null,
      partner_answered: Boolean(partnerAnswerRow),
      partner_name: peer ? peer.name : 'Partner',
      partner_answer: revealed ? partnerAnswerRow.answer : null,
      partner_answered_at: partnerAnswerRow ? partnerAnswerRow.created_at : null,
      my_reaction: myAnswerRow?.reaction || null,
      partner_reaction: revealed ? partnerAnswerRow?.reaction || null : null,
    });
  });

  app.post('/api/conversations/:id/daily-prompt/answer', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await assertCanContact(req.user.id, cid);
    const input = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => getTodayDateKey()),
        prompt_id: z.string().default(''),
        answer: z
          .string()
          .trim()
          .min(1, 'Please write your answer.')
          .max(2000, 'Answer must be under 2000 characters.'),
      })
      .parse(req.body);

    const prompt = getPromptForDate(input.date);
    const promptId = input.prompt_id || prompt.id;

    const peer = await one(
      'SELECT u.id as user_id, u.name FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );

    const answerId = randomUUID();
    const myAnswer = await one(
      `INSERT INTO daily_prompt_answers(id, conversation_id, prompt_date, prompt_id, user_id, answer, created_at, updated_at)
       VALUES($1, $2, $3, $4, $5, $6, now(), now())
       ON CONFLICT(conversation_id, prompt_date, user_id)
       DO UPDATE SET answer=EXCLUDED.answer, prompt_id=EXCLUDED.prompt_id, updated_at=now()
       RETURNING *`,
      [answerId, cid, input.date, promptId, req.user.id, input.answer],
    );

    const peerAnswer = peer
      ? await one(
          'SELECT * FROM daily_prompt_answers WHERE conversation_id=$1 AND prompt_date=$2 AND user_id=$3',
          [cid, input.date, peer.user_id],
        )
      : null;

    const revealed = Boolean(myAnswer && peerAnswer);

    if (revealed) {
      if (io && peer) {
        io.to(`user:${peer.user_id}`).emit('daily_prompt:revealed', {
          conversation_id: cid,
          date: input.date,
          prompt_id: promptId,
          partner_name: req.user.name,
        });
        io.to(`user:${req.user.id}`).emit('daily_prompt:revealed', {
          conversation_id: cid,
          date: input.date,
          prompt_id: promptId,
          partner_name: peer.name,
        });
      }
    } else if (io && peer) {
      io.to(`user:${peer.user_id}`).emit('daily_prompt:answered', {
        conversation_id: cid,
        date: input.date,
        sender_id: req.user.id,
        sender_name: req.user.name,
      });
    }

    res.json({
      ok: true,
      revealed,
      date: input.date,
      my_answer: myAnswer.answer,
      my_answered_at: myAnswer.created_at,
      partner_answered: Boolean(peerAnswer),
      partner_name: peer ? peer.name : 'Partner',
      partner_answer: revealed ? peerAnswer.answer : null,
      partner_answered_at: peerAnswer ? peerAnswer.created_at : null,
    });
  });

  app.post('/api/conversations/:id/daily-prompt/reaction', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    const input = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reaction: z.string().min(1).max(10),
      })
      .parse(req.body);

    await db.query(
      'UPDATE daily_prompt_answers SET reaction=$1 WHERE conversation_id=$2 AND prompt_date=$3 AND user_id=$4',
      [input.reaction, cid, input.date, req.user.id],
    );

    const peer = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('daily_prompt:reaction', {
        conversation_id: cid,
        date: input.date,
        user_id: req.user.id,
        reaction: input.reaction,
      });
    }
    res.json({ ok: true });
  });

  app.post('/api/conversations/:id/daily-prompt/nudge', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await assertCanContact(req.user.id, cid);
    const peer = await one(
      'SELECT u.id as user_id, u.name FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().parse(req.body?.date) || getTodayDateKey();
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('daily_prompt:nudge', {
        conversation_id: cid,
        sender_id: req.user.id,
        sender_name: req.user.name,
        date,
      });
    }
    res.json({ ok: true });
  });

  app.get('/api/conversations/:id/daily-prompt/history', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    const peer = await one(
      'SELECT u.id as user_id, u.name FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );

    const rows = (
      await db.query(
        `SELECT to_char(prompt_date, 'YYYY-MM-DD') as prompt_date_str, *
         FROM daily_prompt_answers
         WHERE conversation_id=$1
         ORDER BY prompt_date DESC, created_at ASC`,
        [cid],
      )
    ).rows;

    const byDate = new Map();
    for (const r of rows) {
      const d = r.prompt_date_str;
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d).push(r);
    }

    const history = [];
    for (const [date, answers] of byDate.entries()) {
      const prompt = getPromptForDate(date);
      const myAnswer = answers.find((a) => a.user_id === req.user.id);
      const partnerAnswer = peer ? answers.find((a) => a.user_id === peer.user_id) : null;
      const revealed = Boolean(myAnswer && partnerAnswer);

      history.push({
        date,
        prompt_id: prompt.id,
        question_ml: prompt.question_ml,
        question_en: prompt.question_en,
        category: prompt.category,
        icon: prompt.icon,
        revealed,
        my_answer: myAnswer ? myAnswer.answer : null,
        my_answered_at: myAnswer ? myAnswer.created_at : null,
        partner_answered: Boolean(partnerAnswer),
        partner_name: peer ? peer.name : 'Partner',
        partner_answer: revealed ? partnerAnswer.answer : null,
        partner_answered_at: partnerAnswer ? partnerAnswer.created_at : null,
        my_reaction: myAnswer?.reaction || null,
        partner_reaction: revealed ? partnerAnswer?.reaction || null : null,
      });
    }
    res.json({ history });
  });
  app.patch('/api/conversations/:id/disappearing', async (req,res) => {
    const cid=id.parse(req.params.id);
    const {seconds}=z.object({seconds:z.union([z.literal(0),z.literal(3600),z.literal(86400),z.literal(604800),z.literal(2592000)])}).parse(req.body);
    await transaction(async c => {
      await membership(req.user.id,cid,c);
      await assertCanContact(req.user.id,cid,c);
      const conversation=await one('SELECT direct_key FROM conversations WHERE id=$1 FOR UPDATE',[cid],c);
      if(conversation.direct_key===null && !(await one('SELECT 1 FROM members WHERE conversation_id=$1 AND user_id=$2 AND is_admin',[cid,req.user.id],c))) throw new HttpError(403,'Only group admins can change disappearing messages.');
      await c.query('UPDATE conversations SET disappearing_seconds=$2 WHERE id=$1',[cid,seconds]);
      await conversationEvent(c,cid,'conversation:changed',{conversation_id:cid});
    });
    res.json({seconds});
  });
  app.get('/api/conversations/:id/export', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await limit('exports:' + req.user.id, 120, 60);
    const cursor = z.string().regex(/^\d{1,19}$/).refine(value => BigInt(value) <= 9223372036854775807n);
    const input = z.object({ after: cursor.default('0'), through: cursor.optional() }).parse(req.query);
    const conversation = await one('SELECT id,name FROM conversations WHERE id=$1', [cid]);
    const through = input.through ?? (await one('SELECT coalesce(max(seq),0)::text AS seq FROM messages WHERE conversation_id=$1', [cid])).seq;
    const result = await db.query(
      `SELECT m.id,m.seq::text,m.text,m.sticker,m.created_at,m.edited_at,m.expires_at,
       jsonb_build_object('name',u.name,'handle',u.handle) AS sender,
       CASE WHEN a.id IS NOT NULL AND a.expired_at IS NULL THEN jsonb_build_object('id',a.id,'name',a.name,'mime',a.mime,'size',a.size) ELSE NULL END AS attachment,
       CASE WHEN t.status='ready' THEN jsonb_build_object('language',t.language,'text',t.text) ELSE NULL END AS translation
       FROM messages m JOIN users u ON u.id=m.sender_id LEFT JOIN attachments a ON a.id=m.attachment_id
       LEFT JOIN translations t ON t.message_id=m.id AND t.language=$4
       WHERE m.conversation_id=$1 AND m.seq>$2::bigint AND m.seq<=$3::bigint
       AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR m.expires_at>now())
       ORDER BY m.seq ASC LIMIT 201`, [cid,input.after,through,req.user.language],
    );
    res.set('Cache-Control','no-store');
    res.json({ conversation, through, messages: result.rows.slice(0,200), has_more: result.rows.length>200 });
  });
  app.get('/api/conversations/:id/library', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    const input = z.object({ q: z.string().trim().max(200).default(''), kind: z.enum(['messages','photos','documents','media','starred','pinned']).default('messages'), before: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional() }).parse(req.query);
    const result = await db.query(
      `${messageSelect} WHERE m.conversation_id=$1 AND m.deleted_at IS NULL
       AND ($4::bigint IS NULL OR m.seq<$4)
       AND ($5='' OR strpos(lower(m.text),lower($5))>0 OR strpos(lower(a.name),lower($5))>0 OR strpos(lower(t.text),lower($5))>0)
       AND ($6='messages' OR ($6='starred' AND EXISTS(SELECT 1 FROM message_stars ms WHERE ms.message_id=m.id AND ms.user_id=$3)) OR ($6='pinned' AND EXISTS(SELECT 1 FROM message_pins mp WHERE mp.message_id=m.id)) OR ($6='photos' AND a.mime LIKE 'image/%') OR ($6='media' AND (a.mime LIKE 'image/%' OR a.mime LIKE 'video/%' OR a.mime LIKE 'audio/%')) OR ($6='documents' AND a.id IS NOT NULL AND a.mime NOT LIKE 'image/%' AND a.mime NOT LIKE 'video/%' AND a.mime NOT LIKE 'audio/%'))
       ORDER BY m.seq DESC LIMIT 31`,
      [cid, req.user.language, req.user.id, input.before || null, input.q, input.kind],
    );
    await ensureReaderTranslations(req.user, result.rows.slice(0,30));
    res.json({ messages: result.rows.slice(0,30), has_more: result.rows.length>30 });
  });
  app.get('/api/conversations/:id/messages', async (req, res) => {
    // Update last_seen timestamp on activity
    await db.query('UPDATE users SET last_seen=now() WHERE id=$1', [req.user.id]);
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
        `${messageSelect} WHERE m.conversation_id=$1 AND m.seq>$4 ORDER BY m.seq ASC LIMIT 50`,
        [cid, req.user.language, req.user.id, after.data],
      );
      await ensureReaderTranslations(req.user, result.rows);
      res.json({ messages: result.rows, has_more: result.rows.length === 50 });
      return;
    }
    const result = await db.query(
      `${messageSelect} WHERE m.conversation_id=$1 AND ($4::bigint IS NULL OR m.seq<$4) ORDER BY m.seq DESC LIMIT 50`,
      [cid, req.user.language, req.user.id, before.success ? before.data : null],
    );
    await ensureReaderTranslations(req.user, result.rows);
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
    await assertCanContact(req.user.id, cid);
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
    if (!attachment || attachment.expired_at || await one('SELECT 1 FROM messages WHERE attachment_id=$1 AND expires_at<=now()',[attachment.id])) throw new HttpError(404, 'File not found.');
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
      'SELECT m.*,u.ai_consent,a.mime,a.name FROM messages m JOIN users u ON u.id=m.sender_id LEFT JOIN attachments a ON a.id=m.attachment_id WHERE m.id=$1',
      [mid],
    );
    if (!m || m.deleted_at || hasExpired(m)) throw new HttpError(404, 'Message not found.');
    await membership(req.user.id, m.conversation_id);
    if (!m.ai_consent || !req.user.ai_consent)
      throw new HttpError(
        403,
        'You and your friend both need to allow AI translation and voice reading.',
      );
    const isVoice =
      m.attachment_id &&
      (m.mime?.startsWith('audio/') ||
        (/^voice-note-/.test(m.name || '') && m.mime === 'video/webm'));
    if (!m.text && !isVoice)
      throw new HttpError(400, 'Only text or voice messages can be translated.');
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
    if (!m || m.deleted_at || hasExpired(m)) throw new HttpError(404, 'Message not found.');
    await membership(req.user.id, m.conversation_id);
    if (!m.text) throw new HttpError(400, 'Choose a text message.');
    if (!req.user.ai_consent || !m.ai_consent)
      throw new HttpError(
        403,
        'You and your friend both need to allow AI translation and voice reading.',
      );
    if (
      input.own_voice &&
      (!config.ELEVENLABS_API_KEY || !req.user.likeness_consent || !req.user.voice_id || !req.user.voice_verified)
    )
      throw new HttpError(400, 'Upload and verify your own voice first.');
    if (
      input.kind === 'avatar' &&
      (!req.user.avatar_id || !req.user.likeness_consent)
    )
      throw new HttpError(
        400,
        'Talking photo needs your profile photo and likeness consent in settings.',
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
    const job = await one('SELECT j.* FROM media_jobs j JOIN messages m ON m.id=j.message_id WHERE j.id=$1 AND j.user_id=$2 AND (m.expires_at IS NULL OR m.expires_at>now())', [
      id.parse(req.params.id),
      req.user.id,
    ]);
    if (!job) throw new HttpError(404, 'Media not found.');
    res.json({
      id: job.id,
      status: job.status,
      kind: job.kind,
      mime: job.mime,
      error: job.error,
      url: job.status === 'ready' ? `/api/media/${job.id}/content` : null,
    });
  });
  app.get('/api/media/:id/content', async (req, res) => {
    const job = await one(
      "SELECT j.* FROM media_jobs j JOIN messages m ON m.id=j.message_id WHERE j.id=$1 AND j.user_id=$2 AND j.status='ready' AND (m.expires_at IS NULL OR m.expires_at>now())",
      [id.parse(req.params.id), req.user.id],
    );
    if (!job) throw new HttpError(404, 'Media not found.');
    await streamObject(
      req,
      res,
      job.object_key,
      job.mime,
      job.mime?.startsWith('video') ? 'talking-photo.mp4' : (job.kind === 'avatar' ? 'talking-photo.mp3' : 'message.mp3'),
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
      await assertCanContact(req.user.id, cid, c);
      if (await one('SELECT id FROM conversations WHERE id=$1 AND direct_key IS NULL', [cid], c)) throw new HttpError(400, 'Calls are available in direct chats.');
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
