import { useEffect, useState } from 'react';
import { Check, LockKeyhole, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import './decoy-styles.css';

const STARTER_ITEMS = [
  { id: 'milk', text: 'Milk', done: false },
  { id: 'bread', text: 'Bread', done: false },
  { id: 'bananas', text: 'Bananas', done: true },
  { id: 'rice', text: 'Rice', done: false },
  { id: 'coffee', text: 'Coffee', done: false },
];
function loadItems(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem('kipenzi-lists:' + userId));
    if (Array.isArray(saved) && saved.length <= 100 && saved.every(i =>
      typeof i.id === 'string' && typeof i.text === 'string' && i.text.length <= 120 && typeof i.done === 'boolean')) return saved;
  } catch { /* Start with the ordinary list when storage is unavailable. */ }
  return STARTER_ITEMS;
}
export function DecoyLists({ userId, onLock }) {
  const [items, setItems] = useState(() => loadItems(userId));
  const [draft, setDraft] = useState('');
  useEffect(() => {
    const title = document.title;
    const favicon = document.querySelector('link[rel*="icon"]');
    const icon = favicon?.getAttribute('href');
    document.title = 'My Lists';
    if (favicon) favicon.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛒</text></svg>');
    return () => { document.title = title; if (favicon && icon) favicon.setAttribute('href', icon); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem('kipenzi-lists:' + userId, JSON.stringify(items)); } catch { /* The list remains usable. */ }
  }, [items, userId]);
  const add = event => {
    event.preventDefault();
    if (!draft.trim() || items.length >= 100) return;
    setItems(old => [...old, { id: crypto.randomUUID(), text: draft.trim(), done: false }]);
    setDraft('');
  };
  return <main className="decoy-lists">
    <header className="lists-header">
      <span><ShoppingBasket size={23} /><strong>My Lists</strong></span>
      <button type="button" aria-label="Lock lists" onClick={onLock}><LockKeyhole size={20} /></button>
    </header>
    <section className="lists-content" aria-label="Shopping list">
      <span className="lists-eyebrow">A LITTLE PLANNING GOES A LONG WAY</span>
      <h1>Groceries</h1><p>A few things for the week ahead.</p>
      <div className="lists-progress"><span>{items.filter(i => i.done).length} of {items.length} picked up</span><span>Weekly essentials</span></div>
      <ul>{items.map(item => <li key={item.id}>
        <button type="button" className={'lists-item ' + (item.done ? 'is-done' : '')} aria-pressed={item.done} onClick={() => setItems(old => old.map(i => i.id === item.id ? { ...i, done: !i.done } : i))}>
          <span className="lists-check">{item.done && <Check size={15} />}</span><span>{item.text}</span>
        </button>
        <button type="button" className="lists-remove" aria-label={'Remove ' + item.text} onClick={() => setItems(old => old.filter(i => i.id !== item.id))}><Trash2 size={16} /></button>
      </li>)}</ul>
      {!items.length && <p className="lists-empty">All clear. Add something to your list.</p>}
      <form onSubmit={add}><input aria-label="Add grocery item" placeholder="Add an item…" value={draft} onChange={e => setDraft(e.target.value)} maxLength={120} /><button type="submit" aria-label="Add item" disabled={!draft.trim() || items.length >= 100}><Plus size={21} /></button></form>
      <footer>Small plans. Easier days.</footer>
    </section>
  </main>;
}
