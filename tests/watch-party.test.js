import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_VIDEOS,
  VIDEO_REACTIONS,
  QUICK_WATCH_COMMENTS,
  extractYouTubeId,
  getYouTubeThumbnail,
  formatTime,
  calculateVideoDrift,
  formatSharedWatchPartyMessage,
  parseSharedWatchPartyMessage,
} from '../src/videoEngine.js';

test('extractYouTubeId extracts IDs from varied YouTube URL formats and raw IDs', () => {
  const cases = [
    { input: '0G2VxhV_gXM', expected: '0G2VxhV_gXM' },
    { input: 'https://www.youtube.com/watch?v=0G2VxhV_gXM', expected: '0G2VxhV_gXM' },
    { input: 'http://youtube.com/watch?v=2e_dsvA439E&t=30s', expected: '2e_dsvA439E' },
    { input: 'https://youtu.be/_BqP3b_9y0Y', expected: '_BqP3b_9y0Y' },
    { input: 'https://www.youtube.com/embed/gUj4bS_lX1E', expected: 'gUj4bS_lX1E' },
    { input: 'https://www.youtube.com/shorts/jfKfPfyJRdk', expected: 'jfKfPfyJRdk' },
  ];

  for (const c of cases) {
    assert.equal(extractYouTubeId(c.input), c.expected, `Failed on: ${c.input}`);
  }

  assert.equal(extractYouTubeId('https://example.com/video.mp4'), null);
  assert.equal(extractYouTubeId(''), null);
  assert.equal(extractYouTubeId(null), null);
});

test('getYouTubeThumbnail produces valid image URL', () => {
  assert.equal(
    getYouTubeThumbnail('0G2VxhV_gXM'),
    'https://img.youtube.com/vi/0G2VxhV_gXM/hqdefault.jpg'
  );
  assert.equal(getYouTubeThumbnail(''), '');
});

test('formatTime formats seconds properly for MM:SS and HH:MM:SS', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(5), '0:05');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(3600), '1:00:00');
  assert.equal(formatTime(3665), '1:01:05');
  assert.equal(formatTime(-10), '0:00');
});

test('calculateVideoDrift calculates latency drift and marks threshold seeks', () => {
  const now = Date.now();
  // Case 1: In sync within 0.1s
  const syncResult = calculateVideoDrift(10.0, 9.95, now, 0.45);
  assert.equal(syncResult.shouldSeek, false);

  // Case 2: Out of sync beyond 0.45s threshold
  const driftResult = calculateVideoDrift(10.0, 14.5, now, 0.45);
  assert.equal(driftResult.shouldSeek, true);
  assert.ok(driftResult.drift > 4.0);
});

test('formatSharedWatchPartyMessage and parseSharedWatchPartyMessage round-trip correctly', () => {
  const video = {
    titleMl: 'മലരേ നിന്നെ കാണാതിരുന്നാൽ',
    titleEn: 'Malare Ninne',
    youtubeId: '0G2VxhV_gXM',
  };
  const note = 'ഈ രംഗം ഓർമ്മയുണ്ടോ? 💕';
  const formatted = formatSharedWatchPartyMessage(video, note);
  assert.ok(formatted.startsWith('🎬 [Watch Party ·'));

  const parsed = parseSharedWatchPartyMessage(formatted);
  assert.ok(parsed);
  assert.equal(parsed.titleMl, 'മലരേ നിന്നെ കാണാതിരുന്നാൽ');
  assert.equal(parsed.titleEn, 'Malare Ninne');
  assert.equal(parsed.youtubeId, '0G2VxhV_gXM');
  assert.equal(parsed.note, 'ഈ രംഗം ഓർമ്മയുണ്ടോ? 💕');
});

test('curated videos and reactions bank are configured with titles and categories', () => {
  assert.ok(CURATED_VIDEOS.length >= 5);
  for (const v of CURATED_VIDEOS) {
    assert.ok(v.titleMl);
    assert.ok(v.titleEn);
    assert.ok(v.youtubeId);
    assert.ok(v.thumbnail);
    assert.ok(v.durationSec > 0);
  }

  assert.ok(VIDEO_REACTIONS.length >= 6);
  assert.ok(QUICK_WATCH_COMMENTS.length >= 4);
});
