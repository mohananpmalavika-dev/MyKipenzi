import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Minimize2,
  Maximize2,
  Share2,
  Send,
  Sparkles,
  Film,
  Check,
  Search,
  MessageCircle,
  Tv,
  ListVideo,
  FastForward,
  Rewind,
  Popcorn,
  Heart,
} from 'lucide-react';
import { ButtonIcon, Avatar } from './components.jsx';
import {
  CURATED_VIDEOS,
  VIDEO_REACTIONS,
  QUICK_WATCH_COMMENTS,
  extractYouTubeId,
  getYouTubeThumbnail,
  formatTime,
  calculateVideoDrift,
  formatSharedWatchPartyMessage,
} from './videoEngine.js';

export function WatchPartyModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onMinimize,
  onSendToChat,
  onSendMessage,
  onError: _onError,
  isCallMode = false,
  initialVideo = null,
}) {
  const [currentVideo, setCurrentVideo] = useState(() => initialVideo || CURATED_VIDEOS[0]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => (initialVideo?.durationSec || CURATED_VIDEOS[0].durationSec || 300));
  const [volume, setVolume] = useState(isCallMode ? 0.35 : 0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [partnerWatching, setPartnerWatching] = useState(false);
  const [partnerReaction, setPartnerReaction] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'adjusting'
  const [reactionParticles, setReactionParticles] = useState([]);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'playlist'
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customUrlError, setCustomUrlError] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [chatInputText, setChatInputText] = useState('');
  const [liveWatchComments, setLiveWatchComments] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const iframeRef = useRef(null);
  const html5VideoRef = useRef(null);
  const cinemaScreenRef = useRef(null);
  const isDraggingSeek = useRef(false);
  const playbackTimerRef = useRef(null);
  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;

  // Send postMessage command to YouTube iframe
  const sendYouTubeCommand = useCallback((func, args = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        '*'
      );
    }
  }, []);

  // Update playback time regularly while playing
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        if (!isDraggingSeek.current) {
          setCurrentTime((prev) => {
            const next = prev + 1;
            return next >= duration ? duration : next;
          });
        }
      }, 1000);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, duration]);

  // Announce watch status on mount and leave on unmount
  useEffect(() => {
    socket?.emit('video:status', {
      conversation_id: conversationId,
      active: true,
      video_id: currentVideo.id || currentVideo.youtubeId,
    });
    socket?.emit('video:invite', {
      conversation_id: conversationId,
      video: {
        id: currentVideo.id,
        youtubeId: currentVideo.youtubeId,
        titleMl: currentVideo.titleMl,
        titleEn: currentVideo.titleEn,
        thumbnail: currentVideo.thumbnail,
      },
    });

    return () => {
      socket?.emit('video:status', {
        conversation_id: conversationId,
        active: false,
        video_id: currentVideo.id || currentVideo.youtubeId,
      });
    };
  }, [socket, conversationId, currentVideo.id, currentVideo.youtubeId, currentVideo.titleMl, currentVideo.titleEn, currentVideo.thumbnail]);

  // Spawn animated floating reaction particles
  const spawnReaction = useCallback((emoji, source = 'local') => {
    const id = Date.now() + Math.random();
    const xPos = 15 + Math.random() * 70; // 15% to 85%
    const particle = { id, emoji, xPos, source };

    setReactionParticles((prev) => [...prev.slice(-20), particle]);
    setTimeout(() => {
      setReactionParticles((prev) => prev.filter((p) => p.id !== id));
    }, 2500);

    if (source === 'local') {
      socket?.emit('video:reaction', {
        conversation_id: conversationId,
        reaction: emoji,
      });
    }
  }, [conversationId, socket]);

  // Socket event listeners for sync from partner
  useEffect(() => {
    if (!socket) return;

    const handleSync = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id === user.id) return;

      const { action, video, position, is_playing, timestamp, commentText } = payload;

      if (action === 'change_video' && video) {
        setCurrentVideo(video);
        setCurrentTime(0);
        setDuration(video.durationSec || 300);
        setIsPlaying(Boolean(is_playing));
        if (video.youtubeId) {
          setTimeout(() => {
            sendYouTubeCommand('seekTo', [0, true]);
            if (is_playing) sendYouTubeCommand('playVideo');
          }, 600);
        }
      } else if (action === 'play') {
        const drift = calculateVideoDrift(currentTimeRef.current, position || 0, timestamp);
        setIsPlaying(true);
        if (currentVideo.youtubeId) {
          sendYouTubeCommand('playVideo');
          if (drift.shouldSeek) {
            sendYouTubeCommand('seekTo', [drift.adjustedRemotePos, true]);
            setCurrentTime(drift.adjustedRemotePos);
          }
        } else if (html5VideoRef.current) {
          html5VideoRef.current.play().catch(() => {});
          if (drift.shouldSeek) {
            html5VideoRef.current.currentTime = drift.adjustedRemotePos;
            setCurrentTime(drift.adjustedRemotePos);
          }
        }
        setSyncStatus('synced');
      } else if (action === 'pause') {
        setIsPlaying(false);
        const pos = typeof position === 'number' ? position : currentTimeRef.current;
        setCurrentTime(pos);
        if (currentVideo.youtubeId) {
          sendYouTubeCommand('pauseVideo');
          sendYouTubeCommand('seekTo', [pos, true]);
        } else if (html5VideoRef.current) {
          html5VideoRef.current.pause();
          html5VideoRef.current.currentTime = pos;
        }
      } else if (action === 'seek') {
        setSyncStatus('adjusting');
        const pos = position || 0;
        setCurrentTime(pos);
        if (currentVideo.youtubeId) {
          sendYouTubeCommand('seekTo', [pos, true]);
        } else if (html5VideoRef.current) {
          html5VideoRef.current.currentTime = pos;
        }
        setTimeout(() => setSyncStatus('synced'), 400);
      } else if (action === 'quick_comment' && commentText) {
        setLiveWatchComments((prev) => [
          ...prev.slice(-25),
          {
            id: Date.now() + Math.random(),
            sender_name: payload.sender_name || 'Partner',
            text: commentText,
            timestamp: Date.now(),
            isPartner: true,
          },
        ]);
      }
    };

    const handleStatus = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        setPartnerWatching(Boolean(payload.active));
      }
    };

    const handleReaction = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        spawnReaction(payload.reaction, 'partner');
        setPartnerReaction(`${payload.sender_name || 'Partner'}: ${payload.reaction}`);
        setTimeout(() => setPartnerReaction(null), 3000);
      }
    };

    socket.on('video:sync', handleSync);
    socket.on('video:status', handleStatus);
    socket.on('video:reaction', handleReaction);

    return () => {
      socket.off('video:sync', handleSync);
      socket.off('video:status', handleStatus);
      socket.off('video:reaction', handleReaction);
    };
  }, [socket, conversationId, user.id, currentVideo, sendYouTubeCommand, spawnReaction]);

  // Handle Play/Pause toggle
  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (currentVideo.youtubeId) {
      if (nextState) {
        sendYouTubeCommand('playVideo');
      } else {
        sendYouTubeCommand('pauseVideo');
      }
    } else if (html5VideoRef.current) {
      if (nextState) {
        html5VideoRef.current.play().catch(() => {});
      } else {
        html5VideoRef.current.pause();
      }
    }

    socket?.emit('video:sync', {
      conversation_id: conversationId,
      action: nextState ? 'play' : 'pause',
      video_id: currentVideo.id || currentVideo.youtubeId,
      position: currentTime,
      is_playing: nextState,
      timestamp: Date.now(),
    });
  };

  // Handle Seek scrubbing
  const handleSeek = (e) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);

    if (currentVideo.youtubeId) {
      sendYouTubeCommand('seekTo', [target, true]);
    } else if (html5VideoRef.current) {
      html5VideoRef.current.currentTime = target;
    }

    socket?.emit('video:sync', {
      conversation_id: conversationId,
      action: 'seek',
      video_id: currentVideo.id || currentVideo.youtubeId,
      position: target,
      is_playing: isPlaying,
      timestamp: Date.now(),
    });
  };

  // Skip 10 seconds back or forward
  const skipTime = (delta) => {
    const nextTime = Math.max(0, Math.min(duration, currentTime + delta));
    setCurrentTime(nextTime);

    if (currentVideo.youtubeId) {
      sendYouTubeCommand('seekTo', [nextTime, true]);
    } else if (html5VideoRef.current) {
      html5VideoRef.current.currentTime = nextTime;
    }

    socket?.emit('video:sync', {
      conversation_id: conversationId,
      action: 'seek',
      video_id: currentVideo.id || currentVideo.youtubeId,
      position: nextTime,
      is_playing: isPlaying,
      timestamp: Date.now(),
    });
  };

  // Select video from curated list
  const selectVideo = (video) => {
    setCurrentVideo(video);
    setCurrentTime(0);
    setDuration(video.durationSec || 300);
    setIsPlaying(true);

    socket?.emit('video:sync', {
      conversation_id: conversationId,
      action: 'change_video',
      video: {
        id: video.id,
        youtubeId: video.youtubeId,
        videoUrl: video.videoUrl,
        titleMl: video.titleMl,
        titleEn: video.titleEn,
        thumbnail: video.thumbnail,
        durationSec: video.durationSec || 300,
      },
      position: 0,
      is_playing: true,
      timestamp: Date.now(),
    });
  };

  // Load custom YouTube link or video URL
  const handleLoadCustomUrl = (e) => {
    e.preventDefault();
    setCustomUrlError('');
    const input = customUrlInput.trim();
    if (!input) return;

    const ytId = extractYouTubeId(input);
    if (ytId) {
      const customVideo = {
        id: `yt-custom-${ytId}`,
        youtubeId: ytId,
        titleMl: 'കസ്റ്റം യൂട്യൂബ് വീഡിയോ',
        titleEn: `YouTube Video (${ytId})`,
        category: 'YouTube Shared',
        durationSec: 360,
        thumbnail: getYouTubeThumbnail(ytId),
      };
      setCustomUrlInput('');
      selectVideo(customVideo);
      setActiveTab('chat');
    } else if (input.startsWith('http://') || input.startsWith('https://')) {
      // Direct media link
      const directVideo = {
        id: `clip-${Date.now()}`,
        videoUrl: input,
        titleMl: 'കസ്റ്റം വീഡിയോ ക്ലിപ്പ്',
        titleEn: 'Shared Video Clip',
        category: 'Custom Clip',
        durationSec: 300,
        thumbnail: '',
      };
      setCustomUrlInput('');
      selectVideo(directVideo);
      setActiveTab('chat');
    } else {
      setCustomUrlError('ദയവായി ശരിയായ YouTube URL അല്ലെങ്കിൽ വീഡിയോ ലിങ്ക് നൽകുക (Please enter a valid YouTube URL).');
    }
  };

  // Force re-sync with partner
  const forceResync = () => {
    setSyncStatus('adjusting');
    if (currentVideo.youtubeId) {
      sendYouTubeCommand('seekTo', [currentTime, true]);
      if (isPlaying) sendYouTubeCommand('playVideo');
    }
    socket?.emit('video:sync', {
      conversation_id: conversationId,
      action: isPlaying ? 'play' : 'pause',
      video_id: currentVideo.id || currentVideo.youtubeId,
      position: currentTime,
      is_playing: isPlaying,
      timestamp: Date.now(),
    });
    setTimeout(() => setSyncStatus('synced'), 400);
  };

  // Send quick comment or custom chat message
  const handleSendLiveComment = (text) => {
    if (!text || !text.trim()) return;
    const clean = text.trim();

    // Local comment stream in watch party
    setLiveWatchComments((prev) => [
      ...prev.slice(-25),
      {
        id: Date.now() + Math.random(),
        sender_name: user?.name || 'You',
        text: clean,
        timestamp: Date.now(),
        isPartner: false,
      },
    ]);

    // Broadcast in real-time to watch party partner
    socket?.emit('video:sync', {
      conversation_id: conversationId,
      action: 'quick_comment',
      commentText: clean,
      timestamp: Date.now(),
    });

    // Also send into persistent conversation if handler provided
    if (onSendMessage) {
      onSendMessage(clean);
    }
  };

  // Share watch party to chat thread as interactive card
  const handleShareToChat = () => {
    if (onSendToChat) {
      const msg = formatSharedWatchPartyMessage(currentVideo, shareNote);
      onSendToChat(msg);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!cinemaScreenRef.current) return;
    if (!document.fullscreenElement) {
      cinemaScreenRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="watch-party-backdrop" role="dialog" aria-modal="true" aria-label="Watch Party Modal">
      <div className="watch-party-container" ref={cinemaScreenRef}>
        {/* Header Bar */}
        <div className="watch-party-header">
          <div className="watch-party-header-left">
            <div className="watch-badge">
              <Film size={16} className="watch-film-icon" />
              <span>Watch Party · വാച്ച് പാർട്ടി</span>
            </div>
            <div className="watch-title-meta">
              <strong className="watch-title-ml">{currentVideo.titleMl}</strong>
              <small className="watch-title-en">{currentVideo.titleEn}</small>
            </div>
          </div>

          <div className="watch-party-header-right">
            {/* Sync status indicator */}
            <div
              className={`watch-sync-pill ${syncStatus === 'synced' ? 'synced' : 'adjusting'}`}
              onClick={forceResync}
              title="Click to force re-sync with partner"
            >
              <span className="sync-dot" />
              <span>{syncStatus === 'synced' ? 'Synced (സിങ്ക്ഡ്)' : 'Syncing...'}</span>
            </div>

            {/* Partner presence badge */}
            <div className={`watch-peer-pill ${partnerWatching ? 'active' : 'idle'}`}>
              <Popcorn size={14} className="peer-popcorn-icon" />
              <span>
                {partnerWatching
                  ? `${peer?.name || 'Partner'} watching 🍿`
                  : `${peer?.name || 'Partner'} invited 🤍`}
              </span>
            </div>

            {/* Minimize / Fullscreen / Close actions */}
            <ButtonIcon label="Full Screen (പൂർണ്ണ സ്ക്രീൻ)" onClick={toggleFullscreen}>
              <Maximize2 size={16} />
            </ButtonIcon>
            <ButtonIcon label="Minimize to Mini Player (മിനിമൈസ്)" onClick={onMinimize}>
              <Minimize2 size={16} />
            </ButtonIcon>
            <ButtonIcon label="Close Watch Party (അടയ്ക്കുക)" onClick={onClose}>
              <X size={17} />
            </ButtonIcon>
          </div>
        </div>

        {/* Main Stage: Player Area + Interactive Chat & Playlist Sidepane */}
        <div className="watch-party-body">
          {/* Cinema Screen Player Area */}
          <div className="watch-party-player-stage">
            <div className="watch-video-viewport">
              {currentVideo.youtubeId ? (
                <iframe
                  ref={iframeRef}
                  className="watch-iframe"
                  src={`https://www.youtube-nocookie.com/embed/${currentVideo.youtubeId}?enablejsapi=1&autoplay=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&origin=${encodeURIComponent(window.location.origin)}`}
                  title={currentVideo.titleMl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={html5VideoRef}
                  className="watch-html5-video"
                  src={currentVideo.videoUrl}
                  controls={false}
                  autoPlay
                  playsInline
                  onTimeUpdate={() => {
                    if (html5VideoRef.current && !isDraggingSeek.current) {
                      setCurrentTime(html5VideoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (html5VideoRef.current) {
                      setDuration(html5VideoRef.current.duration || 300);
                    }
                  }}
                />
              )}

              {/* Floating Reaction Particles Overlay */}
              <div className="watch-reaction-particles-layer" pointerEvents="none">
                {reactionParticles.map((p) => (
                  <span
                    key={p.id}
                    className={`watch-reaction-particle ${p.source === 'partner' ? 'from-partner' : 'from-local'}`}
                    style={{ left: `${p.xPos}%` }}
                  >
                    {p.emoji}
                  </span>
                ))}
              </div>

              {/* Partner notification toast */}
              {partnerReaction && (
                <div className="watch-partner-reaction-toast">
                  <span>{partnerReaction}</span>
                </div>
              )}

              {/* Floating On-Video Reaction Bar (quick tap) */}
              <div className="watch-floating-reactions-dock">
                <span className="dock-hint">Express:</span>
                {VIDEO_REACTIONS.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    className="floating-reaction-btn"
                    onClick={() => spawnReaction(r.emoji, 'local')}
                    title={`React ${r.label}`}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Synced Cinema Controls Bar */}
            <div className="watch-controls-bar">
              {/* Play / Pause / Skip buttons */}
              <div className="watch-playback-btns">
                <button
                  type="button"
                  className="watch-skip-btn"
                  onClick={() => skipTime(-10)}
                  title="Rewind 10s (-10 സെക്കൻഡ്)"
                >
                  <Rewind size={16} />
                  <small>10s</small>
                </button>

                <button
                  type="button"
                  className="watch-play-btn"
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause (പോസ്)' : 'Play Together (ഒന്നിച്ച് പ്ലേ ചെയ്യുക)'}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
                </button>

                <button
                  type="button"
                  className="watch-skip-btn"
                  onClick={() => skipTime(10)}
                  title="Forward 10s (+10 സെക്കൻഡ്)"
                >
                  <FastForward size={16} />
                  <small>10s</small>
                </button>
              </div>

              {/* Time Scrubber Slider */}
              <div className="watch-progress-wrapper">
                <span className="watch-time-label">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  className="watch-seek-slider"
                  min="0"
                  max={duration || 300}
                  step="0.5"
                  value={currentTime}
                  onChange={handleSeek}
                  onMouseDown={() => {
                    isDraggingSeek.current = true;
                  }}
                  onMouseUp={() => {
                    isDraggingSeek.current = false;
                  }}
                  onTouchStart={() => {
                    isDraggingSeek.current = true;
                  }}
                  onTouchEnd={() => {
                    isDraggingSeek.current = false;
                  }}
                />
                <span className="watch-time-label">{formatTime(duration)}</span>
              </div>

              {/* Volume & Re-sync Controls */}
              <div className="watch-extra-controls">
                <button
                  type="button"
                  className="watch-icon-btn"
                  onClick={forceResync}
                  title="Force re-sync with partner (സിങ്ക് ചെയ്യുക)"
                >
                  <RotateCcw size={16} />
                </button>

                <div className="watch-volume-box">
                  <button
                    type="button"
                    className="watch-icon-btn"
                    onClick={() => {
                      const nextMute = !isMuted;
                      setIsMuted(nextMute);
                      if (currentVideo.youtubeId) {
                        sendYouTubeCommand(nextMute ? 'mute' : 'unMute');
                      } else if (html5VideoRef.current) {
                        html5VideoRef.current.muted = nextMute;
                      }
                    }}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    className="watch-volume-slider"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      setIsMuted(false);
                      if (currentVideo.youtubeId) {
                        sendYouTubeCommand('setVolume', [Math.round(val * 100)]);
                        sendYouTubeCommand('unMute');
                      } else if (html5VideoRef.current) {
                        html5VideoRef.current.volume = val;
                        html5VideoRef.current.muted = false;
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Side / Bottom Pane: Live Chat & Curated Playlist */}
          <div className="watch-party-sidepane">
            {/* Tabs Header */}
            <div className="watch-side-tabs">
              <button
                type="button"
                className={`side-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessageCircle size={15} />
                <span>Live Chat 💬</span>
              </button>
              <button
                type="button"
                className={`side-tab-btn ${activeTab === 'playlist' ? 'active' : ''}`}
                onClick={() => setActiveTab('playlist')}
              >
                <ListVideo size={15} />
                <span>Playlist & Links 📺</span>
              </button>
            </div>

            {/* Tab 1: Live Watch Chat & Quick Moments */}
            {activeTab === 'chat' && (
              <div className="watch-side-chat-content">
                {/* Real-time Watch Party Message Stream */}
                <div className="watch-comments-stream">
                  <div className="watch-stream-welcome">
                    <Sparkles size={16} className="sparkle-gold" />
                    <span>Watch together & share every sweet moment in real-time! ✨</span>
                  </div>

                  {liveWatchComments.length === 0 ? (
                    <div className="watch-empty-chat">
                      <p>No comments yet. Tap a quick comment or send a sweet note! 🍿</p>
                    </div>
                  ) : (
                    liveWatchComments.map((c) => (
                      <div
                        key={c.id}
                        className={`watch-comment-bubble ${c.isPartner ? 'partner-comment' : 'own-comment'}`}
                      >
                        <strong className="comment-author">{c.sender_name}</strong>
                        <p className="comment-text">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Comment Chips Bank */}
                <div className="watch-quick-chips-wrapper">
                  <span className="chips-title">Quick Moments (വേഗത്തിൽ അയക്കാം):</span>
                  <div className="chips-row">
                    {QUICK_WATCH_COMMENTS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="quick-chip-btn"
                        onClick={() => handleSendLiveComment(item.textMl)}
                      >
                        {item.textMl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Chat Composer */}
                <form
                  className="watch-chat-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (chatInputText.trim()) {
                      handleSendLiveComment(chatInputText);
                      setChatInputText('');
                    }
                  }}
                >
                  <input
                    type="text"
                    className="watch-chat-input"
                    placeholder="Type a reaction or sweet message... (സന്ദേശം എഴുതൂ)"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                  />
                  <button type="submit" className="watch-chat-send-btn" disabled={!chatInputText.trim()}>
                    <Send size={15} />
                  </button>
                </form>

                {/* Share to Chat Thread with note */}
                <div className="watch-share-card-section">
                  <input
                    type="text"
                    className="watch-note-input"
                    placeholder="Add a love note to share to chat... (ഒരു കുറിപ്പ് നൽകാം)"
                    value={shareNote}
                    onChange={(e) => setShareNote(e.target.value)}
                  />
                  <button
                    type="button"
                    className="watch-share-btn"
                    onClick={handleShareToChat}
                  >
                    {copiedNotification ? (
                      <>
                        <Check size={14} />
                        <span>Shared to Chat! (ഷെയർ ചെയ്തു 🎉)</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={14} />
                        <span>Send Video Card to Chat (ചാറ്റിലേക്ക് ഷെയർ ചെയ്യാം 🎬)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Curated Playlist & Custom YouTube Link Loader */}
            {activeTab === 'playlist' && (
              <div className="watch-side-playlist-content">
                {/* Custom URL Input Form */}
                <form className="custom-url-form" onSubmit={handleLoadCustomUrl}>
                  <label className="custom-url-label">
                    <span>Paste YouTube URL or Video Link:</span>
                    <div className="custom-url-row">
                      <input
                        type="text"
                        className="custom-url-input"
                        placeholder="https://youtu.be/... or youtube.com/watch?v=..."
                        value={customUrlInput}
                        onChange={(e) => {
                          setCustomUrlInput(e.target.value);
                          setCustomUrlError('');
                        }}
                      />
                      <button type="submit" className="custom-url-btn">
                        <Play size={14} />
                        <span>Play</span>
                      </button>
                    </div>
                  </label>
                  {customUrlError && <p className="custom-url-error">{customUrlError}</p>}
                </form>

                {/* Curated Romantic & Chill Malayalam Videos */}
                <div className="curated-videos-list">
                  <span className="curated-list-heading">Curated Malayalam & Chill Moments:</span>
                  <div className="videos-scroll-container">
                    {CURATED_VIDEOS.map((vid) => {
                      const isCurrent =
                        (currentVideo.id && currentVideo.id === vid.id) ||
                        (currentVideo.youtubeId && currentVideo.youtubeId === vid.youtubeId);
                      return (
                        <div
                          key={vid.id}
                          className={`curated-video-card ${isCurrent ? 'active-video' : ''}`}
                          onClick={() => {
                            selectVideo(vid);
                            setActiveTab('chat');
                          }}
                        >
                          <div className="video-card-thumb-wrap">
                            <img src={vid.thumbnail} alt={vid.titleEn} className="video-card-thumb" />
                            <span className="video-card-duration">{formatTime(vid.durationSec)}</span>
                            {isCurrent && (
                              <div className="playing-badge">
                                <Play size={14} className="playing-icon" />
                              </div>
                            )}
                          </div>
                          <div className="video-card-meta">
                            <strong className="video-title-ml">{vid.titleMl}</strong>
                            <small className="video-title-en">{vid.titleEn}</small>
                            <span className="video-genre-tag">{vid.category}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * WatchPartyMiniPlayer: Sleek docked player above chat composer
 * allows partner to chat freely while keeping the synchronized video playing!
 */
export function WatchPartyMiniPlayer({
  video,
  isPlaying,
  currentTime,
  onTogglePlay,
  onExpand,
  onClose,
  partnerWatching,
}) {
  if (!video) return null;

  return (
    <div className="watch-mini-player-bar" role="complementary" aria-label="Watch Party Mini Player">
      <div className="watch-mini-left" onClick={onExpand}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.titleEn} className="mini-video-thumb" />
        ) : (
          <div className="mini-video-thumb-placeholder">
            <Film size={18} />
          </div>
        )}
        <div className="mini-video-info">
          <div className="mini-video-titles">
            <strong className="mini-title-ml">{video.titleMl}</strong>
            <small className="mini-title-en">{video.titleEn}</small>
          </div>
          <span className="mini-video-status">
            {partnerWatching ? '🍿 Partner watching with you' : '🎬 Synced Watch Party'}
          </span>
        </div>
      </div>

      <div className="watch-mini-controls">
        <button
          type="button"
          className="watch-mini-play-btn"
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
        </button>

        <button
          type="button"
          className="watch-mini-icon-btn"
          onClick={onExpand}
          title="Expand Cinema View (വലുതാക്കുക)"
        >
          <Maximize2 size={16} />
        </button>

        <button
          type="button"
          className="watch-mini-icon-btn"
          onClick={onClose}
          title="Close Watch Party (അടയ്ക്കുക)"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * WatchPartyCallDock: Compact video companion dock rendered in CallOverlay during calls
 */
export function WatchPartyCallDock({
  video,
  isPlaying,
  onTogglePlay,
  onExpand,
}) {
  if (!video) return null;

  return (
    <div className="call-watch-dock" role="region" aria-label="Call Watch Party Dock">
      <div className="dock-left" onClick={onExpand}>
        <Film size={18} className="dock-icon" />
        <div className="dock-titles">
          <span className="dock-title-ml">{video.titleMl}</span>
          <small className="dock-title-en">{video.titleEn}</small>
        </div>
      </div>

      <div className="dock-controls">
        <button
          type="button"
          className="dock-play-btn"
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
        </button>

        <button
          type="button"
          className="dock-expand-btn"
          onClick={onExpand}
          title="Expand Video Cinema"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
