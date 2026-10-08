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
            <span className="tiny-dot" /> A LITTLE SPACE TO FEEL CLOSE
          </span>
          <h1>
            Some things
            <br />
            feel better
            <br />
            <em>when shared.</em>
          </h1>
          <p>
            The little things that made you smile. The day that didn’t go so well. The thought you
            wanted to tell them first. There’s room for all of it here.
          </p>
          <div className="language-art" aria-hidden="true">
            <div className="art-orbit" />
            <div className="art-bubble malayalam">
              You still up? <span>A little hello</span>
            </div>
            <div className="art-bridge">
              <Globe2 size={28} />
              <span>Here</span>
            </div>
            <div className="art-bubble swahili">
              I’m here. <span>Sometimes, that’s enough</span>
            </div>
            <div className="art-spark">✳</div>
          </div>
          <div className="story-features">
            <span>
              <MessageCircle size={17} /> Share what’s on your mind
            </span>
            <span>
              <Video size={17} /> Hear a familiar voice
            </span>
            <span>
              <Globe2 size={17} /> Say it your way
            </span>
          </div>
        </div>
        <div className="story-footer">
          For the things you want to tell each other.<span>kipenzi</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="welcome-icon">
            <MessageCircle size={25} />
          </div>
          <span className="eyebrow dark">PICK UP WHERE YOU LEFT OFF</span>
          <h2>{register ? 'Make yourself at home.' : 'Welcome back.'}</h2>
          <p>
            {register
              ? 'A few details, then your first hello.'
              : 'A story to tell? A little “I missed you”? Come on in.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <>
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="What should we call you?"
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  Unique handle
                  <input
                    name="handle"
                    autoComplete="username"
                    placeholder="e.g. dhanya"
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
                placeholder={register ? 'At least 12 characters' : 'Your password'}
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
                    Enable AI translation and voice reading
                    <small>
                      Text is processed by Google Gemini and ElevenLabs. You can change this
                      anytime.
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
                'Create account'
              ) : (
                'Sign in'
              )}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
          {capabilities.registration && (
            <p className="auth-switch">
              {register ? 'Already have an account?' : 'New around here?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setRegister(!register);
                  setError('');
                }}
              >
                {register ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          )}
          <div className="auth-note">
            <ShieldCheck size={18} />
            <span>
              Your words deserve a little care.
              <small>Translation and voice tools are always your choice.</small>
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
    [recordSeconds, setRecordSeconds] = useState(0);
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
    messagesRef = useRef([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
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
    <div className={`app-shell ${selected ? 'chat-open' : ''}`}>
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
            <span className="eyebrow dark">THE PEOPLE YOU COME BACK TO</span>
            <h1>
              {tab === 'chats' ? 'Chats' : 'Calls'}
              <span>{conversations.length.toString().padStart(2, '0')}</span>
            </h1>
          </div>
          <ButtonIcon
            label="Say hello"
            className="new-chat-btn"
            onClick={() => setShowContact(true)}
          >
            <Plus size={21} />
          </ButtonIcon>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            placeholder="Find your person or a chat"
            aria-label="Find a person or chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span>⌕</span>
        </label>
        <div className="list-label">
          YOUR CHATS
          <span className={connected ? 'connection-indicator online' : 'connection-indicator'}>
            {connected ? 'Connected' : 'Reconnecting'}
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
                        : 'Your first hello starts here.')}
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
                  ? 'No chats here by that name.'
                  : 'Someone on your mind? Start with a hello.'}
              </p>
              {!search && (
                <button className="text-btn" onClick={() => setShowContact(true)}>
                  Say hello <ArrowRight size={14} />
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
            <strong>Let the feeling come through.</strong>
            <p>I’m reading in {languages[user.language]}</p>
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
                <p>A little space for the two of you.</p>
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
                  ? `${chosen.peer.name}’s words, in ${languages[user.language]}. Translation works when you both turn it on.`
                  : capabilities.translation
                    ? 'Say it your way. You can both turn on translation in settings.'
                    : 'Say it your way. Translation will be here once setup is complete.'}
              </span>
              <button type="button" onClick={() => setShowSettings(true)}>
                Settings
              </button>
            </div>
            {tab === 'calls' ? (
              <div className="history">
                <h2>Call history</h2>
                <p>The times you stopped to hear each other.</p>
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
                  <p className="muted">No calls yet. Start one using the buttons above.</p>
                )}
                <button className="secondary" onClick={() => setTab('chats')}>
                  Return to messages
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
                          Earlier in your story
                        </button>
                      )}
                      <div className="conversation-start">
                        <span>
                          <ShieldCheck size={14} /> A little space for the two of you
                        </span>
                        <p>
                          A quick hello to {chosen.peer.name}. Or the thing that’s been on your
                          mind.
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
                          <span>{chosen.peer.name} is typing</span>
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
                        placeholder="Something on your mind?"
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
                    <span>Enter to send · Shift + Enter for a new line</span>
                  </div>
                </footer>
              </>
            )}
          </>
        ) : (
          <div className="chat-welcome">
            <span className="eyebrow dark">FOR THE THINGS YOU WANT TO SHARE</span>
            <div className="welcome-art">
              <span className="welcome-ring" />
              <MessageCircle size={72} strokeWidth={1.15} />
              <span className="welcome-tag first">How was your day?</span>
              <span className="welcome-tag second">I missed this.</span>
              <span className="welcome-tag third">Tell me everything.</span>
            </div>
            <h2>
              A little closer,
              <br />
              <em>one message at a time.</em>
            </h2>
            <p>
              Some days need a laugh. Some days need someone who’ll listen.
              <br />
              Open your chat. Bring your day with you.
            </p>
            <button className="primary compact" onClick={() => setShowContact(true)}>
              <Plus size={18} /> Say hello
            </button>
            <div className="welcome-details">
              <span>
                <Video size={16} /> A familiar voice
              </span>
              <span>
                <Globe2 size={16} /> Words that feel like you
              </span>
              <span>
                <Paperclip size={16} /> Little moments, shared
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
        <Modal title="Someone on your mind?" onClose={() => setShowContact(false)}>
          <p className="modal-description">
            A first hello, or a chat you’ve been meaning to have. Enter their handle below. Yours is{' '}
            <strong>@{user.handle}</strong>, if you’d like to share it with them.
          </p>
          <form className="contact-form" onSubmit={addContact}>
            <label>
              Friend’s handle
              <input
                name="handle"
                placeholder="@your_friend"
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
              {contactBusy ? <LoaderCircle className="spin" size={18} /> : 'Open our chat'}
              <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
      <CallOverlay controller={call} user={user} peer={callPeer} />
    </div>
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
