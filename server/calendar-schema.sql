-- Shared Calendar & To-Do Lists Schema

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
  description text CHECK(length(description) <= 2000),
  event_date date NOT NULL,
  event_time time,
  all_day boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'special_date' CHECK(category IN (
    'anniversary',
    'birthday',
    'date_night',
    'special_date',
    'trip',
    'appointment',
    'other'
  )),
  emoji text DEFAULT '📅',
  location text CHECK(length(location) <= 500),
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_pattern text CHECK(recurrence_pattern IN (
    'daily',
    'weekly',
    'monthly',
    'yearly',
    NULL
  )),
  recurrence_end_date date,
  reminder_minutes integer NOT NULL DEFAULT 1440 CHECK(reminder_minutes IN (0,15,30,60,120,1440,2880,10080)),
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX calendar_events_conversation ON calendar_events(conversation_id, event_date DESC);
CREATE INDEX calendar_events_upcoming ON calendar_events(event_date);
CREATE INDEX calendar_events_reminders ON calendar_events(event_date, event_time, reminder_minutes) 
  WHERE reminder_sent_at IS NULL AND reminder_minutes > 0;

-- Event Reactions/RSVPs
CREATE TABLE IF NOT EXISTS calendar_event_responses (
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response text NOT NULL CHECK(response IN ('going', 'maybe', 'excited')),
  note text CHECK(length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id, user_id)
);

-- Shared To-Do Lists
CREATE TABLE IF NOT EXISTS todo_lists (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
  description text CHECK(length(description) <= 1000),
  emoji text DEFAULT '✓',
  color text DEFAULT '#8b5cf6' CHECK(color ~ '^#[0-9a-fA-F]{6}$'),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX todo_lists_conversation ON todo_lists(conversation_id, position ASC);

-- To-Do Items
CREATE TABLE IF NOT EXISTS todo_items (
  id uuid PRIMARY KEY,
  list_id uuid NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL CHECK(length(text) BETWEEN 1 AND 500),
  is_completed boolean NOT NULL DEFAULT false,
  completed_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  due_date date,
  priority text DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX todo_items_list ON todo_items(list_id, position ASC);
CREATE INDEX todo_items_conversation ON todo_items(conversation_id, is_completed, due_date);
CREATE INDEX todo_items_due ON todo_items(due_date) WHERE is_completed = false AND due_date IS NOT NULL;
