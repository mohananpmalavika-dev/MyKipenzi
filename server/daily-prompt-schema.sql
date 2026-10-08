-- Daily "Us" Prompts Schema
CREATE TABLE IF NOT EXISTS daily_prompt_answers (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  prompt_date date NOT NULL,
  prompt_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer text NOT NULL CHECK(length(answer) <= 2000),
  reaction text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, prompt_date, user_id)
);

CREATE INDEX IF NOT EXISTS daily_prompt_answers_lookup 
  ON daily_prompt_answers(conversation_id, prompt_date);

CREATE INDEX IF NOT EXISTS daily_prompt_answers_user
  ON daily_prompt_answers(user_id, prompt_date);
