/**
 * In-Call Live Floating Reactions Engine
 * Provides real-time floating heart & rose cascades, sound effects,
 * multi-tap combos, and particle physics during video & voice calls.
 */

export const CALL_REACTIONS = [
  {
    id: 'heart',
    emoji: '❤️',
    label: 'Hearts',
    labelMl: 'ഹാർട്ടുകൾ',
    badge: 'Heart Shower 💖',
    badgeMl: 'സ്നേഹമഴ ❤️',
    items: ['❤️', '💖', '💕', '💗', '💓', '🤍', '🫶', '💘', '💝', '✨'],
    color: '#ff4d6d',
    glowColor: 'rgba(255, 77, 109, 0.4)',
  },
  {
    id: 'rose',
    emoji: '🌹',
    label: 'Roses',
    labelMl: 'റോസാപ്പൂക്കൾ',
    badge: 'Rose Garden 🌹',
    badgeMl: 'റോസ് ഗാർഡൻ 🌹',
    items: ['🌹', '🥀', '🌸', '🌺', '🌷', '💐', '🍃', '✨', '🌿'],
    color: '#e63946',
    glowColor: 'rgba(230, 57, 70, 0.4)',
  },
  {
    id: 'kiss',
    emoji: '😘',
    label: 'Kisses',
    labelMl: 'ചുംബനങ്ങൾ',
    badge: 'Flying Kiss 💋',
    badgeMl: 'പറക്കുന്ന ഉമ്മ 💋',
    items: ['💋', '😘', '😚', '😽', '👄', '💖', '✨'],
    color: '#ff758f',
    glowColor: 'rgba(255, 117, 143, 0.4)',
  },
  {
    id: 'love_pulse',
    emoji: '💖',
    label: 'Love Pulse',
    labelMl: 'സ്പന്ദനം',
    badge: 'Love Sparkle 💖',
    badgeMl: 'മിന്നുന്ന സ്നേഹം 💖',
    items: ['💖', '💓', '💗', '💞', '✨', '❤️', '🌟'],
    color: '#ff499e',
    glowColor: 'rgba(255, 73, 158, 0.45)',
  },
  {
    id: 'blossom',
    emoji: '🌸',
    label: 'Blossom',
    labelMl: 'പൂമഴ',
    badge: 'Petal Flurry 🌸',
    badgeMl: 'പൂവിതളുകൾ 🌸',
    items: ['🌸', '🌺', '🌼', '🌻', '🌷', '✨', '🍃'],
    color: '#f7cad0',
    glowColor: 'rgba(247, 202, 208, 0.4)',
  },
  {
    id: 'fire',
    emoji: '🔥',
    label: 'Fire',
    labelMl: 'തീക്ഷ്ണ പ്രണയം',
    badge: 'Burning Love 🔥',
    badgeMl: 'തീക്ഷ്ണ പ്രണയം 🔥',
    items: ['🔥', '❤️‍🔥', '✨', '💥', '🧡', '💛'],
    color: '#ff7b00',
    glowColor: 'rgba(255, 123, 0, 0.45)',
  },
  {
    id: 'hug',
    emoji: '🫂',
    label: 'Warm Hug',
    labelMl: 'ആലിംഗനം',
    badge: 'Warm Hug 🫂',
    badgeMl: 'സ്നേഹാലിംഗനം 🫂',
    items: ['🫂', '🤗', '🤍', '💖', '✨', '💫'],
    color: '#f9c74f',
    glowColor: 'rgba(249, 199, 79, 0.4)',
  },
  {
    id: 'celebrate',
    emoji: '🎉',
    label: 'Celebrate',
    labelMl: 'ആഘോഷം',
    badge: 'Celebration 🎉',
    badgeMl: 'സന്തോഷം 🎉',
    items: ['🎉', '✨', '🥳', '🌟', '🎊', '💫', '💖'],
    color: '#4cc9f0',
    glowColor: 'rgba(76, 201, 240, 0.45)',
  },
];

export function getReactionConfig(type) {
  return CALL_REACTIONS.find((r) => r.id === type) || CALL_REACTIONS[0];
}

/**
 * Generate randomized physics particles for live floating stream
 */
export function generateReactionParticles(type, count = 10, originX = null, originY = null) {
  const config = getReactionConfig(type);
  const items = config.items;
  const particles = [];
  const baseTimestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const char = items[Math.floor(Math.random() * items.length)];
    // Base horizontal distribution
    let leftPercent;
    if (originX !== null && originX !== undefined) {
      // Clustered near click/tap origin with random spread
      const spread = (Math.random() - 0.5) * 28;
      leftPercent = Math.max(5, Math.min(95, originX + spread));
    } else {
      leftPercent = Math.random() * 84 + 8; // 8% - 92%
    }

    const driftX = (Math.random() - 0.5) * 110;
    const midDriftX = driftX * 0.45 + (Math.random() - 0.5) * 35;
    const sizePx = Math.floor(Math.random() * 20 + 26); // 26px to 46px
    const durationSec = (Math.random() * 1.5 + 2.2).toFixed(2); // 2.2s to 3.7s
    const delaySec = (Math.random() * 0.45).toFixed(2);
    const rotationDeg = Math.floor((Math.random() - 0.5) * 60);
    const endRotationDeg = rotationDeg + Math.floor((Math.random() - 0.5) * 90);
    const scale = (Math.random() * 0.4 + 0.85).toFixed(2);

    particles.push({
      id: `p_${baseTimestamp}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      char,
      type,
      left: `${leftPercent.toFixed(1)}%`,
      bottom: originY !== null && originY !== undefined ? `${originY}%` : '6%',
      size: `${sizePx}px`,
      duration: `${durationSec}s`,
      delay: `${delaySec}s`,
      driftX: `${driftX.toFixed(1)}px`,
      midDriftX: `${midDriftX.toFixed(1)}px`,
      rotation: `${rotationDeg}deg`,
      endRotation: `${endRotationDeg}deg`,
      scale,
      isRose: type === 'rose' && (char === '🌹' || char === '🌸' || char === '🌺'),
      createdAt: baseTimestamp,
    });
  }

  return particles;
}

/**
 * Format notification badge for received call reactions
 */
export function formatReactionNotice(senderName, type, combo = 1, isMalayalam = false) {
  const config = getReactionConfig(type);
  const name = senderName || (isMalayalam ? 'പ്രിയപ്പെട്ടയാൾ' : 'Your bestie');
  const badgeText = isMalayalam ? config.badgeMl : config.badge;

  if (combo > 1) {
    return isMalayalam
      ? `${name} ${badgeText} അയച്ചു! (x${combo})`
      : `${name} sent ${badgeText}! (x${combo})`;
  }
  return isMalayalam
    ? `${name} ${config.labelMl} അയച്ചു! ${config.emoji}`
    : `${name} sent ${config.label}! ${config.emoji}`;
}

/**
 * Play synthesized sound using Web Audio API
 */
let audioCtx = null;
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playCallReactionSound(type, isMuted = false) {
  if (isMuted || typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'heart' || type === 'love_pulse') {
      // Sweet two-tone romantic chime (E5 -> G5 -> C6)
      const notes = [659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } else if (type === 'rose' || type === 'blossom') {
      // Delicate crystalline wind chime (F5 -> A5 -> C6 -> E6)
      const freqs = [698.46, 880.0, 1046.5, 1318.51];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.09, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.5);
      });
    } else if (type === 'kiss') {
      // Cute playful kiss smooch pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'fire') {
      // Warm resonant spark
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } else {
      // Soft gentle celebration ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.1);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    }
  } catch {
    // Graceful fallback if Web Audio is restricted
  }
}

/**
 * Haptic feedback during call reactions
 */
export function triggerCallReactionVibration(type) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    switch (type) {
      case 'heart':
      case 'love_pulse':
        navigator.vibrate([60, 40, 80]);
        break;
      case 'rose':
      case 'blossom':
        navigator.vibrate([40, 50, 40, 50, 60]);
        break;
      case 'kiss':
        navigator.vibrate([90, 40, 120]);
        break;
      case 'fire':
        navigator.vibrate([70, 30, 90, 40, 110]);
        break;
      default:
        navigator.vibrate([50, 30, 50]);
        break;
    }
  } catch {
    // Ignore haptic failures
  }
}
