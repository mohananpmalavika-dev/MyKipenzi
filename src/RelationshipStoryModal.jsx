import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Heart,
  Calendar,
  Sparkles,
  Clock,
  Plus,
  Trash2,
  Share2,
  X,
  Edit3,
  Image as ImageIcon,
  Check,
  ChevronRight,
  PartyPopper,
  Flame,
  Award,
  Send,
  Bell,
  Camera,
  Coffee,
  Plane,
  Smile,
  RefreshCw,
} from 'lucide-react';
import { ButtonIcon, Avatar } from './components.jsx';
import { api } from './api.js';
import {
  STORY_CATEGORIES,
  calculateDaysTogether,
  calculateMilestoneCountdown,
  formatDateKey,
  formatStoryMemoryShare,
  formatStoryMilestoneShare,
} from '../shared/relationshipStory.js';
import { playSyncChime, triggerHeartbeatHaptics } from './heartbeatAudio.js';

const QUICK_REACTIONS = ['❤️', '🥰', '🥺', '💖', '✨', '💍'];

export function RelationshipStoryModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onSendToChat,
  onError,
}) {
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'milestones' | 'settings'
  const [storyData, setStoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [_timerTick, setTimerTick] = useState(0);

  // New Memory Modal state
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryDate, setMemoryDate] = useState(() => formatDateKey());
  const [memoryCategory, setMemoryCategory] = useState('sweet_moment');
  const [memoryDesc, setMemoryDesc] = useState('');
  const [memoryEmoji, setMemoryEmoji] = useState('💖');
  const [memoryPhotoUrl, setMemoryPhotoUrl] = useState('');
  const [memoryPhotoData, setMemoryPhotoData] = useState('');
  const [savingMemory, setSavingMemory] = useState(false);

  // New Milestone Modal state
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState(() => formatDateKey());
  const [milestoneCategory, setMilestoneCategory] = useState('anniversary');
  const [milestoneIsAnnual, setMilestoneIsAnnual] = useState(true);
  const [milestoneEmoji, setMilestoneEmoji] = useState('🥂');
  const [milestoneNote, setMilestoneNote] = useState('');
  const [savingMilestone, setSavingMilestone] = useState(false);

  // Date Settings state
  const [startDateDraft, setStartDateDraft] = useState('');
  const [anniversaryDraft, setAnniversaryDraft] = useState('');
  const [firstDateDraft, setFirstDateDraft] = useState('');
  const [storyTitleDraft, setStoryTitleDraft] = useState('Our Story');
  const [savingDates, setSavingDates] = useState(false);
  const [datesSavedNotice, setDatesSavedNotice] = useState(false);

  // Lightbox view for photo
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // Partner love nudge state
  const [nudgeSent, setNudgeSent] = useState(false);
  const [receivedNudge, setReceivedNudge] = useState(null);

  const fileInputRef = useRef(null);

  // Load complete story data
  const loadStory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await api(`/conversations/${conversationId}/relationship-story`);
      setStoryData(data);
      if (data.profile) {
        setStartDateDraft(data.profile.start_date || '');
        setAnniversaryDraft(data.profile.anniversary_date || '');
        setFirstDateDraft(data.profile.first_date || '');
        setStoryTitleDraft(data.profile.story_title || 'Our Story');
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [conversationId, onError]);

  // Initial load
  useEffect(() => {
    void loadStory();
  }, [loadStory]);

  // 1-second live countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Socket real-time updates and love nudges
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (payload) => {
      if (payload.conversation_id === conversationId) {
        void loadStory(true);
        triggerHeartbeatHaptics([40, 60]);
      }
    };

    const handleNudge = (payload) => {
      if (payload.conversation_id === conversationId) {
        setReceivedNudge(payload.sender_name || 'Your partner');
        playSyncChime();
        triggerHeartbeatHaptics([80, 80, 100, 120]);
        setTimeout(() => setReceivedNudge(null), 6000);
      }
    };

    socket.on('story:update', handleUpdate);
    socket.on('story:nudge', handleNudge);

    return () => {
      socket.off('story:update', handleUpdate);
      socket.off('story:nudge', handleNudge);
    };
  }, [socket, conversationId, loadStory]);

  // Save Dates & Settings
  const handleSaveDates = async (e) => {
    e?.preventDefault();
    if (!startDateDraft || savingDates) return;
    setSavingDates(true);
    try {
      await api(`/conversations/${conversationId}/relationship-story/profile`, {
        method: 'PUT',
        body: {
          start_date: startDateDraft,
          anniversary_date: anniversaryDraft || null,
          first_date: firstDateDraft || null,
          story_title: storyTitleDraft || 'Our Story',
        },
      });
      triggerHeartbeatHaptics([50, 70]);
      setDatesSavedNotice(true);
      setTimeout(() => setDatesSavedNotice(false), 3000);
      await loadStory(true);
      setActiveTab('timeline');
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSavingDates(false);
    }
  };

  // Add Memory
  const handleCreateMemory = async (e) => {
    e?.preventDefault();
    if (!memoryTitle.trim() || !memoryDate || savingMemory) return;

    setSavingMemory(true);
    try {
      await api(`/conversations/${conversationId}/relationship-story/memories`, {
        method: 'POST',
        body: {
          title: memoryTitle.trim(),
          memory_date: memoryDate,
          category: memoryCategory,
          description: memoryDesc.trim(),
          emoji: memoryEmoji,
          photo_url: memoryPhotoData || memoryPhotoUrl || null,
        },
      });

      triggerHeartbeatHaptics([60, 90]);
      setShowAddMemory(false);
      setMemoryTitle('');
      setMemoryDesc('');
      setMemoryPhotoData('');
      setMemoryPhotoUrl('');
      await loadStory(true);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSavingMemory(false);
    }
  };

  // Delete Memory
  const handleDeleteMemory = async (memId) => {
    if (!confirm('Are you sure you want to delete this memory? / ഈ ഓർമ്മ ഒഴിവാക്കണോ?')) return;
    try {
      await api(`/conversations/${conversationId}/relationship-story/memories/${memId}`, {
        method: 'DELETE',
      });
      triggerHeartbeatHaptics([30]);
      await loadStory(true);
    } catch (err) {
      onError?.(err.message);
    }
  };

  // React to Memory
  const handleReactMemory = async (memId, emoji) => {
    try {
      triggerHeartbeatHaptics([30, 40]);
      await api(`/conversations/${conversationId}/relationship-story/memories/${memId}/react`, {
        method: 'POST',
        body: { emoji },
      });
      await loadStory(true);
    } catch (err) {
      onError?.(err.message);
    }
  };

  // Add Milestone
  const handleCreateMilestone = async (e) => {
    e?.preventDefault();
    if (!milestoneTitle.trim() || !milestoneDate || savingMilestone) return;

    setSavingMilestone(true);
    try {
      await api(`/conversations/${conversationId}/relationship-story/milestones`, {
        method: 'POST',
        body: {
          title: milestoneTitle.trim(),
          target_date: milestoneDate,
          category: milestoneCategory,
          is_annual: milestoneIsAnnual,
          emoji: milestoneEmoji,
          note: milestoneNote.trim(),
        },
      });

      triggerHeartbeatHaptics([60, 90]);
      setShowAddMilestone(false);
      setMilestoneTitle('');
      setMilestoneNote('');
      await loadStory(true);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSavingMilestone(false);
    }
  };

  // Delete Milestone
  const handleDeleteMilestone = async (msId) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    try {
      await api(`/conversations/${conversationId}/relationship-story/milestones/${msId}`, {
        method: 'DELETE',
      });
      triggerHeartbeatHaptics([30]);
      await loadStory(true);
    } catch (err) {
      onError?.(err.message);
    }
  };

  // Share Memory to Chat
  const handleShareMemory = (memory) => {
    if (!onSendToChat) return;
    const shareText = formatStoryMemoryShare(memory);
    onSendToChat(shareText);
    triggerHeartbeatHaptics([50, 70]);
    onClose();
  };

  // Share Milestone to Chat
  const handleShareMilestone = (ms) => {
    if (!onSendToChat) return;
    const countdown = ms.countdown || calculateMilestoneCountdown(ms.target_date, ms.is_annual);
    const shareText = formatStoryMilestoneShare({
      title: ms.title,
      daysTogether: daysTogether?.totalDays || 0,
      daysRemaining: countdown?.days || 0,
      targetDate: countdown?.targetDateFormatted || ms.target_date,
      category: ms.category,
      emoji: ms.emoji,
      note: ms.note,
    });
    onSendToChat(shareText);
    triggerHeartbeatHaptics([50, 70]);
    onClose();
  };

  // Send Love Nudge
  const handleSendNudge = () => {
    if (!socket || nudgeSent) return;
    setNudgeSent(true);
    socket.emit('story:nudge', {
      conversation_id: conversationId,
      title: storyData?.profile?.story_title || 'Our Story',
    });
    triggerHeartbeatHaptics([50, 80]);
    setTimeout(() => setNudgeSent(false), 5000);
  };

  // Photo file upload helper
  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      onError?.('Photo must be smaller than 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setMemoryPhotoData(event.target?.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Compute live days together & live countdowns
  const daysTogether = storyData?.profile?.start_date
    ? calculateDaysTogether(storyData.profile.start_date)
    : storyData?.daysTogether || null;

  const memories = storyData?.memories || [];
  const milestones = (storyData?.milestones || []).map((ms) => {
    const countdown = calculateMilestoneCountdown(ms.target_date, ms.is_annual);
    return { ...ms, countdown };
  }).sort((a, b) => {
    const aSec = a.countdown?.totalSecondsRemaining ?? 999999999;
    const bSec = b.countdown?.totalSecondsRemaining ?? 999999999;
    return aSec - bSec;
  });

  return (
    <div className="story-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="story-modal-title">
      <div className="story-modal-container">
        {/* Modal Top Header */}
        <header className="story-modal-header">
          <div className="story-header-left">
            <div className="story-header-couple">
              <Avatar person={user} size="compact" />
              <div className="story-interlock-heart">
                <Heart size={16} fill="#ef4444" color="#ef4444" className="heartbeat-action-pulse" />
              </div>
              {peer && <Avatar person={peer} size="compact" />}
            </div>
            <div>
              <h2 id="story-modal-title" className="story-modal-title">
                {storyData?.profile?.story_title || 'Our Story'} 💕
              </h2>
              <p className="story-modal-subtitle">
                {peer ? `With ${peer.name}` : 'Our Sacred Journey'} · നമ്മുടെ കഥ & നാഴികക്കല്ലുകൾ
              </p>
            </div>
          </div>

          <div className="story-header-actions">
            <button
              type="button"
              className={`story-nudge-btn ${nudgeSent ? 'sent' : ''}`}
              onClick={handleSendNudge}
              disabled={nudgeSent}
              title="Send a cute love reminder to your partner"
            >
              <Bell size={14} />
              <span>{nudgeSent ? 'Nudged! 💕' : 'Love Nudge (ഓർമ്മിപ്പിക്കൂ)'}</span>
            </button>
            <ButtonIcon label="Refresh" onClick={() => void loadStory(true)} disabled={refreshing}>
              <RefreshCw size={17} className={refreshing ? 'spin' : ''} />
            </ButtonIcon>
            <ButtonIcon label="Close" onClick={onClose}>
              <X size={20} />
            </ButtonIcon>
          </div>
        </header>

        {/* Love Nudge Notification Banner */}
        {receivedNudge && (
          <div className="story-nudge-alert" role="alert">
            <Sparkles size={16} />
            <span>
              <strong>{receivedNudge}</strong> sent you a sweet reminder to cherish your memories together! 🥰 (നമ്മുടെ ഓർമ്മകൾ കാണാൻ ഓർമ്മിപ്പിച്ചു!)
            </span>
          </div>
        )}

        {/* HERO: Days Together Counter & Love Milestone Card */}
        <div className="story-hero-card">
          <div className="story-hero-content">
            <div className="story-counter-badge">
              <Heart size={14} fill="currentColor" />
              <span>നമ്മൾ ഒന്നിച്ചുള്ള യാത്ര · DAYS TOGETHER</span>
            </div>

            <div className="story-days-counter">
              <span className="story-days-number">
                {daysTogether ? daysTogether.totalDays : '—'}
              </span>
              <span className="story-days-label">
                {daysTogether?.totalDays === 1 ? 'Day' : 'Days'} Together
              </span>
            </div>

            <p className="story-duration-breakdown">
              ✨ <strong>{daysTogether?.headlineTextMl || 'ഒരുമിച്ചുള്ള ദിവസങ്ങൾ'}</strong>
              {daysTogether?.formattedDurationEn && ` (${daysTogether.formattedDurationEn})`}
            </p>

            {/* Next Big Milestone Progress */}
            {daysTogether?.nextMilestone && (
              <div className="story-milestone-progress-card">
                <div className="story-progress-header">
                  <span>
                    <Award size={14} /> <strong>{daysTogether.nextMilestone.labelMl}</strong> ({daysTogether.nextMilestone.labelEn})
                  </span>
                  <span className="story-days-left-chip">
                    {daysTogether.nextMilestone.daysRemaining} days left!
                  </span>
                </div>
                <div className="story-progress-bar-track">
                  <div
                    className="story-progress-bar-fill"
                    style={{ width: `${Math.max(4, daysTogether.nextMilestone.progressPercentage)}%` }}
                  />
                </div>
                <div className="story-progress-sub">
                  <small>{daysTogether.nextMilestone.progressPercentage}% completed towards the next milestone</small>
                </div>
              </div>
            )}
          </div>

          <div className="story-hero-actions">
            <button
              type="button"
              className="story-quick-date-btn"
              onClick={() => setActiveTab('settings')}
              title="Change relationship start date or anniversary"
            >
              <Calendar size={14} />
              <span>
                {storyData?.profile?.start_date
                  ? `Since ${storyData.profile.start_date}`
                  : 'Set Start Date (തീയതി നിശ്ചയിക്കൂ)'}
              </span>
              <Edit3 size={13} />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <nav className="story-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'timeline'}
            className={`story-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <Sparkles size={16} />
            <span>Our Journey (ഓർമ്മകൾ)</span>
            <span className="story-tab-badge">{memories.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'milestones'}
            className={`story-tab-btn ${activeTab === 'milestones' ? 'active' : ''}`}
            onClick={() => setActiveTab('milestones')}
          >
            <Clock size={16} />
            <span>Special Dates & Countdown (വിശേഷ ദിവസങ്ങൾ)</span>
            <span className="story-tab-badge">{milestones.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'settings'}
            className={`story-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Calendar size={16} />
            <span>Key Dates & Settings (ക്രമീകരണങ്ങൾ)</span>
          </button>
        </nav>

        {/* TAB 1: MEMORIES TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="story-tab-panel" role="tabpanel">
            <div className="story-panel-header">
              <div>
                <h3 className="story-panel-title">Our Milestone Timeline 📖</h3>
                <p className="story-panel-desc">
                  Every first, every secret laughter, every memory frozen in time. (നമ്മുടെ ഓരോ ഓർമ്മകളും തീയതി പ്രകാരം)
                </p>
              </div>
              <button
                type="button"
                className="story-add-btn primary"
                onClick={() => setShowAddMemory(true)}
              >
                <Plus size={16} />
                <span>Add Special Moment (ഓർമ്മ ചേർക്കുക)</span>
              </button>
            </div>

            {loading ? (
              <div className="story-loading-box">
                <Sparkles size={28} className="spin" />
                <p>Retrieving our sweetest moments...</p>
              </div>
            ) : memories.length === 0 ? (
              <div className="story-empty-box">
                <Heart size={42} strokeWidth={1.2} />
                <h4>No memories added yet!</h4>
                <p>Click &ldquo;Add Special Moment&rdquo; to begin weaving our story together.</p>
                <button
                  type="button"
                  className="primary compact"
                  onClick={() => setShowAddMemory(true)}
                >
                  <Plus size={16} /> Add First Memory
                </button>
              </div>
            ) : (
              <div className="story-timeline-track">
                {memories.map((mem, idx) => {
                  const cat = STORY_CATEGORIES[mem.category] || STORY_CATEGORIES.sweet_moment;
                  const reactions = Array.isArray(mem.reactions) ? mem.reactions : [];

                  return (
                    <article key={mem.id || idx} className="story-timeline-node">
                      <div className="story-node-bullet" style={{ borderColor: cat.color }}>
                        <span className="story-bullet-emoji">{mem.emoji || cat.icon}</span>
                      </div>

                      <div className="story-timeline-card">
                        <div className="story-card-top">
                          <div className="story-card-meta">
                            <span className="story-date-chip">
                              <Calendar size={12} /> {mem.memory_date}
                            </span>
                            <span
                              className="story-cat-badge"
                              style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                            >
                              {cat.labelMl} · {cat.badge}
                            </span>
                          </div>

                          <div className="story-card-actions">
                            <button
                              type="button"
                              className="story-card-action-btn"
                              title="Share this memory card to chat (ചാറ്റിൽ പങ്കിടുക)"
                              onClick={() => handleShareMemory(mem)}
                            >
                              <Share2 size={14} />
                              <span>Share</span>
                            </button>
                            <button
                              type="button"
                              className="story-card-action-btn delete"
                              title="Delete memory"
                              onClick={() => handleDeleteMemory(mem.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <h4 className="story-card-title">{mem.title}</h4>

                        {mem.description && (
                          <p className="story-card-desc" dir="auto">
                            {mem.description}
                          </p>
                        )}

                        {/* Photo Memory thumbnail */}
                        {mem.photo_url && (
                          <div
                            className="story-card-photo-box"
                            onClick={() => setActivePhotoModal(mem.photo_url)}
                          >
                            <img src={mem.photo_url} alt={mem.title} className="story-card-photo" />
                            <span className="story-photo-zoom-hint">Tap to enlarge 🔍</span>
                          </div>
                        )}

                        {/* Reaction Bar */}
                        <div className="story-card-reactions-bar">
                          <div className="story-reaction-chips">
                            {reactions.map((r, rIdx) => (
                              <button
                                key={rIdx}
                                type="button"
                                className="story-active-reaction-chip"
                                onClick={() => handleReactMemory(mem.id, r)}
                                title="Click to remove or toggle"
                              >
                                <span>{r}</span>
                              </button>
                            ))}
                          </div>

                          <div className="story-quick-reaction-picker">
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="story-picker-emoji-btn"
                                onClick={() => handleReactMemory(mem.id, emoji)}
                                title={`React ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MILESTONE COUNTDOWNS */}
        {activeTab === 'milestones' && (
          <div className="story-tab-panel" role="tabpanel">
            <div className="story-panel-header">
              <div>
                <h3 className="story-panel-title">Upcoming Milestones & Countdowns ⏳</h3>
                <p className="story-panel-desc">
                  Countdown to our Anniversaries, First Date celebration, and special moments. (വിശേഷ ദിവസങ്ങളുടെ കൗണ്ട്ഡൗൺ)
                </p>
              </div>
              <button
                type="button"
                className="story-add-btn primary"
                onClick={() => setShowAddMilestone(true)}
              >
                <Plus size={16} />
                <span>Add Milestone (വിശേഷ ദിവസം ചേർക്കുക)</span>
              </button>
            </div>

            <div className="story-milestones-grid">
              {milestones.length === 0 ? (
                <div className="story-empty-box full-grid">
                  <Clock size={40} strokeWidth={1.2} />
                  <h4>No upcoming milestones yet!</h4>
                  <p>Set your Anniversary or add special milestones to see live countdowns.</p>
                  <button
                    type="button"
                    className="primary compact"
                    onClick={() => setShowAddMilestone(true)}
                  >
                    <Plus size={16} /> Add First Milestone
                  </button>
                </div>
              ) : (
                milestones.map((ms, idx) => {
                  const countdown = ms.countdown || calculateMilestoneCountdown(ms.target_date, ms.is_annual);
                  const isToday = countdown?.isToday;
                  const days = countdown?.days ?? 0;
                  const hours = countdown?.hours ?? 0;
                  const minutes = countdown?.minutes ?? 0;
                  const seconds = countdown?.seconds ?? 0;

                  return (
                    <div
                      key={ms.id || idx}
                      className={`story-milestone-card ${isToday ? 'milestone-today-glow' : ''}`}
                    >
                      <div className="story-milestone-top">
                        <div className="story-milestone-icon-badge">
                          <span>{ms.emoji || '💖'}</span>
                        </div>
                        <div className="story-milestone-heading">
                          <h4 className="story-milestone-name">{ms.title}</h4>
                          <span className="story-milestone-target-date">
                            {countdown?.targetDateFormatted || ms.target_date}
                            {ms.is_annual ? ' · Annual 🔁' : ''}
                          </span>
                        </div>

                        {ms.id !== 'profile_anniversary' && ms.id !== 'profile_first_date' && (
                          <button
                            type="button"
                            className="story-card-action-btn delete"
                            title="Delete milestone"
                            onClick={() => handleDeleteMilestone(ms.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Celebration banner if today is the day! */}
                      {isToday ? (
                        <div className="story-celebration-banner">
                          <PartyPopper size={24} className="bounce-anim" />
                          <div>
                            <strong>Happy Celebration! 🎉</strong>
                            <p>Today is the day! ഹൃദയം നിറഞ്ഞ ആശംസകൾ!</p>
                          </div>
                        </div>
                      ) : (
                        <div className="story-countdown-timer-row">
                          <div className="countdown-box">
                            <span className="countdown-num">{days}</span>
                            <span className="countdown-lbl">Days (ദിവസം)</span>
                          </div>
                          <div className="countdown-colon">:</div>
                          <div className="countdown-box">
                            <span className="countdown-num">{String(hours).padStart(2, '0')}</span>
                            <span className="countdown-lbl">Hours</span>
                          </div>
                          <div className="countdown-colon">:</div>
                          <div className="countdown-box">
                            <span className="countdown-num">{String(minutes).padStart(2, '0')}</span>
                            <span className="countdown-lbl">Mins</span>
                          </div>
                          <div className="countdown-colon">:</div>
                          <div className="countdown-box">
                            <span className="countdown-num">{String(seconds).padStart(2, '0')}</span>
                            <span className="countdown-lbl">Secs</span>
                          </div>
                        </div>
                      )}

                      <div className="story-milestone-footer">
                        <span className="story-countdown-human">
                          ✨ {countdown?.humanTextMl || `${days} days left`}
                        </span>
                        <button
                          type="button"
                          className="story-share-milestone-btn"
                          onClick={() => handleShareMilestone(ms)}
                          title="Share countdown to chat (ചാറ്റിൽ പങ്കിടുക)"
                        >
                          <Send size={13} />
                          <span>Share to Chat</span>
                        </button>
                      </div>

                      {ms.note && <p className="story-milestone-note">&ldquo;{ms.note}&rdquo;</p>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: KEY DATES & SETTINGS */}
        {activeTab === 'settings' && (
          <div className="story-tab-panel" role="tabpanel">
            <div className="story-panel-header">
              <div>
                <h3 className="story-panel-title">Relationship Dates & Settings ⚙️</h3>
                <p className="story-panel-desc">
                  Set the dates that mark the beginning of your forever. (വിശേഷ തീയതികൾ ഇവിടെ മാറ്റാം)
                </p>
              </div>
            </div>

            <form className="story-settings-form" onSubmit={handleSaveDates}>
              <div className="story-form-group">
                <label>
                  <strong>💖 Relationship Start Date (ഒരുമിച്ച് തുടങ്ങിയ തീയതി)</strong>
                  <small>Used to calculate &ldquo;Together for X days&rdquo; counter</small>
                </label>
                <input
                  type="date"
                  required
                  value={startDateDraft}
                  onChange={(e) => setStartDateDraft(e.target.value)}
                  className="story-input-field"
                />
              </div>

              <div className="story-form-group">
                <label>
                  <strong>🥂 Wedding / Love Anniversary (വിവാഹവാർഷികം / ആനിവേഴ്സറി)</strong>
                  <small>Celebrates every year with automatic countdown</small>
                </label>
                <input
                  type="date"
                  value={anniversaryDraft}
                  onChange={(e) => setAnniversaryDraft(e.target.value)}
                  className="story-input-field"
                />
              </div>

              <div className="story-form-group">
                <label>
                  <strong>☕ First Date Date (ആദ്യ കൂടിക്കാഴ്ച നടന്ന തീയതി)</strong>
                  <small>The day you first met in person</small>
                </label>
                <input
                  type="date"
                  value={firstDateDraft}
                  onChange={(e) => setFirstDateDraft(e.target.value)}
                  className="story-input-field"
                />
              </div>

              <div className="story-form-group">
                <label>
                  <strong>📖 Couple Story Title (കഥയുടെ പേര്)</strong>
                  <small>e.g. &ldquo;Achu &amp; Malu&rdquo; or &ldquo;Our Infinite Story 💕&rdquo;</small>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={storyTitleDraft}
                  onChange={(e) => setStoryTitleDraft(e.target.value)}
                  placeholder="Our Story"
                  className="story-input-field"
                />
              </div>

              {datesSavedNotice && (
                <div className="story-success-notice">
                  <Check size={16} />
                  <span>Dates saved successfully! Days counter updated! ✨</span>
                </div>
              )}

              <div className="story-form-actions">
                <button type="submit" className="primary" disabled={savingDates}>
                  {savingDates ? 'Saving Dates...' : 'Save Relationship Dates (സൂക്ഷിക്കുക)'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: ADD SPECIAL MEMORY */}
        {showAddMemory && (
          <div className="story-submodal-overlay">
            <div className="story-submodal-card">
              <div className="story-submodal-header">
                <h3>Add a Sweet Moment (ഓർമ്മ ചേർക്കുക) ✨</h3>
                <ButtonIcon label="Close" onClick={() => setShowAddMemory(false)}>
                  <X size={18} />
                </ButtonIcon>
              </div>

              <form onSubmit={handleCreateMemory} className="story-modal-form">
                <label>
                  <span>Title (ഓർമ്മയുടെ പേര്)*</span>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    placeholder="e.g. First Coffee Date, That Rainy Night..."
                    value={memoryTitle}
                    onChange={(e) => setMemoryTitle(e.target.value)}
                  />
                </label>

                <div className="story-two-cols">
                  <label>
                    <span>Date (തീയതി)*</span>
                    <input
                      type="date"
                      required
                      value={memoryDate}
                      onChange={(e) => setMemoryDate(e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Category (ഇനം)*</span>
                    <select
                      value={memoryCategory}
                      onChange={(e) => setMemoryCategory(e.target.value)}
                    >
                      {Object.values(STORY_CATEGORIES).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.labelMl} ({c.labelEn})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="story-two-cols">
                  <label>
                    <span>Emoji Icon</span>
                    <input
                      type="text"
                      maxLength={4}
                      value={memoryEmoji}
                      onChange={(e) => setMemoryEmoji(e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Photo Upload (ചിത്രം)</span>
                    <button
                      type="button"
                      className="story-photo-pick-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={14} />
                      <span>{memoryPhotoData ? 'Photo Selected ✓' : 'Pick Photo (ചിത്രം തിരഞ്ഞെടുക്കൂ)'}</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFilePicked}
                    />
                  </label>
                </div>

                {memoryPhotoData && (
                  <div className="story-preview-thumbnail-wrap">
                    <img src={memoryPhotoData} alt="Preview" className="story-preview-thumb" />
                    <button
                      type="button"
                      className="story-thumb-remove-btn"
                      onClick={() => setMemoryPhotoData('')}
                    >
                      <X size={12} /> Remove
                    </button>
                  </div>
                )}

                <label>
                  <span>Our Story / Caption (വിശേഷങ്ങൾ)</span>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    placeholder="What made this moment magical? Write from the heart..."
                    value={memoryDesc}
                    onChange={(e) => setMemoryDesc(e.target.value)}
                  />
                </label>

                <div className="story-submodal-actions">
                  <button type="button" className="secondary" onClick={() => setShowAddMemory(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={savingMemory || !memoryTitle.trim()}>
                    {savingMemory ? 'Saving...' : 'Add to Our Story (ഓർമ്മ ചേർക്കൂ 💖)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD MILESTONE COUNTDOWN */}
        {showAddMilestone && (
          <div className="story-submodal-overlay">
            <div className="story-submodal-card">
              <div className="story-submodal-header">
                <h3>Add Milestone Countdown (വിശേഷ ദിവസം) ⏳</h3>
                <ButtonIcon label="Close" onClick={() => setShowAddMilestone(false)}>
                  <X size={18} />
                </ButtonIcon>
              </div>

              <form onSubmit={handleCreateMilestone} className="story-modal-form">
                <label>
                  <span>Milestone Title (വിശേഷ ദിവസത്തിന്റെ പേര്)*</span>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    placeholder="e.g. 2nd Anniversary, Wayanad Trip, Birthday..."
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                  />
                </label>

                <div className="story-two-cols">
                  <label>
                    <span>Target Date (തീയതി)*</span>
                    <input
                      type="date"
                      required
                      value={milestoneDate}
                      onChange={(e) => setMilestoneDate(e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Category (ഇനം)</span>
                    <select
                      value={milestoneCategory}
                      onChange={(e) => setMilestoneCategory(e.target.value)}
                    >
                      <option value="anniversary">വിവാഹവാർഷികം (Anniversary)</option>
                      <option value="first_date">ആദ്യ കൂടിക്കാഴ്ച (First Date)</option>
                      <option value="trip">യാത്ര (Trip / Vacation)</option>
                      <option value="birthday">ജന്മദിനം (Birthday)</option>
                      <option value="milestone">മറ്റ് നാഴികക്കല്ലുകൾ (Custom)</option>
                    </select>
                  </label>
                </div>

                <label>
                  <span>Emoji Icon</span>
                  <input
                    type="text"
                    maxLength={4}
                    value={milestoneEmoji}
                    onChange={(e) => setMilestoneEmoji(e.target.value)}
                  />
                </label>

                <label className="story-checkbox-label">
                  <input
                    type="checkbox"
                    checked={milestoneIsAnnual}
                    onChange={(e) => setMilestoneIsAnnual(e.target.checked)}
                  />
                  <span>Repeat Annually (വർഷം തോറും ആവർത്തിക്കുക - e.g. Anniversary)</span>
                </label>

                <label>
                  <span>Sweet Note (കുറിപ്പ്)</span>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="e.g. Can't wait to hold your hands again!"
                    value={milestoneNote}
                    onChange={(e) => setMilestoneNote(e.target.value)}
                  />
                </label>

                <div className="story-submodal-actions">
                  <button type="button" className="secondary" onClick={() => setShowAddMilestone(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={savingMilestone || !milestoneTitle.trim()}>
                    {savingMilestone ? 'Adding...' : 'Start Countdown ⏳'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LIGHTBOX PHOTO MODAL */}
        {activePhotoModal && (
          <div className="story-lightbox-overlay" onClick={() => setActivePhotoModal(null)}>
            <div className="story-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <img src={activePhotoModal} alt="Enlarged Memory" className="story-lightbox-img" />
              <button
                type="button"
                className="story-lightbox-close"
                onClick={() => setActivePhotoModal(null)}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
