import { useState } from 'react';
import { ArrowRight, HeartHandshake, Search, Sparkles, X } from 'lucide-react';
import { Modal } from './components.jsx';

const categories = ['All', 'Hang out', 'Make memories', 'Show up', 'Chat essentials'];

export function FeatureDirectory({ actions, person, onConnect, compact = false, onChoose }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const visible = actions.filter(action =>
    (category === 'All' || action.category === category) &&
    `${action.title} ${action.description} ${action.category}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className={`feature-directory ${compact ? 'compact' : ''}`}>
      <div className="together-intro">
        <span className="eyebrow dark"><Sparkles size={13} /> LITTLE THINGS. BIG FRIENDSHIP.</span>
        <h2>More ways to <em>be there.</em></h2>
        <p>{person ? `Make a little time for ${person.name}. Pick something to do together.` : 'Your inside jokes, shared playlists, and everyday check-ins belong here.'}</p>
      </div>
      {!person && <div className="friendship-connect"><HeartHandshake size={24} /><span><strong>Every good story starts with a hello.</strong><small>Select a conversation to unlock activities, or find your people.</small></span><button type="button" className="primary compact" onClick={onConnect}>Find a friend <ArrowRight size={16} /></button></div>}
      <label className="feature-search"><Search size={18} /><input aria-label="Search friendship features" placeholder="Find your next little moment…" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Clear feature search" onClick={() => setQuery('')}><X size={16} /></button>}</label>
      <div className="feature-categories" aria-label="Feature categories">{categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="feature-results-heading"><strong>{category === 'All' ? 'Your friendship toolkit' : category}</strong><span>{visible.length} {visible.length === 1 ? 'feature' : 'features'}</span></div>
      <div className="friendship-feature-grid">{visible.map(action => {
        const Icon = action.icon;
        return <button key={action.id} type="button" className={`friendship-feature-card tone-${action.tone || 'plum'}`} disabled={action.disabled} onClick={() => { onChoose?.(); action.onClick(); }}>
          <span className="feature-card-icon"><Icon size={23} strokeWidth={1.7} /></span>
          <span className="feature-card-copy"><small>{action.category}</small><strong>{action.title}</strong><span>{action.description}</span>{action.disabled && <span className="feature-unavailable">{action.reason || 'Choose a conversation to begin'}</span>}</span>
          <ArrowRight size={16} className="feature-card-arrow" />
        </button>;
      })}</div>
      {!visible.length && <div className="feature-empty"><Search size={28} /><h3>No features found</h3><p>Try another word or explore a different category.</p><button type="button" className="text-btn" onClick={() => { setQuery(''); setCategory('All'); }}>Show all features</button></div>}
    </div>
  );
}

export function TogetherExplorer({ onClose, ...props }) {
  return <Modal wide title="Together · Your friendship toolkit" onClose={onClose}><FeatureDirectory compact onChoose={onClose} {...props} /></Modal>;
}

export function FriendshipDock({ actions, person, onExplore, onConnect }) {
  const picks = ['prompt', 'music', 'games', 'vault'].map(id => actions.find(action => action.id === id)).filter(Boolean);
  return <aside className="friendship-dock" aria-label="Friendship space">
    <div className="dock-heading"><HeartHandshake size={20} /><strong>Our little world</strong><span>✳</span></div>
    <div className="friendship-note"><span className="note-label">THE RIDE-OR-DIE CLUB</span><div className="friendship-symbol" aria-hidden="true">you <HeartHandshake size={44} strokeWidth={1.3} /> me</div><h2>Same team.<br /><em>Every day.</em></h2><p>{person ? `A little space for you and ${person.name}. For the big days, and the beautifully ordinary ones.` : 'For the people who feel like home. Distance has nothing on a friendship like this.'}</p></div>
    <div className="dock-section-title"><strong>Make a moment</strong><Sparkles size={16} /></div>
    <div className="dock-activities">{picks.map(action => { const Icon = action.icon; return <button key={action.id} type="button" disabled={action.disabled} onClick={action.onClick}><span className={`dock-icon tone-${action.tone}`}><Icon size={20} /></span><span><strong>{action.title}</strong><small>{action.description}</small></span><ArrowRight size={15} /></button>; })}</div>
    <button type="button" className="explore-link" onClick={onExplore}>Explore all features <ArrowRight size={16} /></button>
    <div className="friendship-footer"><HeartHandshake size={19} /><p>Show up. Laugh loud.<br /><strong>Stay in each other’s corner.</strong></p></div>
    {!person && <button type="button" className="secondary" onClick={onConnect}>Find your people</button>}
  </aside>;
}
