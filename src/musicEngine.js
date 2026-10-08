// Shared Entertainment: Web Audio Music Synthesizer & Playback Engine

export const CURATED_TRACKS = [
  {
    id: 'rainy-lofi',
    titleMl: 'മഴ തോരാത്ത രാവ്',
    titleEn: 'Rainy Romance Lo-Fi',
    artist: 'Kipenzi Lo-Fi Studio',
    genre: 'Lo-Fi Chill & Rain',
    duration: 180, // 3 minutes
    bpm: 72,
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #4c1d95 100%)',
    icon: '🌧️',
    ambientType: 'rain',
    quoteMl: 'ജനലരികിൽ മഴ പെയ്യുമ്പോൾ, നിന്റെ കരം പിടിച്ച് ഈണം മൂളാൻ... ☕🌧️',
    quoteEn: 'As the soft rain taps the glass, watching the night together with you.',
    themeColor: '#6366f1',
    // Musical chords (root frequencies in Hz for progression: Dm7 -> G7 -> Cmaj7 -> Am7)
    progression: [
      { name: 'Dm7', chord: [293.66, 349.23, 440.0, 523.25], bass: 146.83, duration: 4 },
      { name: 'G7', chord: [246.94, 293.66, 392.0, 440.0], bass: 196.0, duration: 4 },
      { name: 'Cmaj7', chord: [261.63, 329.63, 392.0, 493.88], bass: 130.81, duration: 4 },
      { name: 'Am7', chord: [220.0, 261.63, 329.63, 392.0], bass: 110.0, duration: 4 },
    ],
  },
  {
    id: 'moonlight-acoustic',
    titleMl: 'പ്രണയ നിലാവ്',
    titleEn: 'Moonlit Acoustic Serenade',
    artist: 'Acoustic Soul',
    genre: 'Warm Acoustic Guitar & Strings',
    duration: 210, // 3.5 minutes
    bpm: 76,
    gradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    icon: '🌙',
    ambientType: 'night',
    quoteMl: 'നിലാവുള്ള ഈ രാത്രിയിൽ എന്റെ ഹൃദയം പാടുന്നത് നിന്നെക്കുറിച്ചാണ്... 🤍🌙',
    quoteEn: 'Beneath the quiet moonlight, every gentle chord belongs to you.',
    themeColor: '#10b981',
    // Progression: G -> Em7 -> Cmaj7 -> D
    progression: [
      { name: 'G', chord: [196.0, 246.94, 293.66, 392.0], bass: 98.0, duration: 4 },
      { name: 'Em7', chord: [164.81, 196.0, 246.94, 293.66], bass: 82.41, duration: 4 },
      { name: 'Cmaj7', chord: [261.63, 329.63, 392.0, 493.88], bass: 130.81, duration: 4 },
      { name: 'D', chord: [220.0, 293.66, 370.0, 440.0], bass: 146.83, duration: 4 },
    ],
  },
  {
    id: 'starry-piano',
    titleMl: 'നക്ഷത്രക്കൂട്',
    titleEn: 'Starry Night Piano',
    artist: 'Moonlit Keys',
    genre: 'Peaceful Romantic Piano & Pad',
    duration: 240, // 4 minutes
    bpm: 64,
    gradient: 'linear-gradient(135deg, #4c0519 0%, #831843 50%, #9d174d 100%)',
    icon: '✨',
    ambientType: 'vinyl',
    quoteMl: 'ആകാശത്തെ കോടി നക്ഷത്രങ്ങളിൽ ഞാൻ തിരയുന്നത് നിന്റെ ചിരി മാത്രമാണ്... ✨💖',
    quoteEn: 'Among ten thousand stars, your smile is my only guiding light.',
    themeColor: '#ec4899',
    // Progression: F -> G -> Em -> Am
    progression: [
      { name: 'Fmaj7', chord: [174.61, 220.0, 261.63, 329.63], bass: 87.31, duration: 4 },
      { name: 'G', chord: [196.0, 246.94, 293.66, 392.0], bass: 98.0, duration: 4 },
      { name: 'Em7', chord: [164.81, 196.0, 246.94, 329.63], bass: 82.41, duration: 4 },
      { name: 'Am', chord: [220.0, 261.63, 329.63, 440.0], bass: 110.0, duration: 4 },
    ],
  },
  {
    id: 'sunset-serenade',
    titleMl: 'സന്ധ്യാ രാഗം',
    titleEn: 'Sunset Serenade',
    artist: 'Sunset Horizons',
    genre: 'Mellow Sunset Waves & Synth',
    duration: 195, // 3m 15s
    bpm: 80,
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #ea580c 100%)',
    icon: '🌅',
    ambientType: 'waves',
    quoteMl: 'സന്ധ്യാസൂര്യൻ കടലിൽ മുങ്ങുമ്പോൾ, ദൂരങ്ങൾ മറന്ന് ഞാൻ നിന്നരികിൽ... 🌅🧡',
    quoteEn: 'As the sun dips into the crimson ocean, distances fade away.',
    themeColor: '#f97316',
    // Progression: Bbmaj7 -> Am7 -> Gm7 -> Fmaj7
    progression: [
      { name: 'Bbmaj7', chord: [233.08, 293.66, 349.23, 440.0], bass: 116.54, duration: 4 },
      { name: 'Am7', chord: [220.0, 261.63, 329.63, 392.0], bass: 110.0, duration: 4 },
      { name: 'Gm7', chord: [196.0, 233.08, 293.66, 349.23], bass: 98.0, duration: 4 },
      { name: 'Fmaj7', chord: [174.61, 220.0, 261.63, 329.63], bass: 87.31, duration: 4 },
    ],
  },
  {
    id: 'cozy-coffee',
    titleMl: 'ഒരു കപ്പ് ചായയും നീയും',
    titleEn: 'Cozy Cafe Vibes',
    artist: 'Little Haven',
    genre: 'Playful Warm Indie Groove',
    duration: 180,
    bpm: 88,
    gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)',
    icon: '☕',
    ambientType: 'vinyl',
    quoteMl: 'ഒരു ചൂടു കാപ്പിയും പ്രിയപ്പെട്ട പാട്ടും... കൂടെ നീ കൂടെയുണ്ടെങ്കിൽ സ്വർഗ്ഗം! ☕✨',
    quoteEn: 'A warm cup of coffee, our favorite song, and your laugh beside me.',
    themeColor: '#d97706',
    // Progression: C -> E7 -> Am -> F
    progression: [
      { name: 'C', chord: [261.63, 329.63, 392.0, 523.25], bass: 130.81, duration: 4 },
      { name: 'E7', chord: [164.81, 207.65, 246.94, 293.66], bass: 82.41, duration: 4 },
      { name: 'Am', chord: [220.0, 261.63, 329.63, 440.0], bass: 110.0, duration: 4 },
      { name: 'Fmaj7', chord: [174.61, 220.0, 261.63, 329.63], bass: 87.31, duration: 4 },
    ],
  },
  {
    id: 'heartbeat-ambient',
    titleMl: 'നിന്റെ ശ്വാസം പോലെ',
    titleEn: 'Soulful Deep Ambient',
    artist: 'Deep Echoes',
    genre: 'Late Night Heartbeat Atmospheric',
    duration: 240,
    bpm: 60,
    gradient: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)',
    icon: '💓',
    ambientType: 'night',
    quoteMl: 'നിശബ്ദതയിലും ഞാൻ കേൾക്കുന്നു, നിന്റെ ഓരോ ശ്വാസതാളവും... 🌌💓',
    quoteEn: 'Even in the deepest silence, our hearts beat in steady harmony.',
    themeColor: '#a855f7',
    // Progression: Dm -> Bb -> F -> C
    progression: [
      { name: 'Dm', chord: [146.83, 220.0, 293.66, 349.23], bass: 73.42, duration: 4 },
      { name: 'Bb', chord: [116.54, 174.61, 233.08, 293.66], bass: 58.27, duration: 4 },
      { name: 'F', chord: [174.61, 220.0, 261.63, 349.23], bass: 87.31, duration: 4 },
      { name: 'C', chord: [130.81, 196.0, 261.63, 329.63], bass: 65.41, duration: 4 },
    ],
  },
];

export const MUSIC_REACTIONS = [
  { emoji: '🎵', label: 'Music Note' },
  { emoji: '💖', label: 'Love' },
  { emoji: '✨', label: 'Magic' },
  { emoji: '🌙', label: 'Night' },
  { emoji: '🔥', label: 'Passion' },
  { emoji: '☕', label: 'Cozy' },
];

let sharedCtx = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

export function formatTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatSharedMusicMessage(track, note = '') {
  const cleanNote = note ? ` ${note.trim()}` : '';
  return `🎧 [Listen Together · ${track.titleMl} (${track.titleEn})]${cleanNote}`;
}

export function parseSharedMusicMessage(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/🎧\s*\[Listen Together\s*·\s*([^(\]]+)(?:\(([^)]+)\))?\]\s*(.*)/i);
  if (!match) return null;
  return {
    titleMl: match[1].trim(),
    titleEn: (match[2] || '').trim(),
    note: (match[3] || '').trim(),
  };
}

/**
 * Calculates drift between local player position and remote sync timestamp
 * @param {number} localPos - current local seconds
 * @param {number} remotePos - remote reported seconds
 * @param {number} timestamp - network timestamp when remote event was fired
 * @returns {{ drift: number, adjustedRemotePos: number, shouldSeek: boolean }}
 */
export function calculateSyncDrift(localPos, remotePos, timestamp) {
  const now = Date.now();
  const latencySec = Math.max(0, (now - (timestamp || now)) / 1000);
  const adjustedRemotePos = remotePos + latencySec;
  const drift = Math.abs(localPos - adjustedRemotePos);
  // Re-seek if drift is noticeable (> 0.5 sec)
  const shouldSeek = drift > 0.5;
  return {
    drift,
    adjustedRemotePos,
    shouldSeek,
  };
}

/**
 * MusicPlaybackEngine: Manages synchronized procedural Web Audio synthesis
 * and tracks position, looping, and smooth cross-client sync.
 */
export class MusicPlaybackEngine {
  constructor() {
    this.currentTrack = CURATED_TRACKS[0];
    this.isPlaying = false;
    this.currentPosition = 0; // seconds
    this.volume = 0.5; // 0 to 1
    this.masterGain = null;
    this.activeNodes = [];
    this.schedulerTimer = null;
    this.playbackStartWallClock = 0;
    this.playbackOffset = 0;
    this.customAudio = null;
    this.onStateChange = null;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && sharedCtx) {
      try {
        this.masterGain.gain.setValueAtTime(this.volume, sharedCtx.currentTime);
      } catch {
        // audio node might be uninitialized
      }
    }
    if (this.customAudio) {
      this.customAudio.volume = this.volume;
    }
  }

  getCurrentPosition() {
    if (!this.isPlaying) return this.currentPosition;
    if (this.customAudio) {
      return this.customAudio.currentTime || 0;
    }
    const elapsed = (Date.now() - this.playbackStartWallClock) / 1000;
    const pos = (this.playbackOffset + elapsed) % this.currentTrack.duration;
    return Math.max(0, pos);
  }

  playTrack(trackOrId, startSeconds = 0, volume = null) {
    let track = trackOrId;
    if (typeof trackOrId === 'string') {
      track = CURATED_TRACKS.find((t) => t.id === trackOrId) || CURATED_TRACKS[0];
    }
    this.stopNodes();

    this.currentTrack = track;
    if (volume !== null) this.volume = volume;
    this.playbackOffset = Math.max(0, Math.min(startSeconds, track.duration));
    this.playbackStartWallClock = Date.now();
    this.currentPosition = this.playbackOffset;
    this.isPlaying = true;

    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio = null;
    }

    this.startSynthesis(track, this.playbackOffset);
    if (this.onStateChange) this.onStateChange();
  }

  pauseTrack() {
    if (!this.isPlaying) return;
    this.currentPosition = this.getCurrentPosition();
    this.isPlaying = false;
    this.stopNodes();
    if (this.customAudio) {
      this.customAudio.pause();
    }
    if (this.onStateChange) this.onStateChange();
  }

  seekTrack(seconds) {
    const clamped = Math.max(0, Math.min(seconds, this.currentTrack.duration));
    if (this.isPlaying) {
      this.playTrack(this.currentTrack, clamped, this.volume);
    } else {
      this.currentPosition = clamped;
      this.playbackOffset = clamped;
    }
    if (this.onStateChange) this.onStateChange();
  }

  playCustomAudio(audioUrl, startSeconds = 0) {
    this.stopNodes();
    this.isPlaying = true;
    if (!this.customAudio) {
      this.customAudio = new Audio(audioUrl);
    } else {
      this.customAudio.src = audioUrl;
    }
    this.customAudio.volume = this.volume;
    this.customAudio.currentTime = startSeconds;
    this.customAudio.play().catch(() => {});
    if (this.onStateChange) this.onStateChange();
  }

  stopNodes() {
    clearInterval(this.schedulerTimer);
    this.schedulerTimer = null;
    if (this.activeNodes && this.activeNodes.length > 0) {
      for (const node of this.activeNodes) {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch {
          // ignore already stopped nodes
        }
      }
      this.activeNodes = [];
    }
  }

  startSynthesis(track, _offsetSeconds) {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const master = ctx.createGain();
    master.gain.setValueAtTime(this.volume, ctx.currentTime);
    master.connect(ctx.destination);
    this.masterGain = master;
    this.activeNodes.push(master);

    // 1. Ambient Background Noise (Rain, Vinyl, or Night Breeze)
    if (track.ambientType && track.ambientType !== 'none') {
      this.createAmbientGenerator(ctx, master, track.ambientType);
    }

    // 2. Chords & Melody Scheduler Loop
    const beatSec = 60 / track.bpm;
    const progressionTotalDuration = track.progression.reduce((acc, p) => acc + p.duration * beatSec, 0);

    const scheduleNextSection = () => {
      if (!this.isPlaying) return;
      const currentPos = this.getCurrentPosition();
      const loopTime = currentPos % progressionTotalDuration;

      // Find current chord step
      let accumulated = 0;
      let currentChordObj = track.progression[0];
      for (const chord of track.progression) {
        const stepSec = chord.duration * beatSec;
        if (loopTime >= accumulated && loopTime < accumulated + stepSec) {
          currentChordObj = chord;
          break;
        }
        accumulated += stepSec;
      }

      this.triggerChordStrum(ctx, master, currentChordObj, beatSec);
    };

    // Schedule immediately and repeat every chord beat
    scheduleNextSection();
    this.schedulerTimer = setInterval(scheduleNextSection, Math.max(1000, beatSec * 2 * 1000));
  }

  createAmbientGenerator(ctx, destination, type) {
    try {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate brownian / pink noise for organic rain and tape crackle
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'rain' || type === 'waves') {
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.5;
        } else if (type === 'vinyl') {
          // Vinyl crackle: occasional pops
          const pop = Math.random() < 0.0008 ? (Math.random() * 2 - 1) * 0.8 : 0;
          data[i] = (white * 0.04) + pop;
        } else {
          // Night ambient
          lastOut = (lastOut + 0.01 * white) / 1.01;
          data[i] = lastOut * 1.5;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = type === 'rain' ? 'lowpass' : type === 'waves' ? 'bandpass' : 'highpass';
      filter.frequency.setValueAtTime(type === 'rain' ? 850 : 450, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.045, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      noise.start();
      this.activeNodes.push(noise, filter, gain);
    } catch {
      // Audio buffer creation safe fallback
    }
  }

  triggerChordStrum(ctx, destination, chordObj, beatSec) {
    if (!this.isPlaying) return;
    const now = ctx.currentTime;

    // Bass note: warm resonant sine
    if (chordObj.bass) {
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      const bassFilter = ctx.createBiquadFilter();

      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(chordObj.bass, now);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(220, now);

      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + (chordObj.duration * beatSec * 0.9));

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(destination);

      bassOsc.start(now);
      bassOsc.stop(now + (chordObj.duration * beatSec));
      this.activeNodes.push(bassOsc, bassFilter, bassGain);
    }

    // Chord harmonic tones (rhodes/piano arpeggio style)
    chordObj.chord.forEach((freq, idx) => {
      const noteDelay = idx * 0.08; // gentle arpeggiated fingerpicking strum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle'; // warm keyboard/guitar-like tone
      osc.frequency.setValueAtTime(freq, now + noteDelay);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now + noteDelay);

      gain.gain.setValueAtTime(0.0001, now + noteDelay);
      gain.gain.linearRampToValueAtTime(0.08, now + noteDelay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + noteDelay + (beatSec * 3));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      osc.start(now + noteDelay);
      osc.stop(now + noteDelay + (beatSec * 3.2));
      this.activeNodes.push(osc, filter, gain);
    });
  }

  destroy() {
    this.stopNodes();
    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio = null;
    }
  }
}

export const musicEngine = new MusicPlaybackEngine();
