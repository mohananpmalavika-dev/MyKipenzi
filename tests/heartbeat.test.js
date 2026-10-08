import test from 'node:test';
import assert from 'node:assert/strict';
import { playHeartbeatSound, playSyncChime, triggerHeartbeatHaptics } from '../src/heartbeatAudio.js';

test('heartbeat audio and haptic utilities execute safely in all environments', () => {
  assert.equal(typeof playHeartbeatSound, 'function');
  assert.equal(typeof playSyncChime, 'function');
  assert.equal(typeof triggerHeartbeatHaptics, 'function');

  // Should gracefully no-op without browser AudioContext or navigator.vibrate
  assert.doesNotThrow(() => playHeartbeatSound());
  assert.doesNotThrow(() => playHeartbeatSound(0.8));
  assert.doesNotThrow(() => playSyncChime());
  assert.doesNotThrow(() => triggerHeartbeatHaptics([60, 70, 80]));
});

test('heartbeat message parsing extracts BPM and clean Malayalam and English text', () => {
  const sample = '💓 [Heartbeat Pulse · 84 BPM] എന്റെ ഓരോ തുടിപ്പും നിനക്കായി 💓';
  const bpmMatch = sample.match(/\[Heartbeat Pulse · (\d+)\s*BPM\]/i);
  assert.ok(bpmMatch);
  assert.equal(parseInt(bpmMatch[1], 10), 84);

  const clean = sample.replace(/💓\s*\[Heartbeat Pulse · \d+\s*BPM\]\s*/i, '').trim();
  assert.equal(clean, 'എന്റെ ഓരോ തുടിപ്പും നിനക്കായി 💓');
});

test('heartbeat vibration pattern mimics human cardiac lub-dub cycle', () => {
  let vibratedPattern = null;
  const originalVibrate = globalThis.navigator?.vibrate;

  try {
    Object.defineProperty(globalThis.navigator, 'vibrate', {
      value: (pattern) => {
        vibratedPattern = pattern;
        return true;
      },
      configurable: true,
      writable: true,
    });

    triggerHeartbeatHaptics([60, 60, 80, 180]);
    assert.deepEqual(vibratedPattern, [60, 60, 80, 180]);
  } finally {
    if (originalVibrate) {
      Object.defineProperty(globalThis.navigator, 'vibrate', {
        value: originalVibrate,
        configurable: true,
        writable: true,
      });
    } else {
      delete globalThis.navigator.vibrate;
    }
  }
});
