import { db, one, transaction } from './db.js';
import { membership, assertCanContact, conversationEvent, enqueue } from './service.js';
import { HttpError } from './security.js';
import { moodInput } from '../shared/moods.js';

async function requirePartner(userId, conversationId, client = db) {
  await membership(userId, conversationId, client);
  await assertCanContact(userId, conversationId, client);
  const conversation = await one('SELECT direct_key FROM conversations WHERE id=$1', [conversationId], client);
  if (!conversation?.direct_key) throw new HttpError(400, 'Mood check-ins are available in private partner chats.');
}
export async function readMoods(userId, conversationId) {
  await requirePartner(userId, conversationId);
  return (await db.query('SELECT mc.*, u.name AS sender_name FROM mood_check_ins mc JOIN users u ON u.id=mc.user_id WHERE mc.conversation_id=$1 AND mc.expires_at>now()', [conversationId])).rows;
}
export async function shareMood(user, conversationId, body) {
  const input = moodInput.parse(body);
  return transaction(async client => {
    await requirePartner(user.id, conversationId, client);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`mood:${conversationId}:${user.id}`]);
    const previous = await one('SELECT *, expires_at>now() AS active FROM mood_check_ins WHERE conversation_id=$1 AND user_id=$2', [conversationId, user.id], client);
    if (previous?.active && previous.mood === input.mood) return { status: previous, changed: false };
    const status = await one(
      `INSERT INTO mood_check_ins(conversation_id,user_id,mood) VALUES($1,$2,$3)
       ON CONFLICT(conversation_id,user_id) DO UPDATE SET mood=EXCLUDED.mood,
       revision=mood_check_ins.revision+1, updated_at=now(), expires_at=now()+interval '24 hours'
       RETURNING *`, [conversationId, user.id, input.mood], client,
    );
    await conversationEvent(client, conversationId, 'mood:changed', { ...status, sender_name: user.name });
    const recipients = (await client.query('SELECT user_id FROM members WHERE conversation_id=$1 AND user_id<>$2', [conversationId, user.id])).rows;
    for (const recipient of recipients) await enqueue(client, 'mood_push', {
      conversation_id: conversationId, sender_id: user.id, user_id: recipient.user_id, revision: status.revision,
    });
    return { status, changed: true };
  });
}
