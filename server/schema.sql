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

-- Message search index for full-text search
CREATE INDEX messages_text_search ON messages USING gin(to_tsvector('english', text));
CREATE INDEX messages_created_at ON messages(created_at DESC);

-- Search history table
CREATE TABLE search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query text NOT NULL,
  filters jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX search_history_user ON search_history(user_id, created_at DESC);

-- Pinned/starred messages
CREATE TABLE saved_messages (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('star','pin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(message_id, user_id, kind)
);
CREATE INDEX saved_messages_user ON saved_messages(user_id, kind, created_at DESC);

-- Conversation archive status
CREATE TABLE archived_conversations (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(conversation_id, user_id)
);

-- Conversation mute settings
CREATE TABLE muted_conversations (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(conversation_id, user_id)
);

-- Quick reply templates
CREATE TABLE quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  text text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quick_replies_user ON quick_replies(user_id, category);

-- Location sharing
CREATE TABLE location_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  latitude decimal(9,6) NOT NULL,
  longitude decimal(9,6) NOT NULL,
  address text,
  is_live boolean NOT NULL DEFAULT false,
  live_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_shares_message ON location_shares(message_id);
CREATE INDEX location_shares_live ON location_shares(is_live, live_until) WHERE is_live = true;

-- Polls
CREATE TABLE polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  multiple_choice boolean NOT NULL DEFAULT false,
  anonymous boolean NOT NULL DEFAULT false,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX polls_message ON polls(message_id);

CREATE TABLE poll_votes (
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(poll_id, user_id, option_index)
);
CREATE INDEX poll_votes_poll ON poll_votes(poll_id);

-- Status/Stories
CREATE TABLE status_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK(content_type IN ('text','photo','video')),
  text text,
  attachment_id uuid REFERENCES attachments(id),
  background_color text,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX status_updates_user ON status_updates(user_id, created_at DESC);
-- Time-relative predicates cannot be used in PostgreSQL indexes. Queries filter by current time.
CREATE INDEX status_updates_active ON status_updates(expires_at);

CREATE TABLE status_views (
  status_id uuid NOT NULL REFERENCES status_updates(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(status_id, viewer_id)
);
CREATE INDEX status_views_status ON status_views(status_id, viewed_at DESC);
