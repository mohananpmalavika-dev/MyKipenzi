import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SLEEP_SOUNDSCAPES,
  formatRemainingTime,
} from '../src/sleepAudio.js';

test('Sleep Together Soundscapes configuration', () => {
  assert.equal(Array.isArray(SLEEP_SOUNDSCAPES), true);
  assert.ok(SLEEP_SOUNDSCAPES.length >= 5);

  const ids = SLEEP_SOUNDSCAPES.map((s) => s.id);
  assert.ok(ids.includes('rain'), 'Should include rain soundscape');
  assert.ok(ids.includes('ocean'), 'Should include ocean waves soundscape');
  assert.ok(ids.includes('lullaby'), 'Should include lullaby soundscape');
  assert.ok(ids.includes('forest'), 'Should include forest soundscape');
  assert.ok(ids.includes('fireplace'), 'Should include fireplace soundscape');

  for (const s of SLEEP_SOUNDSCAPES) {
    assert.ok(s.titleMl, `Soundscape ${s.id} should have Malayalam title`);
    assert.ok(s.titleEn, `Soundscape ${s.id} should have English title`);
    assert.ok(s.emoji, `Soundscape ${s.id} should have emoji`);
    assert.ok(s.descriptionMl, `Soundscape ${s.id} should have Malayalam description`);
  }
});

test('formatRemainingTime utility', () => {
  assert.equal(formatRemainingTime(0), '00:00');
  assert.equal(formatRemainingTime(59), '00:59');
  assert.equal(formatRemainingTime(60), '01:00');
  assert.equal(formatRemainingTime(125), '02:05');
  assert.equal(formatRemainingTime(1800), '30:00');
  assert.equal(formatRemainingTime(-5), '00:00');
});
