import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDaysTogether,
  calculateMilestoneCountdown,
  buildDefaultMemories,
  formatStoryMemoryShare,
  formatStoryMilestoneShare,
  parseStoryShare,
  STORY_CATEGORIES,
} from '../shared/relationshipStory.js';

test('calculateDaysTogether accurately computes total days and breakdown', () => {
  // Start date exactly 365 days before ref
  const startDate = '2025-10-09';
  const refDate = new Date(2026, 9, 9); // 2026-10-09

  const result = calculateDaysTogether(startDate, refDate);
  assert.equal(result.totalDays, 365);
  assert.equal(result.years, 1);
  assert.equal(result.months, 0);
  assert.equal(result.days, 0);
  assert.equal(result.headlineTextEn, 'Together for 365 Days');
  assert.equal(result.headlineTextMl, 'ഒരുമിച്ച് 365 ദിവസങ്ങൾ');

  // Next milestone progress towards 500 days
  assert.equal(result.nextMilestone.targetDays, 500);
  assert.equal(result.nextMilestone.daysRemaining, 135);
  assert.equal(result.nextMilestone.progressPercentage, 0); // Just started from 365 towards 500

  // Mid-progress test (e.g. 400 days)
  const midResult = calculateDaysTogether('2025-09-04', refDate); // ~400 days
  assert.ok(midResult.nextMilestone.progressPercentage > 0);
});

test('calculateDaysTogether handles same day (0 days)', () => {
  const startDate = '2026-10-09';
  const refDate = new Date(2026, 9, 9);
  const result = calculateDaysTogether(startDate, refDate);

  assert.equal(result.totalDays, 0);
  assert.equal(result.headlineTextEn, 'Together for 0 Days');
  assert.equal(result.nextMilestone.targetDays, 100);
  assert.equal(result.nextMilestone.daysRemaining, 100);
});

test('calculateMilestoneCountdown accurately calculates countdown and handles annual recurrence', () => {
  // Reference date: 2026-10-09
  const refDate = new Date(2026, 9, 9, 12, 0, 0);

  // Anniversary date originally on 2024-10-24
  const anniversaryOriginal = '2024-10-24';
  const countdown = calculateMilestoneCountdown(anniversaryOriginal, true, refDate);

  assert.ok(countdown);
  assert.equal(countdown.isAnnual, true);
  assert.equal(countdown.targetDateFormatted, '2026-10-24');
  assert.equal(countdown.days, 14); // 15 days ahead from Oct 9 midday
  assert.equal(countdown.isToday, false);

  // Test when milestone is today
  const todayMilestone = calculateMilestoneCountdown('2024-10-09', true, refDate);
  assert.equal(todayMilestone.isToday, true);
  assert.ok(todayMilestone.humanTextEn.includes('Today is the special day'));
  assert.ok(todayMilestone.humanTextMl.includes('ഇന്നാണ് ആ വിശേഷ ദിവസം'));
});

test('buildDefaultMemories generates romantic starter moments with dates', () => {
  const memories = buildDefaultMemories('2025-01-01', 'Anu');
  assert.equal(memories.length, 3);
  assert.ok(memories.some((m) => m.category === 'first_chat'));
  assert.ok(memories.some((m) => m.category === 'first_date'));
  assert.ok(memories.some((m) => m.category === 'official_start'));
  assert.ok(memories[0].title.includes('ആദ്യ'));
});

test('formatStoryMemoryShare and parseStoryShare serialize and deserialize correctly', () => {
  const memory = {
    id: 'mem_123',
    title: 'Our First Sunset at Fort Kochi 🌅',
    memory_date: '2025-05-15',
    category: 'trip',
    emoji: '🌅',
    description: 'We sat on the rocks watching the sky turn into gold and violet.',
    photo_url: null,
  };

  const sharedMsg = formatStoryMemoryShare(memory);
  const parsed = parseStoryShare(sharedMsg);

  assert.ok(parsed);
  assert.equal(parsed.type, 'memory');
  assert.equal(parsed.id, memory.id);
  assert.equal(parsed.title, memory.title);
  assert.equal(parsed.category, 'trip');
  assert.equal(parsed.emoji, '🌅');
});

test('formatStoryMilestoneShare and parseStoryShare round-trip milestone data', () => {
  const milestoneData = {
    title: '1 Year Anniversary 🥂',
    daysTogether: 365,
    daysRemaining: 0,
    targetDate: '2026-10-24',
    category: 'anniversary',
    emoji: '🥂',
    note: 'Celebrating 365 days of endless love!',
  };

  const sharedMsg = formatStoryMilestoneShare(milestoneData);
  const parsed = parseStoryShare(sharedMsg);

  assert.ok(parsed);
  assert.equal(parsed.type, 'milestone');
  assert.equal(parsed.title, milestoneData.title);
  assert.equal(parsed.daysTogether, 365);
});

test('STORY_CATEGORIES covers required anniversary, first date, first chat, and moments', () => {
  assert.ok(STORY_CATEGORIES.anniversary);
  assert.ok(STORY_CATEGORIES.first_date);
  assert.ok(STORY_CATEGORIES.first_chat);
  assert.ok(STORY_CATEGORIES.trip);
  assert.ok(STORY_CATEGORIES.official_start);
});
