import { useEffect, useState } from 'react';
import { api } from './api.js';
import { messagePreview } from '../shared/notifications.js';
import { hasExpired } from '../shared/disappearing.js';

export function MessageThread({ message, revision, onReply }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setBusy(true);
    setError('');
    const load = async () => {
      let after = 0;
      const collected = [];
      for (let i = 0; i <= page; i++) {
        const result = await api('/conversations/' + message.conversation_id + '/threads/' + message.id + '?after=' + after);
        if (!active) return;
        collected.push(...result.messages);
        setMore(result.has_more);
        if (!result.has_more || !result.messages.length) break;
        after = result.messages.at(-1).seq;
      }
      if (active) setRows(collected);
    };
    load().catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [open, page, message.id, message.conversation_id, revision]);
  if (!message.reply_to_id && !message.reply_count) return null;
  const region = 'thread-' + message.id;
  return <div className="message-thread">
    <button type="button" aria-expanded={open} aria-controls={region} onClick={() => setOpen(v => !v)}>
      {open ? 'Collapse thread' : '💬 Expand thread' + (message.reply_count ? ' · ' + message.reply_count + (message.reply_count === 1 ? ' reply' : ' replies') : '')}
    </button>
    {open && <section id={region} aria-label="Message thread" aria-busy={busy}>
      <strong>Thread context</strong>
      {rows.filter(row => !hasExpired(row)).map((row, index) => <article key={row.id} className={row.id === message.id ? 'thread-current' : ''}>
        <small>{index === 0 ? 'Original message · ' : ''}{row.sender?.name} · {new Date(row.created_at).toLocaleString()}</small>
        {row.reply && !hasExpired(row.reply) && <blockquote>Replying to {row.reply.sender}: {row.reply.deleted_at ? 'Message deleted' : row.reply.text || 'Attachment or sticker'}</blockquote>}
        <p dir="auto">{row.deleted_at ? 'Message deleted' : row.translation?.status === 'ready' ? row.translation.text : row.text || messagePreview({ ...row, reply_to_id: null })}</p>
        {onReply && !row.deleted_at && <button type="button" onClick={() => onReply(row)}>Reply to this message</button>}
      </article>)}
      {busy && <p role="status">Loading thread…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setPage(p => p + 1)}>Retry</button></p>}
      {more && !busy && !error && <button type="button" onClick={() => setPage(p => p + 1)}>Load more replies</button>}
    </section>}
  </div>;
}
