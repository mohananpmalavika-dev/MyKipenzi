import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VOICE_FILTERS,
  VOICE_FILTERS_MAP,
  getVoiceFilter,
  formatVoiceFilename,
  detectVoiceFilterFromFilename,
  audioBufferToWav,
} from '../src/voiceFilters.js';

test('VOICE_FILTERS contains all required filters with Malayalam & English labels', () => {
  assert.equal(VOICE_FILTERS.length, 5);
  const ids = VOICE_FILTERS.map((f) => f.id);
  assert.deepEqual(ids, ['normal', 'cute', 'romantic_echo', 'deep', 'walkie_talkie']);

  // Verify Cute Chipmunk
  const cute = VOICE_FILTERS_MAP.cute;
  assert.ok(cute);
  assert.equal(cute.name, 'Cute Chipmunk');
  assert.equal(cute.malayalamName, 'ക്യൂട്ട് ചിപ്‌മങ്ക്');
  assert.equal(cute.icon, '🐿️');
  assert.ok(cute.malayalamDesc.includes('ഹൈ-പിച്ച്'));

  // Verify Romantic Echo
  const romantic = VOICE_FILTERS_MAP.romantic_echo;
  assert.ok(romantic);
  assert.equal(romantic.name, 'Romantic Echo');
  assert.equal(romantic.malayalamName, 'റൊമാന്റിക് എക്കോ');
  assert.equal(romantic.icon, '✨');
  assert.ok(romantic.malayalamDesc.includes('എക്കോ'));

  // Verify Deep Voice
  const deep = VOICE_FILTERS_MAP.deep;
  assert.ok(deep);
  assert.equal(deep.name, 'Deep Voice');
  assert.equal(deep.malayalamName, 'ഡീപ് വോയ്സ്');
  assert.equal(deep.icon, '🦁');
  assert.ok(deep.malayalamDesc.includes('ബേസും'));

  // Verify Walkie-Talkie
  const walkie = VOICE_FILTERS_MAP.walkie_talkie;
  assert.ok(walkie);
  assert.equal(walkie.name, 'Walkie-Talkie');
  assert.equal(walkie.malayalamName, 'വാക്കി-ടോക്കി');
  assert.equal(walkie.icon, '📻');
  assert.ok(walkie.malayalamDesc.includes('റേഡിയോ'));
});

test('getVoiceFilter retrieves filter by id and falls back to normal for unknown id', () => {
  assert.equal(getVoiceFilter('cute').id, 'cute');
  assert.equal(getVoiceFilter('romantic_echo').id, 'romantic_echo');
  assert.equal(getVoiceFilter('deep').id, 'deep');
  assert.equal(getVoiceFilter('walkie_talkie').id, 'walkie_talkie');
  assert.equal(getVoiceFilter('non_existent').id, 'normal');
  assert.equal(getVoiceFilter(null).id, 'normal');
});

test('formatVoiceFilename generates standardized filename with filter and timestamp', () => {
  const ts = 1700000000000;
  assert.equal(formatVoiceFilename('cute', ts), 'voice-note-cute-1700000000000.wav');
  assert.equal(formatVoiceFilename('romantic_echo', ts), 'voice-note-romantic_echo-1700000000000.wav');
  assert.equal(formatVoiceFilename('deep', ts), 'voice-note-deep-1700000000000.wav');
  assert.equal(formatVoiceFilename('walkie_talkie', ts), 'voice-note-walkie_talkie-1700000000000.wav');
  assert.equal(formatVoiceFilename('invalid', ts), 'voice-note-normal-1700000000000.wav');
});

test('detectVoiceFilterFromFilename extracts active filter from filename', () => {
  const cuteFilter = detectVoiceFilterFromFilename('voice-note-cute-1728412345678.wav');
  assert.ok(cuteFilter);
  assert.equal(cuteFilter.id, 'cute');
  assert.equal(cuteFilter.icon, '🐿️');

  const romanticFilter = detectVoiceFilterFromFilename('voice-note-romantic_echo-1728412345678.wav');
  assert.ok(romanticFilter);
  assert.equal(romanticFilter.id, 'romantic_echo');
  assert.equal(romanticFilter.icon, '✨');

  const deepFilter = detectVoiceFilterFromFilename('voice-note-deep-1728412345678.wav');
  assert.ok(deepFilter);
  assert.equal(deepFilter.id, 'deep');
  assert.equal(deepFilter.icon, '🦁');

  const walkieFilter = detectVoiceFilterFromFilename('voice-note-walkie_talkie-1728412345678.wav');
  assert.ok(walkieFilter);
  assert.equal(walkieFilter.id, 'walkie_talkie');
  assert.equal(walkieFilter.icon, '📻');

  // Normal returns null so original voice notes don't display a filter badge
  assert.equal(detectVoiceFilterFromFilename('voice-note-normal-1728412345678.wav'), null);
  assert.equal(detectVoiceFilterFromFilename('photo.png'), null);
  assert.equal(detectVoiceFilterFromFilename(''), null);
});

test('audioBufferToWav generates valid 16-bit PCM RIFF WAV binary with correct header', async () => {
  const sampleRate = 44100;
  const numFrames = 4410; // 0.1s
  const channelData = new Float32Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    channelData[i] = Math.sin(2 * Math.PI * 440 * (i / sampleRate));
  }

  const mockBuffer = {
    numberOfChannels: 1,
    sampleRate,
    length: numFrames,
    duration: numFrames / sampleRate,
    getChannelData: (ch) => channelData,
  };

  const wavBlob = audioBufferToWav(mockBuffer);
  assert.ok(wavBlob);
  assert.equal(wavBlob.type, 'audio/wav');

  const arrayBuffer = await wavBlob.arrayBuffer();
  const view = new DataView(arrayBuffer);

  // Check 44-byte RIFF WAVE Header
  const readString = (offset, len) =>
    String.fromCharCode(...new Uint8Array(arrayBuffer, offset, len));

  assert.equal(readString(0, 4), 'RIFF');
  assert.equal(view.getUint32(4, true), arrayBuffer.byteLength - 8);
  assert.equal(readString(8, 4), 'WAVE');
  assert.equal(readString(12, 4), 'fmt ');
  assert.equal(view.getUint32(16, true), 16); // PCM chunk size
  assert.equal(view.getUint16(20, true), 1); // PCM format
  assert.equal(view.getUint16(22, true), 1); // Channels = 1
  assert.equal(view.getUint32(24, true), 44100); // Sample rate
  assert.equal(view.getUint32(28, true), 44100 * 2); // Byte rate
  assert.equal(view.getUint16(32, true), 2); // Block align
  assert.equal(view.getUint16(34, true), 16); // Bits per sample
  assert.equal(readString(36, 4), 'data');
  assert.equal(view.getUint32(40, true), numFrames * 2); // Data size
});

test('audioBufferToWav handles stereo channels properly', async () => {
  const sampleRate = 48000;
  const numFrames = 480;
  const left = new Float32Array(numFrames).fill(0.5);
  const right = new Float32Array(numFrames).fill(-0.5);

  const mockStereoBuffer = {
    numberOfChannels: 2,
    sampleRate,
    length: numFrames,
    duration: numFrames / sampleRate,
    getChannelData: (ch) => (ch === 0 ? left : right),
  };

  const wavBlob = audioBufferToWav(mockStereoBuffer);
  const arrayBuffer = await wavBlob.arrayBuffer();
  const view = new DataView(arrayBuffer);

  assert.equal(view.getUint16(22, true), 2); // 2 channels
  assert.equal(view.getUint32(24, true), 48000);
  assert.equal(view.getUint16(32, true), 4); // 2 channels * 2 bytes = 4
  assert.equal(view.getUint32(40, true), numFrames * 4); // data size
});
