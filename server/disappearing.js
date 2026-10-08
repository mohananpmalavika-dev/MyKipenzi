import { one } from './db.js';
import { conversationEvent, enqueue } from './service.js';
export async function expireMessages(client) {
 const rows=(await client.query('SELECT * FROM messages WHERE expires_at<=now() AND NOT expiry_processed ORDER BY expires_at LIMIT 100 FOR UPDATE SKIP LOCKED')).rows;
 for(const m of rows) {
  if(m.attachment_id) {
   const attachment=await one('UPDATE attachments SET expired_at=now() WHERE id=$1 RETURNING object_key',[m.attachment_id],client);
   if(attachment) await enqueue(client,'delete_object',{key:attachment.object_key});
  }
  const media=(await client.query('SELECT object_key FROM media_jobs WHERE message_id=$1 AND object_key IS NOT NULL',[m.id])).rows;
  for(const item of media) await enqueue(client,'delete_object',{key:item.object_key});
  await client.query('DELETE FROM translations WHERE message_id=$1',[m.id]);
  await client.query('DELETE FROM media_jobs WHERE message_id=$1',[m.id]);
  await client.query('DELETE FROM message_stars WHERE message_id=$1',[m.id]);
  await client.query('DELETE FROM message_pins WHERE message_id=$1',[m.id]);
  await client.query('DELETE FROM reactions WHERE message_id=$1',[m.id]);
  await client.query("UPDATE messages SET text='Message expired',sticker=NULL,attachment_id=NULL,reply_to_id=NULL,deleted_at=now(),expiry_processed=true WHERE id=$1",[m.id]);
  await conversationEvent(client,m.conversation_id,'message:expired',{conversation_id:m.conversation_id,message_id:m.id});
 }
 return rows.length;
}
