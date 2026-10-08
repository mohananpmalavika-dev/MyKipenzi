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
export const enqueue = (client, kind, payload) =>
  client.query('INSERT INTO outbox(kind,payload) VALUES($1,$2)', [kind, JSON.stringify(payload)]);
export async function conversationEvent(client, conversationId, event, data) {
  const members = (
    await client.query('SELECT user_id FROM members WHERE conversation_id=$1', [conversationId])
  ).rows;
  await enqueue(client, 'event', { users: members.map((m) => m.user_id), event, data });
}
export const messageSelect = `SELECT m.*,jsonb_build_object('id',u.id,'name',u.name,'handle',u.handle) AS sender,
 CASE WHEN a.id IS NOT NULL THEN jsonb_build_object('id',a.id,'name',a.name,'mime',a.mime,'size',a.size) ELSE NULL END AS attachment,
 CASE WHEN t.message_id IS NOT NULL THEN jsonb_build_object('language',t.language,'status',t.status,'text',t.text) ELSE NULL END AS translation,
 (SELECT jsonb_build_object('language',recipient.language,'status',rt.status,'text',rt.text)
  FROM members rm JOIN users recipient ON recipient.id=rm.user_id
  JOIN translations rt ON rt.message_id=m.id AND rt.language=recipient.language
  WHERE rm.conversation_id=m.conversation_id AND rm.user_id<>m.sender_id LIMIT 1) AS receiver_translation
 FROM messages m JOIN users u ON u.id=m.sender_id LEFT JOIN attachments a ON a.id=m.attachment_id
 LEFT JOIN translations t ON t.message_id=m.id AND t.language=$2`;
export async function sendMessage(user, input, conversationId) {
  return transaction(async (c) => {
    await membership(user.id, conversationId, c);
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
    }
    const m = await one(
      `INSERT INTO messages(id,conversation_id,sender_id,client_id,text,source_language,sticker,attachment_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        randomUUID(),
        conversationId,
        user.id,
        input.client_id,
        input.text,
        input.source_language,
        input.sticker || null,
        input.attachment_id || null,
      ],
      c,
    );
    await c.query(
      'UPDATE members SET read_seq=GREATEST(read_seq,$3) WHERE conversation_id=$1 AND user_id=$2',
      [conversationId, user.id, m.seq],
    );
    if (m.text && user.ai_consent && config.GEMINI_API_KEY) {
      const recipients = (
        await c.query(
          'SELECT DISTINCT u.id,u.language FROM members mm JOIN users u ON u.id=mm.user_id WHERE mm.conversation_id=$1 AND u.id<>$2 AND u.ai_consent',
          [conversationId, user.id],
        )
      ).rows;
      for (const { id: requester_id, language } of recipients) {
        await c.query('INSERT INTO translations(message_id,language) VALUES($1,$2)', [
          m.id,
          language,
        ]);
        await enqueue(c, 'translate', { message_id: m.id, language, requester_id });
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
    return m;
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
