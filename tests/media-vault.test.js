import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isVaultMedia,
  getMediaType,
  getPolaroidRotation,
  getPolaroidTape,
  formatPolaroidDate,
  calculateVaultStats,
  filterVaultItems,
  groupMemoriesByMonth,
  formatPolaroidShareCard,
  parsePolaroidShareCard,
  POLAROID_TAPES,
  POLAROID_STICKERS,
  SCRAPBOOK_THEMES,
} from '../shared/mediaVault.js';

test('isVaultMedia correctly qualifies photos and videos and rejects voice-notes and stickers', () => {
  // Valid photos
  assert.equal(isVaultMedia({ mime: 'image/jpeg', name: 'trip.jpg' }), true);
  assert.equal(isVaultMedia({ mime: 'image/png', name: 'our_smile.png' }), true);
  assert.equal(isVaultMedia({ mime: 'image/webp', name: 'sunset.webp' }), true);

  // Valid videos
  assert.equal(isVaultMedia({ mime: 'video/mp4', name: 'beach.mp4' }), true);
  assert.equal(isVaultMedia({ mime: 'video/quicktime', name: 'laugh.mov' }), true);

  // Rejects custom stickers
  assert.equal(isVaultMedia({ mime: 'image/webp', name: 'sticker-heart.webp' }), false);
  assert.equal(isVaultMedia({ mime: 'image/png', name: 'cat_sticker.png' }), false);

  // Rejects voice notes
  assert.equal(isVaultMedia({ mime: 'audio/webm', name: 'voice-note-1.webm' }), false);
  assert.equal(isVaultMedia({ mime: 'audio/mp3', name: 'voice.mp3' }), false);
  assert.equal(isVaultMedia({ mime: 'video/webm', name: 'voice-note-123.webm' }), false);

  // Rejects view_once media
  assert.equal(isVaultMedia({ mime: 'image/jpeg', name: 'secret.jpg', view_once: true }), false);

  // Rejects non-media documents
  assert.equal(isVaultMedia({ mime: 'application/pdf', name: 'doc.pdf' }), false);
  assert.equal(isVaultMedia(null), false);
  assert.equal(isVaultMedia({}), false);
});

test('getMediaType identifies photo vs video', () => {
  assert.equal(getMediaType({ mime: 'image/jpeg', name: 'pic.jpg' }), 'photo');
  assert.equal(getMediaType({ mime: 'video/mp4', name: 'vid.mp4' }), 'video');
  assert.equal(getMediaType({ mime: 'application/pdf', name: 'f.pdf' }), null);
});

test('getPolaroidRotation generates deterministic subtle tilt', () => {
  const rot1 = getPolaroidRotation('msg-123');
  const rot2 = getPolaroidRotation('msg-123');
  const rot3 = getPolaroidRotation('msg-456');

  assert.equal(rot1, rot2);
  assert.ok(typeof rot1 === 'number');
  assert.ok(typeof rot3 === 'number');
  assert.ok(rot1 >= -3.5 && rot1 <= 3.5);
  assert.ok(Math.abs(rot1) >= 0.4);
});

test('getPolaroidTape generates consistent tape from list', () => {
  const tape1 = getPolaroidTape('id-abc');
  const tape2 = getPolaroidTape('id-abc');
  assert.equal(tape1, tape2);
  assert.ok(POLAROID_TAPES.includes(tape1));
});

test('formatPolaroidDate formats Malayalam and English dates properly', () => {
  const sampleDate = new Date('2026-10-09T18:30:00Z');
  const mlFormat = formatPolaroidDate(sampleDate, 'ml');
  const enFormat = formatPolaroidDate(sampleDate, 'en');

  assert.ok(mlFormat.date.includes('2026'));
  assert.ok(mlFormat.date.includes('ഒക്ടോബർ'));
  assert.ok(mlFormat.time);

  assert.ok(enFormat.date.includes('2026'));
  assert.ok(enFormat.date.includes('Oct'));
  assert.ok(enFormat.time);

  assert.equal(formatPolaroidDate(null), '');
  assert.equal(formatPolaroidDate('invalid-date'), '');
});

test('calculateVaultStats computes photo, video, sender, and date breakdowns', () => {
  const messages = [
    {
      id: 'm1',
      created_at: '2026-09-01T10:00:00Z',
      sender_id: 'u1',
      attachment: { mime: 'image/jpeg', name: 'photo1.jpg' },
    },
    {
      id: 'm2',
      created_at: '2026-09-15T12:00:00Z',
      sender_id: 'u2',
      attachment: { mime: 'image/png', name: 'photo2.png' },
    },
    {
      id: 'm3',
      created_at: '2026-10-01T15:00:00Z',
      sender_id: 'u1',
      attachment: { mime: 'video/mp4', name: 'video1.mp4' },
    },
    {
      id: 'm4',
      created_at: '2026-10-02T16:00:00Z',
      sender_id: 'u1',
      attachment: { mime: 'image/png', name: 'sticker-fun.png' }, // should be ignored
    },
  ];

  const stats = calculateVaultStats(messages);
  assert.equal(stats.total, 3);
  assert.equal(stats.photos, 2);
  assert.equal(stats.videos, 1);
  assert.equal(stats.senders['u1'], 2);
  assert.equal(stats.senders['u2'], 1);
  assert.equal(new Date(stats.oldestDate).toISOString(), '2026-09-01T10:00:00.000Z');
  assert.equal(new Date(stats.newestDate).toISOString(), '2026-10-01T15:00:00.000Z');
});

test('filterVaultItems filters by type, sender, search query, and starred', () => {
  const items = [
    {
      id: '1',
      text: 'Munnar trip clouds',
      sender: { id: 'u1', name: 'Rahul' },
      attachment: { mime: 'image/jpeg', name: 'munnar.jpg' },
      starred: true,
    },
    {
      id: '2',
      text: 'Sunset at beach',
      sender: { id: 'u2', name: 'Ananya' },
      attachment: { mime: 'image/jpeg', name: 'sunset.jpg' },
      starred: false,
    },
    {
      id: '3',
      text: 'Driving video clip',
      sender: { id: 'u1', name: 'Rahul' },
      attachment: { mime: 'video/mp4', name: 'drive.mp4' },
      starred: true,
    },
  ];

  // Filter only videos
  const videos = filterVaultItems(items, { type: 'videos' });
  assert.equal(videos.length, 1);
  assert.equal(videos[0].id, '3');

  // Filter only photos
  const photos = filterVaultItems(items, { type: 'photos' });
  assert.equal(photos.length, 2);

  // Filter by sender
  const byAnanya = filterVaultItems(items, { senderId: 'u2' });
  assert.equal(byAnanya.length, 1);
  assert.equal(byAnanya[0].id, '2');

  // Filter by query (caption search)
  const queryResult = filterVaultItems(items, { query: 'clouds' });
  assert.equal(queryResult.length, 1);
  assert.equal(queryResult[0].id, '1');

  // Filter by query (filename search)
  const fileQueryResult = filterVaultItems(items, { query: 'drive' });
  assert.equal(fileQueryResult.length, 1);
  assert.equal(fileQueryResult[0].id, '3');

  // Filter by starred only
  const starredResult = filterVaultItems(items, { onlyStarred: true });
  assert.equal(starredResult.length, 2);
});

test('groupMemoriesByMonth groups items into chronological month sections', () => {
  const items = [
    {
      id: '1',
      created_at: '2026-10-05T10:00:00Z',
      attachment: { mime: 'image/jpeg', name: 'pic1.jpg' },
    },
    {
      id: '2',
      created_at: '2026-10-08T10:00:00Z',
      attachment: { mime: 'video/mp4', name: 'vid1.mp4' },
    },
    {
      id: '3',
      created_at: '2026-09-20T10:00:00Z',
      attachment: { mime: 'image/jpeg', name: 'pic2.jpg' },
    },
  ];

  const groups = groupMemoriesByMonth(items);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].key, '2026-10');
  assert.equal(groups[0].items.length, 2);
  assert.equal(groups[0].photosCount, 1);
  assert.equal(groups[0].videosCount, 1);
  assert.ok(groups[0].labelMl.includes('ഒക്ടോബർ'));

  assert.equal(groups[1].key, '2026-09');
  assert.equal(groups[1].items.length, 1);
});

test('formatPolaroidShareCard and parsePolaroidShareCard round-trip memory card sharing', () => {
  const item = {
    created_at: '2026-10-09T10:00:00Z',
    text: 'A gorgeous afternoon coffee together',
    attachment: { mime: 'image/jpeg', name: 'coffee.jpg' },
  };

  const sharedText = formatPolaroidShareCard(item, 'Rahul');
  assert.ok(sharedText.includes('പോളറോയ്ഡ് ഓർമ്മ'));
  assert.ok(sharedText.includes('coffee together'));

  const parsed = parsePolaroidShareCard(sharedText);
  assert.ok(parsed);
  assert.equal(parsed.isPolaroidShare, true);
  assert.equal(parsed.type, 'photo');
});

test('themes and stickers are provided with valid structures', () => {
  assert.ok(POLAROID_STICKERS.length >= 8);
  assert.ok(SCRAPBOOK_THEMES.length >= 3);
  for (const theme of SCRAPBOOK_THEMES) {
    assert.ok(theme.id);
    assert.ok(theme.labelMl);
    assert.ok(theme.bgClass);
  }
});
