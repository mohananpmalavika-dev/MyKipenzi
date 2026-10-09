# Decoy PIN and capture alerts

## Enable the decoy

Open Settings → App Lock. Enable a six-digit primary PIN if App Lock is off, then enter the current real PIN and choose a different six-digit Decoy PIN. Both PINs are stored as independently salted PBKDF2 hashes in this browser's IndexedDB; neither plaintext PIN is stored.

After locking, the real PIN or registered biometric verification opens the private app. The Decoy PIN opens an ordinary, functional grocery list with add, check, and remove controls. The list persists locally for this account. Chat, calls, socket listeners, and private toast UI are unmounted while the list is displayed. “Lock lists” returns to the PIN screen; there is no gesture or Escape bypass into the real chat.

Entering the decoy or manually locking broadcasts a lock instruction to other open tabs of the same account. Failed real and decoy attempts share the existing PIN backoff. Changing or disabling the decoy requires the real PIN.

A configured decoy always hides sender/content in this browser's background Web Push notifications. The service worker reads the same lock database and shows a neutral “Update” notification without the app's custom icon/badge. Storage read failure also hides content. Previously shown notifications for this account are closed when the browser supports that API. Browser/OS origin labels, installed-app names and icons, URLs, history, and previously exposed content can still identify the app.

This is a local UI lock, not encryption of cached chat history or a device-level disguise. Configure it separately on each browser/device.

## Capture alerts on this web/PWA app

The browser listens for trusted Print Screen and supported screenshot/capture shortcuts while the private partner chat is focused. It does not treat blur, visibility changes, developer tools, or ordinary keys as screenshot evidence. Alerts explicitly describe a shortcut signal and say the browser cannot confirm a completed screenshot or recording.

Opening a received view-once item associates a detected shortcut with that item. Its viewer closes on lost focus or when the page is hidden, and the existing consume-on-open behavior remains in effect.

Starting screen sharing through this app's call controls sends a separate screen-sharing alert after the browser grants access and sharing begins. The API requires an active call. It cannot identify which screen the user chose or whether chat content is present.

The partner receives an in-app alert and, when configured, a session-bound Web Push notification. The private chat's “Capture alerts” panel explains limitations and shows recent reports. Failed shortcut delivery can be retried with the same identifier. Reports are deduplicated and restricted to authorized direct-chat members; blocked contacts cannot report/read alerts or receive capture pushes. Alerts are localized in English and Malayalam.

**Web/PWA cannot reliably detect arbitrary OS screenshots, screenshot gestures, external recording apps, or an external camera.** An OS may intercept the shortcut before the page sees it. A missed alert does not establish that no capture occurred. Offline reporting is not guaranteed; the page offers a retry for failed shortcut reports while it remains open.

Native OS integration is necessary for actual platform screenshot callbacks. Android 14's [screenshot detection API](https://developer.android.com/about/versions/14/features/screenshot-detection) itself covers only supported capture methods. iOS offers [a screenshot notification](https://developer.apple.com/documentation/uikit/uiapplication/userdidtakescreenshotnotification) after the screenshot. Browser [getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) exposes screen sharing initiated by this app, not recordings started by other apps.

## Run/deploy

Run `node server/migrate.js` to apply migration 22 (`capture_alerts`) and other pending project migrations. Restart the API server and BullMQ worker, then build/deploy the PWA normally. The service worker's `lockPrivacy.js` module is copied into the production build alongside existing offline modules.

Validation commands:

- `node --test tests/app-lock.test.js tests/decoy-lock.test.js tests/capture-alerts.test.js tests/capture-push-worker.test.js`
- `node --test tests/integration/capture-alerts.test.js` (PostgreSQL and Redis from the local environment)
- `node scripts/verify-privacy.mjs` (builds a stable production bundle and runs the eight browser checks with simulated accounts and notifications)

Integration tests create and remove an isolated database schema. Browser checks cover the real/decoy paths, settings authorization, other-tab locking, mobile layout, view-once context, truthful partner alerts, and retries.
