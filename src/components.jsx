import { AppearanceOptions } from './AppearanceOptions.jsx';
import { featureText } from '../shared/featureLocale.js';
import { receiverMessageText } from '../shared/featureLanguage.js';
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
  Headphones,
  Film,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  HeartHandshake,
  Hand,
  Zap,
  Lock,
  Unlock,
  Camera,
  Gamepad2,
} from 'lucide-react';
import { playTouchSound, triggerTouchHaptics, HAPTIC_PATTERNS } from './touchAudio.js';
import { parseStoryShare, STORY_CATEGORIES } from '../shared/relationshipStory.js';
import { parseMonthlyRecapShare } from '../shared/monthlyRecap.js';
import {
  parseTimeCapsuleChatShare,
  calculateCapsuleCountdown,
  TIME_CAPSULE_OCCASIONS,
  SEAL_SYMBOLS,
} from '../shared/timeCapsule.js';
import { ViewOnceMedia } from './ViewOnceMedia.jsx';
import { PhotoViewer } from './PhotoViewer.jsx';
import { MediaPlayer } from './MediaPlayer.jsx';
import { AppLockSettings } from './AppLock.jsx';
import { MessageHistory, useMessageClock } from './MessageStatus.jsx';
import { hasExpired } from '../shared/disappearing.js';
import { api, fileBlob, downloadFile } from './api.js';
import { languages, stickers } from '../shared/constants.js';
import { startLovingRingtone, stopLovingRingtone } from './ringtone.js';
import { FONT_SIZES } from './useThemeAndFontSize.js';
import { playHeartbeatSound, triggerHeartbeatHaptics } from './heartbeatAudio.js';
import { detectVoiceFilterFromFilename } from './voiceFilters.js';
import { CallReactionOverlay } from './CallReactionOverlay.jsx';
import { ARFilterStudio } from './ARFilterStudio.jsx';
import { ARVideoProcessor, getFilterById } from './arVideoFilters.js';
import { SleepTogetherCard } from './SleepTogetherModal.jsx';
export { SleepTogetherCard } from './SleepTogetherModal.jsx';
import { InvisibleInkCard } from './InvisibleInkCard.jsx';
import { isMessageInvisibleInk } from './invisibleInk.js';
export { InvisibleInkCard } from './InvisibleInkCard.jsx';
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
      aria-label={title}
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
  appearanceControls,
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
    <Modal title="Your space & settings" onClose={onClose}>
      <form onSubmit={save} className="settings-form">
        {messageAlerts}
        <AppLockSettings />
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
              {theme === 'dark' ? '🌙 Dark' : theme === 'light' ? '☀️ Light' : theme === 'custom' ? '🎨 Custom' : '🌓 System'}
            </span>
          </div>

          <div className="theme-picker-group">
            <label>Theme (തീം)</label>
            <div className="theme-picker" role="group" aria-label="Theme mode">
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
              <button type="button" className={`theme-option-btn ${theme === 'custom' ? 'active' : ''}`} onClick={() => onThemeChange?.('custom')} aria-pressed={theme === 'custom'}>🎨 Custom</button>
            </div>
          </div>

          <AppearanceOptions controls={appearanceControls} />

          <div className="font-size-picker-group">
            <label>
              Mobile Reading Font Size (ഫോണ്ട് വലുപ്പം)
              <small>Comfortable reading on mobile screens, especially for Malayalam & long chats.</small>
            </label>
            <div className="font-size-picker" role="group" aria-label="Reading font size">
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
  const [viewing, setViewing] = useState(false);
  const photoTrigger = useRef(null);
  const audio =
    attachment.mime.startsWith('audio/') ||
    (/^voice-note-/.test(attachment.name) && attachment.mime === 'video/webm');
  useEffect(() => {
    let active = true,
      url;
    if (!attachment.view_once && (attachment.mime.startsWith('image/') || attachment.mime.startsWith('video/') || audio))
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
  }, [attachment.id, attachment.mime, attachment.view_once, audio, onError]);
  const isCustomSticker =
    attachment.name?.startsWith('sticker-') ||
    (attachment.mime?.startsWith('image/') && attachment.name?.toLowerCase().includes('sticker'));

  if (attachment.view_once) return <p>① View-once media · Open in chat</p>;
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

  const voiceFilter = detectVoiceFilterFromFilename(attachment.name);

  return (
    <div className="attachment">
      {voiceFilter && (
        <div className={`voice-filter-tag-badge ${voiceFilter.badgeClass}`}>
          <span className="vft-icon">{voiceFilter.icon}</span>
          <span className="vft-name">{voiceFilter.name}</span>
        </div>
      )}
      {viewing && preview && <PhotoViewer src={preview} attachment={attachment} onError={onError} returnFocus={photoTrigger} onClose={() => setViewing(false)} />}
      {preview &&
        (audio ? (
          <MediaPlayer key={preview} src={preview} onError={onError} />
        ) : attachment.mime.startsWith('video/') ? (
          <MediaPlayer key={preview} src={preview} video onError={onError} />
        ) : (
          <button type="button" ref={photoTrigger} className="photo-preview-button" aria-label={'View photo ' + attachment.name} onClick={() => setViewing(true)}><img className="attachment-preview" src={preview} alt={attachment.name} /></button>
        ))}
      <button
        type="button"
        className="file-card"
        onClick={() => void downloadFile(attachment).catch((e) => onError(e.message))}
      >
        <span>
          <strong>
            {voiceFilter
              ? `${voiceFilter.icon} ${voiceFilter.name} Voice Note`
              : attachment.name}
          </strong>
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

export function VirtualTouchCard({ text, onOpenTouch }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isHug = text.includes('Haptic Hug') || text.includes('സ്നേഹാലിംഗനം') || text.includes('Hug');
  const cleanMessage = text.replace(/🫂\s*\[(Virtual Touch|Haptic Hug)[^\]]*\]\s*/i, '').trim();

  const handleFeelTouch = () => {
    setIsPlaying(true);
    if (isHug) {
      triggerTouchHaptics(HAPTIC_PATTERNS.hug);
      playTouchSound('hug', 0.5);
    } else {
      triggerTouchHaptics(HAPTIC_PATTERNS.pulse);
      playTouchSound('gentle', 0.5);
    }

    setTimeout(() => {
      setIsPlaying(false);
    }, 1800);
  };

  return (
    <div className={`virtual-touch-chat-card ${isPlaying ? 'card-pulsing' : ''} ${isHug ? 'is-hug' : ''}`}>
      <div className="vt-card-top">
        <div className="vt-card-icon-wrap">
          <HeartHandshake size={24} className={`vt-card-icon ${isPlaying ? 'hug-anim' : ''}`} />
        </div>
        <div className="vt-card-meta">
          <strong>{isHug ? 'Haptic Hug 🫂 (സ്നേഹാലിംഗനം)' : 'Virtual Touch 🌸 (മൃദുസ്പർശം)'}</strong>
          <span>Sent with loving touch presence · തത്സമയ സ്പർശനം</span>
        </div>
      </div>

      {cleanMessage && <p className="vt-card-message">{cleanMessage}</p>}

      <div className="vt-card-actions">
        <button
          type="button"
          className={`vt-feel-touch-btn ${isPlaying ? 'active' : ''}`}
          onClick={handleFeelTouch}
        >
          <Zap size={14} />
          <span>{isPlaying ? 'Feeling Touch... 🫂' : 'Feel Touch (സ്പർശനം അനുഭവിക്കൂ)'}</span>
        </button>

        {onOpenTouch && (
          <button
            type="button"
            className="vt-touch-back-btn"
            onClick={onOpenTouch}
          >
            <Hand size={14} /> Touch Back
          </button>
        )}
      </div>
    </div>
  );
}

export function DailyPromptCard({ text, onOpenPrompt }) {
  const dateMatch = text.match(/\[Daily Us Prompt · (\d{4}-\d{2}-\d{2})\]/);
  const promptDate = dateMatch ? dateMatch[1] : '';

  const questionMatch = text.match(/❓\s*"([^"]+)"/);
  const questionText = questionMatch ? questionMatch[1] : '';

  const enMatch = text.match(/\(([^)]+)\)/);
  const questionEn = enMatch ? enMatch[1] : '';

  const answers = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const ansMatch = line.match(/^💬\s*([^:]+):\s*"([^"]+)"/);
    if (ansMatch) {
      answers.push({ name: ansMatch[1].trim(), text: ansMatch[2].trim() });
    }
  }

  return (
    <div className="daily-prompt-chat-card">
      <div className="prompt-card-top">
        <div className="prompt-card-badge">
          <Sparkles size={14} className="sparkle-anim" />
          <span>Daily &ldquo;Us&rdquo; Prompt · ഇന്നത്തെ ചോദ്യം</span>
        </div>
        {promptDate && <span className="prompt-card-date">{promptDate}</span>}
      </div>

      {questionText && (
        <div className="prompt-card-question-box">
          <h4 className="prompt-card-q-ml" dir="auto">
            {questionText}
          </h4>
          {questionEn && <p className="prompt-card-q-en">&ldquo;{questionEn}&rdquo;</p>}
        </div>
      )}

      {answers.length > 0 ? (
        <div className="prompt-card-answers-list">
          {answers.map((ans, idx) => (
            <div key={idx} className="prompt-card-bubble">
              <span className="bubble-author-name">{ans.name}:</span>
              <p className="bubble-answer-content" dir="auto">
                &ldquo;{ans.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p dir="auto">{text}</p>
      )}

      <div className="prompt-card-footer">
        <span className="keepsake-tag">Mutual Reveal Keepsake 💖 (തുറന്ന ഉത്തരങ്ങൾ)</span>
        {onOpenPrompt && (
          <button
            type="button"
            className="prompt-card-open-btn"
            onClick={() => onOpenPrompt(promptDate)}
          >
            <span>Open &amp; React ✨</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function ListenTogetherCard({ text, onOpenMusic }) {
  const match = text.match(/🎧\s*\[Listen Together\s*·\s*([^(\]]+)(?:\(([^)]+)\))?\]\s*(.*)/i);
  const titleMl = match ? match[1].trim() : 'നമ്മുടെ പാട്ട്';
  const titleEn = match && match[2] ? match[2].trim() : 'Listen Together';
  const note = match && match[3] ? match[3].trim() : '';

  return (
    <div className="music-chat-card">
      <div className="music-card-header">
        <div className="music-card-icon-wrap">
          <Headphones size={22} className="music-card-headphone" />
        </div>
        <div className="music-card-titles">
          <strong className="music-card-title-ml">{titleMl}</strong>
          <span className="music-card-title-en">{titleEn} · വാച്ച് & ലിസൺ ടുഗെതർ 🎧</span>
        </div>
      </div>
      {note && <p className="music-card-note">&ldquo;{note}&rdquo;</p>}
      <button
        type="button"
        className="music-card-listen-btn"
        onClick={onOpenMusic}
      >
        <Play size={14} />
        <span>Listen Together (ഒരുമിച്ച് കേൾക്കാം 🎵)</span>
      </button>
    </div>
  );
}

export function WatchPartyCard({ text, onOpenWatchParty }) {
  const match = text.match(/🎬\s*\[Watch Party\s*·\s*([^(\]]+)(?:\(([^)<]+)\))?(?:\s*<([^>]+)>)?\]\s*(.*)/i);
  const titleMl = match ? match[1].trim() : 'നമ്മുടെ വാച്ച് പാർട്ടി';
  const titleEn = match && match[2] ? match[2].trim() : 'Watch Party Video';
  const note = match && match[4] ? match[4].trim() : '';

  return (
    <div className="watch-chat-card">
      <div className="watch-card-header">
        <div className="watch-card-icon-wrap">
          <Film size={22} className="watch-card-film" />
        </div>
        <div className="watch-card-titles">
          <strong className="watch-card-title-ml">{titleMl}</strong>
          <span className="watch-card-title-en">{titleEn} · വാച്ച് പാർട്ടി 🍿</span>
        </div>
      </div>
      {note && <p className="watch-card-note">&ldquo;{note}&rdquo;</p>}
      <button
        type="button"
        className="watch-card-join-btn"
        onClick={onOpenWatchParty}
      >
        <Play size={14} />
        <span>Watch Together (ഒന്നിച്ച് കാണാം 🍿)</span>
      </button>
    </div>
  );
}

export function StoryMemoryCard({ text, onOpenStory }) {
  const parsed = parseStoryShare(text);
  if (!parsed || parsed.type !== 'memory') {
    return <p dir="auto">{text}</p>;
  }

  const cat = STORY_CATEGORIES[parsed.category] || STORY_CATEGORIES.sweet_moment;

  return (
    <div className="story-chat-card">
      <div className="story-chat-card-top">
        <div className="story-chat-card-badge" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
          <span>{parsed.emoji || cat.icon}</span>
          <strong>{cat.labelMl}</strong>
        </div>
        {parsed.date && <span className="story-chat-card-date">📅 {parsed.date}</span>}
      </div>

      <h4 className="story-chat-card-title">{parsed.title}</h4>

      {parsed.description && (
        <p className="story-chat-card-desc" dir="auto">
          &ldquo;{parsed.description}&rdquo;
        </p>
      )}

      {parsed.photo_url && (
        <div className="story-chat-card-photo-wrap">
          <img src={parsed.photo_url} alt={parsed.title} className="story-chat-card-photo" />
        </div>
      )}

      <div className="story-chat-card-footer">
        <span className="story-chat-subtext">Our Story Memory · നമ്മുടെ ഓർമ്മകൾ 💕</span>
        {onOpenStory && (
          <button
            type="button"
            className="story-chat-open-btn"
            onClick={() => onOpenStory('timeline')}
          >
            <span>View in Our Story 📖</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function StoryMilestoneCard({ text, onOpenStory }) {
  const parsed = parseStoryShare(text);
  if (!parsed || parsed.type !== 'milestone') {
    return <p dir="auto">{text}</p>;
  }

  const isCelebration = parsed.daysRemaining === 0;

  return (
    <div className={`story-chat-card milestone ${isCelebration ? 'celebration-card' : ''}`}>
      <div className="story-chat-card-top">
        <div className="story-chat-card-badge">
          <span>{parsed.emoji || '💖'}</span>
          <strong>വിശേഷ ദിവസം · Milestone</strong>
        </div>
        {parsed.targetDate && <span className="story-chat-card-date">🎯 {parsed.targetDate}</span>}
      </div>

      <h4 className="story-chat-card-title">{parsed.title}</h4>

      <div className="story-chat-milestone-stats">
        <div className="story-chat-stat-pill">
          <Heart size={12} fill="#ef4444" color="#ef4444" />
          <span>Together for {parsed.daysTogether} Days</span>
        </div>
        <div className="story-chat-stat-pill countdown">
          <Clock size={12} />
          <span>
            {isCelebration
              ? 'Today is the day! 🎉'
              : `${parsed.daysRemaining} days remaining`}
          </span>
        </div>
      </div>

      {parsed.note && (
        <p className="story-chat-card-desc" dir="auto">
          &ldquo;{parsed.note}&rdquo;
        </p>
      )}

      <div className="story-chat-card-footer">
        <span className="story-chat-subtext">Countdown &amp; Milestones · വിശേഷ ദിവസങ്ങൾ ✨</span>
        {onOpenStory && (
          <button
            type="button"
            className="story-chat-open-btn"
            onClick={() => onOpenStory('milestones')}
          >
            <span>Open Countdown ⏳</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function TimeCapsuleChatCard({ text, onOpenTimeCapsule }) {
  const parsed = parseTimeCapsuleChatShare(text);
  if (!parsed) {
    return <p dir="auto">{text}</p>;
  }

  const countdown = calculateCapsuleCountdown(parsed.unlock_at);
  const occ = TIME_CAPSULE_OCCASIONS[parsed.occasion] || TIME_CAPSULE_OCCASIONS.custom;
  const seal = SEAL_SYMBOLS[parsed.seal_symbol] || SEAL_SYMBOLS.heart;
  const isUnlocked = countdown.isUnlocked;

  return (
    <div className={`time-capsule-chat-card ${isUnlocked ? 'unlocked' : 'sealed'}`}>
      <div className="tc-chat-card-top">
        <div className="tc-chat-card-badge">
          <span>{occ.icon}</span>
          <strong>{occ.labelMl}</strong>
          <span className="tc-chat-sep">·</span>
          <span>{occ.labelEn}</span>
        </div>
        <div className="tc-chat-seal-stamp">
          <span>{seal.emoji}</span>
        </div>
      </div>

      <h4 className="tc-chat-card-title">{parsed.title}</h4>

      <div className="tc-chat-card-info-row">
        <span>Sealed with love by <strong>{parsed.sender_name}</strong></span>
        {parsed.has_audio && <span className="tc-chat-pill-voice">🎙️ Voice Note</span>}
        {parsed.has_photo && <span className="tc-chat-pill-photo">📸 Photo</span>}
      </div>

      <div className={`tc-chat-countdown-bar ${isUnlocked ? 'ready' : ''}`}>
        {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
        <span>
          {isUnlocked
            ? 'Unlocked with Love! 💌 (ഇപ്പോൾ തുറക്കാം)'
            : `Unlocks in: ${countdown.labelEn} (${countdown.labelMl})`}
        </span>
      </div>

      <div className="tc-chat-card-footer">
        <span className="tc-chat-footer-label">Digital Time Capsule · രഹസ്യ കത്ത് ⏳</span>
        {onOpenTimeCapsule && (
          <button
            type="button"
            className="tc-chat-open-btn"
            onClick={() => onOpenTimeCapsule(parsed.id)}
          >
            {isUnlocked ? (
              <>
                <Unlock size={14} />
                <span>Open Secret Love Letter 🔓✨ (തുറക്കുക)</span>
              </>
            ) : (
              <>
                <Lock size={14} />
                <span>View Sealed Capsule 💌 (കാണുക)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function MonthlyRecapCard({ text, onOpenRecap }) {
  const parsed = parseMonthlyRecapShare(text);
  if (!parsed) {
    return <p dir="auto">{text}</p>;
  }

  return (
    <div className="monthly-recap-chat-card">
      <div className="recap-chat-top">
        <div className="recap-chat-badge">
          <Sparkles size={14} className="sparkle-icon" />
          <strong>Our Month in Review · പ്രതിമാസ റീക്യാപ്പ്</strong>
        </div>
        <span className="recap-chat-stamp">📸🎞️</span>
      </div>

      <h4 className="recap-chat-title">{parsed.titleMl || parsed.titleEn}</h4>
      <span className="recap-chat-sub">{parsed.titleEn}</span>

      <div className="recap-chat-metrics">
        <span className="recap-metric-pill">💬 {parsed.stats?.messagesCount || 0} സന്ദേശങ്ങൾ</span>
        <span className="recap-metric-pill">📸 {parsed.stats?.photosCount || 0} ചിത്രങ്ങൾ</span>
        <span className="recap-metric-pill">🎙️ {parsed.stats?.voiceNotesCount || 0} വോയ്സുകൾ</span>
        <span className="recap-metric-pill">💓 {parsed.stats?.heartbeatsCount || 0} സ്പന്ദനങ്ങൾ</span>
      </div>

      {(parsed.highlightMl || parsed.highlightEn) && (
        <p className="recap-chat-quote" dir="auto">
          &ldquo;{parsed.highlightMl || parsed.highlightEn}&rdquo;
        </p>
      )}

      <div className="recap-chat-footer">
        <span className="recap-chat-hint">Instagram Story രൂപത്തിലുള്ള ഓർമ്മകൾ ✨</span>
        {onOpenRecap && (
          <button
            type="button"
            className="recap-chat-open-btn"
            onClick={() => onOpenRecap(parsed.month)}
          >
            <span>Open Story 🎞️ (റീക്യാപ്പ് കാണുക)</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function VoiceDuetCard({ text, onOpenDuet }) {
  const cleanTitle = text.replace(/^🎙️🎶\s*\[Voice Duet:\s*/i, '').replace(/\]$/, '') || 'Our Love Duet';

  return (
    <div className="voice-duet-chat-card">
      <div className="duet-chat-top">
        <div className="duet-chat-badge">
          <Music size={14} />
          <strong>Voice Note Duet · രണ്ടുപേരും ചേർന്ന പാട്ട്</strong>
        </div>
        <span className="duet-chat-stamp">🎙️🎶</span>
      </div>

      <h4 className="duet-chat-title">{cleanTitle}</h4>
      <p className="duet-chat-desc">
        പങ്കാളിയുടെ വരികൾക്ക് മറുപടിയായി പാടി ചേർത്തുവെച്ച പ്രണയഗാനം (Our Joint Harmony) 💖
      </p>

      <div className="duet-chat-footer">
        <span className="duet-chat-sub">Voice Note Duet Studio</span>
        {onOpenDuet && (
          <button
            type="button"
            className="duet-chat-open-btn"
            onClick={() => onOpenDuet()}
          >
            <span>Duet Studio 🎙️ (തുറക്കുക)</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function Message({ message, mine, peerRead, user, capabilities, onError, onReply, onForward, onChanged, highlighted, group, contactBlocked, onOpenDailyPrompt, onOpenMusic, onOpenWatchParty, onOpenStory, onOpenTouch, onOpenTimeCapsule, onOpenSleep, onOpenMonthlyRecap, onOpenVoiceDuet, onDuetVoiceNote }) {
  const [showHistory, setShowHistory] = useState(false);
  const { canDelete, expiration } = useMessageClock(message);
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

  const saveMessage = async kind => {
    setActionBusy(true);
    try {
      const enabled = kind==='star' ? message.starred : message.pinned;
      await api(`/messages/${message.id}/${kind}`, { method:enabled?'DELETE':'PUT' });
      await onChanged?.();
    } catch(e) { onError(e.message); } finally { setActionBusy(false); }
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
    // Let text and controls keep their native selection and interaction behavior.
    if (e.target.closest('p, blockquote, button, a, input, textarea, audio, video')) return;
    if (e.type === 'mousedown' && e.button !== 0) return;
    if (window.getSelection()?.toString()) return;
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
  const translatedText = !mine && !message.deleted_at ? receiverMessageText(message, user.language) : null;
  const translated = Boolean(translatedText);
  const label = text => featureText(text, 'en');

  const isAudioNote =
    message.attachment &&
    (message.attachment.mime?.startsWith('audio/') ||
      (/^voice-note-/.test(message.attachment.name || '') &&
        message.attachment.mime === 'video/webm'));

  const isInvisibleInk = !message.deleted_at && isMessageInvisibleInk(message.text);
  const isFeatureShare = !message.deleted_at && /^(?:🫂 \[(?:Virtual Touch|Haptic Hug)|💓 \[Heartbeat Pulse|✨ \[Daily Us Prompt|🎧 \[Listen Together|🎬 \[Watch Party|\[OUR_STORY_|🌟 \[Our Story Memory|⏳ \[Our Story Milestone|💍 \[Our Story Milestone|\[TIME_CAPSULE:|💌 \[Digital Time Capsule|⏳ \[Digital Time Capsule|🌌 \[Sleep Together|\[MONTHLY_RECAP:|📸🎞️ \[Monthly Recap|🎙️🎶 \[Voice Duet:)/u.test(message.text || '');

  const defaultVoiceLang =
    user.language || 'en';
  const [selectedVoiceLang, setSelectedVoiceLang] = useState(defaultVoiceLang);
  const [translatingLang, setTranslatingLang] = useState(null);
  const [transcriptionOpen, setTranscriptionOpen] = useState(true);
  const [copiedVoiceText, setCopiedVoiceText] = useState(false);
  useEffect(() => { setSelectedVoiceLang(user.language || 'en'); }, [user.language]);

  const currentVoiceItem =
    message.translations?.[selectedVoiceLang] ||
    (selectedVoiceLang === 'transcript' ? (message.translations?.transcript || message.translations?.original) : null) ||
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
    utterance.lang = (lang === 'ml' || lang === 'manglish' || lang === 'transcript') ? 'ml-IN' : lang === 'sw' ? 'sw-KE' : 'en-US';
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
    const textToSpeak = currentVoiceText || (readingTranslation ? translatedText : message.text);
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
        {message.reply && !hasExpired(message.reply) && <blockquote className="quoted-reply"><strong>{message.reply.sender}</strong><p>{message.reply.deleted_at ? 'Message deleted' : message.reply.text || (message.reply.sticker ? stickers[message.reply.sticker] : 'Attachment')}</p></blockquote>}
        {message.forwarded_from && (
          <div className="forwarded-indicator">
            <span className="forwarded-icon">↗</span>
            <span className="forwarded-label">
              Forwarded from {message.forwarded_from.sender_name}
            </span>
          </div>
        )}
        {group && !mine && <small className="group-sender">{message.sender?.name || 'Member'}</small>}
        {message.sticker && (
          <div className="sticker" aria-label={message.sticker}>
            {stickers[message.sticker]}
          </div>
        )}
        {!isInvisibleInk && (message.view_once && !message.deleted_at ? <ViewOnceMedia message={message} mine={mine} onError={onError} /> : message.attachment && <Attachment attachment={message.attachment} onError={onError} />)}
        {translated && isFeatureShare && !isInvisibleInk && <div className="received-feature-translation"><small>{label('Translated message')} · {languages[user.language]}</small><p dir="auto">{translatedText}</p><small>{label('Sender’s original message')}</small></div>}
        {editing ? (
          <form className="message-edit" onSubmit={event => { event.preventDefault(); void mutate('PATCH'); }}>
            <textarea aria-label="Edit message" value={editText} onChange={event => setEditText(event.target.value)} maxLength={5000} disabled={actionBusy} autoFocus />
            <button type="submit" disabled={actionBusy || !editText.trim()}>Save</button>
            <button type="button" disabled={actionBusy} onClick={() => setEditing(false)}>Cancel</button>
          </form>
        ) : isAudioNote ? (
          message.text ? <p dir="auto" className="voice-caption">{message.text}</p> : null
        ) : !message.deleted_at && (message.text?.startsWith('🫂 [Virtual Touch') || message.text?.startsWith('🫂 [Haptic Hug')) ? (
          <VirtualTouchCard text={message.text} onOpenTouch={onOpenTouch} />
        ) : !message.deleted_at && message.text?.startsWith('💓 [Heartbeat Pulse') ? (
          <HeartbeatCard text={message.text} />
        ) : !message.deleted_at && message.text?.startsWith('✨ [Daily Us Prompt') ? (
          <DailyPromptCard text={message.text} onOpenPrompt={onOpenDailyPrompt} />
        ) : !message.deleted_at && message.text?.startsWith('🎧 [Listen Together') ? (
          <ListenTogetherCard text={message.text} onOpenMusic={onOpenMusic} />
        ) : !message.deleted_at && message.text?.startsWith('🎬 [Watch Party') ? (
          <WatchPartyCard text={message.text} onOpenWatchParty={onOpenWatchParty} />
        ) : !message.deleted_at && (message.text?.startsWith('[OUR_STORY_MEMORY]') || message.text?.startsWith('🌟 [Our Story Memory')) ? (
          <StoryMemoryCard text={message.text} onOpenStory={onOpenStory} />
        ) : !message.deleted_at && (message.text?.startsWith('[OUR_STORY_MILESTONE]') || message.text?.startsWith('⏳ [Our Story Milestone') || message.text?.startsWith('💍 [Our Story Milestone')) ? (
          <StoryMilestoneCard text={message.text} onOpenStory={onOpenStory} />
        ) : !message.deleted_at && (message.text?.startsWith('[TIME_CAPSULE:') || message.text?.startsWith('💌 [Digital Time Capsule') || message.text?.startsWith('⏳ [Digital Time Capsule')) ? (
          <TimeCapsuleChatCard text={message.text} onOpenTimeCapsule={onOpenTimeCapsule} />
        ) : !message.deleted_at && message.text?.startsWith('🌌 [Sleep Together') ? (
          <SleepTogetherCard text={message.text} onOpenSleep={onOpenSleep} />
        ) : !message.deleted_at && (message.text?.startsWith('[MONTHLY_RECAP:') || message.text?.startsWith('📸🎞️ [Monthly Recap')) ? (
          <MonthlyRecapCard text={message.text} onOpenRecap={onOpenMonthlyRecap} />
        ) : !message.deleted_at && message.text?.startsWith('🎙️🎶 [Voice Duet:') ? (
          <VoiceDuetCard text={message.text} onOpenDuet={onOpenVoiceDuet} />
        ) : isInvisibleInk ? (
          <InvisibleInkCard message={message} mine={mine} onError={onError} />
        ) : (
          <p dir="auto" lang={translated ? user.language === 'manglish' ? 'ml-Latn' : user.language : undefined}>{message.deleted_at ? 'Message deleted' : translated ? translatedText : message.text}</p>
        )}
        {isAudioNote && (
          <div className="voice-translation-card" role="region" aria-label="Voice note transcription">
            <div className="voice-translation-header">
              <div className="voice-translation-title-area">
                <div className="voice-translation-badge">
                  <FileText size={13} className="sparkle-icon" />
                  <strong>വോയ്സ് നോട്ട് ടെക്സ്റ്റാക്കാം</strong>
                </div>
                <span className="voice-transcription-subtext">
                  കേൾക്കാൻ സാഹചര്യമില്ലെങ്കിൽ വായിക്കാം
                </span>
              </div>
              {currentVoiceText && (
                <button
                  type="button"
                  className="voice-collapse-btn"
                  onClick={() => setTranscriptionOpen(!transcriptionOpen)}
                  title={transcriptionOpen ? "ചുരുക്കുക (Hide)" : "വായിക്കുക (Read)"}
                  aria-expanded={transcriptionOpen}
                >
                  {transcriptionOpen ? (
                    <>
                      <span>ചുരുക്കുക</span>
                      <ChevronUp size={12} />
                    </>
                  ) : (
                    <>
                      <span>വായിക്കുക</span>
                      <ChevronDown size={12} />
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="voice-lang-chips" role="tablist" aria-label="Voice translation languages">
              {[
                { id: 'ml', label: 'മലയാളം' },
                { id: 'manglish', label: 'Manglish' },
                { id: 'en', label: 'English' },
                { id: 'transcript', label: 'Original' },
                { id: 'sw', label: 'Kiswahili' },
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

            {isVoicePending ? (
              <div className="voice-translating-state">
                <LoaderCircle size={13} className="spin" />
                <span>വോയ്സ് നോട്ട് ടെക്സ്റ്റാക്കുന്നു... ({languages[selectedVoiceLang] || (selectedVoiceLang === 'transcript' ? 'Original' : selectedVoiceLang)})</span>
              </div>
            ) : currentVoiceText ? (
              transcriptionOpen && (
                <div className="voice-translation-body">
                  <p className="voice-translated-text" dir="auto">
                    {currentVoiceText}
                  </p>
                  {!mine && !message.deleted_at && selectedVoiceLang !== 'transcript' && message.translations?.transcript?.status === 'ready' && <div className="sender-original"><small>{label('Sender’s original message')}</small><p dir="auto">{message.translations.transcript.text}</p></div>}
                  <div className="voice-translation-footer">
                    <span className="voice-lang-desc">
                      {selectedVoiceLang === 'transcript'
                        ? '🎙️ ഒറിജിനൽ ശബ്ദം (Original voice speech)'
                        : selectedVoiceLang === 'en'
                          ? 'English transcription'
                          : `${languages[selectedVoiceLang] || selectedVoiceLang} text`}
                    </span>
                    <div className="voice-action-group">
                      <button
                        type="button"
                        className="voice-listen-action"
                        title="കോപ്പി ചെയ്യുക"
                        onClick={() => {
                          if (navigator.clipboard?.writeText) {
                            navigator.clipboard.writeText(currentVoiceText).catch(() => {});
                          }
                          setCopiedVoiceText(true);
                          setTimeout(() => setCopiedVoiceText(false), 2000);
                        }}
                      >
                        <Copy size={12} /> {copiedVoiceText ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        className="voice-listen-action"
                        title="Listen to transcription"
                        onClick={() => playVoiceText(currentVoiceText, selectedVoiceLang)}
                      >
                        <Volume2 size={12} /> Listen
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="voice-transcription-cta">
                <button
                  type="button"
                  className="voice-fetch-btn voice-transcribe-main-btn"
                  onClick={() => void requestVoiceTranslation(selectedVoiceLang)}
                >
                  <FileText size={14} />
                  <span>ഒറ്റ ക്ലിക്കിൽ വായിക്കുക (Transcribe & Read)</span>
                </button>
                <small className="voice-cta-caption">
                  കേൾക്കാൻ സാഹചര്യമില്ലാത്തപ്പോൾ ഒറ്റ ക്ലിക്കിൽ വായിക്കാം · സൗജന്യ ട്രാൻസ്ക്രിപ്ഷൻ
                </small>
              </div>
            )}
          </div>
        )}
        {isAudioNote && !mine && onDuetVoiceNote && message.attachment && (
          <div className="voice-duet-cta-container">
            <button
              type="button"
              className="voice-duet-quick-btn"
              onClick={() => onDuetVoiceNote(message.attachment)}
              title="പങ്കാളി പാടിയ ഈ വരിക്ക് മറുപടി പാടി ഡ്യുയറ്റ് ഗാനം ഉണ്ടാക്കൂ"
            >
              <Music size={13} />
              <span>ഡ്യുയറ്റ് പാടുക 🎙️🎶 (Sing Duet with this line)</span>
            </button>
          </div>
        )}
        {!isAudioNote && !message.deleted_at && !isInvisibleInk && !isFeatureShare && translated && (
          <>
            <small className="translation-label">{label('Translated message')} · {languages[user.language]}</small>
            <div className="sender-original">
              <small>{label('Sender’s original message')}{languages[message.source_language] ? ` · ${languages[message.source_language]}` : ''}</small>
              <p dir="auto">{message.text}</p>
            </div>
          </>
        )}
        {!isAudioNote && !message.deleted_at && !isInvisibleInk && mine && message.text && message.receiver_translation && (
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
        {!isAudioNote && !message.deleted_at && !isInvisibleInk && !mine && message.translation?.status === 'pending' && (
          <small className="translation-label">{label('Translating… · Original shown')}</small>
        )}
        {!isAudioNote && !message.deleted_at && !isInvisibleInk && !mine && message.translation?.status === 'failed' && (
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
            <RefreshCw size={12} /> {label('Translation unavailable · Retry')}
          </button>
        )}
        <div className="message-meta">
          {message.expires_at && <small title={"Disappears " + new Date(message.expires_at).toLocaleString()}>{expiration}</small>}
          {message.edited_at && !message.deleted_at && <button type="button" className="message-history-link" onClick={() => setShowHistory(true)} aria-label="View message editing history">Edited · History</button>}
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
        <button type="button" aria-pressed={!!message.starred} disabled={actionBusy || message.view_once} onClick={() => void saveMessage("star")}>{message.starred ? "Unstar" : "Star"}</button>
        <button type="button" aria-pressed={!!message.pinned} disabled={actionBusy || contactBlocked || message.view_once} onClick={() => void saveMessage("pin")}>{message.pinned ? "Unpin" : "Pin"}</button>
        {onForward && !message.view_once && <button type="button" disabled={actionBusy || contactBlocked} onClick={() => onForward(message)}>Forward</button>}
        {onReply && <button type="button" disabled={actionBusy} onClick={() => onReply(message)}>Reply</button>}
        {mine && message.text && <button type="button" disabled={actionBusy} onClick={() => { setEditText(message.text); setEditing(true); }}>Edit</button>}
        {mine && <button type="button" disabled={actionBusy || !canDelete} title={canDelete ? 'Delete for everyone within 24 hours' : 'The 24-hour deletion window has ended'} onClick={() => setConfirmDelete(true)}>Delete</button>}
      </div>}
      {confirmDelete && <div className="message-delete-confirm" role="alert"><span>{canDelete ? 'Delete this message and its edit history for everyone? Available for 24 hours after sending.' : 'The 24-hour deletion window has ended.'}</span><button type="button" disabled={actionBusy || !canDelete} onClick={() => void mutate('DELETE')}>Delete for everyone</button><button type="button" disabled={actionBusy} onClick={() => setConfirmDelete(false)}>Cancel</button></div>}
      {showHistory && !message.deleted_at && <MessageHistory message={message} onClose={() => setShowHistory(false)} />}
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
            <MediaPlayer key={media.url} src={media.url} video onError={onError} />
          ) : (
            <TalkingAvatar person={user} audioUrl={media.url} />
          )
        ) : (
          <MediaPlayer key={media.url} src={media.url} onError={onError} />
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
export function CallOverlay({ controller, user, peer, musicController, socket, onOpenGames, onSaveCallSnippet }) {
  const {
    call,
    local,
    remote,
    phase,
    sharing,
    muted,
    cameraOff,
    rawStream,
    replaceVideoTrack,
    updateLocalStream,
  } = controller;
  const [seconds, setSeconds] = useState(0);
  const [remoteVideo, setRemoteVideo] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState('none');
  const [showARPanel, setShowARPanel] = useState(false);
  const stageRef = useRef(null);
  const processorRef = useRef(null);
  const originalStreamRef = useRef(null);

  // Snippet states: 'idle' | 'requesting' | 'incoming_request' | 'recording' | 'completed'
  const [snippetState, setSnippetState] = useState('idle');
  const [snippetCountdown, setSnippetCountdown] = useState(15);
  const [snippetRequester, setSnippetRequester] = useState('');
  const [snippetUrl, setSnippetUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const snippetTimerRef = useRef(null);

  // 15-second snippet recording
  const startRecordingSnippet = useCallback(() => {
    try {
      recordedChunksRef.current = [];
      const streamToRecord = remote || local || originalStreamRef.current;
      if (!streamToRecord) return;

      let recorder;
      try {
        recorder = new MediaRecorder(streamToRecord, { mimeType: 'video/webm;codecs=vp8,opus' });
      } catch {
        recorder = new MediaRecorder(streamToRecord);
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setSnippetUrl(url);
        setSnippetState('completed');
        onSaveCallSnippet?.(blob, url);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setSnippetState('recording');
      setSnippetCountdown(15);

      let timeLeft = 15;
      clearInterval(snippetTimerRef.current);
      snippetTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        setSnippetCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(snippetTimerRef.current);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 1000);
    } catch {
      setSnippetState('idle');
    }
  }, [remote, local, onSaveCallSnippet]);

  // Dual-consent socket signals
  useEffect(() => {
    if (!socket || !call) return;

    const handleSnippetSignal = (payload) => {
      if (payload.call_id !== call.id) return;

      if (payload.type === 'request') {
        setSnippetRequester(payload.sender_name || peer?.name || 'Partner');
        setSnippetState('incoming_request');
      } else if (payload.type === 'consent') {
        if (payload.consented) {
          startRecordingSnippet();
        } else {
          setSnippetState('idle');
        }
      }
    };

    socket.on('call:snippet', handleSnippetSignal);
    return () => {
      socket.off('call:snippet', handleSnippetSignal);
      clearInterval(snippetTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [socket, call, peer?.name, startRecordingSnippet]);

  const handleRequestSnippet = () => {
    if (!socket || !call) return;
    setSnippetState('requesting');
    socket.emit('call:snippet', {
      call_id: call.id,
      type: 'request',
      requester_name: user.name,
    });
  };

  const handleConsentSnippet = (consent) => {
    if (!socket || !call) return;
    if (consent) {
      socket.emit('call:snippet', {
        call_id: call.id,
        type: 'consent',
        consented: true,
      });
      startRecordingSnippet();
    } else {
      socket.emit('call:snippet', {
        call_id: call.id,
        type: 'consent',
        consented: false,
      });
      setSnippetState('idle');
    }
  };

  // Initialize AR Video Processor
  useEffect(() => {
    processorRef.current = new ARVideoProcessor();
    return () => {
      processorRef.current?.destroy();
      processorRef.current = null;
    };
  }, []);

  // Track the raw camera stream whenever available
  useEffect(() => {
    const streamToSave = rawStream || (local && activeFilterId === 'none' ? local : null);
    if (streamToSave && streamToSave.getVideoTracks().length > 0) {
      originalStreamRef.current = streamToSave;
      processorRef.current?.setRawStream(streamToSave);
    }
  }, [rawStream, local, activeFilterId]);

  // Clean up filter on call end
  useEffect(() => {
    if (!call || ['ended', 'declined', 'missed'].includes(call.state)) {
      setActiveFilterId('none');
      setShowARPanel(false);
      processorRef.current?.stop();
    }
  }, [call]);

  const handleFilterSelect = useCallback(
    (filterId, options = {}) => {
      setActiveFilterId(filterId);
      const proc = processorRef.current;
      if (!proc) return;

      const baseStream = originalStreamRef.current || rawStream || local;

      if (filterId === 'none') {
        proc.setFilter('none');
        proc.stop();
        if (replaceVideoTrack) {
          const originalVideoTrack = baseStream?.getVideoTracks()[0] || null;
          replaceVideoTrack(originalVideoTrack);
        }
        if (updateLocalStream && baseStream) {
          updateLocalStream(new MediaStream(baseStream.getTracks()));
        }
      } else {
        if (baseStream) {
          proc.setRawStream(baseStream);
        }
        proc.setFilter(filterId, options);
        proc.start();

        const outStream = proc.getOutputStream(30);
        const filteredTrack = outStream?.getVideoTracks()[0];
        if (filteredTrack) {
          replaceVideoTrack?.(filteredTrack);
          const audioTracks = baseStream?.getAudioTracks() || [];
          updateLocalStream?.(new MediaStream([filteredTrack, ...audioTracks]));
        }
      }
    },
    [rawStream, local, replaceVideoTrack, updateLocalStream],
  );

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
  const activeFilter = getFilterById(activeFilterId);
  const isMl = false;

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
      <div className="call-stage" ref={stageRef}>
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
        {musicController?.active && musicController?.dock}

        {/* Active AR Filter Indicator Pill */}
        {call.kind === 'video' && activeFilterId !== 'none' && (
          <div className="active-ar-indicator">
            <span className="ar-indicator-dot" />
            <span className="ar-indicator-title">
              {activeFilter.icon} {isMl ? activeFilter.nameMl : activeFilter.nameEn}
            </span>
            <button
              type="button"
              className="ar-indicator-clear"
              onClick={() => handleFilterSelect('none')}
              title="Remove AR filter"
              aria-label="Remove AR Filter"
            >
              ✕
            </button>
          </div>
        )}

        {/* In-Call AR Filters & Virtual Backgrounds Studio Drawer */}
        <ARFilterStudio
          isOpen={showARPanel}
          onClose={() => setShowARPanel(false)}
          activeFilterId={activeFilterId}
          onSelectFilter={handleFilterSelect}
          processor={processorRef.current}
          isMalayalam={isMl}
        />

        {call && (call.state === 'active' || phase === 'Connected') && (
          <CallReactionOverlay
            call={call}
            user={user}
            peer={peer}
            socket={socket}
            isMalayalam={isMl}
            containerRef={stageRef}
          />
        )}

        {/* Snippet Recording Status Overlay */}
        {snippetState === 'recording' && (
          <div className="call-snippet-recording-pill animate-fade-in">
            <span className="snippet-rec-dot" />
            <span>Recording 15s Memory Snippet... {snippetCountdown}s 💖</span>
          </div>
        )}

        {/* Snippet Waiting for Consent */}
        {snippetState === 'requesting' && (
          <div className="call-snippet-waiting-pill animate-fade-in">
            <span>Asking {peer?.name || 'partner'} for permission... 📸</span>
          </div>
        )}

        {/* Dual Consent Dialog */}
        {snippetState === 'incoming_request' && (
          <div className="call-snippet-consent-modal animate-fade-in">
            <div className="consent-modal-card">
              <Camera size={26} className="consent-cam-icon" />
              <h4>{isMl ? 'മെമ്മറി സ്നിപ്പെറ്റ് അനുവാദം 📸' : 'Call Memory Snippet 📸'}</h4>
              <p>
                {isMl
                  ? `${snippetRequester} ഈ കോളിലെ ക്യൂട്ട് ആയ 15 സെക്കൻഡ് നിമിഷം ഓർമ്മയായി സേവ് ചെയ്യാൻ അനുവാദം ചോദിക്കുന്നു. സമ്മതമാണോ?`
                  : `${snippetRequester} wants to save a 15-second call memory highlight to your vault. Allow?`}
              </p>
              <div className="consent-actions-row">
                <button
                  type="button"
                  className="consent-accept-btn"
                  onClick={() => handleConsentSnippet(true)}
                >
                  {isMl ? 'സമ്മതം 💖 (Allow)' : 'Allow 💖'}
                </button>
                <button
                  type="button"
                  className="consent-decline-btn"
                  onClick={() => handleConsentSnippet(false)}
                >
                  {isMl ? 'വേണ്ട (Decline)' : 'Decline'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Snippet Completed Pill */}
        {snippetState === 'completed' && (
          <div className="call-snippet-completed-pill animate-fade-in">
            <span>✨ {isMl ? '15 സെക്കൻഡ് മെമ്മറി സേവ് ചെയ്തു! 💖' : '15s Call Memory Saved! 💖'}</span>
            {snippetUrl && (
              <a
                href={snippetUrl}
                download={`kipenzi-memory-${Date.now()}.webm`}
                className="snippet-download-link"
              >
                Download ⬇️
              </a>
            )}
            <button
              type="button"
              className="snippet-dismiss-btn"
              onClick={() => setSnippetState('idle')}
            >
              ✕
            </button>
          </div>
        )}
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
            {call.kind === 'video' && !cameraOff && (
              <button
                className={`call-control ${activeFilterId !== 'none' || showARPanel ? 'toggled' : ''}`}
                onClick={() => setShowARPanel((prev) => !prev)}
                aria-label="AR Filters & Backgrounds"
                title="AR ഫിൽട്ടറുകളും ബാക്ക്ഗ്രൗണ്ടുകളും (AR Filters & Backgrounds ✨)"
              >
                <Sparkles />
              </button>
            )}
            {call.kind === 'video' && phase === 'Connected' && (
              <button
                className={`call-control ${snippetState === 'recording' ? 'danger toggled' : ''}`}
                onClick={handleRequestSnippet}
                disabled={snippetState !== 'idle'}
                title="15-Second Memory Snippet 📸 (15 സെക്കൻഡ് മെമ്മറി സ്നിപ്പെറ്റ്)"
                aria-label="Save 15s Memory Snippet"
              >
                <Camera />
              </button>
            )}
            {onOpenGames && phase === 'Connected' && (
              <button
                className="call-control"
                onClick={onOpenGames}
                title="Play Couple Games in Call 🎮 (കോളിൽ കപ്പിൾ ഗെയിംസ് കളിക്കാം)"
                aria-label="Play Couple Games"
              >
                <Gamepad2 />
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
            {musicController && (
              <button
                className={`call-control ${musicController.active ? 'toggled' : ''}`}
                onClick={musicController.toggle}
                aria-label={musicController.active ? 'Hide shared music dock' : 'Listen to music together'}
                title="വാച്ച് & ലിസൺ ടുഗെതർ (Listen to Music Together 🎧)"
              >
                <Headphones />
              </button>
            )}
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

export { StickerCreatorModal } from './StickerCreator.jsx';

export function ConversationPicker({ conversations, onSelect, onCancel, messagePreview }) {
  const [search, setSearch] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  
  const filtered = conversations.filter((c) =>
    `${c.peer.name} ${c.peer.handle}`.toLowerCase().includes(search.toLowerCase()),
  );

  const handleForward = async () => {
    if (!selectedConversation) return;
    await onSelect(selectedConversation, caption.trim() || undefined);
  };

  return (
    <Modal title="Forward Message" onClose={onCancel} wide>
      <div className="conversation-picker">
        <div className="picker-search-section">
          <label className="search-box">
            <Search size={17} />
            <input
              placeholder="Search conversations..."
              aria-label="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </label>
        </div>

        {messagePreview && (
          <div className="forward-message-preview">
            <div className="preview-label">
              <span className="preview-icon">↗</span>
              <strong>Message to forward:</strong>
            </div>
            <div className="preview-bubble">
              {messagePreview.sticker && (
                <div className="preview-sticker">{stickers[messagePreview.sticker]}</div>
              )}
              {messagePreview.text && <p dir="auto">{messagePreview.text}</p>}
              {messagePreview.attachment && (
                <div className="preview-attachment">
                  <Paperclip size={14} />
                  <span>{messagePreview.attachment.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="picker-conversations-list">
          <div className="list-label">SELECT CONVERSATION</div>
          {filtered.length > 0 ? (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`picker-conversation-item ${selectedConversation?.id === c.id ? 'selected' : ''}`}
                onClick={() => setSelectedConversation(c)}
              >
                <Avatar person={c.peer} />
                <div className="picker-conversation-text">
                  <strong>{c.is_group ? c.name : c.peer.name}</strong>
                  <p>
                    {c.is_group
                      ? `${c.members.length} members`
                      : `@${c.peer.handle}`}
                  </p>
                </div>
                {selectedConversation?.id === c.id && (
                  <div className="picker-check">
                    <Check size={18} />
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="picker-empty">
              <MessageCircle size={26} />
              <p>
                {search
                  ? 'No conversations match your search.'
                  : 'No conversations available.'}
              </p>
            </div>
          )}
        </div>

        {selectedConversation && (
          <div className="picker-caption-section">
            <label>
              Add context (optional)
              <textarea
                placeholder="Add a message with the forwarded content..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={5000}
                rows={3}
              />
            </label>
          </div>
        )}

        <div className="picker-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={!selectedConversation}
            onClick={handleForward}
          >
            <Send size={16} />
            Forward to {selectedConversation ? (selectedConversation.is_group ? selectedConversation.name : selectedConversation.peer.name) : '...'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
