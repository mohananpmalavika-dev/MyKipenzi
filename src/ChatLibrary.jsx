import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Attachment, Modal } from './components.jsx';
import { stickers } from '../shared/constants.js';
export function ChatLibrary({ conversationId, initialKind, onClose, onOpen }) {
  const [kind, setKind] = useState(initialKind);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  useEffect(() => {
    const current = ++version.current;
    setRows([]); setMore(false); setBusy(true); setError('');
    const timer = setTimeout(async () => {
      try {
        const result = await api('/conversations/' + conversationId + '/library?' + new URLSearchParams({ kind, q: query }));
        if (current !== version.current) return;
        setRows(result.messages); setMore(result.has_more);
      } catch (e) { if (current === version.current) setError(e.message); }
      finally { if (current === version.current) setBusy(false); }
    }, 250);
    return () => { clearTimeout(timer); version.current = current + 1; };
  }, [conversationId, kind, query]);
  const loadMore = async () => {
    const current = version.current; setBusy(true); setError('');
    try {
      const result = await api('/conversations/' + conversationId + '/library?' + new URLSearchParams({ kind, q: query, before: rows.at(-1).seq }));
      if (current !== version.current) return;
      setRows(old => [...old, ...result.messages]); setMore(result.has_more);
    } catch (e) { if (current === version.current) setError(e.message); }
    finally { if (current === version.current) setBusy(false); }
  };
  return <Modal title="Search & shared media" onClose={onClose} wide>
    <div className="library-controls">
      <label>Find in this chat<input autoFocus aria-label="Search chat history" placeholder="Search messages or filenames" maxLength={200} value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="library-tabs" role="group" aria-label="Filter shared items">{Object.entries({ messages:'Messages', photos:'Photos', documents:'Documents', media:'All media' }).map(([value,label]) => <button key={value} type="button" aria-pressed={kind===value} onClick={() => setKind(value)}>{label}</button>)}</div>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="library-results" aria-busy={busy}>
      {rows.map(m => <section key={m.id} className="library-item">
        <div className="library-item-meta"><strong>{m.sender.name}</strong><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString()}</time></div>
        {m.text && <p dir="auto">{m.text}</p>}
        {m.translation?.status==='ready' && m.translation.text!==m.text && <p dir="auto">{m.translation.text}</p>}
        {m.sticker && <p>{stickers[m.sticker]}</p>}
        {m.attachment && <><small>{m.attachment.name}</small><Attachment attachment={m.attachment} onError={setError} /></>}
        <button type="button" className="text-btn" onClick={() => onOpen(m)}>View in chat</button>
      </section>)}
      {!busy && !error && !rows.length && <p role="status">{query.trim() ? 'No matching items in this chat.' : kind==='messages' ? 'No messages yet.' : 'No shared items in this category yet.'}</p>}
      {busy && <p role="status">Searching…</p>}
      {more && <button type="button" className="secondary" disabled={busy} onClick={() => void loadMore()}>Load more</button>}
    </div>
  </Modal>;
}
