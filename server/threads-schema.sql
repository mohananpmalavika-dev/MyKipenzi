CREATE INDEX IF NOT EXISTS messages_reply_thread_idx ON messages(conversation_id, reply_to_id, seq);
