import test from 'node:test';
import assert from 'node:assert/strict';
import { addStickerToLibrary, clampStickerPan, coverImage, loadStickerLibrary, persistStickerLibrary, stickerLibraryKey, validateStickerFile, wrapCaption } from '../src/stickerTools.js';
const png = 'data:image/png;base64,aGVsbG8=';
const storage = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; };
test('wide and tall photos cover the sticker without blank bands at any crop edge', () => {
  for (const [width, height] of [[1600, 300], [300, 1600], [800, 800]]) {
    for (const pan of [{ x: 0, y: 0 }, { x: 9999, y: -9999 }]) {
      const crop = coverImage(width, height, 512, 1.5, pan);
      assert.ok(crop.x <= 0 && crop.y <= 0);
      assert.ok(crop.x + crop.width >= 512 && crop.y + crop.height >= 512);
      assert.equal(crop.width / crop.height, width / height);
    }
  }
});
test('only bounded, supported local images are accepted', () => {
  for (const type of ['image/jpeg','image/png','image/webp','image/gif']) assert.doesNotThrow(() => validateStickerFile({ type, size: 1024 }));
  assert.throws(() => validateStickerFile({ type: 'image/svg+xml', size: 1 }), /Choose/);
  assert.throws(() => validateStickerFile({ type: 'image/png', size: 11 * 1024 * 1024 }), /10 MB/);
  assert.throws(() => validateStickerFile({ type: 'image/png', size: 0 }), /10 MB/);
});
test('Malayalam and emoji captions wrap without splitting graphemes', () => {
  const text = 'പ്രിയമേ ❤️👩‍❤️‍👨';
  const measure = value => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].length;
  const lines = wrapCaption(text, measure, 2);
  assert.equal(lines.join(''), text.replaceAll(' ', ''));
  assert.ok(lines.includes('❤️👩‍❤️‍👨'));
});
test('saved stickers are isolated per account and malformed storage is ignored', () => {
  const db = storage(), items = addStickerToLibrary([], png);
  persistStickerLibrary(db, 'alice', items);
  assert.deepEqual(loadStickerLibrary(db, 'alice'), items);
  assert.deepEqual(loadStickerLibrary(db, 'bob'), []);
  db.setItem(stickerLibraryKey('bob'), JSON.stringify([{ id: 'bad', dataUrl: 'https://example.com/photo' }]));
  assert.deepEqual(loadStickerLibrary(db, 'bob'), []);
  db.setItem(stickerLibraryKey('bob'), '{}');
  assert.deepEqual(loadStickerLibrary(db, 'bob'), []);
  db.setItem(stickerLibraryKey('bob'), 'invalid JSON');
  assert.deepEqual(loadStickerLibrary(db, 'bob'), []);
});
test('duplicate saves do not consume slots and full libraries preserve old stickers', () => {
  const items = addStickerToLibrary([], png);
  assert.equal(addStickerToLibrary(items, png), items);
  const full = Array.from({ length: 50 }, (_, i) => ({ id: String(i), dataUrl: png + i }));
  assert.throws(() => addStickerToLibrary(full, png), /50 stickers/);
  assert.equal(full.length, 50);
  assert.throws(() => persistStickerLibrary({ setItem() { throw new Error('QuotaExceededError'); } }, 'alice', items), /browser storage/);
});

test('whole meme crop stays centered at normal zoom and bounds pan at enlarged zoom', () => {
  const image = { naturalWidth: 1200, naturalHeight: 300 };
  assert.deepEqual(clampStickerPan(image, 'original', 1, { x: 90, y: -80 }), { x: 0, y: 0 });
  assert.deepEqual(clampStickerPan(image, 'original', 2, { x: 999, y: -999 }), { x: 205, y: -51.25 });
});
