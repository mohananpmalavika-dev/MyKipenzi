# Kipenzi Connect

Kipenzi Connect is a responsive, one-to-one multilingual chat module. It supports text messages, stickers, photos and documents, voice notes, voice/video calls, screen sharing, read receipts, translated delivery, natural voice reading, and an opt-in talking profile photo.

## What is included

| Area                        | Included behaviour                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat                        | Private one-to-one conversations, live updates, typing indicators, read receipts, emoji stickers, voice notes, photo and document sharing                                                |
| Languages                   | Send Malayalam, Manglish, English, or Kiswahili; recipients can set their preferred delivery language                                                                                    |
| Calls                       | WebRTC voice/video calls, authenticated signalling, short-lived TURN credentials, screen sharing, busy protection, and missed/declined state                                             |
| Voice and profile animation | Browser speech fallback; ElevenLabs voice reading and opt-in voice cloning; D-ID talking-photo rendering using the account holder's profile photo and voice only                         |
| Privacy                     | Explicit AI and likeness consent, private attachment access checks, virus scanning, CSRF protection, rate limits, secure session cookies, and provider keys that never enter the browser |

AI translation is only queued when both the sender and recipient currently allow AI processing. If either person withdraws consent before the job runs, the queued translation fails without sending text to the provider.

## Run locally

1. Copy `.env.example` to `.env` if it is not already present.
   Install dependencies with `npm ci` on Node.js 24 or newer.
2. Start local infrastructure:

   ```powershell
   docker compose up -d
   ```

3. Apply the database schema:

   ```powershell
   npm run migrate
   ```

4. Start the API, worker, and web client:

   ```powershell
   npm run dev
   ```

Open `http://localhost:5173`. Register two accounts in separate browser profiles to test messaging and a real call.

Local services run only on loopback except TURN, which exposes the ports required for direct local WebRTC testing. For a real network call, set `TURN_PUBLIC_IP`, `TURN_URL`, and `TURN_SECRET` to your deployed TURN server values.

## Configure AI features

Leave provider variables empty if those features should stay unavailable. The app keeps chat and calls functional without them.

- `GEMINI_API_KEY` and `GEMINI_MODEL` enable translation. The translation prompt recognizes Malayalam script, English, Kiswahili, and romanized Malayalam/Manglish.
- `ELEVENLABS_API_KEY`, `ELEVENLABS_MODEL`, and `ELEVENLABS_VOICE_ID` enable natural voice reading. ElevenLabs supports both Malayalam and Swahili with its multilingual model. A user can instead choose their own verified cloned voice after explicit consent.
- `DID_API_KEY` enables talking profile videos. It requires the user’s own profile photo, the user’s likeness consent, and a generated audio track.

Provider credentials belong only in server-side environment variables. Never add them to Vite variables, frontend source files, screenshots, or git history.

## Production deployment

Use a managed PostgreSQL instance, Redis, private S3-compatible object storage, ClamAV, and a publicly reachable TURN service. `deploy/compose.production.yaml` runs the API, worker, migration job, and Caddy proxy:

```powershell
Copy-Item .env.example deploy\.env
# Edit deploy\.env with production URLs, strong secrets, and provider keys.
docker compose -f deploy/compose.production.yaml up -d --build
```

Set `NODE_ENV=production`, `APP_ORIGIN=https://chat.example.com`, and `DOMAIN=chat.example.com`. Production startup refuses a non-HTTPS origin, disabled virus scanning, a missing TURN URL, or a TURN secret under 32 characters. Use a public HTTPS S3 endpoint for `S3_PUBLIC_ENDPOINT` only when the avatar provider must fetch a short-lived presigned object URL; keep the bucket private.

At your edge/load balancer, enable WebSocket upgrades. Use Redis ACLs, TLS, and private networking for Redis; do not expose the Redis adapter to public networks.

The current transport uses WebSocket only, so sticky sessions are only needed if you later enable HTTP polling. Messages are readable by the application server and the opted-in AI providers; this module does not implement end-to-end message encryption. AI translation and talking photos require server-side processing.

Before a public release, connect real provider accounts and validate Malayalam/Manglish/Swahili translations with native speakers, cloned-voice verification, and generated talking photos. Test calls across two real devices and different networks, including a forced TURN relay, and test the browser's actual screen-picker permissions. Browser tests use fake camera/microphone devices and a synthetic screen track. Configure database backups, object lifecycle rules, monitoring, a secret store, and your account provisioning/recovery policy for your deployment. The supplied local service credentials are development credentials.

API integration details are in [docs/API.md](docs/API.md). Production rollout status is in [docs/VALIDATION.md](docs/VALIDATION.md).

## Validation

```powershell
npm run check
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
```

The integration suite validates registration/session CSRF protection, direct-conversation isolation, idempotent sends, read receipts, malware-scanned private attachment delivery, call state changes, consent gates, and logout. It needs the local services from `docker compose up -d`.
