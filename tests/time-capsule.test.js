import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCapsuleCountdown,
  formatCapsuleUnlockDate,
  validateCapsuleInput,
  formatTimeCapsuleChatShare,
  parseTimeCapsuleChatShare,
  TIME_CAPSULE_OCCASIONS,
  TIME_CAPSULE_THEMES,
  SEAL_SYMBOLS,
} from '../shared/timeCapsule.js';

test('TIME_CAPSULE_OCCASIONS covers birthday, anniversary, valentines, and milestones with Malayalam labels', () => {
  assert.ok(TIME_CAPSULE_OCCASIONS.birthday);
  assert.ok(TIME_CAPSULE_OCCASIONS.birthday.labelMl.includes('ജന്മദിനം'));
  assert.ok(TIME_CAPSULE_OCCASIONS.anniversary);
  assert.ok(TIME_CAPSULE_OCCASIONS.anniversary.labelMl.includes('വാർഷികം'));
  assert.ok(TIME_CAPSULE_OCCASIONS.valentines);
  assert.ok(TIME_CAPSULE_OCCASIONS.custom);
});

test('TIME_CAPSULE_THEMES defines rose, vintage parchment, starlight, and lavender themes', () => {
  assert.ok(TIME_CAPSULE_THEMES.classic_rose);
  assert.ok(TIME_CAPSULE_THEMES.golden_parchment);
  assert.ok(TIME_CAPSULE_THEMES.starlight_midnight);
  assert.ok(TIME_CAPSULE_THEMES.lavender_sunset);
  assert.equal(typeof TIME_CAPSULE_THEMES.classic_rose.accentColor, 'string');
});

test('SEAL_SYMBOLS includes heart, ring, rose, and infinity symbols', () => {
  assert.equal(SEAL_SYMBOLS.heart.emoji, '❤️');
  assert.equal(SEAL_SYMBOLS.ring.emoji, '💍');
  assert.equal(SEAL_SYMBOLS.rose.emoji, '🌹');
  assert.equal(SEAL_SYMBOLS.infinity.emoji, '♾️');
});

test('calculateCapsuleCountdown correctly computes countdown for future and past dates', () => {
  const refDate = new Date('2026-10-09T10:00:00Z');

  // 2 days, 3 hours ahead
  const futureDate = new Date('2026-10-11T13:00:00Z');
  const futureCountdown = calculateCapsuleCountdown(futureDate, refDate);

  assert.equal(futureCountdown.isUnlocked, false);
  assert.equal(futureCountdown.days, 2);
  assert.equal(futureCountdown.hours, 3);
  assert.ok(futureCountdown.labelEn.includes('2d 3h'));
  assert.ok(futureCountdown.labelMl.includes('2 ദിവസവും 3 മണിക്കൂറും'));

  // Past date / zero time left
  const pastDate = new Date('2026-10-08T10:00:00Z');
  const pastCountdown = calculateCapsuleCountdown(pastDate, refDate);

  assert.equal(pastCountdown.isUnlocked, true);
  assert.equal(pastCountdown.totalSecondsRemaining, 0);
  assert.ok(pastCountdown.labelEn.includes('Unlocked'));
  assert.ok(pastCountdown.labelMl.includes('തുറന്നു'));
});

test('formatCapsuleUnlockDate formats bilingual dates accurately', () => {
  const dateStr = '2026-12-25T18:30:00Z';
  const result = formatCapsuleUnlockDate(dateStr);

  assert.ok(result.formattedEn);
  assert.ok(result.formattedMl.includes('2026'));
  assert.ok(result.formattedMl.includes('ഡിസംബർ'));
});

test('validateCapsuleInput validates required fields and enforces future unlock date', () => {
  const futureUnlock = new Date(Date.now() + 86400000).toISOString();

  // Valid input
  const valid = validateCapsuleInput({
    title: 'Happy 25th Birthday Honey',
    occasion: 'birthday',
    unlock_at: futureUnlock,
    theme: 'classic_rose',
    seal_symbol: 'heart',
    letter_text: 'I love you to the moon and back!',
  });

  assert.equal(valid.title, 'Happy 25th Birthday Honey');
  assert.equal(valid.occasion, 'birthday');
  assert.equal(valid.letter_text, 'I love you to the moon and back!');

  // Missing title throws error
  assert.throws(() => {
    validateCapsuleInput({
      title: '   ',
      unlock_at: futureUnlock,
      letter_text: 'Sweet note',
    });
  }, /sweet title/);

  // Past unlock time throws error
  assert.throws(() => {
    validateCapsuleInput({
      title: 'Birthday Note',
      unlock_at: '2020-01-01T00:00:00Z',
      letter_text: 'Too late',
    });
  }, /Unlock time must be in the future/);

  // Missing content (no letter, no audio, no photo) throws error
  assert.throws(() => {
    validateCapsuleInput({
      title: 'Empty Capsule',
      unlock_at: futureUnlock,
      letter_text: '   ',
    });
  }, /write a love letter or record a voice note/);
});

test('formatTimeCapsuleChatShare and parseTimeCapsuleChatShare serialize and deserialize correctly', () => {
  const capsule = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'For My Sweetheart on Valentine Day',
    occasion: 'valentines',
    unlock_at: '2027-02-14T00:00:00.000Z',
    theme: 'classic_rose',
    seal_symbol: 'rose',
    user_id: 'user-123',
    audio_url: 'data:audio/webm;base64,GkXf...',
  };

  const sender = { name: 'Rahul' };
  const sharedText = formatTimeCapsuleChatShare(capsule, sender);

  assert.ok(sharedText.startsWith('[TIME_CAPSULE:'));
  assert.ok(sharedText.endsWith(']'));

  const parsed = parseTimeCapsuleChatShare(sharedText);
  assert.ok(parsed);
  assert.equal(parsed.id, capsule.id);
  assert.equal(parsed.title, capsule.title);
  assert.equal(parsed.occasion, 'valentines');
  assert.equal(parsed.sender_name, 'Rahul');
  assert.equal(parsed.has_audio, true);
  assert.equal(parsed.theme, 'classic_rose');

  // Non-matching text returns null
  assert.equal(parseTimeCapsuleChatShare('Regular message'), null);
  assert.equal(parseTimeCapsuleChatShare('[TIME_CAPSULE:invalid json]'), null);
});
