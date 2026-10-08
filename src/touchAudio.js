// Web Audio API Synthesizers & Haptic Engine for Virtual Touch & Haptic Hug

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export const TOUCH_MODES = [
  {
    id: 'gentle',
    labelMl: 'മൃദുസ്പർശം',
    labelEn: 'Gentle Touch',
    emoji: '🌸',
    color: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.75)',
    descMl: 'പൂവിതൾ പോലുള്ള മൃദുവായ തലോടൽ',
  },
  {
    id: 'hug',
    labelMl: 'സ്നേഹാലിംഗനം',
    labelEn: 'Haptic Hug',
    emoji: '🫂',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.85)',
    descMl: 'ആഴത്തിലുള്ള സുരക്ഷിത ആലിംഗനം (ദീർഘനേരം അമർത്തിപ്പിടിക്കൂ)',
  },
  {
    id: 'sparkle',
    labelMl: 'നക്ഷത്രസ്പർശം',
    labelEn: 'Stardust Magic',
    emoji: '✨',
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.8)',
    descMl: 'നക്ഷത്രങ്ങൾ മിന്നുന്ന മാന്ത്രിക സ്പർശം',
  },
  {
    id: 'flame',
    labelMl: 'ഹൃദയാഗ്നി',
    labelEn: 'Warm Passion',
    emoji: '🔥',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.85)',
    descMl: 'തുടിക്കുന്ന നെഞ്ചകത്തിന്റെ പ്രണയ ചൂട്',
  },
];

export const HAPTIC_PATTERNS = {
  gentle: [45],
  tap: [60],
  pulse: [60, 50, 70],
  sparkle: [30, 40, 30, 40, 50],
  flame: [70, 40, 90, 50, 110],
  // Haptic Hug: deep crescendo wave that gives physical warmth & closeness
  hug: [100, 60, 160, 70, 220, 80, 280, 90, 320],
  // Touch Resonance: dual sync resonance when two fingers meet
  resonance: [80, 40, 120, 50, 180, 60, 260],
};

/**
 * Trigger mobile haptic vibration with safe fallbacks
 */
export function triggerTouchHaptics(pattern = HAPTIC_PATTERNS.pulse) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
      return true;
    }
  } catch {
    /* Haptics unsupported or user interaction blocked */
  }
  return false;
}

/**
 * Play touch audio chime tailored to the selected touch style
 */
export function playTouchSound(style = 'gentle', volume = 0.4) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), now);
    master.connect(ctx.destination);

    if (style === 'hug') {
      // Warm resonant pad hum for hug
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(130.81, now); // C3
      osc2.frequency.setValueAtTime(196.00, now); // G3

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.6);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.6, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    } else if (style === 'sparkle') {
      // Bright stardust chime
      const notes = [659.25, 880.0, 1046.5, 1318.5]; // E5, A5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.001, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);

        osc.connect(gain);
        gain.connect(master);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.4);
      });
    } else if (style === 'flame') {
      // Warm low frequency throb
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now); // A2
      osc.frequency.exponentialRampToValueAtTime(73.4, now + 0.25);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Default 'gentle': Soft sweet bell drop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(392.0, now + 0.22); // G4

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.32);
    }
  } catch {
    /* AudioContext fallback */
  }
}

/**
 * Play celestial resonance chime when both partners touch or hug simultaneously
 */
export function playResonanceChime(volume = 0.5) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), now);
    master.connect(ctx.destination);

    // Harmonic blend: C4, G4, C5, E5, G5, C6
    const freqs = [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.001, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.04 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.7);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.75);
    });
  } catch {
    /* audio fallback */
  }
}
