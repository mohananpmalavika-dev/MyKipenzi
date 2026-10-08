import { useEffect, useRef, useState } from 'react';
import { hasExpired } from '../shared/disappearing.js';
import { api } from './api.js';
import { Attachment, Modal } from './components.jsx';
import { stickers } from '../shared/constants.js';
export function ChatLibrary({ conversationId, initialKind, onClose, onOpen, onOpenVault }) {
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(null);
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
  }, [conversationId, kind, query, revision]);
  useEffect(() => {
    const timer=setInterval(()=>setRows(old=>old.some(m=>hasExpired(m))?old.filter(m=>!hasExpired(m)):old),1000);
    return ()=>clearInterval(timer);
  },[]);
  const loadMore = async () => {
    const current = version.current; setBusy(true); setError('');
    try {
      const result = await api('/conversations/' + conversationId + '/library?' + new URLSearchParams({ kind, q: query, before: rows.at(-1).seq }));
      if (current !== version.current) return;
      setRows(old => [...old, ...result.messages]); setMore(result.has_more);
    } catch (e) { if (current === version.current) setError(e.message); }
    finally { if (current === version.current) setBusy(false); }
  };
  const unsave = async m => {
    setSaving(m.id); setError('');
    try { await api(`/messages/${m.id}/${kind==='starred'?'star':'pin'}`,{method:'DELETE'}); setRevision(v=>v+1); }
    catch(e){setError(e.message);}finally{setSaving(null);}
  };
  return <Modal title="Search & saved messages" onClose={onClose} wide>
    <div className="library-controls">
      <label>Find in this chat<input autoFocus aria-label="Search chat history" placeholder="Search messages or filenames" maxLength={200} value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="library-tabs" role="group" aria-label="Filter shared items">{Object.entries({ messages:'Messages', photos:'Photos', documents:'Documents', media:'All media', starred:'Starred', pinned:'Pinned' }).map(([value,label]) => <button key={value} type="button" aria-pressed={kind===value} onClick={() => setKind(value)}>{label}</button>)}</div>
      {(kind === 'photos' || kind === 'media') && onOpenVault && (
        <button
          type="button"
          className="library-vault-shortcut-btn"
          onClick={() => {
            onClose();
            onOpenVault();
          }}
        >
          📸 Open in Polaroid Scrapbook (പോളറോയ്ഡ് പ്രണയ ആൽബം)
        </button>
      )}
    </div>
    {(kind==='starred' || kind==='pinned') && <p className="library-description">{kind==='starred'?'Starred messages are saved just for you.':'Pinned messages are visible to everyone in this chat.'}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="library-results" aria-busy={busy}>
      {rows.filter(m=>!hasExpired(m)).map(m => <section key={m.id} className="library-item">
        <div className="library-item-meta"><strong>{m.sender.name}</strong><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString()}</time></div>
        {m.text && <p dir="auto">{m.text}</p>}
        {m.translation?.status==='ready' && m.translation.text!==m.text && <p dir="auto">{m.translation.text}</p>}
        {m.sticker && <p>{stickers[m.sticker]}</p>}
        {m.attachment && <><small>{m.attachment.name}</small><Attachment attachment={m.attachment} onError={setError} /></>}
        <button type="button" className="text-btn" onClick={() => onOpen(m)}>View in chat</button>
        {(kind==='starred' || kind==='pinned') && <button type="button" className="text-btn" disabled={saving!==null} onClick={() => void unsave(m)}>{kind==='starred'?'Unstar':'Unpin'}</button>}
      </section>)}
      {!busy && !error && !rows.length && <p role="status">{query.trim() ? 'No matching items in this chat.' : kind==='messages' ? 'No messages yet.' : 'No shared items in this category yet.'}</p>}
      {busy && <p role="status">Searching…</p>}
      {more && <button type="button" className="secondary" disabled={busy} onClick={() => void loadMore()}>Load more</button>}
    </div>
  </Modal>;
}
