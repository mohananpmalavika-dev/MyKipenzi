CREATE TABLE scheduled_messages (
  id uuid PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  text text NOT NULL CHECK(length(text) BETWEEN 1 AND 5000),
  source_language text NOT NULL,
  delivery_at timestamptz NOT NULL,
  time_zone text NOT NULL,
  reminder_minutes integer NOT NULL DEFAULT 0 CHECK(reminder_minutes IN (0,5,15,60)),
  reminder_sent_at timestamptz,
  revision integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','cancelled','failed')),
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sender_id,client_id)
);
CREATE INDEX scheduled_due ON scheduled_messages(delivery_at) WHERE status='pending';
CREATE INDEX scheduled_sender ON scheduled_messages(sender_id,conversation_id,created_at DESC);
