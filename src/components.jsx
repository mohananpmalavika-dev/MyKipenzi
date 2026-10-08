import { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { api, fileBlob, downloadFile } from './api.js';
import { languages, stickers } from '../shared/constants.js';
import { startLovingRingtone, stopLovingRingtone } from './ringtone.js';
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
export function Settings({ user, capabilities, onClose, onUser, onError }) {
  const [draft, setDraft] = useState({
      name: user.name,
      language: user.language,
      ai_consent: user.ai_consent,
      likeness_consent: user.likeness_consent,
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
function Attachment({ attachment, onError }) {
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
export function Message({ message, mine, peerRead, user, capabilities, onError }) {
  const [original, setOriginal] = useState(false),
    [job, setJob] = useState(null),
    [media, setMedia] = useState(null),
    [busy, setBusy] = useState(false),
    [ownVoice, setOwnVoice] = useState(false);
  const translated = !mine && message.translation?.status === 'ready';
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
            setMedia({ url, kind: result.kind });
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
    const readingTranslation = translated && !original;
    const utterance = new SpeechSynthesisUtterance(
      readingTranslation ? message.translation.text : message.text,
    );
    utterance.lang =
      (readingTranslation ? user.language : message.source_language) === 'ml'
        ? 'ml-IN'
        : (readingTranslation ? user.language : message.source_language) === 'sw'
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
    <article className={`message ${mine ? 'mine' : ''}`}>
      <div className="bubble">
        {message.sticker && (
          <div className="sticker" aria-label={message.sticker}>
            {stickers[message.sticker]}
          </div>
        )}
        {message.attachment && <Attachment attachment={message.attachment} onError={onError} />}
        <p dir="auto">{translated && !original ? message.translation.text : message.text}</p>
        {mine && message.text && message.receiver_translation && (
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
        {translated && (
          <button
            type="button"
            className="translation-label"
            onClick={() => setOriginal(!original)}
          >
            {original ? 'Show translation' : `${languages[user.language]} · Show original`}
          </button>
        )}
        {!mine && message.translation?.status === 'pending' && (
          <small className="translation-label">Translating… · Original shown</small>
        )}
        {!mine && message.translation?.status === 'failed' && (
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
      </div>
      {message.text && (
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
          <video className="generated-video" controls src={media.url} />
        ) : (
          <audio controls src={media.url} />
        ))}
    </article>
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
  if (!call) return null;
  const incoming = call.state === 'ringing' && call.callee_id === user.id;

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
