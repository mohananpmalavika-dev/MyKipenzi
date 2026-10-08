import { z } from 'zod';

export const scheduleInput = z.object({
  client_id: z.string().uuid(),
  text: z.string().trim().min(1).max(5000),
  source_language: z.enum(['auto', 'en', 'ml', 'manglish', 'sw']).default('auto'),
  delivery_at: z.string().datetime({ offset: true }),
  time_zone: z.string().max(100).refine((zone) => {
    try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; } catch { return false; }
  }, 'Choose a valid time zone.'),
  reminder_minutes: z.union([z.literal(0), z.literal(5), z.literal(15), z.literal(60)]).default(0),
}).strict();
export const scheduleEdit = scheduleInput.omit({ client_id: true }).extend({ revision: z.number().int().positive() });

export function validateDelivery(input, now = Date.now()) {
  const delivery = Date.parse(input.delivery_at);
  if (!Number.isFinite(delivery) || delivery < now + 60000) throw new Error('Choose a delivery time at least one minute from now.');
  if (delivery > now + 366 * 86400000) throw new Error('Choose a delivery time within the next year.');
  if (input.reminder_minutes && delivery - input.reminder_minutes * 60000 <= now)
    throw new Error('The reminder time must be in the future.');
}

export function localDateTime(instant, zone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

// Find all matching instants rather than silently adjusting a daylight-saving gap or overlap.
export function zonedInstant(local, zone) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error('Choose a date and time.');
  const nominal = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(nominal)) throw new Error('Choose a valid date and time.');
  const offsets = new Set();
  for (const delta of [-36, -12, 0, 12, 36]) {
    const sample = nominal + delta * 3600000;
    offsets.add(Date.parse(`${localDateTime(sample, zone)}:00Z`) - sample);
  }
  const matches = [...offsets].map((offset) => nominal - offset).filter((instant) => localDateTime(instant, zone) === local);
  if (!matches.length) throw new Error('This local time does not exist in that time zone. Choose another time.');
  if (matches.length > 1) throw new Error('This local time occurs twice due to daylight saving. Choose another time or use UTC.');
  return new Date(matches[0]).toISOString();
}
