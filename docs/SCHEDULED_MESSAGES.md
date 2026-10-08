# Scheduled messages

Use the clock beside Send to open this chat's schedules. Schedule a text message,
choose a date/time and IANA time zone, and optionally request a reminder 5, 15 or
60 minutes before delivery. Only the sender can view, edit or cancel their schedules.
Pending schedules appear first; recent sent, cancelled and failed entries follow.

Changing the time zone preserves the delivery instant. Times that fall in a daylight
saving gap or overlap require another time or UTC so the intended instant is explicit.
The server stores UTC timestamps and the chosen zone. Delivery must be at least a
minute away and within a year; reminders must also be in the future.

Run `npm run migrate` before restarting the API and worker. Migration 13 adds the
scheduled_messages table. The API checks for due messages every second; database
row locks and atomic send/status/outbox commits protect against concurrent sends,
edits, cancellation and retries. Downtime delays delivery until the API resumes.
Membership, contact blocks and group sending permission are rechecked at delivery.
Disappearing-message expiration starts when the message is actually sent.

The API emits sender-only schedule events and queues reminder pushes using the
existing outbox. The worker must be running and VAPID/browser notifications enabled
for reminders while the app is closed. Push jobs suppress reminders for cancelled,
edited or already delivered schedules. Recipients receive normal message alerts
at delivery. Text messages are supported; attachments, stickers and replies continue
to use immediate sending.

Validation: `npm test`, `npm run test:integration`, `npm run build`.
