export const DELETE_WINDOW_SECONDS = 24 * 60 * 60;
export const messageExpiryOptions = { 0: 'Chat default', 300: '5 minutes', 3600: '1 hour', 86400: '24 hours', 604800: '7 days', 2592000: '30 days' };
export function canDeleteForEveryone(message, now = Date.now()) {
  const created = new Date(message.created_at).getTime();
  return !message.deleted_at && Number.isFinite(created) && now < created + DELETE_WINDOW_SECONDS * 1000;
}
export function expirationLabel(instant, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((new Date(instant).getTime() - now) / 1000));
  if (!seconds) return 'Expired';
  if (seconds < 60) return `Expires in ${seconds}s`;
  if (seconds < 3600) return `Expires in ${Math.ceil(seconds / 60)}m`;
  if (seconds < 86400) return `Expires in ${Math.ceil(seconds / 3600)}h`;
  return `Expires in ${Math.ceil(seconds / 86400)}d`;
}
