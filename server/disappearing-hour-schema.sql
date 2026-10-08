ALTER TABLE conversations DROP CONSTRAINT conversations_disappearing_seconds_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_disappearing_seconds_check CHECK(disappearing_seconds IN (0,3600,86400,604800,2592000));
