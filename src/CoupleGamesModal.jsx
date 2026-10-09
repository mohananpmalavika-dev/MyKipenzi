import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Gamepad2,
  Heart,
  Sparkles,
  Flame,
  HelpCircle,
  Shuffle,
  Send,
  X,
  CheckCircle2,
  Award,
  RotateCcw,
  Volume2,
  VolumeX,
  Share2,
  Smile,
  ShieldAlert,
} from 'lucide-react';
import { ButtonIcon, Avatar } from './components.jsx';

// Curated trivia question presets
const TRIVIA_PRESETS = [
  {
    id: 'fav-food',
    questionMl: 'എനിക്ക് സങ്കടമോ സ്ട്രെസ്സോ വരുമ്പോൾ ഏറ്റവും ഇഷ്ടപ്പെട്ട ഭക്ഷണം (Comfort Food) ഏതാണ്?',
    questionEn: "What is my absolute comfort food when I'm stressed or down?",
    options: ['Ice cream / Sweets 🍨', 'Biryani / Spicy food 🍛', 'Chai / Coffee ☕', 'Chocolates 🍫'],
    defaultCorrect: 0,
  },
  {
    id: 'first-memory',
    questionMl: 'നമ്മൾ ആദ്യം കണ്ടുമുട്ടിയപ്പോൾ എന്റെ മനസ്സിൽ തോന്നിയ ആദ്യ വികാരം എന്തായിരിക്കാം?',
    questionEn: "What was my very first impression or feeling when we first met?",
    options: ['Pure butterflies in the stomach 🦋', 'Instant sense of peace & comfort 🕊️', 'Could not stop smiling 😊', 'Fell in love right away 💖'],
    defaultCorrect: 1,
  },
  {
    id: 'love-language',
    questionMl: 'എന്റെ പ്രധാനപ്പെട്ട ലവ് ലാംഗ്വേജ് (Love Language) ഇതിൽ ഏതാണ്?',
    questionEn: "What is my primary love language?",
    options: ['Quality Time (ഒരുമിച്ചുള്ള സമയം) ⏳', 'Words of Affirmation (സ്നേഹവാക്കുകൾ) 💌', 'Physical Touch & Hugs (ആലിംഗനങ്ങൾ) 🫂', 'Acts of Service (കരുതലും സഹായവും) 🌸'],
    defaultCorrect: 0,
  },
  {
    id: 'dream-date',
    questionMl: 'നമ്മുടെ പെർഫെക്റ്റ് ഡ്രീം ഡേറ്റ് (Dream Date) ഇതിൽ ഏതായിരിക്കും?',
    questionEn: "What is my idea of our perfect dream date?",
    options: ['മഴയുള്ള രാത്രിയിൽ ബ്ലാങ്കറ്റിൽ സിനിമ കാണൽ 🌧️', 'ബീച്ചിൽ സൂര്യാസ്തമയ നടപ്പ് 🌅', 'മിഡ്‌നൈറ്റ് ലോങ് ഡ്രൈവ് & മ്യൂസിക് 🚗', 'വീട്ടിൽ ഉണ്ടാക്കിയ ക്യാൻഡിൽ ലൈറ്റ് ഡിന്നർ 🕯️'],
    defaultCorrect: 2,
  },
  {
    id: 'cheer-up',
    questionMl: 'എന്റെ മൂഡ് ഓഫ് ആവുമ്പോൾ എന്നെ ചിരിപ്പിക്കാൻ ഏറ്റവും എളുപ്പമുള്ള വഴി?',
    questionEn: "What never fails to make me smile when I'm grumpy?",
    options: ['ഒരു ഇറുക്കെയുള്ള ആലിംഗനം (Tight Hug) 🫂', 'തമാശ വീഡിയോയോ മീമോ കാണിക്കൽ 😂', 'ഒരു കപ്പ് ചൂട് ചായ/കാപ്പി തരിക ☕', 'എന്റെ കൈ ചേർത്തുപിടിക്കുക 🤝'],
    defaultCorrect: 0,
  },
];

// Curated Truth or Dare prompts
const TRUTH_PROMPTS = [
  {
    category: 'romantic',
    textMl: 'നമ്മുടെ ബന്ധത്തിൽ എന്നെ ഏറ്റവും കൂടുതൽ സ്നേഹിക്കാൻ തോന്നിയ ആ മാന്ത്രിക നിമിഷം ഏതാണ്?',
    textEn: 'What is that one magical moment in our relationship where you felt most deeply in love with me?',
  },
  {
    category: 'romantic',
    textMl: 'എന്റെ ഏത് ചെറിയ ശീലമാണ് അല്ലെങ്കിൽ ഭാവമാണ് നിങ്ങൾക്ക് ഏറ്റവും കൂടുതൽ ക്യൂട്ട് ആയി തോന്നുന്നത്?',
    textEn: 'What is a little habit or expression of mine that you secretly find irresistibly cute?',
  },
  {
    category: 'deep',
    textMl: 'നമ്മൾ ഒരുമിച്ച് ജീവിക്കുന്ന ഭാവിയെക്കുറിച്ച് നിങ്ങൾ ഏറ്റവും കൂടുതൽ സ്വപ്നം കാണുന്ന ഒരു കാര്യം എന്താണ്?',
    textEn: 'What is one vivid dream you often have about our future together?',
  },
  {
    category: 'deep',
    textMl: 'നിങ്ങൾക്ക് ജീവിതത്തിൽ ഏറ്റവും ധൈര്യവും സമാധാനവും നൽകുന്ന എന്റെ ഒരു പ്രത്യേകത എന്താണ്?',
    textEn: 'What quality of mine gives you the most peace and emotional safety in life?',
  },
  {
    category: 'spicy',
    textMl: 'ഞാൻ നിങ്ങളുടെ അടുത്തുണ്ടായിരിക്കുമ്പോൾ നിങ്ങളുടെ ഹൃദയമിടിപ്പ് ഏറ്റവും കൂടുന്ന നിമിഷം ഏതാണ്?',
    textEn: 'When was a moment near me where your heart was racing the fastest?',
  },
  {
    category: 'spicy',
    textMl: 'നമ്മൾ അടുത്ത തവണ കാണുമ്പോൾ എനിക്ക് നൽകാൻ ആഗ്രഹിക്കുന്ന ഏറ്റവും മനോഹരമായ സർപ്രൈസ് എന്താണ്?',
    textEn: 'What is the sweetest surprise you want to give me the next time we meet in person?',
  },
];

const DARE_PROMPTS = [
  {
    category: 'romantic',
    textMl: 'നമുക്ക് രണ്ടുപേർക്കും പ്രിയപ്പെട്ട പാട്ടിന്റെ ഒരു വരി പാടി ഇപ്പോൾ തന്നെ 10 സെക്കൻഡ് വോയ്സ് നോട്ട് അയക്കൂ! 🎵',
    textEn: "Send a 10-second voice note singing a line of 'our song' right now! 🎵",
  },
  {
    category: 'romantic',
    textMl: 'ഈ നിമിഷം എന്നെക്കുറിച്ച് തോന്നുന്ന ഏറ്റവും റൊമാന്റിക് ആയ 3 വരികൾ ചാറ്റിൽ എഴുതൂ! 💌',
    textEn: 'Write 3 romantic sentences about how much you cherish me in our chat right now! 💌',
  },
  {
    category: 'deep',
    textMl: 'വിർച്വൽ ടച്ച് തുറന്ന് 10 സെക്കൻഡ് തുടർച്ചയായി സ്ക്രീനിൽ തൊട്ട് ഒരു ലോങ് ഹഗ് (Virtual Hug) തരൂ! 🫂',
    textEn: 'Open Virtual Touch and hold the screen for 10 seconds to give me a long warm hug! 🫂',
  },
  {
    category: 'spicy',
    textMl: 'ഒരു നിമിഷം പോലും ആലോചിക്കാതെ ഇപ്പോൾ തന്നെ ഏറ്റവും ക്യൂട്ട് ആയ ഒരു സെൽഫി (View-once ആയിട്ടായാലും) അയക്കൂ! 📸',
    textEn: 'Take a spontaneous cute selfie right now and send it as view-once or regular media! 📸',
  },
  {
    category: 'spicy',
    textMl: 'അടുത്ത 24 മണിക്കൂറിലേക്ക് എന്നെ വിളിക്കാൻ ഒരു പുതിയ ക്യൂട്ട് പെറ്റ് നെയിം (Secret Nickname) കണ്ടുപിടിക്കൂ! 🥰',
    textEn: 'Invent a brand new adorable pet nickname for me and use it for the next 24 hours! 🥰',
  },
];

// Curated Would You Rather dilemmas
const WOULD_YOU_RATHER = [
  {
    id: 'rain-vs-beach',
    optionA_Ml: 'മഴയുള്ള വൈകുന്നേരം ചൂട് ചായയും കുടിച്ച് സിനിമ കാണൽ 🌧️☕',
    optionA_En: 'Cozy rainy evening watching movies with chai & a blanket 🌧️☕',
    optionB_Ml: 'കടൽത്തീരത്ത് കൈകൾ കോർത്തുപിടിച്ച് സൂര്യാസ്തമയം കാണൽ 🌅🌊',
    optionB_En: 'Walking barefoot on the beach holding hands at sunset 🌅🌊',
  },
  {
    id: 'drive-vs-dinner',
    optionA_Ml: 'പാട്ടുകൾ വെച്ച് പാതിരാത്രിയിൽ ഒരു അപ്രതീക്ഷിത ലോങ് ഡ്രൈവ് 🚗🌙',
    optionA_En: 'Spontaneous midnight long drive listening to our favorite tracks 🚗🌙',
    optionB_Ml: 'വീട്ടിൽ ഒരുമിച്ച് കുക്ക് ചെയ്യുന്ന ക്യാൻഡിൽ ലൈറ്റ് ഡിന്നർ 🕯️🍝',
    optionB_En: 'Candle-lit dinner cooking our favorite meal together at home 🕯️🍝',
  },
  {
    id: 'cabin-vs-island',
    optionA_Ml: 'പുകമഞ്ഞുള്ള മലയോരത്തെ ശാന്തമായ ഒരു വുഡൻ ക്യാബിൻ 🏔️🪵',
    optionA_En: 'Peaceful misty mountain cabin escape away from the world 🏔️🪵',
    optionB_Ml: 'നീലക്കടലിനരികിലെ ഒരു സ്വകാര്യ ട്രോപ്പിക്കൽ വില്ല 🏝️🍹',
    optionB_En: 'Tropical beach villa with private pool & endless ocean view 🏝️🍹',
  },
  {
    id: 'morning-vs-night',
    optionA_Ml: 'രാവിലെ ഒന്നിച്ച് ഉണർന്ന് ഉണ്ടാക്കുന്ന ബ്രേക്ക്ഫാസ്റ്റ് ഇൻ ബെഡ് 🥞☀️',
    optionA_En: 'Waking up together early for lazy breakfast in bed 🥞☀️',
    optionB_Ml: 'ഉറക്കം വരാതെ പുലരുവോളം സംസാരിച്ചിരിക്കുന്ന പാതിരാവുകൾ 🌌💬',
    optionB_En: 'Talking under the stars until 3 AM about everything in the world 🌌💬',
  },
];

export function CoupleGamesModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onSendToChat,
  isCallMode = false,
}) {
  const [activeTab, setActiveTab] = useState('trivia'); // 'trivia' | 'truthdare' | 'wouldyourather'
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Trivia state
  const [selectedTriviaIndex, setSelectedTriviaIndex] = useState(0);
  const [triviaAnswers, setTriviaAnswers] = useState({}); // { [questionId]: { partnerAnswer: 0, myAnswer: 0, revealed: false } }
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [triviaStreak, setTriviaStreak] = useState(0);

  // Truth or Dare state
  const [tdMode, setTdMode] = useState('truth'); // 'truth' | 'dare'
  const [tdCategory, setTdCategory] = useState('romantic');
  const [currentPrompt, setCurrentPrompt] = useState(TRUTH_PROMPTS[0]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [completedPrompts, setCompletedPrompts] = useState([]);

  // Would You Rather state
  const [wyrIndex, setWyrIndex] = useState(0);
  const [wyrSelections, setWyrSelections] = useState({}); // { [id]: { myChoice: 'A', partnerChoice: 'A' } }

  const audioContextRef = useRef(null);

  // Play pleasant chime
  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'correct') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'spin') {
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      /* Audio playback is best effort */
    }
  }, [soundEnabled]);

  // Handle incoming socket events for couple games
  useEffect(() => {
    if (!socket) return;

    const handleGameAction = (payload) => {
      if (payload.conversation_id !== conversationId) return;

      if (payload.type === 'trivia_answer') {
        setTriviaAnswers((prev) => {
          const qId = payload.questionId;
          const curr = prev[qId] || {};
          const updated = {
            ...curr,
            partnerAnswer: payload.answerIndex,
            revealed: true,
          };
          if (curr.myAnswer !== undefined && curr.myAnswer === payload.answerIndex) {
            playSound('correct');
          }
          return { ...prev, [qId]: updated };
        });
      } else if (payload.type === 'td_prompt') {
        setCurrentPrompt(payload.prompt);
        setTdMode(payload.mode);
        playSound('spin');
      } else if (payload.type === 'wyr_choice') {
        setWyrSelections((prev) => {
          const qId = payload.questionId;
          const curr = prev[qId] || {};
          return {
            ...prev,
            [qId]: {
              ...curr,
              partnerChoice: payload.choice,
            },
          };
        });
        playSound('correct');
      }
    };

    socket.on('couple_game:action', handleGameAction);
    return () => {
      socket.off('couple_game:action', handleGameAction);
    };
  }, [socket, conversationId, playSound]);

  // Trivia answer handler
  const handleAnswerTrivia = (optionIndex) => {
    const q = TRIVIA_PRESETS[selectedTriviaIndex];
    const isCorrect = optionIndex === q.defaultCorrect;

    if (isCorrect) {
      playSound('correct');
      setScore((prev) => ({ correct: prev.correct + 1, total: prev.total + 1 }));
      setTriviaStreak((s) => s + 1);
    } else {
      playSound('wrong');
      setScore((prev) => ({ correct: prev.correct, total: prev.total + 1 }));
      setTriviaStreak(0);
    }

    setTriviaAnswers((prev) => ({
      ...prev,
      [q.id]: {
        myAnswer: optionIndex,
        revealed: true,
      },
    }));

    // Broadcast answer to partner
    socket?.emit('couple_game:action', {
      conversation_id: conversationId,
      type: 'trivia_answer',
      questionId: q.id,
      answerIndex: optionIndex,
    });
  };

  // Truth or Dare spin/shuffle
  const handleShufflePrompt = (mode = tdMode, category = tdCategory) => {
    setIsSpinning(true);
    playSound('spin');

    setTimeout(() => {
      const pool = (mode === 'truth' ? TRUTH_PROMPTS : DARE_PROMPTS).filter(
        (p) => category === 'all' || p.category === category
      );
      const chosen = pool[Math.floor(Math.random() * pool.length)] || (mode === 'truth' ? TRUTH_PROMPTS[0] : DARE_PROMPTS[0]);
      setCurrentPrompt(chosen);
      setIsSpinning(false);

      socket?.emit('couple_game:action', {
        conversation_id: conversationId,
        type: 'td_prompt',
        mode,
        prompt: chosen,
      });
    }, 450);
  };

  // Would You Rather selection
  const handleWyrSelect = (choice) => {
    const q = WOULD_YOU_RATHER[wyrIndex];
    setWyrSelections((prev) => ({
      ...prev,
      [q.id]: {
        ...prev[q.id],
        myChoice: choice,
      },
    }));
    playSound('correct');

    socket?.emit('couple_game:action', {
      conversation_id: conversationId,
      type: 'wyr_choice',
      questionId: q.id,
      choice,
    });
  };

  // Share game card to chat
  const handleShareToChat = (text) => {
    if (onSendToChat) {
      onSendToChat(text);
      playSound('correct');
    }
  };

  const isMalayalam = user?.language === 'ml' || user?.language === 'manglish';
  const currentTrivia = TRIVIA_PRESETS[selectedTriviaIndex];
  const triviaState = triviaAnswers[currentTrivia.id] || {};
  const currentWyr = WOULD_YOU_RATHER[wyrIndex];
  const currentWyrState = wyrSelections[currentWyr.id] || {};

  return (
    <div
      className={`couple-games-modal-overlay ${isCallMode ? 'in-call-mode' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Couple Games and Trivia"
    >
      <div className="couple-games-modal-card">
        {/* Header */}
        <div className="couple-games-header">
          <div className="couple-games-header-title">
            <span className="couple-games-badge-icon">
              <Gamepad2 size={22} className="game-icon-pulse" />
            </span>
            <div>
              <h3>{isMalayalam ? 'നമ്മുടെ കളിമുറി 🎮💖' : 'Our Playroom 🎮💖'}</h3>
              <p>
                {isMalayalam
                  ? `${peer?.name || 'പങ്കാളി'}-യോടൊപ്പം റിയൽടൈം കപ്പിൾ ഗെയിംസ്`
                  : `Realtime couple games with ${peer?.name || 'your partner'}`}
              </p>
            </div>
          </div>
          <div className="couple-games-header-actions">
            <button
              type="button"
              className="sound-toggle-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute game sound' : 'Enable game sound'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              title="Close playroom"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="couple-games-nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'trivia' ? 'active' : ''}`}
            onClick={() => setActiveTab('trivia')}
          >
            <HelpCircle size={16} />
            <span>{isMalayalam ? 'ലവ് ട്രിവിയ 🎯' : 'Love Trivia 🎯'}</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'truthdare' ? 'active' : ''}`}
            onClick={() => setActiveTab('truthdare')}
          >
            <Flame size={16} />
            <span>{isMalayalam ? 'സത്യം / ധൈര്യം 🔥' : 'Truth / Dare 🔥'}</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'wouldyourather' ? 'active' : ''}`}
            onClick={() => setActiveTab('wouldyourather')}
          >
            <Shuffle size={16} />
            <span>{isMalayalam ? 'ഏത് തിരഞ്ഞെടുക്കും? 🤔' : 'Would You Rather? 🤔'}</span>
          </button>
        </div>

        {/* Tab 1: Love Trivia (How Well Do You Know Me?) */}
        {activeTab === 'trivia' && (
          <div className="game-tab-content trivia-content">
            <div className="trivia-progress-bar">
              <div className="trivia-selector-pills">
                {TRIVIA_PRESETS.map((q, idx) => (
                  <button
                    key={q.id}
                    type="button"
                    className={`selector-pill ${selectedTriviaIndex === idx ? 'active' : ''} ${
                      triviaAnswers[q.id]?.revealed ? 'answered' : ''
                    }`}
                    onClick={() => setSelectedTriviaIndex(idx)}
                  >
                    Q{idx + 1}
                  </button>
                ))}
              </div>
              <div className="trivia-score-badge">
                <Award size={15} />
                <span>
                  {score.correct} / {score.total} Match {triviaStreak > 1 && `(🔥 ${triviaStreak}x streak)`}
                </span>
              </div>
            </div>

            <div className="trivia-card">
              <div className="trivia-card-tag">
                <Heart size={14} />
                <span>{isMalayalam ? 'നിങ്ങൾക്ക് എന്നെ എത്രത്തോളം അറിയാം?' : 'How well do you know me?'}</span>
              </div>
              <h4 className="trivia-question-text">
                {isMalayalam ? currentTrivia.questionMl : currentTrivia.questionEn}
              </h4>

              <div className="trivia-options-grid">
                {currentTrivia.options.map((opt, optIdx) => {
                  const isSelected = triviaState.myAnswer === optIdx;
                  const isCorrect = optIdx === currentTrivia.defaultCorrect;
                  const isRevealed = triviaState.revealed;

                  let optClass = 'trivia-option-btn';
                  if (isRevealed) {
                    if (isCorrect) optClass += ' correct-option';
                    else if (isSelected) optClass += ' wrong-option';
                  } else if (isSelected) {
                    optClass += ' selected';
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      className={optClass}
                      onClick={() => handleAnswerTrivia(optIdx)}
                      disabled={isRevealed}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + optIdx)}</span>
                      <span className="option-text">{opt}</span>
                      {isRevealed && isCorrect && <CheckCircle2 size={16} className="correct-mark" />}
                    </button>
                  );
                })}
              </div>

              {triviaState.revealed && (
                <div className="trivia-reveal-banner animate-fade-in">
                  <div className="reveal-text">
                    {triviaState.myAnswer === currentTrivia.defaultCorrect ? (
                      <p className="success-text">
                        🎉 {isMalayalam ? 'സൂപ്പർ! കൃത്യമായ ഉത്തരം! നിങ്ങൾ എന്നെ നന്നായി മനസ്സിലാക്കുന്നു 💖' : 'Spot on! You know your partner so deeply! 💖'}
                      </p>
                    ) : (
                      <p className="notice-text">
                        🌸 {isMalayalam ? 'ഉത്തരം തെറ്റി, പക്ഷെ സ്നേഹം കുറഞ്ഞില്ലല്ലോ! ശരിയായ ഉത്തരം മുകളിൽ കാണാം 💕' : "Almost! The real answer is highlighted above with love 💕"}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="share-to-chat-btn"
                    onClick={() =>
                      handleShareToChat(
                        `🎯 Love Trivia Challenge:\n"${isMalayalam ? currentTrivia.questionMl : currentTrivia.questionEn}"\n✨ Answered with love! Score: ${score.correct}/${score.total} match 💖`
                      )
                    }
                  >
                    <Share2 size={15} />
                    <span>{isMalayalam ? 'ചാറ്റിൽ പങ്കിടുക' : 'Share to Chat'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Truth or Dare */}
        {activeTab === 'truthdare' && (
          <div className="game-tab-content truthdare-content">
            <div className="td-mode-selector">
              <button
                type="button"
                className={`td-mode-btn ${tdMode === 'truth' ? 'active truth' : ''}`}
                onClick={() => {
                  setTdMode('truth');
                  handleShufflePrompt('truth', tdCategory);
                }}
              >
                <HelpCircle size={16} />
                <span>{isMalayalam ? 'സത്യം (Truth)' : 'Truth 💭'}</span>
              </button>
              <button
                type="button"
                className={`td-mode-btn ${tdMode === 'dare' ? 'active dare' : ''}`}
                onClick={() => {
                  setTdMode('dare');
                  handleShufflePrompt('dare', tdCategory);
                }}
              >
                <Flame size={16} />
                <span>{isMalayalam ? 'ധൈര്യം (Dare)' : 'Dare 🔥'}</span>
              </button>
            </div>

            <div className="td-categories-bar">
              {['romantic', 'deep', 'spicy'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`td-cat-pill ${tdCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setTdCategory(cat);
                    handleShufflePrompt(tdMode, cat);
                  }}
                >
                  {cat === 'romantic' && '💖 Romantic'}
                  {cat === 'deep' && '🥺 Deep & Soulful'}
                  {cat === 'spicy' && '🌶️ Playful & Spicy'}
                </button>
              ))}
            </div>

            <div className={`td-prompt-card ${isSpinning ? 'spinning' : ''} ${tdMode}`}>
              <div className="td-prompt-header">
                <span className={`td-badge ${tdMode}`}>
                  {tdMode === 'truth' ? '💭 TRUTH' : '🔥 DARE'}
                </span>
                <span className="td-category-tag">{currentPrompt.category}</span>
              </div>

              <div className="td-prompt-body">
                <p className="td-prompt-main">
                  {isMalayalam ? currentPrompt.textMl : currentPrompt.textEn}
                </p>
                {isMalayalam && (
                  <p className="td-prompt-sub">{currentPrompt.textEn}</p>
                )}
              </div>

              <div className="td-prompt-actions">
                <button
                  type="button"
                  className="shuffle-btn"
                  onClick={() => handleShufflePrompt(tdMode, tdCategory)}
                  disabled={isSpinning}
                >
                  <Shuffle size={16} className={isSpinning ? 'spin-icon' : ''} />
                  <span>{isMalayalam ? 'മറ്റൊന്ന് തിരഞ്ഞെടുക്കൂ' : 'Shuffle Next'}</span>
                </button>
                <button
                  type="button"
                  className="complete-prompt-btn"
                  onClick={() => {
                    handleShareToChat(
                      `🔥 Couple ${tdMode.toUpperCase()} Challenge:\n"${isMalayalam ? currentPrompt.textMl : currentPrompt.textEn}"\n✨ Accepted and completed with love! 💖`
                    );
                  }}
                >
                  <Share2 size={16} />
                  <span>{isMalayalam ? 'ചാറ്റിൽ അയക്കുക' : 'Send to Chat'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Would You Rather */}
        {activeTab === 'wouldyourather' && (
          <div className="game-tab-content wyr-content">
            <div className="wyr-progress-header">
              <span>
                {isMalayalam ? `ചോദ്യം ${wyrIndex + 1} / ${WOULD_YOU_RATHER.length}` : `Question ${wyrIndex + 1} of ${WOULD_YOU_RATHER.length}`}
              </span>
              <div className="wyr-nav-arrows">
                <button
                  type="button"
                  disabled={wyrIndex === 0}
                  onClick={() => setWyrIndex((i) => Math.max(0, i - 1))}
                >
                  ◀
                </button>
                <button
                  type="button"
                  disabled={wyrIndex === WOULD_YOU_RATHER.length - 1}
                  onClick={() => setWyrIndex((i) => Math.min(WOULD_YOU_RATHER.length - 1, i + 1))}
                >
                  ▶
                </button>
              </div>
            </div>

            <div className="wyr-card-wrapper">
              <button
                type="button"
                className={`wyr-choice-card choice-a ${
                  currentWyrState.myChoice === 'A' ? 'chosen' : ''
                }`}
                onClick={() => handleWyrSelect('A')}
              >
                <div className="wyr-tag">OPTION A</div>
                <h4>{isMalayalam ? currentWyr.optionA_Ml : currentWyr.optionA_En}</h4>
                {currentWyrState.myChoice === 'A' && (
                  <span className="selected-indicator">✓ Your Choice</span>
                )}
              </button>

              <div className="wyr-or-divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className={`wyr-choice-card choice-b ${
                  currentWyrState.myChoice === 'B' ? 'chosen' : ''
                }`}
                onClick={() => handleWyrSelect('B')}
              >
                <div className="wyr-tag">OPTION B</div>
                <h4>{isMalayalam ? currentWyr.optionB_Ml : currentWyr.optionB_En}</h4>
                {currentWyrState.myChoice === 'B' && (
                  <span className="selected-indicator">✓ Your Choice</span>
                )}
              </button>
            </div>

            {currentWyrState.myChoice && (
              <div className="wyr-footer-share animate-fade-in">
                <p>
                  {isMalayalam
                    ? `നിങ്ങൾ Option ${currentWyrState.myChoice} തിരഞ്ഞെടുത്തു! പങ്കാളിയുടെ ചോയ്സ് എതാണെന്ന് നോക്കൂ 💕`
                    : `You picked Option ${currentWyrState.myChoice}! See what your partner chooses 💕`}
                </p>
                <button
                  type="button"
                  className="share-to-chat-btn"
                  onClick={() =>
                    handleShareToChat(
                      `💭 Couple "Would You Rather?":\nOption A: ${currentWyr.optionA_Ml}\nOption B: ${currentWyr.optionB_Ml}\n✨ My Choice: Option ${currentWyrState.myChoice} 💖`
                    )
                  }
                >
                  <Share2 size={15} />
                  <span>{isMalayalam ? 'ചാറ്റിൽ ഷെയർ ചെയ്യൂ' : 'Share to Chat'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="couple-games-footer">
          <p>
            💖 {isMalayalam ? 'ഒരുമിച്ചുള്ള ഓരോ കളിയും പ്രണയത്തിന്റെ പുതിയ ഓർമ്മയാണ്.' : 'Every game together is a sweet new memory.'}
          </p>
        </div>
      </div>
    </div>
  );
}
