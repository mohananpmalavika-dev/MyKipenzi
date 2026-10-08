// Audio Context Singleton for low latency
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

/**
 * Play an acoustic double-beat ("lub-dub") human heartbeat
 */
export function playHeartbeatSound(volume = 0.45) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(Math.min(1, Math.max(0, volume)), now);
    master.connect(ctx.destination);

    // --- S1 "Lub" sound (First heart sound - deeper, resonant) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter1 = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(58, now);
    osc1.frequency.exponentialRampToValueAtTime(38, now + 0.12);

    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(140, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.7, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(master);

    osc1.start(now);
    osc1.stop(now + 0.14);

    // Sub-bass thump for chest feel
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(36, now);
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start(now);
    subOsc.stop(now + 0.11);

    // --- S2 "Dub" sound (Second heart sound - slightly sharper, higher pitch, 140ms later) ---
    const s2Time = now + 0.14;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const filter2 = ctx.createBiquadFilter();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(74, s2Time);
    osc2.frequency.exponentialRampToValueAtTime(46, s2Time + 0.1);

    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(160, s2Time);

    gain2.gain.setValueAtTime(0.001, s2Time);
    gain2.gain.linearRampToValueAtTime(0.85, s2Time + 0.015);
    gain2.gain.exponentialRampToValueAtTime(0.001, s2Time + 0.11);

    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(master);

    osc2.start(s2Time);
    osc2.stop(s2Time + 0.12);
  } catch {
    /* AudioContext might be waiting for user gesture */
  }
}

/**
 * Play celestial sync chime when two touches meet
 */
export function playSyncChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.25, now);
    master.connect(ctx.destination);

    // Celestial chord: C5, E5, G5, B5, C6
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.05 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.6);

      osc.connect(gain);
      gain.connect(master);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.65);
    });
  } catch {
    /* audio context error fallback */
  }
}

/**
 * Trigger mobile haptic vibration
 */
export function triggerHeartbeatHaptics(pattern = [60, 70, 80, 180]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* haptic vibration unsupported or blocked fallback */
  }
}
