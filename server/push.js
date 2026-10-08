import webpush from 'web-push';
import { config } from './config.js';
import { db } from './db.js';
import { messageSelect } from './service.js';
import { messagePreview } from '../shared/notifications.js';
import { pushEndpoint } from '../shared/push.js';

export const pushEnabled = Boolean(config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY);

export async function deliverMessagePush({ message_id, user_id }, attempt = 0, send = webpush.sendNotification.bind(webpush)) {
  if (!pushEnabled) return;
  const recipient = (await db.query(
    "SELECT u.language FROM users u JOIN members mm ON mm.user_id=u.id JOIN messages m ON m.conversation_id=mm.conversation_id WHERE u.id=$1 AND m.id=$2 AND m.sender_id<>u.id AND mm.read_seq<m.seq AND m.created_at>now()-interval '5 minutes' AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=u.id AND b.blocked_id=m.sender_id) OR (b.blocker_id=m.sender_id AND b.blocked_id=u.id))",
    [user_id, message_id],
  )).rows[0];
  if (!recipient) return;
  const subscriptions = (await db.query(
    'SELECT p.* FROM push_subscriptions p JOIN sessions s ON s.token_hash=p.session_token_hash AND s.user_id=p.user_id WHERE p.user_id=$1 AND s.expires_at>now()', [user_id],
  )).rows;
  if (!subscriptions.length) return;
  const message = (await db.query(`${messageSelect} WHERE m.id=$1`, [message_id, user_id, recipient.language])).rows[0];
  if (!message || message.deleted_at) return;
  if (message.translation?.status === 'pending' && attempt < 2) throw new Error('Waiting for translated notification preview.');
  const payload = JSON.stringify({
    title: message.sender?.name || 'Kipenzi',
    body: messagePreview({ ...message, translation: message.translation?.status === 'pending' ? null : message.translation }),
    tag: `kipenzi-message-${message.id}`,
    data: { conversation_id: message.conversation_id, message_id: message.id, user_id },
  });
  let retry = false;
  for (const subscription of subscriptions) {
    if (!pushEndpoint.safeParse(subscription.endpoint).success) continue;
    try {
      await send({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, {
        TTL: 300, urgency: 'high', timeout: 10000,
        vapidDetails: { subject: config.APP_ORIGIN, publicKey: config.VAPID_PUBLIC_KEY, privateKey: config.VAPID_PRIVATE_KEY },
      });
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410)
        await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND session_token_hash=$2', [subscription.endpoint, subscription.session_token_hash]);
      else retry = true;
    }
  }
  if (retry) throw new Error('Message push delivery temporarily unavailable.');
}
