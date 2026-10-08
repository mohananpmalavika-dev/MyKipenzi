import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, LoaderCircle } from 'lucide-react';
import { api } from './api.js';
import { Modal } from './components.jsx';
import { canDeleteForEveryone, expirationLabel } from '../shared/messageStatus.js';

export function useMessageClock(message) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let timer;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      const deletionLeft = new Date(message.created_at).getTime() + 86400000 - current;
      const expiryLeft = message.expires_at ? new Date(message.expires_at).getTime() - current : Infinity;
      if (expiryLeft <= 0 || (deletionLeft <= 0 && !message.expires_at)) return;
      let delay = expiryLeft <= 60000 ? 1000 : 60000;
      if (deletionLeft > 0) delay = Math.min(delay, deletionLeft);
      timer = setTimeout(tick, delay);
    };
    tick();
    return () => clearTimeout(timer);
  }, [message.created_at, message.expires_at]);
  return { canDelete: canDeleteForEveryone(message, now), expiration: message.expires_at ? expirationLabel(message.expires_at, now) : null };
}

export function MessageHistory({ message, onClose }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => api(`/messages/${message.id}/history`).then((data) => { if (active) { setResult(data); setError(''); } }).catch((error) => { if (active) { setResult(null); setError(error.message); } });
    void load();
    const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [message.id]);
  return <Modal title="Message editing history" onClose={onClose}>
    <p className="muted">Earlier versions are visible to chat members until this message is deleted or expires.</p>
    {error ? <p role="alert">{error}</p> : !result ? <p role="status">Loading history…</p> : <ol className="message-history-list">
      {[...result.history, { ...result.current, id: 'current' }].map((revision, index) => <li key={revision.id}><strong>{revision.id === 'current' ? 'Current version' : index === 0 ? 'Original message' : `Version ${index + 1}`}</strong><time dateTime={revision.edited_at}>{new Date(revision.edited_at).toLocaleString()}</time><p dir="auto">{revision.text}</p></li>)}
    </ol>}
  </Modal>;
}

export function OutgoingMessage({ entry, retryDisabled, onRetry }) {
  const failed = entry.status === 'failed';
  return <article className={`message mine outgoing-message ${failed ? 'message-failed' : ''}`} aria-label={failed ? 'Failed message' : 'Sending message'}>
    <div className="bubble">
      {entry.input.text && <p dir="auto">{entry.input.text}</p>}
      {entry.input.sticker && <p>Sticker: {entry.input.sticker}</p>}
      {entry.file && <small>{entry.file.name}</small>}
      <div className="outgoing-status" role="status">{failed ? <AlertCircle size={15} /> : <LoaderCircle size={15} className="spin" />}<span>{failed ? 'Message failed to send' : entry.file && !entry.input.attachment_id ? `Uploading ${entry.progress}%` : 'Sending…'}</span></div>
      {failed && <><small>{entry.error}</small><button className="message-retry" type="button" disabled={retryDisabled} onClick={() => onRetry(entry.input.client_id)}><RefreshCw size={14} />Retry message</button></>}
    </div>
  </article>;
}
