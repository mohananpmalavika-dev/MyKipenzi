import { safeVibrate } from './safeVibrate.js';

// Web Audio API Synthesizers for "Sleep Together" Synchronized Night Room
// Zero external audio files required: all soundscapes are procedurally generated in real time

let sharedAudioCtx = null;

export function getAudioContext() {
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

// Generate reusable pink noise buffer for realistic rain, waves & wind
function createNoiseBuffer(ctx, seconds = 6) {
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * seconds;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Paul Kellet's filtered pink noise algorithm
  let b0L = 0, b1L = 0, b2L = 0, b3L = 0, b4L = 0, b5L = 0, b6L = 0;
  let b0R = 0, b1R = 0, b2R = 0, b3R = 0, b4R = 0, b5R = 0, b6R = 0;

  for (let i = 0; i < bufferSize; i++) {
    const whiteL = Math.random() * 2 - 1;
    b0L = 0.99886 * b0L + whiteL * 0.0555179;
    b1L = 0.99332 * b1L + whiteL * 0.0750759;
    b2L = 0.96900 * b2L + whiteL * 0.1538520;
    b3L = 0.86650 * b3L + whiteL * 0.3104856;
    b4L = 0.55000 * b4L + whiteL * 0.5329522;
    b5L = -0.7616 * b5L - whiteL * 0.0168980;
    left[i] = (b0L + b1L + b2L + b3L + b4L + b5L + b6L + whiteL * 0.5362) * 0.11;
    b6L = whiteL * 0.115926;

    const whiteR = Math.random() * 2 - 1;
    b0R = 0.99886 * b0R + whiteR * 0.0555179;
    b1R = 0.99332 * b1R + whiteR * 0.0750759;
    b2R = 0.96900 * b2R + whiteR * 0.1538520;
    b3R = 0.86650 * b3R + whiteR * 0.3104856;
    b4R = 0.55000 * b4R + whiteR * 0.5329522;
    b5R = -0.7616 * b5R - whiteR * 0.0168980;
    right[i] = (b0R + b1R + b2R + b3R + b4R + b5R + b6R + whiteR * 0.5362) * 0.11;
    b6R = whiteR * 0.115926;
  }
  return buffer;
}

export const SLEEP_SOUNDSCAPES = [
  {
    id: 'rain',
    titleMl: 'മൃദുവായ മഴത്തുള്ളികൾ',
    titleEn: 'Monsoon Rain & Droplets',
    icon: 'CloudRain',
    emoji: '🌧️',
    descriptionMl: 'ജനലിൽ തട്ടിച്ചിതറുന്ന മഴയുടെ തണുപ്പും ശാന്തതയും',
    descriptionEn: 'Soothing rain gently tapping on the windowpane with distant cozy rumbles',
    color: '#38bdf8',
    gradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(30, 58, 138, 0.4) 100%)',
  },
  {
    id: 'ocean',
    titleMl: 'ശാന്തമായ കടലലകൾ',
    titleEn: 'Calm Ocean Waves',
    icon: 'Waves',
    emoji: '🌊',
    descriptionMl: 'നിലാവിൽ തീരം തൊട്ട് മടങ്ങുന്ന തിരമാലകളുടെ താളം',
    descriptionEn: 'Rhythmic, slow rolling ocean surf under a midnight moon',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(14, 116, 144, 0.4) 100%)',
  },
  {
    id: 'lullaby',
    titleMl: 'സോഫ്റ്റ് ലാലേബി & മ്യൂസിക് ബോക്സ്',
    titleEn: 'Celestial Lullaby',
    icon: 'Sparkles',
    emoji: '🎶',
    descriptionMl: 'ഉറക്കത്തിലേക്ക് മാടിവിളിക്കുന്ന മാന്ത്രിക സ്വരതരംഗങ്ങൾ',
    descriptionEn: 'Dreamy music box bells and ethereal 432Hz theta harmonic pads',
    color: '#c084fc',
    gradient: 'linear-gradient(135deg, rgba(192, 132, 252, 0.2) 0%, rgba(88, 28, 135, 0.4) 100%)',
  },
  {
    id: 'forest',
    titleMl: 'രാത്രി വനവും ചീവീടുകളും',
    titleEn: 'Night Forest & Fireflies',
    icon: 'Wind',
    emoji: '🦗',
    descriptionMl: 'തണുത്ത കാറ്റും മിന്നാമിനുങ്ങുകളും ചീവീടിന്റെ നാദവും',
    descriptionEn: 'Gentle night breeze with gentle crickets and forest quietude',
    color: '#34d399',
    gradient: 'linear-gradient(135deg, rgba(52, 211, 153, 0.2) 0%, rgba(6, 78, 59, 0.4) 100%)',
  },
  {
    id: 'fireplace',
    titleMl: 'വിറകുവെട്ടവും പ്രണയച്ചൂടും',
    titleEn: 'Warm Bedside Hearth',
    icon: 'Flame',
    emoji: '🔥',
    descriptionMl: 'തണുപ്പകറ്റുന്ന അടുപ്പിന്റെ തരിപ്പും സുരക്ഷിതത്വവും',
    descriptionEn: 'Warm crackling hearth and soft embers keeping you cozy',
    color: '#fb923c',
    gradient: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(154, 52, 18, 0.4) 100%)',
  },
];

class SleepAudioEngine {
  constructor() {
    this.currentSoundscape = 'rain';
    this.isPlaying = false;
    this.volume = 0.55;
    this.isMuted = false;
    this.nodes = [];
    this.intervals = [];
    this.masterGain = null;
    this.noiseBuffer = null;

    // Timer management
    this.timerDurationMinutes = 0;
    this.timerSecondsRemaining = 0;
    this.timerInterval = null;
    this.timerListeners = new Set();
  }

  initMasterGain() {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    const targetVol = this.isMuted ? 0 : this.volume;
    this.masterGain.gain.setValueAtTime(targetVol, ctx.currentTime);
    if (!this.noiseBuffer) {
      this.noiseBuffer = createNoiseBuffer(ctx, 6);
    }
    return this.masterGain;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    const ctx = getAudioContext();
    if (this.masterGain && ctx) {
      const now = ctx.currentTime;
      const target = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(target, now + 0.1);
    }
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    this.setVolume(this.volume);
  }

  stop() {
    const ctx = getAudioContext();
    if (this.masterGain && ctx) {
      try {
        const now = ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      } catch {
        /* ignore */
      }
    }

    setTimeout(() => {
      this.cleanupNodes();
    }, 400);

    this.isPlaying = false;
  }

  cleanupNodes() {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];

    for (const node of this.nodes) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {
        /* node might be stopped already */
      }
    }
    this.nodes = [];
  }

  play(soundscapeId = this.currentSoundscape) {
    this.cleanupNodes();
    const ctx = getAudioContext();
    if (!ctx) return;

    this.initMasterGain();
    const now = ctx.currentTime;
    const targetVol = this.isMuted ? 0 : this.volume;
    this.masterGain.gain.setValueAtTime(0.001, now);
    this.masterGain.gain.linearRampToValueAtTime(targetVol, now + 0.8);

    this.currentSoundscape = soundscapeId;
    this.isPlaying = true;

    switch (soundscapeId) {
      case 'rain':
        this.buildRainNodes(ctx);
        break;
      case 'ocean':
        this.buildOceanNodes(ctx);
        break;
      case 'lullaby':
        this.buildLullabyNodes(ctx);
        break;
      case 'forest':
        this.buildForestNodes(ctx);
        break;
      case 'fireplace':
        this.buildFireplaceNodes(ctx);
        break;
      default:
        this.buildRainNodes(ctx);
        break;
    }
  }

  // --- 1. Gentle Monsoon Rain ---
  buildRainNodes(ctx) {
    // Continuous rain noise bed
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    noiseSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(950, ctx.currentTime);

    const rainHighFilter = ctx.createBiquadFilter();
    rainHighFilter.type = 'highpass';
    rainHighFilter.frequency.setValueAtTime(140, ctx.currentTime);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.7, ctx.currentTime);

    noiseSource.connect(rainHighFilter);
    rainHighFilter.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.masterGain);

    noiseSource.start();
    this.nodes.push(noiseSource, rainFilter, rainHighFilter, rainGain);

    // Occasional soft droplets (random frequency resonant ping)
    const dropletInterval = setInterval(() => {
      if (!this.isPlaying) return;
      try {
        const dropNow = ctx.currentTime;
        const osc = ctx.createOscillator();
        const dropGain = ctx.createGain();
        const dropFilter = ctx.createBiquadFilter();

        const freq = 1200 + Math.random() * 1100;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, dropNow);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, dropNow + 0.08);

        dropFilter.type = 'bandpass';
        dropFilter.frequency.setValueAtTime(freq, dropNow);
        dropFilter.Q.setValueAtTime(12, dropNow);

        const dropVol = 0.05 + Math.random() * 0.07;
        dropGain.gain.setValueAtTime(0.001, dropNow);
        dropGain.gain.linearRampToValueAtTime(dropVol, dropNow + 0.01);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, dropNow + 0.09);

        osc.connect(dropFilter);
        dropFilter.connect(dropGain);
        dropGain.connect(this.masterGain);

        osc.start(dropNow);
        osc.stop(dropNow + 0.1);
      } catch {
        /* ignore */
      }
    }, 380);
    this.intervals.push(dropletInterval);

    // Very soft distant rolling thunder swell every 30-45 seconds
    const thunderInterval = setInterval(() => {
      if (!this.isPlaying) return;
      try {
        const tNow = ctx.currentTime;
        const thunderOsc = ctx.createOscillator();
        const thunderGain = ctx.createGain();
        const thunderFilter = ctx.createBiquadFilter();

        thunderOsc.type = 'sine';
        thunderOsc.frequency.setValueAtTime(45, tNow);
        thunderOsc.frequency.linearRampToValueAtTime(32, tNow + 3.5);

        thunderFilter.type = 'lowpass';
        thunderFilter.frequency.setValueAtTime(80, tNow);

        thunderGain.gain.setValueAtTime(0.001, tNow);
        thunderGain.gain.linearRampToValueAtTime(0.18, tNow + 1.2);
        thunderGain.gain.exponentialRampToValueAtTime(0.0001, tNow + 3.8);

        thunderOsc.connect(thunderFilter);
        thunderFilter.connect(thunderGain);
        thunderGain.connect(this.masterGain);

        thunderOsc.start(tNow);
        thunderOsc.stop(tNow + 4.0);
      } catch {
        /* ignore */
      }
    }, 32000);
    this.intervals.push(thunderInterval);
  }

  // --- 2. Calm Ocean Waves ---
  buildOceanNodes(ctx) {
    const waveSource = ctx.createBufferSource();
    waveSource.buffer = this.noiseBuffer;
    waveSource.loop = true;

    // Filter whose frequency sweeps up and down with an LFO
    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.setValueAtTime(320, ctx.currentTime);
    waveFilter.Q.setValueAtTime(2.2, ctx.currentTime);

    // LFO for surf ebb and flow (period approx. 7.5 seconds)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.13, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(280, ctx.currentTime); // Modulate cutoff by +/- 280Hz

    lfo.connect(lfoGain);
    lfoGain.connect(waveFilter.frequency);

    // Tremolo gain for surf rise/fall volume swell
    const swellGain = ctx.createGain();
    const lfoVolGain = ctx.createGain();
    lfoVolGain.gain.setValueAtTime(0.28, ctx.currentTime);
    lfo.connect(lfoVolGain);
    lfoVolGain.connect(swellGain.gain);
    swellGain.gain.setValueAtTime(0.48, ctx.currentTime);

    waveSource.connect(waveFilter);
    waveFilter.connect(swellGain);
    swellGain.connect(this.masterGain);

    waveSource.start();
    lfo.start();

    this.nodes.push(waveSource, waveFilter, lfo, lfoGain, lfoVolGain, swellGain);
  }

  // --- 3. Celestial Lullaby & Music Box ---
  buildLullabyNodes(ctx) {
    // Warm 432Hz ambient chord drone (theta wave relaxation)
    const droneFreqs = [108, 162, 216, 271.8]; // Harmonic series centered around calming A/D
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.15, ctx.currentTime);
    droneGain.connect(this.masterGain);

    droneFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, ctx.currentTime);

      g.gain.setValueAtTime(0.25, ctx.currentTime);
      osc.connect(filter);
      filter.connect(g);
      g.connect(droneGain);

      osc.start();
      this.nodes.push(osc, filter, g);
    });
    this.nodes.push(droneGain);

    // Pentatonic lullaby notes played softly like a dream music box
    // Notes: D4, F4, G4, A4, C5, D5, F5
    const lullabyScale = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46];
    let noteIdx = 0;

    const lullabyInterval = setInterval(() => {
      if (!this.isPlaying) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const bellFilter = ctx.createBiquadFilter();
        const noteGain = ctx.createGain();

        const freq = lullabyScale[noteIdx % lullabyScale.length];
        // Cycle smoothly through calming sequence
        noteIdx = (noteIdx + (Math.random() > 0.4 ? 1 : 2)) % lullabyScale.length;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        bellFilter.type = 'bandpass';
        bellFilter.frequency.setValueAtTime(freq, now);
        bellFilter.Q.setValueAtTime(4, now);

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.linearRampToValueAtTime(0.12, now + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        osc.connect(bellFilter);
        bellFilter.connect(noteGain);
        noteGain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 2.5);
      } catch {
        /* ignore */
      }
    }, 1900);
    this.intervals.push(lullabyInterval);
  }

  // --- 4. Night Forest & Whispering Wind ---
  buildForestNodes(ctx) {
    // Whispering night breeze
    const windSource = ctx.createBufferSource();
    windSource.buffer = this.noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(380, ctx.currentTime);
    windFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.35, ctx.currentTime);

    // Wind modulation
    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.setValueAtTime(0.08, ctx.currentTime);
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.setValueAtTime(140, ctx.currentTime);

    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.masterGain);

    windSource.start();
    windLfo.start();
    this.nodes.push(windSource, windFilter, windGain, windLfo, windLfoGain);

    // Night crickets rhythmic chirping
    const cricketInterval = setInterval(() => {
      if (!this.isPlaying) return;
      try {
        const now = ctx.currentTime;
        // 3 mini chirps in rapid succession
        for (let i = 0; i < 3; i++) {
          const chirpTime = now + i * 0.06;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(4600 + Math.random() * 200, chirpTime);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(4650, chirpTime);
          filter.Q.setValueAtTime(16, chirpTime);

          gain.gain.setValueAtTime(0.0001, chirpTime);
          gain.gain.linearRampToValueAtTime(0.025, chirpTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, chirpTime + 0.045);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);

          osc.start(chirpTime);
          osc.stop(chirpTime + 0.05);
        }
      } catch {
        /* ignore */
      }
    }, 2200);
    this.intervals.push(cricketInterval);
  }

  // --- 5. Warm Bedside Fireplace ---
  buildFireplaceNodes(ctx) {
    // Low warm hearth rumble
    const rumbleSource = ctx.createBufferSource();
    rumbleSource.buffer = this.noiseBuffer;
    rumbleSource.loop = true;

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(190, ctx.currentTime);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.65, ctx.currentTime);

    rumbleSource.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);

    rumbleSource.start();
    this.nodes.push(rumbleSource, rumbleFilter, rumbleGain);

    // Firewood crackle & pops
    const crackleInterval = setInterval(() => {
      if (!this.isPlaying) return;
      try {
        const now = ctx.currentTime;
        const popOsc = ctx.createOscillator();
        const popFilter = ctx.createBiquadFilter();
        const popGain = ctx.createGain();

        const isDeepPop = Math.random() > 0.6;
        const popFreq = isDeepPop ? 140 + Math.random() * 80 : 850 + Math.random() * 600;

        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(popFreq, now);
        popOsc.frequency.exponentialRampToValueAtTime(40, now + 0.04);

        popFilter.type = 'lowpass';
        popFilter.frequency.setValueAtTime(1200, now);

        const popVol = 0.04 + Math.random() * 0.06;
        popGain.gain.setValueAtTime(0.001, now);
        popGain.gain.linearRampToValueAtTime(popVol, now + 0.005);
        popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        popOsc.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(this.masterGain);

        popOsc.start(now);
        popOsc.stop(now + 0.06);
      } catch {
        /* ignore */
      }
    }, 280);
    this.intervals.push(crackleInterval);
  }

  // --- Auto Sleep Timer Management ---
  setTimer(durationMinutes, onTick, onComplete) {
    this.cancelTimer();
    if (!durationMinutes || durationMinutes <= 0) return;

    this.timerDurationMinutes = durationMinutes;
    this.timerSecondsRemaining = durationMinutes * 60;

    const tick = () => {
      this.timerSecondsRemaining -= 1;

      // Smooth fade-out in final 2 minutes (120 seconds)
      if (this.timerSecondsRemaining <= 120 && this.timerSecondsRemaining > 0) {
        const fadeRatio = this.timerSecondsRemaining / 120;
        const fadedVol = (this.isMuted ? 0 : this.volume) * fadeRatio;
        const ctx = getAudioContext();
        if (this.masterGain && ctx) {
          const now = ctx.currentTime;
          this.masterGain.gain.cancelScheduledValues(now);
          this.masterGain.gain.linearRampToValueAtTime(Math.max(0.0001, fadedVol), now + 0.8);
        }
      }

      if (onTick) onTick(this.timerSecondsRemaining);
      this.notifyTimerListeners();

      if (this.timerSecondsRemaining <= 0) {
        this.cancelTimer();
        this.stop();
        if (onComplete) onComplete();
        this.notifyTimerListeners();
      }
    };

    this.timerInterval = setInterval(tick, 1000);
    this.notifyTimerListeners();
  }

  cancelTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerDurationMinutes = 0;
    this.timerSecondsRemaining = 0;
    this.notifyTimerListeners();
  }

  subscribeTimer(cb) {
    this.timerListeners.add(cb);
    return () => this.timerListeners.delete(cb);
  }

  notifyTimerListeners() {
    for (const listener of this.timerListeners) {
      try {
        listener(this.timerSecondsRemaining, this.timerDurationMinutes);
      } catch {
        /* ignore */
      }
    }
  }
}

// Global Singleton instance for seamless playback across modal open/close & mini-player
export const sleepAudioEngine = new SleepAudioEngine();

/**
 * Play a delicate celestial goodnight chime
 */
export function playGoodnightChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.35, now);
    master.connect(ctx.destination);

    // Ethereal arpeggio notes (F#5 -> G#5 -> B5 -> D#6)
    const notes = [739.99, 830.61, 987.77, 1244.51];
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.8);

      osc.connect(gain);
      gain.connect(master);

      osc.start(noteTime);
      osc.stop(noteTime + 1.9);
    });
  } catch {
    /* AudioContext gesture pending */
  }
}

/**
 * Trigger subtle soothing vibration if supported
 */
export function triggerSleepHaptics(pattern = [30]) {
  safeVibrate(pattern);
}

export function formatRemainingTime(seconds) {
  if (!seconds || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
