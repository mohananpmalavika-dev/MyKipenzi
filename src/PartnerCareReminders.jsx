import { useState, useEffect } from 'react';
import { Bell, Plus, X, Check, TrendingUp, Heart, Trash2, Edit3, Calendar } from 'lucide-react';

/**
 * Partner Care Reminders Component
 * Set caring reminders for your partner with bilingual support
 */
export default function PartnerCareReminders({ currentUserId, partnerId, language = 'en' }) {
  const [view, setView] = useState('received'); // 'received', 'sent', 'create', 'stats'
  const [reminders, setReminders] = useState([]);
  const [reminderTypes, setReminderTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create reminder form state
  const [newReminder, setNewReminder] = useState({
    recipientId: partnerId,
    reminderTypeId: null,
    customMessage: '',
    scheduledTime: '09:00',
    daysOfWeek: [1, 2, 3, 4, 5] // Weekdays by default
  });

  const [editingReminder, setEditingReminder] = useState(null);

  const t = {
    en: {
      title: 'Partner Care Reminders',
      subtitle: 'Set caring reminders for your loved one',
      received: 'Received',
      sent: 'Sent',
      stats: 'Stats',
      createNew: 'Create New',
      noReminders: 'No reminders yet',
      createFirst: 'Create your first caring reminder!',
      scheduleTime: 'Schedule Time',
      daysOfWeek: 'Days',
      customMessage: 'Custom Message (Optional)',
      save: 'Save Reminder',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      markComplete: 'Mark Complete',
      completed: 'Completed!',
      active: 'Active',
      inactive: 'Inactive',
      daily: 'Daily',
      weekdays: 'Weekdays',
      weekends: 'Weekends',
      custom: 'Custom',
      sun: 'S', mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S',
      completionStats: 'Completion Stats',
      lastWeek: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      motivationalQuote: 'Daily Motivation',
      habitStreak: 'Habit Streak',
      from: 'from',
      to: 'to',
      completionNote: 'Add a note (optional)',
      submitCompletion: 'Submit'
    },
    ml: {
      title: 'പങ്കാളി പരിചരണ ഓർമ്മപ്പെടുത്തലുകൾ',
      subtitle: 'നിങ്ങളുടെ പ്രിയപ്പെട്ടവർക്കായി ഓർമ്മപ്പെടുത്തലുകൾ സജ്ജമാക്കുക',
      received: 'ലഭിച്ചത്',
      sent: 'അയച്ചത്',
      stats: 'സ്ഥിതിവിവരക്കണക്കുകൾ',
      createNew: 'പുതിയത് സൃഷ്ടിക്കുക',
      noReminders: 'ഇതുവരെ ഓർമ്മപ്പെടുത്തലുകൾ ഇല്ല',
      createFirst: 'നിങ്ങളുടെ ആദ്യ ഓർമ്മപ്പെടുത്തൽ സൃഷ്ടിക്കൂ!',
      scheduleTime: 'ഷെഡ്യൂൾ സമയം',
      daysOfWeek: 'ദിവസങ്ങൾ',
      customMessage: 'ഇഷ്ടാനുസൃത സന്ദേശം (ഐച്ഛികം)',
      save: 'സേവ് ചെയ്യുക',
      cancel: 'റദ്ദാക്കുക',
      delete: 'ഡിലീറ്റ് ചെയ്യുക',
      edit: 'എഡിറ്റ് ചെയ്യുക',
      markComplete: 'പൂർത്തിയാക്കി എന്ന് അടയാളപ്പെടുത്തുക',
      completed: 'പൂർത്തിയായി!',
      active: 'സജീവം',
      inactive: 'നിഷ്ക്രിയം',
      daily: 'ദിവസേന',
      weekdays: 'പ്രവൃത്തി ദിവസങ്ങൾ',
      weekends: 'വാരാന്ത്യങ്ങൾ',
      custom: 'ഇഷ്ടാനുസൃതം',
      sun: 'ഞാ', mon: 'തി', tue: 'ചൊ', wed: 'ബു', thu: 'വ്യാ', fri: 'വെ', sat: 'ശ',
      completionStats: 'പൂർത്തീകരണ സ്ഥിതിവിവരക്കണക്കുകൾ',
      lastWeek: 'കഴിഞ്ഞ 7 ദിവസം',
      last30Days: 'കഴിഞ്ഞ 30 ദിവസം',
      motivationalQuote: 'പ്രചോദനാത്മക വാചകം',
      habitStreak: 'ശീലത്തിന്റെ തുടർച്ച',
      from: 'നിന്ന്',
      to: 'ലേക്ക്',
      completionNote: 'ഒരു കുറിപ്പ് ചേർക്കുക (ഐച്ഛികം)',
      submitCompletion: 'സമർപ്പിക്കുക'
    }
  };

  const text = t[language] || t.en;

  useEffect(() => {
    loadReminderTypes();
    loadMotivationalQuote();
  }, []);

  useEffect(() => {
    if (view === 'received' || view === 'sent') {
      loadReminders();
    } else if (view === 'stats') {
      loadStats();
    }
  }, [view]);

  const loadReminderTypes = async () => {
    try {
      const res = await fetch('/api/wellness/care-reminders/types');
      if (res.ok) {
        const data = await res.json();
        setReminderTypes(data.types);
      }
    } catch (err) {
      console.error('Failed to load reminder types:', err);
    }
  };

  const loadReminders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wellness/care-reminders?type=${view}`);
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders);
        setError(null);
      } else {
        setError('Failed to load reminders');
      }
    } catch (err) {
      setError('Network error');
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wellness/care-reminders/stats?days=30');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setError(null);
      }
    } catch (err) {
      setError('Failed to load stats');
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMotivationalQuote = async () => {
    try {
      const res = await fetch('/api/wellness/motivational-quote');
      if (res.ok) {
        const data = await res.json();
        setQuote(data.quote || data);
      }
    } catch (err) {
      console.error('Failed to load quote:', err);
    }
  };

  const createReminder = async () => {
    if (!newReminder.reminderTypeId || !newReminder.scheduledTime) {
      setError('Please select a reminder type and time');
      return;
    }

    try {
      const res = await fetch('/api/wellness/care-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReminder)
      });

      if (res.ok) {
        setView('sent');
        setNewReminder({
          recipientId: partnerId,
          reminderTypeId: null,
          customMessage: '',
          scheduledTime: '09:00',
          daysOfWeek: [1, 2, 3, 4, 5]
        });
        loadReminders();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create reminder');
      }
    } catch (err) {
      setError('Network error');
      console.error('Failed to create reminder:', err);
    }
  };

  const updateReminder = async (id, updates) => {
    try {
      const res = await fetch(`/api/wellness/care-reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        loadReminders();
        setEditingReminder(null);
      } else {
        setError('Failed to update reminder');
      }
    } catch (err) {
      setError('Network error');
      console.error('Failed to update reminder:', err);
    }
  };

  const deleteReminder = async (id) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return;

    try {
      const res = await fetch(`/api/wellness/care-reminders/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadReminders();
      } else {
        setError('Failed to delete reminder');
      }
    } catch (err) {
      setError('Network error');
      console.error('Failed to delete reminder:', err);
    }
  };

  const markComplete = async (reminderId, note = '') => {
    try {
      const res = await fetch(`/api/wellness/care-reminders/${reminderId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });

      if (res.ok) {
        // Show success feedback
        const reminderEl = document.getElementById(`reminder-${reminderId}`);
        if (reminderEl) {
          reminderEl.classList.add('completed-animation');
          setTimeout(() => loadReminders(), 1500);
        }
      } else {
        setError('Failed to mark as complete');
      }
    } catch (err) {
      setError('Network error');
      console.error('Failed to mark complete:', err);
    }
  };

  const toggleDay = (day) => {
    setNewReminder(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort()
    }));
  };

  const getDayPattern = (days) => {
    if (days.length === 7) return text.daily;
    if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return text.weekdays;
    if (days.length === 2 && days.includes(0) && days.includes(6)) return text.weekends;
    return text.custom;
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <div className="partner-care-reminders">
      <style>{`
        .partner-care-reminders {
          padding: 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .care-header {
          margin-bottom: 2rem;
        }

        .care-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .care-header p {
          color: var(--text-secondary);
          margin: 0;
        }

        .care-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid var(--border);
        }

        .care-tab {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .care-tab:hover {
          color: var(--text);
          background: var(--hover);
        }

        .care-tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .motivational-quote {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .motivational-quote p {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          font-style: italic;
          line-height: 1.6;
        }

        .motivational-quote .author {
          font-size: 0.9rem;
          opacity: 0.9;
          font-style: normal;
        }

        .reminder-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .reminder-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.3s;
        }

        .reminder-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }

        .reminder-card.completed-animation {
          background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
          animation: completePulse 1.5s ease;
        }

        @keyframes completePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        .reminder-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .reminder-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .reminder-icon {
          font-size: 1.75rem;
        }

        .reminder-title h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .reminder-actions {
          display: flex;
          gap: 0.5rem;
        }

        .reminder-actions button {
          padding: 0.5rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reminder-actions button:hover {
          background: var(--hover);
        }

        .reminder-body {
          margin-left: 2.5rem;
        }

        .reminder-body p {
          margin: 0.5rem 0;
          color: var(--text-secondary);
        }

        .reminder-meta {
          display: flex;
          gap: 1.5rem;
          margin-top: 0.75rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .reminder-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .status-badge.active {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .create-form {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--text);
        }

        .form-group select,
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 1rem;
          background: var(--bg);
          color: var(--text);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .reminder-types-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .reminder-type-option {
          padding: 1rem;
          border: 2px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
          background: var(--bg);
        }

        .reminder-type-option:hover {
          border-color: var(--primary);
          background: var(--hover);
        }

        .reminder-type-option.selected {
          border-color: var(--primary);
          background: var(--primary-light);
        }

        .reminder-type-option .icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .reminder-type-option .name {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .days-selector {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .day-button {
          width: 40px;
          height: 40px;
          border: 2px solid var(--border);
          border-radius: 50%;
          background: var(--bg);
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .day-button:hover {
          border-color: var(--primary);
        }

        .day-button.selected {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--primary);
          color: white;
        }

        .btn-primary:hover {
          background: var(--primary-dark);
        }

        .btn-secondary {
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .btn-secondary:hover {
          background: var(--hover);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .stat-card h4 {
          margin: 0 0 1rem 0;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-secondary);
        }

        .empty-state svg {
          width: 64px;
          height: 64px;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        @media (max-width: 640px) {
          .partner-care-reminders {
            padding: 1rem;
          }

          .care-tabs {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .reminder-types-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="care-header">
        <h2>
          <Bell size={28} />
          {text.title}
        </h2>
        <p>{text.subtitle}</p>
      </div>

      {quote && (
        <div className="motivational-quote">
          <p>"{language === 'ml' ? quote.quote_ml : quote.quote_en}"</p>
          {quote.author && <div className="author">— {quote.author}</div>}
        </div>
      )}

      <div className="care-tabs">
        <button
          className={`care-tab ${view === 'received' ? 'active' : ''}`}
          onClick={() => setView('received')}
        >
          {text.received}
        </button>
        <button
          className={`care-tab ${view === 'sent' ? 'active' : ''}`}
          onClick={() => setView('sent')}
        >
          {text.sent}
        </button>
        <button
          className={`care-tab ${view === 'stats' ? 'active' : ''}`}
          onClick={() => setView('stats')}
        >
          <TrendingUp size={16} /> {text.stats}
        </button>
        <button
          className={`care-tab ${view === 'create' ? 'active' : ''}`}
          onClick={() => setView('create')}
        >
          <Plus size={16} /> {text.createNew}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {view === 'create' && (
        <div className="create-form">
          <div className="form-group">
            <label>{language === 'ml' ? 'ഓർമ്മപ്പെടുത്തൽ തരം' : 'Reminder Type'}</label>
            <div className="reminder-types-grid">
              {reminderTypes.map(type => (
                <div
                  key={type.id}
                  className={`reminder-type-option ${newReminder.reminderTypeId === type.id ? 'selected' : ''}`}
                  onClick={() => setNewReminder({ ...newReminder, reminderTypeId: type.id })}
                >
                  <div className="icon">{type.icon}</div>
                  <div className="name">{language === 'ml' ? type.name_ml : type.name_en}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>{text.scheduleTime}</label>
            <input
              type="time"
              value={newReminder.scheduledTime}
              onChange={(e) => setNewReminder({ ...newReminder, scheduledTime: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>{text.daysOfWeek}</label>
            <div className="days-selector">
              {[0, 1, 2, 3, 4, 5, 6].map(day => (
                <button
                  key={day}
                  className={`day-button ${newReminder.daysOfWeek.includes(day) ? 'selected' : ''}`}
                  onClick={() => toggleDay(day)}
                  type="button"
                >
                  {text[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day]]}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>{text.customMessage}</label>
            <textarea
              value={newReminder.customMessage}
              onChange={(e) => setNewReminder({ ...newReminder, customMessage: e.target.value })}
              placeholder={language === 'ml' ? 'നിങ്ങളുടെ സന്ദേശം ഇവിടെ...' : 'Your custom message here...'}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setView('sent')}>
              {text.cancel}
            </button>
            <button className="btn btn-primary" onClick={createReminder}>
              <Heart size={16} /> {text.save}
            </button>
          </div>
        </div>
      )}

      {(view === 'received' || view === 'sent') && !loading && (
        <div className="reminder-list">
          {reminders.length === 0 ? (
            <div className="empty-state">
              <Bell size={64} />
              <p>{text.noReminders}</p>
              <p>{text.createFirst}</p>
            </div>
          ) : (
            reminders.map(reminder => {
              const type = reminderTypes.find(t => t.id === reminder.reminder_type_id);
              return (
                <div key={reminder.id} id={`reminder-${reminder.id}`} className="reminder-card">
                  <div className="reminder-header">
                    <div className="reminder-title">
                      <span className="reminder-icon">{type?.icon || '💕'}</span>
                      <div>
                        <h3>{language === 'ml' ? type?.name_ml : type?.name_en}</h3>
                        {view === 'sent' && (
                          <small>{text.to} {reminder.partner_display_name || reminder.partner_username}</small>
                        )}
                        {view === 'received' && (
                          <small>{text.from} {reminder.partner_display_name || reminder.partner_username}</small>
                        )}
                      </div>
                    </div>
                    <div className="reminder-actions">
                      {view === 'sent' && (
                        <>
                          <button onClick={() => updateReminder(reminder.id, { isActive: !reminder.is_active })}>
                            {reminder.is_active ? <X size={18} /> : <Check size={18} />}
                          </button>
                          <button onClick={() => deleteReminder(reminder.id)}>
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                      {view === 'received' && reminder.is_active && (
                        <button onClick={() => markComplete(reminder.id)}>
                          <Check size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="reminder-body">
                    <p>{reminder.custom_message || (language === 'ml' ? type?.message_ml : type?.message_en)}</p>
                    <div className="reminder-meta">
                      <span>
                        <Calendar size={16} /> {formatTime(reminder.scheduled_time)}
                      </span>
                      <span>{getDayPattern(reminder.days_of_week)}</span>
                      <span className={`status-badge ${reminder.is_active ? 'active' : 'inactive'}`}>
                        {reminder.is_active ? text.active : text.inactive}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {view === 'stats' && !loading && stats && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>{text.completionStats}</h4>
              <div className="stat-value">{stats.completions_this_week || 0}</div>
              <p>{text.lastWeek}</p>
            </div>
            {stats.stats?.map(stat => (
              <div key={stat.name_en} className="stat-card">
                <h4>{stat.icon} {language === 'ml' ? stat.name_ml : stat.name_en}</h4>
                <div className="stat-value">{stat.completion_count}</div>
                <p>{stat.days_completed} {language === 'ml' ? 'ദിവസങ്ങൾ' : 'days'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
