CREATE TABLE users (
 id uuid PRIMARY KEY, handle text UNIQUE NOT NULL, name text NOT NULL, email text UNIQUE NOT NULL,
 password_hash text NOT NULL, language text NOT NULL DEFAULT 'en' CHECK(language IN ('en','ml','manglish','sw')),
 ai_consent boolean NOT NULL DEFAULT false, likeness_consent boolean NOT NULL DEFAULT false,
 avatar_id uuid, voice_id text, voice_verified boolean NOT NULL DEFAULT false, 
 last_seen timestamptz, 
 online_status_visibility text NOT NULL DEFAULT 'everyone' CHECK(online_status_visibility IN ('everyone','contacts','nobody')),
 last_seen_visibility text NOT NULL DEFAULT 'everyone' CHECK(last_seen_visibility IN ('everyone','contacts','nobody')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf text NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE push_subscriptions (endpoint text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, session_token_hash text NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE, p256dh text NOT NULL, auth text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX push_subscriptions_user ON push_subscriptions(user_id);
CREATE TABLE conversations (id uuid PRIMARY KEY, direct_key text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE members (conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE CASCADE, read_seq bigint NOT NULL DEFAULT 0, PRIMARY KEY(conversation_id,user_id));
CREATE TABLE attachments (id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id), conversation_id uuid REFERENCES conversations(id), purpose text NOT NULL CHECK(purpose IN ('chat','avatar')), object_key text UNIQUE NOT NULL, name text NOT NULL, mime text NOT NULL, size integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE users ADD CONSTRAINT users_avatar_fk FOREIGN KEY(avatar_id) REFERENCES attachments(id);
CREATE TABLE messages (id uuid PRIMARY KEY, seq bigint GENERATED ALWAYS AS IDENTITY UNIQUE, conversation_id uuid NOT NULL REFERENCES conversations(id), sender_id uuid NOT NULL REFERENCES users(id), client_id uuid NOT NULL, text text NOT NULL DEFAULT '', source_language text NOT NULL CHECK(source_language IN ('auto','en','ml','manglish','sw')), sticker text, attachment_id uuid REFERENCES attachments(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sender_id,client_id), CHECK(length(text)<=5000), CHECK(text<>'' OR sticker IS NOT NULL OR attachment_id IS NOT NULL));
CREATE UNIQUE INDEX one_message_per_attachment ON messages(attachment_id) WHERE attachment_id IS NOT NULL;
CREATE INDEX messages_pagination ON messages(conversation_id,seq DESC);
CREATE TABLE translations (message_id uuid REFERENCES messages(id) ON DELETE CASCADE, language text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','failed')), text text, PRIMARY KEY(message_id,language));
CREATE TABLE media_jobs (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), message_id uuid NOT NULL REFERENCES messages(id), kind text NOT NULL CHECK(kind IN ('speech','avatar')), own_voice boolean NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','failed')), object_key text, mime text, error text, provider_id text, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX media_jobs_owner ON media_jobs(user_id,created_at DESC);
CREATE TABLE calls (id uuid PRIMARY KEY, conversation_id uuid NOT NULL REFERENCES conversations(id), caller_id uuid NOT NULL REFERENCES users(id), callee_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL CHECK(kind IN ('audio','video')), state text NOT NULL DEFAULT 'ringing' CHECK(state IN ('ringing','active','ended','declined','missed')), created_at timestamptz NOT NULL DEFAULT now(), accepted_at timestamptz, ended_at timestamptz);
CREATE INDEX calls_active ON calls(state,created_at);
CREATE TABLE call_locks (user_id uuid PRIMARY KEY REFERENCES users(id), call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE);
CREATE TABLE outbox (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, kind text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
