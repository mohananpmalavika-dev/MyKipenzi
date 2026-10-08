# Integrating Kipenzi Connect

Serve the web client and API on the same origin, or reverse proxy `/api` and `/socket.io` from your existing app to this service. `APP_ORIGIN` must exactly match the origin shown in the browser, including scheme and development port. The module ships with its own account system; an existing app needs an explicit authentication bridge to its identity provider rather than trusting a browser-supplied user ID.

All bodies below are JSON except uploads, which are `multipart/form-data` with one `file` field. All routes start with `/api`. Error responses use `{ "error": "Readable message" }`. Authenticated mutations require the session cookie, an exact `Origin` matching `APP_ORIGIN`, and an `X-CSRF-Token` header from the session response.

| Route                                         | Purpose                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /capabilities`                           | Discover registration, translation, speech, clone, avatar, TURN, and sticker configuration |
| `GET /auth/session`                           | Return `{user,csrf}`, or a null user for a signed-out browser                              |
| `POST /auth/register`                         | Create an account: `handle`, `name`, `email`, `password`, `language`, `ai_consent`         |
| `POST /auth/login`                            | Sign in with `email` and `password`; returns `{user,csrf}` and an HttpOnly cookie          |
| `POST /auth/logout`                           | Revoke this session and disconnect its sockets                                             |
| `PATCH /profile`                              | Set `name`, `language`, `ai_consent`, and `likeness_consent`                               |
| `POST/DELETE /profile/photo`                  | Upload or remove the account's own profile photo                                           |
| `POST/DELETE /profile/voice`                  | Clone or remove the account holder's consented voice                                       |
| `POST /profile/voice/refresh`                 | Refresh provider verification status for the account's cloned voice                        |
| `GET/POST /conversations`                     | List direct conversations or open one with `{handle}`                                      |
| `GET /conversations/:id/messages?before=:seq` | Return up to 50 messages in chronological order, with `has_more`                           |
| `POST /conversations/:id/messages`            | Send `{client_id,text,source_language,sticker?,attachment_id?}`                            |
| `POST /conversations/:id/read`                | Advance a read receipt with `{seq}`                                                        |
| `POST /conversations/:id/uploads`             | Scan/store a private file and return attachment metadata                                   |
| `GET /attachments/:id`                        | Return a same-origin authenticated content URL                                             |
| `GET /attachments/:id/content`                | Stream the authorized file, including byte-range support                                   |
| `POST /messages/:id/translate`                | Request/retry translation with `{language}`; return pending status                         |
| `POST /messages/:id/media`                    | Generate `{kind:"speech"\|"avatar",own_voice:boolean}`; return job ID                      |
| `GET /media/:id`                              | Poll a generated media job and obtain a content URL when ready                             |
| `GET /media/:id/content`                      | Stream generated media to the requesting account                                           |
| `GET /calls/ice`                              | Obtain short-lived TURN credentials and STUN configuration                                 |
| `GET /calls/current`                          | Return the user's current ringing/active call, or null                                     |
| `GET /conversations/:id/calls`                | Return the last 30 call records                                                            |
| `POST /conversations/:id/calls`               | Start `{kind:"audio"\|"video"}`                                                            |
| `PATCH /calls/:id`                            | Perform `{action:"accept"\|"decline"\|"end"}`                                              |
| `GET /health/live`                            | Process liveness                                                                           |
| `GET /health/ready`                           | Database, Redis, and storage readiness                                                     |

Language codes are `en`, `ml`, `manglish`, and `sw`. `source_language` additionally accepts `auto`. Every send needs a UUID `client_id`; retry the same client ID when a response is lost. The server keeps the original text even when translated delivery succeeds. Voice reading converts Manglish to Malayalam script for pronunciation.

For reconnect recovery, request `/conversations/:id/messages?after=:lastKnownSeq`. This returns the next 50 messages in ascending order; keep advancing the cursor until `has_more` is false. `before` and `after` are mutually exclusive. The web client fills missed pages before merging the current latest page.

Upload before sending an attachment, then send its ID. Files must be at most 25 MB. Supported formats include images, PDF, modern Office documents, UTF-8 TXT, common audio, and MP4/WebM. Content is validated from bytes and scanned; executable/unknown formats are rejected. Profile animation accepts JPG/PNG portraits.

## Socket contract

Connect Socket.IO over WebSocket with the normal browser cookie and `auth: {csrf}`. Client reconnects must refetch conversation/message state because Redis Pub/Sub notifications are transient.

Server notifications: `conversation:changed`, `message:changed`, and `receipt:changed` include a `conversation_id`; `typing` includes a conversation and user ID; `call:changed` includes the call record; `media:changed` includes the media job ID.

Client events: `typing: {conversation_id}`, `call:heartbeat: {call_id}`, and `call:signal: {call_id,type,data}`. Signal `type` is `offer`, `answer`, or `ice`. SDP must match the supplied type; ICE has `candidate`, `sdpMid`, `sdpMLineIndex`, and optional `usernameFragment`. Signalling acknowledgements return `{ok:true}` or `{error}`. Only call participants can signal, the caller can send offers, and the accepting callee can send answers. Both clients heartbeat active calls every 15 seconds; stale calls release busy locks.

Generated media requests are asynchronous. Run the worker alongside the API. The database outbox persists work until delivery to Redis/BullMQ. Provider failures retry with backoff; the frontend keeps original messages visible and shows failed translation/media status. AI provider calls have per-account and global daily caps.
