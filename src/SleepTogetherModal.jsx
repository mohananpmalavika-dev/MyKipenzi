import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Moon,
  MoonStar,
  CloudRain,
  Waves,
  Sparkles,
  Wind,
  Flame,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  Minimize2,
  X,
  Send,
  Heart,
  Eye,
  EyeOff,
  BedDouble,
  RotateCcw,
} from 'lucide-react';
import { Avatar } from './components.jsx';
import {
  SLEEP_SOUNDSCAPES,
  sleepAudioEngine,
  playGoodnightChime,
  triggerSleepHaptics,
  formatRemainingTime,
} from './sleepAudio.js';

const PRESET_TIMERS = [15, 30, 45, 60, 90];

const PILLOW_TALK_WHISPERS = [
  { textMl: 'മധുരസ്വപ്നങ്ങൾ പ്രിയേ 💖', textEn: 'Sweet dreams my love' },
  { textMl: 'ഞാൻ നിന്റെ അരികിലുണ്ട് ✨', textEn: "I'm right beside you" },
  { textMl: 'നല്ല ഉറക്കം വരട്ടെ, കെട്ടിപ്പിടിക്കുന്നു 🫂', textEn: 'Sleep tight, hugging you' },
  { textMl: 'സ്വപ്നത്തിൽ കാണാം 🌙', textEn: 'See you in my dreams' },
  { textMl: 'നാളെ രാവിലെ വിളിക്കണേ 🌅', textEn: 'Wake me up tomorrow' },
];

export function SleepTogetherModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onMinimize,
  onSendToChat,
  onError: _onError,
}) {
  const [activeSoundscape, setActiveSoundscape] = useState(sleepAudioEngine.currentSoundscape);
  const [isPlaying, setIsPlaying] = useState(sleepAudioEngine.isPlaying);
  const [volume, setVolume] = useState(sleepAudioEngine.volume);
  const [isMuted, setIsMuted] = useState(sleepAudioEngine.isMuted);

  // Auto Sleep Timer
  const [selectedTimer, setSelectedTimer] = useState(sleepAudioEngine.timerDurationMinutes || 30);
  const [remainingSeconds, setRemainingSeconds] = useState(sleepAudioEngine.timerSecondsRemaining);
  const [partnerTimer, setPartnerTimer] = useState(null);

  // Presence and Breath Sync
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerSleeping, setPartnerSleeping] = useState(false);
  const [isLocalSleeping, setIsLocalSleeping] = useState(false);
  const [breathPhase, setBreathPhase] = useState('inhale'); // 'inhale' | 'hold' | 'exhale'
  const [isLocalBreathingWithTouch, setIsLocalBreathingWithTouch] = useState(false);
  const [partnerBreathActive, setPartnerBreathActive] = useState(false);

  // UI Modes
  const [isDimScreen, setIsDimScreen] = useState(false);
  const [incomingWhisper, setIncomingWhisper] = useState(null);
  const [whisperParticles, setWhisperParticles] = useState([]);
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [customBedtimeNote, setCustomBedtimeNote] = useState('ഉറങ്ങിക്കോളൂ പ്രിയേ, ഞാൻ കൂടെയുണ്ട് 🌌🛌');

  // Bedside Clocks
  const [localTimeStr, setLocalTimeStr] = useState('');
  const [peerTimeStr, setPeerTimeStr] = useState('');

  const partnerBreathTimerRef = useRef(null);

  // Update Bedside Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      // For partner time, use same or calculate timezone if known
      setPeerTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Guided Rhythmic Breath Loop (4s inhale -> 2s hold -> 4s exhale -> 2s rest)
  useEffect(() => {
    let phaseIdx = 0;
    const phases = ['inhale', 'hold', 'exhale', 'rest'];
    const phaseDurations = [4000, 2000, 4000, 2000];

    let timer = null;
    const runBreathCycle = () => {
      setBreathPhase(phases[phaseIdx]);
      if (phases[phaseIdx] === 'inhale') {
        triggerSleepHaptics([20]);
      }
      timer = setTimeout(() => {
        phaseIdx = (phaseIdx + 1) % phases.length;
        runBreathCycle();
      }, phaseDurations[phaseIdx]);
    };

    runBreathCycle();
    return () => clearTimeout(timer);
  }, []);

  // Sync volume with engine
  useEffect(() => {
    sleepAudioEngine.setVolume(volume);
    sleepAudioEngine.setMuted(isMuted);
  }, [volume, isMuted]);

  // Subscribe to engine's countdown timer
  useEffect(() => {
    const unsubscribe = sleepAudioEngine.subscribeTimer((sec) => {
      setRemainingSeconds(sec);
      if (sec === 0 && sleepAudioEngine.isPlaying === false) {
        setIsPlaying(false);
        setIsLocalSleeping(true);
      }
    });
    return unsubscribe;
  }, []);

  // Announce presence on mount and clean up
  useEffect(() => {
    socket?.emit('sleep:status', {
      conversation_id: conversationId,
      active: true,
      soundscape: activeSoundscape,
      sleeping: isLocalSleeping,
    });
    socket?.emit('sleep:invite', {
      conversation_id: conversationId,
      soundscape: activeSoundscape,
      timer_minutes: selectedTimer,
    });

    return () => {
      socket?.emit('sleep:status', {
        conversation_id: conversationId,
        active: false,
        soundscape: activeSoundscape,
        sleeping: isLocalSleeping,
      });
    };
  }, [socket, conversationId, activeSoundscape, isLocalSleeping, selectedTimer]);

  // Handle incoming socket events
  useEffect(() => {
    if (!socket) return;

    const handleSync = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.soundscape && payload.soundscape !== activeSoundscape) {
        setActiveSoundscape(payload.soundscape);
        if (payload.is_playing) {
          sleepAudioEngine.play(payload.soundscape);
          setIsPlaying(true);
        }
      }
      if (typeof payload.is_playing === 'boolean' && payload.is_playing !== isPlaying) {
        setIsPlaying(payload.is_playing);
        if (payload.is_playing) {
          sleepAudioEngine.play(payload.soundscape || activeSoundscape);
        } else {
          sleepAudioEngine.stop();
        }
      }
    };

    const handleStatus = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        setPartnerOnline(Boolean(payload.active));
        setPartnerSleeping(Boolean(payload.sleeping));
        if (payload.soundscape && !isPlaying) {
          setActiveSoundscape(payload.soundscape);
        }
      }
    };

    const handleTimer = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        setPartnerTimer(payload.timer_minutes);
      }
    };

    const handleBreath = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        setPartnerBreathActive(true);
        clearTimeout(partnerBreathTimerRef.current);
        partnerBreathTimerRef.current = setTimeout(() => {
          setPartnerBreathActive(false);
        }, 3200);
        triggerSleepHaptics([25, 40, 25]);
      }
    };

    const handleWhisper = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        setIncomingWhisper(payload.text);
        playGoodnightChime();
        triggerSleepHaptics([30, 50, 40]);

        // Spawn celestial stardust particles
        const newParticles = Array.from({ length: 12 }, (_, i) => ({
          id: Date.now() + i,
          x: 20 + Math.random() * 60,
          y: 30 + Math.random() * 40,
        }));
        setWhisperParticles(newParticles);
        setTimeout(() => setWhisperParticles([]), 3500);

        setTimeout(() => {
          setIncomingWhisper(null);
        }, 6000);
      }
    };

    socket.on('sleep:sync', handleSync);
    socket.on('sleep:status', handleStatus);
    socket.on('sleep:timer', handleTimer);
    socket.on('sleep:breath', handleBreath);
    socket.on('sleep:whisper', handleWhisper);

    return () => {
      socket.off('sleep:sync', handleSync);
      socket.off('sleep:status', handleStatus);
      socket.off('sleep:timer', handleTimer);
      socket.off('sleep:breath', handleBreath);
      socket.off('sleep:whisper', handleWhisper);
      clearTimeout(partnerBreathTimerRef.current);
    };
  }, [socket, conversationId, user.id, activeSoundscape, isPlaying]);

  // Change soundscape
  const handleSelectSoundscape = (id) => {
    setActiveSoundscape(id);
    sleepAudioEngine.play(id);
    setIsPlaying(true);

    socket?.emit('sleep:sync', {
      conversation_id: conversationId,
      soundscape: id,
      is_playing: true,
      volume,
      timestamp: Date.now(),
    });
  };

  // Toggle play/pause
  const handleTogglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (nextState) {
      sleepAudioEngine.play(activeSoundscape);
      // If timer is configured and was stopped, restart
      if (selectedTimer > 0 && remainingSeconds <= 0) {
        startTimer(selectedTimer);
      }
    } else {
      sleepAudioEngine.stop();
    }

    socket?.emit('sleep:sync', {
      conversation_id: conversationId,
      soundscape: activeSoundscape,
      is_playing: nextState,
      volume,
      timestamp: Date.now(),
    });
  };

  // Timer configuration
  const startTimer = (minutes) => {
    setSelectedTimer(minutes);
    if (minutes > 0) {
      sleepAudioEngine.setTimer(
        minutes,
        (sec) => setRemainingSeconds(sec),
        () => {
          setIsPlaying(false);
          setIsLocalSleeping(true);
          playGoodnightChime();
        }
      );
    } else {
      sleepAudioEngine.cancelTimer();
      setRemainingSeconds(0);
    }

    socket?.emit('sleep:timer', {
      conversation_id: conversationId,
      timer_minutes: minutes,
      active: minutes > 0,
    });
  };

  // Touch breath presence pulse
  const handleTouchBreath = () => {
    setIsLocalBreathingWithTouch(true);
    triggerSleepHaptics([40]);
    socket?.emit('sleep:breath', {
      conversation_id: conversationId,
      timestamp: Date.now(),
      phase: breathPhase,
    });

    setTimeout(() => {
      setIsLocalBreathingWithTouch(false);
    }, 1200);
  };

  // Toggle Sleep Status
  const handleToggleSleeping = () => {
    const nextSleeping = !isLocalSleeping;
    setIsLocalSleeping(nextSleeping);
    if (nextSleeping) {
      playGoodnightChime();
    }
    socket?.emit('sleep:status', {
      conversation_id: conversationId,
      active: true,
      soundscape: activeSoundscape,
      sleeping: nextSleeping,
    });
  };

  // Send bedtime whisper
  const handleSendWhisper = (whisper) => {
    const text = `${whisper.textMl} (${whisper.textEn})`;
    socket?.emit('sleep:whisper', {
      conversation_id: conversationId,
      text,
      whisper_type: 'pillow_talk',
    });
    triggerSleepHaptics([30]);

    // Local stardust feedback
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: 30 + Math.random() * 40,
      y: 40 + Math.random() * 20,
    }));
    setWhisperParticles(newParticles);
    setTimeout(() => setWhisperParticles([]), 3000);
  };

  // Send Bedtime Keepsake to Chat
  const handleSendSleepCardToChat = () => {
    if (!onSendToChat) return;
    const soundscapeInfo = SLEEP_SOUNDSCAPES.find((s) => s.id === activeSoundscape);
    const cardText = `🌌 [Sleep Together · ഒരുമിച്ച് ഉറങ്ങാം] ${soundscapeInfo?.emoji || '🌙'} ${soundscapeInfo?.titleMl || 'ശാന്തമായ രാത്രി'} (${soundscapeInfo?.titleEn || 'Ambient Sleep Sanctuary'})\n"${customBedtimeNote}"`;
    onSendToChat(cardText);
    setShowNoteComposer(false);
  };

  const currentSoundscapeObj =
    SLEEP_SOUNDSCAPES.find((s) => s.id === activeSoundscape) || SLEEP_SOUNDSCAPES[0];

  return (
    <div
      className={`sleep-together-modal-backdrop ${isDimScreen ? 'dim-zen-mode' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Sleep Together Synchronized Night Room"
    >
      {/* Dynamic Starry Sky Background */}
      <div className="sleep-night-sky-canvas">
        <div className="stars-layer-1" />
        <div className="stars-layer-2" />
        <div className="aurora-ambient-glow" />
      </div>

      {/* Floating Stardust particles */}
      {whisperParticles.map((p) => (
        <span
          key={p.id}
          className="stardust-particle"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          ✨
        </span>
      ))}

      <div className="sleep-modal-container">
        {/* Top Header */}
        <header className="sleep-modal-header">
          <div className="sleep-header-left">
            <div className="sleep-header-badge">
              <span className="sleep-live-star-pulse">✨</span>
              <span>SLEEP TOGETHER 🌌🛌</span>
            </div>

            <div className="sleep-partner-presence-pill">
              <span
                className={`sleep-status-dot ${
                  partnerSleeping ? 'sleeping' : partnerOnline ? 'online' : 'waiting'
                }`}
              />
              <span>
                {partnerSleeping
                  ? `${peer?.name || 'Partner'} fell asleep peacefully 😴 (ഉറങ്ങി)`
                  : partnerOnline
                  ? `${peer?.name || 'Partner'} is breathing with you 💕`
                  : `Waiting for ${peer?.name || 'Partner'} to join...`}
              </span>
            </div>
          </div>

          <div className="sleep-header-actions">
            {/* Bedside Clock Pill */}
            <div className="bedside-clock-pill" title="Local time & sleeping under the same moon">
              <Moon size={14} className="clock-moon-icon" />
              <span>{localTimeStr}</span>
              {partnerOnline && <small className="partner-clock-tag">· {peer?.name || 'Us'}</small>}
            </div>

            {/* Dim / Zen OLED Screen Mode */}
            <button
              type="button"
              className={`sleep-tool-btn ${isDimScreen ? 'active' : ''}`}
              title={isDimScreen ? 'Exit Dim Screen mode' : 'Deep OLED Dim Screen for sleeping'}
              onClick={() => setIsDimScreen(!isDimScreen)}
            >
              {isDimScreen ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>

            {/* Mute button */}
            <button
              type="button"
              className={`sleep-tool-btn ${isMuted ? 'muted' : ''}`}
              title={isMuted ? 'Unmute' : 'Mute'}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            {/* Minimize button */}
            {onMinimize && (
              <button
                type="button"
                className="sleep-tool-btn"
                title="Keep playing in chat background"
                onClick={onMinimize}
              >
                <Minimize2 size={17} />
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              className="sleep-tool-btn close-btn"
              title="Leave Night Room"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Incoming Bedtime Whisper Banner */}
        {incomingWhisper && (
          <div className="incoming-whisper-banner" role="status">
            <span className="whisper-moon-emoji">🌙</span>
            <div className="whisper-text-box">
              <span className="whisper-sender">{peer?.name || 'Your love'} whispered:</span>
              <p className="whisper-content">&ldquo;{incomingWhisper}&rdquo;</p>
            </div>
            <Sparkles size={16} className="whisper-sparkle" />
          </div>
        )}

        {/* Center Stage: Celestial Breath Presence Glow */}
        <div className="sleep-center-stage">
          <div
            className={`breath-orb-container phase-${breathPhase} ${
              isLocalBreathingWithTouch || partnerBreathActive ? 'breath-touch-pulse' : ''
            }`}
            onClick={handleTouchBreath}
            role="button"
            tabIndex={0}
            title="Tap to send a gentle breathing touch to your partner"
          >
            {/* Outer Aura Glow */}
            <div className="breath-aura-ring outer-ring" />
            <div className="breath-aura-ring middle-ring" />

            {/* Center Moon / Soul Orb */}
            <div className="breath-core-orb">
              <div className="breath-avatar-pair">
                <Avatar user={user} size={46} />
                <span className="breath-love-knot">
                  {partnerBreathActive ? '💓' : isPlaying ? '🌌' : '🌙'}
                </span>
                <Avatar user={peer} size={46} />
              </div>

              <div className="breath-instruction">
                {breathPhase === 'inhale' && <span>Inhale gently... (ശ്വാസമെടുക്കൂ 🌸)</span>}
                {breathPhase === 'hold' && <span>Rest together... (ശാന്തമാകൂ ✨)</span>}
                {breathPhase === 'exhale' && <span>Exhale softly... (ശ്വാസം വിടൂ 🍃)</span>}
                {breathPhase === 'rest' && <span>Under the same moon (നിലാവിൽ 🌙)</span>}
              </div>

              <span className="breath-tap-hint">
                {partnerBreathActive
                  ? `${peer?.name || 'Partner'} felt your breath 🤍`
                  : 'തൊടുമ്പോൾ പങ്കാളിയുടെ ഫോണിൽ സുഖകരമായ ശ്വാസസ്പർശം'}
              </span>
            </div>
          </div>

          {/* Quick Sleep Status Button */}
          <button
            type="button"
            className={`sleep-status-toggle-btn ${isLocalSleeping ? 'is-asleep' : ''}`}
            onClick={handleToggleSleeping}
          >
            <BedDouble size={16} />
            <span>
              {isLocalSleeping
                ? 'ഞാൻ ഉറങ്ങാൻ കിടന്നു 😴 (Fell Asleep)'
                : 'ഉറങ്ങാൻ പോകുന്നു 🛌 (Mark as Asleep)'}
            </span>
          </button>
        </div>

        {/* Soundscapes Selector */}
        <section className="sleep-soundscapes-section">
          <div className="section-title-row">
            <div className="section-title-wrap">
              <strong>Ambient Soundscapes</strong>
              <small>ഒരുമിച്ച് പ്ലേ ആവുന്ന മൃദുവായ ശബ്ദങ്ങൾ</small>
            </div>

            <div className="sound-master-controls">
              <button
                type="button"
                className={`soundscape-master-play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={handleTogglePlay}
              >
                {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                <span>{isPlaying ? 'Pause Sound' : 'Play Sound'}</span>
              </button>
            </div>
          </div>

          <div className="soundscapes-grid">
            {SLEEP_SOUNDSCAPES.map((item) => {
              const isSelected = activeSoundscape === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`soundscape-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectSoundscape(item.id)}
                  style={{
                    borderColor: isSelected ? item.color : undefined,
                    boxShadow: isSelected ? `0 0 16px ${item.color}33` : undefined,
                  }}
                >
                  <div className="soundscape-card-top">
                    <span className="soundscape-emoji">{item.emoji}</span>
                    {isSelected && isPlaying && (
                      <span className="soundscape-playing-wave">
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                  </div>
                  <div className="soundscape-card-info">
                    <strong className="soundscape-title-ml">{item.titleMl}</strong>
                    <span className="soundscape-title-en">{item.titleEn}</span>
                    <small className="soundscape-desc">{item.descriptionMl}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Auto Sleep Timer */}
        <section className="sleep-timer-section">
          <div className="section-title-row">
            <div className="section-title-wrap">
              <strong>Auto Sleep Timer (ഉറങ്ങിപ്പോയാൽ തനിയെ ഓഫ് ആവും)</strong>
              <small>2 മിനിറ്റ് മുൻപ് സൗണ്ട് പതുക്കെ കുറഞ്ഞ് ഓഫാകും (Gradual Fade-out)</small>
            </div>

            {remainingSeconds > 0 && (
              <div className="timer-countdown-badge">
                <Clock size={15} />
                <span>{formatRemainingTime(remainingSeconds)} ബാക്കി</span>
              </div>
            )}
          </div>

          <div className="timer-presets-row">
            {PRESET_TIMERS.map((mins) => {
              const isSelected = selectedTimer === mins && remainingSeconds > 0;
              return (
                <button
                  key={mins}
                  type="button"
                  className={`timer-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => startTimer(mins)}
                >
                  <span>{mins} മിനിറ്റ്</span>
                </button>
              );
            })}
            <button
              type="button"
              className={`timer-pill ${selectedTimer === 0 || remainingSeconds <= 0 ? 'active' : ''}`}
              onClick={() => startTimer(0)}
            >
              <RotateCcw size={13} />
              <span>ഓഫ് (തുടർച്ചയായി)</span>
            </button>
          </div>

          {partnerTimer && partnerTimer !== selectedTimer && (
            <div className="partner-timer-hint">
              <span>
                💡 {peer?.name || 'Partner'} has set a {partnerTimer}-min sleep timer.{' '}
                <button
                  type="button"
                  className="sync-timer-link"
                  onClick={() => startTimer(partnerTimer)}
                >
                  Sync to {partnerTimer}m
                </button>
              </span>
            </div>
          )}
        </section>

        {/* Pillow Talk / Bedtime Whispers */}
        <section className="pillow-talk-section">
          <div className="section-title-wrap">
            <strong>Pillow Talk & Night Whispers</strong>
            <small>തലയിണക്കരികിലെ സ്വകാര്യങ്ങൾ · തൊടുമ്പോൾ നക്ഷത്രങ്ങൾ മിന്നും</small>
          </div>

          <div className="pillow-talk-chips">
            {PILLOW_TALK_WHISPERS.map((whisper, idx) => (
              <button
                key={idx}
                type="button"
                className="pillow-talk-chip"
                onClick={() => handleSendWhisper(whisper)}
              >
                <span>{whisper.textMl}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Footer actions */}
        <footer className="sleep-modal-footer">
          {showNoteComposer ? (
            <div className="sleep-note-composer">
              <input
                type="text"
                value={customBedtimeNote}
                onChange={(e) => setCustomBedtimeNote(e.target.value)}
                placeholder="Write a sweet bedtime note for your partner..."
                maxLength={140}
              />
              <button
                type="button"
                className="sleep-send-chat-btn"
                onClick={handleSendSleepCardToChat}
              >
                <Send size={15} /> Send to Chat
              </button>
              <button
                type="button"
                className="sleep-cancel-btn"
                onClick={() => setShowNoteComposer(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="sleep-footer-bar">
              <span className="sleep-footer-tip">
                🌙 രാത്രിയിൽ ഫോൺ അരികിൽ വെച്ച് ഒരുമിച്ച് ഉറങ്ങാം. ടൈമർ കഴിയുമ്പോൾ ശബ്ദം തനിയെ നിലക്കും.
              </span>
              <button
                type="button"
                className="sleep-share-chat-action"
                onClick={() => setShowNoteComposer(true)}
              >
                <Heart size={15} /> Leave Bedtime Note in Chat 🛌
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

/**
 * Minimized floating dock player when user returns to chat
 */
export function SleepTogetherMiniPlayer({
  soundscapeId = 'rain',
  isPlaying = false,
  remainingSeconds = 0,
  onTogglePlay,
  onExpand,
  onClose,
  partnerOnline = false,
}) {
  const currentSoundscapeObj =
    SLEEP_SOUNDSCAPES.find((s) => s.id === soundscapeId) || SLEEP_SOUNDSCAPES[0];

  return (
    <div className="sleep-mini-player-dock" role="region" aria-label="Sleep Together Mini Player">
      <div className="sleep-mini-left" onClick={onExpand} role="button" tabIndex={0}>
        <div className="sleep-mini-icon-box">
          <span className="sleep-mini-emoji">{currentSoundscapeObj.emoji}</span>
          {isPlaying && (
            <span className="sleep-mini-pulse-dot" />
          )}
        </div>
        <div className="sleep-mini-details">
          <div className="sleep-mini-title-line">
            <strong>{currentSoundscapeObj.titleMl}</strong>
            <span className="sleep-mini-sync-tag">
              {partnerOnline ? '💕 Synced' : '🌙 Night Room'}
            </span>
          </div>
          <small className="sleep-mini-timer">
            {remainingSeconds > 0
              ? `⏱️ ${formatRemainingTime(remainingSeconds)} remaining`
              : 'Playing calmly'}
          </small>
        </div>
      </div>

      <div className="sleep-mini-controls">
        <button
          type="button"
          className="sleep-mini-btn"
          title={isPlaying ? 'Pause' : 'Play'}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause size={17} /> : <Play size={17} />}
        </button>

        <button
          type="button"
          className="sleep-mini-btn"
          title="Expand Night Room"
          onClick={onExpand}
        >
          <MoonStar size={17} />
        </button>

        <button
          type="button"
          className="sleep-mini-btn close"
          title="Stop & Close"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}

/**
 * Chat Message Card for Sleep Together Night Room
 */
export function SleepTogetherCard({ text, onOpenSleep }) {
  const cleanMessage = text.replace(/🌌\s*\[Sleep Together[^\]]*\]\s*/i, '').trim();

  return (
    <div className="sleep-together-chat-card">
      <div className="sleep-card-top">
        <span className="sleep-card-badge">
          <Moon size={14} />
          <span>SLEEP TOGETHER · ഒരുമിച്ച് ഉറങ്ങാം 🌌🛌</span>
        </span>
      </div>

      <div className="sleep-card-body">
        <p className="sleep-card-text">{cleanMessage || 'നമുക്ക് ഒരുമിച്ച് ഉറങ്ങാം പ്രിയേ 🌙'}</p>
        <div className="sleep-card-subtext">
          <CloudRain size={14} />
          <span>മൃദുവായ മഴ, കടലലകൾ & സിങ്ക്ഡ് നൈറ്റ് റൂം</span>
        </div>
      </div>

      <button type="button" className="sleep-card-join-btn" onClick={onOpenSleep}>
        <MoonStar size={16} />
        <span>Join Night Room 🌌</span>
      </button>
    </div>
  );
}
