/**
 * Kipenzi Connect - Voice Note Duet Audio Engine
 * Merges, synchronizes, and mixes couple voice notes using the Web Audio API
 */

/**
 * Creates an AudioContext safely
 */
export function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  return new AudioContextClass();
}

/**
 * Decodes an Audio Blob into an AudioBuffer
 */
export async function decodeAudioBlob(blob, audioCtx = null) {
  const ctx = audioCtx || getAudioContext();
  if (!ctx) throw new Error('Web Audio is not supported in this browser.');
  const arrayBuffer = await blob.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

/**
 * Generates an array of normalized waveform peaks (0 to 1) for visualizer
 */
export function extractWaveformPeaks(audioBuffer, numPeaks = 40) {
  if (!audioBuffer) return new Array(numPeaks).fill(0.1);
  const channelData = audioBuffer.getChannelData(0);
  const step = Math.floor(channelData.length / numPeaks);
  const peaks = [];

  for (let i = 0; i < numPeaks; i++) {
    const start = i * step;
    let max = 0;
    for (let j = 0; j < step; j++) {
      const val = Math.abs(channelData[start + j] || 0);
      if (val > max) max = val;
    }
    peaks.push(Math.min(1, Math.max(0.08, max)));
  }
  return peaks;
}

/**
 * Synthesizes a subtle, warm romance reverb impulse response
 */
function createWarmReverbBuffer(ctx, duration = 1.2, decay = 2.0) {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = i / length;
    const factor = Math.exp(-n * decay);
    left[i] = (Math.random() * 2 - 1) * factor;
    right[i] = (Math.random() * 2 - 1) * factor;
  }
  return impulse;
}

/**
 * Encodes an AudioBuffer into a WAV Blob
 */
export function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let pos = 0;

  function setUint16(data) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  out.setUint32(0, 0x46464952, true); // "RIFF"
  setUint32(length - 8); // file length - 8
  out.setUint32(8, 0x45564157, true); // "WAVE"
  pos = 12;

  // fmt sub-chunk
  out.setUint32(pos, 0x20746d66, true); // "fmt "
  pos += 4;
  setUint32(16); // subchunk1size (16 for PCM)
  setUint16(1); // PCM format
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * numOfChan * 2); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // 16-bit audio

  // data sub-chunk
  out.setUint32(pos, 0x61746164, true); // "data"
  pos += 4;
  setUint32(length - pos - 4); // data length

  // Interleave channels
  const channels = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      out.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([out.buffer], { type: 'audio/wav' });
}

/**
 * Mixes Partner Track and User Track into a single high-quality Duet AudioBuffer and Blob
 *
 * @param {AudioBuffer} partnerBuffer - Track 1 (Partner's line)
 * @param {AudioBuffer} userBuffer - Track 2 (User's response line)
 * @param {Object} options
 * @param {'sequential'|'harmony'} options.mode - 'sequential' (one after another) or 'harmony' (simultaneous)
 * @param {number} options.partnerGain - 0.0 to 1.5 (default 1.0)
 * @param {number} options.userGain - 0.0 to 1.5 (default 1.0)
 * @param {boolean} options.applyWarmReverb - whether to add romantic acoustic warmth
 * @param {number} options.crossfadeSeconds - gap between lines in sequential mode (default 0.25s)
 * @returns {Promise<{ mergedBuffer: AudioBuffer, mergedBlob: Blob, duration: number }>}
 */
export async function mixDuetTracks(
  partnerBuffer,
  userBuffer,
  {
    mode = 'sequential',
    partnerGain = 1.0,
    userGain = 1.0,
    applyWarmReverb = true,
    crossfadeSeconds = 0.25,
  } = {}
) {
  if (!partnerBuffer && !userBuffer) {
    throw new Error('No audio buffers provided for duet mixing.');
  }

  // If one is missing, fallback to single track
  if (!partnerBuffer) {
    const singleBlob = audioBufferToWavBlob(userBuffer);
    return { mergedBuffer: userBuffer, mergedBlob: singleBlob, duration: userBuffer.duration };
  }
  if (!userBuffer) {
    const singleBlob = audioBufferToWavBlob(partnerBuffer);
    return { mergedBuffer: partnerBuffer, mergedBlob: singleBlob, duration: partnerBuffer.duration };
  }

  const sampleRate = partnerBuffer.sampleRate;
  let totalDuration = 0;
  let userStartTime = 0;

  if (mode === 'sequential') {
    // Track 1 plays, then small gap, then Track 2
    userStartTime = partnerBuffer.duration + crossfadeSeconds;
    totalDuration = userStartTime + userBuffer.duration;
  } else {
    // Harmony: both play concurrently
    userStartTime = 0;
    totalDuration = Math.max(partnerBuffer.duration, userBuffer.duration);
  }

  // Use OfflineAudioContext to render
  const offlineCtx = new OfflineAudioContext(
    2, // stereo
    Math.ceil(totalDuration * sampleRate),
    sampleRate
  );

  // Setup reverb if requested
  let reverbNode = null;
  if (applyWarmReverb) {
    reverbNode = offlineCtx.createConvolver();
    reverbNode.buffer = createWarmReverbBuffer(offlineCtx);
  }

  // Track 1: Partner Source & Gain
  const src1 = offlineCtx.createBufferSource();
  src1.buffer = partnerBuffer;
  const gain1 = offlineCtx.createGain();
  gain1.gain.value = partnerGain;

  // Track 2: User Source & Gain
  const src2 = offlineCtx.createBufferSource();
  src2.buffer = userBuffer;
  const gain2 = offlineCtx.createGain();
  gain2.gain.value = userGain;

  // Connect nodes
  src1.connect(gain1);
  src2.connect(gain2);

  gain1.connect(offlineCtx.destination);
  gain2.connect(offlineCtx.destination);

  if (reverbNode) {
    const reverbWet = offlineCtx.createGain();
    reverbWet.gain.value = 0.18; // gentle warmth
    gain1.connect(reverbNode);
    gain2.connect(reverbNode);
    reverbNode.connect(reverbWet);
    reverbWet.connect(offlineCtx.destination);
  }

  // Start schedules
  src1.start(0);
  src2.start(userStartTime);

  // Render audio
  const mergedBuffer = await offlineCtx.startRendering();
  const mergedBlob = audioBufferToWavBlob(mergedBuffer);

  return {
    mergedBuffer,
    mergedBlob,
    duration: totalDuration,
  };
}
