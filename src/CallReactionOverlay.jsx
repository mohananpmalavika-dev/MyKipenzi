import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CALL_REACTIONS,
  formatReactionNotice,
  generateReactionParticles,
  playCallReactionSound,
  triggerCallReactionVibration,
} from './callReactions.js';

export function CallReactionOverlay({
  call,
  user,
  peer,
  socket,
  isMalayalam = false,
  containerRef = null,
}) {
  const [particles, setParticles] = useState([]);
  const [activeNotice, setActiveNotice] = useState(null);
  const [combo, setCombo] = useState({ type: null, count: 0, timer: null });
  const [isOpen, setIsOpen] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const noticeTimerRef = useRef(null);
  const comboTimerRef = useRef(null);

  // Clean expired particles periodically
  useEffect(() => {
    if (particles.length === 0) return;
    const now = Date.now();
    const interval = setInterval(() => {
      setParticles((prev) => prev.filter((p) => now - p.createdAt < 4500));
    }, 600);
    return () => clearInterval(interval);
  }, [particles.length]);

  // Handle incoming reaction from peer via Socket.io
  useEffect(() => {
    if (!socket || !call?.id) return;

    const handleIncoming = (payload) => {
      if (payload.call_id !== call.id) return;
      if (payload.sender_id === user.id) return;

      const { reaction } = payload;
      const type = reaction?.type || 'heart';
      const count = Math.min(24, Math.max(8, (reaction?.combo || 1) * 6));
      const originX = reaction?.originX ?? null;
      const originY = reaction?.originY ?? null;

      // Spawn particles
      const newParticles = generateReactionParticles(type, count, originX, originY);
      setParticles((prev) => [...prev.slice(-40), ...newParticles]);

      // Sound & Haptic
      playCallReactionSound(type, isMuted);
      triggerCallReactionVibration(type);

      // Notice badge
      clearTimeout(noticeTimerRef.current);
      const text = formatReactionNotice(
        payload.sender_name || peer?.name,
        type,
        reaction?.combo || 1,
        isMalayalam,
      );
      setActiveNotice({ text, type, id: Date.now() });
      noticeTimerRef.current = setTimeout(() => {
        setActiveNotice(null);
      }, 3500);
    };

    socket.on('call:reaction', handleIncoming);
    return () => {
      socket.off('call:reaction', handleIncoming);
      clearTimeout(noticeTimerRef.current);
    };
  }, [socket, call?.id, user.id, peer?.name, isMuted, isMalayalam]);

  // Trigger sending a reaction (both local particle spawn + socket emission)
  const sendReaction = useCallback(
    (type, originX = null, originY = null) => {
      if (!call?.id) return;

      // Combo tracking
      let nextComboCount = 1;
      if (combo.type === type) {
        nextComboCount = combo.count + 1;
      }
      clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        setCombo({ type: null, count: 0 });
      }, 1400);
      setCombo({ type, count: nextComboCount });

      // Spawn particles locally
      const particleCount = Math.min(22, 9 + (nextComboCount - 1) * 3);
      const newParticles = generateReactionParticles(type, particleCount, originX, originY);
      setParticles((prev) => [...prev.slice(-45), ...newParticles]);

      // Sound & Haptic locally
      playCallReactionSound(type, isMuted);
      triggerCallReactionVibration(type);

      // Emit to peer
      socket?.emit('call:reaction', {
        call_id: call.id,
        reaction: {
          type,
          combo: nextComboCount,
          originX,
          originY,
        },
      });
    },
    [call?.id, combo, isMuted, socket],
  );

  // Tap anywhere on video stage to send a floating heart or rose
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const handleTap = (e) => {
      // Ignore if clicking on interactive controls or reaction bar
      if (e.target.closest('button') || e.target.closest('.call-reaction-bar')) return;

      const rect = el.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((rect.bottom - e.clientY) / rect.height) * 100;

      // Alternate between heart and rose on direct stage taps
      const tapType = Math.random() > 0.4 ? 'heart' : 'rose';
      sendReaction(tapType, clickX, clickY);
    };

    el.addEventListener('click', handleTap);
    return () => el.removeEventListener('click', handleTap);
  }, [containerRef, sendReaction]);

  return (
    <div className="call-floating-reactions-wrapper" aria-live="polite">
      {/* Dynamic Peer Notice Toast */}
      {activeNotice && (
        <div
          key={activeNotice.id}
          className={`call-reaction-toast reaction-glow-${activeNotice.type}`}
        >
          <span className="toast-sparkle">✨</span>
          <span className="toast-content">{activeNotice.text}</span>
          <span className="toast-sparkle">✨</span>
        </div>
      )}

      {/* Floating combo badge indicator */}
      {combo.count > 1 && (
        <div className="call-combo-badge">
          <span className="combo-fire">🔥</span>
          <span className="combo-text">x{combo.count} Combo!</span>
        </div>
      )}

      {/* Live Floating Particles Stage */}
      <div className="call-particles-container" pointer-events="none">
        {particles.map((p) => (
          <span
            key={p.id}
            className={`call-floating-particle ${p.isRose ? 'rose-particle' : ''}`}
            style={{
              left: p.left,
              bottom: p.bottom,
              fontSize: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              WebkitAnimationDuration: p.duration,
              WebkitAnimationDelay: p.delay,
              '--drift-x': p.driftX,
              '--mid-drift-x': p.midDriftX,
              '--rot-start': p.rotation,
              '--rot-end': p.endRotation,
              '--scale-val': p.scale,
            }}
          >
            {p.char}
          </span>
        ))}
      </div>

      {/* Floating Reaction Bar & Controls */}
      <div className={`call-reaction-bar ${isOpen ? 'expanded' : 'collapsed'}`}>
        <button
          type="button"
          className="call-reaction-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? 'ചെറുതാക്കുക (Collapse reactions)' : 'ലൈവ് റിയാക്ഷനുകൾ (Open reactions)'}
          aria-label="Toggle floating reactions"
        >
          <span className="toggle-icons">💖🌹</span>
        </button>

        {isOpen && (
          <div className="call-reaction-pills">
            {CALL_REACTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`reaction-pill-btn pill-${item.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  sendReaction(item.id);
                }}
                title={`${isMalayalam ? item.labelMl : item.label} (${item.emoji})`}
                aria-label={`Send ${item.label}`}
              >
                <span className="pill-emoji">{item.emoji}</span>
                <span className="pill-label">{isMalayalam ? item.labelMl : item.label}</span>
              </button>
            ))}

            <button
              type="button"
              className={`reaction-sound-btn ${isMuted ? 'muted' : 'active'}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              title={isMuted ? 'ശബ്ദം ഓണാക്കുക (Unmute sounds)' : 'ശബ്ദം ഓഫാക്കുക (Mute sounds)'}
              aria-label={isMuted ? 'Unmute reaction audio' : 'Mute reaction audio'}
            >
              {isMuted ? '🔇' : '🔔'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
