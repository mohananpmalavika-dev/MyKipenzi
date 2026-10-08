-- Contact Management Schema
-- Adds favorites/contacts, labels/groups, notes, and sync support

-- 1. Favorites/Contacts table - users can mark other users as favorites
CREATE TABLE IF NOT EXISTS user_contacts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname text, -- Optional custom name for this contact
  is_favorite boolean NOT NULL DEFAULT true,
  added_at timestamptz NOT NULL DEFAULT now(),
  last_contacted_at timestamptz, -- Automatically updated when messaging
  PRIMARY KEY(user_id, contact_id),
  CHECK(user_id <> contact_id),
  CHECK(nickname IS NULL OR length(trim(nickname)) <= 80)
);

CREATE INDEX user_contacts_by_user ON user_contacts(user_id, added_at DESC);
CREATE INDEX user_contacts_favorites ON user_contacts(user_id) WHERE is_favorite = true;
CREATE INDEX user_contacts_recent ON user_contacts(user_id, last_contacted_at DESC NULLS LAST);

-- 2. Contact Labels/Groups - organize contacts with custom labels
CREATE TABLE IF NOT EXISTS contact_labels (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text, -- Hex color code for visual organization
  icon text, -- Optional emoji or icon name
  position integer NOT NULL DEFAULT 0, -- For custom ordering
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(length(trim(name)) > 0 AND length(trim(name)) <= 40),
  CHECK(color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$'),
  UNIQUE(user_id, name)
);

CREATE INDEX contact_labels_by_user ON contact_labels(user_id, position);

-- 3. Contact-Label associations - many-to-many relationship
CREATE TABLE IF NOT EXISTS contact_label_members (
  label_id uuid NOT NULL REFERENCES contact_labels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(label_id, user_id, contact_id),
  FOREIGN KEY(user_id, contact_id) REFERENCES user_contacts(user_id, contact_id) ON DELETE CASCADE,
  CHECK(user_id <> contact_id)
);

CREATE INDEX contact_label_members_by_label ON contact_label_members(label_id);
CREATE INDEX contact_label_members_by_user ON contact_label_members(user_id, contact_id);

-- 4. Contact Notes - private notes about contacts
CREATE TABLE IF NOT EXISTS contact_notes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, contact_id),
  FOREIGN KEY(user_id, contact_id) REFERENCES user_contacts(user_id, contact_id) ON DELETE CASCADE,
  CHECK(length(trim(note)) > 0 AND length(note) <= 5000)
);

-- 5. Contact sync/export logs - track when users export their contacts
CREATE TABLE IF NOT EXISTS contact_exports (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  format text NOT NULL CHECK(format IN ('json','csv','vcard')),
  contact_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_exports_by_user ON contact_exports(user_id, created_at DESC);

-- 6. Trigger to automatically add contacts when conversations are created
-- This helps populate user_contacts automatically
CREATE OR REPLACE FUNCTION auto_add_contact() RETURNS trigger AS $$
BEGIN
  -- For direct conversations (2 members), auto-add as contacts
  IF (SELECT count(*) FROM members WHERE conversation_id = NEW.conversation_id) = 2 THEN
    INSERT INTO user_contacts(user_id, contact_id, last_contacted_at, added_at)
    SELECT m1.user_id, m2.user_id, now(), now()
    FROM members m1, members m2
    WHERE m1.conversation_id = NEW.conversation_id
      AND m2.conversation_id = NEW.conversation_id
      AND m1.user_id <> m2.user_id
    ON CONFLICT (user_id, contact_id) 
    DO UPDATE SET last_contacted_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_add_contact_trigger ON members;
CREATE TRIGGER auto_add_contact_trigger
  AFTER INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_contact();

-- 7. Trigger to update last_contacted_at when messages are sent
CREATE OR REPLACE FUNCTION update_last_contacted() RETURNS trigger AS $$
BEGIN
  UPDATE user_contacts
  SET last_contacted_at = now()
  WHERE (user_id = NEW.sender_id AND contact_id IN (
    SELECT user_id FROM members WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_last_contacted_trigger ON messages;
CREATE TRIGGER update_last_contacted_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_last_contacted();

-- Migration complete
-- This schema enables:
-- - Adding/removing favorite contacts
-- - Custom nicknames for contacts
-- - Organizing contacts with custom labels/groups
-- - Adding private notes about contacts
-- - Tracking contact interaction history
-- - Exporting contact lists in multiple formats
