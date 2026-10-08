-- Message reactions table
CREATE TABLE reactions (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  emoji text NOT NULL CHECK(emoji IN ('❤️','😂','👍','😮','😢','🙏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(message_id, user_id, emoji)
);

CREATE INDEX reactions_by_message ON reactions(message_id, created_at);
CREATE INDEX reactions_by_user ON reactions(user_id, created_at);
