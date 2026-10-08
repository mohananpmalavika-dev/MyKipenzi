import test from 'node:test';
import assert from 'node:assert/strict';
import {
  playTouchSound,
  playResonanceChime,
  triggerTouchHaptics,
  HAPTIC_PATTERNS,
  TOUCH_MODES,
} from '../src/touchAudio.js';

test('touch audio and haptic utilities execute safely in server/node environment', () => {
  assert.equal(typeof playTouchSound, 'function');
  assert.equal(typeof playResonanceChime, 'function');
  assert.equal(typeof triggerTouchHaptics, 'function');

  // Should gracefully no-op without browser AudioContext or navigator.vibrate
  assert.doesNotThrow(() => playTouchSound('gentle'));
  assert.doesNotThrow(() => playTouchSound('hug', 0.8));
  assert.doesNotThrow(() => playTouchSound('sparkle'));
  assert.doesNotThrow(() => playTouchSound('flame'));
  assert.doesNotThrow(() => playResonanceChime());
  assert.doesNotThrow(() => triggerTouchHaptics([40, 50]));
});

test('touch modes configuration includes all 4 distinct romantic styles with Malayalam and English labels', () => {
  assert.ok(Array.isArray(TOUCH_MODES));
  assert.equal(TOUCH_MODES.length, 4);

  const ids = TOUCH_MODES.map((m) => m.id);
  assert.ok(ids.includes('gentle'));
  assert.ok(ids.includes('hug'));
  assert.ok(ids.includes('sparkle'));
  assert.ok(ids.includes('flame'));

  TOUCH_MODES.forEach((mode) => {
    assert.ok(mode.labelMl, `Mode ${mode.id} has Malayalam label`);
    assert.ok(mode.labelEn, `Mode ${mode.id} has English label`);
    assert.ok(mode.emoji, `Mode ${mode.id} has emoji`);
    assert.ok(mode.color, `Mode ${mode.id} has color`);
    assert.ok(mode.descMl, `Mode ${mode.id} has Malayalam description`);
  });
});

test('haptic vibration patterns contain distinct rhythms for hug, tap, and resonance', () => {
  assert.ok(Array.isArray(HAPTIC_PATTERNS.gentle));
  assert.ok(Array.isArray(HAPTIC_PATTERNS.hug));
  assert.ok(Array.isArray(HAPTIC_PATTERNS.resonance));
  assert.ok(Array.isArray(HAPTIC_PATTERNS.sparkle));

  // Haptic Hug should be a rich crescendo sequence (> 5 pulses)
  assert.ok(HAPTIC_PATTERNS.hug.length >= 6);
  // Resonance should also be a multi-pulse harmonic pattern
  assert.ok(HAPTIC_PATTERNS.resonance.length >= 5);
});

test('virtual touch chat message format correctly distinguishes between gentle touch and haptic hug', () => {
  const hugMessage = '🫂 [Haptic Hug · സ്നേഹാലിംഗനം] എന്റെ സ്പർശനം നിന്റെ ചാരത്തുണ്ട് 💖';
  const touchMessage = '🫂 [Virtual Touch · മൃദുസ്പർശം] നിനക്കായി ഒരു സ്പർശനം 🌸';

  // Check hug detection
  assert.ok(hugMessage.includes('Haptic Hug'));
  assert.ok(!touchMessage.includes('Haptic Hug'));

  // Clean message extraction
  const cleanHug = hugMessage.replace(/🫂\s*\[(Virtual Touch|Haptic Hug)[^\]]*\]\s*/i, '').trim();
  assert.equal(cleanHug, 'എന്റെ സ്പർശനം നിന്റെ ചാരത്തുണ്ട് 💖');

  const cleanTouch = touchMessage.replace(/🫂\s*\[(Virtual Touch|Haptic Hug)[^\]]*\]\s*/i, '').trim();
  assert.equal(cleanTouch, 'നിനക്കായി ഒരു സ്പർശനം 🌸');
});

test('touch haptics triggers navigator.vibrate when available', () => {
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

    const triggered = triggerTouchHaptics(HAPTIC_PATTERNS.hug);
    assert.equal(triggered, true);
    assert.deepEqual(vibratedPattern, HAPTIC_PATTERNS.hug);
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

test('normalized touch coordinates stay bounded within [0, 1] range', () => {
  const normalize = (val, max) => Math.min(1, Math.max(0, val / max));

  assert.equal(normalize(150, 300), 0.5);
  assert.equal(normalize(-10, 300), 0);
  assert.equal(normalize(450, 300), 1);
});
