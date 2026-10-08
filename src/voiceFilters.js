/**
 * Kipenzi Connect - Fun Voice Filters for Voice Notes
 * ശബ്ദം മാറ്റാനുള്ള രസകരമായ ഇഫക്റ്റുകൾ (Cute, Romantic Echo, Deep, Walkie-Talkie)
 */

export const VOICE_FILTERS = [
  {
    id: 'normal',
    name: 'Original',
    malayalamName: 'സാധാരണ ശബ്ദം',
    icon: '🎙️',
    description: 'Natural authentic voice',
    malayalamDesc: 'മാറ്റമില്ലാത്ത സ്വന്തം ശബ്ദം',
    tagline: 'Pure & Natural',
    color: '#0ea5e9',
    badgeClass: 'filter-normal',
  },
  {
    id: 'cute',
    name: 'Cute Chipmunk',
    malayalamName: 'ക്യൂട്ട് ചിപ്‌മങ്ക്',
    icon: '🐿️',
    description: 'Playful high-pitch & sweet squeaky voice',
    malayalamDesc: 'കളിയും ചിരിയും നിറഞ്ഞ ക്യൂട്ട് ഹൈ-പിച്ച് സ്വരം',
    tagline: 'Adorable & Playful',
    color: '#ec4899',
    badgeClass: 'filter-cute',
  },
  {
    id: 'romantic_echo',
    name: 'Romantic Echo',
    malayalamName: 'റൊമാന്റിക് എക്കോ',
    icon: '✨',
    description: 'Dreamy soft echo with warm ambient reverb',
    malayalamDesc: 'മനോഹരമായ സ്വപ്നതുല്യമായ എക്കോയും മാന്ത്രിക ശബ്ദവും',
    tagline: 'Dreamy & Tender',
    color: '#a855f7',
    badgeClass: 'filter-romantic',
  },
  {
    id: 'deep',
    name: 'Deep Voice',
    malayalamName: 'ഡീപ് വോയ്സ്',
    icon: '🦁',
    description: 'Rich bass, sultry & resonant cinematic tone',
    malayalamDesc: 'ഗംഭീരമായ കട്ട ബേസും ആഴമുള്ള ശബ്ദവും',
    tagline: 'Rich & Sultry',
    color: '#6366f1',
    badgeClass: 'filter-deep',
  },
  {
    id: 'walkie_talkie',
    name: 'Walkie-Talkie',
    malayalamName: 'വാക്കി-ടോക്കി',
    icon: '📻',
    description: 'Vintage 2-way radio bandpass with roger beep',
    malayalamDesc: 'യഥാർത്ഥ പോലീസ്/സൈനിക റേഡിയോ ഇഫക്റ്റും ബീപ്പും',
    tagline: 'Over & Out Roger',
    color: '#f59e0b',
    badgeClass: 'filter-radio',
  },
];

export const VOICE_FILTERS_MAP = Object.fromEntries(
  VOICE_FILTERS.map((filter) => [filter.id, filter]),
);

/**
 * Retrieve filter definition by id
 */
export function getVoiceFilter(filterId) {
  return VOICE_FILTERS_MAP[filterId] || VOICE_FILTERS_MAP.normal;
}

/**
 * Format a voice note filename with filter identifier
 */
export function formatVoiceFilename(filterId = 'normal', timestamp = Date.now()) {
  const cleanId = VOICE_FILTERS_MAP[filterId] ? filterId : 'normal';
  return `voice-note-${cleanId}-${timestamp}.wav`;
}

/**
 * Detect voice filter from filename or attachment metadata
 */
export function detectVoiceFilterFromFilename(filename = '') {
  if (!filename || typeof filename !== 'string') return null;
  const match = filename.match(/^voice-note-([a-z0-9_]+)-\d+\.(wav|webm|ogg|mp4|m4a)$/i);
  if (match && match[1]) {
    const id = match[1].toLowerCase();
    if (VOICE_FILTERS_MAP[id] && id !== 'normal') {
      return VOICE_FILTERS_MAP[id];
    }
  }
  return null;
}

/**
 * Convert an AudioBuffer into standard 16-bit PCM RIFF WAV Blob
 * Fully compatible with all browsers and server-side virus/format inspection
 */
export function audioBufferToWav(audioBuffer) {
  if (!audioBuffer) throw new Error('AudioBuffer is required to encode WAV');

  const numChannels = Math.max(1, Math.min(2, audioBuffer.numberOfChannels || 1));
  const sampleRate = audioBuffer.sampleRate || 44100;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // 1. RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // 2. fmt Sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size for PCM
  view.setUint16(20, 1, true); // AudioFormat 1 = Linear PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample = 16

  // 3. data Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // 4. Interleave & write samples
  const channelData = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, Math.floor(intSample), true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Generate a synthetic stereo impulse response for convolution reverb
 */
export function createSyntheticImpulseResponse(audioContext, duration = 1.4, decay = 2.4) {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / length;
    const factor = Math.exp(-t * decay);
    // Stereo diffusion with exponential decay
    left[i] = (Math.random() * 2 - 1) * factor;
    right[i] = (Math.random() * 2 - 1) * factor;
  }
  return impulse;
}

/**
 * Generate a soft-clipping saturation curve for WaveShaperNode
 */
function createSaturationCurve(amount = 20, samples = 1024) {
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

/**
 * Apply the selected voice filter to an AudioBuffer using OfflineAudioContext.
 * Returns a new filtered AudioBuffer.
 */
export async function applyVoiceFilter(audioBuffer, filterId = 'normal') {
  if (!audioBuffer) throw new Error('AudioBuffer is required');

  if (filterId === 'normal' || !VOICE_FILTERS_MAP[filterId]) {
    return audioBuffer;
  }

  const OfflineCtxClass =
    typeof window !== 'undefined'
      ? window.OfflineAudioContext || window.webkitOfflineAudioContext
      : null;

  if (!OfflineCtxClass) {
    return audioBuffer;
  }

  const sampleRate = audioBuffer.sampleRate;
  const numChannels = 2; // Output stereo for spatial echo/richness

  if (filterId === 'cute') {
    // 🐿️ Cute Chipmunk: Playback rate 1.36x + High-Pass + Bright High-Shelf EQ
    const playbackRate = 1.36;
    const outputDuration = audioBuffer.duration / playbackRate + 0.1;
    const outputFrames = Math.ceil(outputDuration * sampleRate);
    const offlineCtx = new OfflineCtxClass(numChannels, outputFrames, sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRate;

    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 240;

    const presence = offlineCtx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 1600;
    presence.gain.value = 4.0;
    presence.Q.value = 1.2;

    const highshelf = offlineCtx.createBiquadFilter();
    highshelf.type = 'highshelf';
    highshelf.frequency.value = 3500;
    highshelf.gain.value = 6.0;

    source.connect(highpass);
    highpass.connect(presence);
    presence.connect(highshelf);
    highshelf.connect(offlineCtx.destination);

    source.start(0);
    return await offlineCtx.startRendering();
  }

  if (filterId === 'romantic_echo') {
    // ✨ Romantic Echo: Warm EQ + Soft Stereo Delay + Dreamy Ambient Reverb
    const extraTail = 1.25; // Reverb/echo ring-out time
    const outputDuration = audioBuffer.duration + extraTail;
    const outputFrames = Math.ceil(outputDuration * sampleRate);
    const offlineCtx = new OfflineCtxClass(numChannels, outputFrames, sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // Warmth filter
    const warmth = offlineCtx.createBiquadFilter();
    warmth.type = 'peaking';
    warmth.frequency.value = 380;
    warmth.gain.value = 3.5;
    warmth.Q.value = 1.0;

    // Soft sibilance smoother
    const smoother = offlineCtx.createBiquadFilter();
    smoother.type = 'lowpass';
    smoother.frequency.value = 7500;

    // Dry voice path
    const dryGain = offlineCtx.createGain();
    dryGain.gain.value = 0.88;

    // Delay / Echo path
    const delay = offlineCtx.createDelay(1.0);
    delay.delayTime.value = 0.22; // 220ms tender delay

    const delayFilter = offlineCtx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 3000;

    const feedback = offlineCtx.createGain();
    feedback.gain.value = 0.32;

    const delayWetGain = offlineCtx.createGain();
    delayWetGain.gain.value = 0.42;

    // Convolver Reverb path
    const convolver = offlineCtx.createConvolver();
    convolver.buffer = createSyntheticImpulseResponse(offlineCtx, 1.4, 2.2);

    const reverbGain = offlineCtx.createGain();
    reverbGain.gain.value = 0.35;

    // Wire up
    source.connect(warmth);
    warmth.connect(smoother);

    // Dry
    smoother.connect(dryGain);
    dryGain.connect(offlineCtx.destination);

    // Delay loop
    smoother.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(delay);
    delayFilter.connect(delayWetGain);
    delayWetGain.connect(offlineCtx.destination);

    // Reverb
    smoother.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(offlineCtx.destination);

    source.start(0);
    return await offlineCtx.startRendering();
  }

  if (filterId === 'deep') {
    // 🦁 Deep Voice: Playback rate 0.78x + Deep Bass Low-Shelf + Warm Saturation
    const playbackRate = 0.78;
    const outputDuration = audioBuffer.duration / playbackRate + 0.1;
    const outputFrames = Math.ceil(outputDuration * sampleRate);
    const offlineCtx = new OfflineCtxClass(numChannels, outputFrames, sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRate;

    const bass = offlineCtx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 175;
    bass.gain.value = 7.5;

    const midTame = offlineCtx.createBiquadFilter();
    midTame.type = 'peaking';
    midTame.frequency.value = 2800;
    midTame.gain.value = -3.0;
    midTame.Q.value = 1.0;

    const shaper = offlineCtx.createWaveShaper();
    shaper.curve = createSaturationCurve(14, 1024);
    shaper.oversample = '2x';

    const gain = offlineCtx.createGain();
    gain.gain.value = 0.95;

    source.connect(bass);
    bass.connect(midTame);
    midTame.connect(shaper);
    shaper.connect(gain);
    gain.connect(offlineCtx.destination);

    source.start(0);
    return await offlineCtx.startRendering();
  }

  if (filterId === 'walkie_talkie') {
    // 📻 Walkie-Talkie: Bandpass (450Hz - 2900Hz) + Overdrive Crunch + Roger Beep
    const rogerBeepDuration = 0.28;
    const outputDuration = audioBuffer.duration + rogerBeepDuration;
    const outputFrames = Math.ceil(outputDuration * sampleRate);
    const offlineCtx = new OfflineCtxClass(numChannels, outputFrames, sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // Highpass 450Hz
    const hp = offlineCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 480;
    hp.Q.value = 1.8;

    // Lowpass 2900Hz
    const lp = offlineCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2800;
    lp.Q.value = 2.0;

    // Horn/Megaphone resonance
    const horn = offlineCtx.createBiquadFilter();
    horn.type = 'peaking';
    horn.frequency.value = 1600;
    horn.gain.value = 6.0;
    horn.Q.value = 2.2;

    // Analog crunch overdrive
    const distortion = offlineCtx.createWaveShaper();
    distortion.curve = createSaturationCurve(32, 1024);

    const radioGain = offlineCtx.createGain();
    radioGain.gain.value = 0.85;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(horn);
    horn.connect(distortion);
    distortion.connect(radioGain);
    radioGain.connect(offlineCtx.destination);

    source.start(0);

    // Iconic 2-Tone Roger Beep at the end of transmission
    const beepStart = audioBuffer.duration + 0.02;

    // Tone 1: 1050 Hz
    const osc1 = offlineCtx.createOscillator();
    const osc1Gain = offlineCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 1050;
    osc1Gain.gain.setValueAtTime(0.2, beepStart);
    osc1Gain.gain.setValueAtTime(0.001, beepStart + 0.09);
    osc1.connect(osc1Gain);
    osc1Gain.connect(offlineCtx.destination);
    osc1.start(beepStart);
    osc1.stop(beepStart + 0.1);

    // Tone 2: 1550 Hz
    const osc2 = offlineCtx.createOscillator();
    const osc2Gain = offlineCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 1550;
    osc2Gain.gain.setValueAtTime(0.22, beepStart + 0.1);
    osc2Gain.gain.setValueAtTime(0.001, beepStart + 0.22);
    osc2.connect(osc2Gain);
    osc2Gain.connect(offlineCtx.destination);
    osc2.start(beepStart + 0.1);
    osc2.stop(beepStart + 0.23);

    return await offlineCtx.startRendering();
  }

  return audioBuffer;
}

/**
 * Decode audio Blob into AudioBuffer using browser AudioContext
 */
export async function decodeAudioBlob(blob) {
  if (!blob) throw new Error('Blob is required');
  const AudioCtxClass =
    typeof window !== 'undefined'
      ? window.AudioContext || window.webkitAudioContext
      : null;
  if (!AudioCtxClass) throw new Error('Web Audio API not supported in this environment');

  const audioCtx = new AudioCtxClass();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    void audioCtx.close().catch(() => {});
  }
}
