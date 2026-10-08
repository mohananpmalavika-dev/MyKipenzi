let audioCtx = null;
let chimeTimer = null;
let speechTimer = null;
let vibrateTimer = null;
let isPlaying = false;

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

// Play a sweet, warm romantic bell/marimba chime chord progression
function playRomanticChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Pentatonic romantic music-box melody: E5, G5, A5, C6, B5, G5, E5
    const notes = [
      { freq: 659.25, time: 0.0, dur: 0.45 },   // E5
      { freq: 783.99, time: 0.35, dur: 0.45 },  // G5
      { freq: 880.0, time: 0.7, dur: 0.5 },    // A5
      { freq: 1046.5, time: 1.1, dur: 0.65 },  // C6
      { freq: 987.77, time: 1.7, dur: 0.5 },   // B5
      { freq: 783.99, time: 2.1, dur: 0.55 },  // G5
      { freq: 659.25, time: 2.6, dur: 0.8 },   // E5
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Sweet bell envelope: quick soft attack, gentle exponential fade
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.exponentialRampToValueAtTime(0.18, now + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  } catch {
    // Ignore audio errors
  }
}

function speakLovingAnnouncement(callerName, userLanguage = 'en') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();

    let text = `${callerName} is calling you! Your favorite person wants to talk to you... please pick up!`;
    let lang = 'en-US';

    if (userLanguage === 'ml' || userLanguage === 'manglish') {
      text = `${callerName} vilikkunnu! Muthe, call edukku, ${callerName} is calling you with lots of love!`;
      lang = 'ml-IN';
    } else if (userLanguage === 'sw') {
      text = `${callerName} anapiga simu! Kipenzi changu, pokea simu, ${callerName} anakupenda!`;
      lang = 'sw-KE';
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Gentle and sweet pace
    utterance.pitch = 1.15; // Warm, loving pitch
    utterance.lang = lang;

    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech errors
  }
}

export function startLovingRingtone(callerName, userLanguage = 'en') {
  if (isPlaying) return;
  isPlaying = true;

  // 1. Initial play
  playRomanticChime();
  setTimeout(() => {
    if (isPlaying) speakLovingAnnouncement(callerName, userLanguage);
  }, 1000);

  // 2. Chime loop every 3.6 seconds
  chimeTimer = setInterval(() => {
    if (!isPlaying) return;
    playRomanticChime();
  }, 3600);

  // 3. Loving announcement repeated every 7.5 seconds
  speechTimer = setInterval(() => {
    if (!isPlaying) return;
    speakLovingAnnouncement(callerName, userLanguage);
  }, 7500);

  // 4. Phone vibration rhythm
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([400, 200, 400, 200, 800, 500]);
      vibrateTimer = setInterval(() => {
        if (!isPlaying) return;
        try {
          navigator.vibrate([400, 200, 400, 200, 800, 500]);
        } catch { /* Vibration may be unavailable on this device. */ }
      }, 3000);
    } catch { /* Vibration may be unavailable on this device. */ }
  }
}

export function stopLovingRingtone() {
  isPlaying = false;
  clearInterval(chimeTimer);
  clearInterval(speechTimer);
  clearInterval(vibrateTimer);
  chimeTimer = null;
  speechTimer = null;
  vibrateTimer = null;

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch { /* Speech may have already stopped. */ }
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch { /* Vibration may be unavailable on this device. */ }
  }
}
