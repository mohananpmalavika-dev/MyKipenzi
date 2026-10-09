import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Camera, ShieldCheck } from 'lucide-react';
import { api } from './api.js';
import { captureNotification, captureShortcut } from '../shared/captureAlerts.js';
import './capture-privacy.css';

const CaptureContext = createContext(null);
export function CaptureGuard({ conversationId, user, active, children }) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(null);
  const viewOnce = useRef(null);
  const cooldown = useRef(new Map());
  const mounted = useRef(false);
  const version = useRef(0);
  const sending = useRef(new Set());
  useEffect(() => {
    mounted.current = true; version.current++; setStatus(''); setPending(null); viewOnce.current = null;
    const current = version;
    return () => { mounted.current = false; current.current++; };
  }, [conversationId, active]);
  const send = useCallback(async input => {
    if (!active || !conversationId || sending.current.has(input.client_id)) return;
    const generation = version.current;
    sending.current.add(input.client_id);
    try {
      await api(`/conversations/${conversationId}/capture-alerts`, { method: 'POST', body: input });
      if (mounted.current && generation === version.current) {
        setPending(null); setStatus('Capture signal shared with your partner.');
      }
    } catch {
      if (mounted.current && generation === version.current) {
        setPending(input); setStatus('Capture signal noticed. The partner alert could not be sent.');
      }
    } finally { sending.current.delete(input.client_id); }
  }, [active, conversationId]);
  useEffect(() => {
    if (!active || !conversationId) return;
    const noticed = event => {
      if (document.hidden || !document.hasFocus()) return;
      const kind = captureShortcut(event);
      if (!kind) return;
      const key = kind + ':' + (viewOnce.current || 'chat');
      if (Date.now() - (cooldown.current.get(key) || 0) < 3000) return;
      cooldown.current.set(key, Date.now());
      void send({ client_id: crypto.randomUUID(), kind, ...(viewOnce.current ? { message_id: viewOnce.current } : {}) });
    };
    document.addEventListener('keydown', noticed);
    document.addEventListener('keyup', noticed);
    return () => { document.removeEventListener('keydown', noticed); document.removeEventListener('keyup', noticed); };
  }, [conversationId, active, send]);
  const register = useCallback(id => {
    viewOnce.current = id;
    return () => { if (viewOnce.current === id) viewOnce.current = null; };
  }, []);
  return <CaptureContext.Provider value={{ conversationId, user, status, pending, retry: () => pending && void send(pending), register }}>{children}</CaptureContext.Provider>;
}
export function useViewOnceCapture(messageId) {
  const controls = useContext(CaptureContext);
  const register = controls?.register;
  useEffect(() => {
    if (register && messageId) return register(messageId);
  }, [register, messageId]);
}
export function CapturePrivacyNotice() {
  const controls = useContext(CaptureContext);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++; setHistory([]); setError('');
    const current = generation;
    return () => { current.current++; };
  }, [controls?.conversationId]);
  if (!controls?.conversationId) return null;
  const load = async event => {
    if (!event.currentTarget.open) return;
    const version = generation.current;
    setLoading(true); setError('');
    try {
      const data = await api(`/conversations/${controls.conversationId}/capture-alerts`);
      if (generation.current === version) setHistory(data.alerts);
    } catch (err) { if (generation.current === version) setError(err.message); }
    finally { if (generation.current === version) setLoading(false); }
  };
  return <details className="capture-privacy-notice" onToggle={event => void load(event)}>
    <summary><ShieldCheck size={14} />Capture alerts<span>Limited on web</span></summary>
    <p>This browser can notice some screenshot/recording shortcuts and screen sharing started in this app. It cannot reliably detect OS screenshots or recordings from other apps. A shortcut alert reports an attempt, not a confirmed capture.</p>
    {controls.status && <p role="status">{controls.status} {controls.pending && <button type="button" onClick={controls.retry}>Retry alert</button>}</p>}
    <h4><Camera size={13} />Recent privacy alerts</h4>
    {loading ? <p>Loading alerts…</p> : error ? <p role="alert">{error}</p> : !history.length ? <p>No reported capture signals yet.</p> : <ul>{history.map(alert => <li key={alert.id}>
      <p>{captureNotification(alert, controls.user.language)?.body}</p>
      <time dateTime={alert.created_at}>{new Date(alert.created_at).toLocaleString()}</time>
    </li>)}</ul>}
  </details>;
}
