# Background message notifications

Kipenzi uses encrypted Web Push for sender names and message previews. Each device opts in through **Settings → Message alerts → Enable background alerts** and the browser's notification permission dialog. iPhone users must install Kipenzi on the Home Screen and open the installed app first.

For local setup, run `node scripts/setup-push.mjs`, then `npm run migrate`, and restart the local API and worker. The setup script generates a persistent VAPID key pair in the ignored `.env` file and never prints it. The public key is served to authenticated clients; the private key stays on the server. Keep the same pair across server restarts.

The worker queues notifications only for conversation recipients. Read, deleted, old, and sender-owned messages are skipped. Translation is allowed time to complete before delivery; if unavailable, the original text is used. Subscriptions belong to a signed-in session and disappear on logout or session expiry. Devices must sign in again after their session expires. Dead push endpoints are removed automatically. Permission and sound delivery are controlled by the phone/browser settings.

Tapping a notification opens the correct conversation, or focuses an existing app window. Push previews are checked against the current signed-in account before display. Notification content is never added to the service worker's offline cache.

Validation: `npm run check`, `npm test`, `npm run test:integration`, `npm run build`, and `node scripts/verify-push.mjs` against a local Vite preview server on port 4173. Tests use synthetic subscriptions and mocked push delivery. A real phone's closed-app delivery still needs a device test after deployment and opt-in.
