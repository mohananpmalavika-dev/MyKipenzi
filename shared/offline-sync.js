import { offlineStore } from './offline-store.js';

export const SYNC_TAG = 'kipenzi-message-outbox';
export async function refreshOfflineHistory(owner) {
  if ((await offlineStore.session())?.user?.id !== owner || await offlineStore.pendingLogout()) return;
  let session;
  try { session = await request('/auth/session'); }
  catch (error) {
    if (error.status === 401) await offlineStore.clear();
    throw error;
  }
  if ((await offlineStore.session())?.user?.id !== owner || await offlineStore.pendingLogout()) return;
  if (session.user?.id !== owner) return offlineStore.setSession(session);
  const saved = await offlineStore.paths(owner);
  const chats = [...new Set(saved.map(path => path.split('?')[0]).filter(path => /^\/conversations\/[\w-]+\/messages$/.test(path)))].slice(0, 20);
  // Bound one-off background work; foreground loading handles older/unopened chats.
  for (const path of ['/conversations', ...chats]) {
    if ((await offlineStore.session())?.user?.id !== owner || await offlineStore.pendingLogout()) return;
    try {
      const data = await request(path);
      await offlineStore.cache(owner, path, data);
      for (const message of data.messages || []) await offlineStore.updateMessage(owner, message);
    } catch (error) {
      if (error.status === 401) { await offlineStore.clear(); throw error; }
      if (!error.status || error.status >= 500 || error.status === 429) throw error;
    }
  }
}
async function request(path, csrf, body) {
  const response = await fetch(`/api${path}`, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    signal: AbortSignal.timeout(body instanceof FormData ? 120000 : 30000),
    headers: { ...(csrf ? { 'x-csrf-token': csrf } : {}), ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}
// Fresh session/CSRF and an IndexedDB lease protect account switches and concurrent tabs.
export async function flushOutbox(owner, onlyKey, onChange = () => {}, upload = (path, form, csrf) => request(path, csrf, form)) {
  const results = new Map();
  if (await offlineStore.pendingLogout()) return results;
  const rows = await offlineStore.list(owner);
  if (!rows.length) return results;
  let session;
  try { session = await request('/auth/session'); }
  catch (error) {
    if (error.status === 401) await offlineStore.clear();
    throw error;
  }
  if ((await offlineStore.session())?.user?.id !== owner || await offlineStore.pendingLogout()) return results;
  if (session.user?.id !== owner) {
    await offlineStore.setSession(session);
    throw new Error('Sign in to the original account to send queued messages.');
  }
  await offlineStore.setSession(session);
  for (const row of rows) {
    if (onlyKey && row.input.client_id !== onlyKey) continue;
    if (!onlyKey && row.status === 'failed' && !row.retryable) continue;
    const entry = await offlineStore.claim(owner, row.input.client_id);
    if (!entry) continue;
    await onChange();
    try {
      if (entry.file && !entry.input.attachment_id) {
        const form = new FormData();
        form.append('file', entry.file, entry.file.name || 'attachment');
        const uploaded = await upload(`/conversations/${entry.conversation_id}/uploads`, form, session.csrf, entry);
        entry.input.attachment_id = uploaded.id;
        // Persist upload completion before sending so retries reuse the attachment.
        if (!await offlineStore.put(entry)) break;
      }
      if ((await offlineStore.session())?.user?.id !== owner) break;
      const message = await request(`/conversations/${entry.conversation_id}/messages`, session.csrf, entry.input);
      await offlineStore.updateMessage(owner, message, true);
      await offlineStore.remove(entry.input.client_id);
      results.set(entry.input.client_id, message);
    } catch (error) {
      entry.retryable = !error.status || error.status >= 500 || error.status === 429 || error.status === 408;
      entry.status = entry.retryable ? 'queued' : 'failed';
      entry.error = error.message;
      entry.leaseUntil = 0;
      await offlineStore.put(entry);
      if (entry.retryable) throw error;
    } finally { await onChange(); }
  }
  return results;
}
