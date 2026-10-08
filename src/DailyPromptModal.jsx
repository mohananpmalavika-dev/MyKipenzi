import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Heart,
  Lock,
  Unlock,
  Send,
  Share2,
  Bell,
  History,
  Calendar,
  X,
  MessageCircle,
  Check,
  RefreshCw,
  Flame,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { ButtonIcon, Avatar } from './components.jsx';
import { api } from './api.js';
import {
  PROMPT_CATEGORIES,
  getTodayDateKey,
  formatPromptDateLabel,
} from '../shared/dailyPrompts.js';
import { playSyncChime, triggerHeartbeatHaptics } from './heartbeatAudio.js';

const QUICK_REACTIONS = ['❤️', '🥰', '🥺', '😂', '🫂', '💖'];

export function DailyPromptModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onSendToChat,
  onError,
}) {
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'history'
  const [currentDate, setCurrentDate] = useState(() => getTodayDateKey());
  const [promptData, setPromptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answerDraft, setAnswerDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const textareaRef = useRef(null);

  // Load prompt data for a specific date
  const loadPrompt = useCallback(
    async (dateStr = currentDate) => {
      setLoading(true);
      try {
        const data = await api(
          `/conversations/${conversationId}/daily-prompt?date=${encodeURIComponent(dateStr)}`,
        );
        setPromptData(data);
        if (data.my_answer) {
          setAnswerDraft(data.my_answer);
          setIsEditing(false);
        } else {
          setAnswerDraft('');
          setIsEditing(true);
        }
      } catch (err) {
        onError?.(err.message);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, currentDate, onError],
  );

  // Load scrapbook memory history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api(`/conversations/${conversationId}/daily-prompt/history`);
      setHistoryList(res.history || []);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, [conversationId, onError]);

  // Initial load
  useEffect(() => {
    void loadPrompt(currentDate);
  }, [loadPrompt, currentDate]);

  // Load history when tab changes
  useEffect(() => {
    if (activeTab === 'history') {
      void loadHistory();
    }
  }, [activeTab, loadHistory]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleAnswered = (payload) => {
      if (payload.conversation_id === conversationId && payload.date === currentDate) {
        setPromptData((prev) => (prev ? { ...prev, partner_answered: true } : prev));
        triggerHeartbeatHaptics([40, 50, 60]);
      }
    };

    const handleRevealed = (payload) => {
      if (payload.conversation_id === conversationId && payload.date === currentDate) {
        void loadPrompt(currentDate).then(() => {
          setJustRevealed(true);
          playSyncChime();
          triggerHeartbeatHaptics([80, 80, 100, 150]);
          setTimeout(() => setJustRevealed(false), 4000);
        });
      }
    };

    const handleReaction = (payload) => {
      if (payload.conversation_id === conversationId && payload.date === currentDate) {
        setPromptData((prev) =>
          prev
            ? {
                ...prev,
                partner_reaction: payload.reaction,
              }
            : prev,
        );
        triggerHeartbeatHaptics([50, 50]);
      }
    };

    const handleNudge = (payload) => {
      if (payload.conversation_id === conversationId) {
        triggerHeartbeatHaptics([70, 70, 90]);
      }
    };

    socket.on('daily_prompt:answered', handleAnswered);
    socket.on('daily_prompt:revealed', handleRevealed);
    socket.on('daily_prompt:reaction', handleReaction);
    socket.on('daily_prompt:nudge', handleNudge);

    return () => {
      socket.off('daily_prompt:answered', handleAnswered);
      socket.off('daily_prompt:revealed', handleRevealed);
      socket.off('daily_prompt:reaction', handleReaction);
      socket.off('daily_prompt:nudge', handleNudge);
    };
  }, [socket, conversationId, currentDate, loadPrompt]);

  // Submit Answer
  const handleSubmitAnswer = async (e) => {
    e?.preventDefault();
    const clean = answerDraft.trim();
    if (!clean || submitting) return;

    setSubmitting(true);
    try {
      const res = await api(`/conversations/${conversationId}/daily-prompt/answer`, {
        method: 'POST',
        body: {
          date: currentDate,
          prompt_id: promptData?.prompt_id || '',
          answer: clean,
        },
      });

      setPromptData((prev) =>
        prev
          ? {
              ...prev,
              my_answer: res.my_answer,
              my_answered_at: res.my_answered_at,
              revealed: res.revealed,
              partner_answered: res.partner_answered,
              partner_answer: res.partner_answer,
              partner_answered_at: res.partner_answered_at,
            }
          : prev,
      );

      setIsEditing(false);
      triggerHeartbeatHaptics([60, 80]);

      if (res.revealed) {
        setJustRevealed(true);
        playSyncChime();
        triggerHeartbeatHaptics([80, 80, 100, 160]);
        setTimeout(() => setJustRevealed(false), 4500);
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Send Nudge
  const handleNudgePartner = async () => {
    if (nudging || nudgeSent) return;
    setNudging(true);
    try {
      await api(`/conversations/${conversationId}/daily-prompt/nudge`, {
        method: 'POST',
        body: { date: currentDate },
      });
      socket?.emit('daily_prompt:nudge', {
        conversation_id: conversationId,
        date: currentDate,
      });
      setNudgeSent(true);
      triggerHeartbeatHaptics([40, 60, 40]);
      setTimeout(() => setNudgeSent(false), 5000);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setNudging(false);
    }
  };

  // React with Emoji
  const handleReact = async (emoji) => {
    if (!promptData?.revealed) return;
    try {
      setPromptData((prev) => (prev ? { ...prev, my_reaction: emoji } : prev));
      await api(`/conversations/${conversationId}/daily-prompt/reaction`, {
        method: 'POST',
        body: {
          date: currentDate,
          reaction: emoji,
        },
      });
      triggerHeartbeatHaptics([40, 50]);
    } catch (err) {
      onError?.(err.message);
    }
  };

  // Share to chat feed as structured card
  const handleShareToChat = () => {
    if (!promptData || !promptData.revealed) return;

    const formattedMessage =
      `✨ [Daily Us Prompt · ${currentDate}]\n` +
      `❓ "${promptData.question_ml}"\n` +
      `(${promptData.question_en})\n\n` +
      `💬 ${user.name}: "${promptData.my_answer}"\n` +
      `💬 ${promptData.partner_name || peer.name}: "${promptData.partner_answer}"`;

    onSendToChat?.(formattedMessage);
    onClose?.();
  };

  // Copy to clipboard
  const handleCopyText = async () => {
    if (!promptData) return;
    const shareText =
      `✨ Daily Us Prompt (${currentDate})\n` +
      `❓ ${promptData.question_ml}\n` +
      (promptData.revealed
        ? `\n${user.name}: ${promptData.my_answer}\n${peer.name}: ${promptData.partner_answer}`
        : `\nMy Answer: ${promptData.my_answer}`);

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write fail fallback */
    }
  };

  const categoryMeta =
    promptData && PROMPT_CATEGORIES[promptData.category]
      ? PROMPT_CATEGORIES[promptData.category]
      : PROMPT_CATEGORIES.memories;

  const isToday = currentDate === getTodayDateKey();

  return (
    <div className="daily-prompt-backdrop" onClick={onClose}>
      <div
        className={`daily-prompt-modal ${justRevealed ? 'modal-revealed-glow' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-prompt-title"
      >
        {/* Celebration Confetti Overlay */}
        {justRevealed && (
          <div className="prompt-confetti-container" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="prompt-confetti-piece"
                style={{
                  '--left': `${(i * 4.2) % 100}%`,
                  '--delay': `${(i * 0.12) % 1.5}s`,
                  '--color': ['#f43f5e', '#38c89b', '#f59e0b', '#8b5cf6', '#ec4899'][i % 5],
                }}
              />
            ))}
          </div>
        )}

        {/* Modal Header */}
        <header className="prompt-modal-header">
          <div className="prompt-header-left">
            <span className="prompt-header-badge">
              <Sparkles size={14} className="sparkle-spin" />
              <span>Question of the Day · ഇന്നത്തെ ചോദ്യം</span>
            </span>
            <div className="prompt-tabs">
              <button
                type="button"
                className={`prompt-tab-btn ${activeTab === 'today' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('today');
                  setCurrentDate(getTodayDateKey());
                }}
              >
                <Heart size={14} />
                <span>{isToday ? "Today's Prompt" : 'Selected Prompt'}</span>
              </button>
              <button
                type="button"
                className={`prompt-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <History size={14} />
                <span>Memory Lane (ഓർമ്മകൾ)</span>
              </button>
            </div>
          </div>
          <ButtonIcon label="Close modal" onClick={onClose} className="prompt-close-btn">
            <X size={19} />
          </ButtonIcon>
        </header>

        {activeTab === 'history' ? (
          /* ============================================================== */
          /* MEMORY SCRAPBOOK (PAST PROMPTS LIST)                          */
          /* ============================================================== */
          <div className="prompt-history-view">
            <div className="history-view-header">
              <h3>📖 Our Memory Scrapbook (നമ്മുടെ ഓർമ്മച്ചെപ്പ്)</h3>
              <p>Every little thought, memory, and confession you shared together.</p>
            </div>

            {loadingHistory ? (
              <div className="prompt-loading-state">
                <RefreshCw size={24} className="spin" />
                <span>Opening memory album...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="history-empty-state">
                <div className="history-empty-icon">💌</div>
                <h4>No memories in the scrapbook yet!</h4>
                <p>Answer today&apos;s prompt together to start your couple memory journal.</p>
                <button
                  type="button"
                  className="primary compact"
                  onClick={() => {
                    setActiveTab('today');
                    setCurrentDate(getTodayDateKey());
                  }}
                >
                  Answer Today&apos;s Prompt ✨
                </button>
              </div>
            ) : (
              <div className="history-cards-scroll">
                {historyList.map((item) => (
                  <article key={item.date} className="history-prompt-item">
                    <div className="history-item-top">
                      <span className="history-date-badge">
                        <Calendar size={12} />
                        {formatPromptDateLabel(item.date)}
                      </span>
                      <span className="history-category-pill">
                        {item.icon || '✨'} {item.question_ml ? 'സ്പെഷ്യൽ' : 'Daily'}
                      </span>
                    </div>

                    <h4 className="history-item-question-ml">{item.question_ml}</h4>
                    <p className="history-item-question-en">{item.question_en}</p>

                    {item.revealed ? (
                      <div className="history-answers-grid">
                        <div className="history-answer-box mine">
                          <div className="history-ans-header">
                            <span className="ans-author-tag">You ({user.name})</span>
                            {item.my_reaction && <span>{item.my_reaction}</span>}
                          </div>
                          <p dir="auto">{item.my_answer}</p>
                        </div>
                        <div className="history-answer-box peer">
                          <div className="history-ans-header">
                            <span className="ans-author-tag">{item.partner_name || peer.name}</span>
                            {item.partner_reaction && <span>{item.partner_reaction}</span>}
                          </div>
                          <p dir="auto">{item.partner_answer}</p>
                        </div>
                      </div>
                    ) : item.my_answer ? (
                      <div className="history-waiting-note">
                        <Lock size={14} />
                        <span>You answered · Waiting for partner to unlock this day</span>
                      </div>
                    ) : (
                      <div className="history-unanswered-note">
                        <HelpCircle size={14} />
                        <span>Missed prompt · Tap to view and answer</span>
                      </div>
                    )}

                    <div className="history-item-footer">
                      <button
                        type="button"
                        className="history-open-btn"
                        onClick={() => {
                          setCurrentDate(item.date);
                          setActiveTab('today');
                        }}
                      >
                        {item.revealed ? 'Revisit this moment 💕' : 'View this prompt 🔒'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* MAIN PROMPT INTERACTION VIEW (TODAY'S / SELECTED PROMPT)       */
          /* ============================================================== */
          <div className="prompt-modal-body">
            {loading ? (
              <div className="prompt-loading-state">
                <RefreshCw size={26} className="spin" />
                <span>Unfolding today&apos;s special question... 💭</span>
              </div>
            ) : !promptData ? (
              <div className="prompt-error-state">
                <p>Could not load prompt for this date.</p>
                <button type="button" className="secondary" onClick={() => void loadPrompt()}>
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* QUESTION HERO CARD */}
                <div
                  className="prompt-hero-card"
                  style={{ '--cat-color': categoryMeta.color }}
                >
                  <div className="prompt-meta-row">
                    <span className="prompt-category-tag">
                      {promptData.icon} {categoryMeta.labelMl}
                    </span>
                    <span className="prompt-date-label">
                      <Calendar size={13} />
                      {formatPromptDateLabel(currentDate)}
                    </span>
                  </div>

                  <h2 className="prompt-question-ml" dir="auto">
                    {promptData.question_ml}
                  </h2>
                  <p className="prompt-question-en">
                    &ldquo;{promptData.question_en}&rdquo;
                  </p>

                  {/* Spark ideas chips */}
                  {promptData.sparks && promptData.sparks.length > 0 && !promptData.revealed && isEditing && (
                    <div className="prompt-sparks-row">
                      <span className="sparks-label">Ideas / സൂചനകൾ:</span>
                      {promptData.sparks.map((spark, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="prompt-spark-chip"
                          onClick={() => {
                            setAnswerDraft((prev) =>
                              prev ? `${prev} · ${spark}` : spark,
                            );
                            textareaRef.current?.focus();
                          }}
                        >
                          {spark}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Status Banner */}
                  <div className="prompt-status-banner">
                    {promptData.revealed ? (
                      <div className="status-pill revealed">
                        <Unlock size={14} />
                        <span>
                          Mutual Reveal Unlocked! (രണ്ടുപേരുടെയും ഉത്തരങ്ങൾ തുറന്നു!) 🎉
                        </span>
                      </div>
                    ) : promptData.my_answer ? (
                      <div className="status-pill waiting">
                        <Lock size={14} className="pulse-lock" />
                        <span>
                          {promptData.partner_answered
                            ? `${promptData.partner_name || peer.name} answered too! Unlocking...`
                            : `Waiting for ${promptData.partner_name || peer.name} to answer... 🔒`}
                        </span>
                      </div>
                    ) : (
                      <div className="status-pill pending">
                        <Lock size={14} />
                        <span>
                          {promptData.partner_answered
                            ? `🔥 ${promptData.partner_name || peer.name} has already answered! Write yours to reveal! 🔓`
                            : 'Double-blind guarantee: Partner cannot see your answer until they answer too! 🔒'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* STATE A: REVEALED STATE (BOTH HAVE ANSWERED)             */}
                {/* ========================================================= */}
                {promptData.revealed ? (
                  <div className="prompt-revealed-section">
                    <div className="revealed-celebration-title">
                      <span className="celebration-heart">❤️</span>
                      <h3>The Magic Is Revealed! (രണ്ടുപേരുടെയും ഉത്തരങ്ങൾ)</h3>
                      <p>
                        Both of you answered with your heart. Here is what you both wrote:
                      </p>
                    </div>

                    <div className="revealed-answers-grid">
                      {/* Partner's Answer Card */}
                      <div className="answer-card peer-answer-card">
                        <div className="answer-card-header">
                          <div className="answer-author-info">
                            <Avatar user={peer} size={36} />
                            <div>
                              <strong>{promptData.partner_name || peer.name}</strong>
                              <small>
                                {promptData.partner_answered_at
                                  ? new Date(promptData.partner_answered_at).toLocaleTimeString(
                                      [],
                                      { hour: '2-digit', minute: '2-digit' },
                                    )
                                  : 'Today'}
                              </small>
                            </div>
                          </div>
                          {promptData.partner_reaction && (
                            <span
                              className="reaction-badge peer-badge"
                              title={`${peer.name} reacted with ${promptData.partner_reaction}`}
                            >
                              {promptData.partner_reaction}
                            </span>
                          )}
                        </div>

                        <div className="answer-card-body">
                          <span className="quote-mark left">&ldquo;</span>
                          <p className="answer-content-text" dir="auto">
                            {promptData.partner_answer}
                          </p>
                          <span className="quote-mark right">&rdquo;</span>
                        </div>
                      </div>

                      {/* My Answer Card */}
                      <div className="answer-card my-answer-card">
                        <div className="answer-card-header">
                          <div className="answer-author-info">
                            <Avatar user={user} size={36} />
                            <div>
                              <strong>You ({user.name})</strong>
                              <small>
                                {promptData.my_answered_at
                                  ? new Date(promptData.my_answered_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'Today'}
                              </small>
                            </div>
                          </div>
                          {promptData.my_reaction && (
                            <span
                              className="reaction-badge my-badge"
                              title={`You reacted with ${promptData.my_reaction}`}
                            >
                              {promptData.my_reaction}
                            </span>
                          )}
                        </div>

                        <div className="answer-card-body">
                          <span className="quote-mark left">&ldquo;</span>
                          <p className="answer-content-text" dir="auto">
                            {promptData.my_answer}
                          </p>
                          <span className="quote-mark right">&rdquo;</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Reactions Bar */}
                    <div className="prompt-reactions-bar">
                      <span className="reaction-prompt-label">
                        React to this moment (പ്രതികരണം നൽകൂ):
                      </span>
                      <div className="reactions-pill-group">
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className={`reaction-emoji-btn ${promptData.my_reaction === emoji ? 'selected' : ''}`}
                            onClick={() => void handleReact(emoji)}
                            title={`React with ${emoji}`}
                          >
                            <span>{emoji}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reveal Action Buttons */}
                    <div className="prompt-actions-row">
                      <button
                        type="button"
                        className="share-chat-action-btn"
                        onClick={handleShareToChat}
                      >
                        <MessageCircle size={16} />
                        <span>Share in Chat (ചാറ്റിൽ സൂക്ഷിക്കാം)</span>
                      </button>

                      <button
                        type="button"
                        className="secondary copy-action-btn"
                        onClick={handleCopyText}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copied ? 'Copied!' : 'Copy Memories'}</span>
                      </button>
                    </div>
                  </div>
                ) : promptData.my_answer && !isEditing ? (
                  /* ========================================================= */
                  /* STATE B: I ANSWERED, WAITING FOR PARTNER (LOCKED STATE)   */
                  /* ========================================================= */
                  <div className="prompt-waiting-section">
                    {/* My Stored Answer Card */}
                    <div className="my-saved-answer-box">
                      <div className="saved-ans-top">
                        <div className="saved-ans-tag">
                          <Check size={14} />
                          <span>Your answer is safely locked 🔐</span>
                        </div>
                        <button
                          type="button"
                          className="edit-answer-text-btn"
                          onClick={() => setIsEditing(true)}
                        >
                          Edit answer
                        </button>
                      </div>
                      <p className="saved-answer-preview" dir="auto">
                        &ldquo;{promptData.my_answer}&rdquo;
                      </p>
                    </div>

                    {/* Mystery Partner Card */}
                    <div className="partner-mystery-box">
                      <div className="mystery-lock-glow">
                        <Lock size={38} className="lock-mystery-icon" />
                      </div>

                      <h4>
                        Waiting for {promptData.partner_name || peer.name} to answer... 🤫
                      </h4>
                      <p className="mystery-explanation">
                        രണ്ടുപേരും ഉത്തരം നൽകിയാൽ മാത്രമേ പരസ്പരം വായിക്കാൻ കഴിയൂ!
                        <br />
                        <span className="sub-explanation">
                          Both answers will simultaneously unlock in a magical reveal as soon as{' '}
                          {promptData.partner_name || peer.name} writes theirs.
                        </span>
                      </p>

                      {/* Blurred teaser rows */}
                      <div className="blurred-teaser-lines" aria-hidden="true">
                        <div className="blurred-line line-1" />
                        <div className="blurred-line line-2" />
                        <div className="blurred-line line-3" />
                      </div>

                      {/* Nudge button */}
                      <div className="nudge-action-container">
                        <button
                          type="button"
                          className={`nudge-partner-btn ${nudgeSent ? 'sent' : ''}`}
                          disabled={nudging || nudgeSent}
                          onClick={handleNudgePartner}
                        >
                          {nudgeSent ? (
                            <>
                              <Check size={16} />
                              <span>Sweet Nudge Sent! 💌 (ഓർമ്മിപ്പിച്ചു!)</span>
                            </>
                          ) : (
                            <>
                              <Bell size={16} />
                              <span>
                                {nudging
                                  ? 'Nudging…'
                                  : `Nudge ${promptData.partner_name || peer.name} 💌 (ചോദിച്ചു ഓർമ്മിപ്പിക്കൂ)`}
                              </span>
                            </>
                          )}
                        </button>
                        {nudgeSent && (
                          <small className="nudge-sent-tip">
                            We alerted {promptData.partner_name || peer.name} that you&apos;re
                            waiting for their response!
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ========================================================= */
                  /* STATE C: ANSWER COMPOSER (INPUTTING ANSWER)               */
                  /* ========================================================= */
                  <form className="prompt-composer-form" onSubmit={handleSubmitAnswer}>
                    <div className="composer-instructions">
                      <label htmlFor="prompt-answer-input">
                        <strong>
                          നിങ്ങളുടെ ഹൃദയം തുറന്നെഴുതൂ 💭 (Pour your heart out):
                        </strong>
                        <span>Only revealed once you both submit</span>
                      </label>
                    </div>

                    <div className="prompt-textarea-wrapper">
                      <textarea
                        id="prompt-answer-input"
                        ref={textareaRef}
                        rows={4}
                        maxLength={2000}
                        required
                        value={answerDraft}
                        placeholder="ഈ ചോദ്യത്തിനുള്ള നിങ്ങളുടെ ഏറ്റവും സത്യസന്ധമായ ഉത്തരം ഇവിടെ കുറിക്കൂ... 🤍"
                        onChange={(e) => setAnswerDraft(e.target.value)}
                        autoFocus
                      />
                      <div className="textarea-footer-counter">
                        <small className="double-blind-note">
                          🔒 Double-Blind: Partner cannot see this until they submit too!
                        </small>
                        <span className="char-count">{answerDraft.length} / 2000</span>
                      </div>
                    </div>

                    <div className="prompt-form-buttons">
                      {promptData.my_answer && (
                        <button
                          type="button"
                          className="secondary compact"
                          onClick={() => {
                            setAnswerDraft(promptData.my_answer);
                            setIsEditing(false);
                          }}
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        type="submit"
                        className="primary prompt-submit-btn"
                        disabled={submitting || !answerDraft.trim()}
                      >
                        {submitting ? (
                          <>
                            <RefreshCw size={16} className="spin" />
                            <span>Locking in answer...</span>
                          </>
                        ) : (
                          <>
                            <Heart size={16} fill="currentColor" />
                            <span>
                              {promptData.partner_answered
                                ? 'Submit & Reveal Together! 🔓 (ഉത്തരം നൽകി തുറക്കൂ!)'
                                : 'Lock In My Answer 🔒 (രഹസ്യമായി സമർപ്പിക്കൂ)'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
