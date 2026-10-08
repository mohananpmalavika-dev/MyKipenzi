-- Migration: Add message forwarding support
-- This allows messages to be forwarded to other conversations while preserving the original source

ALTER TABLE messages ADD COLUMN forwarded_from_id uuid REFERENCES messages(id);

-- Index for looking up forwarded messages
CREATE INDEX messages_forwarded_from ON messages(forwarded_from_id) WHERE forwarded_from_id IS NOT NULL;

-- Note: A forwarded message copies text, sticker, and attachment reference from the original
-- The forwarded_from_id links back to the original message for context
