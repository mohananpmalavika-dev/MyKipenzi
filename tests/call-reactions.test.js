import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CALL_REACTIONS,
  getReactionConfig,
  generateReactionParticles,
  formatReactionNotice,
  playCallReactionSound,
  triggerCallReactionVibration,
} from '../src/callReactions.js';

test('CALL_REACTIONS contains hearts, roses, and romantic reactions with Malayalam translations', () => {
  assert.ok(CALL_REACTIONS.length >= 7, 'Should have multiple reaction options');

  // Verify Hearts configuration
  const heartConfig = getReactionConfig('heart');
  assert.equal(heartConfig.id, 'heart');
  assert.equal(heartConfig.emoji, '❤️');
  assert.equal(heartConfig.labelMl, 'ഹാർട്ടുകൾ');
  assert.ok(heartConfig.items.includes('❤️'));
  assert.ok(heartConfig.items.includes('💖'));

  // Verify Roses configuration
  const roseConfig = getReactionConfig('rose');
  assert.equal(roseConfig.id, 'rose');
  assert.equal(roseConfig.emoji, '🌹');
  assert.equal(roseConfig.labelMl, 'റോസാപ്പൂക്കൾ');
  assert.ok(roseConfig.items.includes('🌹'));
  assert.ok(roseConfig.items.includes('🌸'));
  assert.ok(roseConfig.badgeMl.includes('റോസ്'));

  // Verify Kisses configuration
  const kissConfig = getReactionConfig('kiss');
  assert.equal(kissConfig.id, 'kiss');
  assert.equal(kissConfig.labelMl, 'ചുംബനങ്ങൾ');
  assert.ok(kissConfig.items.includes('💋'));

  // Verify Love pulse
  const pulseConfig = getReactionConfig('love_pulse');
  assert.ok(pulseConfig.labelMl.includes('സ്പന്ദനം'));
});

test('getReactionConfig falls back to default heart config when given unknown id', () => {
  const fallback = getReactionConfig('unknown_random_id');
  assert.equal(fallback.id, 'heart');
});

test('generateReactionParticles generates correct count and valid physics properties', () => {
  const particles = generateReactionParticles('rose', 12);
  assert.equal(particles.length, 12);

  for (const p of particles) {
    assert.ok(p.id.startsWith('p_'));
    assert.equal(p.type, 'rose');
    assert.ok(typeof p.char === 'string' && p.char.length > 0);
    assert.ok(p.left.endsWith('%'));
    assert.ok(p.size.endsWith('px'));
    assert.ok(p.duration.endsWith('s'));
    assert.ok(p.driftX.endsWith('px'));
    assert.ok(p.midDriftX.endsWith('px'));
    assert.ok(p.rotation.endsWith('deg'));
    assert.ok(p.endRotation.endsWith('deg'));
    assert.ok(Number(p.scale) > 0);
  }

  // Verify that rose emoji items trigger isRose flag
  const roseSpecificParticles = generateReactionParticles('rose', 30);
  const hasRoseFlag = roseSpecificParticles.some((p) => p.isRose);
  assert.ok(hasRoseFlag, 'Should flag rose emoji particles');
});

test('generateReactionParticles respects custom originX and originY tap coordinates', () => {
  const originX = 65; // tapped at 65% width
  const originY = 40; // tapped at 40% height
  const particles = generateReactionParticles('heart', 8, originX, originY);

  assert.equal(particles.length, 8);
  for (const p of particles) {
    assert.equal(p.bottom, '40%');
    const leftVal = parseFloat(p.left);
    // Should be clustered around 65% with random spread (e.g. within 35% - 95%)
    assert.ok(leftVal >= 40 && leftVal <= 90, `Particle left ${leftVal} should be near originX ${originX}`);
  }
});

test('formatReactionNotice formats Malayalam and English reaction notices with combos', () => {
  // English single
  const enSingle = formatReactionNotice('Dhanya', 'rose', 1, false);
  assert.equal(enSingle, 'Dhanya sent Roses! 🌹');

  // English combo
  const enCombo = formatReactionNotice('Dhanya', 'rose', 5, false);
  assert.equal(enCombo, 'Dhanya sent Rose Garden 🌹! (x5)');

  // Malayalam single
  const mlSingle = formatReactionNotice('മാളവിക', 'heart', 1, true);
  assert.equal(mlSingle, 'മാളവിക ഹാർട്ടുകൾ അയച്ചു! ❤️');

  // Malayalam combo
  const mlCombo = formatReactionNotice('മാളവിക', 'rose', 3, true);
  assert.equal(mlCombo, 'മാളവിക റോസ് ഗാർഡൻ 🌹 അയച്ചു! (x3)');

  // Default fallback when senderName is empty
  const anonymousMl = formatReactionNotice('', 'heart', 1, true);
  assert.ok(anonymousMl.includes('പ്രിയപ്പെട്ടയാൾ'));
});

test('playCallReactionSound and triggerCallReactionVibration execute safely in Node environment', () => {
  // Does not throw in non-browser Node environment
  assert.doesNotThrow(() => {
    playCallReactionSound('heart', false);
    playCallReactionSound('rose', false);
    playCallReactionSound('kiss', false);
    playCallReactionSound('fire', false);
    playCallReactionSound('heart', true); // muted
    triggerCallReactionVibration('heart');
    triggerCallReactionVibration('rose');
    triggerCallReactionVibration('kiss');
  });
});
