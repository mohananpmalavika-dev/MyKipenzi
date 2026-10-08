ALTER TABLE messages ADD COLUMN IF NOT EXISTS view_once boolean NOT NULL DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS view_once_opened_at timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='messages'::regclass AND conname='view_once_opened_check') THEN
    ALTER TABLE messages ADD CONSTRAINT view_once_opened_check CHECK(view_once OR view_once_opened_at IS NULL);
  END IF;
END $$;
