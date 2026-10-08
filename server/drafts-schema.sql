-- Message drafts schema
CREATE TABLE IF NOT EXISTS message_drafts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  source_language text NOT NULL DEFAULT 'auto' CHECK(source_language IN ('auto','en','ml','manglish','sw')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, conversation_id),
  CHECK(length(text) <= 5000)
);

-- Index for efficient cleanup of expired drafts
CREATE INDEX IF NOT EXISTS message_drafts_updated_at ON message_drafts(updated_at);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_draft_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on draft updates
DROP TRIGGER IF EXISTS message_drafts_update_timestamp ON message_drafts;
CREATE TRIGGER message_drafts_update_timestamp
  BEFORE UPDATE ON message_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_draft_timestamp();
