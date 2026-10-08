import { randomUUID } from 'node:crypto';
import { one, transaction } from './db.js';
import { HttpError } from './security.js';
import { membership, assertCanContact, enqueue, sendMessage } from './service.js';
import { validateDelivery } from '../shared/scheduling.js';

async function canSchedule(user, cid, c) {
  await membership(user.id, cid, c);
  await assertCanContact(user.id, cid, c);
  const member = await one('SELECT m.can_send_messages,c.direct_key IS NULL AS is_group FROM members m JOIN conversations c ON c.id=m.conversation_id WHERE m.user_id=$1 AND m.conversation_id=$2', [user.id, cid], c);
  if (member.is_group && !member.can_send_messages) throw new HttpError(403, 'You do not have permission to send messages in this group.');
}
const changed = (c, row, event = 'schedule:changed') => enqueue(c, 'event', {
  users: [row.sender_id], event,
  data: { id: row.id, conversation_id: row.conversation_id, status: row.status, delivery_at: row.delivery_at, time_zone: row.time_zone },
});
function checkTime(input) {
  try { validateDelivery(input); } catch (error) { throw new HttpError(400, error.message); }
}

export async function createSchedule(user, cid, input) {
  return transaction(async (c) => {
    await canSchedule(user, cid, c);
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`schedule:${user.id}`]);
    const duplicate = await one('SELECT * FROM scheduled_messages WHERE sender_id=$1 AND client_id=$2', [user.id, input.client_id], c);
    if (duplicate) {
      if (duplicate.conversation_id !== cid) throw new HttpError(409, 'Schedule identifier already used.');
      return duplicate;
    }
    checkTime(input);
    const count = await one("SELECT count(*)::int AS count FROM scheduled_messages WHERE sender_id=$1 AND status='pending'", [user.id], c);
    if (count.count >= 100) throw new HttpError(400, 'You can have up to 100 pending scheduled messages.');
    const row = await one(`INSERT INTO scheduled_messages(id,sender_id,conversation_id,client_id,text,source_language,delivery_at,time_zone,reminder_minutes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [randomUUID(), user.id, cid, input.client_id, input.text, input.source_language, input.delivery_at, input.time_zone, input.reminder_minutes], c);
    await changed(c, row);
    return row;
  });
}

export async function changeSchedule(user, scheduleId, input) {
  return transaction(async (c) => {
    const row = await one('SELECT * FROM scheduled_messages WHERE id=$1 AND sender_id=$2 FOR UPDATE', [scheduleId, user.id], c);
    if (!row) throw new HttpError(404, 'Scheduled message not found.');
    await membership(user.id, row.conversation_id, c);
    if (row.status !== 'pending') throw new HttpError(409, 'This scheduled message is no longer pending.');
    if (input && input.revision !== row.revision) throw new HttpError(409, 'This schedule changed on another device. Refresh and try again.');
    let updated;
    if (input) {
      await canSchedule(user, row.conversation_id, c);
      checkTime(input);
      updated = await one(`UPDATE scheduled_messages SET text=$2,source_language=$3,delivery_at=$4,time_zone=$5,reminder_minutes=$6,reminder_sent_at=NULL,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *`, [row.id, input.text, input.source_language, input.delivery_at, input.time_zone, input.reminder_minutes], c);
    } else updated = await one("UPDATE scheduled_messages SET status='cancelled',revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *", [row.id], c);
    await changed(c, updated);
    return updated;
  });
}

export async function processSchedules() {
  await transaction(async (c) => {
    const rows = (await c.query("SELECT * FROM scheduled_messages WHERE status='pending' AND delivery_at<=now() ORDER BY delivery_at LIMIT 20 FOR UPDATE SKIP LOCKED")).rows;
    for (const row of rows) {
      await c.query('SAVEPOINT scheduled_delivery');
      let updated;
      try {
        const user = await one('SELECT * FROM users WHERE id=$1', [row.sender_id], c);
        const message = await sendMessage(user, { client_id: row.id, text: row.text, source_language: row.source_language }, row.conversation_id, c);
        updated = await one("UPDATE scheduled_messages SET status='sent',message_id=$2,updated_at=now() WHERE id=$1 RETURNING *", [row.id, message.id], c);
      } catch (error) {
        await c.query('ROLLBACK TO SAVEPOINT scheduled_delivery');
        if (!(error instanceof HttpError)) throw error;
        updated = await one("UPDATE scheduled_messages SET status='failed',error=$2,updated_at=now() WHERE id=$1 RETURNING *", [row.id, error.message], c);
      }
      await c.query('RELEASE SAVEPOINT scheduled_delivery');
      await changed(c, updated);
    }
    const reminders = (await c.query("UPDATE scheduled_messages SET reminder_sent_at=now() WHERE id IN (SELECT id FROM scheduled_messages WHERE status='pending' AND reminder_minutes>0 AND reminder_sent_at IS NULL AND delivery_at>now() AND delivery_at-make_interval(mins=>reminder_minutes)<=now() ORDER BY delivery_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING *")).rows;
    for (const row of reminders) {
      await changed(c, row, 'schedule:reminder');
      await enqueue(c, 'schedule_push', { id: row.id, revision: row.revision });
    }
  });
}
