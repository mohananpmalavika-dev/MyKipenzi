/**
 * Wellness & Care Features API
 * Handles care reminders, period tracking, and stress relief/meditation
 */

import { Router } from 'express';
import { db } from './db.js';
import { logger } from './infra.js';

const router = Router();

// =====================================================
// PARTNER CARE REMINDERS
// =====================================================

/**
 * Get all reminder types (bilingual)
 */
router.get('/care-reminders/types', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, type_key, name_en, name_ml, message_en, message_ml, icon
       FROM care_reminder_types
       ORDER BY type_key`
    );
    res.json({ types: result.rows });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch reminder types');
    res.status(500).json({ error: 'Failed to fetch reminder types' });
  }
});

/**
 * Create a new care reminder
 */
router.post('/care-reminders', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { recipientId, reminderTypeId, customMessage, scheduledTime, daysOfWeek } = req.body;

  if (!recipientId || !scheduledTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (recipientId === userId) {
    return res.status(400).json({ error: 'Cannot create reminder for yourself' });
  }

  try {
    // Verify recipient exists and is in a conversation
    const convCheck = await db.query(
      `SELECT id FROM direct_conversation 
       WHERE (user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1)`,
      [userId, recipientId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: 'No conversation with this user' });
    }

    const result = await db.query(
      `INSERT INTO care_reminders 
       (creator_id, recipient_id, reminder_type_id, custom_message, scheduled_time, days_of_week)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, creator_id, recipient_id, reminder_type_id, custom_message, 
                 scheduled_time, days_of_week, is_active, created_at`,
      [userId, recipientId, reminderTypeId, customMessage, scheduledTime, daysOfWeek || [0, 1, 2, 3, 4, 5, 6]]
    );

    logger.info({ reminderId: result.rows[0].id, userId, recipientId }, 'Care reminder created');
    res.status(201).json({ reminder: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to create care reminder');
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

/**
 * Get care reminders (sent or received)
 */
router.get('/care-reminders', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { type = 'received' } = req.query; // 'sent' or 'received'

  try {
    const field = type === 'sent' ? 'creator_id' : 'recipient_id';
    const otherField = type === 'sent' ? 'recipient_id' : 'creator_id';

    const result = await db.query(
      `SELECT cr.*, 
              crt.name_en, crt.name_ml, crt.message_en, crt.message_ml, crt.icon,
              a.username as partner_username, a.display_name as partner_display_name
       FROM care_reminders cr
       LEFT JOIN care_reminder_types crt ON crt.id = cr.reminder_type_id
       JOIN account a ON a.id = cr.${otherField}
       WHERE cr.${field} = $1
       ORDER BY cr.scheduled_time, cr.created_at DESC`,
      [userId]
    );

    res.json({ reminders: result.rows });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch care reminders');
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

/**
 * Update care reminder
 */
router.put('/care-reminders/:id', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.params;
  const { scheduledTime, daysOfWeek, isActive, customMessage } = req.body;

  try {
    const result = await db.query(
      `UPDATE care_reminders
       SET scheduled_time = COALESCE($2, scheduled_time),
           days_of_week = COALESCE($3, days_of_week),
           is_active = COALESCE($4, is_active),
           custom_message = COALESCE($5, custom_message),
           updated_at = NOW()
       WHERE id = $1 AND creator_id = $6
       RETURNING *`,
      [id, scheduledTime, daysOfWeek, isActive, customMessage, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found or unauthorized' });
    }

    res.json({ reminder: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to update care reminder');
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

/**
 * Delete care reminder
 */
router.delete('/care-reminders/:id', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.params;

  try {
    const result = await db.query(
      `DELETE FROM care_reminders WHERE id = $1 AND creator_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found or unauthorized' });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to delete care reminder');
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

/**
 * Mark reminder as completed
 */
router.post('/care-reminders/:id/complete', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.params;
  const { note } = req.body;

  try {
    // Verify this reminder is for the current user
    const reminderCheck = await db.query(
      `SELECT id FROM care_reminders WHERE id = $1 AND recipient_id = $2`,
      [id, userId]
    );

    if (reminderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const result = await db.query(
      `INSERT INTO care_reminder_completions (reminder_id, user_id, note, reminder_date)
       VALUES ($1, $2, $3, CURRENT_DATE)
       RETURNING id, completed_at`,
      [id, userId, note]
    );

    res.json({ completion: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to mark reminder as completed');
    res.status(500).json({ error: 'Failed to complete reminder' });
  }
});

/**
 * Get completion history/stats
 */
router.get('/care-reminders/stats', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { days = 30 } = req.query;

  try {
    // Get completion stats by reminder type
    const stats = await db.query(
      `SELECT 
         crt.name_en,
         crt.name_ml,
         crt.icon,
         COUNT(crc.id) as completion_count,
         COUNT(DISTINCT crc.reminder_date) as days_completed
       FROM care_reminders cr
       JOIN care_reminder_types crt ON crt.id = cr.reminder_type_id
       LEFT JOIN care_reminder_completions crc ON crc.reminder_id = cr.id
         AND crc.reminder_date >= CURRENT_DATE - $2::INTEGER
       WHERE cr.recipient_id = $1 AND cr.is_active = TRUE
       GROUP BY crt.id, crt.name_en, crt.name_ml, crt.icon
       ORDER BY completion_count DESC`,
      [userId, days]
    );

    // Get daily completion trend
    const trend = await db.query(
      `SELECT 
         reminder_date,
         COUNT(DISTINCT reminder_id) as completed_count
       FROM care_reminder_completions
       WHERE user_id = $1 AND reminder_date >= CURRENT_DATE - $2::INTEGER
       GROUP BY reminder_date
       ORDER BY reminder_date DESC`,
      [userId, days]
    );

    res.json({ 
      stats: stats.rows,
      trend: trend.rows,
      period_days: parseInt(days)
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch reminder stats');
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * Get random motivational quote
 */
router.get('/motivational-quote', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT quote_en, quote_ml, author, category
       FROM care_motivational_quotes
       ORDER BY RANDOM()
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        quote_en: 'Take care of yourself today! 💕',
        quote_ml: 'ഇന്ന് നിങ്ങളെത്തന്നെ പരിപാലിക്കൂ! 💕',
        author: null,
        category: 'general'
      });
    }

    res.json({ quote: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch motivational quote');
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// =====================================================
// PERIOD TRACKER & PARTNER SUPPORT
// =====================================================

/**
 * Get or create period settings
 */
router.get('/period/settings', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    let result = await db.query(
      `SELECT * FROM period_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      result = await db.query(
        `INSERT INTO period_settings (user_id)
         VALUES ($1)
         RETURNING *`,
        [userId]
      );
    }

    res.json({ settings: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch period settings');
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * Update period settings
 */
router.put('/period/settings', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { averageCycleLength, averagePeriodLength, shareWithPartner, partnerHintsEnabled } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO period_settings (user_id, average_cycle_length, average_period_length, share_with_partner, partner_hints_enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         average_cycle_length = COALESCE($2, period_settings.average_cycle_length),
         average_period_length = COALESCE($3, period_settings.average_period_length),
         share_with_partner = COALESCE($4, period_settings.share_with_partner),
         partner_hints_enabled = COALESCE($5, period_settings.partner_hints_enabled),
         updated_at = NOW()
       RETURNING *`,
      [userId, averageCycleLength, averagePeriodLength, shareWithPartner, partnerHintsEnabled]
    );

    res.json({ settings: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to update period settings');
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * Log new period cycle
 */
router.post('/period/cycles', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { startDate, endDate, flowIntensity, notes } = req.body;

  if (!startDate) {
    return res.status(400).json({ error: 'Start date is required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO period_cycles (user_id, start_date, end_date, flow_intensity, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, startDate, endDate, flowIntensity, notes]
    );

    logger.info({ cycleId: result.rows[0].id, userId }, 'Period cycle logged');
    res.status(201).json({ cycle: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to log period cycle');
    res.status(500).json({ error: 'Failed to log cycle' });
  }
});

/**
 * Update period cycle
 */
router.put('/period/cycles/:id', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.params;
  const { endDate, flowIntensity, notes } = req.body;

  try {
    const result = await db.query(
      `UPDATE period_cycles
       SET end_date = COALESCE($2, end_date),
           flow_intensity = COALESCE($3, flow_intensity),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $5
       RETURNING *`,
      [id, endDate, flowIntensity, notes, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    res.json({ cycle: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to update period cycle');
    res.status(500).json({ error: 'Failed to update cycle' });
  }
});

/**
 * Get period cycles history
 */
router.get('/period/cycles', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { limit = 12 } = req.query;

  try {
    const result = await db.query(
      `SELECT * FROM period_cycles
       WHERE user_id = $1
       ORDER BY start_date DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ cycles: result.rows });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch period cycles');
    res.status(500).json({ error: 'Failed to fetch cycles' });
  }
});

/**
 * Get period prediction
 */
router.get('/period/prediction', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const result = await db.query(
      `SELECT * FROM predict_next_period($1)`,
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].predicted_start_date) {
      return res.json({ 
        prediction: null,
        message: 'Not enough data for prediction. Track at least 3 cycles.'
      });
    }

    res.json({ prediction: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to get period prediction');
    res.status(500).json({ error: 'Failed to get prediction' });
  }
});

/**
 * Log daily symptoms/mood
 */
router.post('/period/daily-log', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { logDate, symptoms, moodLevel, painLevel, notes } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO period_daily_logs (user_id, log_date, symptoms, mood_level, pain_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, log_date) DO UPDATE SET
         symptoms = $3,
         mood_level = $4,
         pain_level = $5,
         notes = $6
       RETURNING *`,
      [userId, logDate || new Date().toISOString().split('T')[0], symptoms, moodLevel, painLevel, notes]
    );

    res.json({ log: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to save daily log');
    res.status(500).json({ error: 'Failed to save log' });
  }
});

/**
 * Get daily logs
 */
router.get('/period/daily-logs', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { days = 30 } = req.query;

  try {
    const result = await db.query(
      `SELECT * FROM period_daily_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - $2::INTEGER
       ORDER BY log_date DESC`,
      [userId, days]
    );

    res.json({ logs: result.rows });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch daily logs');
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * Get partner hints (for partner to see)
 */
router.get('/period/partner-hints', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { partnerId } = req.query;

  if (!partnerId) {
    return res.status(400).json({ error: 'Partner ID required' });
  }

  try {
    // Check if partner allows sharing
    const settingsCheck = await db.query(
      `SELECT share_with_partner, partner_hints_enabled FROM period_settings WHERE user_id = $1`,
      [partnerId]
    );

    if (settingsCheck.rows.length === 0 || !settingsCheck.rows[0].share_with_partner || !settingsCheck.rows[0].partner_hints_enabled) {
      return res.json({ hints: [], enabled: false });
    }

    // Get current cycle phase
    const phaseResult = await db.query(
      `SELECT get_cycle_phase($1) as phase`,
      [partnerId]
    );

    const phase = phaseResult.rows[0]?.phase || 'unknown';

    if (phase === 'unknown') {
      return res.json({ hints: [], enabled: true, phase: 'unknown' });
    }

    // Get hints for this phase
    const hintsResult = await db.query(
      `SELECT hint_en, hint_ml, icon FROM period_partner_hints
       WHERE cycle_phase = $1
       ORDER BY priority, RANDOM()
       LIMIT 3`,
      [phase]
    );

    res.json({ 
      hints: hintsResult.rows,
      enabled: true,
      phase
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch partner hints');
    res.status(500).json({ error: 'Failed to fetch hints' });
  }
});

// =====================================================
// STRESS RELIEF & MEDITATION
// =====================================================

/**
 * Get meditation templates
 */
router.get('/meditation/templates', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM meditation_templates ORDER BY category, duration_minutes`
    );
    res.json({ templates: result.rows });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch meditation templates');
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Start meditation session
 */
router.post('/meditation/sessions', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { templateId, partnerId, isSynchronized } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO meditation_sessions (template_id, initiator_id, partner_id, is_synchronized)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [templateId, userId, partnerId, isSynchronized || false]
    );

    logger.info({ sessionId: result.rows[0].id, userId, partnerId }, 'Meditation session started');
    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to start meditation session');
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * Complete meditation session
 */
router.put('/meditation/sessions/:id/complete', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.params;
  const { durationMinutes, notes } = req.body;

  try {
    const result = await db.query(
      `UPDATE meditation_sessions
       SET completed_at = NOW(),
           duration_minutes = $2,
           notes = $3
       WHERE id = $1 AND (initiator_id = $4 OR partner_id = $4)
       RETURNING *`,
      [id, durationMinutes, notes, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to complete meditation session');
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

/**
 * Get meditation history
 */
router.get('/meditation/sessions', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { limit = 20 } = req.query;

  try {
    const result = await db.query(
      `SELECT ms.*, mt.name_en, mt.name_ml, mt.icon, mt.category
       FROM meditation_sessions ms
       LEFT JOIN meditation_templates mt ON mt.id = ms.template_id
       WHERE ms.initiator_id = $1 OR ms.partner_id = $1
       ORDER BY ms.started_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ sessions: result.rows });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch meditation sessions');
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * Submit stress check-in
 */
router.post('/stress/check-in', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { stressLevel, triggers, mood, notes } = req.body;

  if (!stressLevel || stressLevel < 1 || stressLevel > 10) {
    return res.status(400).json({ error: 'Stress level must be between 1 and 10' });
  }

  try {
    const result = await db.query(
      `INSERT INTO stress_check_ins (user_id, stress_level, triggers, mood, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, stressLevel, triggers, mood, notes]
    );

    res.status(201).json({ checkIn: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to save stress check-in');
    res.status(500).json({ error: 'Failed to save check-in' });
  }
});

/**
 * Get stress check-in history
 */
router.get('/stress/check-ins', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { days = 30 } = req.query;

  try {
    const result = await db.query(
      `SELECT * FROM stress_check_ins
       WHERE user_id = $1 AND checked_in_at >= NOW() - ($2 || ' days')::INTERVAL
       ORDER BY checked_in_at DESC`,
      [userId, days]
    );

    // Calculate average stress level
    const avgResult = await db.query(
      `SELECT AVG(stress_level) as avg_stress
       FROM stress_check_ins
       WHERE user_id = $1 AND checked_in_at >= NOW() - ($2 || ' days')::INTERVAL`,
      [userId, days]
    );

    res.json({ 
      checkIns: result.rows,
      averageStress: avgResult.rows[0]?.avg_stress || null
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch stress check-ins');
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
});

/**
 * Get ambient sounds
 */
router.get('/ambient-sounds', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM ambient_sounds ORDER BY category, name_en`
    );
    res.json({ sounds: result.rows });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch ambient sounds');
    res.status(500).json({ error: 'Failed to fetch sounds' });
  }
});

/**
 * Add gratitude journal entry
 */
router.post('/gratitude', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { entryText, isSharedWithPartner } = req.body;

  if (!entryText || entryText.trim().length === 0) {
    return res.status(400).json({ error: 'Entry text is required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO gratitude_journal (user_id, entry_text, is_shared_with_partner)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, entryText, isSharedWithPartner || false]
    );

    res.status(201).json({ entry: result.rows[0] });
  } catch (err) {
    logger.error({ err }, 'Failed to save gratitude entry');
    res.status(500).json({ error: 'Failed to save entry' });
  }
});

/**
 * Get gratitude journal entries
 */
router.get('/gratitude', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { limit = 30, includePartner = false } = req.query;

  try {
    let query = `SELECT * FROM gratitude_journal WHERE user_id = $1`;
    const params = [userId];

    if (includePartner === 'true') {
      // Get partner's shared entries too
      query = `
        SELECT gj.*, a.username, a.display_name
        FROM gratitude_journal gj
        JOIN account a ON a.id = gj.user_id
        WHERE (gj.user_id = $1 OR (gj.is_shared_with_partner = TRUE AND gj.user_id IN (
          SELECT user_b FROM direct_conversation WHERE user_a = $1
          UNION
          SELECT user_a FROM direct_conversation WHERE user_b = $1
        )))
      `;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);

    res.json({ entries: result.rows });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch gratitude entries');
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

/**
 * Get wellness dashboard statistics
 */
router.get('/wellness/dashboard', async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const result = await db.query(
      `SELECT * FROM wellness_dashboard_stats WHERE user_id = $1`,
      [userId]
    );

    res.json({ stats: result.rows[0] || {} });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch wellness dashboard');
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

export default router;
