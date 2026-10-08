import { useEffect, useState } from 'react';
import { ArrowRight, LoaderCircle, Search } from 'lucide-react';
import { api } from './api.js';
import { UserSafety } from './UserSafety.jsx';
import { Avatar } from './components.jsx';

function formatLastSeen(lastSeen) {
  if (!lastSeen) return null;
  const now = new Date();
  const then = new Date(lastSeen);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function UserDirectory({ onSelect, connecting, contactError }) {
  const [safety, setSafety] = useState(null);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [users, setUsers] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timeout = setTimeout(async () => {
      try {
        const result = await api(`/users?q=${encodeURIComponent(query.trim())}&offset=${offset}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setUsers(old => offset ? [...old, ...result.users] : result.users);
        setHasMore(result.has_more);
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [query, offset, retry]);
  return (
    <div className="user-directory">
      {safety && <UserSafety person={safety} blocked={safety.blocked_by_me} onClose={() => setSafety(null)} onChanged={() => { setOffset(0); setRetry(v => v + 1); }} />}
      <label className="directory-search">
        <Search size={18} />
        <input aria-label="Search users" placeholder="Search by name or @handle" maxLength={80} value={query} autoFocus onChange={event => { setQuery(event.target.value); setOffset(0); setUsers([]); setHasMore(false); }} />
      </label>
      <div className="directory-list" aria-label="Registered users" aria-busy={loading || connecting}>
        {users.map(person => (
          <div className="directory-entry" key={person.id}><button type="button" className="directory-user" disabled={connecting || person.contact_blocked} aria-label={`Chat with ${person.name} (@${person.handle})`} onClick={() => onSelect(person.handle)}>
            <Avatar person={person} />
            <span>
              <strong>{person.name}</strong>
              <small>
                @{person.handle}
                {person.online === true && <span style={{ color: '#4ade80', marginLeft: '8px' }}>● online</span>}
                {person.online === false && person.last_seen && <span style={{ color: '#94a3b8', marginLeft: '8px' }}>last seen {formatLastSeen(person.last_seen)}</span>}
              </small>
            </span>
            <ArrowRight size={18} />
          </button><button type="button" className="text-btn" onClick={() => setSafety(person)}>{person.blocked_by_me ? 'Blocked · Unblock / report' : 'Block / report'}</button></div>
        ))}
        {loading && <p className="directory-status" role="status"><LoaderCircle className="spin" size={18} />Loading users…</p>}
        {!loading && !error && !users.length && <p className="directory-status">{query ? 'No users match your search.' : 'No other users have registered yet.'}</p>}
      </div>
      {error && <div className="form-error" role="alert"><p>{error}</p><button type="button" className="secondary" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
      {contactError && <p className="form-error" role="alert">{contactError}</p>}
      {connecting && <p className="directory-status" role="status"><LoaderCircle className="spin" size={18} />Opening chat…</p>}
      {hasMore && !error && <button type="button" className="secondary directory-more" disabled={loading || connecting} onClick={() => setOffset(users.length)}>Load more users</button>}
    </div>
  );
}
