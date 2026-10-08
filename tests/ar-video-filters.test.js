import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AR_FILTERS,
  FILTER_CATEGORIES,
  getFilterById,
  playFilterSoundEffect,
} from '../src/arVideoFilters.js';

test('AR Filters & Virtual Backgrounds catalog definitions', () => {
  assert.ok(Array.isArray(AR_FILTERS));
  assert.ok(AR_FILTERS.length >= 15);

  const categories = FILTER_CATEGORIES.map((c) => c.id);
  assert.ok(categories.includes('romantic'));
  assert.ok(categories.includes('fun'));
  assert.ok(categories.includes('background'));
  assert.ok(categories.includes('mood'));

  for (const filter of AR_FILTERS) {
    assert.ok(filter.id, 'Filter should have an id');
    assert.ok(filter.nameEn, `Filter ${filter.id} should have nameEn`);
    assert.ok(filter.nameMl, `Filter ${filter.id} should have nameMl`);
    assert.ok(filter.icon, `Filter ${filter.id} should have icon`);
    assert.ok(filter.type, `Filter ${filter.id} should have type`);
    assert.ok(filter.descriptionEn, `Filter ${filter.id} should have descriptionEn`);
    assert.ok(filter.descriptionMl, `Filter ${filter.id} should have descriptionMl`);
  }
});

test('getFilterById retrieves correct filter or fallback', () => {
  const halo = getFilterById('love-halo');
  assert.equal(halo.id, 'love-halo');
  assert.equal(halo.category, 'romantic');
  assert.equal(halo.type, 'ar_sticker');

  const blur = getFilterById('studio-blur');
  assert.equal(blur.id, 'studio-blur');
  assert.equal(blur.type, 'virtual_bg');

  const sunset = getFilterById('sunset-beach');
  assert.equal(sunset.id, 'sunset-beach');
  assert.equal(sunset.type, 'virtual_bg');

  const fallback = getFilterById('non-existent-filter');
  assert.equal(fallback.id, 'none');
});

test('playFilterSoundEffect executes safely in non-browser or muted environments', () => {
  // Should never throw when muted
  assert.doesNotThrow(() => {
    playFilterSoundEffect('heart-chime', true);
  });

  // Should never throw even if window/AudioContext is not present
  assert.doesNotThrow(() => {
    playFilterSoundEffect('cat-meow', false);
    playFilterSoundEffect('camera-shutter', false);
    playFilterSoundEffect('party-horn', false);
  });
});

test('AR Filters contain diverse romantic, fun, background, and mood options', () => {
  const romanticFilters = AR_FILTERS.filter((f) => f.category === 'romantic');
  assert.ok(romanticFilters.some((f) => f.id === 'love-halo'));
  assert.ok(romanticFilters.some((f) => f.id === 'rose-crown'));
  assert.ok(romanticFilters.some((f) => f.id === 'fairy-sparkles'));

  const funFilters = AR_FILTERS.filter((f) => f.category === 'fun');
  assert.ok(funFilters.some((f) => f.id === 'cute-kitten'));
  assert.ok(funFilters.some((f) => f.id === 'playful-puppy'));
  assert.ok(funFilters.some((f) => f.id === 'cool-shades'));
  assert.ok(funFilters.some((f) => f.id === 'party-carnival'));

  const backgrounds = AR_FILTERS.filter((f) => f.category === 'background');
  assert.ok(backgrounds.some((f) => f.id === 'studio-blur'));
  assert.ok(backgrounds.some((f) => f.id === 'sunset-beach'));
  assert.ok(backgrounds.some((f) => f.id === 'candlelight-dinner'));
  assert.ok(backgrounds.some((f) => f.id === 'starry-cosmos'));

  const moods = AR_FILTERS.filter((f) => f.category === 'mood');
  assert.ok(moods.some((f) => f.id === 'golden-hour'));
  assert.ok(moods.some((f) => f.id === 'vintage-film'));
  assert.ok(moods.some((f) => f.id === 'cyber-neon'));
});
