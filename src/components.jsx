import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Upload,
  Volume2,
  Video,
  Download,
  LoaderCircle,
  Check,
  CheckCheck,
  RefreshCw,
  Mic,
  MicOff,
  VideoOff,
  Monitor,
  PhoneOff,
  Phone,
  Play,
  Pause,
  Sparkles,
  Image as ImageIcon,
  Plus,
  Trash2,
  Scissors,
  Type,
  Palette,
  RotateCcw,
  Moon,
  Sun,
  Heart,
  Activity,
} from 'lucide-react';
import { api, fileBlob, downloadFile } from './api.js';
import { languages, stickers } from '../shared/constants.js';
import { startLovingRingtone, stopLovingRingtone } from './ringtone.js';
import { FONT_SIZES } from './useThemeAndFontSize.js';
import { playHeartbeatSound, triggerHeartbeatHaptics } from './heartbeatAudio.js';
export function ButtonIcon({ label, children, ...props }) {
  return (
    <button className="icon-btn" type="button" title={label} aria-label={label} {...props}>
      {children}
    </button>
  );
}
export function Avatar({ person, size = '', onError }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true,
      objectUrl;
    setUrl(null);
    if (person?.avatar_id)
      fileBlob(person.avatar_id)
        .then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          if (active) setUrl(objectUrl);
          else URL.revokeObjectURL(objectUrl);
        })
        .catch((e) => onError?.(e.message));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [person?.avatar_id, onError]);
  return (
    <span
      className={`avatar ${size}`}
      style={{
        '--hue': person?.handle
          ? (Array.from(person.handle).reduce((a, c) => a + c.charCodeAt(0), 0) % 80) + 120
          : 150,
      }}
    >
      {url ? <img src={url} alt="" /> : (person?.name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  const dialog = useRef(null),
    previousFocus = useRef(null);
  useEffect(() => {
    previousFocus.current = document.activeElement;
    dialog.current.showModal();
    return () => {
      previousFocus.current?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={wide ? 'modal wide' : 'modal'}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <ButtonIcon label="Close" onClick={onClose}>
          <X size={20} />
        </ButtonIcon>
      </div>
      {children}
    </dialog>
  );
}
export function Settings({
  user,
  capabilities,
  onClose,
  onUser,
  onError,
  messageAlerts,
  theme = 'system',
  onThemeChange,
  fontSize = 'comfortable',
  onFontSizeChange,
}) {
  const [draft, setDraft] = useState({
      name: user.name,
      language: user.language,
      ai_consent: user.ai_consent,
      likeness_consent: user.likeness_consent,
      online_status_visibility: user.online_status_visibility || 'everyone',
      last_seen_visibility: user.last_seen_visibility || 'everyone',
    }),
    [busy, setBusy] = useState(false),
    [previewingRingtone, setPreviewingRingtone] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file, kind) => {
    if (!file) return;
    await run(async () => {
      const form = new FormData();
      form.append('file', file);
      onUser(await api(`/profile/${kind}`, { method: 'POST', body: form }));
    });
  };
  const save = async (event) => {
    event.preventDefault();
    await run(async () => {
      onUser(await api('/profile', { method: 'PATCH', body: draft }));
      onClose();
    });
  };
  const voiceStatus = user.has_voice && !user.voice_verified && (
    <div className="voice-status">
      <p>Complete voice verification in ElevenLabs, then refresh its status here.</p>
      <button
        className="secondary"
        type="button"
        disabled={busy}
        onClick={() =>
          void run(async () =>
            onUser(await api('/profile/voice/refresh', { method: 'POST', body: {} })),
          )
        }
      >
        Refresh voice verification
      </button>
    </div>
  );
  return (
    <Modal title="Sanctuary Settings" onClose={onClose}>
      <form onSubmit={save} className="settings-form">
        {messageAlerts}
        <div className="profile-row">
          <Avatar person={user} size="large" />
          <div>
            <strong>{user.name}</strong>
            <p>@{user.handle}</p>
          </div>
        </div>
        <label>
          Your name / nickname
          <input
            value={draft.name}
            maxLength={80}
            required
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          I’d like to read messages in
          <select
            value={draft.language}
            onChange={(e) => setDraft({ ...draft, language: e.target.value })}
          >
            {Object.entries(languages).map(([v, label]) => (
              <option value={v} key={v}>
                {label}
              </option>
            ))}
          </select>
          <small>
            Their words, in the language closest to your heart. You each pick your own.
          </small>
        </label>

        {/* Display & Reading Comfort (Dark Mode + Font Size) */}
        <div className="display-settings-section">
          <div className="display-section-title">
            <h3>
              <Sparkles size={16} /> Display & Reading Comfort
            </h3>
            <span className="display-section-badge">
              {theme === 'dark' ? '🌙 Dark' : theme === 'light' ? '☀️ Light' : '🌓 System'}
            </span>
          </div>

          <div className="theme-picker-group">
            <label>Theme (തീം)</label>
            <div className="theme-picker" role="radiogroup" aria-label="Theme mode">
              <button
                type="button"
                className={`theme-option-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => onThemeChange?.('light')}
                aria-pressed={theme === 'light'}
              >
                <Sun size={15} /> Light
              </button>
              <button
                type="button"
                className={`theme-option-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => onThemeChange?.('dark')}
                aria-pressed={theme === 'dark'}
              >
                <Moon size={15} /> Dark
              </button>
              <button
                type="button"
                className={`theme-option-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => onThemeChange?.('system')}
                aria-pressed={theme === 'system'}
              >
                <Monitor size={15} /> System
              </button>
            </div>
          </div>

          <div className="font-size-picker-group">
            <label>
              Mobile Reading Font Size (ഫോണ്ട് വലുപ്പം)
              <small>Comfortable reading on mobile screens, especially for Malayalam & long chats.</small>
            </label>
            <div className="font-size-picker" role="radiogroup" aria-label="Reading font size">
              {FONT_SIZES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`font-size-chip ${fontSize === item.id ? 'active' : ''}`}
                  onClick={() => onFontSizeChange?.(item.id)}
                  aria-pressed={fontSize === item.id}
                >
                  <span className="font-size-chip-title">{item.label}</span>
                  <span className="font-size-chip-size">{item.size}</span>
                  <span className="font-size-chip-ml">{item.labelMl}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Reading Comfort Preview */}
          <div className="reading-preview-card" aria-label="Live reading preview">
            <span className="reading-preview-label">
              <Type size={12} /> Live Preview (തത്സമയ പ്രിവ്യൂ)
            </span>
            <div className="preview-bubble-sample">
              <p dir="auto">സുഖമാണോ? നമ്മുടെ വിശേഷങ്ങൾ ഇവിടെ പങ്കുവെക്കാം 🤍</p>
              <div className="message-meta">
                <time>10:42 PM</time>
              </div>
            </div>
            <div className="preview-bubble-sample mine">
              <p dir="auto">Much easier & comfortable to read on mobile now! ✨</p>
              <div className="message-meta">
                <time>10:43 PM</time>
                <CheckCheck size={13} />
              </div>
            </div>
          </div>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={draft.ai_consent}
            onChange={(e) => setDraft({ ...draft, ai_consent: e.target.checked })}
          />
          <span>
            Enable AI translation and voice reading
            <small>
              Bridges the distance between us. Text translates between Malayalam, Swahili, and English and reads aloud in natural neural voices.
            </small>
          </span>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={draft.likeness_consent}
            onChange={(e) => setDraft({ ...draft, likeness_consent: e.target.checked })}
          />
          <span>
            This is my own photo and real voice
            <small>
              Clones your voice and animates your photo so your friend feels like you are right beside them.
            </small>
          </span>
        </label>
        <div className="settings-assets">
          <div>
            <h3>Bestie’s view of you</h3>
            <p>JPG or PNG · your favorite portrait</p>
            <label className="upload-btn">
              <Upload size={15} /> Upload photo
              <input
                type="file"
                accept="image/jpeg,image/png"
                disabled={busy}
                onChange={(e) => {
                  void upload(e.target.files[0], 'photo');
                  e.target.value = '';
                }}
              />
            </label>
            {user.avatar_id && (
              <button
                type="button"
                className="text-btn"
                disabled={busy}
                onClick={() =>
                  void run(async () => onUser(await api('/profile/photo', { method: 'DELETE' })))
                }
              >
                Remove photo
              </button>
            )}
          </div>
          <div>
            <h3>Your voice clone</h3>
            <p>
              {user.has_voice
                ? user.voice_verified
                  ? 'Your voice clone is ready to comfort your friend.'
                  : 'Provider verification required. Complete verification with ElevenLabs, then refresh its status.'
                : 'Upload a clean 30–60 second recording of yourself. MP3, WAV, OGG, WebM.'}
            </p>
            {!user.has_voice ? (
              <label
                className={`upload-btn ${!capabilities.voice_clone || !user.likeness_consent || !user.ai_consent ? 'disabled' : ''}`}
              >
                <Mic size={15} /> Upload voice
                <input
                  type="file"
                  accept="audio/*,.webm"
                  disabled={
                    busy || !capabilities.voice_clone || !user.likeness_consent || !user.ai_consent
                  }
                  onChange={(e) => {
                    void upload(e.target.files[0], 'voice');
                    e.target.value = '';
                  }}
                />
              </label>
            ) : (
              <button
                type="button"
                className="text-btn"
                disabled={busy}
                onClick={() =>
                  void run(async () => onUser(await api('/profile/voice', { method: 'DELETE' })))
                }
              >
                Remove cloned voice
              </button>
            )}
          </div>
        </div>
        {voiceStatus}
        <h3 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px' }}>Privacy Settings</h3>
        <label>
          Who can see when I'm online
          <select
            value={draft.online_status_visibility}
            onChange={(e) => setDraft({ ...draft, online_status_visibility: e.target.value })}
          >
            <option value="everyone">Everyone</option>
            <option value="contacts">My contacts</option>
            <option value="nobody">Nobody</option>
          </select>
          <small>
            Control who can see when you're actively using the app
          </small>
        </label>
        <label>
          Who can see my last seen time
          <select
            value={draft.last_seen_visibility}
            onChange={(e) => setDraft({ ...draft, last_seen_visibility: e.target.value })}
          >
            <option value="everyone">Everyone</option>
            <option value="contacts">My contacts</option>
            <option value="nobody">Nobody</option>
          </select>
          <small>
            Control who can see when you were last active
          </small>
        </label>
        <div className="ringtone-preview-row">
          <div>
            <strong>Loving Call Ringtone</strong>
            <small>Melodic chime + caller voice announcement</small>
          </div>
          <button
            type="button"
            className="secondary"
            style={{ width: 'auto', padding: '9px 15px', fontSize: '12px' }}
            onClick={() => {
              if (previewingRingtone) {
                stopLovingRingtone();
                setPreviewingRingtone(false);
              } else {
                setPreviewingRingtone(true);
                startLovingRingtone(user.name || 'Bestie', draft.language);
                setTimeout(() => setPreviewingRingtone(false), 9000);
              }
            }}
          >
            {previewingRingtone ? '⏹ Stop' : '🔔 Preview Ringtone'}
          </button>
        </div>
        <button className="primary" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={18} /> : 'Save sanctuary settings'}
        </button>
      </form>
    </Modal>
  );
}
export function Attachment({ attachment, onError }) {
  const [preview, setPreview] = useState(null);
  const audio =
    attachment.mime.startsWith('audio/') ||
    (/^voice-note-/.test(attachment.name) && attachment.mime === 'video/webm');
  useEffect(() => {
    let active = true,
      url;
    if (attachment.mime.startsWith('image/') || audio)
      fileBlob(attachment.id)
        .then((blob) => {
          url = URL.createObjectURL(blob);
          if (active) setPreview(url);
          else URL.revokeObjectURL(url);
        })
        .catch((e) => onError(e.message));
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.id, attachment.mime, audio, onError]);
  const isCustomSticker =
    attachment.name?.startsWith('sticker-') ||
    (attachment.mime?.startsWith('image/') && attachment.name?.toLowerCase().includes('sticker'));

  if (isCustomSticker) {
    return (
      <div className="custom-sticker-attachment">
        {preview ? (
          <img className="custom-sticker-img" src={preview} alt="Custom sticker" />
        ) : (
          <div className="custom-sticker-loading">
            <LoaderCircle size={20} className="spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="attachment">
      {preview &&
        (audio ? (
          <audio controls preload="metadata" aria-label="Play voice note" src={preview} />
        ) : (
          <img className="attachment-preview" src={preview} alt={attachment.name} />
        ))}
      <button
        type="button"
        className="file-card"
        onClick={() => void downloadFile(attachment).catch((e) => onError(e.message))}
      >
        <span>
          <strong>{attachment.name}</strong>
          <small>{(attachment.size / 1024 / 1024).toFixed(1)} MB · Download</small>
        </span>
        <Download size={19} />
      </button>
    </div>
  );
}

export function HeartbeatCard({ text }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const bpmMatch = text.match(/\[Heartbeat Pulse · (\d+)\s*BPM\]/i);
  const bpm = bpmMatch ? parseInt(bpmMatch[1], 10) : 76;
  const cleanMessage = text.replace(/💓\s*\[Heartbeat Pulse · \d+\s*BPM\]\s*/i, '').trim();

  const handlePlayPulse = () => {
    setIsPlaying(true);
    triggerHeartbeatHaptics([60, 70, 80, 180, 60, 70, 80, 180]);
    playHeartbeatSound(0.5);

    setTimeout(() => {
      playHeartbeatSound(0.5);
    }, 780);

    setTimeout(() => {
      playHeartbeatSound(0.5);
      setIsPlaying(false);
    }, 1560);
  };

  return (
    <div className={`heartbeat-chat-card ${isPlaying ? 'card-beating' : ''}`}>
      <div className="hb-card-top">
        <div className="hb-card-heart-wrap">
          <Heart size={24} className={`hb-card-heart ${isPlaying ? 'beat-anim' : ''}`} fill="currentColor" />
        </div>
        <div className="hb-card-meta">
          <strong>Heartbeat Pulse (ഹൃദയസ്പന്ദനം)</strong>
          <span>💓 {bpm} BPM · Sent from the heart</span>
        </div>
      </div>

      {cleanMessage && <p className="hb-card-message">{cleanMessage}</p>}

      <button
        type="button"
        className={`hb-feel-pulse-btn ${isPlaying ? 'active' : ''}`}
        onClick={handlePlayPulse}
      >
        <Activity size={14} />
        <span>{isPlaying ? 'Feeling Heartbeat... 💓' : 'Feel Heartbeat (സ്പന്ദനം അനുഭവിക്കൂ)'}</span>
      </button>
    </div>
  );
}

export function Message({ message, mine, peerRead, user, capabilities, onError, onReply, onChanged, highlighted, group }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  
  const mutate = async (method) => {
    setActionBusy(true);
    try {
      await api(`/messages/${message.id}`, { method, ...(method === "PATCH" ? { body: { text: editText } } : {}) });
      setEditing(false);
      setConfirmDelete(false);
      await onChanged?.();
    } catch (e) { onError(e.message); } finally { setActionBusy(false); }
  };

  const toggleReaction = async (emoji) => {
    try {
      await api(`/messages/${message.id}/reactions`, {
        method: 'POST',
        body: { emoji },
      });
      setShowReactionPicker(false);
      await onChanged?.();
    } catch (e) {
      onError(e.message);
    }
  };

  const handleLongPressStart = (e) => {
    if (message.deleted_at) return;
    e.preventDefault();
    const timer = setTimeout(() => {
      setShowReactionPicker(true);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  }, [longPressTimer]);
  const [job, setJob] = useState(null),
    [media, setMedia] = useState(null),
    [busy, setBusy] = useState(false),
    [ownVoice, setOwnVoice] = useState(false);
  const translated = !mine && message.translation?.status === 'ready';

  const isAudioNote =
    message.attachment &&
    (message.attachment.mime?.startsWith('audio/') ||
      (/^voice-note-/.test(message.attachment.name || '') &&
        message.attachment.mime === 'video/webm'));

  const defaultVoiceLang =
    user.language || 'en';
  const [selectedVoiceLang, setSelectedVoiceLang] = useState(defaultVoiceLang);
  const [translatingLang, setTranslatingLang] = useState(null);

  const currentVoiceItem =
    message.translations?.[selectedVoiceLang] ||
    (message.translation?.language === selectedVoiceLang ? message.translation : null) ||
    (message.receiver_translation?.language === selectedVoiceLang
      ? message.receiver_translation
      : null);
  const currentVoiceText =
    currentVoiceItem?.status === 'ready' ? currentVoiceItem.text : null;
  const isVoicePending =
    currentVoiceItem?.status === 'pending' ||
    (!currentVoiceText && message.translation?.status === 'pending') ||
    translatingLang === selectedVoiceLang;

  const requestVoiceTranslation = async (lang) => {
    setSelectedVoiceLang(lang);
    if (!message.translations?.[lang] || message.translations[lang].status !== 'ready') {
      setTranslatingLang(lang);
      try {
        await api(`/messages/${message.id}/translate`, {
          method: 'POST',
          body: { language: lang },
        });
      } catch (e) {
        onError(e.message);
      } finally {
        setTranslatingLang(null);
      }
    }
  };

  const playVoiceText = (text, lang) => {
    if (!('speechSynthesis' in window)) {
      onError('This browser does not support voice reading.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ml' ? 'ml-IN' : lang === 'sw' ? 'sw-KE' : 'en-US';
    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted')
        onError('Voice reading failed. Check your browser sound settings.');
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!job) return;
    let active = true,
      url;
    let timeout;
    const poll = async () => {
      try {
        const result = await api(`/media/${job}`);
        if (!active) return;
        if (result.status === 'ready') {
          const response = await fetch(result.url);
          if (!response.ok) throw new Error('Media download failed.');
          url = URL.createObjectURL(await response.blob());
          if (active) {
            setMedia({ url, kind: result.kind, mime: result.mime });
            setBusy(false);
          } else URL.revokeObjectURL(url);
        } else if (result.status === 'failed') {
          setBusy(false);
          onError(result.error);
        } else timeout = setTimeout(poll, 2500);
      } catch (e) {
        if (active) {
          setBusy(false);
          onError(e.message);
        }
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timeout);
      if (url) URL.revokeObjectURL(url);
    };
  }, [job, onError]);
  const generate = async (kind) => {
    setBusy(true);
    setMedia(null);
    setJob(null);
    try {
      const result = await api(`/messages/${message.id}/media`, {
        method: 'POST',
        body: { kind, own_voice: ownVoice },
      });
      setJob(result.id);
    } catch (e) {
      setBusy(false);
      onError(e.message);
    }
  };
  const browserSpeak = () => {
    if (!('speechSynthesis' in window)) {
      onError('This browser does not support voice reading.');
      return;
    }
    const readingTranslation = translated || Boolean(currentVoiceText);
    const textToSpeak = currentVoiceText || (readingTranslation ? message.translation.text : message.text);
    const langToSpeak = currentVoiceText ? selectedVoiceLang : (readingTranslation ? user.language : message.source_language);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang =
      langToSpeak === 'ml'
        ? 'ml-IN'
        : langToSpeak === 'sw'
          ? 'sw-KE'
          : 'en-US';
    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted')
        onError('Voice reading failed. Check your browser sound settings and try again.');
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };
  return (
    <article id={`message-${message.id}`} className={`message ${mine ? 'mine' : ''} ${highlighted ? 'message-highlight' : ''}`}>
      <div 
        className="bubble"
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
      >
        {showReactionPicker && (
          <div className="reaction-picker">
            {['❤️','😂','👍','😮','😢','🙏'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => void toggleReaction(emoji)}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        {message.reply && <blockquote className="quoted-reply"><strong>{message.reply.sender}</strong><p>{message.reply.deleted_at ? 'Message deleted' : message.reply.text || (message.reply.sticker ? stickers[message.reply.sticker] : 'Attachment')}</p></blockquote>}
        {group && !mine && <small className="group-sender">{message.sender?.name || 'Member'}</small>}
        {message.sticker && (
          <div className="sticker" aria-label={message.sticker}>
            {stickers[message.sticker]}
          </div>
        )}
        {message.attachment && <Attachment attachment={message.attachment} onError={onError} />}
        {editing ? (
          <form className="message-edit" onSubmit={event => { event.preventDefault(); void mutate('PATCH'); }}>
            <textarea aria-label="Edit message" value={editText} onChange={event => setEditText(event.target.value)} maxLength={5000} disabled={actionBusy} autoFocus />
            <button type="submit" disabled={actionBusy || !editText.trim()}>Save</button>
            <button type="button" disabled={actionBusy} onClick={() => setEditing(false)}>Cancel</button>
          </form>
        ) : isAudioNote ? (
          message.text ? <p dir="auto" className="voice-caption">{message.text}</p> : null
        ) : !message.deleted_at && message.text?.startsWith('💓 [Heartbeat Pulse') ? (
          <HeartbeatCard text={message.text} />
        ) : (
          <p dir="auto">{message.deleted_at ? 'Message deleted' : translated ? message.translation.text : message.text}</p>
        )}
        {isAudioNote && (
          <div className="voice-translation-card">
            <div className="voice-translation-header">
              <div className="voice-translation-badge">
                <Sparkles size={12} className="sparkle-icon" />
                <span>Voice Translation</span>
              </div>
              <div className="voice-lang-chips" role="tablist" aria-label="Voice translation languages">
                {[
                  { id: 'ml', label: 'മലയാളം' },
                  { id: 'manglish', label: 'Manglish' },
                  { id: 'sw', label: 'Kiswahili' },
                  { id: 'en', label: 'English' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedVoiceLang === item.id}
                    className={`voice-lang-chip ${selectedVoiceLang === item.id ? 'active' : ''}`}
                    onClick={() => void requestVoiceTranslation(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {currentVoiceText ? (
              <div className="voice-translation-body">
                <p className="voice-translated-text" dir="auto">
                  {currentVoiceText}
                </p>
                <div className="voice-translation-footer">
                  <span className="voice-lang-desc">
                    {selectedVoiceLang === 'en'
                      ? 'English transcription'
                      : `${languages[selectedVoiceLang] || selectedVoiceLang} translation`}
                  </span>
                  <button
                    type="button"
                    className="voice-listen-action"
                    title="Listen to translation"
                    onClick={() => playVoiceText(currentVoiceText, selectedVoiceLang)}
                  >
                    <Volume2 size={12} /> Listen
                  </button>
                </div>
              </div>
            ) : isVoicePending ? (
              <div className="voice-translating-state">
                <LoaderCircle size={13} className="spin" />
                <span>Translating voice note into {languages[selectedVoiceLang]}…</span>
              </div>
            ) : (
              <div className="voice-translation-prompt">
                <button
                  type="button"
                  className="voice-fetch-btn"
                  onClick={() => void requestVoiceTranslation(selectedVoiceLang)}
                >
                  <RefreshCw size={12} /> Translate into {languages[selectedVoiceLang]}
                </button>
              </div>
            )}
          </div>
        )}
        {!isAudioNote && translated && (
          <>
            <small className="translation-label">{languages[message.translation.language || user.language]}</small>
            <div className="sender-original">
              <small>Sender sent{languages[message.source_language] ? ` · ${languages[message.source_language]}` : ''}</small>
              <p dir="auto">{message.text}</p>
            </div>
          </>
        )}
        {!isAudioNote && mine && message.text && message.receiver_translation && (
          <div className="receiver-preview" aria-live="polite">
            <small>Receiver sees · {languages[message.receiver_translation.language]}</small>
            {message.receiver_translation.status === 'ready' ? (
              <p dir="auto">{message.receiver_translation.text}</p>
            ) : (
              <small>
                {message.receiver_translation.status === 'pending'
                  ? 'Translating…'
                  : 'Translation unavailable · Receiver sees the original'}
              </small>
            )}
          </div>
        )}
        {!isAudioNote && !mine && message.translation?.status === 'pending' && (
          <small className="translation-label">Translating… · Original shown</small>
        )}
        {!isAudioNote && !mine && message.translation?.status === 'failed' && (
          <button
            type="button"
            className="translation-label"
            onClick={() =>
              void api(`/messages/${message.id}/translate`, {
                method: 'POST',
                body: { language: user.language },
              }).catch((e) => onError(e.message))
            }
          >
            <RefreshCw size={12} /> Translation unavailable · Retry
          </button>
        )}
        <div className="message-meta">
          {message.edited_at && !message.deleted_at && <small>Edited</small>}
          <time dateTime={message.created_at}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          {mine &&
            (Number(message.seq) <= Number(peerRead) ? (
              <CheckCheck size={15} aria-label="Read" />
            ) : (
              <Check size={15} aria-label="Sent" />
            ))}
        </div>
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="reactions-container">
            {Object.entries(message.reactions).map(([emoji, data]) => (
              <button
                key={emoji}
                type="button"
                className={`reaction-item ${data.reacted ? 'reacted' : ''}`}
                onClick={() => void toggleReaction(emoji)}
                title={data.users?.map(u => u.name).join(', ')}
              >
                <span className="reaction-emoji">{emoji}</span>
                <span className="reaction-count">{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {!message.deleted_at && <div className="message-actions">
        {onReply && <button type="button" disabled={actionBusy} onClick={() => onReply(message)}>Reply</button>}
        {mine && message.text && <button type="button" disabled={actionBusy} onClick={() => { setEditText(message.text); setEditing(true); }}>Edit</button>}
        {mine && <button type="button" disabled={actionBusy} onClick={() => setConfirmDelete(true)}>Delete</button>}
      </div>}
      {confirmDelete && <div className="message-delete-confirm" role="alert"><span>Delete this message for everyone?</span><button type="button" disabled={actionBusy} onClick={() => void mutate('DELETE')}>Delete for everyone</button><button type="button" disabled={actionBusy} onClick={() => setConfirmDelete(false)}>Cancel</button></div>}
      {message.text && !message.deleted_at && (
        <details className="message-tools">
          <summary>
            <Volume2 size={13} /> Read / animate
          </summary>
          <div className="tool-options">
            <button type="button" onClick={browserSpeak}>
              Browser voice
            </button>
            <button
              type="button"
              disabled={busy || !(capabilities.speech || (ownVoice && capabilities.voice_clone))}
              onClick={() => void generate('speech')}
            >
              Natural voice
            </button>
            <button
              type="button"
              disabled={busy || !capabilities.avatar || !user.avatar_id || !user.likeness_consent}
              onClick={() => void generate('avatar')}
            >
              Talking photo
            </button>
            <label>
              <input
                type="checkbox"
                checked={ownVoice}
                disabled={!user.voice_verified}
                onChange={(e) => setOwnVoice(e.target.checked)}
              />{' '}
              Use my voice
            </label>
          </div>
          <small>Talking photo animates your own profile image. AI-generated media.</small>
        </details>
      )}
      {busy && (
        <div className="generation">
          <LoaderCircle size={14} className="spin" /> Generating media…
        </div>
      )}
      {media &&
        (media.kind === 'avatar' ? (
          media.mime?.startsWith('video') ? (
            <video className="generated-video" controls src={media.url} />
          ) : (
            <TalkingAvatar person={user} audioUrl={media.url} />
          )
        ) : (
          <audio controls src={media.url} />
        ))}
    </article>
  );
}
export function TalkingAvatar({ person, audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [energy, setEnergy] = useState(0);
  const audioRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setEnergy(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setEnergy(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            const source = ctx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
          }
        }
        if (audioCtxRef.current?.state === 'suspended') {
          await audioCtxRef.current.resume();
        }

        await audio.play();
        setIsPlaying(true);

        const updateEnergy = () => {
          if (analyserRef.current) {
            const data = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const avg = sum / (data.length * 255);
            setEnergy(avg);
          } else {
            setEnergy(0.3 + 0.3 * Math.sin(Date.now() / 150));
          }
          animFrameRef.current = requestAnimationFrame(updateEnergy);
        };
        updateEnergy();
      } catch {
        try {
          await audio.play();
          setIsPlaying(true);
          const updateEnergy = () => {
            setEnergy(0.35 + 0.25 * Math.sin(Date.now() / 180));
            animFrameRef.current = requestAnimationFrame(updateEnergy);
          };
          updateEnergy();
        } catch {
          // Playback interrupted or user interaction required
        }
      }
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const newTime = (Number(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setProgress(Number(e.target.value));
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`talking-avatar-card ${isPlaying ? 'speaking' : ''}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="talking-badge">
        <Sparkles size={11} className={isPlaying ? 'sparkle-spin' : ''} />
        <span>Talking Photo · {isPlaying ? 'Speaking' : 'Ready'}</span>
      </div>

      <div className="talking-stage">
        <div
          className={`talking-aura ring-1 ${isPlaying ? 'active' : ''}`}
          style={{ transform: `scale(${1 + energy * 0.4})` }}
        />
        <div
          className={`talking-aura ring-2 ${isPlaying ? 'active' : ''}`}
          style={{ transform: `scale(${1 + energy * 0.6})` }}
        />
        <div
          className={`talking-aura ring-3 ${isPlaying ? 'active' : ''}`}
          style={{ transform: `scale(${1 + energy * 0.85})` }}
        />

        <div
          className="talking-portrait"
          style={{
            transform: isPlaying
              ? `scale(${1 + energy * 0.08}) rotate(${Math.sin(currentTime * 3) * 1.5}deg)`
              : 'none',
          }}
        >
          <Avatar person={person} size="huge" />
          {isPlaying && (
            <div
              className="talking-lip-indicator"
              style={{
                transform: `scaleY(${0.6 + energy * 1.2})`,
                opacity: 0.8 + energy * 0.2,
              }}
            >
              <span className="lip-bar bar-1" />
              <span className="lip-bar bar-2" />
              <span className="lip-bar bar-3" />
            </div>
          )}
        </div>
      </div>

      <div className="talking-visualizer">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const height = isPlaying
            ? Math.max(4, Math.min(24, (energy * 28 + (1 + Math.sin(currentTime * 8 + i)) * 4)))
            : 4;
          return <span key={i} className="eq-bar" style={{ height: `${height}px` }} />;
        })}
      </div>

      <div className="talking-controls">
        <button
          type="button"
          className="talking-play-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play talking photo'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <div className="talking-timeline">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="talking-slider"
          />
          <div className="talking-time-display">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
function MediaVideo({ stream, muted, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return <video className={className} ref={ref} autoPlay playsInline muted={muted} />;
}
export function CallOverlay({ controller, user, peer }) {
  const { call, local, remote, phase, sharing, muted, cameraOff } = controller;
  const [seconds, setSeconds] = useState(0);
  const [remoteVideo, setRemoteVideo] = useState(false);
  useEffect(() => {
    const tracks = remote?.getVideoTracks() || [];
    const update = () =>
      setRemoteVideo(tracks.some((track) => track.readyState === 'live' && !track.muted));
    for (const track of tracks) {
      track.addEventListener('mute', update);
      track.addEventListener('unmute', update);
      track.addEventListener('ended', update);
    }
    update();
    return () => {
      for (const track of tracks) {
        track.removeEventListener('mute', update);
        track.removeEventListener('unmute', update);
        track.removeEventListener('ended', update);
      }
    };
  }, [remote]);
  useEffect(() => {
    setSeconds(0);
    if (phase !== 'Connected') return;
    const start = Date.now(),
      timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);
  const incoming = call?.state === 'ringing' && call.callee_id === user.id;

  useEffect(() => {
    if (incoming) {
      const callerName = peer?.name || 'Your bestie';
      startLovingRingtone(callerName, user?.language);
    } else {
      stopLovingRingtone();
    }
    return () => {
      stopLovingRingtone();
    };
  }, [incoming, peer?.name, user?.language]);

  if (!call) return null;
  return (
    <div
      className="call-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${call.kind === 'video' ? 'Video' : 'Voice'} call`}
    >
      <div className="call-top">
        <span className="brand-mark">
          k<span>•</span>
        </span>
        <span>Calling my favorite human · {call.kind === 'audio' ? 'Voice' : 'Video'}</span>
      </div>
      <div className="call-stage">
        <MediaVideo stream={remote} className={`remote-video ${remoteVideo ? '' : 'audio-call'}`} />
        <div className={`call-info ${remoteVideo ? 'video-connected' : ''}`}>
          <Avatar person={peer} size="huge" />
          <h2>{peer?.name || 'My ride-or-die'}</h2>
          <p>
            {incoming
              ? 'Your bestie is calling! Pick up! 💖'
              : phase === 'Connected'
                ? `Hearing your voice fixes everything · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
                : phase === 'Connecting'
                  ? 'Connecting to my favorite person...'
                  : phase}
          </p>
          {incoming && (
            <div className="loving-ringtone-badge">
              <span className="ring-pulse-icon">🎵</span>
              <span>Ringing: {peer?.name || 'Your bestie'} is calling with love 💖</span>
            </div>
          )}
        </div>
        {local && <MediaVideo stream={local} muted className="local-video" />}
      </div>
      <div className="call-controls">
        {incoming ? (
          <>
            <button className="call-control danger" onClick={() => void controller.decline()}>
              <PhoneOff /> Decline
            </button>
            <button className="call-control accept" onClick={() => void controller.accept()}>
              <Phone /> Accept
            </button>
          </>
        ) : (
          <>
            <button
              className={`call-control ${muted ? 'toggled' : ''}`}
              onClick={controller.toggleMute}
              disabled={!local}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <MicOff /> : <Mic />}
            </button>
            {call.kind === 'video' && (
              <button
                className={`call-control ${cameraOff ? 'toggled' : ''}`}
                onClick={controller.toggleCamera}
                disabled={!local}
                aria-label={cameraOff ? 'Enable camera' : 'Disable camera'}
              >
                {cameraOff ? <VideoOff /> : <Video />}
              </button>
            )}
            <button
              className={`call-control ${sharing ? 'toggled' : ''}`}
              disabled={call.state !== 'active'}
              onClick={() => void controller.share()}
              aria-label={sharing ? 'Stop screen sharing' : 'Share screen'}
            >
              <Monitor />
            </button>
            <button
              className="call-control danger"
              onClick={() => void controller.end()}
              aria-label="End call"
            >
              <PhoneOff />
            </button>
          </>
        )}
      </div>
      <p className="call-footer">
        {sharing
          ? 'Your screen is shared with your bestie.'
          : 'Private & encrypted. Just the two of you against the world.'}
      </p>
    </div>
  );
}

export function StickerCreatorModal({ onClose, onSendSticker, onSaveToLibrary, onError }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [shape, setShape] = useState('circle');
  const [borderWidth, setBorderWidth] = useState(8);
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [caption, setCaption] = useState('');
  const [captionPos, setCaptionPos] = useState('bottom');
  const [filter, setFilter] = useState('none');
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      if (!file || !file.type.startsWith('image/')) {
        onError?.('Please choose an image file (PNG, JPG, WebP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          imgRef.current = img;
          setImageSrc(e.target.result);
          setScale(1);
          setPan({ x: 0, y: 0 });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    [onError],
  );

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          handleFile(item.getAsFile());
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFile]);

  const renderSticker = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    const size = 320;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.42;

    ctx.save();
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    } else if (shape === 'rounded') {
      const w = radius * 1.85;
      const h = radius * 1.85;
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 32);
    } else if (shape === 'heart') {
      const s = radius * 0.038;
      ctx.moveTo(cx, cy - 25 * s);
      ctx.bezierCurveTo(cx - 30 * s, cy - 60 * s, cx - 60 * s, cy - 20 * s, cx, cy + 50 * s);
      ctx.bezierCurveTo(cx + 60 * s, cy - 20 * s, cx + 30 * s, cy - 60 * s, cx, cy - 25 * s);
    } else if (shape === 'star') {
      const spikes = 5;
      const outerRadius = radius;
      const innerRadius = radius * 0.55;
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
    } else {
      const w = radius * 1.95;
      const h = radius * 1.95;
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 20);
    }

    if (borderWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      ctx.lineWidth = borderWidth * 2;
      ctx.strokeStyle = borderColor;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    ctx.clip();

    if (filter === 'vibrant') ctx.filter = 'saturate(1.5) contrast(1.15)';
    else if (filter === 'warm') ctx.filter = 'sepia(0.25) saturate(1.3) hue-rotate(-10deg)';
    else if (filter === 'noir') ctx.filter = 'grayscale(1) contrast(1.2)';
    else ctx.filter = 'none';

    const img = imgRef.current;
    const aspect = img.width / img.height;
    let dw = size * scale;
    let dh = (size / aspect) * scale;
    if (aspect < 1) {
      dh = size * scale;
      dw = size * aspect * scale;
    }
    const dx = cx - dw / 2 + pan.x;
    const dy = cy - dh / 2 + pan.y;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    if (caption.trim()) {
      ctx.save();
      const textY = captionPos === 'top' ? cy - radius * 0.65 : cy + radius * 0.72;
      ctx.font = 'bold 20px "DM Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(caption);
      const bgW = metrics.width + 22;
      const bgH = 32;
      ctx.fillStyle = 'rgba(23, 72, 62, 0.9)';
      ctx.beginPath();
      ctx.roundRect(cx - bgW / 2, textY - bgH / 2, bgW, bgH, 12);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(caption, cx, textY);
      ctx.restore();
    }
  }, [shape, borderWidth, borderColor, caption, captionPos, filter, scale, pan]);

  useEffect(() => {
    renderSticker();
  }, [renderSticker]);

  const handleMouseDown = (e) => {
    if (!imageSrc) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSend = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSendSticker(blob, dataUrl);
      onClose();
    }, 'image/png');
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveToLibrary(dataUrl);
  };

  const quickCaptions = ['Missing You ❤️', 'Habibi ✨', 'Polichu 🔥', 'Nakupenda 💚', 'Uff 🤩', 'Bestie 🤝'];

  return (
    <Modal title="Sticker Studio 🎨" onClose={onClose} wide>
      <div className="sticker-studio">
        <div className="sticker-studio-canvas-col">
          <div
            className={`sticker-canvas-stage ${imageSrc ? 'has-image' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {imageSrc ? (
              <canvas ref={canvasRef} className="sticker-canvas" />
            ) : (
              <div
                className="sticker-upload-empty"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="empty-icon-wrap">
                  <ImageIcon size={38} />
                </div>
                <strong>Drop a photo or click to browse</strong>
                <p>JPG, PNG, WebP or paste from clipboard (Ctrl+V)</p>
                <button type="button" className="upload-select-btn">
                  <Upload size={14} /> Select Photo
                </button>
              </div>
            )}
          </div>

          {imageSrc && (
            <div className="canvas-adjustments">
              <div className="zoom-control">
                <span>Zoom</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
                <small>{Math.round(scale * 100)}%</small>
              </div>
              <button
                type="button"
                className="reset-btn"
                title="Reset position"
                onClick={() => {
                  setScale(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <RotateCcw size={13} /> Reset
              </button>
              <button
                type="button"
                className="change-photo-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Photo
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>

        <div className="sticker-studio-controls-col">
          <div className="control-section">
            <label className="section-label">
              <Scissors size={14} /> Cutout Shape
            </label>
            <div className="shape-options">
              {[
                { id: 'circle', label: 'Circle', icon: '🔵' },
                { id: 'rounded', label: 'Squircle', icon: '⬛' },
                { id: 'heart', label: 'Heart', icon: '💖' },
                { id: 'star', label: 'Star', icon: '⭐' },
                { id: 'original', label: 'Card', icon: '🖼️' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className={`shape-btn ${shape === s.id ? 'active' : ''}`}
                  onClick={() => setShape(s.id)}
                >
                  <span className="shape-icon">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <label className="section-label">
              <Palette size={14} /> Sticker Border Outline
            </label>
            <div className="border-controls">
              <div className="border-width-pills">
                {[
                  { w: 0, label: 'None' },
                  { w: 5, label: 'Thin' },
                  { w: 8, label: 'Medium' },
                  { w: 14, label: 'Thick' },
                ].map((b) => (
                  <button
                    type="button"
                    key={b.w}
                    className={`width-pill ${borderWidth === b.w ? 'active' : ''}`}
                    onClick={() => setBorderWidth(b.w)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              {borderWidth > 0 && (
                <div className="color-palette">
                  {['#ffffff', '#ffeaa7', '#ff7675', '#55efc4', '#74b9ff', '#17483e'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`color-dot ${borderColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setBorderColor(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="control-section">
            <label className="section-label">
              <Type size={14} /> Caption & Stamp
            </label>
            <div className="caption-input-row">
              <input
                type="text"
                placeholder="Add text (e.g. Love You, Uff, Habibi)..."
                maxLength={30}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="sticker-caption-input"
              />
              {caption && (
                <button
                  type="button"
                  className="pos-toggle"
                  onClick={() => setCaptionPos(captionPos === 'top' ? 'bottom' : 'top')}
                >
                  {captionPos === 'top' ? 'Top' : 'Bottom'}
                </button>
              )}
            </div>
            <div className="quick-tags">
              {quickCaptions.map((q) => (
                <button
                  type="button"
                  key={q}
                  className="quick-tag-chip"
                  onClick={() => setCaption(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <label className="section-label">Filters</label>
            <div className="filter-chips">
              {[
                { id: 'none', label: 'Original' },
                { id: 'vibrant', label: 'Vibrant' },
                { id: 'warm', label: 'Warm' },
                { id: 'noir', label: 'B&W' },
              ].map((f) => (
                <button
                  type="button"
                  key={f.id}
                  className={`filter-chip ${filter === f.id ? 'active' : ''}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sticker-actions-footer">
            <button
              type="button"
              className="save-library-btn"
              disabled={!imageSrc}
              onClick={handleSave}
            >
              <Plus size={14} /> Save to My Stickers
            </button>
            <button
              type="button"
              className="send-sticker-btn"
              disabled={!imageSrc}
              onClick={handleSend}
            >
              <Sparkles size={15} /> Send as Sticker
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
