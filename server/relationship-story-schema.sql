-- Relationship Timeline & Milestone Counter ("Our Story") Schema

CREATE TABLE IF NOT EXISTS relationship_profiles (
  conversation_id uuid PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  start_date date,
  anniversary_date date,
  first_date date,
  story_title text DEFAULT 'Our Story',
  cover_photo text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS relationship_memories (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) <= 200),
  memory_date date NOT NULL,
  category text NOT NULL DEFAULT 'sweet_moment',
  description text CHECK(length(description) <= 3000),
  photo_url text,
  emoji text DEFAULT '✨',
  reactions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS relationship_milestones (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) <= 200),
  target_date date NOT NULL,
  category text NOT NULL DEFAULT 'milestone',
  is_annual boolean NOT NULL DEFAULT false,
  emoji text DEFAULT '💖',
  note text CHECK(length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rel_memories_cid_idx
  ON relationship_memories(conversation_id, memory_date ASC);

CREATE INDEX IF NOT EXISTS rel_milestones_cid_idx
  ON relationship_milestones(conversation_id, target_date ASC);
