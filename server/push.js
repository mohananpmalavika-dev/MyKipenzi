import webpush from 'web-push';
import { config } from './config.js';
import { db } from './db.js';
import { messageSelect } from './service.js';
import { messagePreview } from '../shared/notifications.js';
import { pushEndpoint } from '../shared/push.js';
import { captureNotification } from '../shared/captureAlerts.js';
import { moodNotification } from '../shared/moods.js';

export const pushEnabled = Boolean(config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY);

export async function deliverSchedulePush({ id, revision }, send = webpush.sendNotification.bind(webpush)) {
  if (!pushEnabled) return;
  const row = (await db.query("SELECT s.* FROM scheduled_messages s JOIN members m ON m.user_id=s.sender_id AND m.conversation_id=s.conversation_id WHERE s.id=$1 AND s.revision=$2 AND s.status='pending' AND s.delivery_at>now()", [id, revision])).rows[0];
  if (!row) return;
  const subscriptions = (await db.query('SELECT p.* FROM push_subscriptions p JOIN sessions s ON s.token_hash=p.session_token_hash AND s.user_id=p.user_id WHERE p.user_id=$1 AND s.expires_at>now()', [row.sender_id])).rows;
  const when = new Intl.DateTimeFormat('en', { timeZone: row.time_zone, dateStyle: 'medium', timeStyle: 'short' }).format(row.delivery_at);
  const payload = JSON.stringify({ title: 'Scheduled message reminder', body: `Your message will be sent at ${when} (${row.time_zone}).`, tag: `kipenzi-schedule-${id}-${revision}`, data: { conversation_id: row.conversation_id, user_id: row.sender_id, scheduled_id: id } });
  let retry = false;
  for (const subscription of subscriptions) {
    if (!pushEndpoint.safeParse(subscription.endpoint).success) continue;
    try {
      await send({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, {
        TTL: Math.max(1, Math.min(300, Math.floor((new Date(row.delivery_at).getTime() - Date.now()) / 1000))), urgency: 'normal', timeout: 10000,
        vapidDetails: { subject: config.APP_ORIGIN, publicKey: config.VAPID_PUBLIC_KEY, privateKey: config.VAPID_PRIVATE_KEY },
      });
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND session_token_hash=$2', [subscription.endpoint, subscription.session_token_hash]);
      else retry = true;
    }
  }
  if (retry) throw new Error('Scheduled reminder delivery temporarily unavailable.');
}

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
  const message = (await db.query(`${messageSelect} WHERE m.id=$1`, [message_id, recipient.language, user_id])).rows[0];
  if (!message || message.deleted_at) return;
  if (message.translation?.status === 'pending' && attempt < 2) throw new Error('Waiting for translated notification preview.');
  const payload = JSON.stringify({
    title: (message.sender?.name || 'Kipenzi') + (message.reply_to_id ? ' · Thread reply' : ''),
    body: messagePreview({ ...message, translation: message.translation?.status === 'pending' ? null : message.translation }),
    tag: `kipenzi-message-${message.id}`,
    data: { conversation_id: message.conversation_id, message_id: message.id, reply_to_id: message.reply_to_id, user_id },
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

export async function deliverCalendarReminderPush({ event_id, user_id }, send = webpush.sendNotification.bind(webpush)) {
  if (!pushEnabled) return;
  const event = (await db.query(
    'SELECT e.*, c.name as conversation_name FROM calendar_events e JOIN conversations c ON c.id = e.conversation_id WHERE e.id = $1',
    [event_id],
  )).rows[0];
  if (!event) return;
  
  const subscriptions = (await db.query(
    'SELECT p.* FROM push_subscriptions p JOIN sessions s ON s.token_hash=p.session_token_hash AND s.user_id=p.user_id WHERE p.user_id=$1 AND s.expires_at>now()',
    [user_id],
  )).rows;
  
  if (!subscriptions.length) return;
  
  const eventDate = new Date(event.event_date);
  const dateFormatter = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedDate = dateFormatter.format(eventDate);
  
  let timeStr = '';
  if (event.event_time) {
    const [hours, minutes] = event.event_time.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours, minutes);
    const timeFormatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: true });
    timeStr = ` at ${timeFormatter.format(timeDate)}`;
  }
  
  const payload = JSON.stringify({
    title: `${event.emoji} Upcoming: ${event.title}`,
    body: `${formattedDate}${timeStr}${event.location ? ` • ${event.location}` : ''}`,
    tag: `kipenzi-calendar-${event_id}`,
    data: { conversation_id: event.conversation_id, event_id, user_id },
  });
  
  let retry = false;
  for (const subscription of subscriptions) {
    if (!pushEndpoint.safeParse(subscription.endpoint).success) continue;
    try {
      await send(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
        {
          TTL: 300,
          urgency: 'normal',
          timeout: 10000,
          vapidDetails: {
            subject: config.APP_ORIGIN,
            publicKey: config.VAPID_PUBLIC_KEY,
            privateKey: config.VAPID_PRIVATE_KEY,
          },
        },
      );
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await db.query(
          'DELETE FROM push_subscriptions WHERE endpoint=$1 AND session_token_hash=$2',
          [subscription.endpoint, subscription.session_token_hash],
        );
      } else {
        retry = true;
      }
    }
  }
  if (retry) throw new Error('Calendar reminder push delivery temporarily unavailable.');
}

export async function deliverMoodPush({ conversation_id, sender_id, user_id, revision }, send = webpush.sendNotification.bind(webpush)) {
  if (!pushEnabled) return;
  const status = (await db.query(
    `SELECT mc.*, sender.name AS sender_name, recipient.language
     FROM mood_check_ins mc
     JOIN users sender ON sender.id=mc.user_id
     JOIN members mm ON mm.conversation_id=mc.conversation_id AND mm.user_id=$3
     JOIN users recipient ON recipient.id=mm.user_id
     JOIN conversations c ON c.id=mc.conversation_id AND c.direct_key IS NOT NULL
     WHERE mc.conversation_id=$1 AND mc.user_id=$2 AND mc.user_id<>$3 AND mc.revision=$4
       AND mc.expires_at>now() AND mc.updated_at>now()-interval '5 minutes'
       AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE
         (b.blocker_id=$2 AND b.blocked_id=$3) OR (b.blocker_id=$3 AND b.blocked_id=$2))`,
    [conversation_id, sender_id, user_id, revision],
  )).rows[0];
  if (!status) return;
  const notification = moodNotification(status.mood, status.sender_name, status.language);
  if (!notification) return;
  const subscriptions = (await db.query(
    'SELECT p.* FROM push_subscriptions p JOIN sessions s ON s.token_hash=p.session_token_hash AND s.user_id=p.user_id WHERE p.user_id=$1 AND s.expires_at>now()', [user_id],
  )).rows;
  const payload = JSON.stringify({
    ...notification, tag: `kipenzi-mood-${conversation_id}-${sender_id}`,
    data: { conversation_id, user_id, mood: status.mood, revision },
  });
  let retry = false;
  for (const subscription of subscriptions) {
    if (!pushEndpoint.safeParse(subscription.endpoint).success) continue;
    try {
      await send({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, {
        TTL: 300, urgency: 'normal', timeout: 10000,
        vapidDetails: { subject: config.APP_ORIGIN, publicKey: config.VAPID_PUBLIC_KEY, privateKey: config.VAPID_PRIVATE_KEY },
      });
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410)
        await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND session_token_hash=$2', [subscription.endpoint, subscription.session_token_hash]);
      else retry = true;
    }
  }
  if (retry) throw new Error('Mood notification delivery temporarily unavailable.');
}

export async function deliverCapturePush({ alert_id, user_id }, send = webpush.sendNotification.bind(webpush)) {
  if (!pushEnabled) return;
  const alert = (await db.query(
    `SELECT ca.*, sender.name AS sender_name, recipient.language
     FROM capture_alerts ca JOIN users sender ON sender.id=ca.sender_id
     JOIN members actor ON actor.conversation_id=ca.conversation_id AND actor.user_id=ca.sender_id
     JOIN members observer ON observer.conversation_id=ca.conversation_id AND observer.user_id=$2
     JOIN users recipient ON recipient.id=observer.user_id
     WHERE ca.id=$1 AND ca.sender_id<>$2 AND ca.created_at>now()-interval '5 minutes'
     AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE
       (b.blocker_id=ca.sender_id AND b.blocked_id=$2) OR (b.blocker_id=$2 AND b.blocked_id=ca.sender_id))`,
    [alert_id, user_id],
  )).rows[0];
  if (!alert) return;
  const notification = captureNotification(alert, alert.language);
  if (!notification) return;
  const subscriptions = (await db.query(
    'SELECT p.* FROM push_subscriptions p JOIN sessions s ON s.token_hash=p.session_token_hash AND s.user_id=p.user_id WHERE p.user_id=$1 AND s.expires_at>now()', [user_id],
  )).rows;
  const payload = JSON.stringify({
    ...notification, tag: `kipenzi-capture-${alert.id}`,
    data: { conversation_id: alert.conversation_id, user_id, capture_alert_id: alert.id },
  });
  let retry = false;
  for (const subscription of subscriptions) {
    if (!pushEndpoint.safeParse(subscription.endpoint).success) continue;
    try {
      await send({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, {
        TTL: 300, urgency: 'normal', timeout: 10000,
        vapidDetails: { subject: config.APP_ORIGIN, publicKey: config.VAPID_PUBLIC_KEY, privateKey: config.VAPID_PRIVATE_KEY },
      });
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410)
        await db.query('DELETE FROM push_subscriptions WHERE endpoint=$1 AND session_token_hash=$2', [subscription.endpoint, subscription.session_token_hash]);
      else retry = true;
    }
  }
  if (retry) throw new Error('Privacy notification delivery temporarily unavailable.');
}
