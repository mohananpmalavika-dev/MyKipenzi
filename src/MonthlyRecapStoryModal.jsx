import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Heart,
  Camera,
  Mic,
  MessageCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  Send,
  Calendar,
  Music,
  Award,
} from 'lucide-react';
import { Avatar } from './components.jsx';
import { api } from './api.js';
import {
  formatMonthKey,
  getMonthLabel,
  getAvailableRecapMonths,
  formatMonthlyRecapShare,
} from '../shared/monthlyRecap.js';
import { playSyncChime, triggerHeartbeatHaptics } from './heartbeatAudio.js';

export function MonthlyRecapStoryModal({
  conversationId,
  user,
  peer,
  initialMonth,
  onClose,
  onSendToChat,
  onError,
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => initialMonth || formatMonthKey());
  const [recapData, setRecapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [slideProgress, setSlideProgress] = useState(0); // 0 to 100
  const [shareSuccess, setShareSuccess] = useState(false);

  const availableMonths = useRef(getAvailableRecapMonths(6)).current;
  const SLIDE_DURATION_MS = 6000;
  const progressIntervalRef = useRef(null);
  const isHoldingRef = useRef(false);
  const audioCtxRef = useRef(null);

  // Load monthly recap from API
  const loadRecap = useCallback(async (monthKey) => {
    setLoading(true);
    try {
      const data = await api(`/conversations/${conversationId}/monthly-recap?month=${monthKey}`);
      setRecapData(data);
      setCurrentSlide(0);
      setSlideProgress(0);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId, onError]);

  useEffect(() => {
    void loadRecap(selectedMonth);
  }, [selectedMonth, loadRecap]);

  // Slides structure based on recapData
  const slides = recapData ? [
    { id: 'cover', title: 'Our Month in Review' },
    { id: 'messages', title: 'Words of Love' },
    { id: 'photos', title: 'Captured Moments' },
    { id: 'voice_duets', title: 'Voices & Melodies' },
    { id: 'heartbeats', title: 'Heartbeats & Warmth' },
    { id: 'chronicle', title: 'AI Love Chronicle' },
  ] : [];

  const totalSlides = slides.length || 6;

  // Gentle romantic synth chime using Web Audio
  const playRomanticChord = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const frequencies = [261.63, 329.63, 392.00, 523.25]; // C major gentle chord
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + idx * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 1.3);
      });
    } catch {
      // Audio autoplay gracefully suppressed
    }
  }, [soundEnabled]);

  // Handle slide advance
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      if (prev < totalSlides - 1) {
        setSlideProgress(0);
        return prev + 1;
      }
      setIsPaused(true);
      return prev;
    });
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      setSlideProgress(0);
      return Math.max(0, prev - 1);
    });
  }, []);

  // Timer loop for story progression
  useEffect(() => {
    if (loading || isPaused) {
      clearInterval(progressIntervalRef.current);
      return;
    }

    const intervalStep = 50; // ms
    const increment = (intervalStep / SLIDE_DURATION_MS) * 100;

    progressIntervalRef.current = setInterval(() => {
      if (isHoldingRef.current) return;
      setSlideProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + increment;
      });
    }, intervalStep);

    return () => clearInterval(progressIntervalRef.current);
  }, [loading, isPaused, nextSlide]);

  // Play chime on slide transition
  useEffect(() => {
    if (!loading && currentSlide > 0) {
      playRomanticChord();
      triggerHeartbeatHaptics([25]);
    }
  }, [currentSlide, loading, playRomanticChord]);

  const handlePointerDown = () => {
    isHoldingRef.current = true;
  };

  const handlePointerUp = () => {
    isHoldingRef.current = false;
  };

  const handleShareToChat = async () => {
    if (!recapData || !onSendToChat) return;
    try {
      const shareText = formatMonthlyRecapShare({
        monthKey: selectedMonth,
        titleEn: recapData.chronicle?.titleEn || `Our Month in Review`,
        titleMl: recapData.chronicle?.titleMl || `നമ്മുടെ പ്രതിമാസ ഓർമ്മകൾ`,
        stats: recapData.stats,
        chronicle: recapData.chronicle,
      });
      await onSendToChat(shareText);
      playSyncChime();
      triggerHeartbeatHaptics([60, 90]);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err) {
      onError?.(err.message);
    }
  };

  const monthLabel = getMonthLabel(selectedMonth);
  const stats = recapData?.stats || {
    messagesCount: 0,
    photosCount: 0,
    voiceNotesCount: 0,
    heartbeatsCount: 0,
    duetCount: 0,
  };

  return (
    <div
      className="monthly-recap-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Our Month in Review - ${monthLabel.en}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="monthly-recap-modal">
        {/* Story Progress Indicators at Top */}
        <div className="recap-progress-container" aria-label="Story slides progress">
          {Array.from({ length: totalSlides }).map((_, idx) => {
            let width = '0%';
            if (idx < currentSlide) width = '100%';
            else if (idx === currentSlide) width = `${Math.min(100, Math.max(0, slideProgress))}%`;

            return (
              <div
                key={idx}
                className="recap-progress-track"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(idx);
                  setSlideProgress(0);
                }}
              >
                <div className="recap-progress-bar" style={{ width }} />
              </div>
            );
          })}
        </div>

        {/* Story Top Navigation Bar */}
        <div className="recap-header">
          <div className="recap-header-profile">
            <Avatar user={peer || { name: 'Partner' }} size={34} />
            <div className="recap-header-titles">
              <span className="recap-header-name">
                {peer?.name || 'Us'} · {monthLabel.en}
              </span>
              <span className="recap-header-sub">Monthly memories</span>
            </div>
          </div>

          <div className="recap-header-controls">
            <button
              type="button"
              className="recap-icon-btn"
              title={soundEnabled ? 'Mute romantic chimes' : 'Enable romantic chimes'}
              onClick={(e) => {
                e.stopPropagation();
                setSoundEnabled((prev) => !prev);
              }}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              type="button"
              className="recap-icon-btn"
              title={isPaused ? 'Resume story' : 'Pause story'}
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused((prev) => !prev);
              }}
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              type="button"
              className="recap-icon-btn close-btn"
              title="Close story"
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tap touch zones for navigation */}
        <div
          className="recap-tap-zone left"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          aria-label="Previous slide"
        />
        <div
          className="recap-tap-zone right"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          aria-label="Next slide"
        />

        {/* Main Slide Content Area */}
        <div className="recap-body">
          {loading ? (
            <div className="recap-loading-card">
              <Sparkles size={40} className="recap-pulse-icon" />
              <h3>ഓർമ്മകൾ ചികഞ്ഞെടുക്കുന്നു...</h3>
              <p>Gathering your sweetest moments for {monthLabel.en}...</p>
            </div>
          ) : (
            <div className={`recap-slide-wrapper slide-fade slide-${currentSlide}`}>
              {/* SLIDE 0: Cover Slide */}
              {currentSlide === 0 && (
                <div className="recap-slide-cover">
                  <div className="recap-badge-pill">
                    <Sparkles size={14} /> Our Month in Review · പ്രതിമാസ റീക്യാപ്പ്
                  </div>
                  <div className="recap-couple-avatars-glow">
                    <div className="avatar-left">
                      <Avatar user={user} size={72} />
                    </div>
                    <div className="heart-center-pulse">
                      <Heart size={32} fill="#ff4081" color="#ff4081" />
                    </div>
                    <div className="avatar-right">
                      <Avatar user={peer || { name: 'Partner' }} size={72} />
                    </div>
                  </div>
                  <h1 className="recap-cover-heading">{monthLabel.en}</h1>
                  <h2 className="recap-cover-sub">{monthLabel.en} memories</h2>
                  <p className="recap-cover-caption">
                    A celebration of our laughter, whispered voices, and every beautiful heartbeat
                    shared this month.
                  </p>
                  <div className="recap-tap-hint">
                    <span>തുടരാൻ ടാപ്പ് ചെയ്യുക (Tap to explore)</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              )}

              {/* SLIDE 1: Messages & Conversations */}
              {currentSlide === 1 && (
                <div className="recap-slide-stats">
                  <div className="recap-slide-icon-halo">
                    <MessageCircle size={38} />
                  </div>
                  <div className="recap-stat-number">{stats.messagesCount}</div>
                  <h2 className="recap-stat-label">സന്ദേശങ്ങൾ പങ്കുവെച്ചു</h2>
                  <p className="recap-stat-sublabel">Heartfelt messages exchanged in {monthLabel.monthNameEn}</p>
                  <div className="recap-card-bubble">
                    <p className="recap-bubble-quote">
                      "ഓരോ സന്ദേശത്തിലും ഒരു കുഞ്ഞു പുഞ്ചിരിയും കാത്തിരിപ്പും ഒളിച്ചിരിപ്പുണ്ടായിരുന്നു..."
                    </p>
                    <span className="recap-bubble-author">💬 You & {peer?.name || 'Sweetheart'}</span>
                  </div>
                </div>
              )}

              {/* SLIDE 2: Photos & Shared Visuals */}
              {currentSlide === 2 && (
                <div className="recap-slide-photos">
                  <div className="recap-slide-icon-halo photo-halo">
                    <Camera size={38} />
                  </div>
                  <div className="recap-stat-number">{stats.photosCount}</div>
                  <h2 className="recap-stat-label">പ്രിയപ്പെട്ട ഫോട്ടോകൾ</h2>
                  <p className="recap-stat-sublabel">Moments captured in time this month</p>

                  {recapData.photos && recapData.photos.length > 0 ? (
                    <div className="recap-photo-mosaic">
                      {recapData.photos.slice(0, 4).map((p, i) => (
                        <div key={p.id || i} className={`recap-polaroid polaroid-${i}`}>
                          <div className="polaroid-frame">
                            <span className="polaroid-placeholder-icon">📸</span>
                            <span className="polaroid-title">{p.name || 'Love Snapshot'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="recap-empty-stat-card">
                      <Camera size={32} />
                      <p>ഈ മാസം നമ്മൾ ഒരുമിച്ച് കൂടുതൽ ചിത്രങ്ങൾ പങ്കുവെക്കാനുണ്ട്! 🌸</p>
                    </div>
                  )}
                </div>
              )}

              {/* SLIDE 3: Voice Notes & Duet Songs */}
              {currentSlide === 3 && (
                <div className="recap-slide-audio">
                  <div className="recap-slide-icon-halo audio-halo">
                    <Mic size={38} />
                  </div>
                  <div className="recap-audio-stats-row">
                    <div className="recap-audio-col">
                      <span className="recap-big-val">{stats.voiceNotesCount}</span>
                      <span className="recap-small-lbl">വോയ്സ് നോട്ടുകൾ 🎙️</span>
                    </div>
                    <div className="recap-divider" />
                    <div className="recap-audio-col">
                      <span className="recap-big-val">{stats.duetCount}</span>
                      <span className="recap-small-lbl">ഡ്യുയറ്റ് പാട്ടുകൾ 🎶</span>
                    </div>
                  </div>

                  <h2 className="recap-stat-label">ശബ്ദങ്ങളുടെ മാധുര്യം</h2>
                  <p className="recap-stat-sublabel">Whispers & sung melodies that warmed our hearts</p>

                  <div className="recap-equalizer-card">
                    <div className="recap-eq-bars">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <span key={i} className={`recap-eq-bar bar-${i % 6}`} />
                      ))}
                    </div>
                    <span className="recap-eq-caption">
                      "നിന്റെ ശബ്ദം കേൾക്കുമ്പോഴാണ് എന്റെ ഓരോ ദിവസവും പൂർണ്ണമാകുന്നത്..."
                    </span>
                  </div>
                </div>
              )}

              {/* SLIDE 4: Heartbeats & Warmth */}
              {currentSlide === 4 && (
                <div className="recap-slide-heartbeat">
                  <div className="recap-slide-icon-halo heartbeat-halo">
                    <Heart size={38} fill="#ff4081" color="#ff4081" />
                  </div>
                  <div className="recap-stat-number">{stats.heartbeatsCount}</div>
                  <h2 className="recap-stat-label">തത്സമയ ഹൃദയസ്പന്ദനങ്ങൾ 💓</h2>
                  <p className="recap-stat-sublabel">Synchronized live heartbeat pulses sent</p>

                  <div className="recap-heart-pulse-visual">
                    <div className="heart-circle-ring ring-1" />
                    <div className="heart-circle-ring ring-2" />
                    <div className="heart-center-icon">
                      <Heart size={44} fill="#ff1744" color="#ff1744" />
                    </div>
                  </div>

                  <p className="recap-intimacy-note">
                    അകലങ്ങൾക്കിടയിലും നമ്മുടെ ഹൃദയങ്ങൾ ഒരേ താളത്തിൽ തുടിച്ചു...
                  </p>
                </div>
              )}

              {/* SLIDE 5: AI Poetic Chronicle Finale */}
              {currentSlide === 5 && (
                <div className="recap-slide-chronicle">
                  <div className="recap-chronicle-header">
                    <Award size={24} className="crown-icon" />
                    <span className="chronicle-badge">AI Love Chronicle · പ്രണയകാവ്യം</span>
                  </div>

                  <div className="recap-chronicle-scroll">
                    <div className="recap-chronicle-card">
                      <h3 className="chronicle-title">{recapData.chronicle?.titleEn}</h3>
                      <p className="chronicle-poem-en">{recapData.chronicle?.poemEn}</p>
                    </div>
                  </div>

                  <div className="recap-share-action-area">
                    <button
                      type="button"
                      className={`recap-share-btn ${shareSuccess ? 'success' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleShareToChat();
                      }}
                    >
                      <Share2 size={16} />
                      <span>
                        {shareSuccess
                          ? 'ചാറ്റിലേക്ക് അയച്ചു! (Shared to Chat ✨)'
                          : 'ഈ സ്റ്റോറി ചാറ്റിൽ പങ്കിടുക (Share Story)'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Month Selector & Navigation */}
        <div className="recap-footer" onClick={(e) => e.stopPropagation()}>
          <div className="recap-month-dropdown">
            <Calendar size={14} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Select recap month"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.en} {m.isCurrent ? '· Current month' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="recap-footer-nav">
            <button
              type="button"
              className="recap-nav-arrow"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              aria-label="Previous slide"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="recap-slide-indicator">
              {currentSlide + 1} / {totalSlides}
            </span>
            <button
              type="button"
              className="recap-nav-arrow"
              onClick={nextSlide}
              disabled={currentSlide === totalSlides - 1}
              aria-label="Next slide"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
