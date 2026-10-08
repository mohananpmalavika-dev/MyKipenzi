ALTER TABLE conversations ADD COLUMN disappearing_seconds integer NOT NULL DEFAULT 0 CHECK(disappearing_seconds IN (0,3600,86400,604800,2592000));
ALTER TABLE messages ADD COLUMN expires_at timestamptz, ADD COLUMN expiry_processed boolean NOT NULL DEFAULT false;
CREATE INDEX messages_expiry ON messages(expires_at) WHERE expires_at IS NOT NULL AND NOT expiry_processed;
ALTER TABLE attachments ADD COLUMN expired_at timestamptz;
