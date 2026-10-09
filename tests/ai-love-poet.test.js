import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOVE_POET_TONES,
  QUICK_SPARKS,
  generateLoveText,
} from '../shared/aiLovePoet.js';

test('LOVE_POET_TONES contains all 7 key emotional tones with Malayalam and English descriptors', () => {
  assert.ok(LOVE_POET_TONES.length >= 7);
  const toneIds = LOVE_POET_TONES.map((t) => t.id);
  assert.ok(toneIds.includes('romantic_deep'));
  assert.ok(toneIds.includes('apology'));
  assert.ok(toneIds.includes('kavitha'));
  assert.ok(toneIds.includes('playful'));
  assert.ok(toneIds.includes('comfort'));
  assert.ok(toneIds.includes('goodnight'));
  assert.ok(toneIds.includes('goodmorning'));

  for (const tone of LOVE_POET_TONES) {
    assert.ok(tone.labelEn);
    assert.ok(tone.labelMl);
    assert.ok(tone.icon);
    assert.ok(tone.description);
  }
});

test('QUICK_SPARKS provides ready inspiration prompts', () => {
  assert.ok(QUICK_SPARKS.length >= 5);
  for (const spark of QUICK_SPARKS) {
    assert.ok(spark.label);
    assert.ok(spark.text);
  }
});

test('generateLoveText produces Malayalam, Manglish, and English poetic text', () => {
  const mlText = generateLoveText({
    tone: 'romantic_deep',
    language: 'ml',
    partnerName: 'Arjun',
  });
  assert.ok(mlText);
  assert.ok(mlText.includes('Arjun') || mlText.includes('സ്നേഹ') || mlText.includes('ഓർമ്മകൾ'));

  const manglishText = generateLoveText({
    tone: 'apology',
    language: 'manglish',
    partnerName: 'Priya',
  });
  assert.ok(manglishText);
  assert.ok(manglishText.includes('Priya') || manglishText.includes('kshamikk') || manglishText.includes('sorry'));

  const enText = generateLoveText({
    tone: 'kavitha',
    language: 'en',
    partnerName: 'Sarah',
  });
  assert.ok(enText);
  assert.ok(enText.length > 20);
});

test('generateLoveText seamlessly incorporates user prompt', () => {
  const customPrompt = 'ഇന്നലെ ദേഷ്യപ്പെട്ടതിൽ സോറി';
  const result = generateLoveText({
    tone: 'apology',
    language: 'ml',
    prompt: customPrompt,
    partnerName: 'Ammu',
  });
  assert.ok(result.includes(customPrompt));
});

test('generateLoveText respects short style length truncation', () => {
  const fullLetter = generateLoveText({
    tone: 'romantic_deep',
    language: 'en',
    style: 'letter',
  });

  const shortNote = generateLoveText({
    tone: 'romantic_deep',
    language: 'en',
    style: 'short',
  });

  assert.ok(shortNote.length <= fullLetter.length);
});
