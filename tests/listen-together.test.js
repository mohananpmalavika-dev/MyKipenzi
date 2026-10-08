import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURATED_TRACKS,
  MUSIC_REACTIONS,
  formatTime,
  formatSharedMusicMessage,
  parseSharedMusicMessage,
  calculateSyncDrift,
  MusicPlaybackEngine,
} from '../src/musicEngine.js';

test('curated tracks contain 6 high-quality tracks with Malayalam and English titles', () => {
  assert.equal(CURATED_TRACKS.length, 6);

  for (const track of CURATED_TRACKS) {
    assert.ok(track.id, 'Track must have an id');
    assert.ok(track.titleMl, 'Track must have Malayalam title');
    assert.ok(track.titleEn, 'Track must have English title');
    assert.ok(track.bpm > 0, 'Track must have positive BPM');
    assert.ok(track.duration > 0, 'Track must have positive duration');
    assert.ok(track.quoteMl, 'Track must have Malayalam couple quote');
    assert.ok(track.progression?.length > 0, 'Track must have musical progression');
  }

  const ids = CURATED_TRACKS.map((t) => t.id);
  assert.ok(ids.includes('rainy-lofi'));
  assert.ok(ids.includes('moonlight-acoustic'));
  assert.ok(ids.includes('starry-piano'));
});

test('formatTime formats seconds into MM:SS correctly', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(45), '0:45');
  assert.equal(formatTime(60), '1:00');
  assert.equal(formatTime(125), '2:05');
  assert.equal(formatTime(180), '3:00');
  assert.equal(formatTime(-5), '0:00');
  assert.equal(formatTime(null), '0:00');
  assert.equal(formatTime(NaN), '0:00');
});

test('formatSharedMusicMessage and parseSharedMusicMessage serialize and parse correctly', () => {
  const track = CURATED_TRACKS[0];
  const formatted = formatSharedMusicMessage(track, 'ജനലരികിൽ മഴ പെയ്യുമ്പോൾ ☕🌧️');

  assert.ok(formatted.startsWith('🎧 [Listen Together · '));
  assert.ok(formatted.includes(track.titleMl));
  assert.ok(formatted.includes(track.titleEn));

  const parsed = parseSharedMusicMessage(formatted);
  assert.ok(parsed);
  assert.equal(parsed.titleMl, track.titleMl);
  assert.equal(parsed.titleEn, track.titleEn);
  assert.equal(parsed.note, 'ജനലരികിൽ മഴ പെയ്യുമ്പോൾ ☕🌧️');
});

test('parseSharedMusicMessage handles message without note or with extra whitespace', () => {
  const track = CURATED_TRACKS[1];
  const formatted = formatSharedMusicMessage(track);
  const parsed = parseSharedMusicMessage(formatted);

  assert.ok(parsed);
  assert.equal(parsed.titleMl, track.titleMl);
  assert.equal(parsed.titleEn, track.titleEn);
  assert.equal(parsed.note, '');

  assert.equal(parseSharedMusicMessage('Regular chat text'), null);
});

test('calculateSyncDrift computes latency drift and detects desynchronization', () => {
  const now = Date.now();

  // Perfect sync (0 drift)
  const syncResult = calculateSyncDrift(10.0, 10.0, now);
  assert.ok(syncResult.drift < 0.1);
  assert.equal(syncResult.shouldSeek, false);

  // Small latency (e.g. 100ms) with matching position
  const smallLatency = calculateSyncDrift(10.1, 10.0, now - 100);
  assert.ok(smallLatency.drift < 0.1);
  assert.equal(smallLatency.shouldSeek, false);

  // Noticeable desync (> 0.5s drift)
  const desync = calculateSyncDrift(5.0, 15.0, now);
  assert.ok(desync.drift > 9.0);
  assert.equal(desync.shouldSeek, true);
});

test('music reactions list contains romantic and mood emojis', () => {
  assert.ok(MUSIC_REACTIONS.length >= 6);
  const emojis = MUSIC_REACTIONS.map((r) => r.emoji);
  assert.ok(emojis.includes('🎵'));
  assert.ok(emojis.includes('💖'));
  assert.ok(emojis.includes('✨'));
});

test('MusicPlaybackEngine executes safely in non-browser environment without throwing', () => {
  const engine = new MusicPlaybackEngine();
  assert.equal(engine.isPlaying, false);

  assert.doesNotThrow(() => engine.setVolume(0.8));
  assert.equal(engine.volume, 0.8);

  // Play, pause, seek should execute safely
  assert.doesNotThrow(() => engine.playTrack('rainy-lofi', 10));
  assert.doesNotThrow(() => engine.pauseTrack());
  assert.doesNotThrow(() => engine.seekTrack(30));
  assert.doesNotThrow(() => engine.destroy());
});
