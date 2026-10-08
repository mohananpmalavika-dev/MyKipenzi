import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { MessageThread } from './MessageThread.jsx';
import { useDraftManager } from './useDraftManager.js';
import {
  ArrowLeft,
  Download,
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
  Clock,
  Star,
  Pin,
  Smile,
  Video,
  X,
  LoaderCircle,
  StopCircle,
  FileText,
  Sparkles,
  Trash2,
  Palette,
  Moon,
  Sun,
  Type,
  Heart,
  HeartHandshake,
  Hand,
  Headphones,
  Film,
  Camera,
  Gift,
} from 'lucide-react';
import { DisappearingSettings } from './DisappearingSettings.jsx';
import { ScheduledMessages } from './ScheduledMessages.jsx';
import { useMessageOutbox } from './useMessageOutbox.js';
import { OutgoingMessage } from './MessageStatus.jsx';
import { messageExpiryOptions } from '../shared/messageStatus.js';
import { supportsViewOnce } from '../shared/viewOnce.js';
import { expiryOptions, hasExpired } from '../shared/disappearing.js';
import { firstUnreadMessage, isNearLatest, unreadMessageCount } from '../shared/unread.js';
import { api, setCsrf } from './api.js';
import { Avatar, ButtonIcon, CallOverlay, Message, Modal, Settings, StickerCreatorModal } from './components.jsx';
import { LiveDoodleModal } from './LiveDoodle.jsx';
import { LiveHeartbeatModal } from './LiveHeartbeat.jsx';
import { VirtualTouchModal } from './VirtualTouchModal.jsx';
import { DailyPromptModal } from './DailyPromptModal.jsx';
import { MoodWidget } from './MoodWidget.jsx';
import { RelationshipStoryModal } from './RelationshipStoryModal.jsx';
import { TimeCapsuleModal } from './TimeCapsuleModal.jsx';
import {
  ListenTogetherModal,
  ListenTogetherMiniPlayer,
  ListenTogetherCallDock,
} from './ListenTogether.jsx';
import {
  WatchPartyModal,
  WatchPartyMiniPlayer,
  WatchPartyCallDock,
} from './WatchParty.jsx';
import { CURATED_TRACKS, musicEngine } from './musicEngine.js';
import { CURATED_VIDEOS } from './videoEngine.js';
import { playHeartbeatSound, triggerHeartbeatHaptics } from './heartbeatAudio.js';
import { playTouchSound, triggerTouchHaptics } from './touchAudio.js';
import { useCall } from './useCall.js';
import { languages, stickers, stickerCategories } from '../shared/constants.js';
import { ReactionOverlay, detectReaction } from './ReactionOverlay.jsx';
import { InstallApp } from './InstallApp.jsx';
import { useMessageAlerts } from './useMessageAlerts.js';
import { VoiceFilterStudio } from './VoiceFilterStudio.jsx';
import { VOICE_FILTERS, getVoiceFilter } from './voiceFilters.js';
import { UserSafety } from './UserSafety.jsx';
import { ChatExport } from './ChatExport.jsx';
import { ChatLibrary } from './ChatLibrary.jsx';
import { GlobalSearch } from './GlobalSearch.jsx';
import { GroupSettingsModal, GroupMembersList } from './GroupManagement.jsx';
import { UserDirectory } from './UserDirectory.jsx';
import { ContactManagement } from './ContactManagement.jsx';
import { usePushNotifications } from './usePushNotifications.js';
import { AppLock } from './AppLock.jsx';
import { useThemeAndFontSize } from './useThemeAndFontSize.js';
import { MediaVaultModal } from './MediaVault.jsx';
import { addStickerToLibrary, loadStickerLibrary, persistStickerLibrary } from './stickerTools.js';

function formatLastSeen(lastSeen) {
  if (!lastSeen) return null;
  const now = new Date();
  const then = new Date(lastSeen);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

const mergeMessages = (old, next) =>
  Array.from(new Map([...old, ...next].filter(m => !hasExpired(m)).map((m) => [m.id, m])).values()).sort(
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
          <InstallApp />
        </div>
      </section>
    </main>
  );
}
function Chat({ session, capabilities, onSession, onError, themeControls }) {
  const { theme, setTheme, isDark, toggleTheme, fontSize, setFontSize, cycleFontSize, currentFontConfig } = themeControls;
  const { user, csrf } = session;
  const push = usePushNotifications(user.id, onError);
  const outbox = useMessageOutbox(user.id);
  const [online, setOnline] = useState(navigator.onLine);
  const [messageExpiry, setMessageExpiry] = useState(0);
  const { preview, dismiss, receive, receiveMood, update: updateAlert, soundEnabled, setSoundEnabled, playSound } = useMessageAlerts(user.id, user.language);
  const [socket, setSocket] = useState(null),
    [connected, setConnected] = useState(false),
    [conversations, setConversations] = useState([]),
    [selected, setSelected] = useState(null),
    [messages, setMessages] = useState([]),
    [hasMore, setHasMore] = useState(false),
    [atLatest, setAtLatest] = useState(true),
    [unreadBoundary, setUnreadBoundary] = useState(null),
    [loading, setLoading] = useState(false),
    [sending, setSending] = useState(false),
    [search, setSearch] = useState(''),
    [showDisappearing, setShowDisappearing] = useState(false),
    [showScheduled, setShowScheduled] = useState(false),
    [showSafety, setShowSafety] = useState(false),
    [libraryKind, setLibraryKind] = useState(null),
    [exportChat, setExportChat] = useState(null),
    [showGlobalSearch, setShowGlobalSearch] = useState(false),
    [highlightMessage, setHighlightMessage] = useState(null),
    [draft, setDraft] = useState(''),
    [replyTo, setReplyTo] = useState(null),
    [source, setSource] = useState('auto'),
    [file, setFile] = useState(null),
    [picker, setPicker] = useState(false),
    [showSettings, setShowSettings] = useState(false),
    [showContact, setShowContact] = useState(false),
    [showGroup, setShowGroup] = useState(false),
    [showGroupSettings, setShowGroupSettings] = useState(false),
    [contactBusy, setContactBusy] = useState(false),
    [contactError, setContactError] = useState(''),
    [typing, setTyping] = useState(false),
    [tab, setTab] = useState('chats'),
    [calls, setCalls] = useState([]),
    [recording, setRecording] = useState(false),
    [recordSeconds, setRecordSeconds] = useState(0),
    [reaction, setReaction] = useState(null),
    [vibrateScreen, setVibrateScreen] = useState(false),
    [heartbeatScreen, setHeartbeatScreen] = useState(false),
    [showStickerCreator, setShowStickerCreator] = useState(false),
    [showDoodle, setShowDoodle] = useState(false),
    [doodleInvite, setDoodleInvite] = useState(null),
    [showHeartbeat, setShowHeartbeat] = useState(false),
    [heartbeatInvite, setHeartbeatInvite] = useState(null),
    [showVirtualTouch, setShowVirtualTouch] = useState(false),
    [virtualTouchInvite, setVirtualTouchInvite] = useState(null),
    [showDailyPrompt, setShowDailyPrompt] = useState(false),
    [dailyPromptInvite, setDailyPromptInvite] = useState(null),
    [showMusicModal, setShowMusicModal] = useState(false),
    [isMusicMinimized, setIsMusicMinimized] = useState(false),
    [musicInvite, setMusicInvite] = useState(null),
    [isCallMusicActive, setIsCallMusicActive] = useState(false),
    [_musicPlayTick, setMusicPlayTick] = useState(0),
    [showWatchPartyModal, setShowWatchPartyModal] = useState(false),
    [isWatchPartyMinimized, setIsWatchPartyMinimized] = useState(false),
    [watchPartyInvite, setWatchPartyInvite] = useState(null),
    [watchPartyVideo, setWatchPartyVideo] = useState(null),
    [isWatchPartyPlaying, setIsWatchPartyPlaying] = useState(true),
    [showStory, setShowStory] = useState(false),
    [storyInvite, setStoryInvite] = useState(null),
    [showTimeCapsule, setShowTimeCapsule] = useState(false),
    [selectedCapsuleId, setSelectedCapsuleId] = useState(null),
    [timeCapsuleInvite, setTimeCapsuleInvite] = useState(null),
    [showMediaVault, setShowMediaVault] = useState(false),
    [stickerCategory, setStickerCategory] = useState('all'),
    [stickerSearch, setStickerSearch] = useState(''),
    [customStickers, setCustomStickers] = useState(() => loadStickerLibrary(localStorage, user.id)),
    [voiceNoteForFilter, setVoiceNoteForFilter] = useState(null),
    [preselectedVoiceFilter, setPreselectedVoiceFilter] = useState('normal'),
    [showVoiceFilterPicker, setShowVoiceFilterPicker] = useState(false);
  const selectedRef = useRef(null),
    bottom = useRef(null),
    initialUnreadScroll = useRef(false),
    conversationsRef = useRef([]),
    scrollBox = useRef(null),
    stickToBottom = useRef(true),
    lastRead = useRef(0),
    fileInput = useRef(null),
    typingTimer = useRef(null),
    recorder = useRef(null),
    recorderStream = useRef(null),
    recordTimer = useRef(null),
    generation = useRef(0),
    messagesRef = useRef([]),
    lastProcessedMsgRef = useRef(null),
    lastTriggeredMsgIdRef = useRef(null),
    showHeartbeatRef = useRef(false),
    showVirtualTouchRef = useRef(false);
  showHeartbeatRef.current = showHeartbeat;
  showVirtualTouchRef.current = showVirtualTouch;
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
  
  // Initialize draft manager for auto-save and restore
  const { clearDraft } = useDraftManager(
    selected,
    draft,
    setDraft,
    replyTo,
    setReplyTo,
    source,
    setSource,
    onError
  );
  
  const loadConversations = useCallback(async () => {
    const rows = await api('/conversations');
    // Load draft info for all conversations
    try {
      const drafts = await api('/drafts');
      const draftMap = {};
      drafts.forEach(d => {
        draftMap[d.conversation_id] = d;
      });
      // Attach draft info to conversations
      const withDrafts = rows.map(conv => ({
        ...conv,
        draft: draftMap[conv.id] || null
      }));
      conversationsRef.current = withDrafts;
      setConversations(withDrafts);
    } catch (error) {
      // If drafts fail to load, just use conversations without draft info
      console.warn('Failed to load drafts:', error.message);
      conversationsRef.current = rows;
      setConversations(rows);
    }
  }, []);
  useEffect(() => {
    const removeExpired=()=>{
      const old=messagesRef.current;
      if(!old.some(m=>hasExpired(m) || hasExpired(m.reply))) return;
      setMessages(items=>items.filter(m=>!hasExpired(m)).map(m=>hasExpired(m.reply)?{...m,reply:null}:m));
      setReplyTo(m=>hasExpired(m)?null:m);
      dismiss();
      void loadConversations().catch(e=>onError(e.message));
    };
    const timer=setInterval(removeExpired,1000);window.addEventListener('focus',removeExpired);
    return ()=>{clearInterval(timer);window.removeEventListener('focus',removeExpired);};
  },[loadConversations,onError,dismiss]);
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
    const refresh = async () => {
      setOnline(navigator.onLine);
      try {
        if (navigator.onLine) {
          const fresh = await api('/auth/session');
          if (fresh.user?.id !== user.id) return onSession(fresh);
          setCsrf(fresh.csrf);
        }
        await loadConversations();
        if (selectedRef.current) await loadMessages(selectedRef.current);
      } catch (error) { if (navigator.onLine) onError(error.message); }
    };
    const offline = () => setOnline(false);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', offline);
    window.addEventListener('kipenzi:outbox-synced', refresh);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', offline);
      window.removeEventListener('kipenzi:outbox-synced', refresh);
    };
  }, [user.id, loadConversations, loadMessages, onSession, onError]);
  useEffect(() => {
    const connection = io({ transports: ['websocket'], auth: { csrf }, autoConnect: false });
    setSocket(connection);
    const refresh = async () => {
      setConnected(true);
      try {
        await loadConversations();
        if (selectedRef.current) {
          const cid = selectedRef.current;
          const loaded = messagesRef.current;
          await loadMessages(cid);
          const fresh = await Promise.all(loaded.filter(m=>!hasExpired(m)).map(m => api(`/messages/${m.id}`)));
          if (selectedRef.current === cid) setMessages(old => mergeMessages(old, fresh));
        }
      } catch (e) {
        onError(e.message);
      }
    };
    const changed = async ({ conversation_id, message_id }) => {
      try {
        await loadConversations();
        if (selectedRef.current === conversation_id) await loadMessages(conversation_id);
        if (message_id) {
          if (selectedRef.current === conversation_id) {
            const updated = await api(`/messages/${message_id}`);
            if (selectedRef.current === conversation_id) {
              const parent = updated.reply_to_id ? await api(`/messages/${updated.reply_to_id}`).catch(() => null) : null;
              if (selectedRef.current === conversation_id) setMessages(old => mergeMessages(old, parent ? [updated, parent] : [updated]));
            }
          }
          void updateAlert(message_id);
        }
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
    const handleDoodleInvite = (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setDoodleInvite(payload);
      }
    };
    const handleHeartbeatInvite = (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setHeartbeatInvite(payload);
        triggerHeartbeatHaptics([60, 60, 80, 180]);
        playHeartbeatSound(0.35);
      }
    };
    const handleHeartbeatPulse = (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        if (!showHeartbeatRef.current) {
          setHeartbeatInvite({
            conversation_id: payload.conversation_id,
            sender_name: payload.sender_name,
          });
          triggerHeartbeatHaptics([50, 60, 70, 160]);
          playHeartbeatSound(0.3);
        }
      }
    };
    const handleTouchInvite = (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setVirtualTouchInvite(payload);
        triggerTouchHaptics([60, 50, 70]);
        playTouchSound(payload.touch_mode || 'gentle', 0.35);
      }
    };
    const handleTouchPulse = (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        if (!showVirtualTouchRef.current) {
          setVirtualTouchInvite({
            conversation_id: payload.conversation_id,
            sender_name: payload.sender_name,
            touch_mode: payload.touch_mode,
          });
          triggerTouchHaptics(payload.type === 'hug' ? [100, 60, 160] : [50, 60]);
          playTouchSound(payload.touch_mode || 'gentle', 0.3);
        }
      }
    };
    connection.on('connect', refresh);
    connection.on('disconnect', () => setConnected(false));
    connection.on('connect_error', (e) => {
      setConnected(false);
      if (e.message === 'Unauthorized') onError('Session expired. Sign in again.');
    });
    connection.on('message:expired', ({conversation_id,message_id}) => {
      if(selectedRef.current===conversation_id) {setMessages(old=>old.filter(m=>m.id!==message_id && !hasExpired(m)));setReplyTo(m=>m?.id===message_id?null:m);}
      dismiss();void loadConversations().catch(e=>onError(e.message));
    });
    connection.on('message:changed', changed);
    connection.on('message:arrived', receive);
    connection.on('mood:changed', receiveMood);
    connection.on('conversation:changed', changed);
    connection.on('receipt:changed', changed);
    connection.on('typing', handleTyping);
    connection.on('doodle:invite', handleDoodleInvite);
    connection.on('heartbeat:invite', handleHeartbeatInvite);
    connection.on('heartbeat:pulse', handleHeartbeatPulse);
    connection.on('touch:invite', handleTouchInvite);
    connection.on('touch:pulse', handleTouchPulse);
    connection.on('daily_prompt:answered', (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setDailyPromptInvite({
          conversation_id: payload.conversation_id,
          sender_name: payload.sender_name,
          date: payload.date,
          type: 'answered',
        });
        triggerHeartbeatHaptics([40, 50, 60]);
      }
    });
    connection.on('daily_prompt:revealed', (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setDailyPromptInvite({
          conversation_id: payload.conversation_id,
          sender_name: payload.partner_name,
          date: payload.date,
          type: 'revealed',
        });
        triggerHeartbeatHaptics([70, 70, 90]);
      }
    });
    connection.on('daily_prompt:nudge', (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setDailyPromptInvite({
          conversation_id: payload.conversation_id,
          sender_name: payload.sender_name,
          date: payload.date,
          type: 'nudge',
        });
        triggerHeartbeatHaptics([60, 60, 80]);
      }
    });
    connection.on('music:invite', (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setMusicInvite(payload);
        triggerHeartbeatHaptics([50, 60, 70]);
      }
    });
    connection.on('video:invite', (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setWatchPartyInvite(payload);
        triggerHeartbeatHaptics([40, 50, 60]);
      }
    });
    connection.on('story:nudge', (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setStoryInvite(payload);
        triggerHeartbeatHaptics([60, 60, 90]);
      }
    });
    connection.on('time_capsule:sealed', (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setTimeCapsuleInvite(payload.capsule);
        triggerHeartbeatHaptics([60, 60, 90]);
      }
    });
    connection.on('time_capsule:nudge', (payload) => {
      if (selectedRef.current === payload.conversation_id) {
        setTimeCapsuleInvite(payload);
        triggerHeartbeatHaptics([60, 60, 90]);
      }
    });
    connection.connect();
    void loadConversations().catch((e) => onError(e.message));
    return () => {
      connection.disconnect();
      clearTimeout(typingTimer.current);
    };
  }, [csrf, loadConversations, loadMessages, onError, receive, receiveMood, updateAlert, dismiss]);
  useEffect(() => {
    if (selectedRef.current) {
      setMessages([]);
      void loadMessages(selectedRef.current, undefined, true).catch((e) => onError(e.message));
    }
  }, [user.language, loadMessages, onError]);
  useEffect(() => {
    if (stickToBottom.current && !initialUnreadScroll.current)
      bottom.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
  }, [messages.length, selected, typing, loading]);
  const firstUnread = unreadBoundary === null ? null : firstUnreadMessage(messages, unreadBoundary, user.id);
  const pendingUnread = unreadMessageCount(messages, lastRead.current, user.id);
  useEffect(() => {
    if (loading || !initialUnreadScroll.current || !messages.length) return;
    initialUnreadScroll.current = false;
    requestAnimationFrame(() => {
      const node = firstUnread ? document.getElementById('unread-divider') : bottom.current;
      node?.scrollIntoView({ behavior: 'instant', block: firstUnread ? 'start' : 'end' });
      if (scrollBox.current) {
        const near = isNearLatest(scrollBox.current);
        stickToBottom.current = near;
        setAtLatest(near);
      }
    });
  }, [loading, messages, firstUnread]);
  useEffect(() => {
    if (!atLatest && unreadBoundary === null && messages.some(m => m.sender_id !== user.id && Number(m.seq) > lastRead.current)) setUnreadBoundary(lastRead.current);
  }, [messages, atLatest, unreadBoundary, user.id]);
  const markRead = useCallback(async () => {
    if (
      !online ||
      !selected ||
      !messages.length ||
      loading ||
      tab !== 'chats' ||
      !atLatest ||
      initialUnreadScroll.current ||
      !stickToBottom.current ||
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
  }, [online, selected, messages, loading, atLatest, tab, loadConversations, onError]);
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
  const selectConversation = useCallback(async (cid) => {
    if (recording || sending) {
      onError('Finish your recording or upload before switching conversations.');
      return;
    }
    selectedRef.current = cid;
    messagesRef.current = [];
    lastProcessedMsgRef.current = null;
    setSelected(cid);
    setLibraryKind(null);
    setShowSafety(false);
    setShowDisappearing(false);
    setHighlightMessage(null);
    setMessages([]);
    setFile(null);
    setDraft('');
    setReplyTo(null);
    setPicker(false);
    setTyping(false);
    const conversation = conversationsRef.current.find(c => c.id === cid);
    const readSeq = Number(conversation?.read_seq || 0);
    lastRead.current = readSeq;
    setUnreadBoundary(Number(conversation?.unread || 0) > 0 ? readSeq : null);
    initialUnreadScroll.current = true;
    setAtLatest(false);
    setMessageExpiry(0);
    stickToBottom.current = false;
    setLoading(true);
    const version = ++generation.current;
    try {
      await loadMessages(cid, undefined, true);
      if (Number(conversation?.unread || 0) > 0) {
        let after = readSeq;
        let more = true;
        while (more && selectedRef.current === cid && version === generation.current) {
          const page = await api(`/conversations/${cid}/messages?after=${after}`);
          if (selectedRef.current !== cid) return;
          setMessages(old => mergeMessages(old, page.messages));
          more = page.has_more && page.messages.length > 0;
          if (page.messages.length) after = Number(page.messages.at(-1).seq);
        }
      }
      const history = navigator.onLine ? await api(`/conversations/${cid}/calls`) : [];
      if (version === generation.current) setCalls(history);
    } catch (e) {
      onError(e.message);
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [recording, sending, loadMessages, onError]);
  const addContact = async (handle) => {
    setContactBusy(true);
    setContactError('');
    try {
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
  const createGroup = async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setContactBusy(true);
    setContactError('');
    try {
      const handles = values.handles.split(/[\s,]+/).filter(Boolean).map(handle => handle.replace(/^@/, '').toLowerCase());
      const result = await api('/conversations/groups', { method: 'POST', body: { name: values.name, description: values.description || undefined, handles } });
      await loadConversations();
      setShowGroup(false);
      setShowContact(false);
      await selectConversation(result.id);
    } catch (e) { setContactError(e.message); }
    finally { setContactBusy(false); }
  };
  useEffect(() => {
    const url = new URL(window.location.href);
    const cid = url.searchParams.get('chat');
    if (!cid) return;
    if (url.searchParams.get('account') === user.id && !conversations.some(item => item.id === cid)) return;
    url.searchParams.delete('chat');
    const account = url.searchParams.get('account');
    url.searchParams.delete('account');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (account === user.id && conversations.some(item => item.id === cid)) void selectConversation(cid);
  }, [conversations, user.id, selectConversation]);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const open = event => {
      if (event.data?.type !== 'OPEN_CHAT' || event.data.user_id !== user.id) return;
      const url = new URL(window.location.href);
      url.searchParams.set('chat', event.data.conversation_id);
      url.searchParams.set('account', user.id);
      window.history.replaceState(null, '', url.pathname + url.search);
      void loadConversations().catch(error => onError(error.message));
    };
    navigator.serviceWorker.addEventListener('message', open);
    return () => navigator.serviceWorker.removeEventListener('message', open);
  }, [user.id, loadConversations, onError]);
  const sendMessage = async (sticker, queuedFile) => {
    const outgoing = queuedFile || file;
    const cid = selectedRef.current;
    if (!cid || sending || (!draft.trim() && !outgoing && !sticker)) return;
    const detected = detectReaction(draft, sticker);
    if (detected) triggerReaction(detected);
    setSending(true);
    try {
      const input = {
        text: outgoing?.caption ?? draft,
        source_language: source,
        expires_in_seconds: messageExpiry,
        view_once: Boolean(outgoing?.view_once),
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
        ...(sticker ? { sticker } : {}),
        ...(outgoing?.attachment ? { attachment_id: outgoing.attachment.id } : {}),
      };
      // Each queued message owns an immutable snapshot and one retry identifier.
      const delivery = outbox.enqueue(cid, input, outgoing?.file, () => {
        setDraft('');
        setReplyTo(null);
        setFile(null);
        setPicker(false);
        setMessageExpiry(0);
        stickToBottom.current = true;
        outgoing?.onQueued?.();
        void clearDraft().catch((error) => { if (navigator.onLine) onError(error.message); });
      });
      const result = await delivery;
      if (!result) return false;
      if (selectedRef.current === cid) await loadMessages(cid);
      await loadConversations();
      return true;
    } catch (e) {
      onError(e.message);
    } finally {
      setSending(false);
    }
  };
  const retryMessage = async (key) => {
    const result = await outbox.retry(key);
    if (!result) return;
    try {
      if (selectedRef.current === result.conversation_id) await loadMessages(result.conversation_id);
      await loadConversations();
    } catch (error) { onError(error.message); }
  };

  const saveCustomSticker = (dataUrl) => {
    const updated = addStickerToLibrary(customStickers, dataUrl);
    persistStickerLibrary(localStorage, user.id, updated);
    setCustomStickers(updated);
    return true;
  };

  const deleteCustomSticker = (id, event) => {
    event.stopPropagation();
    try {
      const updated = customStickers.filter(sticker => sticker.id !== id);
      persistStickerLibrary(localStorage, user.id, updated);
      setCustomStickers(updated);
    } catch (error) { onError(error.message); }
  };

  const sendCustomSticker = async (blob, dataUrl) => {
    if (!selectedRef.current || sending) throw new Error('Wait for the current message before sending your sticker.');
    let accepted = false;
    const queued = {
      file: new File([blob], 'sticker-' + Date.now() + '.png', { type: 'image/png' }),
      caption: '',
      onQueued: () => {
        accepted = true;
        if (dataUrl) {
          try { saveCustomSticker(dataUrl); } catch (error) { onError(error.message); }
        }
        setShowStickerCreator(false);
      },
    };
    await sendMessage(null, queued);
    if (!accepted) throw new Error('Your sticker could not be queued. Please try again.');
  };

  const sendDoodleToChat = async (blob, caption = '') => {
    if (!selectedRef.current || sending) return;
    const queued = { file: new File([blob], 'doodle-' + Date.now() + '.png', { type: blob.type || 'image/png' }), caption };
    setShowDoodle(false);
    await sendMessage(null, queued);
  };

  const sendHeartbeatToChat = async (text) => {
    const cid = selectedRef.current;
    if (!cid) return;
    setSending(true);
    try {
      await outbox.enqueue(cid, {
        text,
        source_language: user.language || 'ml',
        expires_in_seconds: messageExpiry,
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      });
      setMessageExpiry(0);
      setShowHeartbeat(false);
      setReplyTo(null);
      stickToBottom.current = true;
      await loadMessages(cid);
      await loadConversations();
    } catch (e) {
      onError(e.message);
    } finally {
      setSending(false);
    }
  };

  const sendVirtualTouchToChat = async (text) => {
    const cid = selectedRef.current;
    if (!cid) return;
    setSending(true);
    try {
      await outbox.enqueue(cid, {
        text,
        source_language: user.language || 'ml',
        expires_in_seconds: messageExpiry,
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      });
      setMessageExpiry(0);
      setShowVirtualTouch(false);
      setReplyTo(null);
      stickToBottom.current = true;
      await loadMessages(cid);
      await loadConversations();
    } catch (e) {
      onError(e.message);
    } finally {
      setSending(false);
    }
  };

  const sendMusicToChat = async (text) => {
    const cid = selectedRef.current;
    if (!cid) return;
    setSending(true);
    try {
      await outbox.enqueue(cid, {
        text,
        source_language: user.language || 'ml',
        expires_in_seconds: messageExpiry,
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      });
      setMessageExpiry(0);
      setReplyTo(null);
      stickToBottom.current = true;
      await loadMessages(cid);
      await loadConversations();
    } catch (e) {
      onError(e.message);
    } finally {
      setSending(false);
    }
  };

  const sendWatchPartyToChat = async (text) => {
    const cid = selectedRef.current;
    if (!cid) return;
    setSending(true);
    try {
      await outbox.enqueue(cid, {
        text,
        source_language: user.language || 'ml',
        expires_in_seconds: messageExpiry,
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      });
      setMessageExpiry(0);
      setReplyTo(null);
      stickToBottom.current = true;
      await loadMessages(cid);
      await loadConversations();
    } catch (e) {
      onError(e.message);
    } finally {
      setSending(false);
    }
  };

  const sendDailyPromptToChat = async (text) => {
    const cid = selectedRef.current;
    if (!cid) return;
    setSending(true);
    try {
      await outbox.enqueue(cid, {
        text,
        source_language: user.language || 'ml',
        expires_in_seconds: messageExpiry,
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      });
      setMessageExpiry(0);
      setShowDailyPrompt(false);
      setReplyTo(null);
      stickToBottom.current = true;
      await loadMessages(cid);
      await loadConversations();
    } catch (e) {
      onError(e.message);
    } finally {
      setSending(false);
    }
  };

  const sendStoryToChat = async (text) => {
    const cid = selectedRef.current;
    if (!cid) return;
    setSending(true);
    try {
      await outbox.enqueue(cid, {
        text,
        source_language: user.language || 'ml',
        expires_in_seconds: messageExpiry,
        ...(replyTo ? { reply_to_id: replyTo.id } : {}),
      });
      setMessageExpiry(0);
      setReplyTo(null);
      stickToBottom.current = true;
      await loadMessages(cid);
      await loadConversations();
    } catch (e) {
      onError(e.message);
    } finally {
      setSending(false);
    }
  };

  const sendSavedCustomSticker = async (sticker) => {
    if (!selectedRef.current || sending) return;
    try {
      const response = await fetch(sticker.dataUrl);
      const blob = await response.blob();
      await sendCustomSticker(blob);
    } catch (error) { onError(error.message); }
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
        if (voice.size) {
          setVoiceNoteForFilter(voice);
        }
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
      if (call.call) await call.end().catch(() => {});
      await api('/auth/logout', { method: 'POST' });
    } catch (e) {
      if (navigator.onLine) onError(e.message);
    } finally {
      await push.clearNotifications();
      onSession({ user: null, csrf: null });
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
      {preview && (
        <div className="incoming-message-alert" role="status" aria-live="polite">
          <button type="button" className="incoming-message-open" onClick={() => { dismiss(); void selectConversation(preview.conversation_id); }}>
            <MessageCircle size={23} />
            <span><strong>{preview.name}</strong><span dir="auto">{preview.body}</span><small>Tap to open chat</small></span>
          </button>
          <ButtonIcon label="Dismiss message alert" onClick={dismiss}><X size={18} /></ButtonIcon>
        </div>
      )}
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
          <ButtonIcon label="Export chat" onClick={() => setExportChat({ id: selected, title: chosen.is_group ? chosen.name || chosen.peer.name : chosen.peer.name })}><Download size={20} /></ButtonIcon>
                <InstallApp compact />
          <ButtonIcon
            label={isDark ? 'Switch to light theme (ലൈറ്റ്)' : 'Switch to dark theme (ഡാർക്ക്)'}
            className="rail-btn theme-toggle-icon-btn"
            onClick={toggleTheme}
          >
            {isDark ? <Sun size={21} /> : <Moon size={21} />}
          </ButtonIcon>
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
          <div className="panel-heading-actions">
            <ButtonIcon
              label="Search all messages"
              className="search-all-btn"
              onClick={() => setShowGlobalSearch(true)}
            >
              <Search size={21} />
            </ButtonIcon>
            <ButtonIcon
              label="Connect with my ride-or-die"
              className="new-chat-btn"
              onClick={() => setShowContact(true)}
            >
              <Plus size={21} />
            </ButtonIcon>
          </div>
        </div>
        <div className="panel-install"><InstallApp /></div>
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
            {!online ? 'Offline · messages saved on this device' : outbox.entries.some(entry => entry.status === 'queued') ? 'Waiting to sync…' : connected ? 'Close & connected' : 'Reconnecting...'}
          </span>
        </div>
        <div className="conversation-list">
          {filtered.map((c) => {
            const isOnline = c.peer.online === true;
            const lastSeenText = c.peer.last_seen && c.peer.online === false ? formatLastSeen(c.peer.last_seen) : null;
            return (
              <button
                type="button"
                key={c.id}
                className={`conversation ${c.id === selected ? 'selected' : ''}`}
                onClick={() => void selectConversation(c.id)}
              >
                <Avatar person={c.peer} />
                <div className="conversation-text">
                  <div>
                    <strong>
                      {c.peer.name}
                      {isOnline && <span style={{ color: '#4ade80', marginLeft: '6px', fontSize: '12px' }}>●</span>}
                    </strong>
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
                    {c.draft && c.draft.text ? (
                      <span style={{ color: '#ef4444', fontStyle: 'italic' }}>📝 Draft: {c.draft.text.slice(0, 50)}{c.draft.text.length > 50 ? '...' : ''}</span>
                    ) : (
                      (c.last_message?.view_once ? (c.last_message.view_once_opened_at ? '① Opened' : '① View-once media') : '') || c.last_message?.text ||
                      (c.last_message?.sticker
                        ? `${stickers[c.last_message.sticker]} Sticker`
                        : c.last_message?.attachment
                          ? 'Attachment'
                          : 'Our first hello starts here. Say something! 🤍')
                    )}
                  </p>
                  <span className="contact-language">
                    {languages[c.peer.language]}
                    {lastSeenText && <span style={{ marginLeft: '8px', color: '#94a3b8' }}>· {lastSeenText}</span>}
                  </span>
                </div>
                {c.unread > 0 && <span className="unread">{c.unread}</span>}
              </button>
            );
          })}
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
                <p>
                  {chosen.peer.online === true && <span style={{ color: '#4ade80' }}>online · </span>}
                  {chosen.peer.online === false && chosen.peer.last_seen && (
                    <span style={{ color: '#94a3b8' }}>last seen {formatLastSeen(chosen.peer.last_seen)} · </span>
                  )}
                  {chosen.is_group ? `${chosen.members.length} members · ${languages[user.language]}` : 'My person · Ride or die forever 🤍'}
                </p>
              </div>
              <div className="header-actions">
                {chosen.is_group && (
                  <ButtonIcon label="Group Settings" onClick={() => setShowGroupSettings(true)}>
                    <Users size={20} />
                  </ButtonIcon>
                )}
                <ButtonIcon label="Disappearing messages" onClick={() => setShowDisappearing(true)}><Clock size={20} /></ButtonIcon>
                <ButtonIcon label="Starred messages" onClick={() => setLibraryKind("starred")}><Star size={20} /></ButtonIcon>
                <ButtonIcon label="Pinned messages" onClick={() => setLibraryKind("pinned")}><Pin size={20} /></ButtonIcon>
                {!chosen.is_group && <ButtonIcon label="Block or report user" onClick={() => setShowSafety(true)}><ShieldCheck size={20} /></ButtonIcon>}
                <ButtonIcon label="Search this chat" onClick={() => setLibraryKind("messages")}><Search size={20} /></ButtonIcon>
                <ButtonIcon label="Shared photos and documents" onClick={() => setLibraryKind("photos")}><Paperclip size={20} /></ButtonIcon>
                <ButtonIcon
                  label="Shared Media Vault & Scrapbook 📸 (പോളറോയ്ഡ് പ്രണയ ആൽബം)"
                  onClick={() => setShowMediaVault(true)}
                >
                  <Camera size={20} />
                </ButtonIcon>
                <InstallApp compact />
                <ButtonIcon
                  label="Start voice call"
                  disabled={!connected || !!call.call || chosen.contact_blocked || chosen.is_group}
                  onClick={() => void call.start(selected, 'audio')}
                >
                  <Phone size={20} />
                </ButtonIcon>
                <ButtonIcon
                  label="Start video call"
                  disabled={!connected || !!call.call || chosen.contact_blocked || chosen.is_group}
                  onClick={() => void call.start(selected, 'video')}
                >
                  <Video size={21} />
                </ButtonIcon>
                <ButtonIcon
                  label="Live Doodle Together 🎨 (തത്സമയം ഒന്നിച്ച് ചിത്രം വരയ്ക്കാം)"
                  disabled={!connected || chosen.contact_blocked || chosen.is_group}
                  onClick={() => {
                    setShowDoodle(true);
                    setDoodleInvite(null);
                    socket?.emit('doodle:invite', { conversation_id: selected });
                  }}
                >
                  <Palette size={20} />
                </ButtonIcon>
                <ButtonIcon
                  label="Send Live Heartbeat 💓 (ലൈവ് ഹൃദയസ്പന്ദനം)"
                  disabled={!connected || chosen.contact_blocked || chosen.is_group}
                  onClick={() => {
                    setShowHeartbeat(true);
                    setHeartbeatInvite(null);
                    socket?.emit('heartbeat:invite', { conversation_id: selected });
                  }}
                >
                  <Heart size={20} className="heartbeat-action-pulse" />
                </ButtonIcon>
                <ButtonIcon
                  label="Virtual Touch / Haptic Hug 🫂 (സ്പർശന സാമീപ്യം)"
                  disabled={!connected || chosen.contact_blocked || chosen.is_group}
                  onClick={() => {
                    setShowVirtualTouch(true);
                    setVirtualTouchInvite(null);
                    socket?.emit('touch:invite', { conversation_id: selected, touch_mode: 'gentle' });
                  }}
                >
                  <HeartHandshake size={20} className="virtual-touch-action-pulse" />
                </ButtonIcon>
                <ButtonIcon
                  label="Listen to Music Together 🎧 (വാച്ച് & ലിസൺ ടുഗെതർ)"
                  disabled={!connected || chosen.contact_blocked}
                  onClick={() => {
                    setShowMusicModal(true);
                    setIsMusicMinimized(false);
                    setMusicInvite(null);
                    socket?.emit('music:invite', {
                      conversation_id: selected,
                      track: {
                        id: musicEngine.currentTrack.id,
                        titleMl: musicEngine.currentTrack.titleMl,
                        titleEn: musicEngine.currentTrack.titleEn,
                      },
                    });
                  }}
                >
                  <Headphones size={20} className="music-action-icon" />
                </ButtonIcon>
                <ButtonIcon
                  label="Watch Party & Video Sync 🎬 (വാച്ച് പാർട്ടി · ഒന്നിച്ച് വീഡിയോ കാണാം)"
                  disabled={!connected || chosen.contact_blocked}
                  onClick={() => {
                    setShowWatchPartyModal(true);
                    setIsWatchPartyMinimized(false);
                    setWatchPartyInvite(null);
                    socket?.emit('video:invite', {
                      conversation_id: selected,
                      video: {
                        id: watchPartyVideo?.id || CURATED_VIDEOS[0].id,
                        youtubeId: watchPartyVideo?.youtubeId || CURATED_VIDEOS[0].youtubeId,
                        titleMl: watchPartyVideo?.titleMl || CURATED_VIDEOS[0].titleMl,
                        titleEn: watchPartyVideo?.titleEn || CURATED_VIDEOS[0].titleEn,
                        thumbnail: watchPartyVideo?.thumbnail || CURATED_VIDEOS[0].thumbnail,
                      },
                    });
                  }}
                >
                  <Film size={20} className="watch-party-action-icon" />
                </ButtonIcon>
                <ButtonIcon
                  label="Our Story & Milestones 💕 (നമ്മുടെ കഥ & നാഴികക്കല്ലുകൾ)"
                  disabled={!connected || chosen.is_group}
                  onClick={() => {
                    setShowStory(true);
                    setStoryInvite(null);
                  }}
                >
                  <Sparkles size={20} className="our-story-action-icon" />
                </ButtonIcon>
                <ButtonIcon
                  label="Digital Time Capsule ⏳ (ഭാവിയിലേക്കുള്ള പ്രണയലേഖനങ്ങൾ)"
                  disabled={!connected || chosen.is_group}
                  onClick={() => {
                    setShowTimeCapsule(true);
                    setSelectedCapsuleId(null);
                    setTimeCapsuleInvite(null);
                  }}
                >
                  <Gift size={20} className="time-capsule-action-icon" />
                </ButtonIcon>
                <span className="header-divider" />
                <button
                  type="button"
                  className="header-reading-btn"
                  onClick={cycleFontSize}
                  title={`Reading font size: ${currentFontConfig.label} (${currentFontConfig.size}) · Tap to change`}
                  aria-label={`Reading font size: ${currentFontConfig.label} (${currentFontConfig.size})`}
                >
                  <Type size={14} />
                  <span>{currentFontConfig.size}</span>
                </button>
                <ButtonIcon
                  label={isDark ? 'Switch to light theme (ലൈറ്റ്)' : 'Switch to dark theme (ഡാർക്ക്)'}
                  className="theme-toggle-icon-btn"
                  onClick={toggleTheme}
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </ButtonIcon>
                <ButtonIcon label="Chat settings" onClick={() => setShowSettings(true)}>
                  <SettingsIcon size={20} />
                </ButtonIcon>
              </div>
            </header>
            {!online && <div className="expiry-banner offline-banner" role="status">Offline · Read your saved chats. New messages will send when you reconnect.</div>}
            {chosen.disappearing_seconds > 0 && <div className="expiry-banner" role="status">New messages disappear after {expiryOptions[chosen.disappearing_seconds]}. <button type="button" className="text-btn" onClick={() => setShowDisappearing(true)}>Change</button></div>}
            <div className="translation-banner">
              <Globe2 size={15} />
              <span>
                {user.ai_consent && capabilities.translation
                  ? chosen.is_group ? `Messages appear in each member’s selected language. You read in ${languages[user.language]}.` : `${chosen.peer.name}’s words, flowing right to you in ${languages[user.language]}. Speaking straight from the heart.`
                  : capabilities.translation
                    ? 'Speak freely. You can both turn on translation in chat settings.'
                    : 'Translation will be ready once setup is complete.'}
              </span>
              <button type="button" onClick={() => setShowSettings(true)}>
                Settings
              </button>
            </div>
            {chosen.is_group && <details className="group-members"><summary>Group members · {chosen.members.length}</summary><ul>{chosen.members.map(member => <li key={member.id}>{member.name} · @{member.handle} · {languages[member.language]}</li>)}</ul></details>}
            {doodleInvite && (
              <div className="doodle-invite-banner" role="alert">
                <div className="doodle-invite-left">
                  <span className="doodle-pulse-icon">🎨</span>
                  <span>
                    <strong>{doodleInvite.sender_name || 'Your person'}</strong> is inviting you to Live Doodle! (തത്സമയം ഒന്നിച്ച് ചിത്രം വരയ്ക്കാം 🤍)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="doodle-invite-join-btn"
                    onClick={() => {
                      setShowDoodle(true);
                      setDoodleInvite(null);
                    }}
                  >
                    Join Canvas 🎨
                  </button>
                  <ButtonIcon label="Dismiss" onClick={() => setDoodleInvite(null)}>
                    <X size={15} />
                  </ButtonIcon>
                </div>
              </div>
            )}
            {heartbeatInvite && (
              <div className="heartbeat-invite-banner" role="alert">
                <div className="heartbeat-invite-left">
                  <span className="heartbeat-pulse-icon">💓</span>
                  <span>
                    <strong>{heartbeatInvite.sender_name || 'Your partner'}</strong> is sending their live heartbeat! (ലൈവ് ഹൃദയമിടിപ്പ് അയക്കുന്നു · സ്പർശിക്കാൻ തൊടൂ)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="heartbeat-invite-join-btn"
                    onClick={() => {
                      setShowHeartbeat(true);
                      setHeartbeatInvite(null);
                    }}
                  >
                    Touch Back 💓
                  </button>
                  <ButtonIcon label="Dismiss" onClick={() => setHeartbeatInvite(null)}>
                    <X size={15} />
                  </ButtonIcon>
                </div>
              </div>
            )}
            {virtualTouchInvite && (
              <div className="virtual-touch-invite-banner" role="alert">
                <div className="virtual-touch-invite-left">
                  <span className="virtual-touch-pulse-icon">🫂</span>
                  <span>
                    <strong>{virtualTouchInvite.sender_name || 'Your partner'}</strong> is touching the screen! (തത്സമയ സ്പർശനം അയക്കുന്നു · സ്പർശിക്കാൻ തൊടൂ)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="virtual-touch-invite-join-btn"
                    onClick={() => {
                      setShowVirtualTouch(true);
                      setVirtualTouchInvite(null);
                    }}
                  >
                    Touch Back 🫂
                  </button>
                  <ButtonIcon label="Dismiss" onClick={() => setVirtualTouchInvite(null)}>
                    <X size={15} />
                  </ButtonIcon>
                </div>
              </div>
            )}
            {dailyPromptInvite && (
              <div className="daily-prompt-invite-banner" role="alert">
                <div className="daily-prompt-invite-left">
                  <span className="daily-prompt-banner-icon">✨</span>
                  <span>
                    {dailyPromptInvite.type === 'answered' ? (
                      <>
                        <strong>{dailyPromptInvite.sender_name || 'Your partner'}</strong> answered today&apos;s &ldquo;Us&rdquo; Prompt! (ഇന്നത്തെ ചോദ്യത്തിന് ഉത്തരം നൽകി · തുറക്കാൻ നിങ്ങളുടെ ഉത്തരം എഴുതൂ 🔒)
                      </>
                    ) : dailyPromptInvite.type === 'revealed' ? (
                      <>
                        <strong>Mutual Reveal Unlocked! 🎉</strong> Both of you answered today&apos;s prompt! (രണ്ടുപേരുടെയും ഉത്തരങ്ങൾ തുറന്നു!)
                      </>
                    ) : (
                      <>
                        <strong>{dailyPromptInvite.sender_name || 'Your partner'}</strong> nudged you to answer today&apos;s &ldquo;Us&rdquo; Prompt! 💌 (ഇന്നത്തെ ചോദ്യം കാത്തിരിക്കുന്നു)
                      </>
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="daily-prompt-invite-join-btn"
                    onClick={() => {
                      setShowDailyPrompt(true);
                      setDailyPromptInvite(null);
                    }}
                  >
                    {dailyPromptInvite.type === 'revealed' ? 'View Secrets 💕' : 'Open Prompt ✨'}
                  </button>
                  <ButtonIcon label="Dismiss" onClick={() => setDailyPromptInvite(null)}>
                    <X size={15} />
                  </ButtonIcon>
                </div>
              </div>
            )}
            {musicInvite && (
              <div className="music-invite-banner" role="alert">
                <div className="music-invite-left">
                  <span className="music-pulse-icon">🎧</span>
                  <span>
                    <strong>{musicInvite.sender_name || 'Your partner'}</strong> started playing &ldquo;{musicInvite.track?.titleMl || 'a romantic song'}&rdquo;! (ഒരുമിച്ച് പാട്ട് കേൾക്കാം 🎵)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="music-invite-join-btn"
                    onClick={() => {
                      setShowMusicModal(true);
                      setIsMusicMinimized(false);
                      setMusicInvite(null);
                    }}
                  >
                    Join Music 🎵
                  </button>
                  <ButtonIcon label="Dismiss" onClick={() => setMusicInvite(null)}>
                    <X size={15} />
                  </ButtonIcon>
                </div>
              </div>
            )}
            {watchPartyInvite && (
              <div className="watch-invite-banner" role="alert">
                <div className="watch-invite-left">
                  <span className="watch-pulse-icon">🎬</span>
                  <span>
                    <strong>{watchPartyInvite.sender_name || 'Your partner'}</strong> invited you to a Watch Party &ldquo;{watchPartyInvite.video?.titleMl || 'a romantic video'}&rdquo;! (ഒന്നിച്ച് വീഡിയോ കാണാം 🍿)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="watch-invite-join-btn"
                    onClick={() => {
                      if (watchPartyInvite.video) {
                        setWatchPartyVideo(watchPartyInvite.video);
                      }
                      setShowWatchPartyModal(true);
                      setIsWatchPartyMinimized(false);
                      setWatchPartyInvite(null);
                    }}
                  >
                    Join Watch Party 🍿
                  </button>
                  <ButtonIcon label="Dismiss" onClick={() => setWatchPartyInvite(null)}>
                    <X size={15} />
                  </ButtonIcon>
                </div>
              </div>
            )}
            {storyInvite && (
              <div className="story-invite-banner" role="alert">
                <div className="story-invite-left">
                  <span className="story-pulse-icon">📖</span>
                  <span>
                    <strong>{storyInvite.sender_name || 'Your partner'}</strong> sent a sweet reminder to view &ldquo;{storyInvite.title || 'Our Story'}&rdquo;! 💕 (നമ്മുടെ ഓർമ്മകൾ കാണാൻ ഓർമ്മിപ്പിച്ചു!)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="story-invite-join-btn"
                    onClick={() => {
                      setShowStory(true);
                      setStoryInvite(null);
                    }}
                  >
                    Open Our Story 📖
                  </button>
                  <ButtonIcon label="Dismiss" onClick={() => setStoryInvite(null)}>
                    <X size={15} />
                  </ButtonIcon>
                </div>
              </div>
            )}
            {timeCapsuleInvite && (
              <div className="story-invite-banner" role="alert" style={{ background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)', borderColor: '#f43f5e' }}>
                <div className="story-invite-left">
                  <span className="story-pulse-icon">💌</span>
                  <span>
                    <strong>{timeCapsuleInvite.sender_name || 'Your partner'}</strong> sealed a secret Time Capsule: &ldquo;{timeCapsuleInvite.title || 'Love Letter'}&rdquo;! 💕 (ഭാവിയിലേക്കായി ഒരു രഹസ്യ കത്ത് പൂട്ടിവെച്ചു!)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="story-invite-join-btn"
                    style={{ background: '#f43f5e' }}
                    onClick={() => {
                      setSelectedCapsuleId(timeCapsuleInvite.id || null);
                      setShowTimeCapsule(true);
                      setTimeCapsuleInvite(null);
                    }}
                  >
                    View Capsule ⏳
                  </button>
                  <ButtonIcon label="Dismiss" onClick={() => setTimeCapsuleInvite(null)}>
                    <X size={15} />
                  </ButtonIcon>
                </div>
              </div>
            )}
            {!chosen.is_group && !chosen.contact_blocked && tab !== 'calls' && (
              <MoodWidget key={selected} conversationId={selected} user={user} peer={chosen.peer} socket={socket} online={online} />
            )}
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
                      isNearLatest(box);
                    setAtLatest(stickToBottom.current);
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
                                setAtLatest(isNearLatest(box));
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
                          {m.id === firstUnread?.id && <div id="unread-divider" className="unread-divider" role="separator" aria-label="Unread messages"><span>Unread messages</span></div>}
                          <Message
                            key={`${m.id}:${m.edited_at || ""}:${m.deleted_at || ""}`}
                            message={m}
                            contactBlocked={chosen.contact_blocked}
                            highlighted={highlightMessage === m.id}
                            onReply={sending || recording ? undefined : setReplyTo}
                            onChanged={async () => {
                              const updated = await api(`/messages/${m.id}`);
                              if (selectedRef.current === updated.conversation_id) setMessages(old => mergeMessages(old, [updated]));
                              await loadConversations();
                            }}
                            mine={m.sender_id === user.id}
                            group={chosen.is_group}
                            peerRead={chosen.peer_read_seq}
                            user={user}
                            capabilities={capabilities}
                            onError={onError}
                            onOpenDailyPrompt={() => setShowDailyPrompt(true)}
                            onOpenMusic={() => {
                              setShowMusicModal(true);
                              setIsMusicMinimized(false);
                            }}
                            onOpenWatchParty={() => {
                              setShowWatchPartyModal(true);
                              setIsWatchPartyMinimized(false);
                            }}
                            onOpenStory={() => {
                              setShowStory(true);
                            }}
                            onOpenTouch={() => {
                              setShowVirtualTouch(true);
                            }}
                            onOpenTimeCapsule={(capsuleId) => {
                              setSelectedCapsuleId(capsuleId);
                              setShowTimeCapsule(true);
                            }}
                          />
                          <MessageThread message={{ ...m, reply_count: Math.max(m.reply_count || 0, messages.filter(row => row.reply_to_id === m.id && !row.deleted_at && !hasExpired(row)).length) }} revision={messages} onReply={sending || recording || chosen.contact_blocked ? undefined : setReplyTo} />
                        </div>
                      ))}
                      {outbox.entries.filter((entry) => entry.conversation_id === selected && !messages.some((message) => message.client_id === entry.input.client_id)).map((entry) => <OutgoingMessage key={entry.input.client_id} entry={entry} retryDisabled={sending || !!chosen.contact_blocked || outbox.entries.some((row) => row.status === 'sending')} onRetry={(key) => void retryMessage(key)} />)}
                      {typing && (
                        <div className="typing-indicator">
                          <i />
                          <i />
                          <i />
                          <span>{chosen.is_group ? 'A member is typing…' : `${chosen.peer.name} is typing something sweet...`}</span>
                        </div>
                      )}
                      <div ref={bottom} />
                    </>
                  )}
                </div>
                {!atLatest && !loading && messages.length > 0 && <button type="button" className="jump-latest" onClick={() => {
                  stickToBottom.current = true; setAtLatest(true);
                  bottom.current?.scrollIntoView({ behavior:'instant', block:'end' });
                }}>Jump to latest <ChevronDown size={16} />{pendingUnread > 0 && <span aria-label={pendingUnread + ' unread messages'}>{pendingUnread} unread</span>}</button>}
                {isMusicMinimized && !showMusicModal && (
                  <ListenTogetherMiniPlayer
                    track={musicEngine.currentTrack}
                    isPlaying={musicEngine.isPlaying}
                    currentPos={musicEngine.getCurrentPosition()}
                    onTogglePlay={() => {
                      if (musicEngine.isPlaying) {
                        musicEngine.pauseTrack();
                        socket?.emit('music:sync', {
                          conversation_id: selected,
                          action: 'pause',
                          track_id: musicEngine.currentTrack.id,
                          position: musicEngine.getCurrentPosition(),
                          is_playing: false,
                          timestamp: Date.now(),
                        });
                      } else {
                        musicEngine.playTrack(musicEngine.currentTrack, musicEngine.getCurrentPosition());
                        socket?.emit('music:sync', {
                          conversation_id: selected,
                          action: 'play',
                          track_id: musicEngine.currentTrack.id,
                          position: musicEngine.getCurrentPosition(),
                          is_playing: true,
                          timestamp: Date.now(),
                        });
                      }
                      setMusicPlayTick((t) => t + 1);
                    }}
                    onExpand={() => {
                      setShowMusicModal(true);
                      setIsMusicMinimized(false);
                    }}
                    onClose={() => {
                      musicEngine.pauseTrack();
                      setIsMusicMinimized(false);
                      setShowMusicModal(false);
                      socket?.emit('music:status', {
                        conversation_id: selected,
                        active: false,
                        track_id: musicEngine.currentTrack.id,
                      });
                    }}
                    partnerListening={true}
                  />
                )}
                {isWatchPartyMinimized && !showWatchPartyModal && (
                  <WatchPartyMiniPlayer
                    video={watchPartyVideo || CURATED_VIDEOS[0]}
                    isPlaying={isWatchPartyPlaying}
                    currentTime={0}
                    onTogglePlay={() => {
                      const next = !isWatchPartyPlaying;
                      setIsWatchPartyPlaying(next);
                      socket?.emit('video:sync', {
                        conversation_id: selected,
                        action: next ? 'play' : 'pause',
                        video_id: (watchPartyVideo || CURATED_VIDEOS[0]).id || (watchPartyVideo || CURATED_VIDEOS[0]).youtubeId,
                        position: 0,
                        is_playing: next,
                        timestamp: Date.now(),
                      });
                    }}
                    onExpand={() => {
                      setShowWatchPartyModal(true);
                      setIsWatchPartyMinimized(false);
                    }}
                    onClose={() => {
                      setIsWatchPartyMinimized(false);
                      setShowWatchPartyModal(false);
                      socket?.emit('video:status', {
                        conversation_id: selected,
                        active: false,
                        video_id: (watchPartyVideo || CURATED_VIDEOS[0]).id,
                      });
                    }}
                    partnerWatching={true}
                  />
                )}
                <footer className="composer-area">
                  {chosen.contact_blocked && <p className="blocked-notice" role="status">Messaging is unavailable while a user is blocked.{chosen.blocked_by_me && <button type="button" className="text-btn" onClick={() => setShowSafety(true)}>Unblock user</button>}</p>}
                  <fieldset className="composer-controls" disabled={chosen.contact_blocked}>
                  {replyTo && (
                    <div className="reply-composer" role="status">
                      <div><strong>Replying to {replyTo.sender?.name || 'message'}</strong><p>{replyTo.text || (replyTo.sticker ? stickers[replyTo.sticker] : 'Attachment')}</p></div>
                      <ButtonIcon label="Cancel reply" disabled={sending} onClick={() => setReplyTo(null)}><X size={16} /></ButtonIcon>
                    </div>
                  )}
                  {voiceNoteForFilter && (
                    <VoiceFilterStudio
                      rawVoiceBlob={voiceNoteForFilter}
                      initialFilter={preselectedVoiceFilter}
                      onSend={async (filteredFile, _filterId) => {
                        setVoiceNoteForFilter(null);
                        await sendMessage(null, { file: filteredFile, caption: draft });
                      }}
                      onCancel={() => setVoiceNoteForFilter(null)}
                      onRerecord={() => {
                        setVoiceNoteForFilter(null);
                        void record();
                      }}
                      onError={onError}
                    />
                  )}
                  {file && (
                    <div className="queued-file">
                      <FileText size={17} />
                      <span>
                        {file.file.name}
                        <small>{(file.file.size / 1024 / 1024).toFixed(1)} MB</small>
                        {sending && <span role="status">{file.attachment ? 'Sending…' : file.progress === 100 ? 'Processing upload…' : 'Uploading ' + (file.progress ?? 0) + '%'}</span>}
                        {sending && !file.attachment && <progress aria-label="Upload progress" max="100" value={file.progress ?? 0} />}
                        {file.error && <span role="alert">{file.error}</span>}
                        {file.error && <button type="button" disabled={sending} onClick={() => void sendMessage()}>Retry {file.attachment ? 'send' : 'upload'}</button>}
                      </span>
                      {!chosen.is_group && supportsViewOnce(file.file) && <label className="view-once-toggle"><input type="checkbox" aria-label="View once" checked={Boolean(file.view_once)} disabled={sending || (!file.view_once && Boolean(draft.trim()))} onChange={event => setFile(old => ({ ...old, view_once: event.target.checked }))} /><span>① View once<small>{draft.trim() ? 'Remove the caption to use view once.' : 'Your partner can open this photo or video once.'}</small></span></label>}
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
                      <div className="sticker-picker-toolbar">
                        <div className="sticker-search-wrap">
                          <Search size={14} />
                          <input
                            type="text"
                            placeholder="Search stickers..."
                            value={stickerSearch}
                            onChange={(e) => setStickerSearch(e.target.value)}
                            className="sticker-search-input"
                          />
                          {stickerSearch && (
                            <button
                              type="button"
                              className="clear-search-btn"
                              onClick={() => setStickerSearch('')}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          className="create-sticker-btn"
                          title="Create a couple sticker from a photo or meme"
                          aria-label="Create a couple sticker from a photo or meme"
                          onClick={() => {
                            setShowStickerCreator(true);
                          }}
                        >
                          <Plus size={13} /> Create
                        </button>
                      </div>

                      <div className="sticker-tabs-scroll">
                        <button
                          type="button"
                          className={`sticker-tab ${stickerCategory === 'custom' ? 'active' : ''}`}
                          onClick={() => {
                            setStickerCategory('custom');
                            setStickerSearch('');
                          }}
                        >
                          <span>🎨 My Stickers</span>
                          {customStickers.length > 0 && (
                            <span className="badge-count">{customStickers.length}</span>
                          )}
                        </button>
                        {Object.entries(stickerCategories).map(([catKey, cat]) => (
                          <button
                            type="button"
                            key={catKey}
                            className={`sticker-tab ${stickerCategory === catKey ? 'active' : ''}`}
                            onClick={() => {
                              setStickerCategory(catKey);
                              setStickerSearch('');
                            }}
                          >
                            <span>{cat.icon} {cat.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="sticker-grid-content">
                        {stickerCategory === 'custom' && !stickerSearch ? (
                          <div className="custom-stickers-grid">
                            <button
                              type="button"
                              className="custom-sticker-add-card"
                              onClick={() => setShowStickerCreator(true)}
                            >
                              <Plus size={20} />
                              <span>Create from Photo / Meme</span>
                            </button>
                            {customStickers.map((s) => (
                              <div key={s.id} className="custom-sticker-item">
                                <button type="button" className="custom-sticker-send" disabled={sending || recording} aria-label="Send saved custom sticker" onClick={() => void sendSavedCustomSticker(s)}>
                                  <img src={s.dataUrl} alt="Custom sticker" />
                                </button>
                                <button type="button" className="del-sticker-btn" aria-label="Delete saved custom sticker" title="Delete sticker" onClick={(event) => deleteCustomSticker(s.id, event)}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                            {customStickers.length === 0 && (
                              <p className="no-custom-msg">
                                No custom stickers yet. Tap &apos;Create from Photo / Meme&apos; to make your first!
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="emoji-stickers-grid">
                            {Object.entries(stickers)
                              .filter(([key]) => {
                                if (stickerSearch.trim()) {
                                  return key.toLowerCase().includes(stickerSearch.toLowerCase().replace(/\s+/g, '_'));
                                }
                                if (stickerCategory === 'all') return true;
                                return stickerCategories[stickerCategory]?.keys?.includes(key);
                              })
                              .map(([key, emoji]) => (
                                <button
                                  type="button"
                                  key={key}
                                  title={key.replace(/_/g, ' ')}
                                  aria-label={`Send ${key} sticker`}
                                  disabled={sending}
                                  onClick={() => void sendMessage(key)}
                                  className="emoji-sticker-btn"
                                >
                                  {emoji}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
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
                      label="Live Doodle Together 🎨 (തത്സമയം ഒന്നിച്ച് വരയ്ക്കാം)"
                      disabled={sending || recording || chosen.is_group}
                      onClick={() => {
                        setShowDoodle(true);
                        setDoodleInvite(null);
                        socket?.emit('doodle:invite', { conversation_id: selected });
                      }}
                    >
                      <Palette size={21} />
                    </ButtonIcon>
                    <ButtonIcon
                      label="Send Live Heartbeat 💓 (ലൈവ് ഹൃദയസ്പന്ദനം)"
                      disabled={sending || recording || chosen.is_group}
                      onClick={() => {
                        setShowHeartbeat(true);
                        setHeartbeatInvite(null);
                        socket?.emit('heartbeat:invite', { conversation_id: selected });
                      }}
                    >
                      <Heart size={21} className="heartbeat-action-pulse" />
                    </ButtonIcon>
                    <ButtonIcon
                      label="Virtual Touch / Haptic Hug 🫂 (സ്പർശന സാമീപ്യം)"
                      disabled={sending || recording || chosen.is_group}
                      onClick={() => {
                        setShowVirtualTouch(true);
                        setVirtualTouchInvite(null);
                        socket?.emit('touch:invite', { conversation_id: selected, touch_mode: 'gentle' });
                      }}
                    >
                      <HeartHandshake size={21} className="virtual-touch-action-pulse" />
                    </ButtonIcon>
                    <ButtonIcon
                      label="Daily 'Us' Prompt ✨ (ഇന്നത്തെ ചോദ്യം)"
                      disabled={sending || recording || chosen.is_group}
                      onClick={() => {
                        setShowDailyPrompt(true);
                        setDailyPromptInvite(null);
                      }}
                    >
                      <Sparkles size={21} className="daily-prompt-toolbar-icon" />
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
                        {preselectedVoiceFilter !== 'normal' && (
                          <span className="recording-filter-pill">
                            {getVoiceFilter(preselectedVoiceFilter).icon} {getVoiceFilter(preselectedVoiceFilter).name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <textarea
                        aria-label="Message"
                        placeholder={file?.view_once ? 'View-once media has no caption' : 'Spill the tea... or just say you miss me 💬'}
                        rows={1}
                        value={draft}
                        disabled={sending || Boolean(file?.view_once)}
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
                    <div className="voice-filter-toggle-container">
                      <button
                        type="button"
                        className={`voice-filter-toggle-btn ${preselectedVoiceFilter !== 'normal' ? 'active' : ''}`}
                        title="Fun Voice Filters (ശബ്ദം മാറ്റാനുള്ള ഇഫക്റ്റുകൾ)"
                        aria-label="Fun voice filters"
                        disabled={sending || recording}
                        onClick={() => setShowVoiceFilterPicker((prev) => !prev)}
                      >
                        <span className="vf-toggle-icon">
                          {preselectedVoiceFilter !== 'normal'
                            ? getVoiceFilter(preselectedVoiceFilter).icon
                            : '🎭'}
                        </span>
                      </button>
                      {showVoiceFilterPicker && (
                        <div className="voice-filter-popover" role="dialog" aria-label="Select Voice Filter">
                          <div className="vf-popover-header">
                            <div className="vf-popover-title">
                              <strong>🎭 Fun Voice Filters</strong>
                              <small>ശബ്ദ ഇഫക്റ്റുകൾ</small>
                            </div>
                            <button
                              type="button"
                              className="vf-popover-close"
                              aria-label="Close voice filter selector"
                              onClick={() => setShowVoiceFilterPicker(false)}
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <div className="vf-popover-list">
                            {VOICE_FILTERS.map((f) => {
                              const isSelected = preselectedVoiceFilter === f.id;
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  className={`vf-popover-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() => {
                                    setPreselectedVoiceFilter(f.id);
                                    setShowVoiceFilterPicker(false);
                                  }}
                                >
                                  <span className="vf-item-icon">{f.icon}</span>
                                  <div className="vf-item-text">
                                    <div className="vf-item-heading">
                                      <strong>{f.name}</strong>
                                      <span className="vf-item-ml">{f.malayalamName}</span>
                                    </div>
                                    <small>{f.description}</small>
                                  </div>
                                  {isSelected && <span className="vf-item-check">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <ButtonIcon
                      label={recording ? 'Stop recording' : 'Record voice note'}
                      disabled={sending || !!file}
                      onClick={() => void record()}
                    >
                      {recording ? <StopCircle size={22} /> : <Mic size={21} />}
                    </ButtonIcon>
                    <ButtonIcon label="Scheduled messages" disabled={sending || recording} onClick={() => setShowScheduled(true)}><Clock size={21} /></ButtonIcon>
                    <ButtonIcon
                      label="Digital Time Capsule ⏳ (ഭാവിയിലേക്കുള്ള പ്രണയലേഖനങ്ങൾ)"
                      disabled={sending || recording || !chosen || chosen.is_group}
                      onClick={() => {
                        setShowTimeCapsule(true);
                        setSelectedCapsuleId(null);
                      }}
                    >
                      <Gift size={21} />
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
                    <label>Self-destruct<select aria-label="Message expiration" value={messageExpiry} disabled={sending || recording} onChange={(event) => setMessageExpiry(Number(event.target.value))}>{Object.entries(messageExpiryOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
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
                  </fieldset>
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
      {showDisappearing && chosen && <DisappearingSettings conversation={chosen} onClose={() => setShowDisappearing(false)} onChanged={loadConversations} onError={onError} />}
      {showSafety && chosen && <UserSafety person={chosen.peer} blocked={chosen.blocked_by_me} onClose={() => setShowSafety(false)} onChanged={loadConversations} />}
      {exportChat && <ChatExport conversationId={exportChat.id} title={exportChat.title} onClose={() => setExportChat(null)} />}
      {showGlobalSearch && <GlobalSearch 
        onClose={() => setShowGlobalSearch(false)} 
        conversations={conversations}
        onOpenMessage={async message => {
          const cid = message.conversation_id;
          try {
            const page = await api(`/conversations/${cid}/messages?before=${Number(message.seq)+1}`);
            if (selectedRef.current !== cid) {
              await selectConversation(cid);
            }
            stickToBottom.current = false;
            setAtLatest(false);
            setMessages(old => mergeMessages(old, page.messages));
            setHasMore(page.has_more);
            setTab('chats');
            setHighlightMessage(message.id);
            setShowGlobalSearch(false);
            requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('message-' + message.id)?.scrollIntoView({ block:'center', behavior:'smooth' })));
          } catch (e) { onError(e.message); }
        }}
      />}
      {libraryKind && selected && <ChatLibrary conversationId={selected} initialKind={libraryKind} onClose={() => setLibraryKind(null)} onOpenVault={() => setShowMediaVault(true)} onOpen={async message => {
        const cid = selectedRef.current;
        try {
          const page = await api(`/conversations/${cid}/messages?before=${Number(message.seq)+1}`);
          if (selectedRef.current !== cid) return;
          stickToBottom.current = false;
          setAtLatest(false);
          setMessages(old => mergeMessages(old, page.messages));
          setHasMore(page.has_more);
          setTab('chats'); setHighlightMessage(message.id); setLibraryKind(null);
          requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('message-' + message.id)?.scrollIntoView({ block:'center', behavior:'smooth' })));
        } catch (e) { onError(e.message); }
      }} />}
      <ScheduledMessages open={showScheduled} onClose={() => setShowScheduled(false)} conversationId={selected} draft={draft} source={source} socket={socket} pushEnabled={push.enabled} onScheduled={(text) => {
        if (selectedRef.current === selected && draft.trim() === text) { setDraft(''); void clearDraft(); }
      }} />
      {showSettings && (
        <Settings
          user={user}
          messageAlerts={
            <div className="message-alert-settings">
              <h3>Message alerts</h3>
              <p>Incoming messages show a sender name and preview while Kipenzi is open.</p>
              <label className="check-label"><input type="checkbox" checked={soundEnabled} onChange={event => setSoundEnabled(event.target.checked)} />Play a sound for new messages</label>
              <button type="button" className="secondary" disabled={!soundEnabled} onClick={playSound}>Test message sound</button>
              <p>Get sender names and message previews even when Kipenzi is closed.</p>
              <button type="button" className="secondary" disabled={push.busy || push.configured === null} onClick={() => void (push.enabled ? push.disable() : push.enable())}>
                {push.busy ? 'Setting up alerts…' : push.enabled ? 'Disable background alerts' : 'Enable background alerts'}
              </button>
              {push.enabled && <small className="push-status" role="status">Background message alerts enabled on this device.</small>}
              <small className="push-status">On iPhone, install Kipenzi on your Home Screen and open it there first.</small>
            </div>
          }
          capabilities={capabilities}
          appearanceControls={themeControls}
          theme={theme}
          onThemeChange={setTheme}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          onClose={() => setShowSettings(false)}
          onUser={(updated) => onSession({ ...session, user: updated })}
          onError={onError}
        />
      )}{' '}
      {showContact && (
        <Modal title="Connect with your ride-or-die" onClose={() => setShowContact(false)}>
          <p className="modal-description">
            Choose a person to start chatting. Search by name or handle. Your handle is{' '}
            <strong>@{user.handle}</strong>.
          </p>
          <UserDirectory onSelect={addContact} connecting={contactBusy} contactError={contactError} />
          <button type="button" className="secondary" disabled={contactBusy} onClick={() => { setContactError(''); setShowGroup(true); setShowContact(false); }}>Create group chat</button>
        </Modal>
      )}
      {showGroup && <Modal title="Create group chat" onClose={() => setShowGroup(false)}>
        <p className="modal-description">Add at least two people. Each member reads messages in their selected language when AI translation is enabled.</p>
        <form onSubmit={createGroup}>
          <label>Group name<input name="name" required maxLength={80} placeholder="Friends and family" /></label>
          <label>Description (optional)<textarea name="description" maxLength={500} placeholder="What's this group about?" rows={3} /></label>
          <label>Member handles<textarea name="handles" required maxLength={1600} placeholder="@friend_one, @friend_two" /></label>
          {contactError && <p className="form-error" role="alert">{contactError}</p>}
          <button className="primary" disabled={contactBusy}>{contactBusy ? 'Creating…' : 'Create group'}</button>
        </form>
      </Modal>}
      {showStickerCreator && (
        <StickerCreatorModal
          onClose={() => setShowStickerCreator(false)}
          onSendSticker={sendCustomSticker}
          onSaveToLibrary={saveCustomSticker}
          sendDisabled={sending || recording}
          onError={onError}
        />
      )}
      {showDoodle && chosen && (
        <LiveDoodleModal
          conversationId={selected}
          user={user}
          peer={chosen.peer}
          socket={socket}
          onClose={() => setShowDoodle(false)}
          onSendToChat={sendDoodleToChat}
          onError={onError}
        />
      )}
      {showHeartbeat && chosen && (
        <LiveHeartbeatModal
          conversationId={selected}
          user={user}
          peer={chosen.peer}
          socket={socket}
          onClose={() => setShowHeartbeat(false)}
          onSendToChat={sendHeartbeatToChat}
          onError={onError}
        />
      )}
      {showVirtualTouch && chosen && (
        <VirtualTouchModal
          conversationId={selected}
          user={user}
          peer={chosen.peer}
          socket={socket}
          onClose={() => setShowVirtualTouch(false)}
          onSendToChat={sendVirtualTouchToChat}
          onError={onError}
        />
      )}
      {showDailyPrompt && chosen && !chosen.is_group && (
        <DailyPromptModal
          conversationId={selected}
          user={user}
          peer={chosen.peer}
          socket={socket}
          onClose={() => setShowDailyPrompt(false)}
          onSendToChat={sendDailyPromptToChat}
          onError={onError}
        />
      )}
      {showStory && chosen && !chosen.is_group && (
        <RelationshipStoryModal
          conversationId={selected}
          user={user}
          peer={chosen.peer}
          socket={socket}
          onClose={() => setShowStory(false)}
          onSendToChat={sendStoryToChat}
          onError={onError}
        />
      )}
      {showTimeCapsule && chosen && !chosen.is_group && (
        <TimeCapsuleModal
          conversationId={selected}
          user={user}
          peer={chosen.peer}
          socket={socket}
          initialCapsuleId={selectedCapsuleId}
          onClose={() => {
            setShowTimeCapsule(false);
            setSelectedCapsuleId(null);
          }}
          onSendToChat={sendStoryToChat}
          onError={onError}
        />
      )}
      {showMediaVault && chosen && (
        <MediaVaultModal
          conversation={chosen}
          user={user}
          onClose={() => setShowMediaVault(false)}
          onOpenMessage={async (message) => {
            const cid = selectedRef.current;
            try {
              const page = await api(`/conversations/${cid}/messages?before=${Number(message.seq) + 1}`);
              if (selectedRef.current !== cid) return;
              stickToBottom.current = false;
              setAtLatest(false);
              setMessages((old) => mergeMessages(old, page.messages));
              setHasMore(page.has_more);
              setTab('chats');
              setHighlightMessage(message.id);
              setShowMediaVault(false);
              requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                  document.getElementById('message-' + message.id)?.scrollIntoView({
                    block: 'center',
                    behavior: 'smooth',
                  })
                )
              );
            } catch (e) {
              onError(e.message);
            }
          }}
          onSendToChat={async (text) => {
            try {
              await api(`/conversations/${selected}/messages`, {
                method: 'POST',
                body: {
                  client_id: crypto.randomUUID(),
                  text: text.trim(),
                  source_language: user.language || 'ml',
                },
              });
              stickToBottom.current = true;
              loadMessages(selected);
              loadConversations();
            } catch (e) {
              onError(e.message);
            }
          }}
          onError={onError}
        />
      )}
      {showMusicModal && chosen && (
        <ListenTogetherModal
          conversationId={selected}
          user={user}
          peer={chosen.peer}
          socket={socket}
          onClose={() => {
            setShowMusicModal(false);
            setIsMusicMinimized(false);
          }}
          onMinimize={() => {
            setShowMusicModal(false);
            setIsMusicMinimized(true);
          }}
          onSendToChat={sendMusicToChat}
          onError={onError}
          isCallMode={Boolean(call?.call)}
        />
      )}
      {showWatchPartyModal && chosen && (
        <WatchPartyModal
          conversationId={selected}
          user={user}
          peer={chosen.peer}
          socket={socket}
          initialVideo={watchPartyVideo}
          onClose={() => {
            setShowWatchPartyModal(false);
            setIsWatchPartyMinimized(false);
          }}
          onMinimize={() => {
            setShowWatchPartyModal(false);
            setIsWatchPartyMinimized(true);
          }}
          onSendToChat={sendWatchPartyToChat}
          onSendMessage={(text) => {
            if (text && text.trim()) {
              api(`/conversations/${selected}/messages`, {
                method: 'POST',
                body: {
                  client_id: crypto.randomUUID(),
                  text: text.trim(),
                  source_language: user.language || 'ml',
                },
              }).then(() => {
                stickToBottom.current = true;
                loadMessages(selected);
                loadConversations();
              }).catch((e) => onError(e.message));
            }
          }}
          onError={onError}
          isCallMode={Boolean(call?.call)}
        />
      )}
      {showGroupSettings && chosen && chosen.is_group && (
        <GroupSettingsModal
          conversation={chosen}
          user={user}
          onClose={() => setShowGroupSettings(false)}
          onUpdate={loadConversations}
        />
      )}
      <CallOverlay
        controller={call}
        user={user}
        peer={callPeer}
        socket={socket}
        musicController={chosen ? {
          active: isCallMusicActive,
          toggle: () => {
            const next = !isCallMusicActive;
            setIsCallMusicActive(next);
            if (next && !musicEngine.isPlaying) {
              musicEngine.playTrack(musicEngine.currentTrack, 0, 0.25);
              socket?.emit('music:sync', {
                conversation_id: selected,
                action: 'play',
                track_id: musicEngine.currentTrack.id,
                position: 0,
                is_playing: true,
                timestamp: Date.now(),
              });
            }
          },
          dock: (
            <ListenTogetherCallDock
              track={musicEngine.currentTrack}
              isPlaying={musicEngine.isPlaying}
              onTogglePlay={() => {
                if (musicEngine.isPlaying) {
                  musicEngine.pauseTrack();
                  socket?.emit('music:sync', {
                    conversation_id: selected,
                    action: 'pause',
                    track_id: musicEngine.currentTrack.id,
                    position: musicEngine.getCurrentPosition(),
                    is_playing: false,
                    timestamp: Date.now(),
                  });
                } else {
                  musicEngine.playTrack(musicEngine.currentTrack, musicEngine.getCurrentPosition(), 0.25);
                  socket?.emit('music:sync', {
                    conversation_id: selected,
                    action: 'play',
                    track_id: musicEngine.currentTrack.id,
                    position: musicEngine.getCurrentPosition(),
                    is_playing: true,
                    timestamp: Date.now(),
                  });
                }
                setMusicPlayTick((t) => t + 1);
              }}
              onNextTrack={() => {
                const curIdx = CURATED_TRACKS.findIndex((t) => t.id === musicEngine.currentTrack.id);
                const nextIdx = (curIdx + 1) % CURATED_TRACKS.length;
                const nextTrack = CURATED_TRACKS[nextIdx];
                musicEngine.playTrack(nextTrack, 0, 0.25);
                socket?.emit('music:sync', {
                  conversation_id: selected,
                  action: 'change_track',
                  track_id: nextTrack.id,
                  position: 0,
                  is_playing: true,
                  timestamp: Date.now(),
                });
                setMusicPlayTick((t) => t + 1);
              }}
              volume={musicEngine.volume}
              onVolumeChange={(v) => {
                musicEngine.setVolume(v);
                setMusicPlayTick((t) => t + 1);
              }}
              onExpand={() => {
                setShowMusicModal(true);
                setIsMusicMinimized(false);
              }}
              partnerListening={true}
            />
          ),
        } : undefined}
      />
      </div>
    </>
  );
}
export default function App() {
  const themeControls = useThemeAndFontSize();
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
      const result = await api('/auth/session');
      const features = await api('/capabilities');
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
        <AppLock key={session.user.id} user={session.user}><Chat
          session={session}
          capabilities={capabilities}
          onSession={onSession}
          onError={onError}
          themeControls={themeControls}
        /></AppLock>
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
