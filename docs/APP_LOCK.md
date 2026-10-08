# App lock

In Sanctuary Settings, enable a six-digit PIN, then enter the current PIN and choose Enable Fingerprint / Face ID. Each account configures its own lock in this browser. The PIN is required to disable the lock or change biometric enrollment.

The app locks on reload, when the page is hidden, or with Lock now. Locked chat content is unmounted, so messaging and call UI stop until verification succeeds. Biometrics are optional; the PIN remains a fallback when verification is cancelled or unavailable. Five incorrect PIN attempts start a delay, increasing up to five minutes.

WebAuthn requires HTTPS or localhost and a platform authenticator with user verification. Use localhost rather than an IP address for local WebAuthn testing. The device chooses fingerprint, face recognition, or its screen lock; the browser cannot force a specific biometric method. Biometric data and private keys remain with the authenticator. Only the public key and credential ID are stored with the salted PBKDF2 PIN verifier in IndexedDB.

This is a local app privacy lock, not server authentication or message encryption. Clearing this site's browser storage removes the local lock. Keep the PIN available; there is no PIN recovery in the app.

Verification: node --test tests/app-lock.test.js. The flow was also checked in Chromium with a virtual platform authenticator: enrollment, signature-verified unlock, PIN failure and fallback, reload locking, removal, and disabling the lock.
