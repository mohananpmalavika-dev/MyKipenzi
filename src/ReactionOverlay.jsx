import { useEffect, useState } from 'react';

export function detectReaction(text, sticker) {
  if (sticker) {
    if (['love', 'red_heart', 'sparkle_heart', 'two_hearts', 'heart_eyes', 'rose'].includes(sticker)) {
      return 'heart';
    }
    if (sticker === 'kiss') return 'kiss';
    if (sticker === 'hug') return 'hug';
  }
  if (text) {
    const lower = text.toLowerCase();
    if (
      lower.includes('miss u') ||
      lower.includes('miss you') ||
      lower.includes('missed you') ||
      lower.includes('miss ur face') ||
      lower.includes('miss your face') ||
      lower.includes('nakukumbuka')
    ) {
      return 'miss';
    }
    if (
      lower.includes('love u') ||
      lower.includes('love you') ||
      lower.includes('loveyou') ||
      lower.includes('ishtam') ||
      lower.includes('nakupenda')
    ) {
      return 'love';
    }
    if (
      lower.includes('kiss') ||
      lower.includes('chumma') ||
      lower.includes('mutham') ||
      lower.includes('ummah') ||
      lower.includes('umma') ||
      lower.includes('halik') ||
      /[😘😚💋]/.test(lower)
    ) {
      return 'kiss';
    }
    if (
      lower.includes('hug') ||
      lower.includes('katti piditham') ||
      lower.includes('kumbatia') ||
      /[🫂]/.test(lower)
    ) {
      return 'hug';
    }
    if (
      /[❤️💖💕💓💗💘💝]/.test(lower) ||
      lower.includes('heart') ||
      lower.includes('sneham')
    ) {
      return 'heart';
    }
  }
  return null;
}

export function triggerDeviceVibration(type) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    switch (type) {
      case 'kiss':
        navigator.vibrate([90, 40, 90, 40, 180, 50, 120]);
        break;
      case 'hug':
        navigator.vibrate([120, 60, 200, 80, 250]);
        break;
      case 'love':
      case 'miss':
        navigator.vibrate([140, 90, 140, 180, 160]);
        break;
      case 'heart':
        navigator.vibrate([60, 40, 80]);
        break;
      default:
        break;
    }
  } catch {
    // Ignore unsupported vibration permissions
  }
}

export function ReactionOverlay({ reaction, onDone }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!reaction) {
      setParticles([]);
      return;
    }

    triggerDeviceVibration(reaction.type);

    if (reaction.type === 'heart') {
      const hearts = ['❤️', '💖', '💕', '💗', '💓', '🤍', '✨', '🥰'];
      const items = Array.from({ length: 42 }).map((_, i) => ({
        id: i,
        char: hearts[Math.floor(Math.random() * hearts.length)],
        left: `${Math.random() * 96 + 2}%`,
        size: `${Math.random() * 20 + 20}px`,
        duration: `${Math.random() * 1.8 + 2.2}s`,
        delay: `${Math.random() * 1.2}s`,
        drift: `${(Math.random() - 0.5) * 80}px`,
      }));
      setParticles(items);
    } else if (reaction.type === 'kiss') {
      const kisses = ['💋', '😘', '😚', '💖', '💋', '✨'];
      const items = Array.from({ length: 26 }).map((_, i) => ({
        id: i,
        char: kisses[Math.floor(Math.random() * kisses.length)],
        left: `${Math.random() * 80 + 10}%`,
        size: `${Math.random() * 24 + 24}px`,
        duration: `${Math.random() * 1.4 + 1.8}s`,
        delay: `${Math.random() * 0.8}s`,
        angle: `${(Math.random() - 0.5) * 50}deg`,
      }));
      setParticles(items);
    }

    const timer = setTimeout(() => {
      onDone?.();
    }, 3800);

    return () => clearTimeout(timer);
  }, [reaction, onDone]);

  if (!reaction) return null;

  return (
    <div
      className={`reaction-stage reaction-${reaction.type}`}
      onClick={onDone}
      role="presentation"
      aria-hidden="true"
    >
      {/* Heart Rain particles */}
      {reaction.type === 'heart' && (
        <div className="heart-rain-container">
          {particles.map((p) => (
            <span
              key={p.id}
              className="falling-heart"
              style={{
                left: p.left,
                fontSize: p.size,
                animationDuration: p.duration,
                animationDelay: p.delay,
                '--drift': p.drift,
              }}
            >
              {p.char}
            </span>
          ))}
        </div>
      )}

      {/* Kiss Burst & Vibration FX */}
      {reaction.type === 'kiss' && (
        <div className="kiss-burst-container">
          <div className="kiss-center-pulse">
            <span className="kiss-main-icon">💋</span>
            <div className="kiss-ripple" />
            <div className="kiss-ripple delay" />
          </div>
          {particles.map((p) => (
            <span
              key={p.id}
              className="floating-kiss"
              style={{
                left: p.left,
                fontSize: p.size,
                animationDuration: p.duration,
                animationDelay: p.delay,
                '--angle': p.angle,
              }}
            >
              {p.char}
            </span>
          ))}
          <div className="reaction-badge">
            <span className="badge-title">Sending you a huge kiss! 😘</span>
            <span className="badge-subtitle">Right on your cheek! Muah! 💋</span>
          </div>
        </div>
      )}

      {/* Hug Warmth & Vibration FX */}
      {reaction.type === 'hug' && (
        <div className="hug-burst-container">
          <div className="hug-center-wrap">
            <div className="hug-aura ring-1" />
            <div className="hug-aura ring-2" />
            <div className="hug-aura ring-3" />
            <span className="hug-main-icon">🫂</span>
          </div>
          <div className="reaction-badge warm">
            <span className="badge-title">Warmest tight hug for you! 🫂</span>
            <span className="badge-subtitle">Hold on, never letting go. Everything will be fine 🤍</span>
          </div>
        </div>
      )}

      {/* Love You Emotional Impact */}
      {reaction.type === 'love' && (
        <div className="soulmate-impact-container love-glow">
          <div className="soulmate-heartbeat">
            <span className="soulmate-main-icon">💖</span>
            <div className="heartbeat-aura" />
          </div>
          <div className="reaction-badge emotional">
            <span className="badge-title">I Love You So Much! ❤️</span>
            <span className="badge-subtitle">You’re my favorite person in the whole universe ✨</span>
          </div>
        </div>
      )}

      {/* Miss You Emotional Impact */}
      {reaction.type === 'miss' && (
        <div className="soulmate-impact-container miss-glow">
          <div className="soulmate-heartbeat">
            <span className="soulmate-main-icon">🥺</span>
            <div className="heartbeat-aura soft" />
          </div>
          <div className="reaction-badge emotional">
            <span className="badge-title">I Miss You Tons! 🤍</span>
            <span className="badge-subtitle">Counting the seconds till I see your face again 🫂</span>
          </div>
        </div>
      )}
    </div>
  );
}
