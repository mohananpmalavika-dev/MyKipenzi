import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, Pencil, Trash2, X } from 'lucide-react';
import { Modal } from './components.jsx';
import { api } from './api.js';
import { localDateTime, zonedInstant, validateDelivery } from '../shared/scheduling.js';

const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const zones = [...new Set([browserZone, 'UTC', 'Asia/Kolkata', 'Africa/Nairobi', ...(Intl.supportedValuesOf?.('timeZone') || [])])].sort();
const displayTime = (instant, zone) => `${new Intl.DateTimeFormat(undefined, { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(instant))} (${zone})`;

export function ScheduledMessages({ open, onClose, conversationId, draft, source, socket, onScheduled, pushEnabled }) {
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const [zone, setZone] = useState(browserZone);
  const [local, setLocal] = useState('');
  const [reminder, setReminder] = useState(0);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const attempt = useRef(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const load = useCallback(async () => {
    if (!conversationId) return;
    const result = await api(`/conversations/${conversationId}/scheduled`);
    setRows(result.scheduled);
  }, [conversationId]);
  useEffect(() => {
    if (!open || !conversationId) return;
    setText(draftRef.current);
    setZone(browserZone);
    setLocal(localDateTime(Date.now() + 3600000, browserZone));
    setReminder(0);
    setEditing(null);
    setError('');
    setRows([]);
    attempt.current = null;
    setLoading(true);
    void load().catch((error) => setError(error.message)).finally(() => setLoading(false));
    const timer = setInterval(() => { void load().catch((error) => setError(error.message)); }, 15000);
    return () => clearInterval(timer);
  }, [open, conversationId, load]);
  useEffect(() => {
    const changed = (event) => {
      if (event.status === 'sent') setNotice('Your scheduled message was sent.');
      if (event.status === 'failed') setNotice('A scheduled message could not be sent. Open its chat schedules for details.');
      if (open && event.conversation_id === conversationId) void load().catch((error) => setError(error.message));
    };
    const remind = (event) => setNotice(`Message delivery coming up: ${displayTime(event.delivery_at, event.time_zone)}. Open its chat schedules to edit or cancel.`);
    const reconnect = () => { if (open) void load().catch((error) => setError(error.message)); };
    socket?.on('schedule:changed', changed);
    socket?.on('schedule:reminder', remind);
    socket?.on('connect', reconnect);
    return () => {
      socket?.off('schedule:changed', changed);
      socket?.off('schedule:reminder', remind);
      socket?.off('connect', reconnect);
    };
  }, [socket, open, conversationId, load]);

  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const input = { text: text.trim(), source_language: editing?.source_language || source, delivery_at: zonedInstant(local, zone), time_zone: zone, reminder_minutes: reminder };
      validateDelivery(input);
      if (!input.text) throw new Error('Write a message to schedule.');
      if (editing) await api(`/scheduled/${editing.id}`, { method: 'PATCH', body: { ...input, revision: editing.revision } });
      else {
        const fingerprint = JSON.stringify(input);
        if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
        await api(`/conversations/${conversationId}/scheduled`, { method: 'POST', body: { ...input, client_id: attempt.current.id } });
        onScheduled?.(input.text);
      }
      setNotice(editing ? 'Scheduled message updated.' : 'Message scheduled. It will send even when this browser is closed.');
      setEditing(null);
      setText('');
      attempt.current = null;
      await load();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const cancel = async (row) => {
    setBusy(true);
    setError('');
    try {
      await api(`/scheduled/${row.id}`, { method: 'DELETE' });
      if (editing?.id === row.id) { setEditing(null); setText(''); }
      setNotice('Scheduled message cancelled.');
      await load();
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  return <>
    {notice && !open && <div className="schedule-notice" role="status"><Clock size={18} /><span>{notice}</span><button type="button" aria-label="Dismiss schedule notification" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {open && conversationId && <Modal title="Scheduled messages" onClose={onClose}>
      <div className="schedule-panel">
        {notice && <p role="status">{notice}</p>}
        <p className="muted">Schedule a text message. Times use the selected time zone, and delivery continues when you close the app.</p>
        <form className="schedule-form" onSubmit={save}>
          <label>Message<textarea required aria-label="Scheduled message text" maxLength={5000} rows={3} value={text} disabled={busy} onChange={(event) => setText(event.target.value)} /></label>
          <label>Time zone<select aria-label="Delivery time zone" value={zone} disabled={busy} onChange={(event) => {
            const next = event.target.value;
            try { setLocal(localDateTime(zonedInstant(local, zone), next)); } catch { /* Preserve invalid wall time for correction. */ }
            setZone(next);
          }}>{zones.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Delivery date and time<input required aria-label="Delivery date and time" type="datetime-local" value={local} disabled={busy} onChange={(event) => setLocal(event.target.value)} /></label>
          <label>Reminder<select aria-label="Schedule reminder" value={reminder} disabled={busy} onChange={(event) => setReminder(Number(event.target.value))}><option value={0}>No reminder</option>{[5, 15, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes before</option>)}</select></label>
          {reminder > 0 && <small>Reminders appear in the app. {pushEnabled ? 'Device reminders are enabled.' : 'Enable message notifications in Settings for reminders while the app is closed.'}</small>}
          {error && <p className="error" role="alert">{error}</p>}
          <div className="schedule-actions"><button className="primary" disabled={busy || !text.trim()}><Clock size={16} />{busy ? 'Saving…' : editing ? 'Save changes' : 'Schedule message'}</button>{editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setText(''); }}>Stop editing</button>}</div>
        </form>
        <h3>Your scheduled messages</h3>
        {loading ? <p role="status">Loading schedules…</p> : !rows.length ? <p className="muted">No scheduled messages yet.</p> : <ul className="schedule-list">{rows.map((row) => <li key={row.id}>
          <p dir="auto">{row.text}</p><time dateTime={row.delivery_at}>{displayTime(row.delivery_at, row.time_zone)}</time>
          {row.time_zone !== browserZone && <small>Your time: {displayTime(row.delivery_at, browserZone)}</small>}
          <small>{row.status === 'pending' ? 'Scheduled' : row.status === 'sent' ? 'Sent' : row.status === 'failed' ? `Failed: ${row.error}` : 'Cancelled'}{row.reminder_minutes > 0 ? ` · Reminder ${row.reminder_minutes} min before` : ''}</small>
          {row.status === 'pending' && <div className="schedule-actions"><button type="button" disabled={busy} aria-label="Edit scheduled message" onClick={() => { setEditing(row); setText(row.text); setZone(row.time_zone); setLocal(localDateTime(row.delivery_at, row.time_zone)); setReminder(row.reminder_minutes); setError(''); }}><Pencil size={15} />Edit</button><button type="button" disabled={busy} aria-label="Cancel scheduled message" onClick={() => void cancel(row)}><Trash2 size={15} />Cancel</button></div>}
        </li>)}</ul>}
      </div>
    </Modal>}
  </>;
}
