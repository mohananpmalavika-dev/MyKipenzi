-- Digital Time Capsule (Love Letters for Future) Schema

CREATE TABLE IF NOT EXISTS time_capsules (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) <= 250),
  occasion text NOT NULL DEFAULT 'anniversary' CHECK(occasion IN (
    'birthday',
    'anniversary',
    'valentines',
    'new_year',
    'milestone',
    'custom'
  )),
  unlock_at timestamptz NOT NULL,
  theme text NOT NULL DEFAULT 'classic_rose' CHECK(theme IN (
    'classic_rose',
    'golden_parchment',
    'starlight_midnight',
    'lavender_sunset'
  )),
  seal_symbol text NOT NULL DEFAULT 'heart' CHECK(seal_symbol IN (
    'heart',
    'ring',
    'crown',
    'rose',
    'infinity',
    'key'
  )),
  letter_text text CHECK(length(letter_text) <= 10000),
  audio_url text,
  photo_url text,
  status text NOT NULL DEFAULT 'sealed' CHECK(status IN ('sealed', 'opened')),
  opened_at timestamptz,
  reactions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_capsules_cid_idx
  ON time_capsules(conversation_id, unlock_at ASC);

CREATE INDEX IF NOT EXISTS time_capsules_recipient_idx
  ON time_capsules(recipient_id, unlock_at ASC);
