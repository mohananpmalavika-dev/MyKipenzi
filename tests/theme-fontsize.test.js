import test from 'node:test';
import assert from 'node:assert/strict';
import { FONT_SIZES } from '../src/useThemeAndFontSize.js';

test('font size configurations provide valid dimensions and Malayalam labels for mobile comfort', () => {
  assert.equal(FONT_SIZES.length, 5);

  const ids = FONT_SIZES.map((f) => f.id);
  assert.deepEqual(ids, ['small', 'normal', 'comfortable', 'large', 'xlarge']);

  const comfortable = FONT_SIZES.find((f) => f.id === 'comfortable');
  assert.ok(comfortable);
  assert.equal(comfortable.size, '17px');
  assert.equal(comfortable.lineHeight, '1.85');
  assert.equal(comfortable.labelMl, 'സുഖകരം');

  for (const item of FONT_SIZES) {
    assert.ok(item.size.endsWith('px'), `${item.id} has pixel size`);
    assert.ok(Number(item.lineHeight) >= 1.7, `${item.id} has comfortable line height for mobile reading`);
    assert.ok(item.label.length > 0, `${item.id} has label`);
    assert.ok(item.labelMl.length > 0, `${item.id} has Malayalam label`);
  }
});
