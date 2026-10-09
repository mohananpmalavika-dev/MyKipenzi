import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMessageInvisibleInk,
  parseInvisibleInk,
  formatInvisibleInkMessage,
  getInvisibleInkPreviewText,
  FOG_THEMES,
  AUTO_CONCEAL_DURATIONS,
  ROMANTIC_SECRET_PROMPTS,
  playScratchChime,
  playFogWhoosh,
  playRevealTada,
  triggerScratchHaptics,
  triggerRevealHaptics,
} from '../src/invisibleInk.js';

test('isMessageInvisibleInk identifies invisible ink messages accurately', () => {
  assert.equal(isMessageInvisibleInk('🪄 [Invisible Ink 🌫️] നിന്നെ സ്നേഹിക്കുന്നു'), true);
  assert.equal(isMessageInvisibleInk('🌫️ [Invisible Ink · theme:mystic · hide:12s] Secret text'), true);
  assert.equal(isMessageInvisibleInk('[INVISIBLE_INK] Hidden romantic note'), true);
  assert.equal(isMessageInvisibleInk('🪄 [രഹസ്യ മഷി] ഒരു രഹസ്യം പറയട്ടെ'), true);
  assert.equal(isMessageInvisibleInk('🌫️ [മാജിക് ഫോഗ്] മൂടൽമഞ്ഞ് സന്ദേശം'), true);
  assert.equal(isMessageInvisibleInk('   🪄   [Invisible Ink] With leading space'), true);

  // Negative tests
  assert.equal(isMessageInvisibleInk('Just a normal message'), false);
  assert.equal(isMessageInvisibleInk('💓 [Heartbeat Pulse · 75 BPM] Love you'), false);
  assert.equal(isMessageInvisibleInk('🫂 [Virtual Touch] Gentle touch'), false);
  assert.equal(isMessageInvisibleInk(''), false);
  assert.equal(isMessageInvisibleInk(null), false);
  assert.equal(isMessageInvisibleInk(undefined), false);
});

test('parseInvisibleInk correctly extracts theme, countdown delay, content and photo flag', () => {
  const sample1 = '🪄 [Invisible Ink 🌫️ · theme:mystic · hide:12s] എന്റെ പ്രിയപ്പെട്ട കൂട്ടുകാരീ... 💖';
  const parsed1 = parseInvisibleInk(sample1);
  assert.equal(parsed1.isSecret, true);
  assert.equal(parsed1.theme, 'mystic');
  assert.equal(parsed1.concealDelay, 12);
  assert.equal(parsed1.content, 'എന്റെ പ്രിയപ്പെട്ട കൂട്ടുകാരീ... 💖');
  assert.equal(parsed1.isPhoto, false);

  const samplePhoto = '🪄 [Invisible Ink Photo 📷 🌫️ · theme:golden · hide:20s] നമ്മുടെ ആദ്യ യാത്രയിലെ ചിത്രം!';
  const parsedPhoto = parseInvisibleInk(samplePhoto);
  assert.equal(parsedPhoto.isSecret, true);
  assert.equal(parsedPhoto.theme, 'golden');
  assert.equal(parsedPhoto.concealDelay, 20);
  assert.equal(parsedPhoto.content, 'നമ്മുടെ ആദ്യ യാത്രയിലെ ചിത്രം!');
  assert.equal(parsedPhoto.isPhoto, true);

  // Fallbacks for default/missing metadata
  const sampleMinimal = '🪄 [Invisible Ink] ഒരു സർപ്രൈസ്!';
  const parsedMinimal = parseInvisibleInk(sampleMinimal);
  assert.equal(parsedMinimal.isSecret, true);
  assert.equal(parsedMinimal.theme, 'rose');
  assert.equal(parsedMinimal.concealDelay, 8);
  assert.equal(parsedMinimal.content, 'ഒരു സർപ്രൈസ്!');

  // Non-secret fallback
  const nonSecret = parseInvisibleInk('Normal text');
  assert.equal(nonSecret.isSecret, false);
  assert.equal(nonSecret.content, 'Normal text');
});

test('formatInvisibleInkMessage formats messages with chosen theme and conceal delay', () => {
  const formattedText = formatInvisibleInkMessage('നിന്നെ ഒരുപാട് ഇഷ്ടപ്പെടുന്നു ❤️', {
    theme: 'aurora',
    concealDelay: 15,
    isPhoto: false,
  });
  assert.ok(formattedText.includes('theme:aurora'));
  assert.ok(formattedText.includes('hide:15s'));
  assert.ok(formattedText.includes('നിന്നെ ഒരുപാട് ഇഷ്ടപ്പെടുന്നു ❤️'));
  assert.equal(isMessageInvisibleInk(formattedText), true);

  const formattedPhoto = formatInvisibleInkMessage('സ്പെഷ്യൽ ഫോട്ടോ', {
    theme: 'rose',
    concealDelay: 5,
    isPhoto: true,
  });
  assert.ok(formattedPhoto.includes('Photo'));
  assert.ok(formattedPhoto.includes('hide:5s'));
  assert.equal(isMessageInvisibleInk(formattedPhoto), true);
});

test('getInvisibleInkPreviewText conceals secret message content in conversation lists', () => {
  const secretText = '🪄 [Invisible Ink 🌫️] അതീവ രഹസ്യ പ്രണയലേഖനം!';
  const previewText = getInvisibleInkPreviewText(secretText);
  assert.ok(previewText.includes('രഹസ്യ സന്ദേശം'));
  assert.ok(!previewText.includes('അതീവ രഹസ്യ പ്രണയലേഖനം'));

  const secretPhoto = '🪄 [Invisible Ink Photo 📷 🌫️] ഞമ്മന്റെ ഫോട്ടോ';
  const previewPhoto = getInvisibleInkPreviewText(secretPhoto);
  assert.ok(previewPhoto.includes('രഹസ്യ ഫോട്ടോ'));
  assert.ok(!previewPhoto.includes('ഞമ്മന്റെ ഫോട്ടോ'));

  assert.equal(getInvisibleInkPreviewText('സാധാരണ ടെക്സ്റ്റ്'), 'സാധാരണ ടെക്സ്റ്റ്');
});

test('FOG_THEMES contains all 4 distinct themes with full attributes', () => {
  const themes = ['rose', 'mystic', 'golden', 'aurora'];
  for (const t of themes) {
    assert.ok(FOG_THEMES[t], `Theme ${t} should exist`);
    assert.ok(FOG_THEMES[t].name);
    assert.ok(FOG_THEMES[t].malayalamName);
    assert.ok(FOG_THEMES[t].emoji);
    assert.ok(Array.isArray(FOG_THEMES[t].fogColors));
    assert.ok(Array.isArray(FOG_THEMES[t].sparkleColors));
    assert.ok(FOG_THEMES[t].primaryColor);
  }
});

test('AUTO_CONCEAL_DURATIONS and ROMANTIC_SECRET_PROMPTS are properly populated', () => {
  assert.ok(AUTO_CONCEAL_DURATIONS.length >= 4);
  assert.ok(ROMANTIC_SECRET_PROMPTS.length >= 5);
  for (const p of ROMANTIC_SECRET_PROMPTS) {
    assert.ok(p.textMl);
    assert.ok(p.textEn);
  }
});

test('Web Audio API and Haptic synthesizers execute safely in Node without errors', () => {
  assert.doesNotThrow(() => {
    playScratchChime();
    playFogWhoosh();
    playRevealTada();
    triggerScratchHaptics();
    triggerRevealHaptics();
  });
});
