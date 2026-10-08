# Offline chats and automatic delivery

Kipenzi's production PWA caches the application shell, CSS, JavaScript, fonts and icons. After one successful online visit, the installed app can start without internet. The Vite build emits a versioned worker and an asset manifest; activation removes older shell caches. Private API responses and media are never added to the shared shell cache.

## Saved history

Successful reads of conversations, message pages, individual messages, capabilities and drafts are stored in IndexedDB for the active account. Network failures fall back to those snapshots. Only previously fetched history is available offline; unopened chats, older pages that have never been loaded, calls, streaming content and downloaded media require internet. The response cache retains at most 200 recently read pages. Browser storage eviction or clearing site data removes offline history.

The existing App Lock also protects offline access. Expired messages and expired quotes are filtered when snapshots are read, and visible messages continue to expire on the existing timer. Cached records are updated when an edited/deleted message is fetched. Remote edits or deletions made while this device is disconnected are reflected after reconnecting.

## Persistent outbox

Messages are saved before delivery, including files, captions, reply IDs, stickers, expiry settings, view-once settings and a stable client ID. Reloading or closing the app does not discard queued messages. Upload IDs are saved before message creation, so a retry after an upload succeeds reuses the uploaded attachment. An IndexedDB lease coordinates tabs and the service worker; server-side client ID idempotency protects ambiguous network retries.

Network failures, timeouts, HTTP 408, 429 and server failures remain queued for retry. Other HTTP failures require manual retry after correcting the problem. Online/focus events and a 30-second foreground timer retry the queue. The UI distinguishes queued, sending and failed messages.

Where supported, the app registers a one-off Background Sync event when going offline or queuing a message. The service worker fetches a fresh session and CSRF token before delivery and checks that the session belongs to the queue's account. After delivery it refreshes the conversation list and the latest pages of up to 20 recently read chats, including incoming messages. Push notifications also trigger this history refresh. Browsers schedule background work themselves; execution is not guaranteed immediately, and browsers without Background Sync retry when the app is open again. There is no continuous polling of incoming messages while the app is closed; reopening/reconnecting refreshes history through the existing API/socket flow.

Logout, an unauthenticated session, HTTP 401 and account switches clear private snapshots and the outbox. The worker never delivers one account's queue under a different account. View-once media endpoints and attachment blobs are excluded from caching.

Signing out offline clears local history immediately. The pending sign-out is completed against the original account before future API requests when connectivity returns, so a reload cannot silently restore its cached session.

## Verification

Run `node --test tests/offline-pwa.test.js` for a real Chromium test against the production build. It verifies offline shell loading and chat history, persistence across reload, foreground reconnect, service-worker delivery after the app tab closes, attachment reuse after a server failure, stable retry IDs, concurrent delivery leases, expiration filtering, account isolation and HTTP 401 cleanup. A mobile offline screenshot is saved to `test-results/offline-chat-mobile.png`.
