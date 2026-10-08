import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Heart,
  X,
  Volume2,
  VolumeX,
  Zap,
  Send,
  Flame,
  Radio,
  Hand,
  HeartHandshake,
  ShieldCheck,
  Smile,
} from 'lucide-react';
import { ButtonIcon, Avatar } from './components.jsx';
import {
  HAPTIC_PATTERNS,
  TOUCH_MODES,
  playResonanceChime,
  playTouchSound,
  triggerTouchHaptics,
} from './touchAudio.js';

export { TOUCH_MODES };

export function VirtualTouchModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onSendToChat,
  onError: _onError,
}) {
  const [activeMode, setActiveMode] = useState('gentle');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [partnerOnline, setPartnerOnline] = useState(false);

  // Local touch state
  const [isLocalTouching, setIsLocalTouching] = useState(false);
  const [localTouchPos, setLocalTouchPos] = useState({ x: 0.5, y: 0.5 });
  const [isLocalHugging, setIsLocalHugging] = useState(false);
  const [hugDuration, setHugDuration] = useState(0);

  // Partner touch state
  const [isPartnerTouching, setIsPartnerTouching] = useState(false);
  const [partnerTouchPos, setPartnerTouchPos] = useState(null);
  const [isPartnerHugging, setIsPartnerHugging] = useState(false);
  const [partnerMode, setPartnerMode] = useState('gentle');

  // Interactive visual effects
  const [screenPulseActive, setScreenPulseActive] = useState(false);
  const [touchResonated, setTouchResonated] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [particles, setParticles] = useState([]);

  // Love note composer
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [loveNote, setLoveNote] = useState('എന്റെ സ്പർശനം നിന്റെ ചാരത്തുണ്ട് 🫂💖');

  const padRef = useRef(null);
  const holdStartTimerRef = useRef(null);
  const hugIntervalRef = useRef(null);
  const partnerTouchTimerRef = useRef(null);
  const lastResonanceSoundRef = useRef(0);
  const activeModeRef = useRef(activeMode);
  activeModeRef.current = activeMode;

  // Announce presence on mount and clean up
  useEffect(() => {
    socket?.emit('touch:status', { conversation_id: conversationId, active: true });
    socket?.emit('touch:invite', { conversation_id: conversationId, touch_mode: activeMode });

    return () => {
      socket?.emit('touch:status', { conversation_id: conversationId, active: false });
    };
  }, [socket, conversationId, activeMode]);

  // Trigger visual & sensory effect for touch or hug
  const triggerPulseEffect = useCallback(
    (normX, normY, source = 'local', type = 'tap', mode = 'gentle') => {
      // 1. Audio
      if (soundEnabled) {
        playTouchSound(type === 'hug' ? 'hug' : mode, source === 'local' ? 0.35 : 0.45);
      }

      // 2. Haptic Feedback
      if (hapticsEnabled) {
        if (type === 'hug') {
          triggerTouchHaptics(HAPTIC_PATTERNS.hug);
        } else if (mode === 'sparkle') {
          triggerTouchHaptics(HAPTIC_PATTERNS.sparkle);
        } else if (mode === 'flame') {
          triggerTouchHaptics(HAPTIC_PATTERNS.flame);
        } else {
          triggerTouchHaptics(HAPTIC_PATTERNS.tap);
        }
      }

      // 3. Ambient screen pulse
      setScreenPulseActive(true);
      setTimeout(() => setScreenPulseActive(false), 380);

      // 4. Concentric Ripple Rings
      const rippleId = Math.random().toString(36).substring(2, 9);
      setRipples((prev) => [
        ...prev.slice(-14),
        {
          id: rippleId,
          x: normX * 100,
          y: normY * 100,
          source,
          type,
          mode,
          time: Date.now(),
        },
      ]);

      // 5. Dynamic Floating Particles / Sparks
      const emojis =
        mode === 'hug'
          ? ['🫂', '💖', '✨', '💕', '💫']
          : mode === 'sparkle'
          ? ['✨', '⭐', '🌟', '💫', '💎']
          : mode === 'flame'
          ? ['🔥', '❤️', '💋', '🌹', '💖']
          : ['🌸', '💖', '💓', '✨', '🌷'];

      const newParticles = Array.from({ length: type === 'hug' ? 8 : 5 }).map(() => ({
        id: Math.random().toString(36).substring(2, 9),
        x: normX * 100 + (Math.random() * 10 - 5),
        y: normY * 100 + (Math.random() * 10 - 5),
        vx: (Math.random() - 0.5) * 90,
        vy: -25 - Math.random() * 70,
        size: 11 + Math.random() * 16,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      }));
      setParticles((prev) => [...prev.slice(-25), ...newParticles]);
    },
    [soundEnabled, hapticsEnabled]
  );

  // Handle incoming touch events from partner
  useEffect(() => {
    if (!socket) return;

    const handlePulse = (payload) => {
      if (payload.conversation_id !== conversationId) return;

      const normX = typeof payload.x === 'number' ? payload.x : 0.5;
      const normY = typeof payload.y === 'number' ? payload.y : 0.5;
      const mode = payload.touch_mode || 'gentle';
      setPartnerMode(mode);

      if (payload.type === 'down' || payload.type === 'move' || payload.type === 'hug') {
        setIsPartnerTouching(true);
        setPartnerTouchPos({ x: normX, y: normY });
        setIsPartnerHugging(payload.type === 'hug');

        triggerPulseEffect(normX, normY, 'partner', payload.type, mode);

        clearTimeout(partnerTouchTimerRef.current);
        partnerTouchTimerRef.current = setTimeout(() => {
          setIsPartnerTouching(false);
          setPartnerTouchPos(null);
          setIsPartnerHugging(false);
        }, payload.type === 'hug' ? 2200 : 1200);
      } else if (payload.type === 'up') {
        setIsPartnerTouching(false);
        setIsPartnerHugging(false);
        setPartnerTouchPos(null);
      }
    };

    const handleStatus = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        setPartnerOnline(Boolean(payload.active));
      }
    };

    socket.on('touch:pulse', handlePulse);
    socket.on('touch:status', handleStatus);

    return () => {
      socket.off('touch:pulse', handlePulse);
      socket.off('touch:status', handleStatus);
      clearTimeout(partnerTouchTimerRef.current);
    };
  }, [socket, conversationId, user.id, triggerPulseEffect]);

  // Touch Resonance Check: When both touch close or both hold
  useEffect(() => {
    if (isLocalTouching && isPartnerTouching && partnerTouchPos) {
      const dx = localTouchPos.x - partnerTouchPos.x;
      const dy = localTouchPos.y - partnerTouchPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Close touch (< 0.2 screen fraction) OR both hugging
      if (distance < 0.22 || (isLocalHugging && isPartnerHugging)) {
        setTouchResonated(true);
        const now = Date.now();
        if (now - lastResonanceSoundRef.current > 1600) {
          lastResonanceSoundRef.current = now;
          if (soundEnabled) playResonanceChime(0.5);
          if (hapticsEnabled) triggerTouchHaptics(HAPTIC_PATTERNS.resonance);
        }
      } else {
        setTouchResonated(false);
      }
    } else {
      setTouchResonated(false);
    }
  }, [
    isLocalTouching,
    isPartnerTouching,
    localTouchPos,
    partnerTouchPos,
    isLocalHugging,
    isPartnerHugging,
    soundEnabled,
    hapticsEnabled,
  ]);

  // Clean old ripples and particles periodically
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRipples((prev) => prev.filter((r) => now - r.time < 1400));
      setParticles((prev) => prev.slice(-18));
    }, 350);
    return () => clearInterval(timer);
  }, []);

  // Pointer Down: Start touch and detect Haptic Hug hold
  const handlePointerDown = (e) => {
    e.preventDefault();
    if (!padRef.current) return;
    padRef.current.setPointerCapture?.(e.pointerId);

    const rect = padRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    setLocalTouchPos({ x, y });
    setIsLocalTouching(true);
    setIsLocalHugging(false);
    setHugDuration(0);

    // Initial instant pulse
    triggerPulseEffect(x, y, 'local', 'tap', activeMode);

    socket?.emit('touch:pulse', {
      conversation_id: conversationId,
      type: 'down',
      x,
      y,
      touch_mode: activeMode,
    });

    // Hold detection for Haptic Hug
    const startTime = Date.now();
    clearTimeout(holdStartTimerRef.current);
    holdStartTimerRef.current = setTimeout(() => {
      setIsLocalHugging(true);
      triggerPulseEffect(x, y, 'local', 'hug', activeMode);

      socket?.emit('touch:pulse', {
        conversation_id: conversationId,
        type: 'hug',
        x,
        y,
        touch_mode: 'hug',
      });

      // Repeat hug pulses while holding
      clearInterval(hugIntervalRef.current);
      hugIntervalRef.current = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        setHugDuration(elapsed);
        triggerPulseEffect(x, y, 'local', 'hug', activeMode);

        socket?.emit('touch:pulse', {
          conversation_id: conversationId,
          type: 'hug',
          x,
          y,
          touch_mode: 'hug',
        });
      }, 950);
    }, 700);
  };

  // Pointer Move: Dragging finger across the screen
  const handlePointerMove = (e) => {
    if (!isLocalTouching || !padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    setLocalTouchPos({ x, y });

    // Emit movement (throttled by browser request rate)
    socket?.emit('touch:pulse', {
      conversation_id: conversationId,
      type: isLocalHugging ? 'hug' : 'move',
      x,
      y,
      touch_mode: isLocalHugging ? 'hug' : activeMode,
    });
  };

  // Pointer Up / Cancel
  const handlePointerUp = () => {
    setIsLocalTouching(false);
    setIsLocalHugging(false);
    clearTimeout(holdStartTimerRef.current);
    clearInterval(hugIntervalRef.current);

    socket?.emit('touch:pulse', {
      conversation_id: conversationId,
      type: 'up',
      x: localTouchPos.x,
      y: localTouchPos.y,
      touch_mode: activeMode,
    });
  };

  // Instant Haptic Hug Quick Action button
  const handleTriggerInstantHug = () => {
    setIsLocalHugging(true);
    triggerPulseEffect(localTouchPos.x, localTouchPos.y, 'local', 'hug', 'hug');

    socket?.emit('touch:pulse', {
      conversation_id: conversationId,
      type: 'hug',
      x: localTouchPos.x,
      y: localTouchPos.y,
      touch_mode: 'hug',
    });

    setTimeout(() => {
      setIsLocalHugging(false);
    }, 2000);
  };

  // Test Vibration on device
  const handleTestVibration = () => {
    const success = triggerTouchHaptics(HAPTIC_PATTERNS.hug);
    if (!success && typeof navigator !== 'undefined' && !('vibrate' in navigator)) {
      alert('Haptic vibration is not supported in this desktop browser. It will vibrate on mobile devices! 📳');
    }
  };

  // Send Touch Note Card to Chat
  const handleSendTouchCard = () => {
    const modeConfig = TOUCH_MODES.find((m) => m.id === activeMode) || TOUCH_MODES[0];
    const text = `🫂 [Virtual Touch · ${modeConfig.labelMl}] ${loveNote.trim() || 'എന്റെ സ്പർശനം നിന്റെ ചാരത്തുണ്ട് 💖'}`;
    onSendToChat?.(text);
    onClose();
  };

  const currentModeConfig = TOUCH_MODES.find((m) => m.id === activeMode) || TOUCH_MODES[0];

  return (
    <div
      className={`virtual-touch-modal-backdrop ${screenPulseActive ? 'screen-pulse-active' : ''} mode-${activeMode}`}
      role="dialog"
      aria-modal="true"
      aria-label="Virtual Touch and Haptic Hug Surface"
    >
      {/* Ambient Pulsing Aura around screen edges */}
      <div
        className={`virtual-touch-ambient-aura ${touchResonated ? 'resonated-supernova' : ''} ${
          isLocalHugging || isPartnerHugging ? 'hugging-warm-aura' : ''
        }`}
        style={{ '--glow-color': currentModeConfig.glowColor }}
      />

      <div className="virtual-touch-container">
        {/* Header */}
        <header className="virtual-touch-header">
          <div className="virtual-touch-header-left">
            <div className="virtual-touch-badge">
              <span className="virtual-touch-live-dot" />
              <span>TOUCH PRESENCE 🫂</span>
            </div>
            <div className="virtual-touch-presence-pill">
              <span className={`partner-status-dot ${partnerOnline ? 'online' : 'waiting'}`} />
              <span>
                {partnerOnline
                  ? `${peer?.name || 'Partner'} is connected 💕`
                  : `Waiting for ${peer?.name || 'Partner'}...`}
              </span>
            </div>
          </div>

          <div className="virtual-touch-header-actions">
            <button
              type="button"
              className={`vt-tool-btn ${soundEnabled ? 'active' : ''}`}
              title={soundEnabled ? 'Sound Enabled' : 'Sound Muted'}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              className={`vt-tool-btn ${hapticsEnabled ? 'active' : ''}`}
              title={hapticsEnabled ? 'Vibration Enabled' : 'Vibration Disabled'}
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
            >
              <Zap size={16} />
            </button>
            <button
              type="button"
              className="vt-test-haptic-btn"
              title="Test Vibration"
              onClick={handleTestVibration}
            >
              📳 Test Haptics
            </button>
            <ButtonIcon label="Close Virtual Touch" onClick={onClose}>
              <X size={18} />
            </ButtonIcon>
          </div>
        </header>

        {/* Touch Resonance Banner */}
        {touchResonated && (
          <div className="touch-resonance-banner">
            <Sparkles size={16} className="sparkle-spin" />
            <span>SOULMATE TOUCH RESONANCE! സ്പർശനങ്ങൾ ഒന്നായി 🫂✨</span>
            <Sparkles size={16} className="sparkle-spin" />
          </div>
        )}

        {/* Hug in progress banner */}
        {(isLocalHugging || isPartnerHugging) && (
          <div className="haptic-hug-active-banner">
            <HeartHandshake size={18} className="hug-banner-icon" />
            <span>
              {isLocalHugging && isPartnerHugging
                ? `Mutual Warm Hug in progress! (${hugDuration}s) 🫂💕`
                : isLocalHugging
                ? `You are sending a Haptic Hug (${hugDuration}s)... 🫂`
                : `${peer?.name || 'Partner'} is hugging you warmly... 🫂`}
            </span>
          </div>
        )}

        {/* Interactive Touch Pad Surface */}
        <div
          ref={padRef}
          className={`virtual-touch-pad ${isLocalTouching ? 'touching-local' : ''} ${
            isPartnerTouching ? 'touching-partner' : ''
          } ${isLocalHugging || isPartnerHugging ? 'hugging-active' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Central Touch Visual Symbol */}
          <div className={`central-touch-visual ${screenPulseActive ? 'touch-visual-scale' : ''}`}>
            <div className="touch-center-circle" style={{ borderColor: currentModeConfig.color }}>
              <span className="touch-center-emoji">{currentModeConfig.emoji}</span>
            </div>
            <span className="touch-center-title">{currentModeConfig.labelMl}</span>
            <span className="touch-center-sub">{currentModeConfig.descMl}</span>
          </div>

          {/* Idle Prompt */}
          {!isLocalTouching && !isPartnerTouching && (
            <div className="virtual-touch-prompt">
              <p className="prompt-title-ml">സ്ക്രീനിൽ വിരലമർത്തൂ 🫂</p>
              <p className="prompt-subtitle">
                Touch anywhere. Your partner will feel the glowing touch pulse & haptic vibration at the exact same spot!
              </p>
              <p className="prompt-sub-hint">
                💡 1 സെക്കൻഡ് അമർത്തിപ്പിടിച്ചാൽ ഹഗ് വൈബ്രേഷൻ (Haptic Hug) അനുഭവപ്പെടും!
              </p>
            </div>
          )}

          {/* Local User Touch Indicator */}
          {isLocalTouching && (
            <div
              className={`touch-finger-indicator local-finger ${isLocalHugging ? 'finger-hugging' : ''}`}
              style={{
                left: `${localTouchPos.x * 100}%`,
                top: `${localTouchPos.y * 100}%`,
              }}
            >
              <div className="finger-halo local-halo" style={{ backgroundColor: currentModeConfig.color }} />
              <div className="finger-label local-label">
                <span>{isLocalHugging ? `Hugging 🫂 (${hugDuration}s)` : 'You (നിങ്ങൾ)'}</span>
              </div>
            </div>
          )}

          {/* Partner Touch Indicator */}
          {isPartnerTouching && partnerTouchPos && (
            <div
              className={`touch-finger-indicator partner-finger ${isPartnerHugging ? 'finger-hugging' : ''}`}
              style={{
                left: `${partnerTouchPos.x * 100}%`,
                top: `${partnerTouchPos.y * 100}%`,
              }}
            >
              <div className="finger-halo partner-halo" />
              <div className="finger-label partner-label">
                <Avatar url={peer?.avatar_url} name={peer?.name} size={18} />
                <span>{isPartnerHugging ? `${peer?.name || 'Partner'} Hugging 🫂` : peer?.name || 'Partner'}</span>
              </div>
            </div>
          )}

          {/* Connection Laser Line if both touching */}
          {touchResonated && partnerTouchPos && (
            <svg className="touch-resonance-svg">
              <line
                x1={`${localTouchPos.x * 100}%`}
                y1={`${localTouchPos.y * 100}%`}
                x2={`${partnerTouchPos.x * 100}%`}
                y2={`${partnerTouchPos.y * 100}%`}
                className="resonance-laser-line"
              />
            </svg>
          )}

          {/* Expanding Glowing Concentric Ripples */}
          {ripples.map((r) => (
            <div
              key={r.id}
              className={`touch-glowing-pulse-ripple ${
                r.source === 'partner' ? 'partner-ripple' : 'local-ripple'
              } ${r.type === 'hug' ? 'hug-ripple' : ''} mode-${r.mode || 'gentle'}`}
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
            />
          ))}

          {/* Floating Stardust & Romantic Emoji Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="touch-particle-spark"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                fontSize: `${p.size}px`,
                '--vx': `${p.vx}px`,
                '--vy': `${p.vy}px`,
              }}
            >
              {p.emoji}
            </div>
          ))}
        </div>

        {/* Mode Selector Chips */}
        <div className="virtual-touch-modes-bar">
          {TOUCH_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`vt-mode-chip ${activeMode === mode.id ? 'active' : ''}`}
              onClick={() => setActiveMode(mode.id)}
            >
              <span className="vt-mode-emoji">{mode.emoji}</span>
              <span className="vt-mode-title">{mode.labelMl}</span>
            </button>
          ))}
          <button
            type="button"
            className="vt-instant-hug-btn"
            onClick={handleTriggerInstantHug}
            title="Instant Haptic Hug"
          >
            <HeartHandshake size={15} /> Instant Hug 🫂
          </button>
        </div>

        {/* Footer & Chat Note Composer */}
        <footer className="virtual-touch-footer">
          {showNoteComposer ? (
            <div className="vt-note-composer">
              <input
                type="text"
                placeholder="Add a sweet touch message... (എന്റെ സ്പർശനം നിന്റെ ചാരത്തുണ്ട് 🫂)"
                value={loveNote}
                maxLength={100}
                onChange={(e) => setLoveNote(e.target.value)}
                className="vt-note-input"
              />
              <button
                type="button"
                className="vt-send-card-btn"
                onClick={handleSendTouchCard}
              >
                <Send size={15} /> Send Hug to Chat
              </button>
              <button
                type="button"
                className="vt-cancel-note-btn"
                onClick={() => setShowNoteComposer(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="vt-footer-bar">
              <span className="vt-footer-tip">
                💓 സ്ക്രീനിൽ തൊടുമ്പോൾ കൃത്യം ആ സ്ഥാനത്ത് പാർട്ണറുടെ ഫോണിൽ തിളങ്ങുന്ന പ്രകാശ വലയവും വൈബ്രേഷനും തോന്നും.
              </span>
              <button
                type="button"
                className="vt-share-chat-action"
                onClick={() => setShowNoteComposer(true)}
              >
                <HeartHandshake size={15} /> Send Hug Note to Chat 🫂
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

/**
 * Interactive Message Card for Virtual Touch & Haptic Hug in the chat thread
 */
export function VirtualTouchCard({ text, onOpenTouch }) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract type: e.g. "🫂 [Virtual Touch · മൃദുസ്പർശം] message" or "🫂 [Haptic Hug · സ്നേഹാലിംഗനം] message"
  const isHug = text.includes('Haptic Hug') || text.includes('സ്നേഹാലിംഗനം') || text.includes('Hug');
  const cleanMessage = text.replace(/🫂\s*\[(Virtual Touch|Haptic Hug)[^\]]*\]\s*/i, '').trim();

  const handleFeelTouch = () => {
    setIsPlaying(true);
    if (isHug) {
      triggerTouchHaptics(HAPTIC_PATTERNS.hug);
      playTouchSound('hug', 0.5);
    } else {
      triggerTouchHaptics(HAPTIC_PATTERNS.pulse);
      playTouchSound('gentle', 0.5);
    }

    setTimeout(() => {
      setIsPlaying(false);
    }, 1800);
  };

  return (
    <div className={`virtual-touch-chat-card ${isPlaying ? 'card-pulsing' : ''} ${isHug ? 'is-hug' : ''}`}>
      <div className="vt-card-top">
        <div className="vt-card-icon-wrap">
          <HeartHandshake size={24} className={`vt-card-icon ${isPlaying ? 'hug-anim' : ''}`} />
        </div>
        <div className="vt-card-meta">
          <strong>{isHug ? 'Haptic Hug 🫂 (സ്നേഹാലിംഗനം)' : 'Virtual Touch 🌸 (മൃദുസ്പർശം)'}</strong>
          <span>Sent with loving touch presence · തത്സമയ സ്പർശനം</span>
        </div>
      </div>

      {cleanMessage && <p className="vt-card-message">{cleanMessage}</p>}

      <div className="vt-card-actions">
        <button
          type="button"
          className={`vt-feel-touch-btn ${isPlaying ? 'active' : ''}`}
          onClick={handleFeelTouch}
        >
          <Zap size={14} />
          <span>{isPlaying ? 'Feeling Touch... 🫂' : 'Feel Touch (സ്പർശനം അനുഭവിക്കൂ)'}</span>
        </button>

        {onOpenTouch && (
          <button
            type="button"
            className="vt-touch-back-btn"
            onClick={onOpenTouch}
          >
            <Hand size={14} /> Touch Back
          </button>
        )}
      </div>
    </div>
  );
}
