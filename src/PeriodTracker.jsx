import { useState, useEffect } from 'react';
import { Calendar, Heart, Settings, TrendingUp, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';

/**
 * Period Tracker & Partner Support Component
 * Private period tracking with optional partner visibility
 */
export default function PeriodTracker({ currentUserId, partnerId, language = 'en' }) {
  const [view, setView] = useState('calendar'); // 'calendar', 'log', 'prediction', 'settings'
  const [settings, setSettings] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [partnerHints, setPartnerHints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Daily log form
  const [dailyLog, setDailyLog] = useState({
    symptoms: [],
    moodLevel: 3,
    painLevel: 0,
    notes: ''
  });

  // New cycle form
  const [newCycle, setNewCycle] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: null,
    flowIntensity: 'medium',
    notes: ''
  });

  const availableSymptoms = [
    { key: 'cramps', en: 'Cramps', ml: 'വയറുവേദന', icon: '😣' },
    { key: 'headache', en: 'Headache', ml: 'തലവേദന', icon: '🤕' },
    { key: 'bloating', en: 'Bloating', ml: 'വയറുവീക്കം', icon: '🎈' },
    { key: 'fatigue', en: 'Fatigue', ml: 'ക്ഷീണം', icon: '😴' },
    { key: 'mood_swings', en: 'Mood Swings', ml: 'മാനസികാവസ്ഥ മാറ്റങ്ങൾ', icon: '😊😢' },
    { key: 'back_pain', en: 'Back Pain', ml: 'നടുവേദന', icon: '🔥' },
    { key: 'nausea', en: 'Nausea', ml: 'ഓക്കാനം', icon: '🤢' }
  ];

  const flowIntensities = [
    { key: 'spotting', en: 'Spotting', ml: 'ചെറിയ രക്തസ്രാവം', color: '#FFB6C1' },
    { key: 'light', en: 'Light', ml: 'നേരിയ', color: '#FFA07A' },
    { key: 'medium', en: 'Medium', ml: 'മിതമായ', color: '#FF6347' },
    { key: 'heavy', en: 'Heavy', ml: 'കനത്ത', color: '#DC143C' }
  ];

  const t = {
    en: {
      title: 'Period Tracker',
      subtitle: 'Track your cycle with privacy & care',
      calendar: 'Calendar',
      dailyLog: 'Daily Log',
      prediction: 'Prediction',
      settings: 'Settings',
      partnerView: 'Partner View',
      // Calendar view
      previousMonth: 'Previous',
      nextMonth: 'Next',
      today: 'Today',
      periodDays: 'Period Days',
      predictedPeriod: 'Predicted Period',
      ovulation: 'Ovulation',
      // Daily log
      logSymptoms: 'Log Symptoms',
      selectSymptoms: 'Select all that apply',
      moodLevel: 'Mood Level',
      painLevel: 'Pain Level',
      notes: 'Notes',
      saveLog: 'Save Log',
      veryLow: 'Very Low',
      low: 'Low',
      okay: 'Okay',
      good: 'Good',
      great: 'Great',
      noPain: 'No Pain',
      mild: 'Mild',
      moderate: 'Moderate',
      severe: 'Severe',
      // New cycle
      startNewCycle: 'Start New Cycle',
      startDate: 'Start Date',
      endDate: 'End Date (optional)',
      flowIntensity: 'Flow Intensity',
      saveCycle: 'Save Cycle',
      endCycle: 'End Current Cycle',
      // Prediction
      nextPeriodPrediction: 'Next Period Prediction',
      predictedStart: 'Predicted Start',
      predictedEnd: 'Predicted End',
      confidence: 'Confidence',
      notEnoughData: 'Not enough data for prediction',
      trackMoreCycles: 'Track at least 3 cycles for accurate predictions',
      cycleHistory: 'Cycle History',
      averageCycleLength: 'Average Cycle Length',
      days: 'days',
      // Settings
      privacySettings: 'Privacy Settings',
      shareWithPartner: 'Share with Partner',
      partnerHintsEnabled: 'Partner Hints',
      shareDescription: 'Let your partner see your cycle calendar',
      hintsDescription: 'Give your partner caring hints based on cycle phase',
      cycleSettings: 'Cycle Settings',
      avgCycleLength: 'Average Cycle Length',
      avgPeriodLength: 'Average Period Length',
      saveSettings: 'Save Settings',
      // Partner hints
      partnerCareHints: 'Care Hints for Partner',
      currentPhase: 'Current Phase',
      menstrual: 'Menstrual',
      follicular: 'Follicular',
      ovulationPhase: 'Ovulation',
      luteal: 'Luteal',
      pms: 'PMS',
      unknown: 'Unknown',
      // Stats
      cycleStats: 'Cycle Statistics',
      totalCyclesTracked: 'Total Cycles Tracked',
      lastPeriod: 'Last Period',
      // Messages
      cycleStarted: 'Cycle started',
      cycleEnded: 'Cycle ended',
      logSaved: 'Log saved successfully',
      settingsSaved: 'Settings saved',
      privacyFirst: '🔒 Your data is private and secure'
    },
    ml: {
      title: 'ആർത്തവ ട്രാക്കർ',
      subtitle: 'സ്വകാര്യതയോടെ നിങ്ങളുടെ ചക്രം ട്രാക്ക് ചെയ്യുക',
      calendar: 'കലണ്ടർ',
      dailyLog: 'ദിനംപ്രതി രേഖ',
      prediction: 'പ്രവചനം',
      settings: 'സജ്ജീകരണങ്ങൾ',
      partnerView: 'പങ്കാളി കാഴ്ച',
      previousMonth: 'മുമ്പത്തെ',
      nextMonth: 'അടുത്തത്',
      today: 'ഇന്ന്',
      periodDays: 'ആർത്തവ ദിവസങ്ങൾ',
      predictedPeriod: 'പ്രവചിച്ച ആർത്തവം',
      ovulation: 'അണ്ഡോത്പാദനം',
      logSymptoms: 'ലക്ഷണങ്ങൾ രേഖപ്പെടുത്തുക',
      selectSymptoms: 'ബാധകമായവയെല്ലാം തിരഞ്ഞെടുക്കുക',
      moodLevel: 'മാനസികാവസ്ഥ',
      painLevel: 'വേദനയുടെ തോത്',
      notes: 'കുറിപ്പുകൾ',
      saveLog: 'സേവ് ചെയ്യുക',
      veryLow: 'വളരെ കുറഞ്ഞ',
      low: 'കുറഞ്ഞ',
      okay: 'സാധാരണ',
      good: 'നല്ലത്',
      great: 'വളരെ നല്ലത്',
      noPain: 'വേദന ഇല്ല',
      mild: 'നേരിയ',
      moderate: 'മിതമായ',
      severe: 'കഠിനമായ',
      startNewCycle: 'പുതിയ ചക്രം ആരംഭിക്കുക',
      startDate: 'ആരംഭ തീയതി',
      endDate: 'അവസാന തീയതി (ഐച്ഛികം)',
      flowIntensity: 'രക്തസ്രാവത്തിന്റെ തോത്',
      saveCycle: 'സേവ് ചെയ്യുക',
      endCycle: 'നിലവിലുള്ള ചക്രം അവസാനിപ്പിക്കുക',
      nextPeriodPrediction: 'അടുത്ത ആർത്തവ പ്രവചനം',
      predictedStart: 'പ്രവചിച്ച ആരംഭം',
      predictedEnd: 'പ്രവചിച്ച അവസാനം',
      confidence: 'ആത്മവിശ്വാസം',
      notEnoughData: 'പ്രവചനത്തിന് മതിയായ ഡാറ്റ ഇല്ല',
      trackMoreCycles: 'കൃത്യമായ പ്രവചനത്തിന് കുറഞ്ഞത് 3 ചക്രങ്ങൾ ട്രാക്ക് ചെയ്യുക',
      cycleHistory: 'ചക്ര ചരിത്രം',
      averageCycleLength: 'ശരാശരി ചക്ര ദൈർഘ്യം',
      days: 'ദിവസങ്ങൾ',
      privacySettings: 'സ്വകാര്യത ക്രമീകരണങ്ങൾ',
      shareWithPartner: 'പങ്കാളിയുമായി പങ്കിടുക',
      partnerHintsEnabled: 'പങ്കാളി സൂചനകൾ',
      shareDescription: 'നിങ്ങളുടെ പങ്കാളിയെ കലണ്ടർ കാണാൻ അനുവദിക്കുക',
      hintsDescription: 'ചക്രത്തിന്റെ ഘട്ടം അടിസ്ഥാനമാക്കി സൂചനകൾ നൽകുക',
      cycleSettings: 'ചക്ര ക്രമീകരണങ്ങൾ',
      avgCycleLength: 'ശരാശരി ചക്ര ദൈർഘ്യം',
      avgPeriodLength: 'ശരാശരി ആർത്തവ ദൈർഘ്യം',
      saveSettings: 'സേവ് ചെയ്യുക',
      partnerCareHints: 'പങ്കാളിക്കുള്ള സൂചനകൾ',
      currentPhase: 'നിലവിലെ ഘട്ടം',
      menstrual: 'ആർത്തവം',
      follicular: 'ഫോളിക്കുലാർ',
      ovulationPhase: 'അണ്ഡോത്പാദനം',
      luteal: 'ല്യൂട്ടിയൽ',
      pms: 'PMS',
      unknown: 'അജ്ഞാതം',
      cycleStats: 'ചക്ര സ്ഥിതിവിവരക്കണക്കുകൾ',
      totalCyclesTracked: 'ട്രാക്ക് ചെയ്ത മൊത്തം ചക്രങ്ങൾ',
      lastPeriod: 'അവസാന ആർത്തവം',
      cycleStarted: 'ചക്രം ആരംഭിച്ചു',
      cycleEnded: 'ചക്രം അവസാനിച്ചു',
      logSaved: 'രേഖ സംരക്ഷിച്ചു',
      settingsSaved: 'ക്രമീകരണങ്ങൾ സംരക്ഷിച്ചു',
      privacyFirst: '🔒 നിങ്ങളുടെ ഡാറ്റ സ്വകാര്യവും സുരക്ഷിതവുമാണ്'
    }
  };

  const text = t[language] || t.en;

  useEffect(() => {
    loadSettings();
    loadCycles();
    loadPrediction();
  }, []);

  useEffect(() => {
    if (partnerId) {
      loadPartnerHints();
    }
  }, [partnerId]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/wellness/period/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadCycles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wellness/period/cycles?limit=12');
      if (res.ok) {
        const data = await res.json();
        setCycles(data.cycles);
      }
    } catch (err) {
      console.error('Failed to load cycles:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrediction = async () => {
    try {
      const res = await fetch('/api/wellness/period/prediction');
      if (res.ok) {
        const data = await res.json();
        setPrediction(data.prediction);
      }
    } catch (err) {
      console.error('Failed to load prediction:', err);
    }
  };

  const loadPartnerHints = async () => {
    try {
      const res = await fetch(`/api/wellness/period/partner-hints?partnerId=${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        setPartnerHints(data);
      }
    } catch (err) {
      console.error('Failed to load partner hints:', err);
    }
  };

  const saveSettings = async (updates) => {
    try {
      const res = await fetch('/api/wellness/period/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        alert(text.settingsSaved);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const startNewCycle = async () => {
    try {
      const res = await fetch('/api/wellness/period/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCycle)
      });

      if (res.ok) {
        loadCycles();
        loadPrediction();
        alert(text.cycleStarted);
        setNewCycle({
          startDate: new Date().toISOString().split('T')[0],
          endDate: null,
          flowIntensity: 'medium',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Failed to start cycle:', err);
    }
  };

  const endCurrentCycle = async () => {
    const currentCycle = cycles.find(c => !c.end_date);
    if (!currentCycle) return;

    try {
      const res = await fetch(`/api/wellness/period/cycles/${currentCycle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endDate: new Date().toISOString().split('T')[0]
        })
      });

      if (res.ok) {
        loadCycles();
        loadPrediction();
        alert(text.cycleEnded);
      }
    } catch (err) {
      console.error('Failed to end cycle:', err);
    }
  };

  const saveDailyLog = async () => {
    try {
      const res = await fetch('/api/wellness/period/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dailyLog,
          logDate: selectedDate.toISOString().split('T')[0]
        })
      });

      if (res.ok) {
        alert(text.logSaved);
        setDailyLog({
          symptoms: [],
          moodLevel: 3,
          painLevel: 0,
          notes: ''
        });
      }
    } catch (err) {
      console.error('Failed to save daily log:', err);
    }
  };

  const toggleSymptom = (symptom) => {
    setDailyLog(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  const isPeriodDay = (date) => {
    return cycles.some(cycle => {
      const start = new Date(cycle.start_date);
      const end = cycle.end_date ? new Date(cycle.end_date) : new Date(cycle.start_date);
      end.setDate(end.getDate() + (settings?.average_period_length || 5));
      return date >= start && date <= end;
    });
  };

  const isPredictedPeriod = (date) => {
    if (!prediction) return false;
    const start = new Date(prediction.predicted_start_date);
    const end = new Date(prediction.predicted_end_date);
    return date >= start && date <= end;
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat(language === 'ml' ? 'ml-IN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return '#28a745';
      case 'medium': return '#ffc107';
      case 'low': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="period-tracker">
      <style>{`
        .period-tracker {
          padding: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .tracker-header {
          margin-bottom: 2rem;
        }

        .tracker-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .tracker-header p {
          color: var(--text-secondary);
          margin: 0;
        }

        .privacy-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #e8f5e9;
          color: #2e7d32;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          margin-top: 0.75rem;
        }

        .tracker-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid var(--border);
          overflow-x: auto;
        }

        .tracker-tab {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tracker-tab:hover {
          color: var(--text);
          background: var(--hover);
        }

        .tracker-tab.active {
          color: #e91e63;
          border-bottom-color: #e91e63;
        }

        .calendar-view {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .calendar-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .calendar-nav {
          display: flex;
          gap: 0.5rem;
        }

        .calendar-nav button {
          padding: 0.5rem 1rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .calendar-nav button:hover {
          background: var(--hover);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }

        .calendar-day-header {
          text-align: center;
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-secondary);
          padding: 0.5rem;
        }

        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
          position: relative;
        }

        .calendar-day:hover {
          background: var(--hover);
        }

        .calendar-day.today {
          border-color: #2196f3;
          font-weight: 700;
        }

        .calendar-day.period {
          background: #ffcdd2;
          color: #c62828;
        }

        .calendar-day.predicted {
          background: #f3e5f5;
          color: #7b1fa2;
          border-style: dashed;
        }

        .calendar-day.selected {
          border-color: #e91e63;
          background: #fce4ec;
        }

        .calendar-legend {
          display: flex;
          gap: 1.5rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 4px;
        }

        .daily-log-form {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .form-section {
          margin-bottom: 2rem;
        }

        .form-section h3 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
        }

        .symptoms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .symptom-button {
          padding: 0.75rem;
          border: 2px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .symptom-button:hover {
          border-color: #e91e63;
        }

        .symptom-button.selected {
          border-color: #e91e63;
          background: #fce4ec;
        }

        .symptom-button .icon {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .symptom-button .label {
          font-size: 0.85rem;
          font-weight: 500;
        }

        .slider-control {
          margin-bottom: 1.5rem;
        }

        .slider-control label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .slider-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .slider {
          flex: 1;
          height: 8px;
          border-radius: 4px;
          background: var(--border);
          appearance: none;
          outline: none;
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #e91e63;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #e91e63;
          cursor: pointer;
          border: none;
        }

        .slider-value {
          min-width: 80px;
          text-align: right;
          font-weight: 600;
          color: #e91e63;
        }

        .prediction-card {
          background: linear-gradient(135deg, #e91e63 0%, #9c27b0 100%);
          color: white;
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .prediction-card h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
        }

        .prediction-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .prediction-item h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .prediction-item p {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .confidence-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.2);
        }

        .cycle-list {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .cycle-item {
          padding: 1rem;
          border-left: 4px solid #e91e63;
          background: var(--bg);
          border-radius: 4px;
          margin-bottom: 0.75rem;
        }

        .cycle-item h4 {
          margin: 0 0 0.5rem 0;
        }

        .cycle-item p {
          margin: 0.25rem 0;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .settings-form {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .settings-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border);
        }

        .settings-section:last-child {
          border-bottom: none;
        }

        .settings-section h3 {
          margin: 0 0 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .toggle-setting {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: var(--bg);
          border-radius: 8px;
          margin-bottom: 0.75rem;
        }

        .toggle-setting-info h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
        }

        .toggle-setting-info p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .toggle-switch {
          position: relative;
          width: 50px;
          height: 26px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
          border-radius: 26px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .toggle-slider {
          background-color: #e91e63;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .number-input {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .number-input label {
          flex: 1;
          font-weight: 500;
        }

        .number-input input {
          width: 80px;
          padding: 0.5rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          text-align: center;
          font-size: 1rem;
        }

        .partner-hints-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .hints-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .hint-item {
          padding: 1rem;
          background: var(--bg);
          border-left: 4px solid #e91e63;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .hint-icon {
          font-size: 1.5rem;
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
          background: #e91e63;
          color: white;
        }

        .btn-primary:hover {
          background: #c2185b;
        }

        .btn-secondary {
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .btn-secondary:hover {
          background: var(--hover);
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

        @media (max-width: 640px) {
          .period-tracker {
            padding: 1rem;
          }

          .calendar-grid {
            gap: 0.25rem;
          }

          .calendar-day {
            font-size: 0.8rem;
          }

          .symptoms-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .prediction-info {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="tracker-header">
        <h2>
          <Heart size={28} style={{ color: '#e91e63' }} />
          {text.title}
        </h2>
        <p>{text.subtitle}</p>
        <div className="privacy-badge">
          <Lock size={16} />
          {text.privacyFirst}
        </div>
      </div>

      <div className="tracker-tabs">
        <button
          className={`tracker-tab ${view === 'calendar' ? 'active' : ''}`}
          onClick={() => setView('calendar')}
        >
          <Calendar size={16} /> {text.calendar}
        </button>
        <button
          className={`tracker-tab ${view === 'log' ? 'active' : ''}`}
          onClick={() => setView('log')}
        >
          {text.dailyLog}
        </button>
        <button
          className={`tracker-tab ${view === 'prediction' ? 'active' : ''}`}
          onClick={() => setView('prediction')}
        >
          <TrendingUp size={16} /> {text.prediction}
        </button>
        <button
          className={`tracker-tab ${view === 'settings' ? 'active' : ''}`}
          onClick={() => setView('settings')}
        >
          <Settings size={16} /> {text.settings}
        </button>
        {partnerId && partnerHints?.enabled && (
          <button
            className={`tracker-tab ${view === 'partner' ? 'active' : ''}`}
            onClick={() => setView('partner')}
          >
            <Eye size={16} /> {text.partnerView}
          </button>
        )}
      </div>

      {view === 'calendar' && (
        <div className="calendar-view">
          <div className="calendar-header">
            <h3>
              {new Intl.DateTimeFormat(language === 'ml' ? 'ml-IN' : 'en-US', {
                year: 'numeric',
                month: 'long'
              }).format(currentMonth)}
            </h3>
            <div className="calendar-nav">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
              >
                {text.previousMonth}
              </button>
              <button onClick={() => setCurrentMonth(new Date())}>
                {text.today}
              </button>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
              >
                {text.nextMonth}
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="calendar-day-header">{day}</div>
            ))}
            {generateCalendar().map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
              
              const isToday = date.toDateString() === new Date().toDateString();
              const isPeriod = isPeriodDay(date);
              const isPredicted = isPredictedPeriod(date);
              const isSelected = selectedDate.toDateString() === date.toDateString();

              return (
                <div
                  key={i}
                  className={`calendar-day ${isToday ? 'today' : ''} ${isPeriod ? 'period' : ''} ${isPredicted ? 'predicted' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  {date.getDate()}
                </div>
              );
            })}
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#ffcdd2' }} />
              {text.periodDays}
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#f3e5f5', border: '2px dashed #7b1fa2' }} />
              {text.predictedPeriod}
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ border: '2px solid #2196f3' }} />
              {text.today}
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setView('log')}>
              {text.startNewCycle}
            </button>
            {cycles.some(c => !c.end_date) && (
              <button className="btn btn-secondary" onClick={endCurrentCycle}>
                {text.endCycle}
              </button>
            )}
          </div>
        </div>
      )}

      {view === 'log' && (
        <div className="daily-log-form">
          <h3>{text.logSymptoms} - {formatDate(selectedDate)}</h3>

          <div className="form-section">
            <h4>{text.selectSymptoms}</h4>
            <div className="symptoms-grid">
              {availableSymptoms.map(symptom => (
                <div
                  key={symptom.key}
                  className={`symptom-button ${dailyLog.symptoms.includes(symptom.key) ? 'selected' : ''}`}
                  onClick={() => toggleSymptom(symptom.key)}
                >
                  <div className="icon">{symptom.icon}</div>
                  <div className="label">{language === 'ml' ? symptom.ml : symptom.en}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <div className="slider-control">
              <label>{text.moodLevel}</label>
              <div className="slider-wrapper">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={dailyLog.moodLevel}
                  onChange={(e) => setDailyLog({ ...dailyLog, moodLevel: parseInt(e.target.value) })}
                  className="slider"
                />
                <div className="slider-value">
                  {[text.veryLow, text.low, text.okay, text.good, text.great][dailyLog.moodLevel - 1]}
                </div>
              </div>
            </div>

            <div className="slider-control">
              <label>{text.painLevel}</label>
              <div className="slider-wrapper">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={dailyLog.painLevel}
                  onChange={(e) => setDailyLog({ ...dailyLog, painLevel: parseInt(e.target.value) })}
                  className="slider"
                />
                <div className="slider-value">
                  {dailyLog.painLevel === 0 ? text.noPain : dailyLog.painLevel <= 3 ? text.mild : dailyLog.painLevel <= 6 ? text.moderate : text.severe}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <label>{text.notes}</label>
            <textarea
              value={dailyLog.notes}
              onChange={(e) => setDailyLog({ ...dailyLog, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
          </div>

          <button className="btn btn-primary" onClick={saveDailyLog}>
            {text.saveLog}
          </button>

          {/* New cycle form */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <h3>{text.startNewCycle}</h3>
            <div className="number-input">
              <label>{text.startDate}</label>
              <input
                type="date"
                value={newCycle.startDate}
                onChange={(e) => setNewCycle({ ...newCycle, startDate: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>{text.flowIntensity}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {flowIntensities.map(flow => (
                  <button
                    key={flow.key}
                    onClick={() => setNewCycle({ ...newCycle, flowIntensity: flow.key })}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: `2px solid ${newCycle.flowIntensity === flow.key ? flow.color : 'var(--border)'}`,
                      borderRadius: '8px',
                      background: newCycle.flowIntensity === flow.key ? flow.color + '20' : 'var(--bg)',
                      cursor: 'pointer'
                    }}
                  >
                    {language === 'ml' ? flow.ml : flow.en}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={startNewCycle}>
              {text.saveCycle}
            </button>
          </div>
        </div>
      )}

      {view === 'prediction' && (
        <div>
          {prediction && prediction.predicted_start_date ? (
            <>
              <div className="prediction-card">
                <h3>{text.nextPeriodPrediction}</h3>
                <div className="prediction-info">
                  <div className="prediction-item">
                    <h4>{text.predictedStart}</h4>
                    <p>{formatDate(prediction.predicted_start_date)}</p>
                  </div>
                  <div className="prediction-item">
                    <h4>{text.predictedEnd}</h4>
                    <p>{formatDate(prediction.predicted_end_date)}</p>
                  </div>
                  <div className="prediction-item">
                    <h4>{text.confidence}</h4>
                    <p>
                      <span
                        className="confidence-badge"
                        style={{ background: getConfidenceColor(prediction.confidence) }}
                      >
                        {prediction.confidence.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="cycle-list">
                <h3>{text.cycleHistory}</h3>
                {cycles.slice(0, 6).map(cycle => (
                  <div key={cycle.id} className="cycle-item">
                    <h4>{formatDate(cycle.start_date)}</h4>
                    {cycle.end_date && <p>{text.endDate}: {formatDate(cycle.end_date)}</p>}
                    {cycle.flow_intensity && <p>{text.flowIntensity}: {cycle.flow_intensity}</p>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <AlertCircle size={64} />
              <h3>{text.notEnoughData}</h3>
              <p>{text.trackMoreCycles}</p>
            </div>
          )}
        </div>
      )}

      {view === 'settings' && settings && (
        <div className="settings-form">
          <div className="settings-section">
            <h3>
              <Lock size={20} />
              {text.privacySettings}
            </h3>

            <div className="toggle-setting">
              <div className="toggle-setting-info">
                <h4>{text.shareWithPartner}</h4>
                <p>{text.shareDescription}</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.share_with_partner || false}
                  onChange={(e) => saveSettings({ shareWithPartner: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="toggle-setting">
              <div className="toggle-setting-info">
                <h4>{text.partnerHintsEnabled}</h4>
                <p>{text.hintsDescription}</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.partner_hints_enabled || false}
                  onChange={(e) => saveSettings({ partnerHintsEnabled: e.target.checked })}
                  disabled={!settings.share_with_partner}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>{text.cycleSettings}</h3>
            <div className="number-input">
              <label>{text.avgCycleLength}</label>
              <input
                type="number"
                min="20"
                max="45"
                value={settings.average_cycle_length || 28}
                onChange={(e) => saveSettings({ averageCycleLength: parseInt(e.target.value) })}
              />
              <span>{text.days}</span>
            </div>
            <div className="number-input">
              <label>{text.avgPeriodLength}</label>
              <input
                type="number"
                min="2"
                max="10"
                value={settings.average_period_length || 5}
                onChange={(e) => saveSettings({ averagePeriodLength: parseInt(e.target.value) })}
              />
              <span>{text.days}</span>
            </div>
          </div>
        </div>
      )}

      {view === 'partner' && partnerHints && (
        <div className="partner-hints-card">
          <h3>{text.partnerCareHints}</h3>
          {partnerHints.phase && partnerHints.phase !== 'unknown' && (
            <p>
              {text.currentPhase}: <strong>{text[partnerHints.phase] || partnerHints.phase}</strong>
            </p>
          )}
          {partnerHints.hints && partnerHints.hints.length > 0 ? (
            <div className="hints-list">
              {partnerHints.hints.map((hint, i) => (
                <div key={i} className="hint-item">
                  <span className="hint-icon">{hint.icon}</span>
                  <span>{language === 'ml' ? hint.hint_ml : hint.hint_en}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>{text.notEnoughData}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
