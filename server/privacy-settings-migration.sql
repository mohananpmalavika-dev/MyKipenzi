-- Migration to add online/last seen privacy settings
-- Run this migration on existing databases

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen timestamptz,
ADD COLUMN IF NOT EXISTS online_status_visibility text NOT NULL DEFAULT 'everyone' CHECK(online_status_visibility IN ('everyone','contacts','nobody')),
ADD COLUMN IF NOT EXISTS last_seen_visibility text NOT NULL DEFAULT 'everyone' CHECK(last_seen_visibility IN ('everyone','contacts','nobody'));

-- Update existing users to have default privacy settings
UPDATE users 
SET online_status_visibility = 'everyone', 
    last_seen_visibility = 'everyone' 
WHERE online_status_visibility IS NULL 
   OR last_seen_visibility IS NULL;
