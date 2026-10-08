ALTER TABLE messages ADD COLUMN reply_to_id uuid REFERENCES messages(id), ADD COLUMN edited_at timestamptz, ADD COLUMN deleted_at timestamptz;
