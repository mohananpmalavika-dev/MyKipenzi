# Release validation

Implemented and locally exercised:

- Account registration, secure password hashing, session cookies, CSRF and origin validation.
- Private direct conversations, original text persistence, idempotent sends, typing and read receipts.
- Malware-scanned file uploads, content-type validation, participant access checks, private streaming.
- Voice-note recording and inline playback.
- Browser-to-browser voice and video calls with fake media devices, mute/unmute, hangup, and a synthetic screen track delivered during a voice call.
- Desktop and mobile chat layouts, visually inspected from the browser tests.
- Manglish translation prompt/response contract, blocked output handling, voice verification metadata, and avatar output URL restrictions using provider mocks.

Latest checks: ESLint passed, 10 unit tests passed, 10 API integration tests passed, and both browser workflows passed. The production web build passed. The dependency audit reported zero known vulnerabilities. The API suite includes recovery of 55 missed messages across two cursor pages.

Deployment and live-account validation still required:

- Configure Gemini, ElevenLabs, and D-ID accounts. No real provider credentials were supplied, so paid-provider requests and language/audio/avatar quality have not been verified live.
- Validate actual cloning and provider verification with the account holder's voice, and animate their consented profile photo.
- Deploy HTTPS, private database/Redis/object storage, malware scanning, and a public TURN service using unique secrets.
- Test camera/microphone/screen-picker permissions and calls across real devices/networks; local fake-media tests do not establish Internet relay reliability.
- Establish backups/restoration, retention and orphan-object cleanup, observability, account recovery/provisioning, and load/capacity targets before general availability.

Scope is a responsive web app and API with one-to-one calls/conversations. Group calls, background push notifications, mobile-native apps, and WhatsApp-style end-to-end message encryption are outside this implementation. The app can translate text when both participants opt in because the backend and configured providers can process it.
