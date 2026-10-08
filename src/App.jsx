import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Globe2,
  LogOut,
  MessageCircle,
  Mic,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  Smile,
  Video,
  X,
  LoaderCircle,
  StopCircle,
  FileText,
} from 'lucide-react';
import { api, setCsrf } from './api.js';
import { Avatar, ButtonIcon, CallOverlay, Message, Modal, Settings } from './components.jsx';
import { useCall } from './useCall.js';
import { languages, stickers } from '../shared/constants.js';
import { ReactionOverlay, detectReaction } from './ReactionOverlay.jsx';
const mergeMessages = (old, next) =>
  Array.from(new Map([...old, ...next].map((m) => [m.id, m])).values()).sort(
    (a, b) => Number(a.seq) - Number(b.seq),
  );
function Auth({ capabilities, onSession, onError }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body: register ? { ...values, ai_consent: values.ai_consent === 'on' } : values,
      });
      onSession(result);
    } catch (e) {
      setError(e.message);
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="wordmark">
          <span className="brand-mark">
            k<span>•</span>
          </span>{' '}
          kipenzi<span className="wordmark-dot">/</span>connect
        </div>
        <div className="story-content">
          <span className="eyebrow">
            <span className="tiny-dot" /> OUR PRIVATE SANCTUARY · JUST THE TWO OF US
          </span>
          <h1>
            Through thick & thin,
            <br />
            you’re my person.
            <br />
            <em>Always.</em>
          </h1>
          <p>
            Every late-night rant, every dumb inside joke, every tear and unfiltered truth that belongs only between us. There’s room for our entire world right here.
          </p>
          <div className="language-art" aria-hidden="true">
            <div className="art-orbit" />
            <div className="art-bubble malayalam">
              Enthokkeyundu vishesham? 🤍 <span>Always here for you</span>
            </div>
            <div className="art-bridge">
              <Globe2 size={28} />
              <span>Us 🫂</span>
            </div>
            <div className="art-bubble swahili">
              Niko hapa daima. 💫 <span>Never walk alone</span>
            </div>
            <div className="art-spark">✳</div>
          </div>
          <div className="story-features">
            <span>
              <MessageCircle size={17} /> Unfiltered midnight talks & secrets
            </span>
            <span>
              <Video size={17} /> Hearing your voice fixes everything
            </span>
            <span>
              <Globe2 size={17} /> Our bond across every language
            </span>
          </div>
        </div>
        <div className="story-footer">
          A secret sanctuary built for two die-hard souls.<span>kipenzi</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="welcome-icon">
            <MessageCircle size={25} />
          </div>
          <span className="eyebrow dark">SAFE & SACRED BETWEEN US</span>
          <h2>{register ? 'Let’s set up our private corner.' : 'Welcome back, my favorite human.'}</h2>
          <p>
            {register
              ? 'A few quick details, then straight to your ride-or-die.'
              : 'Got gossip? Missed me? A breakdown to share? Spill it all right here.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <>
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="What does your bestie call you?"
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  Unique handle
                  <input
                    name="handle"
                    autoComplete="username"
                    placeholder="e.g. bestie_nickname"
                    pattern="[a-z0-9_]{3,30}"
                    title="3–30 lowercase letters, digits or underscores"
                    required
                  />
                </label>
              </>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder={register ? 'At least 12 characters (keep our secrets safe)' : 'Your secret password'}
                minLength={register ? 12 : undefined}
                maxLength={128}
                required
              />
            </label>
            {register && (
              <>
                <label>
                  I’d like to read messages in
                  <select name="language" defaultValue="en">
                    {Object.entries(languages).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check-label">
                  <input type="checkbox" name="ai_consent" />
                  <span>
                    Enable AI translation and soulmate voice reading
                    <small>
                      Speak freely in Malayalam, Swahili, or English. Gemini & Edge-TTS will translate and speak in natural voices.
                    </small>
                  </span>
                </label>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? (
                <LoaderCircle size={19} className="spin" />
              ) : register ? (
                'Open our sanctuary'
              ) : (
                'Step inside'
              )}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
          {capabilities.registration && (
            <p className="auth-switch">
              {register ? 'Already have our sanctuary?' : 'Setting this up for the first time?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setRegister(!register);
                  setError('');
                }}
              >
                {register ? 'Step inside' : 'Create our sanctuary'}
              </button>
            </p>
          )}
          <div className="auth-note">
            <ShieldCheck size={18} />
            <span>
              Strictly confidential between the two of us.
              <small>Zero eavesdropping. Just pure love, real trust, and unfiltered honesty.</small>
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
function Chat({ session, capabilities, onSession, onError }) {
  const { user, csrf } = session;
  const [socket, setSocket] = useState(null),
    [connected, setConnected] = useState(false),
    [conversations, setConversations] = useState([]),
    [selected, setSelected] = useState(null),
    [messages, setMessages] = useState([]),
    [hasMore, setHasMore] = useState(false),
    [loading, setLoading] = useState(false),
    [sending, setSending] = useState(false),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState(''),
    [source, setSource] = useState('auto'),
    [file, setFile] = useState(null),
    [picker, setPicker] = useState(false),
    [showSettings, setShowSettings] = useState(false),
    [showContact, setShowContact] = useState(false),
    [contactBusy, setContactBusy] = useState(false),
    [contactError, setContactError] = useState(''),
    [typing, setTyping] = useState(false),
    [tab, setTab] = useState('chats'),
    [calls, setCalls] = useState([]),
    [recording, setRecording] = useState(false),
    [recordSeconds, setRecordSeconds] = useState(0),
    [reaction, setReaction] = useState(null),
    [vibrateScreen, setVibrateScreen] = useState(false),
    [heartbeatScreen, setHeartbeatScreen] = useState(false);
  const selectedRef = useRef(null),
    bottom = useRef(null),
    scrollBox = useRef(null),
    stickToBottom = useRef(true),
    lastRead = useRef(0),
    fileInput = useRef(null),
    typingTimer = useRef(null),
    recorder = useRef(null),
    recorderStream = useRef(null),
    recordTimer = useRef(null),
    attempt = useRef(null),
    generation = useRef(0),
    messagesRef = useRef([]),
    lastProcessedMsgRef = useRef(null),
    lastTriggeredMsgIdRef = useRef(null);
  const triggerReaction = useCallback((type) => {
    if (!type) return;
    setReaction({ type, id: Date.now() });
    if (type === 'kiss' || type === 'hug') {
      setVibrateScreen(true);
      setTimeout(() => setVibrateScreen(false), 1400);
    } else if (type === 'love' || type === 'miss') {
      setHeartbeatScreen(true);
      setTimeout(() => setHeartbeatScreen(false), 2400);
    }
  }, []);
  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length) {
      const latest = messages.at(-1);
      if (latest && latest.sender_id !== user.id && latest.id !== lastTriggeredMsgIdRef.current) {
        const isNewArrival = lastProcessedMsgRef.current && lastProcessedMsgRef.current !== latest.id;
        const msgAgeMs = Date.now() - new Date(latest.created_at).getTime();
        const isRecent = !Number.isNaN(msgAgeMs) && msgAgeMs < 45000;
        if (isNewArrival || isRecent) {
          lastTriggeredMsgIdRef.current = latest.id;
          const detected = detectReaction(latest.text, latest.sticker, latest.translation?.text);
          if (detected) triggerReaction(detected);
        }
      }
      if (latest) lastProcessedMsgRef.current = latest.id;
    }
  }, [messages, user.id, triggerReaction]);
  const call = useCall(socket, user, onError);
  const loadConversations = useCallback(async () => {
    setConversations(await api('/conversations'));
  }, []);
  const loadMessages = useCallback(async (cid, before, initial = false) => {
    const previous = selectedRef.current === cid ? messagesRef.current : [];
    const result = await api(`/conversations/${cid}/messages${before ? `?before=${before}` : ''}`);
    if (selectedRef.current !== cid) return;
    if (
      !before &&
      !initial &&
      previous.length &&
      result.messages.length &&
      Number(result.messages.at(-1).seq) > Number(previous.at(-1).seq)
    ) {
      let after = previous.at(-1).seq;
      let more = true;
      while (more && selectedRef.current === cid) {
        const page = await api(`/conversations/${cid}/messages?after=${after}`);
        if (selectedRef.current !== cid) return;
        result.messages.push(...page.messages);
        more = page.has_more && page.messages.length > 0;
        if (page.messages.length) after = page.messages.at(-1).seq;
      }
    }
    setMessages((old) => mergeMessages(old, result.messages));
    if (before || initial) setHasMore(result.has_more);
  }, []);
  useEffect(() => {
    const connection = io({ transports: ['websocket'], auth: { csrf }, autoConnect: false });
    setSocket(connection);
    const refresh = async () => {
      setConnected(true);
      try {
        await loadConversations();
        if (selectedRef.current) await loadMessages(selectedRef.current);
      } catch (e) {
        onError(e.message);
      }
    };
    const changed = async ({ conversation_id }) => {
      try {
        await loadConversations();
        if (selectedRef.current === conversation_id) await loadMessages(conversation_id);
      } catch (e) {
        onError(e.message);
      }
    };
    const handleTyping = ({ conversation_id }) => {
      if (selectedRef.current === conversation_id) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 2500);
      }
    };
    connection.on('connect', refresh);
    connection.on('disconnect', () => setConnected(false));
    connection.on('connect_error', (e) => {
      setConnected(false);
      if (e.message === 'Unauthorized') onError('Session expired. Sign in again.');
    });
    connection.on('message:changed', changed);
    connection.on('conversation:changed', changed);
    connection.on('receipt:changed', changed);
    connection.on('typing', handleTyping);
    connection.connect();
    void loadConversations().catch((e) => onError(e.message));
    return () => {
      connection.disconnect();
      clearTimeout(typingTimer.current);
    };
  }, [csrf, loadConversations, loadMessages, onError]);
  useEffect(() => {
    if (selectedRef.current) {
      setMessages([]);
      void loadMessages(selectedRef.current, undefined, true).catch((e) => onError(e.message));
    }
  }, [user.language, loadMessages, onError]);
  useEffect(() => {
    if (stickToBottom.current)
      bottom.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
  }, [messages.length, selected, typing]);
  const markRead = useCallback(async () => {
    if (
      !selected ||
      !messages.length ||
      document.visibilityState !== 'visible' ||
      !document.hasFocus()
    )
      return;
    const seq = Number(messages.at(-1).seq);
    if (seq <= lastRead.current) return;
    lastRead.current = seq;
    try {
      await api(`/conversations/${selected}/read`, { method: 'POST', body: { seq } });
      await loadConversations();
    } catch (e) {
      lastRead.current = 0;
      onError(e.message);
    }
  }, [selected, messages, loadConversations, onError]);
  useEffect(() => {
    void markRead();
    const seen = () => void markRead();
    window.addEventListener('focus', seen);
    document.addEventListener('visibilitychange', seen);
    return () => {
      window.removeEventListener('focus', seen);
      document.removeEventListener('visibilitychange', seen);
    };
  }, [markRead]);
  useEffect(
    () => () => {
      clearInterval(recordTimer.current);
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state !== 'inactive') recorder.current.stop();
      }
      recorderStream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const selectConversation = async (cid) => {
    if (recording || sending) {
      onError('Finish your recording or upload before switching conversations.');
      return;
    }
    selectedRef.current = cid;
    messagesRef.current = [];
    lastProcessedMsgRef.current = null;
    setSelected(cid);
    setMessages([]);
    setFile(null);
    setDraft('');
    setPicker(false);
    setTyping(false);
    lastRead.current = 0;
    attempt.current = null;
    stickToBottom.current = true;
    setLoading(true);
    const version = ++generation.current;
    try {
      await loadMessages(cid, undefined, true);
      const history = await api(`/conversations/${cid}/calls`);
      if (version === generation.current) setCalls(history);
    } catch (e) {
      onError(e.message);
    } finally {
      if (version === generation.current) setLoading(false);
    }
  };
  const addContact = async (event) => {
    event.preventDefault();
    setContactBusy(true);
    setContactError('');
    try {
      const handle = new FormData(event.currentTarget)
        .get('handle')
        .trim()
        .toLowerCase()
        .replace(/^@/, '');
      const result = await api('/conversations', { method: 'POST', body: { handle } });
      await loadConversations();
      setShowContact(false);
      await selectConversation(result.id);
    } catch (e) {
      setContactError(e.message);
    } finally {
      setContactBusy(false);
    }
  };
  const sendMessage = async (sticker) => {
    const cid = selectedRef.current;
    if (!cid || sending || (!draft.trim() && !file && !sticker)) return;
    const detected = detectReaction(draft, sticker);
    if (detected) triggerReaction(detected);
    setSending(true);
    try {
      let attachment = file?.attachment;
      if (file && !attachment) {
        const form = new FormData();
        form.append('file', file.file);
        attachment = await api(`/conversations/${cid}/uploads`, { method: 'POST', body: form });
        setFile({ ...file, attachment });
      }
      const input = {
        text: draft,
        source_language: source,
        ...(sticker ? { sticker } : {}),
        ...(attachment ? { attachment_id: attachment.id } : {}),
      };
      const fingerprint = JSON.stringify(input);
      if (attempt.current?.fingerprint !== fingerprint)
        attempt.current = { fingerprint, client_id: crypto.randomUUID() };
      await api(`/conversations/${cid}/messages`, {
        method: 'POST',
        body: { ...input, client_id: attempt.current.client_id },
      });
      if (selectedRef.current === cid) {
        setDraft('');
        setFile(null);
        setPicker(false);
        attempt.current = null;
        stickToBottom.current = true;
        await loadMessages(cid);
      }
      await loadConversations();
    } catch (e) {
      onError(e.message);
    } finally {
      setSending(false);
    }
  };
  const record = async () => {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error('Voice notes require HTTPS and a supported browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderStream.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((v) =>
        MediaRecorder.isTypeSupported(v),
      );
      const capture = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.current = capture;
      const chunks = [];
      capture.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      capture.onstop = () => {
        clearInterval(recordTimer.current);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const type = capture.mimeType,
          extension = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
        const voice = new File(chunks, `voice-note-${Date.now()}.${extension}`, { type });
        if (voice.size) setFile({ file: voice });
      };
      capture.start();
      setRecording(true);
      setRecordSeconds(0);
      const started = Date.now();
      recordTimer.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - started) / 1000);
        setRecordSeconds(seconds);
        if (seconds >= 120 && capture.state !== 'inactive') capture.stop();
      }, 1000);
    } catch (e) {
      recorderStream.current?.getTracks().forEach((t) => t.stop());
      onError(e.message);
    }
  };
  const logout = async () => {
    try {
      if (call.call) await call.end();
      await api('/auth/logout', { method: 'POST' });
      onSession({ user: null, csrf: null });
    } catch (e) {
      onError(e.message);
    }
  };
  const chosen = conversations.find((c) => c.id === selected),
    filtered = conversations.filter((c) =>
      `${c.peer.name} ${c.peer.handle}`.toLowerCase().includes(search.toLowerCase()),
    ),
    callPeer = conversations.find((c) => c.id === call.call?.conversation_id)?.peer;
  return (
    <>
      <ReactionOverlay reaction={reaction} onDone={() => setReaction(null)} />
      <div
        className={`app-shell ${selected ? 'chat-open' : ''} ${vibrateScreen ? 'screen-vibrate' : ''} ${heartbeatScreen ? 'screen-heartbeat' : ''}`}
      >
        <aside className="nav-rail">
        <div className="brand-mark">
          k<span>•</span>
        </div>
        <div className="rail-items">
          <ButtonIcon
            label="Chats"
            className={`rail-btn ${tab === 'chats' ? 'active' : ''}`}
            onClick={() => setTab('chats')}
          >
            <MessageCircle size={23} />
          </ButtonIcon>
          <ButtonIcon
            label="Call history"
            className={`rail-btn ${tab === 'calls' ? 'active' : ''}`}
            onClick={() => {
              setTab('calls');
              if (selected)
                void api(`/conversations/${selected}/calls`)
                  .then(setCalls)
                  .catch((e) => onError(e.message));
            }}
          >
            <Phone size={22} />
          </ButtonIcon>
        </div>
        <div className="rail-bottom">
          <ButtonIcon label="Settings" className="rail-btn" onClick={() => setShowSettings(true)}>
            <SettingsIcon size={22} />
          </ButtonIcon>
          <ButtonIcon label="Sign out" className="rail-btn" onClick={() => void logout()}>
            <LogOut size={21} />
          </ButtonIcon>
          <Avatar person={user} />
        </div>
      </aside>
      <aside className="conversation-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow dark">MY FAVORITE HUMAN</span>
            <h1>
              {tab === 'chats' ? 'Our Sanctuary' : 'Our Moments'}
              <span>{conversations.length.toString().padStart(2, '0')}</span>
            </h1>
          </div>
          <ButtonIcon
            label="Connect with my ride-or-die"
            className="new-chat-btn"
            onClick={() => setShowContact(true)}
          >
            <Plus size={21} />
          </ButtonIcon>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            placeholder="Search our memories or your person..."
            aria-label="Search our memories or your person"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span>⌕</span>
        </label>
        <div className="list-label">
          OUR SAFE HAVEN
          <span className={connected ? 'connection-indicator online' : 'connection-indicator'}>
            {connected ? 'Close & connected' : 'Reconnecting...'}
          </span>
        </div>
        <div className="conversation-list">
          {filtered.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`conversation ${c.id === selected ? 'selected' : ''}`}
              onClick={() => void selectConversation(c.id)}
            >
              <Avatar person={c.peer} />
              <div className="conversation-text">
                <div>
                  <strong>{c.peer.name}</strong>
                  <time>
                    {c.last_message
                      ? new Date(c.last_message.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'New'}
                  </time>
                </div>
                <p>
                  {c.last_message?.text ||
                    (c.last_message?.sticker
                      ? `${stickers[c.last_message.sticker]} Sticker`
                      : c.last_message?.attachment
                        ? 'Attachment'
                        : 'Our first hello starts here. Say something! 🤍')}
                </p>
                <span className="contact-language">{languages[c.peer.language]}</span>
              </div>
              {c.unread > 0 && <span className="unread">{c.unread}</span>}
            </button>
          ))}
          {!filtered.length && (
            <div className="list-empty">
              <MessageCircle size={26} />
              <p>
                {search
                  ? 'No memories or chats here by that name.'
                  : 'Where’s your partner in crime? Start our private sanctuary with a hello.'}
              </p>
              {!search && (
                <button className="text-btn" onClick={() => setShowContact(true)}>
                  Say hello to my person <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="language-card">
          <div className="language-card-icon">
            <Globe2 size={20} />
          </div>
          <div>
            <strong>Unbreakable bond, zero barriers.</strong>
            <p>Reading in {languages[user.language]} · feels like home</p>
          </div>
          <ButtonIcon label="Change receive language" onClick={() => setShowSettings(true)}>
            <ChevronDown size={16} />
          </ButtonIcon>
        </div>
        <div className="account-summary">
          <Avatar person={user} />
          <div>
            <strong>{user.name}</strong>
            <p>@{user.handle}</p>
          </div>
          <span className="tiny-dot" />
        </div>
      </aside>
      <main className="chat-panel">
        {chosen ? (
          <>
            <header className="chat-header">
              <ButtonIcon
                label="Back to chats"
                className="icon-btn mobile-back"
                onClick={() => {
                  if (recording || sending) return;
                  selectedRef.current = null;
                  setSelected(null);
                  setMessages([]);
                }}
              >
                <ArrowLeft size={20} />
              </ButtonIcon>
              <Avatar person={chosen.peer} />
              <div className="chat-title">
                <h2>{chosen.peer.name}</h2>
                <p>My person · Ride or die forever 🤍</p>
              </div>
              <div className="header-actions">
                <ButtonIcon
                  label="Start voice call"
                  disabled={!connected || !!call.call}
                  onClick={() => void call.start(selected, 'audio')}
                >
                  <Phone size={20} />
                </ButtonIcon>
                <ButtonIcon
                  label="Start video call"
                  disabled={!connected || !!call.call}
                  onClick={() => void call.start(selected, 'video')}
                >
                  <Video size={21} />
                </ButtonIcon>
                <span className="header-divider" />
                <ButtonIcon label="Chat settings" onClick={() => setShowSettings(true)}>
                  <SettingsIcon size={20} />
                </ButtonIcon>
              </div>
            </header>
            <div className="translation-banner">
              <Globe2 size={15} />
              <span>
                {user.ai_consent && capabilities.translation
                  ? `${chosen.peer.name}’s words, flowing right to you in ${languages[user.language]}. Speaking straight from the heart.`
                  : capabilities.translation
                    ? 'Speak freely. You can both turn on translation in chat settings.'
                    : 'Translation will be ready once setup is complete.'}
              </span>
              <button type="button" onClick={() => setShowSettings(true)}>
                Settings
              </button>
            </div>
            {tab === 'calls' ? (
              <div className="history">
                <h2>Our Moments Together</h2>
                <p>Every late-night call, every laugh shared across the miles.</p>
                {calls.map((c) => (
                  <div key={c.id} className="history-row">
                    {c.kind === 'video' ? <Video size={20} /> : <Phone size={20} />}
                    <span>
                      <strong>
                        {c.caller_id === user.id ? 'Outgoing' : 'Incoming'}{' '}
                        {c.kind === 'video' ? 'video' : 'voice'} call
                      </strong>
                      <small>
                        {new Date(c.created_at).toLocaleString()} · {c.state}
                      </small>
                    </span>
                  </div>
                ))}
                {!calls.length && (
                  <p className="muted">No calls yet. Pick up the phone and hear their voice!</p>
                )}
                <button className="secondary" onClick={() => setTab('chats')}>
                  Return to our chat
                </button>
              </div>
            ) : (
              <>
                <div
                  className="message-list"
                  ref={scrollBox}
                  onScroll={(e) => {
                    const box = e.currentTarget;
                    stickToBottom.current =
                      box.scrollHeight - box.scrollTop - box.clientHeight < 120;
                  }}
                >
                  {loading ? (
                    <div className="center-loader">
                      <LoaderCircle size={23} className="spin" />
                    </div>
                  ) : (
                    <>
                      {hasMore && (
                        <button
                          className="load-older"
                          onClick={async () => {
                            const box = scrollBox.current,
                              height = box.scrollHeight;
                            stickToBottom.current = false;
                            try {
                              await loadMessages(selected, messages[0].seq);
                              requestAnimationFrame(() => {
                                box.scrollTop += box.scrollHeight - height;
                              });
                            } catch (e) {
                              onError(e.message);
                            }
                          }}
                        >
                          Scroll back through our memories ✨
                        </button>
                      )}
                      <div className="conversation-start">
                        <span>
                          <ShieldCheck size={14} /> Our Private Sanctuary · Just the two of us
                        </span>
                        <p>
                          No filters, no secrets, no judgments. Just you and me against the whole
                          world. Tell me everything.
                        </p>
                      </div>
                      {messages.map((m, i) => (
                        <div key={m.id}>
                          {(i === 0 ||
                            new Date(m.created_at).toDateString() !==
                              new Date(messages[i - 1].created_at).toDateString()) && (
                            <div className="date-separator">
                              <span>
                                {new Date(m.created_at).toLocaleDateString([], {
                                  weekday: 'short',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}
                          <Message
                            message={m}
                            mine={m.sender_id === user.id}
                            peerRead={chosen.peer_read_seq}
                            user={user}
                            capabilities={capabilities}
                            onError={onError}
                          />
                        </div>
                      ))}
                      {typing && (
                        <div className="typing-indicator">
                          <i />
                          <i />
                          <i />
                          <span>{chosen.peer.name} is typing something sweet...</span>
                        </div>
                      )}
                      <div ref={bottom} />
                    </>
                  )}
                </div>
                <footer className="composer-area">
                  {file && (
                    <div className="queued-file">
                      <FileText size={17} />
                      <span>
                        {file.file.name}
                        <small>{(file.file.size / 1024 / 1024).toFixed(1)} MB</small>
                      </span>
                      <ButtonIcon
                        label="Remove attachment"
                        disabled={sending}
                        onClick={() => setFile(null)}
                      >
                        <X size={17} />
                      </ButtonIcon>
                    </div>
                  )}
                  {picker && (
                    <div className="sticker-picker">
                      {Object.entries(stickers).map(([key, emoji]) => (
                        <button
                          type="button"
                          key={key}
                          title={key}
                          aria-label={`Send ${key} sticker`}
                          disabled={sending}
                          onClick={() => void sendMessage(key)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <form
                    className="composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendMessage();
                    }}
                  >
                    <ButtonIcon
                      label="Choose sticker"
                      disabled={sending || recording}
                      onClick={() => setPicker(!picker)}
                    >
                      <Smile size={21} />
                    </ButtonIcon>
                    <ButtonIcon
                      label="Attach file"
                      disabled={sending || recording}
                      onClick={() => fileInput.current.click()}
                    >
                      <Paperclip size={21} />
                    </ButtonIcon>
                    <input
                      ref={fileInput}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const picked = e.target.files[0];
                        if (picked) {
                          if (picked.size > 25 * 1024 * 1024)
                            onError('Files must be smaller than 25 MB.');
                          else setFile({ file: picked });
                        }
                        e.target.value = '';
                      }}
                    />
                    {recording ? (
                      <div className="recording">
                        <span className="record-dot" /> Recording · {recordSeconds}s
                      </div>
                    ) : (
                      <textarea
                        aria-label="Message"
                        placeholder="Spill the tea... or just say you miss me 💬"
                        rows={1}
                        value={draft}
                        disabled={sending}
                        maxLength={5000}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          socket?.emit('typing', { conversation_id: selected });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            void sendMessage();
                          }
                        }}
                      />
                    )}
                    <ButtonIcon
                      label={recording ? 'Stop recording' : 'Record voice note'}
                      disabled={sending || !!file}
                      onClick={() => void record()}
                    >
                      {recording ? <StopCircle size={22} /> : <Mic size={21} />}
                    </ButtonIcon>
                    <button
                      type="submit"
                      className="send-btn"
                      aria-label="Send message"
                      disabled={sending || recording || (!draft.trim() && !file)}
                    >
                      {sending ? <LoaderCircle className="spin" size={20} /> : <Send size={20} />}
                    </button>
                  </form>
                  <div className="composer-hint">
                    <label>
                      <Globe2 size={12} /> Writing in
                      <select
                        aria-label="Source language"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                      >
                        <option value="auto">Auto-detect</option>
                        {Object.entries(languages).map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span>Press Enter to send some love · Shift + Enter for a new line</span>
                  </div>
                </footer>
              </>
            )}
          </>
        ) : (
          <div className="chat-welcome">
            <span className="eyebrow dark">OUR SACRED CORNER</span>
            <div className="welcome-art">
              <span className="welcome-ring" />
              <MessageCircle size={72} strokeWidth={1.15} />
              <span className="welcome-tag first">I missed your face! 🥺</span>
              <span className="welcome-tag second">Spill the tea right now! ☕</span>
              <span className="welcome-tag third">Through thick & thin, always. 🤍</span>
            </div>
            <h2>
              Two souls,
              <br />
              one unbreakable bond.
              <br />
              <em>Never apart.</em>
            </h2>
            <p>
              Whether it’s a random midnight meme, a breakdown that needs comfort, or a silly victory to celebrate — this space is ours.
            </p>
            <button className="primary compact" onClick={() => setShowContact(true)}>
              <Plus size={18} /> Reach out to my person
            </button>
            <div className="welcome-details">
              <span>
                <Video size={16} /> Hear the voice that makes everything okay
              </span>
              <span>
                <Globe2 size={16} /> Raw feelings, zero filter
              </span>
              <span>
                <Paperclip size={16} /> Little moments that belong only to us
              </span>
            </div>
            {(!capabilities.translation || !capabilities.avatar) && (
              <p className="setup-note">
                Translation, natural voices, and talking photos will be available once setup is
                complete.
              </p>
            )}
          </div>
        )}
      </main>
      {showSettings && (
        <Settings
          user={user}
          capabilities={capabilities}
          onClose={() => setShowSettings(false)}
          onUser={(updated) => onSession({ ...session, user: updated })}
          onError={onError}
        />
      )}{' '}
      {showContact && (
        <Modal title="Connect with your ride-or-die" onClose={() => setShowContact(false)}>
          <p className="modal-description">
            Ready to bring your favorite human in? Enter their handle below so you can share your world together. Yours is{' '}
            <strong>@{user.handle}</strong>, if you’d like to share it with them.
          </p>
          <form className="contact-form" onSubmit={addContact}>
            <label>
              Bestie’s handle
              <input
                name="handle"
                placeholder="@my_ride_or_die"
                required
                autoFocus
                minLength={3}
                maxLength={31}
              />
            </label>
            {contactError && (
              <p className="form-error" role="alert">
                {contactError}
              </p>
            )}
            <button className="primary" disabled={contactBusy}>
              {contactBusy ? <LoaderCircle className="spin" size={18} /> : 'Open our sanctuary'}
              <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
      <CallOverlay controller={call} user={user} peer={callPeer} />
      </div>
    </>
  );
}
export default function App() {
  const [session, setSession] = useState(null),
    [capabilities, setCapabilities] = useState({}),
    [toast, setToast] = useState(null),
    [failed, setFailed] = useState(false);
  const toastTimer = useRef(null);
  const onError = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 7000);
  }, []);
  const onSession = useCallback((result) => {
    setCsrf(result.csrf);
    setSession(result);
  }, []);
  const initialize = useCallback(async () => {
    setFailed(false);
    try {
      const [result, features] = await Promise.all([api('/auth/session'), api('/capabilities')]);
      onSession(result);
      setCapabilities(features);
    } catch (e) {
      setFailed(true);
      onError(e.message);
    }
  }, [onSession, onError]);
  useEffect(() => {
    void initialize();
    return () => clearTimeout(toastTimer.current);
  }, [initialize]);
  return (
    <>
      {!session ? (
        <div className="boot">
          <span className="brand-mark">
            k<span>•</span>
          </span>
          {failed ? (
            <>
              <p>We couldn’t reach Kipenzi.</p>
              <button className="primary compact" onClick={() => void initialize()}>
                Try again
              </button>
            </>
          ) : (
            <LoaderCircle className="spin" size={25} />
          )}
        </div>
      ) : session.user ? (
        <Chat
          session={session}
          capabilities={capabilities}
          onSession={onSession}
          onError={onError}
        />
      ) : (
        <Auth capabilities={capabilities} onSession={onSession} onError={onError} />
      )}{' '}
      {toast && (
        <div className="toast" role="alert">
          <span>{toast}</span>
          <ButtonIcon label="Dismiss notification" onClick={() => setToast(null)}>
            <X size={17} />
          </ButtonIcon>
        </div>
      )}
    </>
  );
}
