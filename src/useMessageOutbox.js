import { useCallback, useEffect, useRef, useState } from 'react';
import { offlineStore } from '../shared/offline-store.js';
import { flushOutbox, SYNC_TAG } from '../shared/offline-sync.js';
import { setCsrf, uploadFile } from './api.js';

export async function requestBackgroundSync() {
  try {
    const worker = await navigator.serviceWorker?.getRegistration();
    if (worker?.sync) await worker.sync.register(SYNC_TAG);
  } catch { /* Reconnect/focus retries support browsers without Background Sync. */ }
}
export function useMessageOutbox(userId) {
  const [entries, setEntries] = useState([]);
  const ownerRef = useRef(userId);
  ownerRef.current = userId;
  const refresh = useCallback(async () => {
    const owner = userId || (await offlineStore.session())?.user?.id;
    const rows = owner ? await offlineStore.list(owner) : [];
    if (ownerRef.current === userId) setEntries(rows);
  }, [userId]);
  const deliver = useCallback(async key => {
    const owner = userId || (await offlineStore.session())?.user?.id;
    if (!owner || navigator.onLine === false) {
      await refresh();
      await requestBackgroundSync();
      return false;
    }
    try {
      const results = await flushOutbox(owner, key, refresh, (path, form, csrf, entry) => {
        setCsrf(csrf);
        return uploadFile(path, form, progress => {
          if (ownerRef.current === userId) setEntries(old => old.map(row => row.input.client_id === entry.input.client_id ? { ...row, progress } : row));
        });
      });
      if (results.size) window.dispatchEvent(new Event('kipenzi:outbox-synced'));
      return key ? results.get(key) || false : true;
    } catch {
      await requestBackgroundSync();
      return false;
    } finally { await refresh(); }
  }, [userId, refresh]);
  useEffect(() => {
    let alive = true;
    const sync = () => { if (alive) void deliver().catch(() => {}); };
    const focus = () => { if (document.visibilityState === 'visible') sync(); };
    const workerMessage = event => {
      if (event.data?.type === 'OUTBOX_SYNCED') {
        void refresh();
        window.dispatchEvent(new Event('kipenzi:outbox-synced'));
      }
    };
    void refresh().then(sync).catch(() => {});
    window.addEventListener('online', sync);
    window.addEventListener('offline', requestBackgroundSync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', focus);
    navigator.serviceWorker?.addEventListener('message', workerMessage);
    const timer = setInterval(sync, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', requestBackgroundSync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', focus);
      navigator.serviceWorker?.removeEventListener('message', workerMessage);
    };
  }, [deliver, refresh]);
  const enqueue = async (conversation_id, input, file, onSaved) => {
    const owner = userId || (await offlineStore.session())?.user?.id;
    const entry = { owner, conversation_id, input: { ...input, client_id: crypto.randomUUID() }, file,
      status: 'queued', retryable: true, error: '', progress: 0, createdAt: Date.now(), leaseUntil: 0 };
    if (!owner || !await offlineStore.put(entry)) throw new Error('Could not save this message for delivery. Sign in again.');
    await refresh();
    onSaved?.();
    await requestBackgroundSync();
    return deliver(entry.input.client_id);
  };
  return { entries, enqueue, retry: deliver };
}
