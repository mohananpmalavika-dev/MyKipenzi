import { safeVibrate } from './safeVibrate.js';

// Invisible Ink & Magic Fog Messages (രഹസ്യ മഷി 🪄🌫️)
// Utility, Themes, Audio Synthesizer, Haptics & Formatters

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

export const FOG_THEMES = {
  rose: {
    id: 'rose',
    name: 'Rose Petal Mist',
    malayalamName: 'പ്രണയ റോസ് മഞ്ഞ്',
    emoji: '🌸',
    fogColors: ['rgba(254, 205, 211, 0.95)', 'rgba(253, 164, 175, 0.92)', 'rgba(244, 114, 182, 0.94)'],
    sparkleColors: ['#f472b6', '#fb7185', '#fbcfe8', '#ffffff', '#ffd1dc'],
    primaryColor: '#e11d48',
    glowColor: 'rgba(225, 29, 72, 0.35)',
    borderGlow: 'rgba(251, 113, 133, 0.5)',
    cardBg: 'linear-gradient(145deg, #fff1f2, #ffe4e6)',
  },
  mystic: {
    id: 'mystic',
    name: 'Mystic Lavender Fog',
    malayalamName: 'രഹസ്യ ലാവെൻഡർ പുക',
    emoji: '🔮',
    fogColors: ['rgba(233, 213, 255, 0.95)', 'rgba(216, 180, 254, 0.92)', 'rgba(192, 132, 252, 0.94)'],
    sparkleColors: ['#c084fc', '#e9d5ff', '#a855f7', '#ffffff', '#d8b4fe'],
    primaryColor: '#9333ea',
    glowColor: 'rgba(147, 51, 234, 0.35)',
    borderGlow: 'rgba(192, 132, 252, 0.5)',
    cardBg: 'linear-gradient(145deg, #faf5ff, #f3e8ff)',
  },
  golden: {
    id: 'golden',
    name: 'Golden Starlight',
    malayalamName: 'സ്വർണ്ണ നക്ഷത്രമഞ്ഞ്',
    emoji: '✨',
    fogColors: ['rgba(254, 240, 138, 0.95)', 'rgba(253, 224, 71, 0.92)', 'rgba(250, 204, 21, 0.94)'],
    sparkleColors: ['#facc15', '#fef08a', '#fbbf24', '#ffffff', '#fde047'],
    primaryColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.35)',
    borderGlow: 'rgba(250, 204, 21, 0.5)',
    cardBg: 'linear-gradient(145deg, #fffbeb, #fef3c7)',
  },
  aurora: {
    id: 'aurora',
    name: 'Emerald Aurora',
    malayalamName: 'മാന്ത്രിക മഞ്ഞ്',
    emoji: '🌿',
    fogColors: ['rgba(167, 243, 208, 0.95)', 'rgba(110, 231, 183, 0.92)', 'rgba(52, 211, 153, 0.94)'],
    sparkleColors: ['#34d399', '#6ee7b7', '#a7f3d0', '#ffffff', '#10b981'],
    primaryColor: '#059669',
    glowColor: 'rgba(5, 150, 105, 0.35)',
    borderGlow: 'rgba(52, 211, 153, 0.5)',
    cardBg: 'linear-gradient(145deg, #ecfdf5, #d1fae5)',
  },
};

export const AUTO_CONCEAL_DURATIONS = [
  { value: 5, label: '5s', labelFull: '5 സെക്കൻഡ് (Fast)' },
  { value: 8, label: '8s', labelFull: '8 സെക്കൻഡ് (Default)' },
  { value: 12, label: '12s', labelFull: '12 സെക്കൻഡ് (Relaxed)' },
  { value: 20, label: '20s', labelFull: '20 സെക്കൻഡ് (Long)' },
];

export const ROMANTIC_SECRET_PROMPTS = [
  {
    textMl: 'നിന്നെ ഒരുപാട് സ്നേഹിക്കുന്നു, എന്നും എപ്പോഴും... ❤️',
    textEn: 'I love you endlessly, always and forever...',
    category: 'love',
  },
  {
    textMl: 'ഇന്ന് രാത്രി നിനക്കായി ഒരു ചെറിയ സർപ്രൈസ് ഒരുക്കിവെച്ചിട്ടുണ്ട്! 🤫✨',
    textEn: 'A sweet little surprise is waiting for you tonight!',
    category: 'surprise',
  },
  {
    textMl: 'എന്റെ ചിന്തകളിൽ മുഴുവൻ നീ മാത്രമാണ് പ്രിയേ... 💭💖',
    textEn: 'You are all that occupies my thoughts...',
    category: 'flirt',
  },
  {
    textMl: 'ഈ മെസ്സേജ് മായ്ച്ചു കഴിഞ്ഞാൽ എനിക്കൊരു ഉമ്മ അയക്കണം! 😘💋',
    textEn: 'Once you reveal this, you owe me a warm kiss!',
    category: 'playful',
  },
  {
    textMl: 'ലോകത്തിലെ ഏറ്റവും മനോഹരമായ ചിരി നിന്റേതാണ്... ✨',
    textEn: 'You have the most breathtaking smile in the world...',
    category: 'compliment',
  },
  {
    textMl: 'എത്ര ദൂരെയാണെങ്കിലും എന്റെ മനസ്സ് നിന്റെ കൂടെയുണ്ട് 🫂💕',
    textEn: 'No matter how far apart, my soul is always beside you...',
    category: 'comfort',
  },
];

// Audio Synthesizers via Web Audio API
let lastChimeTime = 0;

export function playScratchChime(pitchMultiplier = 1) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Throttle chimes so scratching feels smooth and soothing
    if (now - lastChimeTime < 0.08) return;
    lastChimeTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // High crystalline twinkle frequencies
    const baseFreqs = [880, 1046.5, 1318.5, 1567.98, 1760, 2093];
    const chosenFreq = baseFreqs[Math.floor(Math.random() * baseFreqs.length)] * (0.9 + Math.random() * 0.2) * pitchMultiplier;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(chosenFreq, now);
    osc.frequency.exponentialRampToValueAtTime(chosenFreq * 1.08, now + 0.12);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch {
    // Ignore audio errors gracefully
  }
}

export function playFogWhoosh() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Soft swirling noise for fog re-conceal
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.4);
    filter.Q.setValueAtTime(2.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.42);
  } catch {
    // Ignore audio errors gracefully
  }
}

export function playRevealTada() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = now + idx * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.04, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.36);
    });
  } catch {
    // Ignore audio errors gracefully
  }
}

export function triggerScratchHaptics() {
  safeVibrate(8);
}

export function triggerRevealHaptics() {
  safeVibrate([25, 30, 40]);
}

// Detection and Parsing
export function isMessageInvisibleInk(text) {
  if (!text || typeof text !== 'string') return false;
  return (
    text.startsWith('🪄 [Invisible Ink') ||
    text.startsWith('🌫️ [Invisible Ink') ||
    text.startsWith('[INVISIBLE_INK') ||
    text.startsWith('🪄 [രഹസ്യ മഷി') ||
    text.startsWith('🌫️ [മാജിക് ഫോഗ്') ||
    /^\s*🪄\s*\[Invisible Ink/i.test(text)
  );
}

export function parseInvisibleInk(text) {
  if (!text || typeof text !== 'string') {
    return {
      isSecret: false,
      theme: 'rose',
      concealDelay: 8,
      content: '',
      isPhoto: false,
    };
  }

  const isSecret = isMessageInvisibleInk(text);
  if (!isSecret) {
    return {
      isSecret: false,
      theme: 'rose',
      concealDelay: 8,
      content: text,
      isPhoto: false,
    };
  }

  // Extract theme e.g. theme:mystic or theme:rose
  let theme = 'rose';
  const themeMatch = text.match(/theme:([a-zA-Z0-9_-]+)/i);
  if (themeMatch && FOG_THEMES[themeMatch[1].toLowerCase()]) {
    theme = themeMatch[1].toLowerCase();
  }

  // Extract conceal delay e.g. hide:12s or 12s
  let concealDelay = 8;
  const hideMatch = text.match(/(?:hide:|delay:)?(\d+)s/i);
  if (hideMatch) {
    const parsed = parseInt(hideMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 120) {
      concealDelay = parsed;
    }
  }

  const isPhoto = text.toLowerCase().includes('photo') || text.includes('ചിത്രം');

  // Clean out the bracket metadata prefix
  const content = text
    .replace(/^[\s\S]*?\[(?:Invisible Ink|രഹസ്യ മഷി|മാജിക് ഫോഗ്)[^\]]*\]\s*/i, '')
    .trim();

  return {
    isSecret: true,
    theme,
    concealDelay,
    content,
    isPhoto,
  };
}

export function formatInvisibleInkMessage(text, options = {}) {
  const theme = options.theme && FOG_THEMES[options.theme] ? options.theme : 'rose';
  const concealDelay = options.concealDelay || 8;
  const isPhoto = Boolean(options.isPhoto);
  const typeTag = isPhoto ? 'Invisible Ink Photo 📷' : 'Invisible Ink';
  const clean = (text || '').trim();

  return `🪄 [${typeTag} 🌫️ · theme:${theme} · hide:${concealDelay}s] ${clean}`;
}

export function getInvisibleInkPreviewText(text) {
  if (!isMessageInvisibleInk(text)) return text;
  const parsed = parseInvisibleInk(text);
  if (parsed.isPhoto) {
    return '🪄 Invisible Ink Photo · Scratch to reveal 🌫️';
  }
  return '🪄 Invisible Ink · Scratch to reveal 🌫️';
}
