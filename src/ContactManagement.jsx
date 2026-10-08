import { useEffect, useState } from 'react';
import { 
  Star, StarOff, Tag, Plus, Edit2, Trash2, Download, 
  Upload, StickyNote, Search, X, ChevronDown, ChevronRight,
  UserPlus, Check, AlertCircle, LoaderCircle 
} from 'lucide-react';
import { api } from './api.js';
import { Avatar } from './components.jsx';

function formatLastContacted(date) {
  if (!date) return 'Never';
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return then.toLocaleDateString();
}

function LabelBadge({ label, onRemove }) {
  return (
    <span
      className="contact-label-badge"
      style={{ 
        backgroundColor: label.color || '#64748b',
        color: '#fff',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        margin: '2px'
      }}
    >
      {label.icon && <span>{label.icon}</span>}
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label={`Remove ${label.name} label`}
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}

function LabelManager({ userId, onClose }) {
  const [labels, setLabels] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6', icon: '📁' });

  useEffect(() => {
    loadLabels();
  }, []);

  async function loadLabels() {
    try {
      setLoading(true);
      const data = await api('/contacts/labels');
      setLabels(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLabel() {
    if (!formData.name.trim()) return;
    try {
      setError('');
      const newLabel = await api('/contacts/labels', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setLabels([...labels, newLabel]);
      setFormData({ name: '', color: '#3b82f6', icon: '📁' });
      setIsCreating(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateLabel() {
    if (!editingLabel || !formData.name.trim()) return;
    try {
      setError('');
      const updated = await api(`/contacts/labels/${editingLabel.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });
      setLabels(labels.map(l => l.id === updated.id ? updated : l));
      setEditingLabel(null);
      setFormData({ name: '', color: '#3b82f6', icon: '📁' });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteLabel(labelId) {
    if (!confirm('Delete this label? Contacts will not be deleted.')) return;
    try {
      await api(`/contacts/labels/${labelId}`, { method: 'DELETE' });
      setLabels(labels.filter(l => l.id !== labelId));
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(label) {
    setEditingLabel(label);
    setFormData({ name: label.name, color: label.color || '#3b82f6', icon: label.icon || '📁' });
    setIsCreating(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <header className="modal-header">
          <h2>Manage Labels</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div style={{ padding: '16px' }}>
          {error && <p className="form-error" role="alert">{error}</p>}

          {loading ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>
              <LoaderCircle className="spin" size={24} /> Loading labels...
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                {labels.map(label => (
                  <div key={label.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '8px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <span style={{ fontSize: '20px' }}>{label.icon || '📁'}</span>
                    <div style={{ flex: 1 }}>
                      <strong>{label.name}</strong>
                      <small style={{ display: 'block', color: '#6b7280' }}>
                        {label.member_count} {label.member_count === 1 ? 'contact' : 'contacts'}
                      </small>
                    </div>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: label.color || '#64748b'
                    }} />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => startEdit(label)}
                      aria-label="Edit label"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleDeleteLabel(label.id)}
                      aria-label="Delete label"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {(isCreating || editingLabel) && (
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <h3 style={{ marginBottom: '12px' }}>
                    {editingLabel ? 'Edit Label' : 'New Label'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Label name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      maxLength={40}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Icon (emoji)"
                        value={formData.icon}
                        onChange={e => setFormData({ ...formData, icon: e.target.value })}
                        maxLength={10}
                        style={{ width: '80px' }}
                      />
                      <input
                        type="color"
                        value={formData.color}
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        style={{ width: '60px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="primary"
                        onClick={editingLabel ? handleUpdateLabel : handleCreateLabel}
                      >
                        {editingLabel ? 'Update' : 'Create'}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setIsCreating(false);
                          setEditingLabel(null);
                          setFormData({ name: '', color: '#3b82f6', icon: '📁' });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isCreating && !editingLabel && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsCreating(true)}
                  style={{ width: '100%' }}
                >
                  <Plus size={18} /> Create New Label
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactNoteModal({ contact, onClose, onSaved }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNote();
  }, [contact.id]);

  async function loadNote() {
    try {
      const data = await api(`/contacts/${contact.id}/note`);
      setNote(data.note || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError('');
      await api(`/contacts/${contact.id}/note`, {
        method: 'PUT',
        body: JSON.stringify({ note: note.trim() })
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <header className="modal-header">
          <h2>Note for {contact.name}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div style={{ padding: '16px' }}>
          {error && <p className="form-error" role="alert">{error}</p>}
          
          {loading ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>
              <LoaderCircle className="spin" size={24} />
            </p>
          ) : (
            <>
              <textarea
                placeholder="Add a private note about this contact..."
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={5000}
                rows={6}
                style={{ width: '100%', marginBottom: '12px' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <LoaderCircle className="spin" size={18} /> : <Check size={18} />}
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AddLabelsModal({ contact, allLabels, onClose, onUpdate }) {
  const [selectedLabels, setSelectedLabels] = useState(new Set(contact.labels.map(l => l.id)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleToggleLabel(labelId) {
    const isSelected = selectedLabels.has(labelId);
    try {
      setSaving(true);
      setError('');
      
      if (isSelected) {
        await api(`/contacts/labels/${labelId}/members/${contact.id}`, { method: 'DELETE' });
        setSelectedLabels(prev => {
          const next = new Set(prev);
          next.delete(labelId);
          return next;
        });
      } else {
        await api(`/contacts/labels/${labelId}/members/${contact.id}`, { method: 'PUT' });
        setSelectedLabels(prev => new Set(prev).add(labelId));
      }
      
      onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <header className="modal-header">
          <h2>Labels for {contact.name}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div style={{ padding: '16px' }}>
          {error && <p className="form-error" role="alert">{error}</p>}
          
          {allLabels.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              No labels yet. Create labels to organize your contacts.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allLabels.map(label => {
                const isSelected = selectedLabels.has(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleToggleLabel(label.id)}
                    disabled={saving}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      border: `2px solid ${isSelected ? label.color || '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      backgroundColor: isSelected ? `${label.color || '#3b82f6'}10` : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{label.icon || '📁'}</span>
                    <span style={{ flex: 1, fontWeight: isSelected ? '600' : '400' }}>
                      {label.name}
                    </span>
                    {isSelected && <Check size={20} style={{ color: label.color || '#3b82f6' }} />}
                  </button>
                );
              })}
            </div>
          )}
          
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            style={{ width: '100%', marginTop: '16px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContactManagement({ onSelectContact }) {
  const [contacts, setContacts] = useState([]);
  const [labels, setLabels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [noteModalContact, setNoteModalContact] = useState(null);
  const [labelsModalContact, setLabelsModalContact] = useState(null);
  const [expandedLabels, setExpandedLabels] = useState(true);

  useEffect(() => {
    loadLabels();
  }, []);

  useEffect(() => {
    loadContacts();
  }, [searchQuery, selectedLabel, favoriteOnly]);

  async function loadLabels() {
    try {
      const data = await api('/contacts/labels');
      setLabels(data);
    } catch (err) {
      console.error('Failed to load labels:', err);
    }
  }

  async function loadContacts() {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        search: searchQuery,
        favorite_only: favoriteOnly,
        offset: offset,
        limit: 50
      });
      if (selectedLabel) params.set('label_id', selectedLabel);
      
      const data = await api(`/contacts?${params}`);
      setContacts(offset === 0 ? data.contacts : [...contacts, ...data.contacts]);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFavorite(contact) {
    try {
      await api(`/contacts/${contact.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_favorite: !contact.is_favorite })
      });
      loadContacts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveContact(contact) {
    if (!confirm(`Remove ${contact.name} from your contacts?`)) return;
    try {
      await api(`/contacts/${contact.id}`, { method: 'DELETE' });
      setContacts(contacts.filter(c => c.id !== contact.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExport(format) {
    try {
      const response = await fetch(`/api/contacts/export?format=${format}`, {
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kipenzi-contacts.${format === 'vcard' ? 'vcf' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="contact-management" style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar with labels */}
      <div style={{ 
        width: '250px', 
        borderRight: '1px solid #e5e7eb',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={18} />
          Organize
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className={!selectedLabel && !favoriteOnly ? 'secondary active' : 'secondary'}
            onClick={() => { setSelectedLabel(null); setFavoriteOnly(false); setOffset(0); }}
            style={{ width: '100%', marginBottom: '4px', justifyContent: 'flex-start' }}
          >
            All Contacts
          </button>
          <button
            type="button"
            className={favoriteOnly ? 'secondary active' : 'secondary'}
            onClick={() => { setFavoriteOnly(!favoriteOnly); setSelectedLabel(null); setOffset(0); }}
            style={{ width: '100%', marginBottom: '4px', justifyContent: 'flex-start' }}
          >
            <Star size={16} /> Favorites
          </button>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setExpandedLabels(!expandedLabels)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              padding: '4px 0',
              fontWeight: '600'
            }}
          >
            {expandedLabels ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Labels ({labels.length})
          </button>
        </div>

        {expandedLabels && (
          <div style={{ marginBottom: '16px' }}>
            {labels.map(label => (
              <button
                key={label.id}
                type="button"
                className={selectedLabel === label.id ? 'secondary active' : 'secondary'}
                onClick={() => { setSelectedLabel(label.id); setFavoriteOnly(false); setOffset(0); }}
                style={{
                  width: '100%',
                  marginBottom: '4px',
                  justifyContent: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{label.icon || '📁'}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{label.name}</span>
                <span style={{ 
                  fontSize: '12px', 
                  backgroundColor: '#e5e7eb', 
                  padding: '2px 6px', 
                  borderRadius: '10px' 
                }}>
                  {label.member_count}
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="secondary"
          onClick={() => setShowLabelManager(true)}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          <Edit2 size={16} /> Manage Labels
        </button>

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>Export</h4>
          <button
            type="button"
            className="secondary"
            onClick={() => handleExport('json')}
            style={{ width: '100%', marginBottom: '4px', fontSize: '13px' }}
          >
            <Download size={14} /> JSON
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => handleExport('csv')}
            style={{ width: '100%', marginBottom: '4px', fontSize: '13px' }}
          >
            <Download size={14} /> CSV
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => handleExport('vcard')}
            style={{ width: '100%', fontSize: '13px' }}
          >
            <Download size={14} /> vCard
          </button>
        </div>
      </div>

      {/* Main contact list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <label className="directory-search" style={{ marginBottom: 0 }}>
            <Search size={18} />
            <input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setOffset(0); }}
              maxLength={80}
            />
          </label>
        </div>

        {error && <p className="form-error" role="alert" style={{ margin: '16px' }}>{error}</p>}

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading && contacts.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>
              <LoaderCircle className="spin" size={24} /> Loading contacts...
            </p>
          ) : contacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <UserPlus size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No contacts yet</p>
              <p style={{ fontSize: '14px' }}>Start a conversation to add contacts</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: '12px' }}>
                {contacts.map(contact => (
                  <div
                    key={contact.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <Avatar person={contact} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '16px' }}>
                          {contact.nickname || contact.name}
                        </strong>
                        {contact.is_favorite && <Star size={14} fill="#fbbf24" color="#fbbf24" />}
                      </div>
                      {contact.nickname && (
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                          {contact.name} · @{contact.handle}
                        </p>
                      )}
                      {!contact.nickname && (
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                          @{contact.handle}
                        </p>
                      )}
                      {contact.online !== null && (
                        <p style={{ fontSize: '12px', color: contact.online ? '#10b981' : '#6b7280' }}>
                          {contact.online ? '● Online' : `Last contacted: ${formatLastContacted(contact.last_contacted_at)}`}
                        </p>
                      )}
                      {contact.note && (
                        <p style={{ 
                          fontSize: '13px', 
                          marginTop: '8px', 
                          padding: '8px', 
                          backgroundColor: '#fef3c7',
                          borderRadius: '4px',
                          fontStyle: 'italic'
                        }}>
                          <StickyNote size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {contact.note.length > 100 ? `${contact.note.slice(0, 100)}...` : contact.note}
                        </p>
                      )}
                      {contact.labels.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          {contact.labels.map(label => (
                            <LabelBadge key={label.id} label={label} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleToggleFavorite(contact)}
                        aria-label={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {contact.is_favorite ? <StarOff size={18} /> : <Star size={18} />}
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setLabelsModalContact(contact)}
                        aria-label="Manage labels"
                        title="Manage labels"
                      >
                        <Tag size={18} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setNoteModalContact(contact)}
                        aria-label="Edit note"
                        title="Edit note"
                      >
                        <StickyNote size={18} />
                      </button>
                      {contact.has_conversation && onSelectContact && (
                        <button
                          type="button"
                          className="primary"
                          onClick={() => onSelectContact(contact.handle)}
                          style={{ fontSize: '13px', padding: '4px 8px' }}
                        >
                          Chat
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {hasMore && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => { setOffset(contacts.length); loadContacts(); }}
                  disabled={loading}
                  style={{ width: '100%', marginTop: '16px' }}
                >
                  {loading ? <LoaderCircle className="spin" size={18} /> : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showLabelManager && (
        <LabelManager
          userId="current"
          onClose={() => {
            setShowLabelManager(false);
            loadLabels();
            loadContacts();
          }}
        />
      )}

      {noteModalContact && (
        <ContactNoteModal
          contact={noteModalContact}
          onClose={() => setNoteModalContact(null)}
          onSaved={loadContacts}
        />
      )}

      {labelsModalContact && (
        <AddLabelsModal
          contact={labelsModalContact}
          allLabels={labels}
          onClose={() => setLabelsModalContact(null)}
          onUpdate={loadContacts}
        />
      )}
    </div>
  );
}
