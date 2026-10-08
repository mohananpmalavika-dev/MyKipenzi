import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Sparkles,
  Send,
  Upload,
  Headphones,
  Check,
} from 'lucide-react';
import { ButtonIcon, Avatar } from './components.jsx';
import {
  CURATED_TRACKS,
  MUSIC_REACTIONS,
  calculateSyncDrift,
  formatTime,
  formatSharedMusicMessage,
  musicEngine,
} from './musicEngine.js';

function getTrackIndex(trackId, fallback = 0) {
  if (!trackId) return fallback;
  const idx = CURATED_TRACKS.findIndex((t) => t.id === trackId);
  return idx !== -1 ? idx : fallback;
}

export function ListenTogetherModal({
  conversationId,
  user,
  peer,
  socket,
  onClose,
  onMinimize,
  onSendToChat,
  onError: _onError,
  isCallMode = false,
}) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(musicEngine.isPlaying);
  const [currentPos, setCurrentPos] = useState(musicEngine.getCurrentPosition());
  const [volume, setVolume] = useState(isCallMode ? 0.25 : 0.55);
  const [isMuted, setIsMuted] = useState(false);
  const [partnerListening, setPartnerListening] = useState(false);
  const [partnerReaction, setPartnerReaction] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'adjusting'
  const [reactionParticles, setReactionParticles] = useState([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [customFileNotice, setCustomFileNotice] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const currentTrack = CURATED_TRACKS[currentTrackIndex] || CURATED_TRACKS[0];
  const seekSliderRef = useRef(null);
  const isDraggingSeek = useRef(false);
  const fileInputRef = useRef(null);

  // Sync musicEngine volume
  useEffect(() => {
    musicEngine.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // Track position timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isDraggingSeek.current) {
        setCurrentPos(musicEngine.getCurrentPosition());
      }
    }, 250);
    return () => clearInterval(timer);
  }, []);

  // Announce presence on mount and clean up
  useEffect(() => {
    socket?.emit('music:status', {
      conversation_id: conversationId,
      active: true,
      track_id: currentTrack.id,
    });
    socket?.emit('music:invite', {
      conversation_id: conversationId,
      track: {
        id: currentTrack.id,
        titleMl: currentTrack.titleMl,
        titleEn: currentTrack.titleEn,
      },
    });

    return () => {
      socket?.emit('music:status', {
        conversation_id: conversationId,
        active: false,
        track_id: currentTrack.id,
      });
    };
  }, [socket, conversationId, currentTrack.id, currentTrack.titleMl, currentTrack.titleEn]);

  const spawnReactionRef = useRef(null);

  // Floating reaction spawner
  const spawnReaction = (emoji, source = 'local') => {
    const id = Date.now() + Math.random();
    const xPos = 20 + Math.random() * 60; // 20% to 80% horizontal
    const particle = { id, emoji, xPos, source };
    setReactionParticles((prev) => [...prev.slice(-15), particle]);

    setTimeout(() => {
      setReactionParticles((prev) => prev.filter((p) => p.id !== id));
    }, 2400);

    if (source === 'local') {
      socket?.emit('music:reaction', {
        conversation_id: conversationId,
        reaction: emoji,
      });
    }
  };
  spawnReactionRef.current = spawnReaction;

  // Listen for socket events from partner
  useEffect(() => {
    if (!socket) return;

    const handleSync = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id === user.id) return;

      const { action, track_id, position, is_playing, timestamp } = payload;

      if (track_id) {
        const foundIdx = CURATED_TRACKS.findIndex((t) => t.id === track_id);
        if (foundIdx !== -1 && foundIdx !== currentTrackIndex) {
          setCurrentTrackIndex(foundIdx);
          musicEngine.currentTrack = CURATED_TRACKS[foundIdx];
        }
      }

      if (action === 'play') {
        const driftInfo = calculateSyncDrift(musicEngine.getCurrentPosition(), position, timestamp);
        setIsPlaying(true);
        musicEngine.playTrack(CURATED_TRACKS[getTrackIndex(track_id, currentTrackIndex)], driftInfo.adjustedRemotePos, isMuted ? 0 : volume);
        setSyncStatus('synced');
      } else if (action === 'pause') {
        setIsPlaying(false);
        musicEngine.pauseTrack();
        musicEngine.seekTrack(position);
        setCurrentPos(position);
      } else if (action === 'seek') {
        setSyncStatus('adjusting');
        musicEngine.seekTrack(position);
        setCurrentPos(position);
        setTimeout(() => setSyncStatus('synced'), 400);
      } else if (action === 'change_track') {
        const tIdx = getTrackIndex(track_id, currentTrackIndex);
        setCurrentTrackIndex(tIdx);
        if (is_playing) {
          musicEngine.playTrack(CURATED_TRACKS[tIdx], 0, isMuted ? 0 : volume);
          setIsPlaying(true);
        } else {
          musicEngine.seekTrack(0);
          setCurrentPos(0);
        }
      }
    };

    const handleStatus = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        setPartnerListening(Boolean(payload.active));
      }
    };

    const handleReaction = (payload) => {
      if (payload.conversation_id !== conversationId) return;
      if (payload.sender_id !== user.id) {
        spawnReactionRef.current?.(payload.reaction, 'partner');
        setPartnerReaction(`${payload.sender_name || 'Partner'}: ${payload.reaction}`);
        setTimeout(() => setPartnerReaction(null), 3000);
      }
    };

    socket.on('music:sync', handleSync);
    socket.on('music:status', handleStatus);
    socket.on('music:reaction', handleReaction);

    return () => {
      socket.off('music:sync', handleSync);
      socket.off('music:status', handleStatus);
      socket.off('music:reaction', handleReaction);
    };
  }, [socket, conversationId, user.id, currentTrackIndex, isMuted, volume]);

  // Play / Pause toggle
  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (nextState) {
      musicEngine.playTrack(currentTrack, currentPos, isMuted ? 0 : volume);
      socket?.emit('music:sync', {
        conversation_id: conversationId,
        action: 'play',
        track_id: currentTrack.id,
        position: currentPos,
        is_playing: true,
        timestamp: Date.now(),
      });
    } else {
      musicEngine.pauseTrack();
      socket?.emit('music:sync', {
        conversation_id: conversationId,
        action: 'pause',
        track_id: currentTrack.id,
        position: currentPos,
        is_playing: false,
        timestamp: Date.now(),
      });
    }
  };

  // Seek handler
  const handleSeek = (e) => {
    const target = parseFloat(e.target.value);
    setCurrentPos(target);
    musicEngine.seekTrack(target);
    socket?.emit('music:sync', {
      conversation_id: conversationId,
      action: 'seek',
      track_id: currentTrack.id,
      position: target,
      is_playing: isPlaying,
      timestamp: Date.now(),
    });
  };

  // Switch Track
  const changeTrack = (newIndex) => {
    const clampedIndex = (newIndex + CURATED_TRACKS.length) % CURATED_TRACKS.length;
    setCurrentTrackIndex(clampedIndex);
    const nextTrack = CURATED_TRACKS[clampedIndex];

    setCurrentPos(0);
    if (isPlaying) {
      musicEngine.playTrack(nextTrack, 0, isMuted ? 0 : volume);
    } else {
      musicEngine.currentTrack = nextTrack;
      musicEngine.seekTrack(0);
    }

    socket?.emit('music:sync', {
      conversation_id: conversationId,
      action: 'change_track',
      track_id: nextTrack.id,
      position: 0,
      is_playing: isPlaying,
      timestamp: Date.now(),
    });
  };

  // Force re-sync with partner
  const forceResync = () => {
    setSyncStatus('adjusting');
    socket?.emit('music:sync', {
      conversation_id: conversationId,
      action: isPlaying ? 'play' : 'pause',
      track_id: currentTrack.id,
      position: musicEngine.getCurrentPosition(),
      is_playing: isPlaying,
      timestamp: Date.now(),
    });
    setTimeout(() => setSyncStatus('synced'), 500);
  };

  // Share current music moment to chat
  const handleShareToChat = () => {
    if (onSendToChat) {
      const msg = formatSharedMusicMessage(currentTrack, customNote);
      onSendToChat(msg);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Custom audio file upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setCustomFileNotice('Please upload a valid audio file (MP3, WAV, AAC).');
      return;
    }
    const url = URL.createObjectURL(file);
    musicEngine.playCustomAudio(url, 0);
    setIsPlaying(true);
    setCustomFileNotice(`Playing custom audio: ${file.name}`);
  };

  return (
    <div
      className={`listen-together-backdrop ${isCallMode ? 'call-mode' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Listen to Music Together"
    >
      <div className="listen-together-window" style={{ '--track-accent': currentTrack.themeColor }}>
        {/* Header */}
        <header className="listen-header">
          <div className="listen-header-title">
            <span className="listen-badge">
              <Headphones size={15} />
              <span>Listen Together · ഒന്നിച്ച് കേൾക്കാം</span>
            </span>
            <div className="partner-sync-indicator">
              <span className={`status-dot ${partnerListening ? 'online' : 'offline'}`} />
              <span>
                {partnerListening
                  ? `${peer?.name || 'Partner'} is listening with you 🎧`
                  : `Waiting for ${peer?.name || 'Partner'} to join`}
              </span>
              <span className="sync-chip">
                {syncStatus === 'synced' ? 'In Sync 🟢' : 'Syncing 🔄'}
              </span>
            </div>
          </div>
          <div className="listen-header-actions">
            <ButtonIcon
              label="Sync with partner now"
              onClick={forceResync}
              className="sync-refresh-btn"
            >
              <RotateCcw size={16} />
            </ButtonIcon>
            {onMinimize && (
              <ButtonIcon label="Minimize to chat bar" onClick={onMinimize}>
                <Minimize2 size={17} />
              </ButtonIcon>
            )}
            <ButtonIcon label="Close music player" onClick={onClose}>
              <X size={18} />
            </ButtonIcon>
          </div>
        </header>

        {/* Floating Reactions Canvas Overlay */}
        <div className="reactions-particle-container" aria-hidden="true">
          {reactionParticles.map((p) => (
            <div
              key={p.id}
              className={`floating-reaction-item ${p.source}`}
              style={{ left: `${p.xPos}%` }}
            >
              <span>{p.emoji}</span>
            </div>
          ))}
        </div>

        {/* Partner Reaction Toast */}
        {partnerReaction && (
          <div className="partner-reaction-toast" role="status">
            <Sparkles size={14} />
            <span>{partnerReaction}</span>
          </div>
        )}

        {/* Stage: Rotating Vinyl Record & Tonearm */}
        <div className="listen-stage">
          <div className={`vinyl-wrapper ${isPlaying ? 'spinning' : 'paused'}`}>
            <div className="vinyl-disc" style={{ background: currentTrack.gradient }}>
              <div className="vinyl-groove-inner" />
              <div className="vinyl-label-center">
                <span className="vinyl-icon">{currentTrack.icon}</span>
                <span className="vinyl-bpm">{currentTrack.bpm} BPM</span>
              </div>
            </div>
          </div>

          {/* Connected Listeners Avatar Wave */}
          <div className="listeners-connected-bar">
            <div className="listener-avatar-bubble mine" title={user.name}>
              <Avatar person={user} size="medium" />
              <span className="avatar-tag">You</span>
            </div>
            <div className={`audio-wave-bridge ${isPlaying ? 'active' : ''}`}>
              <span className="wave-bar b1" />
              <span className="wave-bar b2" />
              <span className="wave-bar b3" />
              <span className="wave-bar b4" />
              <span className="wave-bar b5" />
            </div>
            <div className="listener-avatar-bubble peer" title={peer?.name}>
              <Avatar person={peer} size="medium" />
              <span className="avatar-tag">{peer?.name || 'Partner'}</span>
            </div>
          </div>
        </div>

        {/* Track Info & Poetry Quote */}
        <div className="listen-info-section">
          <div className="track-titles">
            <h2 className="track-title-ml">{currentTrack.titleMl}</h2>
            <h3 className="track-title-en">{currentTrack.titleEn}</h3>
            <span className="track-genre-pill">
              {currentTrack.genre} · {currentTrack.bpm} BPM
            </span>
          </div>

          <blockquote className="couple-mood-quote">
            <p className="quote-ml">&ldquo;{currentTrack.quoteMl}&rdquo;</p>
            <p className="quote-en">{currentTrack.quoteEn}</p>
          </blockquote>
        </div>

        {/* Timeline Scrubber */}
        <div className="listen-scrubber-area">
          <div className="time-display">
            <span>{formatTime(currentPos)}</span>
            <span>{formatTime(currentTrack.duration)}</span>
          </div>
          <input
            ref={seekSliderRef}
            type="range"
            min="0"
            max={currentTrack.duration}
            step="0.5"
            value={currentPos}
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
            className="seek-slider"
            aria-label="Track progress slider"
          />
        </div>

        {/* Main Playback Controls */}
        <div className="playback-controls-row">
          <button
            type="button"
            className="track-nav-btn"
            onClick={() => changeTrack(currentTrackIndex - 1)}
            aria-label="Previous song"
          >
            <SkipBack size={22} />
          </button>

          <button
            type="button"
            className={`main-play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause music' : 'Play music'}
          >
            {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '3px' }} />}
          </button>

          <button
            type="button"
            className="track-nav-btn"
            onClick={() => changeTrack(currentTrackIndex + 1)}
            aria-label="Next song"
          >
            <SkipForward size={22} />
          </button>
        </div>

        {/* Volume & Mood Reactions Row */}
        <div className="listen-bottom-toolbar">
          {/* Volume Control */}
          <div className="volume-control-box">
            <button
              type="button"
              className="volume-mute-btn"
              onClick={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="volume-slider"
              aria-label="Music volume"
            />
            <span className="vol-percent">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
          </div>

          {/* Quick Reaction Emojis */}
          <div className="reactions-quick-bar">
            {MUSIC_REACTIONS.map((r) => (
              <button
                key={r.emoji}
                type="button"
                className="reaction-tap-btn"
                onClick={() => spawnReaction(r.emoji, 'local')}
                title={`Send ${r.label}`}
                aria-label={`Send ${r.label} reaction`}
              >
                <span>{r.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Share to Chat & Playlist Tabs */}
        <div className="listen-footer-actions">
          <div className="share-note-input-row">
            <input
              type="text"
              placeholder="Add sweet note... (ഈ പാട്ട് കേൾക്കുമ്പോൾ ഓർമ്മ വന്നത് 🤍)"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="share-note-input"
            />
            <button
              type="button"
              className="share-moment-btn"
              onClick={handleShareToChat}
              disabled={copiedLink}
            >
              {copiedLink ? <Check size={16} /> : <Send size={16} />}
              <span>{copiedLink ? 'Shared!' : 'Share to Chat'}</span>
            </button>
          </div>

          <div className="playlist-toggle-row">
            <button
              type="button"
              className="text-link-btn"
              onClick={() => setShowPlaylist(!showPlaylist)}
            >
              {showPlaylist ? 'Hide Playlist ▲' : 'Show Playlist (6 Romantic Tracks) ▼'}
            </button>
            <button
              type="button"
              className="text-link-btn upload-custom-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              <span>Upload Custom Audio</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>

          {customFileNotice && (
            <p className="custom-notice-msg" role="status">
              {customFileNotice}
            </p>
          )}

          {/* Expandable Playlist Drawer */}
          {showPlaylist && (
            <div className="playlist-drawer">
              {CURATED_TRACKS.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  className={`playlist-item ${idx === currentTrackIndex ? 'active' : ''}`}
                  onClick={() => changeTrack(idx)}
                >
                  <span className="playlist-track-icon">{t.icon}</span>
                  <div className="playlist-track-info">
                    <strong className="playlist-title-ml">{t.titleMl}</strong>
                    <span className="playlist-title-en">{t.titleEn}</span>
                  </div>
                  <span className="playlist-duration">{formatTime(t.duration)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ListenTogetherMiniPlayer: Compact docked player for chat view
 */
export function ListenTogetherMiniPlayer({
  track = CURATED_TRACKS[0],
  isPlaying,
  currentPos,
  onTogglePlay,
  onExpand,
  onClose,
  partnerListening,
}) {
  return (
    <div className="music-mini-player-bar" role="region" aria-label="Synced music player">
      <div className={`mini-vinyl ${isPlaying ? 'spinning' : 'paused'}`}>
        <span className="mini-icon">{track.icon}</span>
      </div>
      <div className="mini-meta" onClick={onExpand} role="button" tabIndex={0}>
        <div className="mini-titles">
          <strong>{track.titleMl}</strong>
          <small>{track.titleEn}</small>
        </div>
        <div className="mini-status">
          <span className="mini-time">{formatTime(currentPos)}</span>
          <span className="mini-dot">·</span>
          <span className="mini-partner">
            {partnerListening ? 'Partner synced 🎧' : 'Listening solo'}
          </span>
        </div>
      </div>
      <div className="mini-controls">
        <button
          type="button"
          className="mini-play-btn"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          type="button"
          className="mini-icon-btn"
          onClick={onExpand}
          aria-label="Expand player"
        >
          <Maximize2 size={16} />
        </button>
        <button
          type="button"
          className="mini-icon-btn"
          onClick={onClose}
          aria-label="Close music player"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * ListenTogetherCallDock: Compact audio dock rendered directly in CallOverlay during voice/video calls!
 */
export function ListenTogetherCallDock({
  track = CURATED_TRACKS[0],
  isPlaying,
  onTogglePlay,
  onNextTrack,
  volume,
  onVolumeChange,
  onExpand,
  partnerListening,
}) {
  return (
    <div className="call-listen-dock" role="region" aria-label="Call music companion">
      <div className="dock-left">
        <span className="dock-icon">{track.icon}</span>
        <div className="dock-titles">
          <span className="dock-title-ml">{track.titleMl}</span>
          <span className="dock-title-en">
            {partnerListening ? 'Partner listening 🎧' : track.titleEn}
          </span>
        </div>
      </div>

      <div className={`dock-equalizer ${isPlaying ? 'active' : ''}`}>
        <span />
        <span />
        <span />
      </div>

      <div className="dock-controls">
        <button
          type="button"
          className="dock-play-btn"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause call music' : 'Play call music'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          type="button"
          className="dock-icon-btn"
          onClick={onNextTrack}
          aria-label="Next track"
        >
          <SkipForward size={14} />
        </button>
      </div>

      <div className="dock-volume">
        <Volume2 size={13} />
        <input
          type="range"
          min="0"
          max="0.8"
          step="0.05"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="dock-vol-slider"
          title="Background call music volume"
        />
        <span className="dock-vol-txt">{Math.round(volume * 100)}%</span>
      </div>

      <button
        type="button"
        className="dock-expand-btn"
        onClick={onExpand}
        title="Full Listen Together Window"
      >
        <Maximize2 size={13} />
      </button>
    </div>
  );
}
