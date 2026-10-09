-- Migration: Add missing features tables and indexes
-- Date: 2026-01-09

-- Message search index for full-text search
CREATE INDEX IF NOT EXISTS messages_text_search ON messages USING gin(to_tsvector('english', text));
CREATE INDEX IF NOT EXISTS messages_created_at ON messages(created_at DESC);

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query text NOT NULL,
  filters jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_history_user ON search_history(user_id, created_at DESC);

-- Pinned/starred messages
CREATE TABLE IF NOT EXISTS saved_messages (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('star','pin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(message_id, user_id, kind)
);
CREATE INDEX IF NOT EXISTS saved_messages_user ON saved_messages(user_id, kind, created_at DESC);

-- Conversation archive status
CREATE TABLE IF NOT EXISTS archived_conversations (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(conversation_id, user_id)
);

-- Conversation mute settings
CREATE TABLE IF NOT EXISTS muted_conversations (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(conversation_id, user_id)
);

-- Quick reply templates
CREATE TABLE IF NOT EXISTS quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  text text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quick_replies_user ON quick_replies(user_id, category);

-- Location sharing
CREATE TABLE IF NOT EXISTS location_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  latitude decimal(9,6) NOT NULL,
  longitude decimal(9,6) NOT NULL,
  address text,
  is_live boolean NOT NULL DEFAULT false,
  live_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS location_shares_message ON location_shares(message_id);
CREATE INDEX IF NOT EXISTS location_shares_live ON location_shares(is_live, live_until) WHERE is_live = true;

-- Polls
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  multiple_choice boolean NOT NULL DEFAULT false,
  anonymous boolean NOT NULL DEFAULT false,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS polls_message ON polls(message_id);

CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(poll_id, user_id, option_index)
);
CREATE INDEX IF NOT EXISTS poll_votes_poll ON poll_votes(poll_id);

-- Status/Stories
CREATE TABLE IF NOT EXISTS status_updates (
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
CREATE INDEX IF NOT EXISTS status_updates_user ON status_updates(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS status_updates_active ON status_updates(expires_at) WHERE expires_at > now();

CREATE TABLE IF NOT EXISTS status_views (
  status_id uuid NOT NULL REFERENCES status_updates(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(status_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS status_views_status ON status_views(status_id, viewed_at DESC);

-- Message edit history (if not exists)
CREATE TABLE IF NOT EXISTS message_edit_history (
  id bigserial PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  text text NOT NULL,
  edited_at timestamptz NOT NULL,
  replaced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS message_edit_history_message ON message_edit_history(message_id, id);

-- Add columns to messages table if not exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS view_once boolean NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS view_once_opened_at timestamptz;

-- Add columns to conversations table if not exist
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS avatar_id uuid REFERENCES attachments(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES users(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS disappearing_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add columns to members table if not exist
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_send_messages boolean NOT NULL DEFAULT true;
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_add_members boolean NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS added_by_id uuid REFERENCES users(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS muted boolean NOT NULL DEFAULT false;

-- Add columns to users table if not exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS who_can_add_to_groups text NOT NULL DEFAULT 'everyone' CHECK(who_can_add_to_groups IN ('everyone','contacts','nobody'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS require_group_approval boolean NOT NULL DEFAULT false;

-- Add attachment expiration column
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS expired_at timestamptz;

-- Group management tables
CREATE TABLE IF NOT EXISTS group_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_activities_conversation ON group_activities(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS system_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_type text NOT NULL,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_messages_conversation ON system_messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS group_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES users(id),
  code text UNIQUE NOT NULL,
  expires_at timestamptz,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_invite_links_code ON group_invite_links(code) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS group_invite_links_conversation ON group_invite_links(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied')),
  reviewed_by_id uuid REFERENCES users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id, status)
);
CREATE INDEX IF NOT EXISTS group_join_requests_conversation ON group_join_requests(conversation_id, status, created_at);

-- Contact management tables
CREATE TABLE IF NOT EXISTS user_contacts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname text,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, contact_id),
  CHECK(user_id <> contact_id)
);
CREATE INDEX IF NOT EXISTS user_contacts_user ON user_contacts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_contacts_favorite ON user_contacts(user_id, is_favorite, created_at DESC) WHERE is_favorite = true;

CREATE TABLE IF NOT EXISTS contact_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  icon text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_labels_user ON contact_labels(user_id, position);

CREATE TABLE IF NOT EXISTS contact_label_members (
  label_id uuid NOT NULL REFERENCES contact_labels(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(label_id, contact_id)
);

CREATE TABLE IF NOT EXISTS contact_notes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, contact_id)
);

-- User blocking table
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(blocker_id, blocked_id),
  CHECK(blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS user_blocks_blocked ON user_blocks(blocked_id);

-- User reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_reports_reported ON user_reports(reported_id, created_at DESC);

-- Message drafts table
CREATE TABLE IF NOT EXISTS message_drafts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  text text NOT NULL,
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  source_language text NOT NULL DEFAULT 'auto' CHECK(source_language IN ('auto','en','ml','manglish','sw')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS message_drafts_user ON message_drafts(user_id, updated_at DESC);

-- Scheduled messages table
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  text text NOT NULL,
  source_language text NOT NULL DEFAULT 'auto' CHECK(source_language IN ('auto','en','ml','manglish','sw')),
  sticker text,
  attachment_id uuid REFERENCES attachments(id),
  reply_to_id uuid REFERENCES messages(id),
  delivery_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','cancelled','failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scheduled_messages_delivery ON scheduled_messages(status, delivery_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS scheduled_messages_user ON scheduled_messages(sender_id, created_at DESC);

-- Mood check-ins table
CREATE TABLE IF NOT EXISTS mood_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood text NOT NULL,
  intensity integer NOT NULL CHECK(intensity >= 1 AND intensity <= 5),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mood_check_ins_conversation ON mood_check_ins(conversation_id, created_at DESC);

-- Daily prompts table
CREATE TABLE IF NOT EXISTS daily_prompt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  prompt_date date NOT NULL,
  prompt_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer text NOT NULL,
  reaction text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, prompt_date, user_id)
);
CREATE INDEX IF NOT EXISTS daily_prompt_answers_conversation ON daily_prompt_answers(conversation_id, prompt_date DESC);

-- Relationship story tables
CREATE TABLE IF NOT EXISTS relationship_profiles (
  conversation_id uuid PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  anniversary_date date,
  first_date date,
  story_title text NOT NULL DEFAULT 'Our Story',
  cover_photo text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS relationship_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  memory_date date NOT NULL,
  category text NOT NULL DEFAULT 'sweet_moment',
  description text,
  photo_url text,
  emoji text NOT NULL DEFAULT '✨',
  reactions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS relationship_memories_conversation ON relationship_memories(conversation_id, memory_date DESC);

CREATE TABLE IF NOT EXISTS relationship_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  target_date date NOT NULL,
  category text NOT NULL DEFAULT 'milestone',
  is_annual boolean NOT NULL DEFAULT false,
  emoji text NOT NULL DEFAULT '💖',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS relationship_milestones_conversation ON relationship_milestones(conversation_id, target_date);

-- Time capsules table
CREATE TABLE IF NOT EXISTS time_capsules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  occasion text,
  unlock_at timestamptz NOT NULL,
  theme text NOT NULL DEFAULT 'love',
  seal_symbol text NOT NULL DEFAULT '💌',
  letter_text text NOT NULL,
  audio_url text,
  photo_url text,
  status text NOT NULL DEFAULT 'sealed' CHECK(status IN ('sealed', 'opened')),
  opened_at timestamptz,
  reactions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS time_capsules_conversation ON time_capsules(conversation_id, unlock_at);
CREATE INDEX IF NOT EXISTS time_capsules_recipient ON time_capsules(recipient_id, unlock_at) WHERE status = 'sealed';

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time,
  all_day boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'special_date',
  emoji text NOT NULL DEFAULT '📅',
  location text,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_pattern text,
  recurrence_end_date date,
  reminder_minutes integer NOT NULL DEFAULT 1440,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calendar_events_conversation ON calendar_events(conversation_id, event_date);

CREATE TABLE IF NOT EXISTS calendar_event_responses (
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response text NOT NULL CHECK(response IN ('going', 'maybe', 'excited')),
  note text,
  responded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id, user_id)
);

-- To-do lists table
CREATE TABLE IF NOT EXISTS todo_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text,
  emoji text NOT NULL DEFAULT '✓',
  color text NOT NULL DEFAULT '#8b5cf6',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS todo_lists_conversation ON todo_lists(conversation_id, position);

CREATE TABLE IF NOT EXISTS todo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES users(id),
  text text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_by_id uuid REFERENCES users(id),
  completed_at timestamptz,
  due_date date,
  priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS todo_items_list ON todo_items(list_id, position);
CREATE INDEX IF NOT EXISTS todo_items_due ON todo_items(due_date) WHERE completed = false AND due_date IS NOT NULL;


-- Cloud backup tables
CREATE TABLE IF NOT EXISTS chat_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK(provider IN ('local', 'google_drive', 'icloud')),
  include_media boolean NOT NULL DEFAULT true,
  size bigint NOT NULL,
  status text NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_backups_user ON chat_backups(user_id, created_at DESC);

-- User backup settings
CREATE TABLE IF NOT EXISTS user_backup_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  auto_backup boolean NOT NULL DEFAULT false,
  backup_frequency text NOT NULL CHECK(backup_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
  include_media boolean NOT NULL DEFAULT true,
  backup_provider text NOT NULL CHECK(backup_provider IN ('local', 'google_drive', 'icloud')) DEFAULT 'local',
  last_backup_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
