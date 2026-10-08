import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Lock,
  Unlock,
  Heart,
  Sparkles,
  Calendar,
  Clock,
  Mic,
  StopCircle,
  Play,
  Pause,
  Image as ImageIcon,
  Share2,
  Trash2,
  Send,
  LoaderCircle,
  Eye,
  CheckCircle,
  Gift,
  AlertCircle,
  RefreshCw,
  BellRing,
} from 'lucide-react';
import { api } from './api.js';
import {
  TIME_CAPSULE_OCCASIONS,
  TIME_CAPSULE_THEMES,
  SEAL_SYMBOLS,
  ROMANTIC_REACTIONS,
  calculateCapsuleCountdown,
  formatCapsuleUnlockDate,
  formatTimeCapsuleChatShare,
} from '../shared/timeCapsule.js';

export function TimeCapsuleModal({
  conversationId,
  user,
  peer,
  socket,
  initialCapsuleId,
  onClose,
  onSendToChat,
  onError,
}) {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent' | 'create'
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [_tick, setTick] = useState(0);

  // Selected capsule for viewing / opening ceremony
  const [readingCapsule, setReadingCapsule] = useState(null);
  const [unsealAnimating, setUnsealAnimating] = useState(false);
  const [reactionNote, setReactionNote] = useState('');
  const [savingReaction, setSavingReaction] = useState(false);

  // Audio player state inside modal
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef(null);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formOccasion, setFormOccasion] = useState('birthday');
  const [formUnlockDate, setFormUnlockDate] = useState('');
  const [formTheme, setFormTheme] = useState('classic_rose');
  const [formSeal, setFormSeal] = useState('heart');
  const [formLetter, setFormLetter] = useState('');
  const [formAudioData, setFormAudioData] = useState('');
  const [formAudioDuration, setFormAudioDuration] = useState(0);
  const [formPhotoData, setFormPhotoData] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Voice note recording state inside creator
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef(null);
  const recordTimerRef = useRef(null);
  const recordStreamRef = useRef(null);

  // Photo file input ref
  const photoInputRef = useRef(null);

  // Sweet nudge toast
  const [nudgeSentId, setNudgeSentId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Helper to get minimum datetime string (current time + 2 minutes)
  const getMinDateTime = () => {
    const d = new Date(Date.now() + 120000);
    return d.toISOString().slice(0, 16);
  };

  // Quick preset shortcuts
  const applyDatePreset = (presetKey) => {
    const now = new Date();
    let target = new Date();
    if (presetKey === '1week') {
      target.setDate(now.getDate() + 7);
    } else if (presetKey === '1month') {
      target.setMonth(now.getMonth() + 1);
    } else if (presetKey === '6months') {
      target.setMonth(now.getMonth() + 6);
    } else if (presetKey === '1year') {
      target.setFullYear(now.getFullYear() + 1);
    } else if (presetKey === 'tomorrow_midnight') {
      target.setDate(now.getDate() + 1);
      target.setHours(0, 0, 0, 0);
    } else if (presetKey === 'new_year') {
      target = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
    } else if (presetKey === 'valentines') {
      const year = now.getMonth() >= 1 && now.getDate() >= 14 ? now.getFullYear() + 1 : now.getFullYear();
      target = new Date(year, 1, 14, 0, 0, 0);
    }
    setFormUnlockDate(target.toISOString().slice(0, 16));
  };

  // Load capsules
  const loadCapsules = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api(`/conversations/${conversationId}/time-capsules`);
      const list = res.capsules || [];
      setCapsules(list);

      // If initialCapsuleId passed, auto-select it
      if (initialCapsuleId) {
        const found = list.find((c) => c.id === initialCapsuleId);
        if (found) {
          setReadingCapsule(found);
          if (found.recipient_id === user.id) setActiveTab('received');
          else setActiveTab('sent');
        }
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [conversationId, initialCapsuleId, user.id, onError]);

  useEffect(() => {
    void loadCapsules();
  }, [loadCapsules]);

  // Live 1-second countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 1000000);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Socket event listeners for real-time capsule surprises
  useEffect(() => {
    if (!socket) return;

    const handleSealed = (payload) => {
      if (payload.conversation_id === conversationId) {
        void loadCapsules(true);
        setToastMessage({
          type: 'info',
          text: `💌 ${payload.capsule?.author_name || 'Your partner'} has sealed a secret Time Capsule for you!`,
        });
      }
    };

    const handleOpened = (payload) => {
      if (payload.conversation_id === conversationId) {
        void loadCapsules(true);
        setToastMessage({
          type: 'celebration',
          text: `🎉 ${payload.opened_by_name || 'Your partner'} just opened and read your Time Capsule!`,
        });
      }
    };

    const handleReaction = (payload) => {
      if (payload.conversation_id === conversationId) {
        void loadCapsules(true);
        if (readingCapsule && readingCapsule.id === payload.capsule_id) {
          setReadingCapsule((prev) => ({
            ...prev,
            reactions: payload.reactions,
          }));
        }
      }
    };

    const handleNudge = (payload) => {
      if (payload.conversation_id === conversationId && payload.sender_id !== user.id) {
        setToastMessage({
          type: 'nudge',
          text: `⏳ ${payload.sender_name} is eagerly waiting for the Time Capsule to unlock!`,
        });
      }
    };

    const handleDeleted = (payload) => {
      if (payload.conversation_id === conversationId) {
        setCapsules((prev) => prev.filter((c) => c.id !== payload.capsule_id));
        if (readingCapsule?.id === payload.capsule_id) {
          setReadingCapsule(null);
        }
      }
    };

    socket.on('time_capsule:sealed', handleSealed);
    socket.on('time_capsule:opened', handleOpened);
    socket.on('time_capsule:reaction', handleReaction);
    socket.on('time_capsule:nudge', handleNudge);
    socket.on('time_capsule:deleted', handleDeleted);

    return () => {
      socket.off('time_capsule:sealed', handleSealed);
      socket.off('time_capsule:opened', handleOpened);
      socket.off('time_capsule:reaction', handleReaction);
      socket.off('time_capsule:nudge', handleNudge);
      socket.off('time_capsule:deleted', handleDeleted);
    };
  }, [socket, conversationId, user.id, readingCapsule, loadCapsules]);

  // Audio player cleanup & progression
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlayingAudio(false);
      setAudioProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [readingCapsule]);

  // Toggle audio playback
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((e) => onError?.(e.message));
    }
  };

  // Voice note recording in creator
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('Audio recording is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream;

      const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((v) =>
        MediaRecorder.isTypeSupported(v),
      );
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };

      recorder.onstop = () => {
        clearInterval(recordTimerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormAudioData(reader.result);
          setFormAudioDuration(recordSeconds);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      const started = Date.now();
      recordTimerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - started) / 1000);
        setRecordSeconds(sec);
        if (sec >= 180) recorder.stop(); // 3-minute max limit
      }, 1000);
    } catch (err) {
      recordStreamRef.current?.getTracks().forEach((t) => t.stop());
      onError?.(err.message);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop();
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      onError?.('Photo must be smaller than 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormPhotoData(ev.target?.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit new capsule
  const handleCreateCapsule = async (e) => {
    e?.preventDefault();
    if (!formTitle.trim()) {
      onError?.('Please provide a title for your Time Capsule.');
      return;
    }
    if (!formUnlockDate) {
      onError?.('Please choose an unlock date in the future.');
      return;
    }
    if (!formLetter.trim() && !formAudioData && !formPhotoData) {
      onError?.('Please write a letter, record a voice note, or attach a photo.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        occasion: formOccasion,
        unlock_at: new Date(formUnlockDate).toISOString(),
        theme: formTheme,
        seal_symbol: formSeal,
        letter_text: formLetter.trim() || null,
        audio_url: formAudioData || null,
        photo_url: formPhotoData || null,
      };

      const res = await api(`/conversations/${conversationId}/time-capsules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Clear form
      setFormTitle('');
      setFormLetter('');
      setFormAudioData('');
      setFormAudioDuration(0);
      setFormPhotoData('');
      setFormUnlockDate('');

      await loadCapsules(true);
      setActiveTab('sent');

      setToastMessage({
        type: 'celebration',
        text: '✨ Time Capsule sealed with love! It is safely locked until the future date.',
      });

      // Offer to share in chat
      if (res.capsule && onSendToChat) {
        const shareMsg = formatTimeCapsuleChatShare(res.capsule, user);
        onSendToChat(shareMsg);
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open / Unseal a Capsule Ceremony
  const handleOpenCapsule = async (capsule) => {
    setUnsealAnimating(true);
    try {
      if (capsule.status !== 'opened') {
        const res = await api(`/conversations/${conversationId}/time-capsules/${capsule.id}/open`, {
          method: 'POST',
        });
        if (res.capsule) {
          setReadingCapsule(res.capsule);
          setCapsules((prev) =>
            prev.map((c) => (c.id === capsule.id ? { ...c, ...res.capsule, status: 'opened' } : c)),
          );
        }
      } else {
        setReadingCapsule(capsule);
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setTimeout(() => setUnsealAnimating(false), 900);
    }
  };

  // Send sweet reaction to capsule
  const handleSendReaction = async (emoji) => {
    if (!readingCapsule) return;
    setSavingReaction(true);
    try {
      const res = await api(
        `/conversations/${conversationId}/time-capsules/${readingCapsule.id}/react`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji, note: reactionNote.trim() || null }),
        },
      );
      setReadingCapsule((prev) => ({
        ...prev,
        reactions: res.reactions || [],
      }));
      setReactionNote('');
      setToastMessage({
        type: 'celebration',
        text: `Sent your sweet reaction ${emoji} to ${peer?.name || 'your partner'}! 💕`,
      });
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSavingReaction(false);
    }
  };

  // Send nudge socket event
  const handleNudgePartner = (capsule) => {
    if (!socket) return;
    socket.emit('time_capsule:nudge', {
      conversation_id: conversationId,
      capsule_id: capsule.id,
      title: capsule.title,
    });
    setNudgeSentId(capsule.id);
    setTimeout(() => setNudgeSentId(null), 3000);
  };

  // Delete capsule
  const handleDeleteCapsule = async (capsuleId) => {
    if (!window.confirm('Are you sure you want to delete this secret Time Capsule?')) return;
    try {
      await api(`/conversations/${conversationId}/time-capsules/${capsuleId}`, {
        method: 'DELETE',
      });
      setCapsules((prev) => prev.filter((c) => c.id !== capsuleId));
      if (readingCapsule?.id === capsuleId) setReadingCapsule(null);
    } catch (err) {
      onError?.(err.message);
    }
  };

  // Share capsule card to chat
  const handleShareToChat = (capsule) => {
    if (!onSendToChat) return;
    const author = capsule.user_id === user.id ? user : peer;
    const shareText = formatTimeCapsuleChatShare(capsule, author);
    onSendToChat(shareText);
    setToastMessage({
      type: 'info',
      text: '💌 Time Capsule card shared into your chat!',
    });
  };

  // Filtered lists
  const receivedList = capsules.filter((c) => c.recipient_id === user.id);
  const sentList = capsules.filter((c) => c.user_id === user.id);

  const pendingReceivedCount = receivedList.filter(
    (c) => calculateCapsuleCountdown(c.unlock_at).isUnlocked && c.status !== 'opened',
  ).length;

  return (
    <div className="tc-modal-backdrop" onClick={onClose}>
      <div
        className="tc-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Digital Time Capsule"
      >
        {/* Toast Banner */}
        {toastMessage && (
          <div className={`tc-toast-banner ${toastMessage.type}`}>
            <span>{toastMessage.text}</span>
            <button
              type="button"
              className="tc-toast-close"
              onClick={() => setToastMessage(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Modal Header */}
        <header className="tc-modal-header">
          <div className="tc-header-title-wrap">
            <div className="tc-header-icon-box">
              <Gift size={24} className="tc-gift-icon" />
            </div>
            <div>
              <h2 className="tc-header-title">
                Digital Time Capsule ⏳
                <span className="tc-header-title-ml">ഭാവിയിലേക്കുള്ള പ്രണയലേഖനങ്ങൾ</span>
              </h2>
              <p className="tc-header-subtitle">
                Secret letters &amp; voice notes locked with love until a future date 💕
              </p>
            </div>
          </div>
          <div className="tc-header-actions">
            <button
              type="button"
              className="tc-refresh-btn"
              onClick={() => void loadCapsules(true)}
              title="Refresh Capsules"
            >
              <RefreshCw size={17} className={refreshing ? 'tc-spin' : ''} />
            </button>
            <button
              type="button"
              className="tc-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Nav Tabs */}
        <nav className="tc-nav-tabs">
          <button
            type="button"
            className={`tc-tab-btn ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('received');
              setReadingCapsule(null);
            }}
          >
            <span>Locked For You 💌 (നിനക്കായി)</span>
            <span className="tc-tab-badge">
              {receivedList.length}
              {pendingReceivedCount > 0 && ` · ${pendingReceivedCount} ready!`}
            </span>
          </button>
          <button
            type="button"
            className={`tc-tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('sent');
              setReadingCapsule(null);
            }}
          >
            <span>Sealed by You ✍️ (ഞാൻ അയച്ചവ)</span>
            <span className="tc-tab-badge">{sentList.length}</span>
          </button>
          <button
            type="button"
            className={`tc-tab-btn create-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('create');
              setReadingCapsule(null);
            }}
          >
            <span>Seal a New Capsule 🔒✨ (പുതിയ കത്ത്)</span>
          </button>
        </nav>

        {/* Modal Main Body */}
        <div className="tc-modal-body">
          {loading ? (
            <div className="tc-loading-state">
              <LoaderCircle size={36} className="tc-spin" />
              <p>Gathering your sealed love letters... 💕</p>
              <small>പ്രതീക്ഷയോടെ കാത്തിരുന്ന രഹസ്യങ്ങൾ ഒരുക്കുന്നു...</small>
            </div>
          ) : readingCapsule ? (
            /* ============================================================ */
            /* VIEW / READ CAPSULE CEREMONY MODAL VIEW                       */
            /* ============================================================ */
            <div
              className={`tc-reader-view ${unsealAnimating ? 'unsealing-anim' : ''}`}
              style={{
                '--theme-accent':
                  TIME_CAPSULE_THEMES[readingCapsule.theme]?.accentColor || '#f43f5e',
                '--theme-seal':
                  TIME_CAPSULE_THEMES[readingCapsule.theme]?.sealColor || '#be123c',
              }}
            >
              <div className="tc-reader-top-bar">
                <button
                  type="button"
                  className="tc-back-btn"
                  onClick={() => setReadingCapsule(null)}
                >
                  ← Back to list (തിരികെ)
                </button>
                <div className="tc-reader-actions">
                  <button
                    type="button"
                    className="tc-action-pill-btn"
                    onClick={() => handleShareToChat(readingCapsule)}
                    title="Share to chat"
                  >
                    <Share2 size={14} />
                    <span>Share in Chat (ചാറ്റിൽ പങ്കുവെക്കാം)</span>
                  </button>
                  {readingCapsule.user_id === user.id && (
                    <button
                      type="button"
                      className="tc-delete-pill-btn"
                      onClick={() => handleDeleteCapsule(readingCapsule.id)}
                      title="Delete capsule"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Countdown or Status Header */}
              {(() => {
                const countdown = calculateCapsuleCountdown(readingCapsule.unlock_at);
                const isAuthor = readingCapsule.user_id === user.id;
                const occ =
                  TIME_CAPSULE_OCCASIONS[readingCapsule.occasion] || TIME_CAPSULE_OCCASIONS.custom;
                const seal =
                  SEAL_SYMBOLS[readingCapsule.seal_symbol] || SEAL_SYMBOLS.heart;
                const unlockFormatted = formatCapsuleUnlockDate(readingCapsule.unlock_at);

                if (!countdown.isUnlocked && !isAuthor) {
                  /* LOCKED FOR RECIPIENT - ENCHANTING SEALED CARD */
                  return (
                    <div className="tc-locked-preview-card">
                      <div className="tc-wax-seal-big pulsing-seal">
                        <span>{seal.emoji}</span>
                        <div className="tc-seal-ring" />
                      </div>
                      <div className="tc-locked-badge">
                        <Lock size={15} />
                        <span>{occ.labelMl} · {occ.labelEn}</span>
                      </div>
                      <h3 className="tc-locked-title">{readingCapsule.title}</h3>
                      <p className="tc-locked-author">
                        Sealed with eternal love by <strong>{readingCapsule.author_name}</strong>
                      </p>

                      <div className="tc-countdown-board">
                        <div className="tc-cd-box">
                          <span className="tc-cd-num">{countdown.days}</span>
                          <span className="tc-cd-lbl">Days (ദിവസം)</span>
                        </div>
                        <div className="tc-cd-sep">:</div>
                        <div className="tc-cd-box">
                          <span className="tc-cd-num">{countdown.hours}</span>
                          <span className="tc-cd-lbl">Hours (മണിക്കൂർ)</span>
                        </div>
                        <div className="tc-cd-sep">:</div>
                        <div className="tc-cd-box">
                          <span className="tc-cd-num">{countdown.minutes}</span>
                          <span className="tc-cd-lbl">Mins (മിനിറ്റ്)</span>
                        </div>
                        <div className="tc-cd-sep">:</div>
                        <div className="tc-cd-box">
                          <span className="tc-cd-num">{countdown.seconds}</span>
                          <span className="tc-cd-lbl">Secs (സെക്കൻഡ്)</span>
                        </div>
                      </div>

                      <div className="tc-unlock-date-callout">
                        <Calendar size={15} />
                        <span>
                          Unlocks on: {unlockFormatted.formattedEn} (
                          {unlockFormatted.formattedMl})
                        </span>
                      </div>

                      <p className="tc-locked-romantic-quote">
                        &ldquo;ഈ രഹസ്യ കത്ത് നിന്റെ ആ വിശേഷ നിമിഷത്തിൽ മാത്രമേ തുറക്കൂ! കാത്തിരിക്കൂ
                        പ്രിയേ... കാത്തിരിപ്പിലും പ്രണയമുണ്ട് 💕&rdquo;
                      </p>

                      <div className="tc-locked-actions">
                        <button
                          type="button"
                          className="tc-nudge-btn"
                          onClick={() => handleNudgePartner(readingCapsule)}
                          disabled={nudgeSentId === readingCapsule.id}
                        >
                          <BellRing size={16} />
                          <span>
                            {nudgeSentId === readingCapsule.id
                              ? 'Nudge Sent! ⏳ (ഓർമ്മിപ്പിച്ചു)'
                              : 'Tease / Nudge Partner ⏳ (കാത്തിരിക്കുന്നുവെന്ന് ഓർമ്മിപ്പിക്കുക)'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                }

                /* UNLOCKED OR SENDER PREVIEW: BEAUTIFUL REVEALED LETTER */
                return (
                  <div className="tc-letter-unfolded-card">
                    <div className="tc-letter-header">
                      <div className="tc-letter-meta">
                        <div className="tc-occasion-badge">
                          <span>{occ.icon}</span>
                          <strong>{occ.labelMl}</strong>
                          <span className="tc-badge-sep">·</span>
                          <span>{occ.labelEn}</span>
                        </div>
                        <span className="tc-letter-date">
                          📅 {unlockFormatted.formattedEn}
                        </span>
                      </div>
                      <div className="tc-wax-seal-small">
                        <span>{seal.emoji}</span>
                      </div>
                    </div>

                    <h2 className="tc-unfolded-title">{readingCapsule.title}</h2>
                    <div className="tc-unfolded-author-line">
                      <span>From: <strong>{readingCapsule.author_name}</strong></span>
                      <span>To: <strong>{readingCapsule.recipient_name}</strong></span>
                    </div>

                    {/* Letter Text Parchment */}
                    {readingCapsule.letter_text && (
                      <div className="tc-parchment-sheet">
                        <div className="tc-parchment-border" />
                        <div className="tc-parchment-content" dir="auto">
                          {readingCapsule.letter_text.split('\n').map((para, idx) => (
                            <p key={idx}>{para || '\u00A0'}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Voice Note Player */}
                    {readingCapsule.audio_url && (
                      <div className="tc-voice-note-player-card">
                        <div className="tc-vn-icon-wrap">
                          <Mic size={20} className="tc-mic-icon" />
                        </div>
                        <div className="tc-vn-info">
                          <div className="tc-vn-title">
                            <strong>Voice Note from the Past 🎙️</strong>
                            <span>ഭൂതകാലത്തിൽ നിന്നും നിന്നോട് സംസാരിക്കുന്ന ശബ്ദം</span>
                          </div>
                          <div className="tc-vn-progress-bar">
                            <div
                              className="tc-vn-progress-fill"
                              style={{ width: `${audioProgress}%` }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          className="tc-vn-play-btn"
                          onClick={togglePlayAudio}
                          aria-label={isPlayingAudio ? 'Pause' : 'Play voice note'}
                        >
                          {isPlayingAudio ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                        <audio
                          ref={audioRef}
                          src={readingCapsule.audio_url}
                          preload="auto"
                          style={{ display: 'none' }}
                        />
                      </div>
                    )}

                    {/* Photo Memory */}
                    {readingCapsule.photo_url && (
                      <div className="tc-photo-memory-wrap">
                        <img
                          src={readingCapsule.photo_url}
                          alt="Sealed capsule memory"
                          className="tc-photo-memory-img"
                        />
                        <span className="tc-photo-caption">
                          A sweet memory sealed for this exact moment 📸💕
                        </span>
                      </div>
                    )}

                    {/* Love Reactions Section */}
                    <div className="tc-reactions-section">
                      <h4>
                        <Heart size={16} fill="#ec4899" color="#ec4899" />
                        <span>Send Your Love &amp; Reaction (നിന്റെ സ്നേഹപ്രതികരണം 💕)</span>
                      </h4>
                      <div className="tc-reaction-buttons-row">
                        {ROMANTIC_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="tc-reaction-emoji-btn"
                            onClick={() => void handleSendReaction(emoji)}
                            disabled={savingReaction}
                          >
                            <span>{emoji}</span>
                          </button>
                        ))}
                      </div>

                      {/* Existing Reactions */}
                      {Array.isArray(readingCapsule.reactions) &&
                        readingCapsule.reactions.length > 0 && (
                          <div className="tc-existing-reactions-list">
                            {readingCapsule.reactions.map((r, i) => (
                              <div key={i} className="tc-reaction-bubble">
                                <span className="tc-reaction-emoji">{r.emoji}</span>
                                <div className="tc-reaction-body">
                                  <strong>{r.user_name}</strong>
                                  {r.note && <p>&ldquo;{r.note}&rdquo;</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Optional Reaction Note Input */}
                      <div className="tc-reaction-note-form">
                        <input
                          type="text"
                          className="tc-reaction-input"
                          placeholder="Write a sweet reply or emotional note... (മറുപടി കുറിക്കുക...)"
                          value={reactionNote}
                          onChange={(e) => setReactionNote(e.target.value)}
                          maxLength={500}
                        />
                        <button
                          type="button"
                          className="tc-reaction-send-btn"
                          disabled={!reactionNote.trim() || savingReaction}
                          onClick={() => void handleSendReaction('❤️')}
                        >
                          <Send size={15} />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : activeTab === 'create' ? (
            /* ============================================================ */
            /* TAB 3: CREATE / SEAL NEW TIME CAPSULE FORM                    */
            /* ============================================================ */
            <form className="tc-create-form" onSubmit={handleCreateCapsule}>
              <div className="tc-form-intro">
                <Sparkles size={20} className="tc-sparkle-intro" />
                <div>
                  <h3>Seal a Love Letter for the Future 🔒💌</h3>
                  <p>
                    നിന്റെ പങ്കാളിയുടെ ജന്മദിനത്തിലോ, വാർഷികത്തിലോ, അല്ലെങ്കിൽ മറ്റൊരു വിശേഷ
                    ദിനത്തിലോ മാത്രം തുറക്കാനായി ഒരു സർപ്രൈസ് ഒരുക്കൂ!
                  </p>
                </div>
              </div>

              {/* 1. Occasion Picker */}
              <div className="tc-form-group">
                <label className="tc-form-label">
                  1. Choose the Occasion (വിശേഷ ദിനം തിരഞ്ഞെടുക്കുക)
                </label>
                <div className="tc-occasion-grid">
                  {Object.entries(TIME_CAPSULE_OCCASIONS).map(([key, occ]) => {
                    const isSelected = formOccasion === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`tc-occasion-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setFormOccasion(key);
                          if (!formTitle) setFormTitle(occ.defaultTitleEn);
                        }}
                      >
                        <span className="tc-occ-icon">{occ.icon}</span>
                        <div className="tc-occ-text">
                          <strong>{occ.labelMl}</strong>
                          <small>{occ.labelEn}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Unlock Date & Time */}
              <div className="tc-form-group">
                <label className="tc-form-label" htmlFor="tc-unlock-date">
                  2. When should this Capsule unlock? (എപ്പോൾ തുറക്കണം?)
                </label>
                <div className="tc-presets-row">
                  <span className="tc-preset-lbl">Quick Presets:</span>
                  <button
                    type="button"
                    className="tc-preset-pill"
                    onClick={() => applyDatePreset('tomorrow_midnight')}
                  >
                    Tomorrow Midnight 🌙
                  </button>
                  <button
                    type="button"
                    className="tc-preset-pill"
                    onClick={() => applyDatePreset('1week')}
                  >
                    In 1 Week ⏳
                  </button>
                  <button
                    type="button"
                    className="tc-preset-pill"
                    onClick={() => applyDatePreset('1month')}
                  >
                    In 1 Month 📅
                  </button>
                  <button
                    type="button"
                    className="tc-preset-pill"
                    onClick={() => applyDatePreset('valentines')}
                  >
                    Valentine&apos;s Day 💖
                  </button>
                  <button
                    type="button"
                    className="tc-preset-pill"
                    onClick={() => applyDatePreset('new_year')}
                  >
                    New Year 🎆
                  </button>
                  <button
                    type="button"
                    className="tc-preset-pill"
                    onClick={() => applyDatePreset('1year')}
                  >
                    In 1 Year 🥂
                  </button>
                </div>
                <div className="tc-date-picker-wrap">
                  <Calendar size={18} className="tc-date-icon" />
                  <input
                    id="tc-unlock-date"
                    type="datetime-local"
                    className="tc-datetime-input"
                    value={formUnlockDate}
                    min={getMinDateTime()}
                    onChange={(e) => setFormUnlockDate(e.target.value)}
                    required
                  />
                </div>
                <small className="tc-field-hint">
                  Strictly locked until this exact moment. Partner cannot read or listen before then! 🔒
                </small>
              </div>

              {/* 3. Title */}
              <div className="tc-form-group">
                <label className="tc-form-label" htmlFor="tc-title">
                  3. Capsule Title (കത്തിന്റെ തലക്കെട്ട്)
                </label>
                <input
                  id="tc-title"
                  type="text"
                  className="tc-text-input"
                  placeholder="e.g. Happy 25th Birthday My Soulmate 🎂 / വാർഷികാശംസകൾ പൊന്നേ"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={250}
                  required
                />
              </div>

              {/* 4. Theme & Seal Customization */}
              <div className="tc-form-group-row">
                <div className="tc-form-subgroup">
                  <label className="tc-form-label">
                    4. Envelope Style (തീം)
                  </label>
                  <div className="tc-theme-swatches">
                    {Object.entries(TIME_CAPSULE_THEMES).map(([tKey, thm]) => (
                      <button
                        key={tKey}
                        type="button"
                        className={`tc-theme-swatch ${formTheme === tKey ? 'active' : ''}`}
                        onClick={() => setFormTheme(tKey)}
                        style={{ '--swatch-color': thm.accentColor }}
                        title={thm.nameEn}
                      >
                        <span className="tc-swatch-dot" style={{ backgroundColor: thm.accentColor }} />
                        <span>{thm.nameMl}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tc-form-subgroup">
                  <label className="tc-form-label">
                    5. Wax Seal Emblem (മുദ്ര)
                  </label>
                  <div className="tc-seal-symbols-row">
                    {Object.entries(SEAL_SYMBOLS).map(([sKey, sObj]) => (
                      <button
                        key={sKey}
                        type="button"
                        className={`tc-seal-opt-btn ${formSeal === sKey ? 'active' : ''}`}
                        onClick={() => setFormSeal(sKey)}
                        title={sObj.labelEn}
                      >
                        <span>{sObj.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Secret Love Letter Text */}
              <div className="tc-form-group">
                <label className="tc-form-label" htmlFor="tc-letter">
                  6. Your Secret Love Letter (രഹസ്യ പ്രണയലേഖനം)
                </label>
                <textarea
                  id="tc-letter"
                  className="tc-letter-textarea"
                  rows={5}
                  placeholder="Write your deepest feelings, secrets, future dreams, wishes, and memories to be unlocked... (നിന്റെ ഹൃദയത്തിൽ നിന്നുള്ള വാക്കുകൾ ഇവിടെ എഴുതൂ...)"
                  value={formLetter}
                  onChange={(e) => setFormLetter(e.target.value)}
                  maxLength={10000}
                />
                <div className="tc-char-counter">
                  {formLetter.length} / 10,000 characters
                </div>
              </div>

              {/* 6. Voice Note Recorder */}
              <div className="tc-form-group">
                <label className="tc-form-label">
                  7. Record a Voice Note for the Future (വോയ്സ് നോട്ട് റെക്കോർഡ് ചെയ്യാം 🎙️)
                </label>
                <div className="tc-audio-recorder-box">
                  {isRecording ? (
                    <div className="tc-recording-active">
                      <div className="tc-pulse-record-dot" />
                      <span className="tc-recording-timer">
                        Recording: {recordSeconds}s / 180s (റെക്കോർഡ് ചെയ്യുന്നു...)
                      </span>
                      <button
                        type="button"
                        className="tc-stop-record-btn"
                        onClick={stopRecording}
                      >
                        <StopCircle size={18} />
                        <span>Stop Recording (നിർത്തുക)</span>
                      </button>
                    </div>
                  ) : formAudioData ? (
                    <div className="tc-recorded-preview">
                      <div className="tc-rec-badge">
                        <CheckCircle size={16} color="#10b981" />
                        <span>Voice Note Recorded ({formAudioDuration}s) 🎙️</span>
                      </div>
                      <audio controls src={formAudioData} className="tc-audio-elem" />
                      <button
                        type="button"
                        className="tc-remove-audio-btn"
                        onClick={() => {
                          setFormAudioData('');
                          setFormAudioDuration(0);
                        }}
                      >
                        <Trash2 size={15} />
                        <span>Delete &amp; Re-record</span>
                      </button>
                    </div>
                  ) : (
                    <div className="tc-record-idle">
                      <button
                        type="button"
                        className="tc-start-record-btn"
                        onClick={() => void startRecording()}
                      >
                        <Mic size={18} />
                        <span>Record Voice Note (ശബ്ദരേഖ ചേർക്കാം)</span>
                      </button>
                      <small>Capture your voice, laughter, or song to surprise them in the future!</small>
                    </div>
                  )}
                </div>
              </div>

              {/* 7. Memory Photo Attachment */}
              <div className="tc-form-group">
                <label className="tc-form-label">
                  8. Attach a Memory Photo (ഓർമ്മ ചിത്രം ചേർക്കാം 📸)
                </label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
                {formPhotoData ? (
                  <div className="tc-photo-preview-box">
                    <img src={formPhotoData} alt="Preview" className="tc-form-photo-img" />
                    <button
                      type="button"
                      className="tc-remove-photo-btn"
                      onClick={() => setFormPhotoData('')}
                    >
                      <X size={15} />
                      <span>Remove Photo</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="tc-attach-photo-btn"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <ImageIcon size={18} />
                    <span>Choose a Photo (ഫോട്ടോ തിരഞ്ഞെടുക്കൂ)</span>
                  </button>
                )}
              </div>

              {/* Submit CTA */}
              <div className="tc-form-actions">
                <button
                  type="submit"
                  className="tc-seal-submit-btn"
                  disabled={submitting || isRecording}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle size={20} className="tc-spin" />
                      <span>Sealing with Wax... (മുദ്ര വെക്കുന്നു...)</span>
                    </>
                  ) : (
                    <>
                      <Lock size={20} />
                      <span>Seal Time Capsule with Wax 🔒💌 (മുദ്ര വെച്ച് പൂട്ടുക)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ============================================================ */
            /* TAB 1 & 2: LIST VIEW (RECEIVED OR SENT CAPSULES)              */
            /* ============================================================ */
            <div className="tc-list-view">
              {(() => {
                const list = activeTab === 'received' ? receivedList : sentList;

                if (list.length === 0) {
                  return (
                    <div className="tc-empty-state">
                      <div className="tc-empty-icon-wrap">
                        {activeTab === 'received' ? '💌' : '✍️'}
                      </div>
                      <h3>
                        {activeTab === 'received'
                          ? 'No Time Capsules for you yet'
                          : "You haven't sealed any Time Capsules yet"}
                      </h3>
                      <p>
                        {activeTab === 'received'
                          ? `When ${peer?.name || 'your partner'} seals a secret letter or voice note, it will appear here with an enchanted wax seal and countdown clock!`
                          : 'Surprise your partner with a secret love letter or voice note locked until their birthday or upcoming anniversary!'}
                      </p>
                      {activeTab === 'sent' && (
                        <button
                          type="button"
                          className="tc-empty-cta-btn"
                          onClick={() => setActiveTab('create')}
                        >
                          <Sparkles size={16} />
                          <span>Seal Your First Capsule (ആദ്യത്തെ കത്ത് സീൽ ചെയ്യാം)</span>
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="tc-cards-grid">
                    {list.map((capsule) => {
                      const countdown = calculateCapsuleCountdown(capsule.unlock_at);
                      const isAuthor = capsule.user_id === user.id;
                      const occ =
                        TIME_CAPSULE_OCCASIONS[capsule.occasion] || TIME_CAPSULE_OCCASIONS.custom;
                      const thm =
                        TIME_CAPSULE_THEMES[capsule.theme] || TIME_CAPSULE_THEMES.classic_rose;
                      const seal =
                        SEAL_SYMBOLS[capsule.seal_symbol] || SEAL_SYMBOLS.heart;
                      const unlockDateFmt = formatCapsuleUnlockDate(capsule.unlock_at);
                      const isReadyToOpen = countdown.isUnlocked;

                      return (
                        <div
                          key={capsule.id}
                          className={`tc-capsule-card ${isReadyToOpen ? 'unlocked' : 'locked'}`}
                          style={{
                            '--theme-accent': thm.accentColor,
                            '--theme-seal': thm.sealColor,
                          }}
                        >
                          <div className="tc-card-top">
                            <div className="tc-card-occasion-badge">
                              <span>{occ.icon}</span>
                              <strong>{occ.labelMl}</strong>
                            </div>
                            <div className="tc-card-seal-icon">
                              <span>{seal.emoji}</span>
                            </div>
                          </div>

                          <h3 className="tc-card-title">{capsule.title}</h3>
                          <div className="tc-card-partner-info">
                            {isAuthor ? (
                              <span>For: <strong>{capsule.recipient_name}</strong></span>
                            ) : (
                              <span>From: <strong>{capsule.author_name}</strong></span>
                            )}
                          </div>

                          {/* Countdown Bar */}
                          <div
                            className={`tc-card-countdown-strip ${isReadyToOpen ? 'ready' : ''}`}
                          >
                            <Clock size={15} />
                            <span>
                              {isReadyToOpen
                                ? 'Unlocked with Love! 💌 (തുറന്നു)'
                                : countdown.labelEn}
                            </span>
                          </div>

                          <div className="tc-card-unlock-time">
                            <Calendar size={13} />
                            <span>Unlocks: {unlockDateFmt.formattedEn}</span>
                          </div>

                          {/* Action Footer */}
                          <div className="tc-card-footer">
                            {isReadyToOpen ? (
                              <button
                                type="button"
                                className="tc-open-btn-celebrate"
                                onClick={() => void handleOpenCapsule(capsule)}
                              >
                                <Unlock size={16} />
                                <span>
                                  {capsule.status === 'opened'
                                    ? 'Read Love Letter 📖 (വായിക്കാം)'
                                    : 'Break Seal & Open 🔓✨ (മുദ്ര പൊട്ടിക്കുക!)'}
                                </span>
                              </button>
                            ) : isAuthor ? (
                              <div className="tc-author-card-actions">
                                <button
                                  type="button"
                                  className="tc-preview-btn"
                                  onClick={() => setReadingCapsule(capsule)}
                                >
                                  <Eye size={15} />
                                  <span>Preview (കാണുക)</span>
                                </button>
                                <button
                                  type="button"
                                  className="tc-share-icon-btn"
                                  onClick={() => handleShareToChat(capsule)}
                                  title="Share to chat"
                                >
                                  <Share2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="tc-delete-icon-btn"
                                  onClick={() => handleDeleteCapsule(capsule.id)}
                                  title="Delete capsule"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            ) : (
                              <div className="tc-recipient-locked-actions">
                                <button
                                  type="button"
                                  className="tc-peek-btn"
                                  onClick={() => setReadingCapsule(capsule)}
                                >
                                  <Lock size={15} />
                                  <span>View Sealed Capsule (വിവരം)</span>
                                </button>
                                <button
                                  type="button"
                                  className="tc-nudge-mini-btn"
                                  onClick={() => handleNudgePartner(capsule)}
                                  title="Tease Partner"
                                >
                                  <BellRing size={15} />
                                  <span>{nudgeSentId === capsule.id ? 'Sent!' : 'Nudge ⏳'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
