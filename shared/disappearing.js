export const expiryOptions = { 0:'Off', 3600:'1 hour', 86400:'24 hours', 604800:'7 days', 2592000:'30 days' };
export const hasExpired = (message, now = Date.now()) => !!message?.expires_at && new Date(message.expires_at).getTime() <= now;
