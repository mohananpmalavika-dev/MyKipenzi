CREATE TABLE message_edit_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  text text NOT NULL,
  edited_at timestamptz NOT NULL,
  replaced_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX message_edit_history_message ON message_edit_history(message_id,id);
