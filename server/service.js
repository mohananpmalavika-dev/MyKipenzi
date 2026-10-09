import { supportsViewOnce } from '../shared/viewOnce.js';
import { hasExpired } from '../shared/disappearing.js';
import { canDeleteForEveryone } from '../shared/messageStatus.js';
import { randomUUID } from 'node:crypto';
import { db, one, transaction } from './db.js';
import { HttpError } from './security.js';
import { config } from './config.js';
import { getCachedTranslation } from './providers.js';
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
      const trimmed = (m.text || '').trim();
      const isTargetMalayalam = user.language === 'ml';
      const isPureMalayalam = isTargetMalayalam && /\p{sc=Malayalam}/u.test(trimmed) && !/[a-zA-Z]/.test(trimmed);
      const isPureEmojiOrSymbols = !/[a-zA-Z]/i.test(trimmed) && !/\p{sc=Malayalam}/u.test(trimmed);
      const isSame = m.source_language === user.language || isPureMalayalam || isPureEmojiOrSymbols;
      const cached = !m.attachment && !isSame ? getCachedTranslation(m.text, m.source_language, user.language) : null;

      if (isSame || cached) {
        const readyText = isSame ? m.text : cached;
        const result = await c.query("INSERT INTO translations(message_id,language,status,text) SELECT m.id,$2,'ready',$3 FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1 AND u.ai_consent AND m.deleted_at IS NULL ON CONFLICT(message_id,language) DO UPDATE SET status='ready',text=EXCLUDED.text RETURNING message_id", [m.id, user.language, readyText]);
        if (result.rowCount) {
          m.translation = { language: user.language, status: 'ready', text: readyText };
        }
      } else {
        const result = await c.query('INSERT INTO translations(message_id,language) SELECT m.id,$2 FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1 AND u.ai_consent AND m.deleted_at IS NULL ON CONFLICT DO NOTHING RETURNING message_id', [m.id, user.language]);
        if (result.rowCount) {
          await enqueue(c, 'translate', { message_id: m.id, language: user.language, requester_id: user.id });
          m.translation = { language: user.language, status: 'pending', text: null };
        }
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
export const messageSelect = `SELECT m.*,
 (SELECT count(*)::int FROM messages children WHERE children.reply_to_id=m.id AND children.conversation_id=m.conversation_id AND children.deleted_at IS NULL AND (children.expires_at IS NULL OR children.expires_at>now())) AS reply_count,
 EXISTS(SELECT 1 FROM message_stars ms WHERE ms.message_id=m.id AND ms.user_id=$3::uuid) AS starred,
 EXISTS(SELECT 1 FROM message_pins mp WHERE mp.message_id=m.id) AS pinned,jsonb_build_object('id',u.id,'name',u.name,'handle',u.handle) AS sender,
 CASE WHEN a.id IS NOT NULL AND a.expired_at IS NULL THEN jsonb_build_object('id',a.id,'name',a.name,'mime',a.mime,'size',a.size,'view_once',m.view_once) ELSE NULL END AS attachment,
 CASE WHEN t.message_id IS NOT NULL THEN jsonb_build_object('language',t.language,'status',t.status,'text',t.text) ELSE NULL END AS translation,
 (SELECT COALESCE(jsonb_object_agg(t_all.language, jsonb_build_object('status', t_all.status, 'text', t_all.text)), '{}'::jsonb)
  FROM translations t_all WHERE t_all.message_id=m.id) AS translations,
 (SELECT jsonb_build_object('language',recipient.language,'status',rt.status,'text',rt.text)
  FROM members rm JOIN users recipient ON recipient.id=rm.user_id
  JOIN translations rt ON rt.message_id=m.id AND rt.language=recipient.language
  WHERE rm.conversation_id=m.conversation_id AND rm.user_id<>m.sender_id
    AND (SELECT count(*) FROM members WHERE conversation_id=m.conversation_id)=2 LIMIT 1) AS receiver_translation
 ,(SELECT jsonb_build_object('id',r.id,'sender',ru.name,'text',r.text,'sticker',r.sticker,'attachment',r.attachment_id IS NOT NULL,'deleted_at',r.deleted_at,'expires_at',r.expires_at)
 FROM messages r JOIN users ru ON ru.id=r.sender_id WHERE r.id=m.reply_to_id AND r.conversation_id=m.conversation_id AND (r.expires_at IS NULL OR r.expires_at>now())) AS reply
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
           bool_or(r.user_id = $3::uuid) AS reacted
    FROM reactions r
    JOIN users ru ON ru.id = r.user_id
    WHERE r.message_id = m.id
    GROUP BY r.emoji
  ) react
 ) AS reactions
 ,(SELECT jsonb_build_object('id',fm.id,'sender_id',fm.sender_id,'sender_name',fmu.name,'text',fm.text,'sticker',fm.sticker,'has_attachment',fm.attachment_id IS NOT NULL)
 FROM messages fm JOIN users fmu ON fmu.id=fm.sender_id WHERE fm.id=m.forwarded_from_id) AS forwarded_from
 FROM (SELECT * FROM messages WHERE expires_at IS NULL OR expires_at>now()) m JOIN users u ON u.id=m.sender_id LEFT JOIN attachments a ON a.id=m.attachment_id
 LEFT JOIN translations t ON t.message_id=m.id AND t.language=$2::text`;
export async function sendMessage(user, input, conversationId, client) {
  const deliver = async (c) => {
    await membership(user.id, conversationId, c);
    await assertCanContact(user.id, conversationId, c);
    
    // Check if user has permission to send messages in groups
    const member = await one(
      'SELECT m.can_send_messages, c.direct_key IS NULL as is_group FROM members m JOIN conversations c ON c.id=m.conversation_id WHERE m.user_id=$1 AND m.conversation_id=$2',
      [user.id, conversationId],
      c,
    );
    if (member.is_group && !member.can_send_messages) {
      throw new HttpError(403, 'You do not have permission to send messages in this group.');
    }
    
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
      if (hasExpired(duplicate)) throw new HttpError(409, 'Message has expired.');
      return duplicate;
    }
    if (input.reply_to_id) {
      const reply = await one('SELECT id FROM messages WHERE id=$1 AND conversation_id=$2 AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at>now()) FOR UPDATE', [input.reply_to_id, conversationId], c);
      if (!reply) throw new HttpError(400, 'Reply message is unavailable in this conversation.');
    }
    if (input.view_once && (member.is_group || !input.attachment_id || input.text || input.sticker))
      throw new HttpError(400, 'View-once photos and videos are available in partner chats without captions or stickers.');
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
        attachment.purpose !== 'chat' || attachment.expired_at
      )
        throw new HttpError(400, 'Invalid attachment.');
      if (await one('SELECT 1 FROM messages WHERE attachment_id=$1', [input.attachment_id], c))
        throw new HttpError(409, 'Attachment already sent.');
      if (input.view_once && !supportsViewOnce(attachment))
        throw new HttpError(400, 'View once supports photos and videos only.');
      isVoiceNote =
        attachment.mime?.startsWith('audio/') ||
        (/^voice-note-/.test(attachment.name || '') && attachment.mime === 'video/webm');
    }
    const m = await one(
      `INSERT INTO messages(id,conversation_id,sender_id,client_id,text,source_language,sticker,attachment_id,reply_to_id,view_once,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$11,(SELECT CASE WHEN seconds=0 THEN NULL ELSE now()+make_interval(secs=>seconds) END FROM (SELECT CASE WHEN disappearing_seconds>0 AND $10::int>0 THEN least(disappearing_seconds,$10::int) ELSE coalesce(nullif($10::int,0),disappearing_seconds) END AS seconds FROM conversations WHERE id=$2) timer)) RETURNING *`,
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
        input.expires_in_seconds || null,
        input.view_once || false,
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
        const trimmed = (m.text || '').trim();
        const isTargetMalayalam = language === 'ml';
        const isPureMalayalam = isTargetMalayalam && /\p{sc=Malayalam}/u.test(trimmed) && !/[a-zA-Z]/.test(trimmed);
        const isPureEmojiOrSymbols = !/[a-zA-Z]/i.test(trimmed) && !/\p{sc=Malayalam}/u.test(trimmed);
        const isSame = m.source_language === language || isPureMalayalam || isPureEmojiOrSymbols;
        const cached = !isVoiceNote && !isSame ? getCachedTranslation(m.text, m.source_language, language) : null;

        if (isSame || cached) {
          const readyText = isSame ? m.text : cached;
          await c.query("INSERT INTO translations(message_id,language,status,text) VALUES($1,$2,'ready',$3) ON CONFLICT(message_id,language) DO UPDATE SET status='ready',text=EXCLUDED.text", [
            m.id,
            language,
            readyText,
          ]);
        } else {
          await c.query('INSERT INTO translations(message_id,language) VALUES($1,$2) ON CONFLICT DO NOTHING', [
            m.id,
            language,
          ]);
          await enqueue(c, 'translate', { message_id: m.id, language, requester_ids });
        }
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
  };
  return client ? deliver(client) : transaction(deliver);
}
export async function changeMessage(user, messageId, text) {
  return transaction(async (c) => {
    const m = await one('SELECT * FROM messages WHERE id=$1 FOR UPDATE', [messageId], c);
    if (!m || hasExpired(m)) throw new HttpError(404, 'Message not found.');
    await membership(user.id, m.conversation_id, c);
    if (m.sender_id !== user.id) throw new HttpError(403, 'Only the sender can change this message.');
    if (m.deleted_at) {
      if (text === undefined) return m;
      throw new HttpError(409, 'Message was deleted.');
    }
    if (text !== undefined && !m.text) throw new HttpError(400, 'Only message text can be edited.');
    if (text === undefined && !canDeleteForEveryone(m)) throw new HttpError(409, 'Messages can only be deleted for everyone within 24 hours of sending.');
    if (text !== undefined && text === m.text) return m;
    if (text !== undefined) await c.query('INSERT INTO message_edit_history(message_id,text,edited_at) VALUES($1,$2,$3)', [m.id, m.text, m.edited_at || m.created_at]);
    const result = text === undefined
      ? await one("UPDATE messages SET text='Message deleted',sticker=NULL,attachment_id=NULL,deleted_at=now() WHERE id=$1 RETURNING *", [messageId], c)
      : await one('UPDATE messages SET text=$2,edited_at=clock_timestamp() WHERE id=$1 RETURNING *', [messageId, text], c);
    if (text === undefined) {
      await c.query('DELETE FROM message_edit_history WHERE message_id=$1', [messageId]);
      await c.query('DELETE FROM reactions WHERE message_id=$1', [messageId]);
      await c.query('DELETE FROM message_stars WHERE message_id=$1', [messageId]);
      await c.query('DELETE FROM message_pins WHERE message_id=$1', [messageId]);
      if (m.attachment_id && !(await one('SELECT 1 FROM messages WHERE attachment_id=$1 AND id<>$2 AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at>now())', [m.attachment_id, m.id], c))) {
        const attachment = await one('UPDATE attachments SET expired_at=now() WHERE id=$1 RETURNING object_key', [m.attachment_id], c);
        if (attachment) await enqueue(c, 'delete_object', { key: attachment.object_key });
      }
    }
    const mediaObjects = (await c.query('SELECT object_key FROM media_jobs WHERE message_id=$1 AND object_key IS NOT NULL', [messageId])).rows;
    for (const object of mediaObjects) await enqueue(c, 'delete_object', { key: object.object_key });
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
    if (!m || hasExpired(m)) throw new HttpError(404, 'Message not found.');
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

export async function saveMessage(user, messageId, kind, enabled) {
  return transaction(async c => {
    const message = await one('SELECT * FROM messages WHERE id=$1 FOR UPDATE', [messageId], c);
    if (!message || hasExpired(message)) throw new HttpError(404,'Message not found.');
    await membership(user.id,message.conversation_id,c);
    if (message.deleted_at) throw new HttpError(409,'Deleted messages cannot be saved.');
    if (message.view_once) throw new HttpError(403, 'View-once media cannot be starred or pinned.');
    if (kind==='pin') {
      await assertCanContact(user.id,message.conversation_id,c);
      if (enabled) await c.query('INSERT INTO message_pins(message_id,pinned_by) VALUES($1,$2) ON CONFLICT DO NOTHING',[messageId,user.id]);
      else await c.query('DELETE FROM message_pins WHERE message_id=$1',[messageId]);
      await conversationEvent(c,message.conversation_id,'message:changed',{conversation_id:message.conversation_id,message_id:messageId});
    } else {
      if (enabled) await c.query('INSERT INTO message_stars(message_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[messageId,user.id]);
      else await c.query('DELETE FROM message_stars WHERE message_id=$1 AND user_id=$2',[messageId,user.id]);
      await enqueue(c,'event',{users:[user.id],event:'message:changed',data:{conversation_id:message.conversation_id,message_id:messageId}});
    }
    return { [kind==='pin'?'pinned':'starred']:enabled };
  });
}

export async function forwardMessage(user, messageId, targetConversationId, caption) {
  return transaction(async (c) => {
    // Get original message
    const original = await one('SELECT * FROM messages WHERE id=$1', [messageId], c);
    if (!original || hasExpired(original)) throw new HttpError(404, 'Message not found.');
    if (original.deleted_at) throw new HttpError(400, 'Cannot forward deleted messages.');
    
    // Check user has access to original message
    await membership(user.id, original.conversation_id, c);
    if (original.view_once) throw new HttpError(403, 'View-once media cannot be forwarded.');
    
    // Check user has access to target conversation and can send messages
    await membership(user.id, targetConversationId, c);
    await assertCanContact(user.id, targetConversationId, c);
    
    // Check if user has permission to send messages in target group
    const member = await one(
      'SELECT m.can_send_messages, c.direct_key IS NULL as is_group FROM members m JOIN conversations c ON c.id=m.conversation_id WHERE m.user_id=$1 AND m.conversation_id=$2',
      [user.id, targetConversationId],
      c,
    );
    if (member.is_group && !member.can_send_messages) {
      throw new HttpError(403, 'You do not have permission to send messages in this group.');
    }
    
    // Cannot forward to same conversation
    if (original.conversation_id === targetConversationId) {
      throw new HttpError(400, 'Cannot forward a message to the same conversation.');
    }
    
    // Create forwarded message
    const forwardedId = randomUUID();
    const clientId = randomUUID();
    
    const forwarded = await one(
      `INSERT INTO messages(id,conversation_id,sender_id,client_id,text,source_language,sticker,attachment_id,forwarded_from_id,expires_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,(SELECT CASE WHEN disappearing_seconds=0 THEN NULL ELSE now()+make_interval(secs=>disappearing_seconds) END FROM conversations WHERE id=$2))
       RETURNING *`,
      [
        forwardedId,
        targetConversationId,
        user.id,
        clientId,
        caption || original.text,
        user.language || 'auto',
        original.sticker || null,
        original.attachment_id || null,
        messageId,
      ],
      c,
    );
    
    // Mark sender as read
    await c.query(
      'UPDATE members SET read_seq=GREATEST(read_seq,$3) WHERE conversation_id=$1 AND user_id=$2',
      [targetConversationId, user.id, forwarded.seq],
    );
    
    // Request translations if needed
    const isVoiceNote = original.attachment_id && await one(
      'SELECT mime,name FROM attachments WHERE id=$1 AND (mime LIKE \'audio/%\' OR (name LIKE \'voice-note-%\' AND mime=\'video/webm\'))',
      [original.attachment_id],
      c
    );
    
    if ((forwarded.text || isVoiceNote) && user.ai_consent && config.GEMINI_API_KEY) {
      const recipients = (
        await c.query(
          'SELECT u.language,array_agg(u.id) AS requester_ids FROM members mm JOIN users u ON u.id=mm.user_id WHERE mm.conversation_id=$1 AND u.id<>$2 AND u.ai_consent GROUP BY u.language',
          [targetConversationId, user.id],
        )
      ).rows;
      for (const { requester_ids, language } of recipients) {
        await c.query('INSERT INTO translations(message_id,language) VALUES($1,$2)', [
          forwarded.id,
          language,
        ]);
        await enqueue(c, 'translate', { message_id: forwarded.id, language, requester_ids });
      }
    }
    
    // Notify conversation
    await conversationEvent(c, targetConversationId, 'message:changed', {
      conversation_id: targetConversationId,
      message_id: forwarded.id,
    });
    
    // Send arrival notifications
    const recipients = (await c.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [targetConversationId, user.id])).rows;
    await enqueue(c, 'event', {
      users: recipients.map(row => row.user_id),
      event: 'message:arrived',
      data: { conversation_id: targetConversationId, message_id: forwarded.id, sender_id: user.id },
    });
    for (const recipient of recipients)
      await enqueue(c, 'push', { message_id: forwarded.id, user_id: recipient.user_id });
    
    return forwarded;
  });
}
