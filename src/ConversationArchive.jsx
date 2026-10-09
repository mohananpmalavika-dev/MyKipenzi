import { useState, useEffect } from 'react';
import { Archive, ArchiveX, Inbox, Search, Trash2, AlertCircle } from 'lucide-react';
import { api } from './api.js';
import { Avatar, Modal, ButtonIcon } from './components.jsx';

export function ConversationArchivePanel({ onClose, onOpenConversation }) {
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadArchived();
  }, []);

  const loadArchived = async () => {
    try {
      setLoading(true);
      const result = await api('/conversations/archived');
      setArchived(result.conversations || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (conversationId, event) => {
    event?.stopPropagation();
    try {
      await api(`/conversations/${conversationId}/archive`, { method: 'DELETE' });
      setArchived(archived.filter(c => c.id !== conversationId));
    } catch (e) {
      alert('Failed to unarchive: ' + e.message);
    }
  };

  const filteredArchived = searchQuery.trim()
    ? archived.filter(conv =>
        (conv.is_group ? conv.name : conv.peer?.name)
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : archived;

  return (
    <Modal title="Archived Conversations" onClose={onClose} wide>
      <div className="archive-panel">
        <div className="archive-header">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search archived conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading && (
          <div className="archive-loading">
            <Archive size={48} />
            <p>Loading archived conversations...</p>
          </div>
        )}

        {error && (
          <div className="archive-error" role="alert">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {!loading && archived.length === 0 && (
          <div className="archive-empty">
            <Archive size={64} />
            <h3>No Archived Conversations</h3>
            <p>Conversations you archive will appear here</p>
            <small>Archive helps you organize without deleting</small>
          </div>
        )}

        {!loading && filteredArchived.length === 0 && archived.length > 0 && (
          <div className="archive-empty">
            <Search size={48} />
            <p>No archived conversations match "{searchQuery}"</p>
          </div>
        )}

        <div className="archive-list">
          {filteredArchived.map(conv => (
            <div
              key={conv.id}
              className="archive-item"
              onClick={() => {
                onOpenConversation(conv.id);
                onClose();
              }}
              role="button"
              tabIndex={0}
            >
              <Avatar
                src={
                  conv.is_group
                    ? conv.avatar_id
                      ? `/api/attachments/${conv.avatar_id}/content`
                      : null
                    : conv.peer?.avatar_id
                      ? `/api/attachments/${conv.peer.avatar_id}/content`
                      : null
                }
                name={conv.is_group ? conv.name : conv.peer?.name}
                size={48}
              />

              <div className="archive-item-content">
                <div className="archive-item-header">
                  <span className="conversation-name">
                    {conv.is_group ? conv.name : conv.peer?.name}
                  </span>
                  {conv.unread > 0 && (
                    <span className="unread-badge">{conv.unread}</span>
                  )}
                </div>

                {conv.last_message && (
                  <div className="last-message">
                    {conv.last_message.text || conv.last_message.sticker || '📎 Media'}
                  </div>
                )}

                <div className="archive-item-meta">
                  <span className="archived-date">
                    Archived {new Date(conv.archived_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-icon-small unarchive-btn"
                onClick={(e) => handleUnarchive(conv.id, e)}
                title="Unarchive conversation"
              >
                <ArchiveX size={18} />
              </button>
            </div>
          ))}
        </div>

        {filteredArchived.length > 0 && (
          <div className="archive-footer">
            <small>
              <Inbox size={14} />
              Archived conversations will automatically unarchive when you receive a new message
            </small>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Archive/Unarchive action for conversation
export async function toggleArchive(conversationId, isArchived) {
  if (isArchived) {
    await api(`/conversations/${conversationId}/archive`, { method: 'DELETE' });
    return false;
  } else {
    await api(`/conversations/${conversationId}/archive`, { method: 'PUT' });
    return true;
  }
}
