CREATE TABLE IF NOT EXISTS capture_alerts (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  kind text NOT NULL CHECK(kind IN ('screenshot_shortcut','recording_shortcut','screen_sharing')),
  context text NOT NULL DEFAULT 'chat' CHECK(context IN ('chat','view_once')),
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sender_id,client_id)
);
CREATE INDEX IF NOT EXISTS capture_alerts_conversation ON capture_alerts(conversation_id,created_at DESC);
