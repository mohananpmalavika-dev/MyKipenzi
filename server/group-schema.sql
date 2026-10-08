ALTER TABLE conversations ALTER COLUMN direct_key DROP NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE conversations ADD CONSTRAINT conversation_name CHECK (direct_key IS NOT NULL OR (name IS NOT NULL AND length(trim(name)) BETWEEN 1 AND 80));
