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
import { inspectFile, putObject, removeObject, getObject, readObject, storageReady } from './storage.js';
import { cloneVoice, voiceVerified, providerFetch } from './providers.js';
import { formatMonthKey, generateMonthlyPoeticChronicle } from '../shared/monthlyRecap.js';
import { generateLoveText } from '../shared/aiLovePoet.js';
import { pushEnabled } from './push.js';
import { readMoods, shareMood } from './moods.js';
import { reportCapture, captureHistory, captureAlert } from './capture-alerts.js';
import { createSchedule, changeSchedule } from './scheduled.js';
import { scheduleInput, scheduleEdit } from '../shared/scheduling.js';
import { pushEndpoint, pushSubscription } from '../shared/push.js';
import { validateCapsuleInput } from '../shared/timeCapsule.js';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  respondToEvent,
  getTodoLists,
  createTodoList,
  updateTodoList,
  deleteTodoList,
  getTodoItems,
  createTodoItem,
  updateTodoItem,
  toggleTodoItem,
  deleteTodoItem,
} from './calendar.js';
import {
  membership,
  assertCanContact,
  messageSelect,
  sendMessage,
  ensureReaderTranslations,
  changeMessage,
  saveMessage,
  forwardMessage,
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
  getContacts,
  addContact,
  removeContact,
  updateContact,
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  addContactToLabel,
  removeContactFromLabel,
  getContactNote,
  setContactNote,
  exportContacts,
  importContacts,
} from './contact-management.js';

import {
  registration,
  login,
  profile,
  messageInput,
  messageEdit,
  id,
  targetLanguage,
  stickers,
} from '../shared/contracts.js';
import { getPromptForDate, getTodayDateKey } from '../shared/dailyPrompts.js';
import {
  calculateDaysTogether,
  calculateMilestoneCountdown,
  buildDefaultMemories,
  formatDateKey,
} from '../shared/relationshipStory.js';
import { BUCKET_LIST_PRESETS } from '../shared/romanticSurprises.js';
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
  app.get('/api/messages/:id/history', async (req, res) => {
    const mid = id.parse(req.params.id);
    const result = await transaction(async (c) => {
      const message = await one('SELECT * FROM messages WHERE id=$1 FOR SHARE', [mid], c);
      if (!message || message.deleted_at || hasExpired(message)) throw new HttpError(404, 'Message history is unavailable.');
      await membership(req.user.id, message.conversation_id, c);
      const history = (await c.query('SELECT id::text,text,edited_at,replaced_at FROM message_edit_history WHERE message_id=$1 ORDER BY id', [mid])).rows;
      return { history, current: { text: message.text, edited_at: message.edited_at || message.created_at } };
    });
    res.json(result);
  });
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
  app.post('/api/messages/:id/forward', async (req, res) => {
    await limit(`forward:${req.user.id}`, 30, 60);
    const mid = id.parse(req.params.id);
    const input = z.object({
      conversation_id: z.string().uuid(),
      caption: z.string().trim().max(5000).optional(),
    }).parse(req.body);
    const result = await forwardMessage(req.user, mid, input.conversation_id, input.caption);
    res.status(201).json(result);
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
  
  // ========================================
  // Contact Management Endpoints
  // ========================================
  
  // Get user's contacts (favorites)
  app.get('/api/contacts', async (req, res) => {
    const query = z.object({
      favorite_only: z.coerce.boolean().default(false),
      label_id: z.string().uuid().optional(),
      search: z.string().max(80).default(''),
      offset: z.coerce.number().int().min(0).max(1000000).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }).parse(req.query);
    
    const result = await getContacts(req.user.id, query);
    res.json(result);
  });
  
  // Add a contact
  app.post('/api/contacts', async (req, res) => {
    await limit(`contacts:${req.user.id}`, 30, 60);
    const input = z.object({
      contact_id: z.string().uuid(),
      nickname: z.string().trim().max(80).optional(),
      is_favorite: z.boolean().default(true),
    }).parse(req.body);
    
    const contact = await addContact(req.user.id, input.contact_id, {
      nickname: input.nickname || null,
      is_favorite: input.is_favorite,
    });
    res.status(201).json(contact);
  });
  
  // Update a contact
  app.patch('/api/contacts/:contactId', async (req, res) => {
    await limit(`contacts:${req.user.id}`, 60, 60);
    const contactId = id.parse(req.params.contactId);
    const updates = z.object({
      nickname: z.string().trim().max(80).nullable().optional(),
      is_favorite: z.boolean().optional(),
    }).parse(req.body);
    
    const contact = await updateContact(req.user.id, contactId, updates);
    res.json(contact);
  });
  
  // Remove a contact
  app.delete('/api/contacts/:contactId', async (req, res) => {
    const contactId = id.parse(req.params.contactId);
    const result = await removeContact(req.user.id, contactId);
    res.json(result);
  });
  
  // Get contact labels/groups
  app.get('/api/contacts/labels', async (req, res) => {
    const labels = await getLabels(req.user.id);
    res.json(labels);
  });
  
  // Create a contact label
  app.post('/api/contacts/labels', async (req, res) => {
    await limit(`contact-labels:${req.user.id}`, 20, 60);
    const input = z.object({
      name: z.string().trim().min(1).max(40),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
      icon: z.string().max(10).nullable().optional(), // emoji or icon name
    }).parse(req.body);
    
    const label = await createLabel(req.user.id, input);
    res.status(201).json(label);
  });
  
  // Update a contact label
  app.patch('/api/contacts/labels/:labelId', async (req, res) => {
    await limit(`contact-labels:${req.user.id}`, 40, 60);
    const labelId = id.parse(req.params.labelId);
    const updates = z.object({
      name: z.string().trim().min(1).max(40).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
      icon: z.string().max(10).nullable().optional(),
      position: z.number().int().min(0).optional(),
    }).parse(req.body);
    
    const label = await updateLabel(req.user.id, labelId, updates);
    res.json(label);
  });
  
  // Delete a contact label
  app.delete('/api/contacts/labels/:labelId', async (req, res) => {
    const labelId = id.parse(req.params.labelId);
    const result = await deleteLabel(req.user.id, labelId);
    res.json(result);
  });
  
  // Add contact to label
  app.put('/api/contacts/labels/:labelId/members/:contactId', async (req, res) => {
    await limit(`contact-labels:${req.user.id}`, 60, 60);
    const labelId = id.parse(req.params.labelId);
    const contactId = id.parse(req.params.contactId);
    
    const result = await addContactToLabel(req.user.id, labelId, contactId);
    res.json(result);
  });
  
  // Remove contact from label
  app.delete('/api/contacts/labels/:labelId/members/:contactId', async (req, res) => {
    const labelId = id.parse(req.params.labelId);
    const contactId = id.parse(req.params.contactId);
    
    const result = await removeContactFromLabel(req.user.id, labelId, contactId);
    res.json(result);
  });
  
  // Get contact note
  app.get('/api/contacts/:contactId/note', async (req, res) => {
    const contactId = id.parse(req.params.contactId);
    const note = await getContactNote(req.user.id, contactId);
    res.json(note);
  });
  
  // Set/update contact note
  app.put('/api/contacts/:contactId/note', async (req, res) => {
    await limit(`contact-notes:${req.user.id}`, 60, 60);
    const contactId = id.parse(req.params.contactId);
    const input = z.object({
      note: z.string().max(5000),
    }).parse(req.body);
    
    const result = await setContactNote(req.user.id, contactId, input.note);
    res.json(result);
  });
  
  // Export contacts
  app.get('/api/contacts/export', async (req, res) => {
    await limit(`contact-export:${req.user.id}`, 5, 3600); // 5 exports per hour
    const format = z.enum(['json', 'csv', 'vcard']).default('json').parse(req.query.format);
    
    const result = await exportContacts(req.user.id, format);
    const filename = `kipenzi-contacts-${new Date().toISOString().split('T')[0]}.${format === 'vcard' ? 'vcf' : format}`;
    
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(result.data);
  });
  
  // Import contacts
  app.post('/api/contacts/import', async (req, res) => {
    await limit(`contact-import:${req.user.id}`, 3, 3600); // 3 imports per hour
    const input = z.object({
      contacts: z.array(z.object({
        handle: z.string().optional(),
        nickname: z.string().optional(),
        is_favorite: z.boolean().optional(),
        note: z.string().optional(),
      })).max(1000), // Max 1000 contacts per import
    }).parse(req.body);
    
    const result = await importContacts(req.user.id, input.contacts);
    res.json(result);
  });
  
  // ========================================
  // End Contact Management Endpoints
  // ========================================
  
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
      (SELECT jsonb_build_object('text',m.text,'sticker',m.sticker,'attachment',m.attachment_id IS NOT NULL,'view_once',m.view_once,'view_once_opened_at',m.view_once_opened_at,'created_at',m.created_at) FROM messages m WHERE (m.expires_at IS NULL OR m.expires_at>now()) AND m.conversation_id=c.id ORDER BY m.seq DESC LIMIT 1) AS last_message,
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
  // Message Drafts endpoints
  app.get('/api/conversations/:id/draft', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    const draft = await one(
      'SELECT text, reply_to_id, source_language, updated_at FROM message_drafts WHERE user_id=$1 AND conversation_id=$2',
      [req.user.id, cid]
    );
    res.json(draft || { text: '', reply_to_id: null, source_language: 'auto' });
  });

  app.put('/api/conversations/:id/draft', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await limit(`drafts:${req.user.id}`, 100, 60);
    const input = z.object({
      text: z.string().max(5000).default(''),
      reply_to_id: z.string().uuid().nullable().optional(),
      source_language: z.enum(['auto','en','ml','manglish','sw']).default('auto'),
    }).parse(req.body);
    
    if (input.text.trim() === '') {
      // Delete draft if empty
      await db.query(
        'DELETE FROM message_drafts WHERE user_id=$1 AND conversation_id=$2',
        [req.user.id, cid]
      );
      res.json({ ok: true, deleted: true });
    } else {
      // Upsert draft
      const draft = await one(
        `INSERT INTO message_drafts(user_id, conversation_id, text, reply_to_id, source_language, created_at, updated_at)
         VALUES($1, $2, $3, $4, $5, now(), now())
         ON CONFLICT(user_id, conversation_id)
         DO UPDATE SET text=EXCLUDED.text, reply_to_id=EXCLUDED.reply_to_id, source_language=EXCLUDED.source_language, updated_at=now()
         RETURNING *`,
        [req.user.id, cid, input.text, input.reply_to_id || null, input.source_language]
      );
      res.json(draft);
    }
  });

  app.delete('/api/conversations/:id/draft', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await db.query(
      'DELETE FROM message_drafts WHERE user_id=$1 AND conversation_id=$2',
      [req.user.id, cid]
    );
    res.json({ ok: true });
  });

  app.get('/api/drafts', async (req, res) => {
    // Get all drafts for the current user with conversation info
    const result = await db.query(
      `SELECT d.conversation_id, d.text, d.updated_at, c.name, c.direct_key IS NULL AS is_group
       FROM message_drafts d
       JOIN conversations c ON c.id = d.conversation_id
       WHERE d.user_id = $1
       ORDER BY d.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  });

  app.post('/api/conversations/:id/capture-alerts', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await limit(`capture:${req.user.id}:${cid}`, 15, 60);
    res.status(201).json(await reportCapture(req.user, cid, req.body));
  });
  app.get('/api/conversations/:id/capture-alerts', async (req, res) => {
    res.json({ alerts: await captureHistory(req.user.id, id.parse(req.params.id)) });
  });
  app.get('/api/capture-alerts/:id', async (req, res) => {
    res.json(await captureAlert(req.user.id, id.parse(req.params.id)));
  });

  app.get('/api/conversations/:id/moods', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ statuses: await readMoods(req.user.id, id.parse(req.params.id)) });
  });
  app.post('/api/conversations/:id/moods', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await limit(`mood:${req.user.id}:${cid}`, 30, 60);
    res.json(await shareMood(req.user, cid, req.body));
  });

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

  // Relationship Timeline & Milestone Counter ("Our Story") Endpoints
  app.get('/api/conversations/:id/relationship-story', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);

    const peer = await one(
      'SELECT u.id as user_id, u.name, u.handle FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );

    let profile = await one(
      "SELECT conversation_id, to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(anniversary_date, 'YYYY-MM-DD') as anniversary_date, to_char(first_date, 'YYYY-MM-DD') as first_date, story_title, cover_photo FROM relationship_profiles WHERE conversation_id=$1",
      [cid],
    );

    // If no profile exists yet, seed one using conversation or earliest message date
    if (!profile) {
      const earliestMsg = await one(
        'SELECT min(created_at) as earliest FROM messages WHERE conversation_id=$1',
        [cid],
      );
      const convRow = await one('SELECT created_at FROM conversations WHERE id=$1', [cid]);
      const baseDate = earliestMsg?.earliest || convRow?.created_at || new Date();
      const defaultStartDate = formatDateKey(baseDate);

      await db.query(
        'INSERT INTO relationship_profiles(conversation_id, start_date, story_title) VALUES($1, $2, $3) ON CONFLICT (conversation_id) DO NOTHING',
        [cid, defaultStartDate, 'Our Story'],
      );

      profile = {
        conversation_id: cid,
        start_date: defaultStartDate,
        anniversary_date: null,
        first_date: null,
        story_title: 'Our Story',
        cover_photo: null,
      };

      // Seed starter memories if empty
      const existingMemCount = await one(
        'SELECT count(*)::int as count FROM relationship_memories WHERE conversation_id=$1',
        [cid],
      );
      if (!existingMemCount || existingMemCount.count === 0) {
        const defaultMems = buildDefaultMemories(defaultStartDate, peer ? peer.name : 'Sweetheart');
        for (const mem of defaultMems) {
          await db.query(
            'INSERT INTO relationship_memories(id, conversation_id, user_id, title, memory_date, category, description, emoji, reactions) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [
              randomUUID(),
              cid,
              req.user.id,
              mem.title,
              mem.memory_date,
              mem.category,
              mem.description,
              mem.emoji,
              JSON.stringify(mem.reactions || []),
            ],
          );
        }
      }
    }

    const memoriesRows = (
      await db.query(
        `SELECT m.id, m.conversation_id, m.user_id, m.title, to_char(m.memory_date, 'YYYY-MM-DD') as memory_date, m.category, m.description, m.photo_url, m.emoji, m.reactions, m.created_at, u.name as author_name
         FROM relationship_memories m
         JOIN users u ON u.id=m.user_id
         WHERE m.conversation_id=$1
         ORDER BY m.memory_date ASC, m.created_at ASC`,
        [cid],
      )
    ).rows;

    const milestonesRows = (
      await db.query(
        `SELECT ms.id, ms.conversation_id, ms.user_id, ms.title, to_char(ms.target_date, 'YYYY-MM-DD') as target_date, ms.category, ms.is_annual, ms.emoji, ms.note, ms.created_at, u.name as author_name
         FROM relationship_milestones ms
         JOIN users u ON u.id=ms.user_id
         WHERE ms.conversation_id=$1
         ORDER BY ms.target_date ASC`,
        [cid],
      )
    ).rows;

    // Build milestone list, including dynamic anniversary & first date from profile if not already in custom milestones
    const allMilestones = [...milestonesRows];
    if (profile.anniversary_date && !allMilestones.some((m) => m.category === 'anniversary')) {
      allMilestones.unshift({
        id: 'profile_anniversary',
        conversation_id: cid,
        user_id: req.user.id,
        title: 'Wedding / Love Anniversary (വിവാഹവാർഷികം)',
        target_date: profile.anniversary_date,
        category: 'anniversary',
        is_annual: true,
        emoji: '🥂',
        note: 'Our official annual milestone of eternal togetherness.',
      });
    }
    if (profile.first_date && !allMilestones.some((m) => m.category === 'first_date')) {
      allMilestones.push({
        id: 'profile_first_date',
        conversation_id: cid,
        user_id: req.user.id,
        title: 'First Date (ആദ്യ കൂടിക്കാഴ്ച)',
        target_date: profile.first_date,
        category: 'first_date',
        is_annual: true,
        emoji: '☕',
        note: 'The day our hearts met across the table.',
      });
    }

    // Attach countdown calculations to each milestone
    const milestonesWithCountdowns = allMilestones
      .map((ms) => {
        const countdown = calculateMilestoneCountdown(ms.target_date, ms.is_annual);
        return {
          ...ms,
          countdown,
        };
      })
      .sort((a, b) => {
        const aSec = a.countdown?.totalSecondsRemaining ?? 999999999;
        const bSec = b.countdown?.totalSecondsRemaining ?? 999999999;
        return aSec - bSec;
      });

    const daysTogether = calculateDaysTogether(profile.start_date);

    res.json({
      profile,
      daysTogether,
      memories: memoriesRows,
      milestones: milestonesWithCountdowns,
      partner: peer ? { id: peer.user_id, name: peer.name, handle: peer.handle } : null,
    });
  });

  app.put('/api/conversations/:id/relationship-story/profile', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await assertCanContact(req.user.id, cid);

    const schema = z.object({
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      anniversary_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      first_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      story_title: z.string().max(100).optional(),
    });
    const parsed = schema.parse(req.body);

    await db.query(
      `INSERT INTO relationship_profiles(conversation_id, start_date, anniversary_date, first_date, story_title, updated_at)
       VALUES($1, $2, $3, $4, $5, now())
       ON CONFLICT (conversation_id) DO UPDATE SET
         start_date = EXCLUDED.start_date,
         anniversary_date = EXCLUDED.anniversary_date,
         first_date = EXCLUDED.first_date,
         story_title = COALESCE(EXCLUDED.story_title, relationship_profiles.story_title),
         updated_at = now()`,
      [
        cid,
        parsed.start_date,
        parsed.anniversary_date || null,
        parsed.first_date || null,
        parsed.story_title || 'Our Story',
      ],
    );

    const peer = await one(
      'SELECT u.id as user_id FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('story:update', {
        conversation_id: cid,
        updated_by: req.user.id,
      });
    }

    res.json({ ok: true, daysTogether: calculateDaysTogether(parsed.start_date) });
  });

  app.post('/api/conversations/:id/relationship-story/memories', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await assertCanContact(req.user.id, cid);

    const schema = z.object({
      title: z.string().min(1).max(200),
      memory_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      category: z.string().default('sweet_moment'),
      description: z.string().max(3000).optional().default(''),
      photo_url: z.string().nullable().optional(),
      emoji: z.string().default('✨'),
    });
    const parsed = schema.parse(req.body);
    const newId = randomUUID();

    const inserted = await one(
      `INSERT INTO relationship_memories(id, conversation_id, user_id, title, memory_date, category, description, photo_url, emoji, reactions)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb)
       RETURNING id, conversation_id, user_id, title, to_char(memory_date, 'YYYY-MM-DD') as memory_date, category, description, photo_url, emoji, reactions, created_at`,
      [
        newId,
        cid,
        req.user.id,
        parsed.title,
        parsed.memory_date,
        parsed.category,
        parsed.description,
        parsed.photo_url || null,
        parsed.emoji,
      ],
    );

    const peer = await one(
      'SELECT u.id as user_id FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('story:update', {
        conversation_id: cid,
        type: 'memory_added',
        memory: inserted,
      });
    }

    res.json({ ok: true, memory: { ...inserted, author_name: req.user.name } });
  });

  app.delete('/api/conversations/:id/relationship-story/memories/:memoryId', async (req, res) => {
    const cid = id.parse(req.params.id);
    const memId = id.parse(req.params.memoryId);
    await membership(req.user.id, cid);

    await db.query('DELETE FROM relationship_memories WHERE id=$1 AND conversation_id=$2', [
      memId,
      cid,
    ]);

    const peer = await one(
      'SELECT u.id as user_id FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('story:update', {
        conversation_id: cid,
        type: 'memory_deleted',
        memory_id: memId,
      });
    }

    res.json({ ok: true });
  });

  app.post('/api/conversations/:id/relationship-story/memories/:memoryId/react', async (req, res) => {
    const cid = id.parse(req.params.id);
    const memId = id.parse(req.params.memoryId);
    await membership(req.user.id, cid);
    const emojiInput = z.string().min(1).max(10).parse(req.body?.emoji || '❤️');

    const memory = await one(
      'SELECT id, reactions FROM relationship_memories WHERE id=$1 AND conversation_id=$2',
      [memId, cid],
    );
    if (!memory) throw new HttpError(404, 'Memory not found');

    let reactions = Array.isArray(memory.reactions) ? memory.reactions : [];
    const existingIndex = reactions.indexOf(emojiInput);
    if (existingIndex > -1) {
      reactions = reactions.filter((r) => r !== emojiInput);
    } else {
      reactions = [...reactions, emojiInput];
    }

    await db.query('UPDATE relationship_memories SET reactions=$1 WHERE id=$2', [
      JSON.stringify(reactions),
      memId,
    ]);

    const peer = await one(
      'SELECT u.id as user_id FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('story:update', {
        conversation_id: cid,
        type: 'memory_reacted',
        memory_id: memId,
        reactions,
      });
    }

    res.json({ ok: true, reactions });
  });

  app.post('/api/conversations/:id/relationship-story/milestones', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await assertCanContact(req.user.id, cid);

    const schema = z.object({
      title: z.string().min(1).max(200),
      target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      category: z.string().default('milestone'),
      is_annual: z.boolean().default(false),
      emoji: z.string().default('💖'),
      note: z.string().max(1000).optional().default(''),
    });
    const parsed = schema.parse(req.body);
    const newId = randomUUID();

    const inserted = await one(
      `INSERT INTO relationship_milestones(id, conversation_id, user_id, title, target_date, category, is_annual, emoji, note)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, conversation_id, user_id, title, to_char(target_date, 'YYYY-MM-DD') as target_date, category, is_annual, emoji, note, created_at`,
      [
        newId,
        cid,
        req.user.id,
        parsed.title,
        parsed.target_date,
        parsed.category,
        parsed.is_annual,
        parsed.emoji,
        parsed.note,
      ],
    );

    const peer = await one(
      'SELECT u.id as user_id FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('story:update', {
        conversation_id: cid,
        type: 'milestone_added',
        milestone: inserted,
      });
    }

    res.json({
      ok: true,
      milestone: {
        ...inserted,
        author_name: req.user.name,
        countdown: calculateMilestoneCountdown(inserted.target_date, inserted.is_annual),
      },
    });
  });

  app.delete('/api/conversations/:id/relationship-story/milestones/:milestoneId', async (req, res) => {
    const cid = id.parse(req.params.id);
    const msId = id.parse(req.params.milestoneId);
    await membership(req.user.id, cid);

    await db.query('DELETE FROM relationship_milestones WHERE id=$1 AND conversation_id=$2', [
      msId,
      cid,
    ]);

    const peer = await one(
      'SELECT u.id as user_id FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('story:update', {
        conversation_id: cid,
        type: 'milestone_deleted',
        milestone_id: msId,
      });
    }

    res.json({ ok: true });
  });

  // "Our Month in Review" AI Recap Story Endpoints
  app.get('/api/conversations/:id/monthly-recap', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);

    const monthKey = req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)
      ? req.query.month
      : formatMonthKey();

    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const peer = await one(
      'SELECT u.id as user_id, u.name, u.handle FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );

    const msgCountRow = await one(
      'SELECT count(*)::int as count FROM messages WHERE conversation_id=$1 AND created_at >= $2 AND created_at < $3',
      [cid, startDate, endDate],
    );
    const messagesCount = msgCountRow?.count || 0;

    const photosRows = (
      await db.query(
        `SELECT a.id, a.message_id, a.name, a.mime, a.size, m.created_at
         FROM attachments a
         JOIN messages m ON m.id = a.message_id
         WHERE m.conversation_id = $1 AND (a.mime LIKE 'image/%' OR a.mime LIKE 'video/%')
           AND m.created_at >= $2 AND m.created_at < $3
         ORDER BY m.created_at DESC LIMIT 12`,
        [cid, startDate, endDate],
      )
    ).rows;

    const voiceRows = (
      await db.query(
        `SELECT a.id, a.message_id, a.name, a.mime, a.size, m.created_at
         FROM attachments a
         JOIN messages m ON m.id = a.message_id
         WHERE m.conversation_id = $1 AND (a.mime LIKE 'audio/%' OR a.name LIKE 'voice-note-%')
           AND m.created_at >= $2 AND m.created_at < $3
         ORDER BY m.created_at DESC LIMIT 8`,
        [cid, startDate, endDate],
      )
    ).rows;

    const duetRow = await one(
      `SELECT count(*)::int as count FROM attachments a
       JOIN messages m ON m.id = a.message_id
       WHERE m.conversation_id = $1 AND (a.name LIKE 'voice-duet-%' OR m.text LIKE '%[Voice Duet%')
         AND m.created_at >= $2 AND m.created_at < $3`,
      [cid, startDate, endDate],
    );
    const duetCount = duetRow?.count || 0;

    const heartRow = await one(
      `SELECT count(*)::int as count FROM messages
       WHERE conversation_id = $1 AND (text LIKE '💓 [Heartbeat Pulse%' OR text LIKE '🫂 [Virtual Touch%' OR text LIKE '🫂 [Haptic Hug%')
         AND created_at >= $2 AND created_at < $3`,
      [cid, startDate, endDate],
    );
    const heartbeatsCount = heartRow?.count || 0;

    const memoriesRows = (
      await db.query(
        `SELECT id, title, to_char(memory_date, 'YYYY-MM-DD') as memory_date, emoji, description
         FROM relationship_memories
         WHERE conversation_id = $1 AND to_char(memory_date, 'YYYY-MM') = $2
         ORDER BY memory_date ASC`,
        [cid, monthKey],
      )
    ).rows;

    const milestonesRows = (
      await db.query(
        `SELECT id, title, to_char(target_date, 'YYYY-MM-DD') as target_date, emoji, note
         FROM relationship_milestones
         WHERE conversation_id = $1 AND to_char(target_date, 'YYYY-MM') = $2
         ORDER BY target_date ASC`,
        [cid, monthKey],
      )
    ).rows;

    const stats = {
      messagesCount,
      photosCount: photosRows.length,
      voiceNotesCount: voiceRows.length,
      duetCount,
      heartbeatsCount,
      touchesCount: 0,
      memoriesCount: memoriesRows.length,
      milestonesCount: milestonesRows.length,
    };

    const chronicle = generateMonthlyPoeticChronicle(stats, peer ? peer.name : 'Sweetheart', monthKey);

    res.json({
      monthKey,
      stats,
      chronicle,
      photos: photosRows,
      voiceNotes: voiceRows,
      memories: memoriesRows,
      milestones: milestonesRows,
      partner: peer ? { id: peer.user_id, name: peer.name, handle: peer.handle } : null,
    });
  });

  // AI Love Poetry & Letter Polisher Endpoint
  app.post('/api/ai/polish-love-letter', async (req, res) => {
    const { prompt, tone = 'romantic_deep', language = 'ml', style = 'letter', partnerName } = req.body || {};

    let resultText = '';
    let generatedBy = 'poetic_engine';

    if (config.GEMINI_API_KEY) {
      try {
        const langDesc = language === 'ml'
          ? 'Malayalam written in Malayalam script'
          : language === 'manglish'
            ? 'Manglish (spoken Malayalam written in natural Latin chat alphabet, NOT English)'
            : 'English';

        const systemInstruction = `You are a deeply romantic, poetic love writing assistant for a couple messaging app called Kipenzi Connect.
You help lovers express tender emotions, passionate adoration, heartfelt apologies, and poetic stanzas in ${langDesc}.
Guidelines:
- Tone: ${tone}.
- Target Language: ${langDesc}.
- Style: ${style} (short sweet line, rhyming poetic verse/kavitha, or deep heartfelt letter).
- Tone must feel intimate, emotionally vulnerable, deeply touching, and culturally natural for Kerala couples.
- Only output the finished poetic message or letter text. Never include meta commentary or introductory remarks.`;

        const userPrompt = `Help me express my feelings to my partner ${partnerName || 'Sweetheart'}. My thoughts/raw words: "${prompt || 'I love you so much and want to express how much you mean to me'}".`;

        const geminiRes = await providerFetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.GEMINI_MODEL)}:generateContent`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': config.GEMINI_API_KEY },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            }),
          },
        );
        const data = await geminiRes.json();
        const candidate = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
        if (candidate) {
          resultText = candidate;
          generatedBy = 'gemini';
        }
      } catch {
        // Fallback gracefully to offline poetic generator
      }
    }

    if (!resultText) {
      resultText = generateLoveText({
        tone,
        language,
        style,
        prompt,
        partnerName: partnerName || 'Sweetheart',
        seedIndex: Math.floor(Math.random() * 10),
      });
    }

    res.json({
      text: resultText,
      tone,
      language,
      style,
      generatedBy,
    });
  });

  // Digital Time Capsule (Love Letters for Future) Endpoints
  app.get('/api/conversations/:id/time-capsules', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);

    const rows = (
      await db.query(
        `SELECT c.id, c.conversation_id, c.user_id, c.recipient_id, c.title, c.occasion,
                c.unlock_at, c.theme, c.seal_symbol, c.letter_text, c.audio_url, c.photo_url,
                c.status, c.opened_at, c.reactions, c.created_at,
                u.name as author_name, r.name as recipient_name
         FROM time_capsules c
         JOIN users u ON u.id = c.user_id
         JOIN users r ON r.id = c.recipient_id
         WHERE c.conversation_id = $1
         ORDER BY c.unlock_at ASC, c.created_at ASC`,
        [cid],
      )
    ).rows;

    const now = new Date();

    // Security & Surprise Enforcement:
    // If the requesting user is the recipient AND the capsule unlock time has not arrived yet,
    // mask the secret content (letter_text, audio_url, photo_url) so they cannot sneak-peek in devtools!
    const sanitized = rows.map((capsule) => {
      const isAuthor = capsule.user_id === req.user.id;
      const isUnlocked = new Date(capsule.unlock_at).getTime() <= now.getTime();

      if (!isAuthor && !isUnlocked) {
        return {
          ...capsule,
          letter_text: null,
          audio_url: null,
          photo_url: null,
          is_locked: true,
          status: 'sealed',
        };
      }

      return {
        ...capsule,
        is_locked: !isUnlocked,
      };
    });

    res.json({ capsules: sanitized });
  });

  app.post('/api/conversations/:id/time-capsules', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await assertCanContact(req.user.id, cid);

    const peer = await one(
      'SELECT u.id as user_id, u.name FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (!peer) throw new HttpError(400, 'Time Capsules require a direct conversation with your partner.');

    const validated = validateCapsuleInput(req.body);
    const capsuleId = randomUUID();

    const inserted = await one(
      `INSERT INTO time_capsules(id, conversation_id, user_id, recipient_id, title, occasion, unlock_at, theme, seal_symbol, letter_text, audio_url, photo_url, status, reactions)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'sealed', '[]'::jsonb)
       RETURNING *`,
      [
        capsuleId,
        cid,
        req.user.id,
        peer.user_id,
        validated.title,
        validated.occasion,
        validated.unlock_at,
        validated.theme,
        validated.seal_symbol,
        validated.letter_text,
        validated.audio_url,
        validated.photo_url,
      ],
    );

    if (io) {
      // Send masked version to recipient
      io.to(`user:${peer.user_id}`).emit('time_capsule:sealed', {
        conversation_id: cid,
        capsule: {
          ...inserted,
          letter_text: null,
          audio_url: null,
          photo_url: null,
          author_name: req.user.name,
          recipient_name: peer.name,
          is_locked: true,
        },
      });
    }

    res.status(201).json({
      ok: true,
      capsule: {
        ...inserted,
        author_name: req.user.name,
        recipient_name: peer.name,
        is_locked: false,
      },
    });
  });

  app.post('/api/conversations/:id/time-capsules/:capsuleId/open', async (req, res) => {
    const cid = id.parse(req.params.id);
    const capId = id.parse(req.params.capsuleId);
    await membership(req.user.id, cid);

    const capsule = await one(
      'SELECT * FROM time_capsules WHERE id=$1 AND conversation_id=$2',
      [capId, cid],
    );
    if (!capsule) throw new HttpError(404, 'Time capsule not found');

    const now = new Date();
    if (new Date(capsule.unlock_at).getTime() > now.getTime()) {
      throw new HttpError(403, 'This time capsule is still locked until ' + capsule.unlock_at);
    }

    const updated = await one(
      "UPDATE time_capsules SET status='opened', opened_at=coalesce(opened_at, now()), updated_at=now() WHERE id=$1 RETURNING *",
      [capId],
    );

    const peer = await one(
      'SELECT u.id as user_id FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('time_capsule:opened', {
        conversation_id: cid,
        capsule_id: capId,
        opened_by_name: req.user.name,
        opened_at: updated.opened_at,
      });
    }

    res.json({ ok: true, capsule: updated });
  });

  app.post('/api/conversations/:id/time-capsules/:capsuleId/react', async (req, res) => {
    const cid = id.parse(req.params.id);
    const capId = id.parse(req.params.capsuleId);
    await membership(req.user.id, cid);

    const emojiInput = z.string().min(1).max(20).parse(req.body?.emoji || '❤️');
    const noteInput = req.body?.note ? z.string().max(500).parse(req.body.note) : null;

    const capsule = await one(
      'SELECT id, reactions, user_id, recipient_id FROM time_capsules WHERE id=$1 AND conversation_id=$2',
      [capId, cid],
    );
    if (!capsule) throw new HttpError(404, 'Time capsule not found');

    let reactions = Array.isArray(capsule.reactions) ? capsule.reactions : [];
    reactions.push({
      user_id: req.user.id,
      user_name: req.user.name,
      emoji: emojiInput,
      note: noteInput,
      created_at: new Date().toISOString(),
    });

    await db.query('UPDATE time_capsules SET reactions=$1 WHERE id=$2', [
      JSON.stringify(reactions),
      capId,
    ]);

    const peer = await one(
      'SELECT u.id as user_id FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('time_capsule:reaction', {
        conversation_id: cid,
        capsule_id: capId,
        reactions,
        reaction: {
          user_id: req.user.id,
          user_name: req.user.name,
          emoji: emojiInput,
          note: noteInput,
        },
      });
    }

    res.json({ ok: true, reactions });
  });

  app.delete('/api/conversations/:id/time-capsules/:capsuleId', async (req, res) => {
    const cid = id.parse(req.params.id);
    const capId = id.parse(req.params.capsuleId);
    await membership(req.user.id, cid);

    const capsule = await one(
      'SELECT user_id, recipient_id FROM time_capsules WHERE id=$1 AND conversation_id=$2',
      [capId, cid],
    );
    if (!capsule) throw new HttpError(404, 'Time capsule not found');

    if (capsule.user_id !== req.user.id) {
      throw new HttpError(403, 'Only the author can delete this time capsule');
    }

    await db.query('DELETE FROM time_capsules WHERE id=$1 AND conversation_id=$2', [capId, cid]);

    const peer = await one(
      'SELECT u.id as user_id FROM members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=$1 AND m.user_id<>$2',
      [cid, req.user.id],
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('time_capsule:deleted', {
        conversation_id: cid,
        capsule_id: capId,
      });
    }

    res.json({ ok: true });
  });

  // Romantic Surprises, Love Coupons, and Couple Bucket List Endpoints
  app.get('/api/conversations/:id/romantic-surprises', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);

    const couponsResult = await db.query(
      `SELECT c.id, c.conversation_id, c.sender_id, c.recipient_id, c.title, c.emoji,
              c.description, c.status, c.scratch_percentage, c.redeemed_at, c.created_at,
              s.name as sender_name, r.name as recipient_name
       FROM love_coupons c
       JOIN users s ON s.id = c.sender_id
       JOIN users r ON r.id = c.recipient_id
       WHERE c.conversation_id = $1
       ORDER BY c.created_at DESC`,
      [cid]
    );

    let bucketResult = await db.query(
      `SELECT b.id, b.conversation_id, b.creator_id, b.title, b.category, b.notes,
              b.target_date, b.is_completed, b.completed_at, b.completed_by,
              b.completion_photo, b.completion_note, b.created_at,
              u.name as creator_name, cb.name as completed_by_name
       FROM couple_bucket_list b
       JOIN users u ON u.id = b.creator_id
       LEFT JOIN users cb ON cb.id = b.completed_by
       WHERE b.conversation_id = $1
       ORDER BY b.is_completed ASC, b.created_at DESC`,
      [cid]
    );

    // If bucket list is completely empty, seed initial romantic items
    if (bucketResult.rows.length === 0) {
      for (const preset of BUCKET_LIST_PRESETS.slice(0, 6)) {
        const newId = randomUUID();
        await db.query(
          `INSERT INTO couple_bucket_list(id, conversation_id, creator_id, title, category, notes, target_date)
           VALUES($1, $2, $3, $4, $5, $6, $7)`,
          [newId, cid, req.user.id, preset.title, preset.category, preset.notes, 'Soon']
        );
      }
      bucketResult = await db.query(
        `SELECT b.id, b.conversation_id, b.creator_id, b.title, b.category, b.notes,
                b.target_date, b.is_completed, b.completed_at, b.completed_by,
                b.completion_photo, b.completion_note, b.created_at,
                u.name as creator_name, cb.name as completed_by_name
         FROM couple_bucket_list b
         JOIN users u ON u.id = b.creator_id
         LEFT JOIN users cb ON cb.id = b.completed_by
         WHERE b.conversation_id = $1
         ORDER BY b.is_completed ASC, b.created_at DESC`,
        [cid]
      );
    }

    res.json({
      coupons: couponsResult.rows,
      bucketList: bucketResult.rows,
    });
  });

  app.post('/api/conversations/:id/romantic-surprises/coupons', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);

    const title = z.string().min(1).max(200).parse(req.body?.title);
    const emoji = z.string().max(20).default('🎟️').parse(req.body?.emoji || '🎟️');
    const description = z.string().max(1000).default('').parse(req.body?.description || '');

    let recipientId = req.body?.recipient_id;
    if (!recipientId) {
      const peer = await one(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [cid, req.user.id]
      );
      if (peer) recipientId = peer.user_id;
    }
    if (!recipientId) throw new HttpError(400, 'Recipient required');

    const couponId = randomUUID();
    const inserted = await one(
      `INSERT INTO love_coupons(id, conversation_id, sender_id, recipient_id, title, emoji, description)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [couponId, cid, req.user.id, recipientId, title, emoji, description]
    );

    const fullCoupon = {
      ...inserted,
      sender_name: req.user.name,
    };

    if (io) {
      io.to(`user:${recipientId}`).emit('romantic:action', {
        type: 'coupon_created',
        conversation_id: cid,
        coupon: fullCoupon,
        sender_id: req.user.id,
        sender_name: req.user.name,
      });
    }

    res.json({ ok: true, coupon: fullCoupon });
  });

  app.patch('/api/conversations/:id/romantic-surprises/coupons/:couponId', async (req, res) => {
    const cid = id.parse(req.params.id);
    const couponId = id.parse(req.params.couponId);
    await membership(req.user.id, cid);

    const status = z.enum(['active', 'scratched', 'redeemed']).optional().parse(req.body?.status);
    const scratchPercentage = z.number().min(0).max(100).optional().parse(req.body?.scratch_percentage);

    const existing = await one('SELECT * FROM love_coupons WHERE id=$1 AND conversation_id=$2', [couponId, cid]);
    if (!existing) throw new HttpError(404, 'Coupon not found');

    let newStatus = status || existing.status;
    let redeemedAt = existing.redeemed_at;
    if (newStatus === 'redeemed' && !redeemedAt) {
      redeemedAt = new Date();
    }

    const updated = await one(
      `UPDATE love_coupons
       SET status=$1, scratch_percentage=coalesce($2, scratch_percentage), redeemed_at=$3
       WHERE id=$4
       RETURNING *`,
      [newStatus, scratchPercentage ?? existing.scratch_percentage, redeemedAt, couponId]
    );

    const peer = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
      [cid, req.user.id]
    );

    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('romantic:action', {
        type: 'coupon_updated',
        conversation_id: cid,
        coupon: updated,
        sender_id: req.user.id,
        sender_name: req.user.name,
      });
    }

    res.json({ ok: true, coupon: updated });
  });

  app.delete('/api/conversations/:id/romantic-surprises/coupons/:couponId', async (req, res) => {
    const cid = id.parse(req.params.id);
    const couponId = id.parse(req.params.couponId);
    await membership(req.user.id, cid);

    await db.query('DELETE FROM love_coupons WHERE id=$1 AND conversation_id=$2', [couponId, cid]);

    const peer = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
      [cid, req.user.id]
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('romantic:action', {
        type: 'coupon_deleted',
        conversation_id: cid,
        coupon_id: couponId,
      });
    }

    res.json({ ok: true });
  });

  app.post('/api/conversations/:id/romantic-surprises/bucket-list', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);

    const title = z.string().min(1).max(300).parse(req.body?.title);
    const category = z.string().max(50).default('dream').parse(req.body?.category || 'dream');
    const notes = z.string().max(1000).default('').parse(req.body?.notes || '');
    const targetDate = req.body?.target_date ? z.string().max(50).parse(req.body.target_date) : null;

    const itemId = randomUUID();
    const inserted = await one(
      `INSERT INTO couple_bucket_list(id, conversation_id, creator_id, title, category, notes, target_date)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [itemId, cid, req.user.id, title, category, notes, targetDate]
    );

    const fullItem = {
      ...inserted,
      creator_name: req.user.name,
    };

    const peer = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
      [cid, req.user.id]
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('romantic:action', {
        type: 'bucket_added',
        conversation_id: cid,
        item: fullItem,
        sender_id: req.user.id,
        sender_name: req.user.name,
      });
    }

    res.json({ ok: true, item: fullItem });
  });

  app.patch('/api/conversations/:id/romantic-surprises/bucket-list/:itemId', async (req, res) => {
    const cid = id.parse(req.params.id);
    const itemId = id.parse(req.params.itemId);
    await membership(req.user.id, cid);

    const isCompleted = z.boolean().parse(req.body?.is_completed);
    const completionPhoto = req.body?.completion_photo ? z.string().parse(req.body.completion_photo) : null;
    const completionNote = z.string().max(1000).default('').parse(req.body?.completion_note || '');

    const completedAt = isCompleted ? new Date() : null;
    const completedBy = isCompleted ? req.user.id : null;

    const updated = await one(
      `UPDATE couple_bucket_list
       SET is_completed=$1, completed_at=$2, completed_by=$3,
           completion_photo=coalesce($4, completion_photo),
           completion_note=coalesce($5, completion_note)
       WHERE id=$6 AND conversation_id=$7
       RETURNING *`,
      [isCompleted, completedAt, completedBy, completionPhoto, completionNote, itemId, cid]
    );

    const fullItem = {
      ...updated,
      completed_by_name: isCompleted ? req.user.name : null,
    };

    const peer = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
      [cid, req.user.id]
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('romantic:action', {
        type: 'bucket_updated',
        conversation_id: cid,
        item: fullItem,
        sender_id: req.user.id,
        sender_name: req.user.name,
      });
    }

    res.json({ ok: true, item: fullItem });
  });

  app.delete('/api/conversations/:id/romantic-surprises/bucket-list/:itemId', async (req, res) => {
    const cid = id.parse(req.params.id);
    const itemId = id.parse(req.params.itemId);
    await membership(req.user.id, cid);

    await db.query('DELETE FROM couple_bucket_list WHERE id=$1 AND conversation_id=$2', [itemId, cid]);

    const peer = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
      [cid, req.user.id]
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('romantic:action', {
        type: 'bucket_deleted',
        conversation_id: cid,
        item_id: itemId,
      });
    }

    res.json({ ok: true });
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
       AND m.deleted_at IS NULL AND NOT m.view_once AND (m.expires_at IS NULL OR m.expires_at>now())
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
      `${messageSelect} WHERE m.conversation_id=$1 AND m.deleted_at IS NULL AND NOT m.view_once
       AND ($4::bigint IS NULL OR m.seq<$4)
       AND ($5='' OR strpos(lower(m.text),lower($5))>0 OR strpos(lower(a.name),lower($5))>0 OR strpos(lower(t.text),lower($5))>0)
       AND ($6='messages' OR ($6='starred' AND EXISTS(SELECT 1 FROM message_stars ms WHERE ms.message_id=m.id AND ms.user_id=$3)) OR ($6='pinned' AND EXISTS(SELECT 1 FROM message_pins mp WHERE mp.message_id=m.id)) OR ($6='photos' AND a.mime LIKE 'image/%') OR ($6='media' AND (a.mime LIKE 'image/%' OR a.mime LIKE 'video/%' OR a.mime LIKE 'audio/%')) OR ($6='documents' AND a.id IS NOT NULL AND a.mime NOT LIKE 'image/%' AND a.mime NOT LIKE 'video/%' AND a.mime NOT LIKE 'audio/%'))
       ORDER BY m.seq DESC LIMIT 31`,
      [cid, req.user.language, req.user.id, input.before || null, input.q, input.kind],
    );
    await ensureReaderTranslations(req.user, result.rows.slice(0,30));
    res.json({ messages: result.rows.slice(0,30), has_more: result.rows.length>30 });
  });
  app.get('/api/conversations/:id/vault', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    const input = z.object({
      q: z.string().trim().max(200).default(''),
      type: z.enum(['all', 'photos', 'videos']).default('all'),
      sender_id: z.string().uuid().optional(),
      before: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(60),
    }).parse(req.query);

    const result = await db.query(
      `${messageSelect} WHERE m.conversation_id=$1 AND m.deleted_at IS NULL AND NOT m.view_once
       AND a.id IS NOT NULL AND a.expired_at IS NULL
       AND (a.mime LIKE 'image/%' OR a.mime LIKE 'video/%')
       AND NOT (a.name LIKE 'sticker-%' OR lower(a.name) LIKE '%sticker%')
       AND NOT (a.name LIKE 'voice-note-%' AND a.mime = 'video/webm')
       AND ($4::bigint IS NULL OR m.seq < $4)
       AND ($5 = '' OR strpos(lower(m.text), lower($5)) > 0 OR strpos(lower(a.name), lower($5)) > 0)
       AND ($6 = 'all' OR ($6 = 'photos' AND a.mime LIKE 'image/%') OR ($6 = 'videos' AND a.mime LIKE 'video/%'))
       AND ($7::uuid IS NULL OR m.sender_id = $7)
       ORDER BY m.seq DESC LIMIT $8`,
      [cid, req.user.language, req.user.id, input.before || null, input.q, input.type, input.sender_id || null, input.limit + 1],
    );

    const statsResult = await db.query(
      `SELECT
         COUNT(*)::int as total,
         COUNT(CASE WHEN a.mime LIKE 'image/%' THEN 1 END)::int as photos,
         COUNT(CASE WHEN a.mime LIKE 'video/%' THEN 1 END)::int as videos,
         MIN(m.created_at) as oldest_date,
         MAX(m.created_at) as newest_date
       FROM (SELECT * FROM messages WHERE expires_at IS NULL OR expires_at > now()) m
       JOIN attachments a ON a.id = m.attachment_id
       WHERE m.conversation_id = $1 AND m.deleted_at IS NULL AND NOT m.view_once
         AND a.expired_at IS NULL
         AND (a.mime LIKE 'image/%' OR a.mime LIKE 'video/%')
         AND NOT (a.name LIKE 'sticker-%' OR lower(a.name) LIKE '%sticker%')
         AND NOT (a.name LIKE 'voice-note-%' AND a.mime = 'video/webm')`,
      [cid],
    );

    const hasMore = result.rows.length > input.limit;
    const messages = result.rows.slice(0, input.limit);
    await ensureReaderTranslations(req.user, messages);

    res.json({
      messages,
      has_more: hasMore,
      stats: statsResult.rows[0] || { total: 0, photos: 0, videos: 0, oldest_date: null, newest_date: null },
    });
  });
  app.get('/api/messages/search', async (req, res) => {
    await limit(`search:${req.user.id}`, 60, 60);
    const input = z.object({
      q: z.string().trim().min(1, 'Search query is required').max(200),
      conversation_id: z.string().uuid().optional(),
      sender_id: z.string().uuid().optional(),
      media_type: z.enum(['all','photos','videos','audio','documents']).default('all'),
      date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      offset: z.coerce.number().int().min(0).max(10000).default(0),
    }).parse(req.query);

    // Build WHERE conditions
    const conditions = ['m.deleted_at IS NULL', 'NOT m.view_once'];
    const params = [req.user.language, req.user.id];
    let paramIndex = 3;

    // Text search condition
    conditions.push(`(strpos(lower(m.text),lower($${paramIndex}))>0 OR strpos(lower(a.name),lower($${paramIndex}))>0 OR strpos(lower(t.text),lower($${paramIndex}))>0)`);
    params.push(input.q);
    paramIndex++;

    // Conversation filter
    if (input.conversation_id) {
      conditions.push(`m.conversation_id=$${paramIndex}`);
      params.push(input.conversation_id);
      paramIndex++;
    }

    // Sender filter
    if (input.sender_id) {
      conditions.push(`m.sender_id=$${paramIndex}`);
      params.push(input.sender_id);
      paramIndex++;
    }

    // Media type filter
    if (input.media_type === 'photos') {
      conditions.push(`a.mime LIKE 'image/%'`);
    } else if (input.media_type === 'videos') {
      conditions.push(`a.mime LIKE 'video/%'`);
    } else if (input.media_type === 'audio') {
      conditions.push(`a.mime LIKE 'audio/%'`);
    } else if (input.media_type === 'documents') {
      conditions.push(`a.id IS NOT NULL AND a.mime NOT LIKE 'image/%' AND a.mime NOT LIKE 'video/%' AND a.mime NOT LIKE 'audio/%'`);
    }

    // Date range filters
    if (input.date_from) {
      conditions.push(`m.created_at >= $${paramIndex}::date`);
      params.push(input.date_from);
      paramIndex++;
    }
    if (input.date_to) {
      conditions.push(`m.created_at < ($${paramIndex}::date + interval '1 day')`);
      params.push(input.date_to);
      paramIndex++;
    }

    // Only search in conversations where user is a member
    conditions.push(`EXISTS(SELECT 1 FROM members mem WHERE mem.conversation_id=m.conversation_id AND mem.user_id=$2)`);

    const whereClause = conditions.join(' AND ');
    
    const result = await db.query(
      `${messageSelect},
       c.name as conversation_name,
       c.direct_key IS NULL as is_group
       FROM messages m
       LEFT JOIN attachments a ON a.id=m.attachment_id
       LEFT JOIN translations t ON t.message_id=m.id AND t.language=$1
       JOIN users u ON u.id=m.sender_id
       JOIN conversations c ON c.id=m.conversation_id
       WHERE ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT 51 OFFSET $${paramIndex}`,
      [...params, input.offset],
    );

    await ensureReaderTranslations(req.user, result.rows.slice(0, 50));
    
    res.json({
      messages: result.rows.slice(0, 50).map(msg => ({
        ...msg,
        conversation_name: msg.conversation_name,
        is_group: msg.is_group,
      })),
      has_more: result.rows.length > 50,
      offset: input.offset,
    });
  });
  app.get('/api/conversations/:id/threads/:messageId', async (req, res) => {
    const cid = id.parse(req.params.id);
    const mid = id.parse(req.params.messageId);
    await membership(req.user.id, cid);
    const after = z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).parse(req.query.after || 0);
    const anchor = await one('SELECT id FROM messages WHERE id=$1 AND conversation_id=$2 AND (expires_at IS NULL OR expires_at>now())', [mid, cid]);
    if (!anchor) throw new HttpError(404, 'Thread message is unavailable.');
    const result = await db.query(`WITH RECURSIVE ancestors AS (
      SELECT id,reply_to_id,seq FROM messages WHERE id=$4 AND conversation_id=$1
      UNION
      SELECT p.id,p.reply_to_id,p.seq FROM messages p JOIN ancestors a ON p.id=a.reply_to_id
      WHERE p.conversation_id=$1 AND (p.expires_at IS NULL OR p.expires_at>now())
    ), thread AS (
      SELECT id FROM ancestors WHERE seq=(SELECT min(seq) FROM ancestors)
      UNION
      SELECT child.id FROM messages child JOIN thread parent ON child.reply_to_id=parent.id
      WHERE child.conversation_id=$1 AND (child.expires_at IS NULL OR child.expires_at>now())
    ) ${messageSelect} WHERE m.conversation_id=$1 AND m.id IN (SELECT id FROM thread) AND m.seq>$5 ORDER BY m.seq LIMIT 51`,
    [cid, req.user.language, req.user.id, mid, after]);
    const messages = result.rows.slice(0, 50);
    await ensureReaderTranslations(req.user, messages);
    res.json({ messages, has_more: result.rows.length > 50 });
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
  app.get('/api/conversations/:id/scheduled', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    const result = await db.query("SELECT * FROM scheduled_messages WHERE conversation_id=$1 AND sender_id=$2 ORDER BY (status='pending') DESC,CASE WHEN status='pending' THEN delivery_at END,updated_at DESC LIMIT 100", [cid, req.user.id]);
    res.json({ scheduled: result.rows });
  });
  app.post('/api/conversations/:id/scheduled', async (req, res) => {
    await limit(`schedules:${req.user.id}`, 40, 60);
    res.status(201).json(await createSchedule(req.user, id.parse(req.params.id), scheduleInput.parse(req.body)));
  });
  app.patch('/api/scheduled/:id', async (req, res) => {
    await limit(`schedules:${req.user.id}`, 40, 60);
    res.json(await changeSchedule(req.user, id.parse(req.params.id), scheduleEdit.parse(req.body)));
  });
  app.delete('/api/scheduled/:id', async (req, res) => {
    await limit(`schedules:${req.user.id}`, 40, 60);
    res.json(await changeSchedule(req.user, id.parse(req.params.id), null));
  });

  // ========================================
  // Calendar & To-Do Lists Endpoints
  // ========================================

  // Get calendar events for date range
  app.get('/api/conversations/:id/calendar/events', async (req, res) => {
    const cid = id.parse(req.params.id);
    const input = z.object({
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(req.query);

    const events = await getCalendarEvents(req.user.id, cid, input.start_date, input.end_date);
    res.json(events);
  });

  // Create calendar event
  app.post('/api/conversations/:id/calendar/events', async (req, res) => {
    await limit(`calendar:${req.user.id}`, 60, 60);
    const cid = id.parse(req.params.id);
    const input = z.object({
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(2000).optional(),
      event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      event_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
      all_day: z.boolean().default(true),
      category: z.enum(['anniversary', 'birthday', 'date_night', 'special_date', 'trip', 'appointment', 'other']).default('special_date'),
      emoji: z.string().max(10).default('📅'),
      location: z.string().trim().max(500).nullable().optional(),
      is_recurring: z.boolean().default(false),
      recurrence_pattern: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable().optional(),
      recurrence_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      reminder_minutes: z.enum([0, 15, 30, 60, 120, 1440, 2880, 10080]).default(1440),
    }).parse(req.body);

    const event = await createCalendarEvent(req.user.id, cid, input);
    res.status(201).json(event);
  });

  // Update calendar event
  app.patch('/api/conversations/:id/calendar/events/:eventId', async (req, res) => {
    await limit(`calendar:${req.user.id}`, 60, 60);
    const eventId = id.parse(req.params.eventId);
    const input = z.object({
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(2000).nullable().optional(),
      event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      event_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
      all_day: z.boolean().optional(),
      category: z.enum(['anniversary', 'birthday', 'date_night', 'special_date', 'trip', 'appointment', 'other']).optional(),
      emoji: z.string().max(10).optional(),
      location: z.string().trim().max(500).nullable().optional(),
      is_recurring: z.boolean().optional(),
      recurrence_pattern: z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable().optional(),
      recurrence_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      reminder_minutes: z.enum([0, 15, 30, 60, 120, 1440, 2880, 10080]).optional(),
    }).parse(req.body);

    const event = await updateCalendarEvent(req.user.id, eventId, input);
    res.json(event);
  });

  // Delete calendar event
  app.delete('/api/conversations/:id/calendar/events/:eventId', async (req, res) => {
    const eventId = id.parse(req.params.eventId);
    const result = await deleteCalendarEvent(req.user.id, eventId);
    res.json(result);
  });

  // Respond to event (going/maybe/excited)
  app.post('/api/conversations/:id/calendar/events/:eventId/respond', async (req, res) => {
    await limit(`calendar:${req.user.id}`, 120, 60);
    const eventId = id.parse(req.params.eventId);
    const input = z.object({
      response: z.enum(['going', 'maybe', 'excited']),
      note: z.string().trim().max(500).nullable().optional(),
    }).parse(req.body);

    const response = await respondToEvent(req.user.id, eventId, input.response, input.note);
    res.json(response);
  });

  // Get to-do lists
  app.get('/api/conversations/:id/calendar/todos', async (req, res) => {
    const cid = id.parse(req.params.id);
    const lists = await getTodoLists(req.user.id, cid);
    res.json(lists);
  });

  // Create to-do list
  app.post('/api/conversations/:id/calendar/todos', async (req, res) => {
    await limit(`calendar:${req.user.id}`, 60, 60);
    const cid = id.parse(req.params.id);
    const input = z.object({
      title: z.string().trim().min(1).max(100),
      description: z.string().trim().max(1000).nullable().optional(),
      emoji: z.string().max(10).default('✓'),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#8b5cf6'),
    }).parse(req.body);

    const list = await createTodoList(req.user.id, cid, input);
    res.status(201).json(list);
  });

  // Update to-do list
  app.patch('/api/conversations/:id/calendar/todos/:listId', async (req, res) => {
    await limit(`calendar:${req.user.id}`, 60, 60);
    const listId = id.parse(req.params.listId);
    const input = z.object({
      title: z.string().trim().min(1).max(100).optional(),
      description: z.string().trim().max(1000).nullable().optional(),
      emoji: z.string().max(10).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }).parse(req.body);

    const list = await updateTodoList(req.user.id, listId, input);
    res.json(list);
  });

  // Delete to-do list
  app.delete('/api/conversations/:id/calendar/todos/:listId', async (req, res) => {
    const listId = id.parse(req.params.listId);
    const result = await deleteTodoList(req.user.id, listId);
    res.json(result);
  });

  // Get to-do items
  app.get('/api/conversations/:id/calendar/todos/:listId/items', async (req, res) => {
    const listId = id.parse(req.params.listId);
    const items = await getTodoItems(req.user.id, listId);
    res.json(items);
  });

  // Create to-do item
  app.post('/api/conversations/:id/calendar/todos/:listId/items', async (req, res) => {
    await limit(`calendar:${req.user.id}`, 120, 60);
    const listId = id.parse(req.params.listId);
    const input = z.object({
      text: z.string().trim().min(1).max(500),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      priority: z.enum(['low', 'normal', 'high']).default('normal'),
    }).parse(req.body);

    const item = await createTodoItem(req.user.id, listId, input);
    res.status(201).json(item);
  });

  // Update to-do item
  app.patch('/api/conversations/:id/calendar/todos/:listId/items/:itemId', async (req, res) => {
    await limit(`calendar:${req.user.id}`, 120, 60);
    const itemId = id.parse(req.params.itemId);
    const input = z.object({
      text: z.string().trim().min(1).max(500).optional(),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      priority: z.enum(['low', 'normal', 'high']).optional(),
    }).parse(req.body);

    const item = await updateTodoItem(req.user.id, itemId, input);
    res.json(item);
  });

  // Toggle to-do item completion
  app.post('/api/conversations/:id/calendar/todos/:listId/items/:itemId/toggle', async (req, res) => {
    await limit(`calendar:${req.user.id}`, 200, 60);
    const itemId = id.parse(req.params.itemId);
    const item = await toggleTodoItem(req.user.id, itemId);
    res.json(item);
  });

  // Delete to-do item
  app.delete('/api/conversations/:id/calendar/todos/:listId/items/:itemId', async (req, res) => {
    const itemId = id.parse(req.params.itemId);
    const result = await deleteTodoItem(req.user.id, itemId);
    res.json(result);
  });

  // ========================================
  // End Calendar & To-Do Lists Endpoints
  // ========================================

  // ========================================
  // Quick Replies Endpoints
  // ========================================
  
  app.get('/api/quick-replies', async (req, res) => {
    const result = await db.query(
      'SELECT * FROM quick_replies WHERE user_id=$1 ORDER BY category, usage_count DESC, created_at DESC',
      [req.user.id]
    );
    res.json({ replies: result.rows });
  });

  app.post('/api/quick-replies', async (req, res) => {
    await limit(`quick-replies:${req.user.id}`, 30, 60);
    const input = z.object({
      category: z.string().min(1).max(50),
      text: z.string().trim().min(1).max(500),
    }).parse(req.body);

    const reply = await one(
      'INSERT INTO quick_replies(id, user_id, category, text) VALUES($1, $2, $3, $4) RETURNING *',
      [randomUUID(), req.user.id, input.category, input.text]
    );
    res.status(201).json(reply);
  });

  app.post('/api/quick-replies/:id/use', async (req, res) => {
    const replyId = id.parse(req.params.id);
    await db.query(
      'UPDATE quick_replies SET usage_count = usage_count + 1 WHERE id=$1 AND user_id=$2',
      [replyId, req.user.id]
    );
    res.json({ ok: true });
  });

  app.delete('/api/quick-replies/:id', async (req, res) => {
    const replyId = id.parse(req.params.id);
    await db.query('DELETE FROM quick_replies WHERE id=$1 AND user_id=$2', [replyId, req.user.id]);
    res.json({ ok: true });
  });

  // ========================================
  // Conversation Archive Endpoints
  // ========================================

  app.get('/api/conversations/archived', async (req, res) => {
    const result = await db.query(
      `SELECT arc.archived_at, c.id, c.name, c.description, c.avatar_id, c.direct_key IS NULL AS is_group,
       (SELECT count(*)::int FROM messages m WHERE m.conversation_id=c.id AND m.seq>me.read_seq AND m.sender_id<>$1) AS unread,
       (SELECT jsonb_build_object('text',m.text,'sticker',m.sticker,'attachment',m.attachment_id IS NOT NULL,'created_at',m.created_at) 
        FROM messages m WHERE m.conversation_id=c.id ORDER BY m.seq DESC LIMIT 1) AS last_message,
       jsonb_build_object('id',u.id,'name',u.name,'handle',u.handle,'avatar_id',u.avatar_id) AS peer
       FROM archived_conversations arc
       JOIN conversations c ON c.id = arc.conversation_id
       JOIN members me ON me.conversation_id = c.id AND me.user_id = $1
       LEFT JOIN LATERAL (SELECT user_id FROM members WHERE conversation_id=c.id AND user_id<>$1 ORDER BY user_id LIMIT 1) other ON true
       LEFT JOIN users u ON u.id = other.user_id
       WHERE arc.user_id = $1 AND c.deleted_at IS NULL
       ORDER BY arc.archived_at DESC`,
      [req.user.id]
    );
    res.json({ conversations: result.rows });
  });

  app.put('/api/conversations/:id/archive', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await db.query(
      'INSERT INTO archived_conversations(conversation_id, user_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
      [cid, req.user.id]
    );
    res.json({ ok: true, archived: true });
  });

  app.delete('/api/conversations/:id/archive', async (req, res) => {
    const cid = id.parse(req.params.id);
    await db.query(
      'DELETE FROM archived_conversations WHERE conversation_id=$1 AND user_id=$2',
      [cid, req.user.id]
    );
    res.json({ ok: true, archived: false });
  });

  // ========================================
  // Conversation Mute Endpoints
  // ========================================

  app.put('/api/conversations/:id/mute', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    
    const input = z.object({
      duration_minutes: z.number().int().min(1).max(525600).nullable(),
    }).parse(req.body);

    const mutedUntil = input.duration_minutes
      ? new Date(Date.now() + input.duration_minutes * 60000).toISOString()
      : null; // null means forever

    await db.query(
      `INSERT INTO muted_conversations(conversation_id, user_id, muted_until)
       VALUES($1, $2, $3)
       ON CONFLICT(conversation_id, user_id)
       DO UPDATE SET muted_until = EXCLUDED.muted_until, created_at = now()`,
      [cid, req.user.id, mutedUntil]
    );

    res.json({ ok: true, muted_until: mutedUntil || 'forever' });
  });

  app.delete('/api/conversations/:id/mute', async (req, res) => {
    const cid = id.parse(req.params.id);
    await db.query(
      'DELETE FROM muted_conversations WHERE conversation_id=$1 AND user_id=$2',
      [cid, req.user.id]
    );
    res.json({ ok: true, muted: false });
  });

  app.get('/api/conversations/:id/mute', async (req, res) => {
    const cid = id.parse(req.params.id);
    const mute = await one(
      'SELECT muted_until FROM muted_conversations WHERE conversation_id=$1 AND user_id=$2',
      [cid, req.user.id]
    );
    
    if (!mute) {
      res.json({ muted: false });
    } else if (!mute.muted_until) {
      res.json({ muted: true, muted_until: 'forever' });
    } else if (new Date(mute.muted_until) > new Date()) {
      res.json({ muted: true, muted_until: mute.muted_until });
    } else {
      // Mute expired, clean up
      await db.query(
        'DELETE FROM muted_conversations WHERE conversation_id=$1 AND user_id=$2',
        [cid, req.user.id]
      );
      res.json({ muted: false });
    }
  });

  // ========================================
  // End Quick Replies, Archive, Mute Endpoints
  // ========================================

  // ========================================
  // Mentions Endpoints
  // ========================================

  app.get('/api/conversations/:id/mentions', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    
    const input = z.object({
      before: z.coerce.number().int().nonnegative().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }).parse(req.query);

    // Find messages that mention the current user
    const result = await db.query(
      `${messageSelect} 
       WHERE m.conversation_id=$1 
       AND (m.text ~* $4 OR m.text ~* '@all')
       AND ($5::bigint IS NULL OR m.seq < $5)
       AND m.deleted_at IS NULL
       ORDER BY m.seq DESC 
       LIMIT $6`,
      [
        cid,
        req.user.language,
        req.user.id,
        `@${req.user.handle}\\b`, // Regex to match @username
        input.before || null,
        input.limit + 1,
      ]
    );

    const messages = result.rows.slice(0, input.limit);
    await ensureReaderTranslations(req.user, messages);

    res.json({
      messages,
      has_more: result.rows.length > input.limit,
    });
  });

  // Get mention notifications count
  app.get('/api/mentions/unread', async (req, res) => {
    const result = await db.query(
      `SELECT c.id as conversation_id, c.name, COUNT(m.id)::int as mention_count
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN members me ON me.conversation_id = c.id AND me.user_id = $1
       WHERE (m.text ~* $2 OR m.text ~* '@all')
       AND m.seq > me.read_seq
       AND m.sender_id <> $1
       AND m.deleted_at IS NULL
       AND (m.expires_at IS NULL OR m.expires_at > now())
       GROUP BY c.id, c.name
       ORDER BY MAX(m.created_at) DESC`,
      [req.user.id, `@${req.user.handle}\\b`]
    );

    res.json({
      conversations: result.rows,
      total: result.rows.reduce((sum, row) => sum + row.mention_count, 0),
    });
  });

  // ========================================
  // End Mentions Endpoints
  // ========================================

  // ========================================
  // Status/Stories Endpoints
  // ========================================

  app.get('/api/status/active', async (req, res) => {
    // Get active statuses from contacts
    const result = await db.query(
      `SELECT s.*, u.name as user_name, u.handle, u.avatar_id,
       EXISTS(SELECT 1 FROM status_views WHERE status_id = s.id AND viewer_id = $1) as viewed_by_me
       FROM status_updates s
       JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > now()
       AND (
         s.user_id = $1
         OR EXISTS(
           SELECT 1 FROM conversations c
           JOIN members m1 ON m1.conversation_id = c.id AND m1.user_id = s.user_id
           JOIN members m2 ON m2.conversation_id = c.id AND m2.user_id = $1
         )
       )
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    res.json({ statuses: result.rows });
  });

  app.post('/api/status/upload', upload.single('file'), async (req, res) => {
    await limit(`status-upload:${req.user.id}`, 10, 3600);
    const type = await inspectFile(req.file, 'chat');
    const fileId = randomUUID();
    const key = `status/${req.user.id}/${fileId}.${type.ext}`;

    await putObject(key, req.file.buffer, type.mime);

    try {
      const attachment = await one(
        "INSERT INTO attachments(id,owner_id,purpose,object_key,name,mime,size) VALUES($1,$2,'status',$3,$4,$5,$6) RETURNING id",
        [fileId, req.user.id, key, type.name, type.mime, req.file.size]
      );
      res.status(201).json({ id: attachment.id });
    } catch (e) {
      await removeObject(key);
      throw e;
    }
  });

  app.post('/api/status', async (req, res) => {
    await limit(`status:${req.user.id}`, 20, 86400);

    const input = z.object({
      content_type: z.enum(['text', 'photo', 'video']),
      text: z.string().trim().max(500).nullable().optional(),
      attachment_id: z.string().uuid().nullable().optional(),
      background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
    }).parse(req.body);

    if (input.content_type === 'text' && !input.text) {
      throw new HttpError(400, 'Text status requires text content');
    }

    if ((input.content_type === 'photo' || input.content_type === 'video') && !input.attachment_id) {
      throw new HttpError(400, 'Media status requires attachment');
    }

    const statusId = randomUUID();
    const status = await one(
      `INSERT INTO status_updates(id, user_id, content_type, text, attachment_id, background_color)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [statusId, req.user.id, input.content_type, input.text || null, input.attachment_id || null, input.background_color || null]
    );

    res.status(201).json(status);
  });

  app.post('/api/status/:id/view', async (req, res) => {
    const statusId = id.parse(req.params.id);

    const status = await one(
      'SELECT user_id FROM status_updates WHERE id=$1 AND expires_at > now()',
      [statusId]
    );

    if (!status) {
      throw new HttpError(404, 'Status not found or expired');
    }

    if (status.user_id !== req.user.id) {
      await db.query(
        `INSERT INTO status_views(status_id, viewer_id)
         VALUES($1, $2)
         ON CONFLICT DO NOTHING`,
        [statusId, req.user.id]
      );

      await db.query(
        'UPDATE status_updates SET views_count = views_count + 1 WHERE id=$1',
        [statusId]
      );
    }

    res.json({ ok: true });
  });

  app.get('/api/status/:id/views', async (req, res) => {
    const statusId = id.parse(req.params.id);

    const status = await one(
      'SELECT user_id FROM status_updates WHERE id=$1',
      [statusId]
    );

    if (!status || status.user_id !== req.user.id) {
      throw new HttpError(403, 'Not authorized');
    }

    const views = await db.query(
      `SELECT u.id, u.name, u.handle, u.avatar_id, sv.viewed_at
       FROM status_views sv
       JOIN users u ON u.id = sv.viewer_id
       WHERE sv.status_id = $1
       ORDER BY sv.viewed_at DESC`,
      [statusId]
    );

    res.json({ views: views.rows });
  });

  app.delete('/api/status/:id', async (req, res) => {
    const statusId = id.parse(req.params.id);

    const deleted = await one(
      'DELETE FROM status_updates WHERE id=$1 AND user_id=$2 RETURNING attachment_id',
      [statusId, req.user.id]
    );

    if (!deleted) {
      throw new HttpError(404, 'Status not found');
    }

    // Clean up attachment if exists
    if (deleted.attachment_id) {
      const attachment = await one(
        'SELECT object_key FROM attachments WHERE id=$1',
        [deleted.attachment_id]
      );
      if (attachment) {
        await enqueue(db, 'delete_object', { key: attachment.object_key });
        await db.query('DELETE FROM attachments WHERE id=$1', [deleted.attachment_id]);
      }
    }

    res.json({ ok: true });
  });

  // ========================================
  // End Status/Stories Endpoints
  // ========================================

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
    if (await one('SELECT 1 FROM messages WHERE attachment_id=$1 AND view_once', [attachment.id]))
      throw new HttpError(403, 'View-once media must be opened from the message.');
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
  app.post('/api/messages/:id/view-once', async (req, res) => {
    const mid = id.parse(req.params.id);
    const result = await transaction(async c => {
      const message = await one('SELECT * FROM messages WHERE id=$1 FOR UPDATE', [mid], c);
      if (!message || !message.view_once || message.deleted_at || hasExpired(message))
        throw new HttpError(404, 'View-once media is unavailable.');
      await membership(req.user.id, message.conversation_id, c);
      if (message.sender_id === req.user.id) throw new HttpError(403, 'Only your partner can open this media.');
      if (message.view_once_opened_at) throw new HttpError(410, 'This media has already been opened.');
      const attachment = await one('SELECT * FROM attachments WHERE id=$1 FOR UPDATE', [message.attachment_id], c);
      if (!attachment || attachment.expired_at) throw new HttpError(410, 'This media is no longer available.');
      // Read before consuming so storage failures leave the message available. The row lock
      // ensures concurrent requests from another tab/device cannot receive a second copy.
      const bytes = Buffer.from(await readObject(attachment.object_key));
      await c.query('UPDATE messages SET view_once_opened_at=clock_timestamp() WHERE id=$1', [mid]);
      await c.query('UPDATE attachments SET expired_at=now() WHERE id=$1', [attachment.id]);
      await enqueue(c, 'delete_object', { key: attachment.object_key });
      await conversationEvent(c, message.conversation_id, 'message:changed', { conversation_id: message.conversation_id, message_id: mid });
      return { bytes, mime: attachment.mime };
    });
    res.set({ 'Content-Type': result.mime, 'Cache-Control': 'no-store', 'Content-Length': String(result.bytes.length) });
    res.end(result.bytes);
  });
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
      target = targetLanguage.parse(req.body.language);
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

  // ========================================
  // Location Sharing Endpoints
  // ========================================
  app.post('/api/conversations/:id/location', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await assertCanContact(req.user.id, cid);
    await limit(`location:${req.user.id}`, 20, 60);

    const input = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      address: z.string().max(500).nullable().optional(),
      is_live: z.boolean().default(false),
      live_duration_minutes: z.number().int().min(1).max(480).nullable().optional(),
    }).parse(req.body);

    const result = await transaction(async (c) => {
      // Create message with location
      const messageId = randomUUID();
      const locationId = randomUUID();
      
      let liveUntil = null;
      if (input.is_live && input.live_duration_minutes) {
        liveUntil = new Date(Date.now() + input.live_duration_minutes * 60000);
      }

      // Insert location share record
      await c.query(
        `INSERT INTO location_shares(id, message_id, latitude, longitude, address, is_live, live_until, created_at)
         VALUES($1, $2, $3, $4, $5, $6, $7, now())`,
        [locationId, messageId, input.latitude, input.longitude, input.address || null, input.is_live, liveUntil]
      );

      // Create the message
      const message = await sendMessage(
        c,
        req.user,
        cid,
        {
          text: input.address || `📍 Location: ${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`,
          source_language: 'en',
        }
      );

      // Update message ID in location share
      await c.query('UPDATE location_shares SET message_id=$1 WHERE id=$2', [message.id, locationId]);

      return { ...message, location: { id: locationId, ...input, live_until: liveUntil } };
    });

    res.status(201).json(result);
  });

  app.post('/api/messages/:id/location/update', async (req, res) => {
    const messageId = id.parse(req.params.id);
    await limit(`location-update:${req.user.id}`, 120, 60);

    const input = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }).parse(req.body);

    const location = await one(
      'SELECT ls.*, m.conversation_id, m.sender_id FROM location_shares ls JOIN messages m ON m.id=ls.message_id WHERE ls.message_id=$1',
      [messageId]
    );

    if (!location) throw new HttpError(404, 'Location not found');
    if (location.sender_id !== req.user.id) throw new HttpError(403, 'Only the sender can update live location');
    if (!location.is_live || (location.live_until && new Date(location.live_until) < new Date())) {
      throw new HttpError(400, 'Live location sharing has ended');
    }

    await membership(req.user.id, location.conversation_id);

    await db.query(
      'UPDATE location_shares SET latitude=$1, longitude=$2, updated_at=now() WHERE message_id=$3',
      [input.latitude, input.longitude, messageId]
    );

    // Notify other conversation members
    const peer = await one(
      'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
      [location.conversation_id, req.user.id]
    );
    if (peer && io) {
      io.to(`user:${peer.user_id}`).emit('location:update', {
        message_id: messageId,
        latitude: input.latitude,
        longitude: input.longitude,
      });
    }

    res.json({ ok: true });
  });

  // ========================================
  // Poll Creation Endpoints
  // ========================================
  app.post('/api/conversations/:id/polls', async (req, res) => {
    const cid = id.parse(req.params.id);
    await membership(req.user.id, cid);
    await assertCanContact(req.user.id, cid);
    await limit(`polls:${req.user.id}`, 20, 60);

    const input = z.object({
      question: z.string().trim().min(1).max(200),
      options: z.array(z.string().trim().min(1).max(100)).min(2).max(10),
      multiple_choice: z.boolean().default(false),
      anonymous: z.boolean().default(false),
      ends_at: z.string().datetime().nullable().optional(),
    }).parse(req.body);

    const result = await transaction(async (c) => {
      const pollId = randomUUID();
      const messageId = randomUUID();

      // Create poll
      await c.query(
        `INSERT INTO polls(id, message_id, question, options, multiple_choice, anonymous, ends_at, created_at)
         VALUES($1, $2, $3, $4, $5, $6, $7, now())`,
        [pollId, messageId, input.question, JSON.stringify(input.options), input.multiple_choice, input.anonymous, input.ends_at || null]
      );

      // Create message
      const message = await sendMessage(
        c,
        req.user,
        cid,
        {
          text: `📊 Poll: ${input.question}`,
          source_language: 'en',
        }
      );

      // Update poll message ID
      await c.query('UPDATE polls SET message_id=$1 WHERE id=$2', [message.id, pollId]);

      return { 
        ...message, 
        poll: { 
          id: pollId, 
          question: input.question, 
          options: input.options,
          multiple_choice: input.multiple_choice,
          anonymous: input.anonymous,
          ends_at: input.ends_at,
          results: input.options.map((_, idx) => ({ option_index: idx, count: 0 })),
        } 
      };
    });

    res.status(201).json(result);
  });

  app.post('/api/polls/:id/vote', async (req, res) => {
    const pollId = id.parse(req.params.id);
    await limit(`poll-vote:${req.user.id}`, 60, 60);

    const input = z.object({
      option_indices: z.array(z.number().int().min(0).max(9)).min(1).max(10),
    }).parse(req.body);

    const result = await transaction(async (c) => {
      const poll = await one(
        'SELECT p.*, m.conversation_id FROM polls p JOIN messages m ON m.id=p.message_id WHERE p.id=$1',
        [pollId],
        c
      );

      if (!poll) throw new HttpError(404, 'Poll not found');
      if (poll.ends_at && new Date(poll.ends_at) < new Date()) {
        throw new HttpError(400, 'This poll has ended');
      }

      await membership(req.user.id, poll.conversation_id, c);

      // Check if already voted
      const existingVote = await one(
        'SELECT 1 FROM poll_votes WHERE poll_id=$1 AND user_id=$2',
        [pollId, req.user.id],
        c
      );

      if (existingVote) {
        // Delete old votes and insert new ones
        await c.query('DELETE FROM poll_votes WHERE poll_id=$1 AND user_id=$2', [pollId, req.user.id]);
      }

      // Validate indices
      const options = JSON.parse(poll.options);
      for (const idx of input.option_indices) {
        if (idx >= options.length) throw new HttpError(400, 'Invalid option index');
      }

      // Check multiple choice setting
      if (!poll.multiple_choice && input.option_indices.length > 1) {
        throw new HttpError(400, 'This poll only allows single choice');
      }

      // Insert votes
      for (const idx of input.option_indices) {
        await c.query(
          'INSERT INTO poll_votes(poll_id, user_id, option_index, created_at) VALUES($1, $2, $3, now())',
          [pollId, req.user.id, idx]
        );
      }

      // Get updated results
      const results = (await c.query(
        'SELECT option_index, COUNT(*)::int as count FROM poll_votes WHERE poll_id=$1 GROUP BY option_index ORDER BY option_index',
        [pollId]
      )).rows;

      // Notify other conversation members
      const members = (await c.query(
        'SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2',
        [poll.conversation_id, req.user.id]
      )).rows;

      if (members.length > 0 && io) {
        for (const member of members) {
          io.to(`user:${member.user_id}`).emit('poll:voted', {
            poll_id: pollId,
            voter_name: req.user.name,
            results,
          });
        }
      }

      return { ok: true, results };
    });

    res.json(result);
  });

  app.post('/api/polls/:id/end', async (req, res) => {
    const pollId = id.parse(req.params.id);
    
    const poll = await one(
      'SELECT p.*, m.conversation_id, m.sender_id FROM polls p JOIN messages m ON m.id=p.message_id WHERE p.id=$1',
      [pollId]
    );

    if (!poll) throw new HttpError(404, 'Poll not found');
    await membership(req.user.id, poll.conversation_id);
    
    // Only creator or admin can end poll
    const member = await one(
      'SELECT is_admin FROM members WHERE conversation_id=$1 AND user_id=$2',
      [poll.conversation_id, req.user.id]
    );
    if (poll.sender_id !== req.user.id && (!member || !member.is_admin)) {
      throw new HttpError(403, 'Only the poll creator or group admin can end this poll');
    }

    await db.query('UPDATE polls SET ends_at=now() WHERE id=$1', [pollId]);
    
    res.json({ ok: true });
  });

  app.delete('/api/polls/:id', async (req, res) => {
    const pollId = id.parse(req.params.id);
    
    const poll = await one(
      'SELECT p.*, m.conversation_id, m.sender_id FROM polls p JOIN messages m ON m.id=p.message_id WHERE p.id=$1',
      [pollId]
    );

    if (!poll) throw new HttpError(404, 'Poll not found');
    await membership(req.user.id, poll.conversation_id);
    
    if (poll.sender_id !== req.user.id) {
      throw new HttpError(403, 'Only the poll creator can delete this poll');
    }

    await transaction(async (c) => {
      await c.query('DELETE FROM poll_votes WHERE poll_id=$1', [pollId]);
      await c.query('DELETE FROM polls WHERE id=$1', [pollId]);
      // Optionally delete the message too
      await c.query('UPDATE messages SET deleted_at=now() WHERE id=$1', [poll.message_id]);
    });

    res.json({ ok: true });
  });

  // ========================================
  // Cloud Backup Endpoints
  // ========================================
  app.get('/api/backups', async (req, res) => {
    // Get list of backups for current user
    const result = await db.query(
      `SELECT id, user_id, provider, include_media, size, created_at, status
       FROM chat_backups
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ backups: result.rows });
  });

  app.get('/api/backups/settings', async (req, res) => {
    const settings = await one(
      `SELECT auto_backup, backup_frequency, include_media, backup_provider
       FROM user_backup_settings
       WHERE user_id=$1`,
      [req.user.id]
    );

    res.json(settings || {
      auto_backup: false,
      backup_frequency: 'weekly',
      include_media: true,
      backup_provider: 'local',
    });
  });

  app.put('/api/backups/settings', async (req, res) => {
    const input = z.object({
      auto_backup: z.boolean(),
      backup_frequency: z.enum(['daily', 'weekly', 'monthly']),
      include_media: z.boolean(),
      backup_provider: z.enum(['local', 'google_drive', 'icloud']),
    }).parse(req.body);

    await db.query(
      `INSERT INTO user_backup_settings(user_id, auto_backup, backup_frequency, include_media, backup_provider, updated_at)
       VALUES($1, $2, $3, $4, $5, now())
       ON CONFLICT(user_id) DO UPDATE SET
         auto_backup=EXCLUDED.auto_backup,
         backup_frequency=EXCLUDED.backup_frequency,
         include_media=EXCLUDED.include_media,
         backup_provider=EXCLUDED.backup_provider,
         updated_at=now()`,
      [req.user.id, input.auto_backup, input.backup_frequency, input.include_media, input.backup_provider]
    );

    res.json({ ok: true });
  });

  app.post('/api/backups/create', async (req, res) => {
    await limit(`backup-create:${req.user.id}`, 5, 3600); // 5 backups per hour

    const input = z.object({
      include_media: z.boolean().default(true),
      provider: z.enum(['local', 'google_drive', 'icloud']).default('local'),
    }).parse(req.body);

    const backupId = randomUUID();

    // Get user's conversations
    const conversations = (await db.query(
      `SELECT c.*, array_agg(m.user_id) as member_ids
       FROM conversations c
       JOIN members m ON m.conversation_id=c.id
       WHERE EXISTS(SELECT 1 FROM members WHERE conversation_id=c.id AND user_id=$1)
         AND c.deleted_at IS NULL
       GROUP BY c.id`,
      [req.user.id]
    )).rows;

    // Get messages for each conversation
    const backupData = {
      version: '1.0',
      user_id: req.user.id,
      user_name: req.user.name,
      user_handle: req.user.handle,
      created_at: new Date().toISOString(),
      conversations: [],
    };

    for (const conv of conversations) {
      const messages = (await db.query(
        `SELECT m.*, u.name as sender_name, u.handle as sender_handle,
                a.name as attachment_name, a.mime as attachment_mime, a.size as attachment_size
         FROM messages m
         JOIN users u ON u.id=m.sender_id
         LEFT JOIN attachments a ON a.id=m.attachment_id
         WHERE m.conversation_id=$1 AND m.deleted_at IS NULL
         ORDER BY m.created_at ASC`,
        [conv.id]
      )).rows;

      backupData.conversations.push({
        id: conv.id,
        name: conv.name,
        is_group: conv.direct_key === null,
        created_at: conv.created_at,
        member_count: conv.member_ids.length,
        messages: messages.map(msg => ({
          id: msg.id,
          sender_name: msg.sender_name,
          sender_handle: msg.sender_handle,
          text: msg.text,
          sticker: msg.sticker,
          attachment: msg.attachment_id ? {
            name: msg.attachment_name,
            mime: msg.attachment_mime,
            size: msg.attachment_size,
          } : null,
          created_at: msg.created_at,
          edited_at: msg.edited_at,
        })),
      });
    }

    const backupJson = JSON.stringify(backupData, null, 2);
    const backupSize = Buffer.byteLength(backupJson, 'utf8');

    // Store backup metadata
    await db.query(
      `INSERT INTO chat_backups(id, user_id, provider, include_media, size, status, created_at)
       VALUES($1, $2, $3, $4, $5, 'completed', now())`,
      [backupId, req.user.id, input.provider, input.include_media, backupSize]
    );

    if (input.provider === 'local') {
      // For local, we'll need to store the backup temporarily and allow download
      // In a production app, you'd store this in S3 or similar
      await redis.set(`backup:${backupId}`, backupJson, 'EX', 3600); // Store for 1 hour
    }

    res.json({ 
      ok: true, 
      id: backupId, 
      size: backupSize,
      provider: input.provider,
    });
  });

  app.get('/api/backups/:id/download', async (req, res) => {
    const backupId = id.parse(req.params.id);
    
    const backup = await one(
      'SELECT * FROM chat_backups WHERE id=$1 AND user_id=$2',
      [backupId, req.user.id]
    );

    if (!backup) throw new HttpError(404, 'Backup not found');

    if (backup.provider === 'local') {
      const backupData = await redis.get(`backup:${backupId}`);
      if (!backupData) throw new HttpError(410, 'Backup expired. Please create a new backup.');

      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="kipenzi-backup-${backup.created_at.toISOString().split('T')[0]}.json"`,
      });
      res.send(backupData);
    } else {
      throw new HttpError(501, 'Cloud provider downloads not yet implemented');
    }
  });

  app.post('/api/backups/:id/restore', async (req, _res) => {
    const backupId = id.parse(req.params.id);
    await limit(`backup-restore:${req.user.id}`, 2, 86400); // 2 restores per day

    const backup = await one(
      'SELECT * FROM chat_backups WHERE id=$1 AND user_id=$2',
      [backupId, req.user.id]
    );

    if (!backup) throw new HttpError(404, 'Backup not found');

    // TODO: Implement restore logic
    // This is complex and would require:
    // 1. Parse backup data
    // 2. Match existing conversations or create new ones
    // 3. Restore messages
    // 4. Handle conflicts
    
    throw new HttpError(501, 'Backup restore feature is under development');
  });

  app.delete('/api/backups/:id', async (req, res) => {
    const backupId = id.parse(req.params.id);

    const backup = await one(
      'SELECT * FROM chat_backups WHERE id=$1 AND user_id=$2',
      [backupId, req.user.id]
    );

    if (!backup) throw new HttpError(404, 'Backup not found');

    await db.query('DELETE FROM chat_backups WHERE id=$1', [backupId]);
    
    // Delete from Redis if exists
    if (backup.provider === 'local') {
      await redis.del(`backup:${backupId}`);
    }

    res.json({ ok: true });
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
