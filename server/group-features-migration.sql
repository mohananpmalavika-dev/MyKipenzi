-- Enhanced Group Chat Features Migration
-- This migration adds admin roles, group profiles, privacy settings, invite links, and permissions

-- 1. Add admin role and permissions to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_send_messages boolean NOT NULL DEFAULT true;
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_add_members boolean NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE members ADD COLUMN IF NOT EXISTS added_by_id uuid REFERENCES users(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS muted boolean NOT NULL DEFAULT false;

-- 2. Enhance conversations table for group features
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS avatar_id uuid REFERENCES attachments(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES users(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS allow_member_invites boolean NOT NULL DEFAULT true;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS require_admin_approval boolean NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add constraint for group description length
ALTER TABLE conversations ADD CONSTRAINT group_description_length CHECK (description IS NULL OR length(trim(description)) <= 500);

-- Update existing conversations to set created_by_id for groups
-- (This will be NULL for existing groups, which is fine)

-- 3. Add group privacy settings to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS who_can_add_to_groups text NOT NULL DEFAULT 'everyone' CHECK(who_can_add_to_groups IN ('everyone','contacts','nobody'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS require_group_approval boolean NOT NULL DEFAULT false;

-- 4. Create group invite links table
CREATE TABLE IF NOT EXISTS group_invites (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_by_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(max_uses IS NULL OR max_uses > 0)
);

CREATE INDEX group_invites_conversation ON group_invites(conversation_id);
CREATE INDEX group_invites_code ON group_invites(code) WHERE NOT revoked;

-- 5. Create group join requests table (for approval workflow)
CREATE TABLE IF NOT EXISTS group_join_requests (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_id uuid REFERENCES group_invites(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  responded_by_id uuid REFERENCES users(id),
  UNIQUE(conversation_id, user_id, status)
);

CREATE INDEX group_join_requests_conversation ON group_join_requests(conversation_id, status);
CREATE INDEX group_join_requests_user ON group_join_requests(user_id, status);

-- 6. Create group activity log table (for audit trail)
CREATE TABLE IF NOT EXISTS group_activities (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK(action IN ('member_added','member_removed','member_left','admin_added','admin_removed','group_created','group_deleted','group_updated','settings_changed')),
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX group_activities_conversation ON group_activities(conversation_id, created_at DESC);

-- 7. Create system messages table (for group events like "Alice added Bob")
CREATE TABLE IF NOT EXISTS system_messages (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  seq bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  message_type text NOT NULL CHECK(message_type IN ('member_joined','member_left','member_added','member_removed','admin_promoted','admin_demoted','group_created','group_renamed','group_avatar_changed','group_description_changed')),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX system_messages_conversation ON system_messages(conversation_id, seq DESC);

-- 8. Add support for group avatars in attachments
-- (already supported via purpose='avatar', but we'll ensure it works for groups)

-- 9. Update the purpose check in attachments to include 'group_avatar'
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_purpose_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_purpose_check CHECK(purpose IN ('chat','avatar','group_avatar'));

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS members_admin ON members(conversation_id) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS conversations_not_deleted ON conversations(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS members_user_conversations ON members(user_id, conversation_id);

-- 11. Add constraint to ensure at least one admin in group
-- This will be enforced at application level to avoid complexity

-- Migration complete
