# Mood Check-in & Status Widget

Every private partner chat includes a daily mood widget. Tap **Happy**, **Tired**, **Missing You**, or **Need a Hug** to share immediately. Both partners see their latest status, emoji, and check-in time. Status lasts 24 hours after the latest change; the widget automatically clears expired moods.

Updates persist in PostgreSQL and appear live across devices through the existing transactional outbox and Socket.IO. Partners receive a cute in-app alert and an optional Web Push notification using their preferred language (English, Malayalam, Manglish, or Kiswahili). Background push requires the app's existing VAPID configuration, notification permission, subscription, and worker.

## Setup

Run `npm run migrate` to apply migration 21 (`server/mood-schema.sql`), then restart the API and worker. No additional packages or provider credentials are required.

## API

- `GET /api/conversations/:id/moods` returns `{ statuses: [...] }` for active check-ins.
- `POST /api/conversations/:id/moods` accepts `{ mood: "happy" | "tired" | "missing_you" | "need_a_hug" }` and returns `{ status, changed }`.
- Socket event `mood:changed` contains the status and sender name for the conversation's members.
- Each status includes `conversation_id`, `user_id`, `mood`, `revision`, `updated_at`, and `expires_at`.

Authentication, conversation membership, CSRF, contact blocking, and rate limits apply. Group chats do not expose the widget or API. A repeated active mood does not enqueue another alert; concurrent retries are serialized. Push jobs check the current revision, membership, blocks, expiry, and active session before delivery. A newer mood replaces an older pending push. Socket and HTTP replies merge by revision to prevent stale updates.

## Validation

- `node --test tests/moods.test.js`
- `node --test tests/integration/moods.test.js` (requires local PostgreSQL and Redis)
- `node scripts/verify-moods.mjs`
