import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Edit2, TrendingUp, X } from 'lucide-react';
import { api } from './api.js';
import { Modal, ButtonIcon } from './components.jsx';

const DEFAULT_CATEGORIES = [
  { id: 'greetings', name: 'Greetings', emoji: '👋' },
  { id: 'love', name: 'Love & Romance', emoji: '❤️' },
  { id: 'questions', name: 'Questions', emoji: '❓' },
  { id: 'goodnight', name: 'Goodnight', emoji: '🌙' },
  { id: 'funny', name: 'Funny', emoji: '😂' },
  { id: 'support', name: 'Support', emoji: '🤗' },
  { id: 'plans', name: 'Making Plans', emoji: '📅' },
  { id: 'other', name: 'Other', emoji: '💬' },
];

export function QuickRepliesPanel({ onSelect, onClose }) {
  const [replies, setReplies] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadReplies();
  }, []);

  const loadReplies = async () => {
    try {
      setLoading(true);
      const result = await api('/quick-replies');
      setReplies(result.replies || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (reply) => {
    try {
      // Increment usage count
      await api(`/quick-replies/${reply.id}/use`, { method: 'POST' });
      onSelect(reply.text);
    } catch (e) {
      // Still select even if usage count fails
      onSelect(reply.text);
    }
  };

  const handleDelete = async (replyId, event) => {
    event.stopPropagation();
    if (!confirm('Delete this quick reply?')) return;

    try {
      await api(`/quick-replies/${replyId}`, { method: 'DELETE' });
      setReplies(replies.filter(r => r.id !== replyId));
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    }
  };

  const filteredReplies = selectedCategory === 'all'
    ? replies
    : replies.filter(r => r.category === selectedCategory);

  const sortedReplies = [...filteredReplies].sort((a, b) => b.usage_count - a.usage_count);

  return (
    <div className="quick-replies-panel">
      <div className="quick-replies-header">
        <h3>
          <MessageSquare size={20} />
          Quick Replies
        </h3>
        <div className="quick-replies-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={() => setShowAdd(true)}
            title="Add new template"
          >
            <Plus size={18} />
          </button>
          <ButtonIcon icon={X} onClick={onClose} label="Close" />
        </div>
      </div>

      <div className="quick-replies-categories">
        <button
          className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          All
        </button>
        {DEFAULT_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span>{cat.emoji}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="quick-replies-loading">Loading templates...</div>
      )}

      {error && (
        <div className="quick-replies-error" role="alert">
          {error}
        </div>
      )}

      {!loading && sortedReplies.length === 0 && (
        <div className="quick-replies-empty">
          <MessageSquare size={48} />
          <p>No quick replies yet</p>
          <small>Create templates for messages you send often</small>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={18} />
            Create Your First Template
          </button>
        </div>
      )}

      <div className="quick-replies-list">
        {sortedReplies.map(reply => (
          <div
            key={reply.id}
            className="quick-reply-item"
            onClick={() => handleSelect(reply)}
            role="button"
            tabIndex={0}
          >
            <div className="quick-reply-content">
              <span className="quick-reply-category-badge">
                {DEFAULT_CATEGORIES.find(c => c.id === reply.category)?.emoji || '💬'}
              </span>
              <p dir="auto">{reply.text}</p>
            </div>
            <div className="quick-reply-meta">
              {reply.usage_count > 0 && (
                <span className="usage-count" title={`Used ${reply.usage_count} times`}>
                  <TrendingUp size={14} />
                  {reply.usage_count}
                </span>
              )}
              <button
                type="button"
                className="btn-icon-small"
                onClick={(e) => handleDelete(reply.id, e)}
                title="Delete template"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <AddQuickReplyModal
          onClose={() => setShowAdd(false)}
          onAdd={(newReply) => {
            setReplies([newReply, ...replies]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function AddQuickReplyModal({ onClose, onAdd }) {
  const [category, setCategory] = useState('greetings');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const result = await api('/quick-replies', {
        method: 'POST',
        body: { category, text: text.trim() },
      });
      onAdd(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create Quick Reply" onClose={onClose}>
      <form onSubmit={handleSubmit} className="quick-reply-form">
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {DEFAULT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Message Template
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your frequently used message..."
            maxLength={500}
            rows={4}
            required
            autoFocus
          />
          <small>{text.length}/500 characters</small>
        </label>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Quick Replies Button Component for Message Input
export function QuickRepliesButton({ onSelect }) {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <ButtonIcon
        icon={MessageSquare}
        onClick={() => setShowPanel(true)}
        label="Quick replies"
        title="Insert quick reply"
      />
      {showPanel && (
        <QuickRepliesPanel
          onSelect={(text) => {
            onSelect(text);
            setShowPanel(false);
          }}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  );
}
