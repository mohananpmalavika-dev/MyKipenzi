import { randomUUID } from 'node:crypto';
import { db, one, transaction } from './db.js';
import { HttpError } from './security.js';
import { config } from './config.js';
export async function membership(userId, conversationId, client = db) {
  if (
    !(await one(
      'SELECT 1 FROM members WHERE user_id=$1 AND conversation_id=$2',
      [userId, conversationId],
      client,
    ))
  )
    throw new HttpError(404, 'Conversation not found.');
}
export async function assertCanContact(userId, conversationId, client = db) {
  if (await one('SELECT 1 FROM user_blocks b JOIN members m ON m.user_id=CASE WHEN b.blocker_id=$1 THEN b.blocked_id ELSE b.blocker_id END WHERE m.conversation_id=$2 AND (b.blocker_id=$1 OR b.blocked_id=$1)', [userId, conversationId], client)) throw new HttpError(403, 'Contact is unavailable while a user is blocked.');
}
export const enqueue = (client, kind, payload) =>
  client.query('INSERT INTO outbox(kind,payload) VALUES($1,$2)', [kind, JSON.stringify(payload)]);
export async function ensureReaderTranslations(user, messages) {
  if (!user.ai_consent || !config.GEMINI_API_KEY) return;
  const missing = messages.filter(m => !m.deleted_at && m.sender_id !== user.id && !m.translation && (m.text || m.attachment?.mime?.startsWith('audio/') || (/^voice-note-/.test(m.attachment?.name || '') && m.attachment?.mime === 'video/webm')));
  if (!missing.length) return;
  await transaction(async c => {
    for (const m of missing) {
      const result = await c.query('INSERT INTO translations(message_id,language) SELECT m.id,$2 FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1 AND u.ai_consent AND m.deleted_at IS NULL ON CONFLICT DO NOTHING RETURNING message_id', [m.id, user.language]);
      if (result.rowCount) {
        await enqueue(c, 'translate', { message_id: m.id, language: user.language, requester_id: user.id });
        m.translation = { language: user.language, status: 'pending', text: null };
      }
    }
  });
}
export async function conversationEvent(client, conversationId, event, data) {
  const members = (
    await client.query('SELECT user_id FROM members WHERE conversation_id=$1', [conversationId])
  ).rows;
  await enqueue(client, 'event', { users: members.map((m) => m.user_id), event, data });
}
export const messageSelect = `SELECT m.*,jsonb_build_object('id',u.id,'name',u.name,'handle',u.handle) AS sender,
 CASE WHEN a.id IS NOT NULL THEN jsonb_build_object('id',a.id,'name',a.name,'mime',a.mime,'size',a.size) ELSE NULL END AS attachment,
 CASE WHEN t.message_id IS NOT NULL THEN jsonb_build_object('language',t.language,'status',t.status,'text',t.text) ELSE NULL END AS translation,
 (SELECT COALESCE(jsonb_object_agg(t_all.language, jsonb_build_object('status', t_all.status, 'text', t_all.text)), '{}'::jsonb)
  FROM translations t_all WHERE t_all.message_id=m.id) AS translations,
 (SELECT jsonb_build_object('language',recipient.language,'status',rt.status,'text',rt.text)
  FROM members rm JOIN users recipient ON recipient.id=rm.user_id
  JOIN translations rt ON rt.message_id=m.id AND rt.language=recipient.language
  WHERE rm.conversation_id=m.conversation_id AND rm.user_id<>m.sender_id
    AND (SELECT count(*) FROM members WHERE conversation_id=m.conversation_id)=2 LIMIT 1) AS receiver_translation
 ,(SELECT jsonb_build_object('id',r.id,'sender',ru.name,'text',r.text,'sticker',r.sticker,'attachment',r.attachment_id IS NOT NULL,'deleted_at',r.deleted_at)
 FROM messages r JOIN users ru ON ru.id=r.sender_id WHERE r.id=m.reply_to_id AND r.conversation_id=m.conversation_id) AS reply
 ,(SELECT COALESCE(jsonb_object_agg(
   react.emoji,
   jsonb_build_object(
     'count', react.count,
     'users', react.users,
     'reacted', react.reacted
   )
 ), '{}'::jsonb)
  FROM (
    SELECT r.emoji, COUNT(*)::int AS count,
           jsonb_agg(jsonb_build_object('id', ru.id, 'name', ru.name) ORDER BY r.created_at) AS users,
           bool_or(r.user_id = $2) AS reacted
    FROM reactions r
    JOIN users ru ON ru.id = r.user_id
    WHERE r.message_id = m.id
    GROUP BY r.emoji
  ) react
 ) AS reactions
 FROM messages m JOIN users u ON u.id=m.sender_id LEFT JOIN attachments a ON a.id=m.attachment_id
 LEFT JOIN translations t ON t.message_id=m.id AND t.language=$3`;
export async function sendMessage(user, input, conversationId) {
  return transaction(async (c) => {
    await membership(user.id, conversationId, c);
    await assertCanContact(user.id, conversationId, c);
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
      `${user.id}:${input.client_id}`,
    ]);
    const duplicate = await one(
      'SELECT * FROM messages WHERE sender_id=$1 AND client_id=$2',
      [user.id, input.client_id],
      c,
    );
    if (duplicate) {
      if (duplicate.conversation_id !== conversationId)
        throw new HttpError(409, 'Message identifier already used.');
      return duplicate;
    }
    if (input.reply_to_id) {
      const reply = await one('SELECT id FROM messages WHERE id=$1 AND conversation_id=$2 AND deleted_at IS NULL FOR UPDATE', [input.reply_to_id, conversationId], c);
      if (!reply) throw new HttpError(400, 'Reply message is unavailable in this conversation.');
    }
    let isVoiceNote = false;
    if (input.attachment_id) {
      const attachment = await one(
        'SELECT * FROM attachments WHERE id=$1 FOR UPDATE',
        [input.attachment_id],
        c,
      );
      if (
        !attachment ||
        attachment.owner_id !== user.id ||
        attachment.conversation_id !== conversationId ||
        attachment.purpose !== 'chat'
      )
        throw new HttpError(400, 'Invalid attachment.');
      if (await one('SELECT 1 FROM messages WHERE attachment_id=$1', [input.attachment_id], c))
        throw new HttpError(409, 'Attachment already sent.');
      isVoiceNote =
        attachment.mime?.startsWith('audio/') ||
        (/^voice-note-/.test(attachment.name || '') && attachment.mime === 'video/webm');
    }
    const m = await one(
      `INSERT INTO messages(id,conversation_id,sender_id,client_id,text,source_language,sticker,attachment_id,reply_to_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        randomUUID(),
        conversationId,
        user.id,
        input.client_id,
        input.text,
        input.source_language,
        input.sticker || null,
        input.attachment_id || null,
        input.reply_to_id || null,
      ],
      c,
    );
    await c.query(
      'UPDATE members SET read_seq=GREATEST(read_seq,$3) WHERE conversation_id=$1 AND user_id=$2',
      [conversationId, user.id, m.seq],
    );
    if ((m.text || isVoiceNote) && user.ai_consent && config.GEMINI_API_KEY) {
      const recipients = (
        await c.query(
          'SELECT u.language,array_agg(u.id) AS requester_ids FROM members mm JOIN users u ON u.id=mm.user_id WHERE mm.conversation_id=$1 AND u.id<>$2 AND u.ai_consent GROUP BY u.language',
          [conversationId, user.id],
        )
      ).rows;
      for (const { requester_ids, language } of recipients) {
        await c.query('INSERT INTO translations(message_id,language) VALUES($1,$2)', [
          m.id,
          language,
        ]);
        await enqueue(c, 'translate', { message_id: m.id, language, requester_ids });
      }
    }
    await conversationEvent(c, conversationId, 'message:changed', {
      conversation_id: conversationId,
      message_id: m.id,
    });
    const recipients = (await c.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [conversationId, user.id])).rows;
    await enqueue(c, 'event', {
      users: recipients.map(row => row.user_id),
      event: 'message:arrived',
      data: { conversation_id: conversationId, message_id: m.id, sender_id: user.id },
    });
    for (const recipient of recipients)
      await enqueue(c, 'push', { message_id: m.id, user_id: recipient.user_id });
    return m;
  });
}
export async function changeMessage(user, messageId, text) {
  return transaction(async (c) => {
    const m = await one('SELECT * FROM messages WHERE id=$1 FOR UPDATE', [messageId], c);
    if (!m) throw new HttpError(404, 'Message not found.');
    await membership(user.id, m.conversation_id, c);
    if (m.sender_id !== user.id) throw new HttpError(403, 'Only the sender can change this message.');
    if (m.deleted_at) {
      if (text === undefined) return m;
      throw new HttpError(409, 'Message was deleted.');
    }
    if (text !== undefined && !m.text) throw new HttpError(400, 'Only message text can be edited.');
    const result = text === undefined
      ? await one("UPDATE messages SET text='Message deleted',sticker=NULL,attachment_id=NULL,deleted_at=now() WHERE id=$1 RETURNING *", [messageId], c)
      : await one('UPDATE messages SET text=$2,edited_at=clock_timestamp() WHERE id=$1 RETURNING *', [messageId, text], c);
    await c.query('DELETE FROM translations WHERE message_id=$1', [messageId]);
    await c.query('DELETE FROM media_jobs WHERE message_id=$1', [messageId]);
    if (text !== undefined && user.ai_consent && config.GEMINI_API_KEY) {
      const recipients = (await c.query('SELECT u.language,array_agg(u.id) AS requester_ids FROM members mm JOIN users u ON u.id=mm.user_id WHERE mm.conversation_id=$1 AND u.id<>$2 AND u.ai_consent GROUP BY u.language', [m.conversation_id, user.id])).rows;
      for (const { requester_ids, language } of recipients) {
        await c.query('INSERT INTO translations(message_id,language) VALUES($1,$2) ON CONFLICT DO NOTHING', [messageId, language]);
        await enqueue(c, 'translate', { message_id: messageId, language, requester_ids });
      }
    }
    await conversationEvent(c, m.conversation_id, 'message:changed', { conversation_id: m.conversation_id, message_id: messageId });
    // Refresh quoted replies too, including replies outside the latest history page.
    const replies = (await c.query('SELECT id FROM messages WHERE reply_to_id=$1', [messageId])).rows;
    for (const reply of replies) await conversationEvent(c, m.conversation_id, 'message:changed', { conversation_id: m.conversation_id, message_id: reply.id });
    return result;
  });
}
export async function changeCall(userId, callId, action) {
  return transaction(async (c) => {
    const call = await one(
      'SELECT * FROM calls WHERE id=$1 AND (caller_id=$2 OR callee_id=$2) FOR UPDATE',
      [callId, userId],
      c,
    );
    if (!call) throw new HttpError(404, 'Call not found.');
    if (action === 'accept') {
      await assertCanContact(userId, call.conversation_id, c);
      if (call.callee_id !== userId || call.state !== 'ringing')
        throw new HttpError(409, 'Call cannot be accepted.');
      if (Date.now() - new Date(call.created_at).getTime() > 45000)
        throw new HttpError(409, 'Call expired.');
      call.state = 'active';
      await c.query("UPDATE calls SET state='active',accepted_at=now() WHERE id=$1", [callId]);
    } else if (action === 'decline') {
      if (call.callee_id !== userId || call.state !== 'ringing')
        throw new HttpError(409, 'Call cannot be declined.');
      call.state = 'declined';
    } else {
      if (['ended', 'declined', 'missed'].includes(call.state)) return call;
      call.state = 'ended';
    }
    if (call.state !== 'active') {
      await c.query('UPDATE calls SET state=$2,ended_at=now() WHERE id=$1', [callId, call.state]);
      await c.query('DELETE FROM call_locks WHERE call_id=$1', [callId]);
    }
    await conversationEvent(c, call.conversation_id, 'call:changed', call);
    return call;
  });
}

export async function toggleReaction(user, messageId, emoji) {
  return transaction(async (c) => {
    const m = await one('SELECT * FROM messages WHERE id=$1', [messageId], c);
    if (!m) throw new HttpError(404, 'Message not found.');
    await membership(user.id, m.conversation_id, c);
    if (m.deleted_at) throw new HttpError(400, 'Cannot react to deleted message.');
    
    const existing = await one(
      'SELECT 1 FROM reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
      [messageId, user.id, emoji],
      c,
    );
    
    if (existing) {
      await c.query(
        'DELETE FROM reactions WHERE message_id=$1 AND user_id=$2 AND emoji=$3',
        [messageId, user.id, emoji],
      );
    } else {
      await c.query(
        'INSERT INTO reactions(message_id, user_id, emoji) VALUES($1, $2, $3)',
        [messageId, user.id, emoji],
      );
    }
    
    await conversationEvent(c, m.conversation_id, 'message:changed', {
      conversation_id: m.conversation_id,
      message_id: messageId,
    });
    
    return { removed: !!existing };
  });
}
