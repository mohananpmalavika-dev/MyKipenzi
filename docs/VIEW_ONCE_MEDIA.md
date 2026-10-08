# View-once photos and videos

In a partner chat, attach a photo or video, enable **① View once**, and send it. View-once media does not support captions, stickers, voice notes, or group chats.

The recipient sees a placeholder without an automatically loaded preview. Selecting it opens a dedicated viewer. Closing the viewer, leaving the browser tab, or finishing video playback removes the local media URL. The message remains in the conversation as **Opened**. The sender cannot reopen the sent media.

The server consumes the single view when it successfully reads and delivers the opening request. A database row lock prevents another tab or device from receiving a second copy. If storage fails before consumption, the recipient can retry. A connection failure after consumption can use up the view.

Normal attachment URLs, forwarding, stars, pins, media-library searches, and chat exports cannot retrieve view-once media. Consumption expires the attachment immediately and queues deletion of the stored object through the existing worker. The existing message-expiry timer can also expire unopened media.

## Setup

Run `npm run migrate` before starting the updated server. Migration 18 adds `view_once` and `view_once_opened_at` to messages. Keep the existing outbox/worker running for stored-object deletion and live status updates.

## Verification

- `node --test tests/view-once.test.js`: payload validation, supported media, private notification previews.
- `node --test tests/view-once-ui.test.js`: mobile photo/video viewer, no automatic media fetch, single view after reload, revoked local URLs, video completion, composer flag and reset.
- `npm run test:integration`: real database/storage checks for concurrent opening, authorization, exports, saving, forwarding, and attachment-access denial.
