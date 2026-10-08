import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { scheduleInput, validateDelivery, localDateTime, zonedInstant } from '../shared/scheduling.js';

test('time zones convert wall times to UTC across dates and fractional offsets', () => {
  assert.equal(zonedInstant('2026-10-10T09:00', 'Asia/Kolkata'), '2026-10-10T03:30:00.000Z');
  assert.equal(zonedInstant('2026-10-10T01:00', 'Asia/Kathmandu'), '2026-10-09T19:15:00.000Z');
  assert.equal(localDateTime('2026-10-10T03:30:00Z', 'Africa/Nairobi'), '2026-10-10T06:30');
  assert.equal(zonedInstant('2026-07-01T12:00', 'America/New_York'), '2026-07-01T16:00:00.000Z');
  assert.equal(zonedInstant('2026-01-01T12:00', 'America/New_York'), '2026-01-01T17:00:00.000Z');
});
test('daylight-saving gaps, overlaps, and invalid dates require correction', () => {
  assert.throws(() => zonedInstant('2026-03-08T02:30', 'America/New_York'), /does not exist/);
  assert.throws(() => zonedInstant('2026-11-01T01:30', 'America/New_York'), /occurs twice/);
  assert.throws(() => zonedInstant('2026-02-30T12:00', 'UTC'));
  assert.throws(() => zonedInstant('', 'UTC'));
});
test('delivery and reminder times must be future and bounded', () => {
  const now = Date.parse('2026-10-09T12:00:00Z');
  assert.throws(() => validateDelivery({ delivery_at: '2026-10-09T12:00:30Z', reminder_minutes: 0 }, now), /one minute/);
  assert.throws(() => validateDelivery({ delivery_at: '2028-10-09T12:00:00Z', reminder_minutes: 0 }, now), /year/);
  assert.throws(() => validateDelivery({ delivery_at: '2026-10-09T12:03:00Z', reminder_minutes: 5 }, now), /reminder/);
  validateDelivery({ delivery_at: '2026-10-09T12:10:00Z', reminder_minutes: 5 }, now);
});
test('schedule API requires a UTC offset, valid zone, text and allowed reminder', () => {
  const input = { client_id: randomUUID(), text: '  Hello tomorrow  ', delivery_at: '2026-10-10T09:00:00+05:30', time_zone: 'Asia/Kolkata', reminder_minutes: 15 };
  assert.equal(scheduleInput.parse(input).text, 'Hello tomorrow');
  for (const invalid of [{ time_zone: 'invalid/zone' }, { delivery_at: '2026-10-10T09:00' }, { text: '' }, { reminder_minutes: 7 }, { attachment_id: randomUUID() }]) assert.equal(scheduleInput.safeParse({ ...input, ...invalid }).success, false);
});
