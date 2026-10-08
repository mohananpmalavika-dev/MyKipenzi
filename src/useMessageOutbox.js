import { useRef, useState } from 'react';
import { api, uploadFile } from './api.js';

export function useMessageOutbox() {
  const [entries, setEntries] = useState([]);
  const snapshots = useRef(new Map());
  const active = useRef(new Set());
  const update = (entry) => setEntries((old) => old.map((row) => row.input.client_id === entry.input.client_id ? { ...entry } : row));
  const deliver = async (entry) => {
    const key = entry.input.client_id;
    if (active.current.has(key)) return false;
    active.current.add(key);
    entry.status = 'sending';
    entry.error = '';
    update(entry);
    try {
      if (entry.file && !entry.input.attachment_id) {
        const form = new FormData();
        form.append('file', entry.file);
        const attachment = await uploadFile(`/conversations/${entry.conversation_id}/uploads`, form, (progress) => {
          entry.progress = progress;
          update(entry);
        });
        entry.input.attachment_id = attachment.id;
      }
      const message = await api(`/conversations/${entry.conversation_id}/messages`, { method: 'POST', body: entry.input });
      snapshots.current.delete(key);
      setEntries((old) => old.filter((row) => row.input.client_id !== key));
      return message;
    } catch (error) {
      entry.status = 'failed';
      entry.error = error.message;
      update(entry);
      return false;
    } finally { active.current.delete(key); }
  };
  const enqueue = (conversation_id, input, file) => {
    const entry = { conversation_id, input: { ...input, client_id: crypto.randomUUID() }, file, status: 'sending', error: '', progress: 0 };
    snapshots.current.set(entry.input.client_id, entry);
    setEntries((old) => [...old, { ...entry }]);
    return deliver(entry);
  };
  const retry = (key) => {
    const entry = snapshots.current.get(key);
    return entry ? deliver(entry) : Promise.resolve(false);
  };
  return { entries, enqueue, retry };
}
