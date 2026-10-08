import { z } from 'zod';

export const pushEndpoint = z.string().url().max(2048).refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
    ['fcm.googleapis.com', 'push.services.mozilla.com', 'web.push.apple.com', 'notify.windows.com'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
}, 'Unsupported push service endpoint.');
export const pushSubscription = z.object({
  endpoint: pushEndpoint,
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/), auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/) }),
});
