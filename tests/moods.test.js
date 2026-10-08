import test from 'node:test';
import assert from 'node:assert/strict';
import { MOODS, moodInput, currentMood, getMood, moodNotification, mergeMoodStatus } from '../shared/moods.js';

test('mood input accepts exactly the four presets and rejects extra fields', () => {
  for (const mood of MOODS) assert.equal(moodInput.parse({ mood: mood.id }).mood, mood.id);
  for (const input of [{}, { mood: 'sad' }, { mood: '<script>' }, { mood: 'happy', user_id: 'someone-else' }])
    assert.equal(moodInput.safeParse(input).success, false);
});
test('each mood has its own cute notification in all supported languages', () => {
  for (const language of ['en', 'ml', 'manglish', 'sw']) {
    const messages = MOODS.map(m => moodNotification(m.id, 'Dhanya', language));
    assert.equal(new Set(messages.map(m => m.body)).size, 4);
    assert.ok(messages.every(m => m.title.includes('Dhanya') && m.body.includes('Dhanya')));
    assert.ok(messages.every((m, i) => m.body.includes(MOODS[i].emoji)));
  }
  assert.equal(moodNotification('unknown', 'Friend'), null);
  assert.equal(getMood('unknown'), undefined);
  assert.deepEqual(moodNotification('happy', 'Friend', 'unknown'), moodNotification('happy', 'Friend', 'en'));
  assert.match(moodNotification('need_a_hug', 'Dhanya', 'ml').body, /ആലിംഗനം/);
});
test('daily status expires at the boundary and handles missing or invalid dates', () => {
  const now = Date.parse('2026-10-09T10:00:00Z');
  const status = { mood: 'tired', expires_at: '2026-10-09T10:00:01Z' };
  assert.equal(currentMood(status, now), status);
  assert.equal(currentMood(status, now + 1000), null);
  assert.equal(currentMood(null, now), null);
  assert.equal(currentMood({ ...status, mood: 'unknown' }, now), null);
  assert.equal(currentMood({ ...status, expires_at: 'invalid' }, now), null);
});
test('out-of-order socket events and HTTP replies cannot roll moods back', () => {
  const statuses = [{ user_id: 'me', mood: 'happy', revision: 3 }, { user_id: 'peer', mood: 'tired', revision: 7 }];
  assert.equal(mergeMoodStatus(statuses, { user_id: 'me', mood: 'tired', revision: 2 }), statuses);
  assert.equal(mergeMoodStatus(statuses, { user_id: 'me', mood: 'happy', revision: 3 }), statuses);
  const next = mergeMoodStatus(statuses, { user_id: 'me', mood: 'missing_you', revision: 4 });
  assert.equal(next.find(s => s.user_id === 'me').mood, 'missing_you');
  assert.equal(next.find(s => s.user_id === 'peer').revision, 7);
  assert.equal(statuses[0].mood, 'happy');
});
