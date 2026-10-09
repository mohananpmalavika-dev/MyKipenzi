import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOVE_COUPON_PRESETS,
  BUCKET_LIST_PRESETS,
  BUCKET_LIST_CATEGORIES,
  DATE_NIGHT_IDEAS,
  DATE_NIGHT_CATEGORIES,
  formatCouponRedeemedShare,
  formatBucketCompletedShare,
  formatDateWheelPickShare,
} from '../shared/romanticSurprises.js';
import {
  playScratchSound,
  playWheelTickSound,
  playRomanticCelebrationChime,
} from '../src/romanticAudio.js';

test('Love Coupon presets contain requested romantic vouchers in Malayalam & English', () => {
  assert.ok(Array.isArray(LOVE_COUPON_PRESETS));
  assert.ok(LOVE_COUPON_PRESETS.length >= 4);

  const titles = LOVE_COUPON_PRESETS.map((p) => p.title);
  const titlesMl = LOVE_COUPON_PRESETS.map((p) => p.titleMl);

  // Verify specified user requirements:
  assert.ok(titles.some((t) => t.includes('Free Head Massage')));
  assert.ok(titles.some((t) => t.includes('Cook your favorite dinner')));
  assert.ok(titles.some((t) => t.includes('10-Minute Virtual Hug')));
  assert.ok(titles.some((t) => t.includes('One Wish Granted')));

  // Verify Malayalam translations:
  assert.ok(titlesMl.some((t) => t.includes('തല മസ്സാജ്')));
  assert.ok(titlesMl.some((t) => t.includes('ഡിന്നർ')));
  assert.ok(titlesMl.some((t) => t.includes('ഹഗ്ഗ്')));
  assert.ok(titlesMl.some((t) => t.includes('ആഗ്രഹവും')));
});

test('Couple Bucket List presets contain Munnar, kitten adoption & midnight beach dreams', () => {
  assert.ok(Array.isArray(BUCKET_LIST_PRESETS));
  assert.ok(BUCKET_LIST_PRESETS.length >= 3);

  const titles = BUCKET_LIST_PRESETS.map((b) => b.title);
  const titlesEn = BUCKET_LIST_PRESETS.map((b) => b.titleEn);

  assert.ok(titles.some((t) => t.includes('മുന്നാറിൽ')));
  assert.ok(titles.some((t) => t.includes('പൂച്ചക്കുട്ടിയെ')));
  assert.ok(titles.some((t) => t.includes('അർദ്ധരാത്രി ബീച്ചിൽ')));

  assert.ok(titlesEn.some((t) => t.includes('Munnar')));
  assert.ok(titlesEn.some((t) => t.includes('kitten')));
  assert.ok(titlesEn.some((t) => t.includes('beach')));

  // Category list includes all requested domains
  assert.ok(BUCKET_LIST_CATEGORIES.some((c) => c.id === 'travel'));
  assert.ok(BUCKET_LIST_CATEGORIES.some((c) => c.id === 'romantic'));
  assert.ok(BUCKET_LIST_CATEGORIES.some((c) => c.id === 'cozy'));
});

test('Date Night Idea Generator presets cover In-house & Outdoor dates with Malayalam context', () => {
  assert.ok(Array.isArray(DATE_NIGHT_IDEAS));
  assert.ok(DATE_NIGHT_IDEAS.length >= 6);

  const inHouse = DATE_NIGHT_IDEAS.filter((d) => d.category === 'in_house');
  const outdoor = DATE_NIGHT_IDEAS.filter((d) => d.category === 'outdoor');

  assert.ok(inHouse.length >= 2, 'Should include at least 2 in-house date night ideas');
  assert.ok(outdoor.length >= 2, 'Should include at least 2 outdoor date night ideas');

  assert.ok(DATE_NIGHT_CATEGORIES.some((c) => c.id === 'all'));
  assert.ok(DATE_NIGHT_CATEGORIES.some((c) => c.id === 'in_house'));
  assert.ok(DATE_NIGHT_CATEGORIES.some((c) => c.id === 'outdoor'));
});

test('Chat message formatters produce rich, romantic cards for chat sharing', () => {
  const coupon = {
    title: 'Free Head Massage 💆‍♂️',
    emoji: '💆‍♂️',
  };
  const couponShare = formatCouponRedeemedShare(coupon, 'Dhanya');
  assert.ok(couponShare.includes('Love Coupon Redeemed'));
  assert.ok(couponShare.includes('Free Head Massage'));
  assert.ok(couponShare.includes('Dhanya'));

  const bucketItem = {
    title: 'മുന്നാറിൽ ഒരുമിച്ച് മഞ്ഞുകാലത്ത് യാത്ര പോവുക 🏔️',
    emoji: '🏔️',
    completion_note: 'മഞ്ഞും തണുപ്പും ചായയും! 💖',
  };
  const bucketShare = formatBucketCompletedShare(bucketItem, 'Malavika', '2026-10-09');
  assert.ok(bucketShare.includes('Bucket List Milestone Completed'));
  assert.ok(bucketShare.includes('മുന്നാറിൽ'));
  assert.ok(bucketShare.includes('Malavika'));
  assert.ok(bucketShare.includes('2026-10-09'));

  const dateIdea = {
    titleMl: 'ലിവിംഗ് റൂം ബ്ലാങ്കറ്റ് ഫോർട്ട് & മൂവി നൈറ്റ് 🍿',
    emoji: '🏕️',
    descMl: 'തലയിണകളും ബ്ലാങ്കറ്റുകളും ഫെയറി ലൈറ്റുകളും!',
  };
  const wheelShare = formatDateWheelPickShare(dateIdea, 'Dhanya');
  assert.ok(wheelShare.includes("Date Night Pick"));
  assert.ok(wheelShare.includes('ലിവിംഗ് റൂം'));
  assert.ok(wheelShare.includes('Dhanya'));
});

test('Romantic Audio synthesizers execute safely in Node/mock environment without throwing', () => {
  assert.doesNotThrow(() => playScratchSound());
  assert.doesNotThrow(() => playWheelTickSound());
  assert.doesNotThrow(() => playRomanticCelebrationChime());
});
