CREATE TABLE IF NOT EXISTS mood_check_ins (
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mood text NOT NULL CHECK (mood IN ('happy', 'tired', 'missing_you', 'need_a_hug')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id, user_id) REFERENCES members(conversation_id, user_id) ON DELETE CASCADE
);
