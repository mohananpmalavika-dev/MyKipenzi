import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Heart,
  Activity,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Radio,
  Zap,
  Info,
  Check,
  Flame,
} from 'lucide-react';
import { ButtonIcon, Avatar } from './components.jsx';

import { playHeartbeatSound, playSyncChime, triggerHeartbeatHaptics } from './heartbeatAudio.js';
export { playHeartbeatSound, playSyncChime, triggerHeartbeatHaptics };

const TEMPO_PRESETS = [
  { id: 'free', labelMl: 'തനത് സ്പർശനം', labelEn: 'Free Touch', bpm: null, desc: 'Touch and tap naturally' },
  { id: 'calm', labelMl: 'ശാന്തം (68 BPM)', labelEn: 'Calm Resting (68 BPM)', bpm: 68, desc: 'Gentle & peaceful comfort' },
  { id: 'warm', labelMl: 'സ്നേഹാർദ്രം (84 BPM)', labelEn: 'Warm Loving (84 BPM)', bpm: 84, desc: 'Steady heartbeat for you' },
  { id: 'racing', labelMl: 'തുടിക്കുന്ന നെഞ്ചകം (112 BPM)', labelEn: 'Racing Heart (112 BPM)', bpm: 112, desc: 'When I see your face' },
];

export function LiveHeartbeatModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onSendToChat,
  onError: _onError,
}) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [activePreset, setActivePreset] = useState('free');
  const [currentBpm, setCurrentBpm] = useState(74);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [isLocalTouching, setIsLocalTouching] = useState(false);
  const [localTouchPos, setLocalTouchPos] = useState({ x: 0.5, y: 0.5 });
  const [partnerTouchPos, setPartnerTouchPos] = useState(null);
  const [isPartnerTouching, setIsPartnerTouching] = useState(false);
  const [screenPulseActive, setScreenPulseActive] = useState(false);
  const [touchSynced, setTouchSynced] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [particles, setParticles] = useState([]);
  const [loveNote, setLoveNote] = useState('എന്റെ ഓരോ തുടിപ്പും നിനക്കായി 💓');
  const [showNoteComposer, setShowNoteComposer] = useState(false);

  const padRef = useRef(null);
  const ecgCanvasRef = useRef(null);
  const ecgAnimRef = useRef(null);
  const ecgSpikeRef = useRef(0);
  const touchTapTimesRef = useRef([]);
  const holdIntervalRef = useRef(null);
  const lastSyncSoundRef = useRef(0);
  const partnerTouchTimerRef = useRef(null);

  // Announce presence on mount and clean up
  useEffect(() => {
    socket?.emit('heartbeat:status', { conversation_id: conversationId, active: true });
    socket?.emit('heartbeat:invite', { conversation_id: conversationId });

    return () => {
      socket?.emit('heartbeat:status', { conversation_id: conversationId, active: false });
    };
  }, [socket, conversationId]);

  // Handle incoming heartbeat pulses & partner presence
  useEffect(() => {
    if (!socket) return;

    const handlePulse = (payload) => {
      if (payload.conversation_id !== conversationId) return;

      if (payload.bpm && typeof payload.bpm === 'number') {
        setCurrentBpm(payload.bpm);
      }

      if (payload.type === 'down' || payload.type === 'hold' || payload.type === 'pulse') {
        setIsPartnerTouching(true);
        if (typeof payload.x === 'number' && typeof payload.y === 'number') {
          setPartnerTouchPos({ x: payload.x, y: payload.y });
        }

        // Trigger partner pulse ripple
        triggerPulseEffect(payload.x ?? 0.5, payload.y ?? 0.5, 'partner');

        clearTimeout(partnerTouchTimerRef.current);
        partnerTouchTimerRef.current = setTimeout(() => {
          setIsPartnerTouching(false);
          setPartnerTouchPos(null);
        }, 1200);
      } else if (payload.type === 'up') {
        setIsPartnerTouching(false);
        setPartnerTouchPos(null);
      }
    };

    const handleStatus = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        setPartnerOnline(Boolean(payload.active));
      }
    };

    socket.on('heartbeat:pulse', handlePulse);
    socket.on('heartbeat:status', handleStatus);

    return () => {
      socket.off('heartbeat:pulse', handlePulse);
      socket.off('heartbeat:status', handleStatus);
      clearTimeout(partnerTouchTimerRef.current);
    };
  }, [socket, conversationId, user.id]);

  // Trigger pulse effect (Sound, Vibration, Screen Aura, Ripple & ECG Spike)
  const triggerPulseEffect = useCallback(
    (normX, normY, source = 'local') => {

      // 1. Sound
      if (soundEnabled) {
        playHeartbeatSound(source === 'local' ? 0.45 : 0.5);
      }

      // 2. Haptic Vibration
      if (hapticsEnabled) {
        triggerHeartbeatHaptics([60, 60, 80, 180]);
      }

      // 3. Screen pulse animation
      setScreenPulseActive(true);
      setTimeout(() => setScreenPulseActive(false), 380);

      // 4. Spike on ECG monitor
      ecgSpikeRef.current = 1.0;

      // 5. Spawn visual ripple
      const rippleId = Math.random().toString(36).substring(2, 9);
      setRipples((prev) => [
        ...prev.slice(-12),
        {
          id: rippleId,
          x: normX * 100,
          y: normY * 100,
          source,
          time: Date.now(),
        },
      ]);

      // 6. Spawn romantic glowing particles
      const newParticles = Array.from({ length: 6 }).map(() => ({
        id: Math.random().toString(36).substring(2, 9),
        x: normX * 100 + (Math.random() * 8 - 4),
        y: normY * 100 + (Math.random() * 8 - 4),
        vx: (Math.random() - 0.5) * 80,
        vy: -30 - Math.random() * 60,
        size: 10 + Math.random() * 14,
        emoji: ['💖', '💓', '✨', '💕', '🌹'][Math.floor(Math.random() * 5)],
      }));
      setParticles((prev) => [...prev.slice(-20), ...newParticles]);
    },
    [soundEnabled, hapticsEnabled]
  );

  // Check touch sync / resonance when both touch
  useEffect(() => {
    if (isLocalTouching && isPartnerTouching && partnerTouchPos) {
      const dx = localTouchPos.x - partnerTouchPos.x;
      const dy = localTouchPos.y - partnerTouchPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If touches are close (< 0.25 screen fraction) or both holding
      if (distance < 0.25 || (isLocalTouching && isPartnerTouching)) {
        setTouchSynced(true);
      }
      const now = Date.now();
      if (now - lastSyncSoundRef.current > 1800) {
        lastSyncSoundRef.current = now;
        if (soundEnabled) playSyncChime();
        if (hapticsEnabled) triggerHeartbeatHaptics([100, 50, 100, 50, 220]);
      }
    } else {
      setTouchSynced(false);
    }
  }, [isLocalTouching, isPartnerTouching, localTouchPos, partnerTouchPos, soundEnabled, hapticsEnabled]);

  // Clean old ripples & particles
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRipples((prev) => prev.filter((r) => now - r.time < 1200));
      setParticles((prev) => prev.slice(-15));
    }, 400);
    return () => clearInterval(timer);
  }, []);

  // Animate ECG line
  useEffect(() => {
    const canvas = ecgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.parentElement?.clientWidth || 320);
    let height = (canvas.height = 70);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || 320;
      height = canvas.height = 70;
    };
    window.addEventListener('resize', handleResize);

    let phase = 0;
    const render = () => {
      phase += 2;
      ctx.clearRect(0, 0, width, height);

      // Draw faint baseline grid
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 10; y < height; y += 15) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // ECG wave path
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 9;

      ctx.beginPath();
      const midY = height / 2;

      for (let x = 0; x < width; x += 3) {
        const offset = (x + phase) % 180;
        let y = midY;

        // Realistic P-Q-R-S-T cardiac waveform
        const spike = ecgSpikeRef.current;
        const amplitude = 1 + spike * 0.9;

        if (offset >= 40 && offset < 52) {
          // P-wave (soft bump)
          y -= Math.sin(((offset - 40) / 12) * Math.PI) * 4 * amplitude;
        } else if (offset >= 55 && offset < 60) {
          // Q-wave (small dip)
          y += Math.sin(((offset - 55) / 5) * Math.PI) * 3 * amplitude;
        } else if (offset >= 60 && offset < 72) {
          // R-wave (sharp high peak)
          y -= Math.sin(((offset - 60) / 12) * Math.PI) * 26 * amplitude;
        } else if (offset >= 72 && offset < 78) {
          // S-wave (sharp valley)
          y += Math.sin(((offset - 72) / 6) * Math.PI) * 8 * amplitude;
        } else if (offset >= 90 && offset < 114) {
          // T-wave (rounded dome)
          y -= Math.sin(((offset - 90) / 24) * Math.PI) * 7 * amplitude;
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Decay spike boost
      if (ecgSpikeRef.current > 0) {
        ecgSpikeRef.current = Math.max(0, ecgSpikeRef.current - 0.03);
      }

      ecgAnimRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ecgAnimRef.current) cancelAnimationFrame(ecgAnimRef.current);
    };
  }, []);

  // Handle Preset Rhythmic holding pulses
  useEffect(() => {
    if (!isLocalTouching) {
      clearInterval(holdIntervalRef.current);
      return;
    }

    const intervalMs = activePreset !== 'free' && activePreset !== null
      ? (60 / currentBpm) * 1000
      : 820; // default comfortable heartbeat rhythm while holding

    holdIntervalRef.current = setInterval(() => {
      triggerPulseEffect(localTouchPos.x, localTouchPos.y, 'local');
      socket?.emit('heartbeat:pulse', {
        conversation_id: conversationId,
        type: 'hold',
        x: localTouchPos.x,
        y: localTouchPos.y,
        bpm: currentBpm,
      });
    }, intervalMs);

    return () => clearInterval(holdIntervalRef.current);
  }, [isLocalTouching, activePreset, currentBpm, localTouchPos, triggerPulseEffect, socket, conversationId]);

  // Pointer interaction helpers
  const handlePointerDown = (e) => {
    e.preventDefault();
    if (!padRef.current) return;
    padRef.current.setPointerCapture?.(e.pointerId);

    const rect = padRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    setLocalTouchPos({ x, y });
    setIsLocalTouching(true);

    // Calculate BPM from tap intervals
    const now = Date.now();
    touchTapTimesRef.current = [...touchTapTimesRef.current.filter((t) => now - t < 3000), now];
    if (touchTapTimesRef.current.length >= 2) {
      const times = touchTapTimesRef.current;
      const intervals = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 250 && avgInterval < 1800) {
        const calculatedBpm = Math.round(60000 / avgInterval);
        setCurrentBpm(calculatedBpm);
      }
    }

    // Trigger instant initial pulse
    triggerPulseEffect(x, y, 'local');

    // Emit socket event to partner
    socket?.emit('heartbeat:pulse', {
      conversation_id: conversationId,
      type: 'down',
      x,
      y,
      bpm: currentBpm,
    });
  };

  const handlePointerMove = (e) => {
    if (!isLocalTouching || !padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    setLocalTouchPos({ x, y });
  };

  const handlePointerUp = () => {
    setIsLocalTouching(false);
    clearInterval(holdIntervalRef.current);

    socket?.emit('heartbeat:pulse', {
      conversation_id: conversationId,
      type: 'up',
      x: localTouchPos.x,
      y: localTouchPos.y,
      bpm: currentBpm,
    });
  };

  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    if (preset.bpm) {
      setCurrentBpm(preset.bpm);
    }
  };

  const handleSendHeartbeatCard = () => {
    const text = `💓 [Heartbeat Pulse · ${currentBpm} BPM] ${loveNote.trim() || 'എന്റെ ഓരോ തുടിപ്പും നിനക്കായി'}`;
    onSendToChat?.(text);
    onClose();
  };

  return (
    <div
      className={`heartbeat-modal-backdrop ${screenPulseActive ? 'screen-pulse-active' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Live Heartbeat Touch Pad"
    >
      {/* Ambient Pulsing Glow Border & Aura */}
      <div className={`heartbeat-ambient-aura ${touchSynced ? 'synced-golden-aura' : ''}`} />

      <div className="heartbeat-modal-container">
        {/* Top Header */}
        <header className="heartbeat-header">
          <div className="heartbeat-header-left">
            <div className="heartbeat-badge">
              <span className="heartbeat-live-dot" />
              <span>LIVE TOUCH PULSE</span>
            </div>
            <div className="heartbeat-presence-pill">
              <span className={`partner-status-dot ${partnerOnline ? 'online' : 'waiting'}`} />
              <span>
                {partnerOnline
                  ? `${peer?.name || 'Partner'} is here with you 💕`
                  : `Waiting for ${peer?.name || 'Partner'} to touch...`}
              </span>
            </div>
          </div>

          <div className="heartbeat-header-actions">
            <button
              type="button"
              className={`hb-tool-btn ${soundEnabled ? 'active' : ''}`}
              title={soundEnabled ? 'Sound Enabled' : 'Sound Muted'}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              className={`hb-tool-btn ${hapticsEnabled ? 'active' : ''}`}
              title={hapticsEnabled ? 'Vibration Enabled' : 'Vibration Muted'}
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
            >
              <Zap size={16} />
            </button>
            <ButtonIcon label="Close Heartbeat" onClick={onClose}>
              <X size={18} />
            </ButtonIcon>
          </div>
        </header>

        {/* Sync Banner if both are touching */}
        {touchSynced && (
          <div className="touch-sync-banner">
            <Sparkles size={16} className="sparkle-spin" />
            <span>HEARTS SYNCED! സ്പർശന ലയം അനുഭവപ്പെടുന്നു ✨</span>
            <Sparkles size={16} className="sparkle-spin" />
          </div>
        )}

        {/* Central Interactive Touch Pad Area */}
        <div
          ref={padRef}
          className={`heartbeat-touch-pad ${isLocalTouching ? 'touching-local' : ''} ${isPartnerTouching ? 'touching-partner' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Central Pulsing Heart Symbol */}
          <div className={`central-beating-heart ${screenPulseActive ? 'heart-beat-scale' : ''}`}>
            <Heart
              size={110}
              className={`heart-svg ${touchSynced ? 'synced-gold' : ''}`}
              fill="currentColor"
            />
            <div className="bpm-center-text">
              <span className="bpm-number">{currentBpm}</span>
              <span className="bpm-label">BPM</span>
            </div>
          </div>

          {/* Prompt / Instruction Overlays */}
          {!isLocalTouching && !isPartnerTouching && (
            <div className="heartbeat-touch-prompt">
              <p className="prompt-title-ml">സ്ക്രീനിൽ വിരലമർത്തിപ്പിടിക്കൂ 💓</p>
              <p className="prompt-subtitle">
                Press & hold anywhere. Partner feels your exact heartbeat rhythm and vibration.
              </p>
            </div>
          )}

          {/* Local User Finger Point */}
          {isLocalTouching && (
            <div
              className="touch-finger-indicator local-finger"
              style={{
                left: `${localTouchPos.x * 100}%`,
                top: `${localTouchPos.y * 100}%`,
              }}
            >
              <div className="finger-halo local-halo" />
              <div className="finger-label local-label">
                <span>You (നിങ്ങൾ)</span>
              </div>
            </div>
          )}

          {/* Remote Partner Finger Point */}
          {isPartnerTouching && partnerTouchPos && (
            <div
              className="touch-finger-indicator partner-finger"
              style={{
                left: `${partnerTouchPos.x * 100}%`,
                top: `${partnerTouchPos.y * 100}%`,
              }}
            >
              <div className="finger-halo partner-halo" />
              <div className="finger-label partner-label">
                <Avatar url={peer?.avatar_url} name={peer?.name} size={18} />
                <span>{peer?.name || 'Partner'}</span>
              </div>
            </div>
          )}

          {/* Connection Line between fingers if both touching */}
          {touchSynced && partnerTouchPos && (
            <svg className="finger-connection-svg">
              <line
                x1={`${localTouchPos.x * 100}%`}
                y1={`${localTouchPos.y * 100}%`}
                x2={`${partnerTouchPos.x * 100}%`}
                y2={`${partnerTouchPos.y * 100}%`}
                className="connection-laser"
              />
            </svg>
          )}

          {/* Ripples Layer */}
          {ripples.map((r) => (
            <div
              key={r.id}
              className={`pulse-ripple ${r.source === 'partner' ? 'partner-ripple' : 'local-ripple'}`}
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
            />
          ))}

          {/* Flying Hearts / Emojis Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="flying-heart-particle"
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

        {/* Live ECG Electrocardiogram Line */}
        <div className="heartbeat-ecg-container">
          <div className="ecg-header">
            <div className="ecg-label">
              <Activity size={13} className="ecg-icon" />
              <span>CARDIAC RHYTHM MONITOR</span>
            </div>
            <span className="ecg-tempo-name">
              {currentBpm < 75
                ? 'Calm & Steady (ശാന്തം)'
                : currentBpm < 100
                ? 'Warm & Loving (സ്നേഹാർദ്രം)'
                : 'Racing For You! (തുടിക്കുന്ന നെഞ്ചകം)'}
            </span>
          </div>
          <canvas ref={ecgCanvasRef} className="ecg-canvas" />
        </div>

        {/* Tempo Presets Bar */}
        <div className="heartbeat-presets-bar">
          {TEMPO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`hb-preset-chip ${activePreset === preset.id ? 'active' : ''}`}
              onClick={() => handleSelectPreset(preset)}
            >
              <span>{preset.labelMl}</span>
            </button>
          ))}
        </div>

        {/* Footer & Chat Love Note Card Option */}
        <footer className="heartbeat-footer">
          {showNoteComposer ? (
            <div className="hb-note-composer">
              <input
                type="text"
                placeholder="Add a loving message... (എന്റെ ഓരോ തുടിപ്പും നിനക്കായി)"
                value={loveNote}
                maxLength={100}
                onChange={(e) => setLoveNote(e.target.value)}
                className="hb-note-input"
              />
              <button
                type="button"
                className="hb-send-card-btn"
                onClick={handleSendHeartbeatCard}
              >
                <Send size={15} /> Send to Chat
              </button>
              <button
                type="button"
                className="hb-cancel-note-btn"
                onClick={() => setShowNoteComposer(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="hb-footer-bar">
              <span className="hb-footer-tip">
                💡 ഫോൺ വൈബ്രേഷനും ഹൃദയമിടിപ്പ് ശബ്ദവും തത്സമയം പാർട്ണറുടെ ഫോണിൽ പ്രതിധ്വനിക്കും.
              </span>
              <button
                type="button"
                className="hb-share-chat-action"
                onClick={() => setShowNoteComposer(true)}
              >
                <Heart size={14} fill="currentColor" /> Send Heartbeat Note to Chat
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

/**
 * Interactive Message Card for chat when a heartbeat message is received
 */
export function HeartbeatCard({ text }) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract BPM if present e.g. "💓 [Heartbeat Pulse · 78 BPM] message"
  const bpmMatch = text.match(/\[Heartbeat Pulse · (\d+)\s*BPM\]/i);
  const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 76;
  const cleanMessage = text.replace(/💓\s*\[Heartbeat Pulse · \d+\s*BPM\]\s*/i, '').trim();

  const handlePlayPulse = () => {
    setIsPlaying(true);
    triggerHeartbeatHaptics([60, 70, 80, 180, 60, 70, 80, 180]);
    playHeartbeatSound(0.5);

    setTimeout(() => {
      playHeartbeatSound(0.5);
    }, 800);

    setTimeout(() => {
      playHeartbeatSound(0.5);
      setIsPlaying(false);
    }, 1600);
  };

  return (
    <div className={`heartbeat-chat-card ${isPlaying ? 'card-beating' : ''}`}>
      <div className="hb-card-top">
        <div className="hb-card-heart-wrap">
          <Heart size={26} className={`hb-card-heart ${isPlaying ? 'beat-anim' : ''}`} fill="currentColor" />
        </div>
        <div className="hb-card-meta">
          <strong>Heartbeat Pulse (ഹൃദയസ്പന്ദനം)</strong>
          <span>💓 {bpm} BPM · Sent from the heart</span>
        </div>
      </div>

      {cleanMessage && <p className="hb-card-message">{cleanMessage}</p>}

      <button
        type="button"
        className={`hb-feel-pulse-btn ${isPlaying ? 'active' : ''}`}
        onClick={handlePlayPulse}
      >
        <Activity size={14} />
        <span>{isPlaying ? 'Feeling Heartbeat... 💓' : 'Feel Heartbeat (സ്പന്ദനം അനുഭവിക്കൂ)'}</span>
      </button>
    </div>
  );
}
