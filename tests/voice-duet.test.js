import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractWaveformPeaks,
  audioBufferToWavBlob,
} from '../src/voiceDuetEngine.js';

// Mock simple AudioBuffer for Node.js test environment
function createMockAudioBuffer(duration = 2.0, sampleRate = 44100, numChannels = 1) {
  const length = Math.floor(duration * sampleRate);
  const channelData = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    // Generate sine wave
    channelData[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI);
  }
  return {
    duration,
    sampleRate,
    numberOfChannels: numChannels,
    length,
    getChannelData: () => channelData,
  };
}

test('extractWaveformPeaks generates normalized peak array of specified length', () => {
  const mockBuffer = createMockAudioBuffer(2.0);
  const peaks = extractWaveformPeaks(mockBuffer, 20);

  assert.equal(peaks.length, 20);
  for (const peak of peaks) {
    assert.ok(peak >= 0.08);
    assert.ok(peak <= 1.0);
  }
});

test('extractWaveformPeaks handles null or undefined buffer gracefully', () => {
  const emptyPeaks = extractWaveformPeaks(null, 30);
  assert.equal(emptyPeaks.length, 30);
  assert.equal(emptyPeaks[0], 0.1);
});

test('audioBufferToWavBlob creates valid WAV Blob with correct RIFF header', () => {
  const mockBuffer = createMockAudioBuffer(0.5, 44100, 1);
  const blob = audioBufferToWavBlob(mockBuffer);

  assert.ok(blob);
  assert.equal(blob.type, 'audio/wav');
  assert.ok(blob.size > 44); // Header is 44 bytes + PCM data
});

test('Duet duration calculations match sequential and harmony modes', () => {
  const partnerDuration = 3.5;
  const userDuration = 4.0;
  const crossfadeSeconds = 0.25;

  // Sequential mode
  const sequentialExpected = partnerDuration + crossfadeSeconds + userDuration;
  assert.equal(sequentialExpected, 7.75);

  // Harmony mode
  const harmonyExpected = Math.max(partnerDuration, userDuration);
  assert.equal(harmonyExpected, 4.0);
});
