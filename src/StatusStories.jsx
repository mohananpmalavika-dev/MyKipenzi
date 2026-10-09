import { useState, useEffect, useRef } from 'react';
import { Plus, X, Eye, Camera, Type, Palette, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from './api.js';
import { Avatar, Modal, ButtonIcon } from './components.jsx';

const STATUS_BACKGROUNDS = [
  { color: '#667eea', name: 'Purple' },
  { color: '#f093fb', name: 'Pink' },
  { color: '#fa709a', name: 'Rose' },
  { color: '#fee140', name: 'Yellow' },
  { color: '#30cfd0', name: 'Cyan' },
  { color: '#a8edea', name: 'Mint' },
  { color: '#ff9a9e', name: 'Peach' },
  { color: '#fbc2eb', name: 'Lavender' },
  { color: '#84fab0', name: 'Green' },
  { color: '#ffecd2', name: 'Cream' },
];

export function StatusRing({ user, onClick, hasActiveStatus }) {
  return (
    <div
      className={`status-ring ${hasActiveStatus ? 'has-status' : 'add-status'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      title={hasActiveStatus ? `View ${user.name}'s status` : 'Add status'}
    >
      <Avatar
        src={user.avatar_id ? `/api/attachments/${user.avatar_id}/content` : null}
        name={user.name}
        size={56}
      />
      {!hasActiveStatus && (
        <div className="status-add-icon">
          <Plus size={16} />
        </div>
      )}
    </div>
  );
}

export function StatusViewer({ initialStatusList, currentUserId, onClose }) {
  const [statusList, setStatusList] = useState(initialStatusList);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressInterval = useRef(null);
  const currentStatus = statusList[currentIndex];

  useEffect(() => {
    if (!currentStatus || paused) return;

    const duration = currentStatus.content_type === 'text' ? 5000 : 10000;
    const interval = 50;
    let elapsed = 0;

    progressInterval.current = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);

      if (elapsed >= duration) {
        handleNext();
      }
    }, interval);

    // Mark as viewed
    if (currentStatus.user_id !== currentUserId) {
      api(`/status/${currentStatus.id}/view`, { method: 'POST' }).catch(() => {});
    }

    return () => {
      clearInterval(progressInterval.current);
    };
  }, [currentIndex, paused, currentStatus]);

  const handleNext = () => {
    if (currentIndex < statusList.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handlePauseResume = () => {
    setPaused(!paused);
  };

  if (!currentStatus) return null;

  return (
    <div className="status-viewer" onClick={handlePauseResume}>
      <div className="status-header">
        <div className="status-progress-bars">
          {statusList.map((_, index) => (
            <div key={index} className="status-progress-bar">
              <div
                className="status-progress-fill"
                style={{
                  width:
                    index < currentIndex
                      ? '100%'
                      : index === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="status-author">
          <Avatar
            src={
              currentStatus.avatar_id
                ? `/api/attachments/${currentStatus.avatar_id}/content`
                : null
            }
            name={currentStatus.user_name}
            size={36}
          />
          <div className="status-author-info">
            <span className="status-author-name">{currentStatus.user_name}</span>
            <span className="status-time">
              {formatStatusTime(currentStatus.created_at)}
            </span>
          </div>
          <ButtonIcon icon={X} onClick={onClose} label="Close" />
        </div>
      </div>

      <div className="status-content">
        {currentStatus.content_type === 'text' && (
          <div
            className="status-text"
            style={{ backgroundColor: currentStatus.background_color }}
          >
            <p dir="auto">{currentStatus.text}</p>
          </div>
        )}

        {currentStatus.content_type === 'photo' && (
          <div className="status-photo">
            <img
              src={`/api/attachments/${currentStatus.attachment_id}/content`}
              alt="Status"
            />
            {currentStatus.text && (
              <div className="status-caption">
                <p dir="auto">{currentStatus.text}</p>
              </div>
            )}
          </div>
        )}

        {currentStatus.content_type === 'video' && (
          <div className="status-video">
            <video
              src={`/api/attachments/${currentStatus.attachment_id}/content`}
              controls
              autoPlay
              playsInline
            />
            {currentStatus.text && (
              <div className="status-caption">
                <p dir="auto">{currentStatus.text}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="status-navigation">
        {currentIndex > 0 && (
          <button className="status-nav-btn prev" onClick={handlePrev}>
            <ChevronLeft size={24} />
          </button>
        )}
        {currentIndex < statusList.length - 1 && (
          <button className="status-nav-btn next" onClick={handleNext}>
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {currentStatus.user_id === currentUserId && (
        <div className="status-footer">
          <button
            className="status-views-btn"
            onClick={(e) => {
              e.stopPropagation();
              // Open views modal
            }}
          >
            <Eye size={16} />
            {currentStatus.views_count} views
          </button>
        </div>
      )}
    </div>
  );
}

export function CreateStatusModal({ onClose, onCreated }) {
  const [contentType, setContentType] = useState('text');
  const [text, setText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(STATUS_BACKGROUNDS[0].color);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Please select an image or video');
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError('File must be less than 25MB');
      return;
    }

    setFile(selectedFile);
    setContentType(isImage ? 'photo' : 'video');
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);
      setError('');

      let attachmentId = null;

      // Upload media if present
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'status');

        const uploadResult = await api('/status/upload', {
          method: 'POST',
          body: formData,
          headers: {}, // Let browser set Content-Type with boundary
        });
        attachmentId = uploadResult.id;
      }

      // Create status
      const result = await api('/status', {
        method: 'POST',
        body: {
          content_type: contentType,
          text: text.trim() || null,
          attachment_id: attachmentId,
          background_color: contentType === 'text' ? backgroundColor : null,
        },
      });

      onCreated(result);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="Create Status" onClose={onClose}>
      <div className="create-status-modal">
        <div className="status-type-selector">
          <button
            className={`type-btn ${contentType === 'text' ? 'active' : ''}`}
            onClick={() => {
              setContentType('text');
              setFile(null);
              setPreview(null);
            }}
          >
            <Type size={20} />
            Text
          </button>
          <button
            className="type-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera size={20} />
            Photo/Video
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {contentType === 'text' && !file && (
          <>
            <div
              className="status-text-preview"
              style={{ backgroundColor }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's on your mind? (മനസ്സിലെന്താണ്?)"
                maxLength={500}
                autoFocus
              />
            </div>

            <div className="background-selector">
              <label>
                <Palette size={16} />
                Background
              </label>
              <div className="background-colors">
                {STATUS_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.color}
                    className={`color-btn ${backgroundColor === bg.color ? 'active' : ''}`}
                    style={{ backgroundColor: bg.color }}
                    onClick={() => setBackgroundColor(bg.color)}
                    title={bg.name}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {preview && (
          <div className="status-media-preview">
            {contentType === 'photo' && <img src={preview} alt="Preview" />}
            {contentType === 'video' && (
              <video src={preview} controls playsInline />
            )}
            <button
              className="remove-media-btn"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setContentType('text');
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {(contentType === 'photo' || contentType === 'video') && file && (
          <label>
            Caption (optional)
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a caption..."
              maxLength={200}
            />
          </label>
        )}

        {error && (
          <div className="status-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={
              uploading ||
              (contentType === 'text' && !text.trim()) ||
              ((contentType === 'photo' || contentType === 'video') && !file)
            }
          >
            {uploading ? (
              'Posting...'
            ) : (
              <>
                <Send size={18} />
                Post Status
              </>
            )}
          </button>
        </div>

        <small className="status-hint">
          Status disappears after 24 hours • Only contacts can view
        </small>
      </div>
    </Modal>
  );
}

function formatStatusTime(timestamp) {
  const now = new Date();
  const statusTime = new Date(timestamp);
  const diffMs = now - statusTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return statusTime.toLocaleDateString();
}

export async function loadActiveStatuses() {
  try {
    const result = await api('/status/active');
    return result.statuses || [];
  } catch (e) {
    console.error('Failed to load statuses:', e);
    return [];
  }
}

export async function deleteStatus(statusId) {
  await api(`/status/${statusId}`, { method: 'DELETE' });
}
