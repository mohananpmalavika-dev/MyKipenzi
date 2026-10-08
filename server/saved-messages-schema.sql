CREATE TABLE message_stars (message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(message_id,user_id));
CREATE INDEX message_stars_user ON message_stars(user_id,message_id);
CREATE TABLE message_pins (message_id uuid PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE, pinned_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
