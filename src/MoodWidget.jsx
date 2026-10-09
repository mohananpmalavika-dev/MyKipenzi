import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Check, LoaderCircle, RefreshCw } from 'lucide-react';
import { api } from './api.js';
import { MOODS, currentMood, getMood, mergeMoodStatus } from '../shared/moods.js';
import './mood-styles.css';

function PersonMood({ name, status }) {
  const mood = getMood(status?.mood);
  return (
    <div className="mood-person">
      <span className="mood-person-emoji" aria-hidden="true">{mood?.emoji || '🤍'}</span>
      <div>
        <span className="mood-person-name" dir="auto">{name}</span>
        <strong>{mood ? mood.label : 'No check-in yet'}</strong>
        {status && <time dateTime={status.updated_at}>{new Date(status.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>}
      </div>
    </div>
  );
}

export function MoodWidget({ conversationId, user, peer, socket, online }) {
  const [statuses, setStatuses] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const busyRef = useRef(false);
  const active = useRef(true);
  const request = useRef(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const data = await api(`/conversations/${conversationId}/moods`, { signal: controller.signal });
      if (!active.current || controller.signal.aborted) return;
      setStatuses(old => data.statuses.reduce(mergeMoodStatus, old));
      setNow(Date.now());
      setError('');
    } catch (err) {
      if (active.current && !controller.signal.aborted) setError(err.message);
    } finally {
      if (active.current && !controller.signal.aborted) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    active.current = true;
    if (online) void load();
    else setLoading(false);
    const changed = status => {
      if (status.conversation_id !== conversationId) return;
      setStatuses(old => mergeMoodStatus(old, status));
      setNow(Date.now());
    };
    const visible = () => {
      setNow(Date.now());
      if (document.visibilityState === 'visible' && navigator.onLine) void load();
    };
    socket?.on('mood:changed', changed);
    socket?.on('connect', load);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active.current = false;
      request.current?.abort();
      socket?.off('mood:changed', changed);
      socket?.off('connect', load);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [conversationId, socket, load, online]);

  useEffect(() => {
    const expiries = statuses.map(s => new Date(s.expires_at).getTime()).filter(t => t > now);
    if (!expiries.length) return;
    const timer = setTimeout(() => {
      setNow(Date.now());
      setConfirmation('');
    }, Math.max(1, Math.min(...expiries) - Date.now() + 100));
    return () => clearTimeout(timer);
  }, [statuses, now]);

  const mine = currentMood(statuses.find(s => s.user_id === user.id), now);
  const theirs = currentMood(statuses.find(s => s.user_id === peer.id), now);
  const share = async mood => {
    if (busyRef.current || !online || mine?.mood === mood) return;
    busyRef.current = true;
    setBusy(mood);
    setError('');
    setConfirmation('');
    try {
      const result = await api(`/conversations/${conversationId}/moods`, { method: 'POST', body: { mood } });
      if (!active.current) return;
      setStatuses(old => mergeMoodStatus(old, result.status));
      setNow(Date.now());
      setConfirmation(result.changed ? `Shared with ${peer.name} 💌` : 'Your mood is already shared 🤍');
    } catch (err) {
      if (active.current) setError(err.message);
    } finally {
      busyRef.current = false;
      if (active.current) setBusy(null);
    }
  };
  return (
    <section className="mood-widget" aria-label="Mood check-in">
      <div className="mood-widget-heading">
        <div><Heart size={15} aria-hidden="true" /><h3>How is your heart today?</h3></div>
        <span>Daily check-in</span>
      </div>
      <div className="mood-people" aria-live="polite">
        <PersonMood name="You" status={mine} language={user.language} />
        <span className="mood-connection" aria-hidden="true">♡</span>
        <PersonMood name={peer.name} status={theirs} language={user.language} />
      </div>
      <div className="mood-options" role="group" aria-label="Share your mood">
        {MOODS.map(mood => (
          <button key={mood.id} type="button"
            className={`mood-option ${mine?.mood === mood.id ? 'is-selected' : ''}`}
            aria-label={`Share mood: ${mood.label}`}
            aria-pressed={mine?.mood === mood.id}
            disabled={loading || !!busy || !online}
            title={mood.hint}
            onClick={() => void share(mood.id)}>
            <span className="mood-option-emoji" aria-hidden="true">{mood.emoji}</span>
            <span>{mood.label}</span>
            {busy === mood.id ? <LoaderCircle size={12} className="spin" aria-hidden="true" /> : mine?.mood === mood.id ? <Check size={12} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      <div className="mood-widget-footer" role="status">
        {loading ? 'Loading your check-ins…' : !online ? 'Connect to share your mood.' : confirmation || (mine ? getMood(mine.mood).hint : 'One little tap to feel a little closer.')}
        <span>Visible for 24 hours</span>
      </div>
      {error && <div className="mood-error" role="alert"><span>{error}</span><button type="button" disabled={!online || loading || !!busy} onClick={() => void load()}><RefreshCw size={12} />Retry</button></div>}
    </section>
  );
}
