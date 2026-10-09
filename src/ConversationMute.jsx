import { useState } from 'react';
import { BellOff, Bell, Clock } from 'lucide-react';
import { api } from './api.js';
import { Modal } from './components.jsx';

const MUTE_DURATIONS = [
  { label: '1 hour', value: 60, icon: '⏰' },
  { label: '8 hours', value: 480, icon: '🌅' },
  { label: '1 day', value: 1440, icon: '📅' },
  { label: '1 week', value: 10080, icon: '📆' },
  { label: 'Forever', value: null, icon: '∞' },
];

export function MuteConversationModal({ conversationId, onClose, onMute }) {
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [muting, setMuting] = useState(false);

  const handleMute = async () => {
    try {
      setMuting(true);
      const minutes = showCustom ? parseInt(customMinutes, 10) : selectedDuration;

      if (showCustom && (!minutes || minutes < 1)) {
        alert('Please enter a valid duration in minutes');
        return;
      }

      await api(`/conversations/${conversationId}/mute`, {
        method: 'PUT',
        body: { duration_minutes: minutes },
      });

      onMute(minutes);
      onClose();
    } catch (e) {
      alert('Failed to mute: ' + e.message);
    } finally {
      setMuting(false);
    }
  };

  return (
    <Modal title="Mute Notifications" onClose={onClose}>
      <div className="mute-modal">
        <div className="mute-icon">
          <BellOff size={48} />
        </div>

        <p className="mute-description">
          You'll still receive messages, but won't get notifications for this conversation
        </p>

        <div className="mute-durations">
          {MUTE_DURATIONS.map(duration => (
            <button
              key={duration.value || 'forever'}
              className={`mute-duration-option ${selectedDuration === duration.value && !showCustom ? 'selected' : ''}`}
              onClick={() => {
                setSelectedDuration(duration.value);
                setShowCustom(false);
              }}
              type="button"
            >
              <span className="duration-icon">{duration.icon}</span>
              <span className="duration-label">{duration.label}</span>
            </button>
          ))}

          <button
            className={`mute-duration-option ${showCustom ? 'selected' : ''}`}
            onClick={() => setShowCustom(true)}
            type="button"
          >
            <Clock size={24} />
            <span className="duration-label">Custom</span>
          </button>
        </div>

        {showCustom && (
          <div className="custom-duration">
            <label>
              Duration in minutes
              <input
                type="number"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="e.g., 120"
                min="1"
                max="525600"
                autoFocus
              />
            </label>
            <small>Max: 525,600 minutes (1 year)</small>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={muting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleMute}
            disabled={muting || (!showCustom && selectedDuration === null)}
          >
            {muting ? 'Muting...' : 'Mute Notifications'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function UnmuteButton({ conversationId, onUnmute }) {
  const [unmuting, setUnmuting] = useState(false);

  const handleUnmute = async () => {
    try {
      setUnmuting(true);
      await api(`/conversations/${conversationId}/mute`, { method: 'DELETE' });
      onUnmute();
    } catch (e) {
      alert('Failed to unmute: ' + e.message);
    } finally {
      setUnmuting(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-unmute"
      onClick={handleUnmute}
      disabled={unmuting}
      title="Unmute notifications"
    >
      <Bell size={18} />
      {unmuting ? 'Unmuting...' : 'Unmute'}
    </button>
  );
}

// Helper to check if conversation is muted
export function isMuted(conversation) {
  if (!conversation.muted_until) return false;
  if (conversation.muted_until === 'forever') return true;
  return new Date(conversation.muted_until) > new Date();
}

// Helper to format mute duration
export function formatMutedUntil(mutedUntil) {
  if (mutedUntil === 'forever') return 'Muted forever';
  
  const until = new Date(mutedUntil);
  const now = new Date();
  const diffMs = until - now;
  
  if (diffMs <= 0) return 'Mute expired';
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `Muted for ${diffMins}m`;
  if (diffHours < 24) return `Muted for ${diffHours}h`;
  if (diffDays === 1) return 'Muted until tomorrow';
  if (diffDays < 7) return `Muted for ${diffDays}d`;
  
  return `Muted until ${until.toLocaleDateString()}`;
}
