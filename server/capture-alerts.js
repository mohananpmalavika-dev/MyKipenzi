import { randomUUID } from 'node:crypto';
import { db, one, transaction } from './db.js';
import { membership, assertCanContact, enqueue } from './service.js';
import { HttpError } from './security.js';
import { captureInput } from '../shared/captureAlerts.js';

async function requirePrivateChat(userId, cid, client = db) {
  await membership(userId, cid, client);
  await assertCanContact(userId, cid, client);
  const conversation = await one('SELECT direct_key FROM conversations WHERE id=$1', [cid], client);
  if (!conversation?.direct_key) throw new HttpError(400, 'Capture alerts are available in private partner chats.');
}
export async function reportCapture(user, cid, body) {
  const input = captureInput.parse(body);
  return transaction(async client => {
    await requirePrivateChat(user.id, cid, client);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`capture:${user.id}:${input.client_id}`]);
    const previous = await one('SELECT * FROM capture_alerts WHERE sender_id=$1 AND client_id=$2', [user.id, input.client_id], client);
    if (previous) {
      if (previous.conversation_id !== cid || previous.kind !== input.kind || (previous.message_id || null) !== (input.message_id || null))
        throw new HttpError(409, 'Capture identifier already used.');
      return { alert: { ...previous, sender_name: user.name }, duplicate: true };
    }
    if (input.kind === 'screen_sharing') {
      const call = await one(
        "SELECT id FROM calls WHERE conversation_id=$1 AND state='active' AND ($2=caller_id OR $2=callee_id)", [cid, user.id], client,
      );
      if (!call) throw new HttpError(400, 'Screen sharing alerts require an active call.');
    }
    if (input.message_id) {
      const media = await one(
        'SELECT id FROM messages WHERE id=$1 AND conversation_id=$2 AND view_once AND sender_id<>$3 AND view_once_opened_at IS NOT NULL AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at>now())',
        [input.message_id, cid, user.id], client,
      );
      if (!media) throw new HttpError(400, 'The view-once media is not available in this conversation.');
    }
    const alert = await one(
      'INSERT INTO capture_alerts(id,conversation_id,sender_id,client_id,kind,context,message_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [randomUUID(), cid, user.id, input.client_id, input.kind, input.message_id ? 'view_once' : 'chat', input.message_id || null], client,
    );
    const recipients = (await client.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [cid, user.id])).rows;
    await enqueue(client, 'event', { users: recipients.map(r => r.user_id), event: 'privacy:capture', data: { id: alert.id, conversation_id: cid, sender_id: user.id } });
    for (const recipient of recipients) await enqueue(client, 'capture_push', { alert_id: alert.id, user_id: recipient.user_id });
    return { alert: { ...alert, sender_name: user.name }, duplicate: false };
  });
}
export async function captureAlert(userId, alertId) {
  const alert = await one('SELECT ca.*, u.name AS sender_name FROM capture_alerts ca JOIN users u ON u.id=ca.sender_id WHERE ca.id=$1', [alertId]);
  if (!alert) throw new HttpError(404, 'Capture alert not found.');
  await requirePrivateChat(userId, alert.conversation_id);
  return alert;
}
export async function captureHistory(userId, cid) {
  await requirePrivateChat(userId, cid);
  return (await db.query('SELECT ca.*, u.name AS sender_name FROM capture_alerts ca JOIN users u ON u.id=ca.sender_id WHERE ca.conversation_id=$1 ORDER BY ca.created_at DESC,ca.id LIMIT 30', [cid])).rows;
}
