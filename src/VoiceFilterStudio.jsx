import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, X, Send, Sparkles, Volume2, LoaderCircle } from 'lucide-react';
import {
  VOICE_FILTERS,
  getVoiceFilter,
  decodeAudioBlob,
  applyVoiceFilter,
  audioBufferToWav,
  formatVoiceFilename,
} from './voiceFilters.js';

export function VoiceFilterStudio({
  rawVoiceBlob,
  initialFilter = 'normal',
  onSend,
  onCancel,
  onRerecord,
  onError,
}) {
  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);

  const originalBuffer = useRef(null);
  const filteredBlob = useRef(null);
  const audioElement = useRef(null);
  const currentPreviewUrl = useRef(null);

  // Decode the raw recording once
  useEffect(() => {
    let active = true;
    setIsProcessing(true);

    const init = async () => {
      try {
        if (!rawVoiceBlob) return;
        const decoded = await decodeAudioBlob(rawVoiceBlob);
        if (!active) return;
        originalBuffer.current = decoded;
        await processAndPreview(decoded, selectedFilter);
      } catch (err) {
        if (active) {
          onError?.('Could not process voice recording: ' + err.message);
          setIsProcessing(false);
        }
      }
    };

    void init();

    return () => {
      active = false;
      if (currentPreviewUrl.current) {
        URL.revokeObjectURL(currentPreviewUrl.current);
      }
    };
  }, [rawVoiceBlob]);

  // Process filter and update preview URL
  const processAndPreview = async (buffer, filterId) => {
    if (!buffer) return;
    setIsProcessing(true);
    try {
      const processedBuffer = await applyVoiceFilter(buffer, filterId);
      const wav = audioBufferToWav(processedBuffer);
      filteredBlob.current = wav;

      if (currentPreviewUrl.current) {
        URL.revokeObjectURL(currentPreviewUrl.current);
      }

      const url = URL.createObjectURL(wav);
      currentPreviewUrl.current = url;
      setPreviewUrl(url);
      setDuration(processedBuffer.duration);
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err) {
      onError?.('Filter preview failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilterSelect = async (filterId) => {
    if (selectedFilter === filterId || isProcessing) return;
    setSelectedFilter(filterId);
    if (originalBuffer.current) {
      await processAndPreview(originalBuffer.current, filterId);
    }
  };

  const togglePlayback = () => {
    const audio = audioElement.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        onError?.('Playback failed. Please try again.');
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioElement.current) {
      setCurrentTime(audioElement.current.currentTime);
    }
  };

  const handleSeek = (e) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (audioElement.current) {
      audioElement.current.currentTime = target;
    }
  };

  const handleSend = () => {
    if (!filteredBlob.current && !rawVoiceBlob) return;
    const blobToSend = filteredBlob.current || rawVoiceBlob;
    const filename = formatVoiceFilename(selectedFilter);
    const voiceFile = new File([blobToSend], filename, {
      type: blobToSend.type || 'audio/wav',
    });
    onSend?.(voiceFile, selectedFilter);
  };

  const activeFilterInfo = getVoiceFilter(selectedFilter);

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="voice-filter-studio" role="region" aria-label="Voice Note Filter Studio">
      {previewUrl && (
        <audio
          ref={audioElement}
          src={previewUrl}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}

      {/* Header */}
      <div className="voice-studio-header">
        <div className="voice-studio-title">
          <Sparkles size={16} className="voice-studio-sparkle" />
          <span>Voice Filter Studio · ശബ്ദ ഇഫക്റ്റുകൾ</span>
        </div>
        <div className="voice-studio-header-actions">
          {onRerecord && (
            <button
              type="button"
              className="voice-studio-icon-btn"
              title="Record again (വീണ്ടും റെക്കോർഡ് ചെയ്യുക)"
              onClick={onRerecord}
            >
              <RotateCcw size={15} />
              <span>Re-record</span>
            </button>
          )}
          <button
            type="button"
            className="voice-studio-icon-btn close-btn"
            title="Discard voice note"
            onClick={onCancel}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Audio Player Card */}
      <div className="voice-studio-player-card">
        <button
          type="button"
          className={`voice-studio-play-btn ${isPlaying ? 'playing' : ''}`}
          disabled={isProcessing}
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Pause preview' : 'Play voice note preview'}
        >
          {isProcessing ? (
            <LoaderCircle size={18} className="spin" />
          ) : isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} style={{ marginLeft: '2px' }} />
          )}
        </button>

        <div className="voice-studio-waveform-progress">
          {/* Animated EQ Bars */}
          <div className="voice-studio-eq-bars" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((bar) => {
              const active = isPlaying;
              const height = active
                ? Math.sin(bar * 0.8 + currentTime * 6) * 10 + 14
                : 6;
              return (
                <span
                  key={bar}
                  className="voice-eq-bar"
                  style={{
                    height: `${height}px`,
                    backgroundColor: activeFilterInfo.color,
                  }}
                />
              );
            })}
          </div>

          <div className="voice-studio-timeline-row">
            <input
              type="range"
              min="0"
              max={duration || 1}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="voice-studio-seek"
              aria-label="Seek voice preview"
              style={{ accentColor: activeFilterInfo.color }}
            />
            <span className="voice-studio-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Filter Banner */}
      <div className="voice-filter-active-desc">
        <span className="active-filter-icon">{activeFilterInfo.icon}</span>
        <div className="active-filter-text">
          <div className="active-filter-names">
            <strong>{activeFilterInfo.name}</strong>
            <span className="active-filter-ml">{activeFilterInfo.malayalamName}</span>
          </div>
          <p>{activeFilterInfo.description} · {activeFilterInfo.malayalamDesc}</p>
        </div>
      </div>

      {/* Filter Selector Chips */}
      <div className="voice-filters-carousel" role="radiogroup" aria-label="Select voice filter">
        {VOICE_FILTERS.map((filter) => {
          const isSelected = selectedFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`voice-filter-chip ${isSelected ? 'active' : ''} ${filter.badgeClass}`}
              onClick={() => void handleFilterSelect(filter.id)}
              disabled={isProcessing}
            >
              <span className="filter-chip-icon">{filter.icon}</span>
              <div className="filter-chip-info">
                <span className="filter-chip-name">{filter.name}</span>
                <span className="filter-chip-ml">{filter.malayalamName}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Action Footer */}
      <div className="voice-studio-footer">
        <button
          type="button"
          className="voice-studio-cancel-btn"
          onClick={onCancel}
        >
          Discard
        </button>
        <button
          type="button"
          className="voice-studio-send-btn"
          disabled={isProcessing}
          onClick={handleSend}
          style={{ background: activeFilterInfo.color }}
        >
          {isProcessing ? (
            <>
              <LoaderCircle size={15} className="spin" />
              <span>Applying filter…</span>
            </>
          ) : (
            <>
              <Send size={15} />
              <span>
                Send with {activeFilterInfo.name} {activeFilterInfo.icon}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
