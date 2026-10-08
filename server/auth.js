import { parse } from 'cookie';
import { one } from './db.js';
import { digest, HttpError, token } from './security.js';
import { production, config } from './config.js';
export const publicUser = (u) => ({
  id: u.id,
  handle: u.handle,
  name: u.name,
  language: u.language,
  ai_consent: u.ai_consent,
  likeness_consent: u.likeness_consent,
  avatar_id: u.avatar_id,
  has_voice: !!u.voice_id,
  voice_verified: u.voice_verified,
  online_status_visibility: u.online_status_visibility,
  last_seen_visibility: u.last_seen_visibility,
  last_seen: u.last_seen,
  who_can_add_to_groups: u.who_can_add_to_groups,
  require_group_approval: u.require_group_approval,
});
export async function getSession(cookieHeader) {
  const raw = parse(cookieHeader || '').kipenzi_session;
  if (!raw || raw.length > 100) return null;
  return one(
    `SELECT u.*,s.csrf,s.token_hash,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,
    [digest(raw)],
  );
}
export async function issueSession(res, userId) {
  const raw = token(),
    csrf = token();
  await one(
    `INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '7 days') RETURNING token_hash`,
    [digest(raw), userId, csrf],
  );
  res.cookie('kipenzi_session', raw, {
    httpOnly: true,
    secure: production,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 86400 * 1000,
  });
  return csrf;
}
export function requireOrigin(req, _res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== config.APP_ORIGIN)
    return next(new HttpError(403, 'Untrusted request origin.'));
  next();
}
export async function authenticate(req, _res, next) {
  try {
    req.user = await getSession(req.headers.cookie);
    if (!req.user) throw new HttpError(401, 'Please sign in.');
    if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-csrf-token'] !== req.user.csrf)
      throw new HttpError(403, 'Session expired. Refresh and try again.');
    next();
  } catch (e) {
    next(e);
  }
}
