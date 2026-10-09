import { useState, useEffect } from 'react';
import { Heart, Play, Pause, CheckCircle, TrendingDown, Music, BookOpen, Wind } from 'lucide-react';

/**
 * Stress Relief & Meditation Together Component
 * Guided meditation, breathing exercises, and stress tracking
 */
export default function StressReliefMeditation({ currentUserId, partnerId, language = 'en' }) {
  const [view, setView] = useState('home'); // 'home', 'meditate', 'breathing', 'stress', 'gratitude', 'stats'
  const [templates, setTemplates] = useState([]);
  const [ambientSounds, setAmbientSounds] = useState([]);
  const [activeSes

sion, setActiveSession] = useState(null);
  const [stressCheckins, setStressCheckins] = useState([]);
  const [gratitudeEntries, setGratitudeEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Session state
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSound, setSelectedSound] = useState(null);

  // Breathing exercise state
  const [breathingPhase, setBreathingPhase] = useState('inhale'); // 'inhale', 'hold', 'exhale'
  const [breathingCount, setBreathingCount] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);

  // Stress check-in form
  const [stressForm, setStressForm] = useState({
    stressLevel: 5,
    triggers: [],
    mood: '',
    notes: ''
  });

  // Gratitude form
  const [gratitudeText, setGratitudeText] = useState('');
  const [shareWithPartner, setShareWithPartner] = useState(false);

  const moods = [
    { key: 'anxious', en: 'Anxious', ml: 'ഉത്കണ്ഠ', icon: '😰', color: '#ff9800' },
    { key: 'overwhelmed', en: 'Overwhelmed', ml: 'ഭാരമുള്ള', icon: '😵', color: '#f44336' },
    { key: 'tired', en: 'Tired', ml: 'ക്ഷീണിതം', icon: '😴', color: '#9e9e9e' },
    { key: 'frustrated', en: 'Frustrated', ml: 'നിരാശയായ', icon: '😤', color: '#ff5722' },
    { key: 'calm', en: 'Calm', ml: 'ശാന്തം', icon: '😌', color: '#4caf50' },
    { key: 'peaceful', en: 'Peaceful', ml: 'സമാധാനം', icon: '🧘', color: '#2196f3' }
  ];

  const stressTriggers = [
    { key: 'work', en: 'Work', ml: 'ജോലി' },
    { key: 'relationships', en: 'Relationships', ml: 'ബന്ധങ്ങൾ' },
    { key: 'health', en: 'Health', ml: 'ആരോഗ്യം' },
    { key: 'finances', en: 'Finances', ml: 'സാമ്പത്തികം' },
    { key: 'family', en: 'Family', ml: 'കുടുംബം' },
    { key: 'sleep', en: 'Sleep', ml: 'ഉറക്കം' },
    { key: 'other', en: 'Other', ml: 'മറ്റുള്ളവ' }
  ];

  const t = {
    en: {
      title: 'Stress Relief & Meditation',
      subtitle: 'Find calm together',
      home: 'Home',
      meditate: 'Meditate',
      breathing: 'Breathing',
      stressCheckIn: 'Stress Check-in',
      gratitude: 'Gratitude',
      stats: 'Stats',
      // Home view
      welcomeBack: 'Welcome Back',
      howAreYouFeeling: 'How are you feeling today?',
      quickActions: 'Quick Actions',
      startMeditation: 'Start Meditation',
      breathingExercise: 'Breathing Exercise',
      checkStress: 'Check Stress Level',
      writeGratitude: 'Write Gratitude',
      recentSessions: 'Recent Sessions',
      noSessions: 'No sessions yet',
      // Meditation
      chooseMeditation: 'Choose a Meditation',
      duration: 'Duration',
      minutes: 'mins',
      startSession: 'Start Session',
      invitePartner: 'Invite Partner',
      soloSession: 'Solo Session',
      sessionInProgress: 'Session in Progress',
      completeSession: 'Complete Session',
      pauseSession: 'Pause',
      resumeSession: 'Resume',
      ambientSound: 'Ambient Sound',
      selectSound: 'Select a sound',
      // Breathing
      breathingTitle: 'Breathing Exercise',
      synchronized: 'Synchronized with Partner',
      startBreathing: 'Start',
      stopBreathing: 'Stop',
      inhale: 'Inhale',
      hold: 'Hold',
      exhale: 'Exhale',
      breathCount: 'Breaths',
      deepBreath: 'Take a deep breath...',
      // Stress check-in
      currentStressLevel: 'Current Stress Level',
      calm: 'Calm',
      veryStressed: 'Very Stressed',
      whatsCausing: 'What\'s causing stress?',
      howFeeling: 'How are you feeling?',
      additionalNotes: 'Additional Notes',
      submitCheckIn: 'Submit Check-in',
      // Gratitude
      gratitudeJournal: 'Gratitude Journal',
      whatGratefulFor: 'What are you grateful for today?',
      writeEntry: 'Write your gratitude entry...',
      sharePartner: 'Share with partner',
      saveEntry: 'Save Entry',
      recentEntries: 'Recent Entries',
      sharedEntry: 'Shared',
      privateEntry: 'Private',
      // Stats
      wellnessStats: 'Wellness Statistics',
      avgStressLevel: 'Average Stress Level',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      meditationSessions: 'Meditation Sessions',
      thisWeek: 'This Week',
      gratitudeEntries: 'Gratitude Entries',
      stressReduction: 'Stress Reduction',
      trendDown: 'Trending Down',
      trendUp: 'Trending Up',
      noChange: 'Stable',
      // Messages
      sessionStarted: 'Session started',
      sessionCompleted: 'Session completed! Well done! 🎉',
      checkinSaved: 'Check-in saved',
      entrySaved: 'Entry saved',
      takeDeepBreath: 'Take a moment to breathe deeply',
      feeling: 'Feeling',
      today: 'Today'
    },
    ml: {
      title: 'സമ്മർദ്ദം കുറയ്ക്കലും ധ്യാനവും',
      subtitle: 'ഒരുമിച്ച് ശാന്തത കണ്ടെത്തുക',
      home: 'ഹോം',
      meditate: 'ധ്യാനം',
      breathing: 'ശ്വാസോച്ഛ്വാസം',
      stressCheckIn: 'സമ്മർദ്ദം പരിശോധിക്കുക',
      gratitude: 'നന്ദി',
      stats: 'സ്ഥിതിവിവരക്കണക്കുകൾ',
      welcomeBack: 'സ്വാഗതം',
      howAreYouFeeling: 'ഇന്ന് എങ്ങനെയുണ്ട്?',
      quickActions: 'ദ്രുത പ്രവർത്തനങ്ങൾ',
      startMeditation: 'ധ്യാനം ആരംഭിക്കുക',
      breathingExercise: 'ശ്വാസോച്ഛ്വാസ വ്യായാമം',
      checkStress: 'സമ്മർദ്ദം പരിശോധിക്കുക',
      writeGratitude: 'നന്ദി എഴുതുക',
      recentSessions: 'സമീപകാല സെഷനുകൾ',
      noSessions: 'സെഷനുകൾ ഇല്ല',
      chooseMeditation: 'ധ്യാനം തിരഞ്ഞെടുക്കുക',
      duration: 'ദൈർഘ്യം',
      minutes: 'മിനിറ്റ്',
      startSession: 'സെഷൻ ആരംഭിക്കുക',
      invitePartner: 'പങ്കാളിയെ ക്ഷണിക്കുക',
      soloSession: 'ഒറ്റയ്ക്ക് സെഷൻ',
      sessionInProgress: 'സെഷൻ പുരോഗമിക്കുന്നു',
      completeSession: 'സെഷൻ പൂർത്തിയാക്കുക',
      pauseSession: 'താൽക്കാലികമായി നിർത്തുക',
      resumeSession: 'പുനരാരംഭിക്കുക',
      ambientSound: 'പശ്ചാത്തല ശബ്ദം',
      selectSound: 'ശബ്ദം തിരഞ്ഞെടുക്കുക',
      breathingTitle: 'ശ്വാസോച്ഛ്വാസ വ്യായാമം',
      synchronized: 'പങ്കാളിയുമായി സമന്വയിപ്പിച്ചത്',
      startBreathing: 'ആരംഭിക്കുക',
      stopBreathing: 'നിർത്തുക',
      inhale: 'ശ്വസിക്കുക',
      hold: 'നിർത്തുക',
      exhale: 'പുറത്തേക്ക് വിടുക',
      breathCount: 'ശ്വാസങ്ങൾ',
      deepBreath: 'ആഴത്തിൽ ശ്വസിക്കുക...',
      currentStressLevel: 'നിലവിലെ സമ്മർദ്ദം',
      calm: 'ശാന്തം',
      veryStressed: 'വളരെ സമ്മർദ്ദം',
      whatsCausing: 'എന്താണ് സമ്മർദ്ദത്തിന് കാരണം?',
      howFeeling: 'എങ്ങനെയാണ് തോന്നുന്നത്?',
      additionalNotes: 'അധിക കുറിപ്പുകൾ',
      submitCheckIn: 'സമർപ്പിക്കുക',
      gratitudeJournal: 'നന്ദി ജേണൽ',
      whatGratefulFor: 'ഇന്ന് എന്തിന് നന്ദിയുണ്ട്?',
      writeEntry: 'നിങ്ങളുടെ നന്ദി എഴുതുക...',
      sharePartner: 'പങ്കാളിയുമായി പങ്കിടുക',
      saveEntry: 'സേവ് ചെയ്യുക',
      recentEntries: 'സമീപകാല എൻട്രികൾ',
      sharedEntry: 'പങ്കിട്ടത്',
      privateEntry: 'സ്വകാര്യം',
      wellnessStats: 'ആരോഗ്യ സ്ഥിതിവിവരക്കണക്കുകൾ',
      avgStressLevel: 'ശരാശരി സമ്മർദ്ദം',
      last7Days: 'കഴിഞ്ഞ 7 ദിവസം',
      last30Days: 'കഴിഞ്ഞ 30 ദിവസം',
      meditationSessions: 'ധ്യാന സെഷനുകൾ',
      thisWeek: 'ഈ ആഴ്ച',
      gratitudeEntries: 'നന്ദി എൻട്രികൾ',
      stressReduction: 'സമ്മർദ്ദം കുറയ്ക്കൽ',
      trendDown: 'കുറയുന്നു',
      trendUp: 'വർദ്ധിക്കുന്നു',
      noChange: 'സ്ഥിരം',
      sessionStarted: 'സെഷൻ ആരംഭിച്ചു',
      sessionCompleted: 'സെഷൻ പൂർത്തിയായി! നല്ലത്! 🎉',
      checkinSaved: 'പരിശോധന സംരക്ഷിച്ചു',
      entrySaved: 'എൻട്രി സംരക്ഷിച്ചു',
      takeDeepBreath: 'ആഴത്തിൽ ശ്വസിക്കാൻ ഒരു നിമിഷം എടുക്കുക',
      feeling: 'അനുഭവപ്പെടുന്നത്',
      today: 'ഇന്ന്'
    }
  };

  const text = t[language] || t.en;

  useEffect(() => {
    loadTemplates();
    loadAmbientSounds();
    loadWellnessData();
  }, []);

  useEffect(() => {
    let interval;
    if (isSessionActive && activeSession) {
      interval = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, activeSession]);

  useEffect(() => {
    let interval;
    if (isBreathing) {
      interval = setInterval(() => {
        setBreathingPhase(prev => {
          if (prev === 'inhale') return 'hold';
          if (prev === 'hold') return 'exhale';
          setBreathingCount(c => c + 1);
          return 'inhale';
        });
      }, 4000); // 4 seconds per phase
    }
    return () => clearInterval(interval);
  }, [isBreathing]);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/wellness/meditation/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const loadAmbientSounds = async () => {
    try {
      const res = await fetch('/api/wellness/ambient-sounds');
      if (res.ok) {
        const data = await res.json();
        setAmbientSounds(data.sounds);
      }
    } catch (err) {
      console.error('Failed to load sounds:', err);
    }
  };

  const loadWellnessData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, checkinsRes, gratitudeRes, statsRes] = await Promise.all([
        fetch('/api/wellness/meditation/sessions?limit=10'),
        fetch('/api/wellness/stress/check-ins?days=30'),
        fetch('/api/wellness/gratitude?limit=10'),
        fetch('/api/wellness/wellness/dashboard')
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        // Set recent sessions to state if needed
      }

      if (checkinsRes.ok) {
        const data = await checkinsRes.json();
        setStressCheckins(data.checkIns || []);
      }

      if (gratitudeRes.ok) {
        const data = await gratitudeRes.json();
        setGratitudeEntries(data.entries || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load wellness data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startMeditationSession = async (templateId, withPartner = false) => {
    try {
      const res = await fetch('/api/wellness/meditation/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          partnerId: withPartner ? partnerId : null,
          isSynchronized: withPartner
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session);
        setIsSessionActive(true);
        setSessionTimer(0);
        alert(text.sessionStarted);
      }
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const completeSession = async () => {
    if (!activeSession) return;

    try {
      const res = await fetch(`/api/wellness/meditation/sessions/${activeSession.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes: Math.floor(sessionTimer / 60)
        })
      });

      if (res.ok) {
        alert(text.sessionCompleted);
        setActiveSession(null);
        setIsSessionActive(false);
        setSessionTimer(0);
        loadWellnessData();
      }
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  };

  const submitStressCheckIn = async () => {
    try {
      const res = await fetch('/api/wellness/stress/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stressForm)
      });

      if (res.ok) {
        alert(text.checkinSaved);
        setStressForm({
          stressLevel: 5,
          triggers: [],
          mood: '',
          notes: ''
        });
        loadWellnessData();
      }
    } catch (err) {
      console.error('Failed to submit check-in:', err);
    }
  };

  const saveGratitudeEntry = async () => {
    if (!gratitudeText.trim()) return;

    try {
      const res = await fetch('/api/wellness/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryText: gratitudeText,
          isSharedWithPartner: shareWithPartner
        })
      });

      if (res.ok) {
        alert(text.entrySaved);
        setGratitudeText('');
        setShareWithPartner(false);
        loadWellnessData();
      }
    } catch (err) {
      console.error('Failed to save entry:', err);
    }
  };

  const toggleTrigger = (trigger) => {
    setStressForm(prev => ({
      ...prev,
      triggers: prev.triggers.includes(trigger)
        ? prev.triggers.filter(t => t !== trigger)
        : [...prev.triggers, trigger]
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="stress-relief">
      <style>{`
        .stress-relief {
          padding: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .relief-header {
          margin-bottom: 2rem;
        }

        .relief-header h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
        }

        .relief-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid var(--border);
          overflow-x: auto;
        }

        .relief-tab {
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

        .relief-tab:hover {
          color: var(--text);
          background: var(--hover);
        }

        .relief-tab.active {
          color: #9c27b0;
          border-bottom-color: #9c27b0;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .action-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }

        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .action-card .icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
        }

        .action-card h3 {
          margin: 0;
          font-size: 1rem;
        }

        .meditation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .meditation-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .meditation-card:hover {
          border-color: #9c27b0;
          box-shadow: 0 4px 12px rgba(156, 39, 176, 0.2);
        }

        .meditation-card.selected {
          border-color: #9c27b0;
          background: #f3e5f5;
        }

        .meditation-card .header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .meditation-card .icon {
          font-size: 2rem;
        }

        .meditation-card h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .meditation-card .duration {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: var(--bg);
          border-radius: 12px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .breathing-exercise {
          text-align: center;
          padding: 3rem 1rem;
        }

        .breathing-circle {
          width: 200px;
          height: 200px;
          margin: 0 auto 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 600;
          color: white;
          transition: all 4s ease-in-out;
        }

        .breathing-circle.inhale {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transform: scale(1.3);
        }

        .breathing-circle.hold {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          transform: scale(1.3);
        }

        .breathing-circle.exhale {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          transform: scale(0.8);
        }

        .breathing-controls {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        }

        .stress-form {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .stress-slider {
          margin: 2rem 0;
        }

        .stress-slider input {
          width: 100%;
          height: 10px;
          border-radius: 5px;
          background: linear-gradient(to right, #4caf50 0%, #ffeb3b 50%, #f44336 100%);
          outline: none;
        }

        .stress-slider input::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: white;
          border: 3px solid #9c27b0;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .stress-value {
          text-align: center;
          font-size: 2.5rem;
          font-weight: 700;
          color: #9c27b0;
          margin: 1rem 0;
        }

        .triggers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .trigger-button {
          padding: 0.75rem;
          border: 2px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .trigger-button:hover {
          border-color: #9c27b0;
        }

        .trigger-button.selected {
          border-color: #9c27b0;
          background: #f3e5f5;
        }

        .moods-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .mood-button {
          padding: 1rem 0.5rem;
          border: 2px solid var(--border);
          border-radius: 8px;
          background: var(--bg);
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .mood-button:hover {
          transform: scale(1.05);
        }

        .mood-button.selected {
          border-width: 3px;
        }

        .mood-button .icon {
          font-size: 2rem;
          margin-bottom: 0.25rem;
        }

        .mood-button .label {
          font-size: 0.85rem;
          font-weight: 500;
        }

        .gratitude-form {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .gratitude-form textarea {
          width: 100%;
          min-height: 150px;
          padding: 1rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 1rem;
          resize: vertical;
          margin-bottom: 1rem;
        }

        .gratitude-entries {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 2rem;
        }

        .gratitude-entry {
          background: var(--bg);
          border-left: 4px solid #9c27b0;
          padding: 1rem;
          border-radius: 4px;
        }

        .gratitude-entry .date {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .gratitude-entry .text {
          font-size: 1rem;
          line-height: 1.6;
        }

        .gratitude-entry .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 0.5rem;
        }

        .gratitude-entry .badge.shared {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .gratitude-entry .badge.private {
          background: #e3f2fd;
          color: #1565c0;
        }

        .session-timer {
          text-align: center;
          padding: 3rem 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          margin-bottom: 1.5rem;
        }

        .session-timer .time {
          font-size: 4rem;
          font-weight: 700;
          margin: 1rem 0;
        }

        .session-timer .controls {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
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
          color: #9c27b0;
          margin-bottom: 0.5rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: #9c27b0;
          color: white;
        }

        .btn-primary:hover {
          background: #7b1fa2;
        }

        .btn-secondary {
          background: var(--bg);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .btn-secondary:hover {
          background: var(--hover);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          padding: 0.5rem;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
        }

        @media (max-width: 640px) {
          .stress-relief {
            padding: 1rem;
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }

          .meditation-grid {
            grid-template-columns: 1fr;
          }

          .breathing-circle {
            width: 150px;
            height: 150px;
            font-size: 1.5rem;
          }

          .session-timer .time {
            font-size: 3rem;
          }
        }
      `}</style>

      <div className="relief-header">
        <h2>
          <Heart size={28} style={{ color: '#9c27b0' }} />
          {text.title}
        </h2>
        <p>{text.subtitle}</p>
      </div>

      <div className="relief-tabs">
        <button
          className={`relief-tab ${view === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          {text.home}
        </button>
        <button
          className={`relief-tab ${view === 'meditate' ? 'active' : ''}`}
          onClick={() => setView('meditate')}
        >
          {text.meditate}
        </button>
        <button
          className={`relief-tab ${view === 'breathing' ? 'active' : ''}`}
          onClick={() => setView('breathing')}
        >
          <Wind size={16} /> {text.breathing}
        </button>
        <button
          className={`relief-tab ${view === 'stress' ? 'active' : ''}`}
          onClick={() => setView('stress')}
        >
          <TrendingDown size={16} /> {text.stressCheckIn}
        </button>
        <button
          className={`relief-tab ${view === 'gratitude' ? 'active' : ''}`}
          onClick={() => setView('gratitude')}
        >
          <BookOpen size={16} /> {text.gratitude}
        </button>
        <button
          className={`relief-tab ${view === 'stats' ? 'active' : ''}`}
          onClick={() => setView('stats')}
        >
          {text.stats}
        </button>
      </div>

      {view === 'home' && (
        <div>
          <h3>{text.quickActions}</h3>
          <div className="quick-actions">
            <div className="action-card" onClick={() => setView('meditate')}>
              <div className="icon">🧘</div>
              <h3>{text.startMeditation}</h3>
            </div>
            <div className="action-card" onClick={() => setView('breathing')}>
              <div className="icon">🫁</div>
              <h3>{text.breathingExercise}</h3>
            </div>
            <div className="action-card" onClick={() => setView('stress')}>
              <div className="icon">📊</div>
              <h3>{text.checkStress}</h3>
            </div>
            <div className="action-card" onClick={() => setView('gratitude')}>
              <div className="icon">🙏</div>
              <h3>{text.writeGratitude}</h3>
            </div>
          </div>
        </div>
      )}

      {view === 'meditate' && (
        <div>
          {activeSession && isSessionActive ? (
            <div className="session-timer">
              <h2>{selectedTemplate ? (language === 'ml' ? selectedTemplate.name_ml : selectedTemplate.name_en) : text.sessionInProgress}</h2>
              <div className="time">{formatTime(sessionTimer)}</div>
              <p>{text.takeDeepBreath}</p>
              <div className="controls">
                <button className="btn btn-secondary" onClick={() => setIsSessionActive(!isSessionActive)}>
                  {isSessionActive ? <Pause size={20} /> : <Play size={20} />}
                  {isSessionActive ? text.pauseSession : text.resumeSession}
                </button>
                <button className="btn btn-primary" onClick={completeSession}>
                  <CheckCircle size={20} />
                  {text.completeSession}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3>{text.chooseMeditation}</h3>
              <div className="meditation-grid">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className={`meditation-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="header">
                      <span className="icon">{template.icon}</span>
                      <h3>{language === 'ml' ? template.name_ml : template.name_en}</h3>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>
                      {language === 'ml' ? template.description_ml : template.description_en}
                    </p>
                    <span className="duration">
                      {template.duration_minutes} {text.minutes}
                    </span>
                  </div>
                ))}
              </div>

              {selectedTemplate && (
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => startMeditationSession(selectedTemplate.id, false)}>
                    <Play size={20} />
                    {text.soloSession}
                  </button>
                  {partnerId && (
                    <button className="btn btn-secondary" onClick={() => startMeditationSession(selectedTemplate.id, true)}>
                      <Heart size={20} />
                      {text.invitePartner}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {view === 'breathing' && (
        <div className="breathing-exercise">
          <h3>{text.breathingTitle}</h3>
          <div className={`breathing-circle ${breathingPhase}`}>
            {text[breathingPhase]}
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {text.breathCount}: {breathingCount}
          </p>
          <div className="breathing-controls">
            <button
              className={`btn ${isBreathing ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => {
                if (isBreathing) {
                  setIsBreathing(false);
                  setBreathingPhase('inhale');
                } else {
                  setIsBreathing(true);
                  setBreathingCount(0);
                }
              }}
            >
              {isBreathing ? text.stopBreathing : text.startBreathing}
            </button>
          </div>
        </div>
      )}

      {view === 'stress' && (
        <div className="stress-form">
          <h3>{text.currentStressLevel}</h3>
          <div className="stress-value">{stressForm.stressLevel}/10</div>
          <div className="stress-slider">
            <input
              type="range"
              min="1"
              max="10"
              value={stressForm.stressLevel}
              onChange={(e) => setStressForm({ ...stressForm, stressLevel: parseInt(e.target.value) })}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <span>{text.calm}</span>
              <span>{text.veryStressed}</span>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h4>{text.whatsCausing}</h4>
            <div className="triggers-grid">
              {stressTriggers.map(trigger => (
                <div
                  key={trigger.key}
                  className={`trigger-button ${stressForm.triggers.includes(trigger.key) ? 'selected' : ''}`}
                  onClick={() => toggleTrigger(trigger.key)}
                >
                  {language === 'ml' ? trigger.ml : trigger.en}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h4>{text.howFeeling}</h4>
            <div className="moods-grid">
              {moods.map(mood => (
                <div
                  key={mood.key}
                  className={`mood-button ${stressForm.mood === mood.key ? 'selected' : ''}`}
                  onClick={() => setStressForm({ ...stressForm, mood: mood.key })}
                  style={{ borderColor: stressForm.mood === mood.key ? mood.color : 'var(--border)' }}
                >
                  <div className="icon">{mood.icon}</div>
                  <div className="label">{language === 'ml' ? mood.ml : mood.en}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <label>{text.additionalNotes}</label>
            <textarea
              value={stressForm.notes}
              onChange={(e) => setStressForm({ ...stressForm, notes: e.target.value })}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                marginTop: '0.5rem',
                resize: 'vertical'
              }}
            />
          </div>

          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={submitStressCheckIn}>
            {text.submitCheckIn}
          </button>
        </div>
      )}

      {view === 'gratitude' && (
        <div>
          <div className="gratitude-form">
            <h3>{text.whatGratefulFor}</h3>
            <textarea
              value={gratitudeText}
              onChange={(e) => setGratitudeText(e.target.value)}
              placeholder={text.writeEntry}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={shareWithPartner}
                onChange={(e) => setShareWithPartner(e.target.checked)}
              />
              {text.sharePartner}
            </label>
            <button className="btn btn-primary" onClick={saveGratitudeEntry}>
              {text.saveEntry}
            </button>
          </div>

          {gratitudeEntries.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3>{text.recentEntries}</h3>
              <div className="gratitude-entries">
                {gratitudeEntries.map(entry => (
                  <div key={entry.id} className="gratitude-entry">
                    <div className="date">
                      {new Date(entry.created_at).toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text">{entry.entry_text}</div>
                    <span className={`badge ${entry.is_shared_with_partner ? 'shared' : 'private'}`}>
                      {entry.is_shared_with_partner ? text.sharedEntry : text.privateEntry}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'stats' && stats && (
        <div>
          <h3>{text.wellnessStats}</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>{text.avgStressLevel}</h4>
              <div className="stat-value">{stats.avg_stress_level_week ? stats.avg_stress_level_week.toFixed(1) : 'N/A'}</div>
              <p>{text.last7Days}</p>
            </div>
            <div className="stat-card">
              <h4>{text.meditationSessions}</h4>
              <div className="stat-value">{stats.meditation_sessions_week || 0}</div>
              <p>{text.thisWeek}</p>
            </div>
            <div className="stat-card">
              <h4>{text.gratitudeEntries}</h4>
              <div className="stat-value">{stats.gratitude_entries_week || 0}</div>
              <p>{text.thisWeek}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
