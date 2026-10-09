import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMonthKey,
  getMonthLabel,
  getAvailableRecapMonths,
  generateMonthlyPoeticChronicle,
  formatMonthlyRecapShare,
  parseMonthlyRecapShare,
  MONTH_NAMES_EN,
  MONTH_NAMES_ML,
} from '../shared/monthlyRecap.js';

test('formatMonthKey formats date into YYYY-MM correctly', () => {
  const d = new Date(2026, 9, 9); // October (month index 9) 2026
  assert.equal(formatMonthKey(d), '2026-10');

  const dJan = new Date(2025, 0, 15);
  assert.equal(formatMonthKey(dJan), '2025-01');
});

test('getMonthLabel returns English and Malayalam localized labels', () => {
  const label = getMonthLabel('2026-10');
  assert.equal(label.en, 'October 2026');
  assert.equal(label.ml, 'ഒക്ടോബർ 2026');
  assert.equal(label.monthNameEn, 'October');
  assert.equal(label.monthNameMl, 'ഒക്ടോബർ');
  assert.equal(label.year, 2026);
});

test('getAvailableRecapMonths returns requested past months with active current flag', () => {
  const refDate = new Date(2026, 9, 1); // 2026-10
  const months = getAvailableRecapMonths(4, refDate);
  assert.equal(months.length, 4);
  assert.equal(months[0].key, '2026-10');
  assert.equal(months[0].isCurrent, true);
  assert.equal(months[1].key, '2026-09');
  assert.equal(months[1].isCurrent, false);
  assert.equal(months[2].key, '2026-08');
  assert.equal(months[3].key, '2026-07');
});

test('generateMonthlyPoeticChronicle creates poetic summaries in both Malayalam and English', () => {
  const stats = {
    messagesCount: 120,
    photosCount: 8,
    voiceNotesCount: 15,
    heartbeatsCount: 20,
    duetCount: 2,
  };
  const chronicle = generateMonthlyPoeticChronicle(stats, 'Malavika', '2026-10');

  assert.ok(chronicle.poemMl.includes('ഒക്ടോബർ'));
  assert.ok(chronicle.poemMl.includes('Malavika'));
  assert.ok(chronicle.poemMl.includes('120'));
  assert.ok(chronicle.poemEn.includes('October'));
  assert.ok(chronicle.poemEn.includes('Malavika'));
  assert.ok(chronicle.titleEn.includes('October') && chronicle.titleEn.includes('in Review'));
  assert.ok(chronicle.titleMl.includes('ഒക്ടോബർ'));
});

test('formatMonthlyRecapShare and parseMonthlyRecapShare roundtrip properly', () => {
  const recap = {
    monthKey: '2026-10',
    titleEn: 'Our October in Review',
    titleMl: 'നമ്മുടെ ഒക്ടോബർ ഓർമ്മകൾ',
    stats: {
      messagesCount: 95,
      photosCount: 6,
      voiceNotesCount: 10,
      heartbeatsCount: 14,
      duetCount: 1,
    },
    chronicle: {
      highlightMl: 'നമ്മുടെ സ്നേഹനിമിഷങ്ങൾ ✨',
      highlightEn: 'Golden moments shared ✨',
    },
  };

  const formatted = formatMonthlyRecapShare(recap);
  assert.ok(formatted.startsWith('[MONTHLY_RECAP:'));
  assert.ok(formatted.endsWith(']'));

  const parsed = parseMonthlyRecapShare(formatted);
  assert.ok(parsed);
  assert.equal(parsed.month, '2026-10');
  assert.equal(parsed.titleEn, 'Our October in Review');
  assert.equal(parsed.stats.messagesCount, 95);
  assert.equal(parsed.stats.photosCount, 6);
  assert.equal(parsed.stats.duetCount, 1);
  assert.equal(parsed.highlightMl, 'നമ്മുടെ സ്നേഹനിമിഷങ്ങൾ ✨');
});

test('parseMonthlyRecapShare handles null, empty, or invalid input safely', () => {
  assert.equal(parseMonthlyRecapShare(null), null);
  assert.equal(parseMonthlyRecapShare(''), null);
  assert.equal(parseMonthlyRecapShare('random message text'), null);
  assert.equal(parseMonthlyRecapShare('[MONTHLY_RECAP:invalid json]'), null);
});
