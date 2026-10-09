-- =====================================================
-- Wellness & Care Features Schema
-- =====================================================
-- Features: Partner Care Reminders, Period Tracker, Stress Relief
-- Priority: MEDIUM-HIGH | Romantic Value: ⭐⭐⭐⭐⭐

-- =====================================================
-- 1. PARTNER CARE REMINDERS
-- =====================================================

-- Reminder types and templates
CREATE TABLE IF NOT EXISTS care_reminder_types (
  id SERIAL PRIMARY KEY,
  type_key VARCHAR(50) UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_ml TEXT NOT NULL, -- Malayalam translation
  message_en TEXT NOT NULL,
  message_ml TEXT NOT NULL,
  icon TEXT DEFAULT '💕',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default reminder types
INSERT INTO care_reminder_types (type_key, name_en, name_ml, message_en, message_ml, icon) VALUES
  ('eat', 'Did you eat?', 'ഭക്ഷണം കഴിച്ചോ?', 'Time to eat something! 🍽️', 'ഭക്ഷണം കഴിക്കാൻ സമയമായി! 🍽️', '🍽️'),
  ('medicine', 'Take your medicine', 'മരുന്ന് കഴിക്കണം', 'Don''t forget your medicine 💊', 'മരുന്ന് കഴിക്കാൻ മറക്കല്ലേ 💊', '💊'),
  ('water', 'Drink water', 'വെള്ളം കുടിക്കൂ', 'Stay hydrated! Drink some water 💧', 'വെള്ളം കുടിക്കൂ! 💧', '💧'),
  ('break', 'Take a break', 'ഒന്ന് വിശ്രമിക്കൂ', 'You''ve been working hard. Take a break! ☕', 'നീ കഷ്ടപ്പെട്ടു. ഒന്ന് വിശ്രമിക്കൂ! ☕', '☕'),
  ('sleep', 'Time to sleep', 'ഉറങ്ങാൻ സമയമായി', 'Time to rest. Good night! 🌙', 'ഉറങ്ങാൻ സമയമായി. ശുഭരാത്രി! 🌙', '🌙'),
  ('exercise', 'Time to exercise', 'വ്യായാമം ചെയ്യാൻ സമയം', 'Let''s get moving! 💪', 'നമുക്ക് അല്പം വ്യായാമം! 💪', '💪'),
  ('eyes', 'Rest your eyes', 'കണ്ണുകൾക്ക് വിശ്രമം', 'Take a screen break for your eyes 👀', 'സ്ക്രീനിൽ നിന്ന് കണ്ണുകൾക്ക് വിശ്രമം 👀', '👀')
ON CONFLICT (type_key) DO NOTHING;

-- User-created care reminders
CREATE TABLE IF NOT EXISTS care_reminders (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  reminder_type_id INTEGER REFERENCES care_reminder_types(id) ON DELETE SET NULL,
  custom_message TEXT, -- Optional custom message
  scheduled_time TIME NOT NULL, -- Time of day (recurring daily)
  days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=Sunday, 6=Saturday
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_users CHECK (creator_id != recipient_id)
);

CREATE INDEX idx_care_reminders_recipient ON care_reminders(recipient_id, is_active);
CREATE INDEX idx_care_reminders_schedule ON care_reminders(scheduled_time, is_active);

-- Reminder completion tracking
CREATE TABLE IF NOT EXISTS care_reminder_completions (
  id SERIAL PRIMARY KEY,
  reminder_id INTEGER NOT NULL REFERENCES care_reminders(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT, -- Optional note from user
  reminder_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_care_completions_reminder ON care_reminder_completions(reminder_id, reminder_date);
CREATE INDEX idx_care_completions_user ON care_reminder_completions(user_id, reminder_date);

-- Motivational quotes
CREATE TABLE IF NOT EXISTS care_motivational_quotes (
  id SERIAL PRIMARY KEY,
  quote_en TEXT NOT NULL,
  quote_ml TEXT NOT NULL,
  author TEXT,
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample motivational quotes
INSERT INTO care_motivational_quotes (quote_en, quote_ml, author, category) VALUES
  ('Take care of your body. It''s the only place you have to live.', 'നിങ്ങളുടെ ശരീരം സംരക്ഷിക്കൂ. നിങ്ങൾക്ക് ജീവിക്കാൻ ഉള്ള ഒരേയൊരു സ്ഥലം അതാണ്.', 'Jim Rohn', 'health'),
  ('The greatest wealth is health.', 'ഏറ്റവും വലിയ സമ്പത്ത് ആരോഗ്യമാണ്.', 'Virgil', 'health'),
  ('Love yourself enough to live a healthy lifestyle.', 'ആരോഗ്യകരമായ ജീവിതശൈലി നയിക്കാൻ നിങ്ങളെത്തന്നെ സ്നേഹിക്കൂ.', 'Jules Robson', 'wellness'),
  ('Rest when you''re weary. Refresh and renew yourself.', 'ക്ഷീണിതനാകുമ്പോൾ വിശ്രമിക്കൂ. നിങ്ങളെ നവീകരിക്കൂ.', 'Ralph Marston', 'rest'),
  ('Small steps every day lead to big changes.', 'എല്ലാ ദിവസവും ചെറിയ ചുവടുകൾ വലിയ മാറ്റങ്ങളിലേക്ക് നയിക്കുന്നു.', 'Unknown', 'motivation')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. PERIOD TRACKER & PARTNER SUPPORT
-- =====================================================

-- Period tracking settings per user
CREATE TABLE IF NOT EXISTS period_settings (
  user_id INTEGER PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
  average_cycle_length INTEGER DEFAULT 28, -- Days
  average_period_length INTEGER DEFAULT 5, -- Days
  share_with_partner BOOLEAN DEFAULT FALSE,
  partner_hints_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Period cycle records
CREATE TABLE IF NOT EXISTS period_cycles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE, -- NULL if ongoing
  flow_intensity VARCHAR(20), -- 'light', 'medium', 'heavy', 'spotting'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_period_cycles_user ON period_cycles(user_id, start_date DESC);
CREATE INDEX idx_period_cycles_dates ON period_cycles(start_date, end_date);

-- Daily symptom and mood tracking during cycle
CREATE TABLE IF NOT EXISTS period_daily_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  cycle_id INTEGER REFERENCES period_cycles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  symptoms TEXT[], -- Array of symptoms: 'cramps', 'headache', 'bloating', 'fatigue', 'mood_swings', 'back_pain', 'nausea'
  mood_level INTEGER CHECK (mood_level BETWEEN 1 AND 5), -- 1=very low, 5=great
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10), -- 0=no pain, 10=severe
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX idx_period_logs_user ON period_daily_logs(user_id, log_date DESC);

-- Partner care suggestions based on cycle phase
CREATE TABLE IF NOT EXISTS period_partner_hints (
  id SERIAL PRIMARY KEY,
  cycle_phase VARCHAR(20) NOT NULL, -- 'menstrual', 'follicular', 'ovulation', 'luteal', 'pms'
  hint_en TEXT NOT NULL,
  hint_ml TEXT NOT NULL,
  icon TEXT DEFAULT '💕',
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert partner care hints
INSERT INTO period_partner_hints (cycle_phase, hint_en, hint_ml, icon, priority) VALUES
  ('menstrual', 'Be extra caring today 💕', 'ഇന്ന് കൂടുതൽ കരുതൽ കാണിക്കൂ 💕', '💕', 1),
  ('menstrual', 'Chocolate time! 🍫', 'ചോക്ലേറ്റ് സമയം! 🍫', '🍫', 2),
  ('menstrual', 'Heating pad might help', 'ചൂടുള്ള പാഡ് സഹായിച്ചേക്കാം', '🔥', 3),
  ('menstrual', 'Give extra hugs today', 'ഇന്ന് കൂടുതൽ ആലിംഗനങ്ങൾ നൽകൂ', '🤗', 2),
  ('pms', 'PMS alert: Be patient and understanding', 'PMS: ക്ഷമയും മനസ്സിലാക്കലും ആവശ്യം', '😊', 1),
  ('pms', 'Extra comfort food time', 'സുഖപ്രദമായ ഭക്ഷണ സമയം', '🍕', 2),
  ('ovulation', 'Energy levels are high! ⚡', 'ഊർജ്ജം ഉയർന്നിരിക്കുന്നു! ⚡', '⚡', 1),
  ('follicular', 'Great time for activities together', 'ഒരുമിച്ചുള്ള പ്രവർത്തനങ്ങൾക്ക് മികച്ച സമയം', '🎉', 1)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. STRESS RELIEF & MEDITATION TOGETHER
-- =====================================================

-- Meditation session templates
CREATE TABLE IF NOT EXISTS meditation_templates (
  id SERIAL PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ml TEXT NOT NULL,
  description_en TEXT,
  description_ml TEXT,
  duration_minutes INTEGER NOT NULL,
  audio_url TEXT,
  category VARCHAR(50), -- 'breathing', 'guided', 'mindfulness', 'couples', 'sleep'
  icon TEXT DEFAULT '🧘',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert meditation templates
INSERT INTO meditation_templates (name_en, name_ml, description_en, description_ml, duration_minutes, category, icon) VALUES
  ('Deep Breathing Together', 'ഒരുമിച്ച് ആഴത്തിലുള്ള ശ്വാസോച്ഛ്വാസം', 'Synchronized breathing exercise for couples', 'ദമ്പതികൾക്കുള്ള സമന്വയിപ്പിച്ച ശ്വാസോച്ഛ്വാസ വ്യായാമം', 5, 'breathing', '🫁'),
  ('Couple Mindfulness', 'ദമ്പതികൾക്കുള്ള മൈൻഡ്ഫുൾനസ്', 'Practice mindfulness together', 'ഒരുമിച്ച് ബോധവൽക്കരണം പരിശീലിക്കുക', 10, 'couples', '🧘'),
  ('Stress Release', 'സമ്മർദ്ദം കുറയ്ക്കൽ', 'Quick stress relief meditation', 'ദ്രുതഗതിയിലുള്ള സമ്മർദ്ദം കുറയ്ക്കൽ', 7, 'mindfulness', '🌊'),
  ('Gratitude Moment', 'നന്ദി നിമിഷം', 'Reflect on gratitude together', 'ഒരുമിച്ച് നന്ദി പ്രകടിപ്പിക്കുക', 5, 'mindfulness', '🙏'),
  ('Evening Calm', 'സായാഹ്ന ശാന്തത', 'Wind down together before sleep', 'ഉറക്കത്തിന് മുമ്പ് ഒരുമിച്ച് ശാന്തമാകൂ', 15, 'sleep', '🌙')
ON CONFLICT DO NOTHING;

-- Meditation sessions (individual or together)
CREATE TABLE IF NOT EXISTS meditation_sessions (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES meditation_templates(id) ON DELETE SET NULL,
  initiator_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  partner_id INTEGER REFERENCES account(id) ON DELETE CASCADE, -- NULL for solo session
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  is_synchronized BOOLEAN DEFAULT FALSE, -- Both users in same session
  notes TEXT,
  CONSTRAINT different_partners CHECK (initiator_id != partner_id OR partner_id IS NULL)
);

CREATE INDEX idx_meditation_sessions_user ON meditation_sessions(initiator_id, started_at DESC);
CREATE INDEX idx_meditation_sessions_partner ON meditation_sessions(partner_id, started_at DESC);

-- Stress level check-ins
CREATE TABLE IF NOT EXISTS stress_check_ins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  stress_level INTEGER NOT NULL CHECK (stress_level BETWEEN 1 AND 10), -- 1=calm, 10=very stressed
  triggers TEXT[], -- What's causing stress
  mood VARCHAR(50), -- 'anxious', 'overwhelmed', 'tired', 'frustrated', 'calm'
  notes TEXT,
  checked_in_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stress_checkins_user ON stress_check_ins(user_id, checked_in_at DESC);

-- Ambient sound library
CREATE TABLE IF NOT EXISTS ambient_sounds (
  id SERIAL PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ml TEXT NOT NULL,
  category VARCHAR(50), -- 'nature', 'white_noise', 'music', 'rain', 'ocean'
  audio_url TEXT,
  icon TEXT DEFAULT '🎵',
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample ambient sounds
INSERT INTO ambient_sounds (name_en, name_ml, category, icon) VALUES
  ('Ocean Waves', 'സമുദ്ര തിരമാലകൾ', 'ocean', '🌊'),
  ('Rain Sounds', 'മഴയുടെ ശബ്ദം', 'rain', '🌧️'),
  ('Forest Birds', 'വനപക്ഷികൾ', 'nature', '🐦'),
  ('White Noise', 'വൈറ്റ് നോയ്സ്', 'white_noise', '📻'),
  ('Soft Piano', 'മൃദുവായ പിയാനോ', 'music', '🎹'),
  ('Gentle Stream', 'മൃദുവായ നദി', 'nature', '💧')
ON CONFLICT DO NOTHING;

-- Gratitude journal entries
CREATE TABLE IF NOT EXISTS gratitude_journal (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  entry_text TEXT NOT NULL,
  is_shared_with_partner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gratitude_journal_user ON gratitude_journal(user_id, created_at DESC);

-- Health statistics view for dashboard
CREATE OR REPLACE VIEW wellness_dashboard_stats AS
SELECT 
  a.id as user_id,
  -- Care reminders stats
  COUNT(DISTINCT cr.id) as active_reminders,
  COUNT(DISTINCT crc.id) FILTER (WHERE crc.reminder_date >= CURRENT_DATE - INTERVAL '7 days') as completions_this_week,
  -- Stress stats
  AVG(sc.stress_level) FILTER (WHERE sc.checked_in_at >= NOW() - INTERVAL '7 days') as avg_stress_level_week,
  COUNT(DISTINCT ms.id) FILTER (WHERE ms.started_at >= NOW() - INTERVAL '7 days') as meditation_sessions_week,
  -- Gratitude stats
  COUNT(DISTINCT gj.id) FILTER (WHERE gj.created_at >= NOW() - INTERVAL '7 days') as gratitude_entries_week
FROM account a
LEFT JOIN care_reminders cr ON (cr.recipient_id = a.id AND cr.is_active = TRUE)
LEFT JOIN care_reminder_completions crc ON cr.id = crc.reminder_id
LEFT JOIN stress_check_ins sc ON sc.user_id = a.id
LEFT JOIN meditation_sessions ms ON (ms.initiator_id = a.id OR ms.partner_id = a.id)
LEFT JOIN gratitude_journal gj ON gj.user_id = a.id
GROUP BY a.id;

-- Function to calculate next period prediction
CREATE OR REPLACE FUNCTION predict_next_period(p_user_id INTEGER)
RETURNS TABLE (
  predicted_start_date DATE,
  predicted_end_date DATE,
  confidence VARCHAR(20)
) AS $$
DECLARE
  v_avg_cycle_length INTEGER;
  v_last_start_date DATE;
  v_cycle_count INTEGER;
BEGIN
  -- Get user's average cycle length and last period start
  SELECT ps.average_cycle_length, MAX(pc.start_date)
  INTO v_avg_cycle_length, v_last_start_date
  FROM period_settings ps
  LEFT JOIN period_cycles pc ON pc.user_id = ps.user_id
  WHERE ps.user_id = p_user_id
  GROUP BY ps.average_cycle_length;
  
  -- Count number of tracked cycles
  SELECT COUNT(*) INTO v_cycle_count
  FROM period_cycles
  WHERE user_id = p_user_id;
  
  -- Calculate prediction
  IF v_last_start_date IS NOT NULL AND v_avg_cycle_length IS NOT NULL THEN
    RETURN QUERY SELECT 
      v_last_start_date + v_avg_cycle_length,
      v_last_start_date + v_avg_cycle_length + 5,
      CASE 
        WHEN v_cycle_count >= 6 THEN 'high'
        WHEN v_cycle_count >= 3 THEN 'medium'
        ELSE 'low'
      END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get current cycle phase
CREATE OR REPLACE FUNCTION get_cycle_phase(p_user_id INTEGER, p_check_date DATE DEFAULT CURRENT_DATE)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_last_period_start DATE;
  v_avg_cycle_length INTEGER;
  v_days_since_period INTEGER;
BEGIN
  -- Get last period start and cycle length
  SELECT MAX(pc.start_date), ps.average_cycle_length
  INTO v_last_period_start, v_avg_cycle_length
  FROM period_cycles pc
  JOIN period_settings ps ON ps.user_id = pc.user_id
  WHERE pc.user_id = p_user_id
  GROUP BY ps.average_cycle_length;
  
  IF v_last_period_start IS NULL THEN
    RETURN 'unknown';
  END IF;
  
  v_days_since_period := p_check_date - v_last_period_start;
  
  -- Determine phase based on typical cycle
  IF v_days_since_period <= 5 THEN
    RETURN 'menstrual';
  ELSIF v_days_since_period <= v_avg_cycle_length * 0.4 THEN
    RETURN 'follicular';
  ELSIF v_days_since_period <= v_avg_cycle_length * 0.6 THEN
    RETURN 'ovulation';
  ELSIF v_days_since_period <= v_avg_cycle_length - 7 THEN
    RETURN 'luteal';
  ELSE
    RETURN 'pms';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update period settings timestamp
CREATE OR REPLACE FUNCTION update_period_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER period_settings_update_timestamp
BEFORE UPDATE ON period_settings
FOR EACH ROW
EXECUTE FUNCTION update_period_settings_timestamp();

-- Trigger to update care reminders timestamp
CREATE OR REPLACE FUNCTION update_care_reminders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER care_reminders_update_timestamp
BEFORE UPDATE ON care_reminders
FOR EACH ROW
EXECUTE FUNCTION update_care_reminders_timestamp();

-- Comments for documentation
COMMENT ON TABLE care_reminders IS 'Partner care reminders with bilingual support';
COMMENT ON TABLE period_cycles IS 'Period cycle tracking with privacy controls';
COMMENT ON TABLE meditation_sessions IS 'Individual and synchronized couple meditation sessions';
COMMENT ON TABLE stress_check_ins IS 'Daily stress level monitoring';
COMMENT ON TABLE gratitude_journal IS 'Personal and shared gratitude entries';
