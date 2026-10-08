import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const timeLabel = (value) => {
  const seconds = Math.floor(Number.isFinite(value) ? value : 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

export function MediaPlayer({ src, video = false, onError }) {
  const media = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [peaks, setPeaks] = useState([]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let context;
    setPeaks([]);
    setTime(0);
    setDuration(0);
    setPlaying(false);
    if (!video) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        // Decode a separate buffer so waveform analysis never reroutes playback audio.
        void (async () => {
          try {
            const response = await fetch(src, { signal: controller.signal });
            if (!response.ok) return;
            const bytes = await response.arrayBuffer();
            if (!active) return;
            context = new AudioContextClass();
            const buffer = await context.decodeAudioData(bytes);
            const bins = Array.from({ length: 64 }, (_, index) => {
              const start = Math.floor(index * buffer.length / 64);
              const end = Math.floor((index + 1) * buffer.length / 64);
              let peak = 0;
              for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const samples = buffer.getChannelData(channel);
                for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(samples[i]));
              }
              return peak;
            });
            if (active) {
              const max = Math.max(...bins, 0.01);
              setPeaks(bins.map((peak) => peak / max));
              setDuration(buffer.duration);
            }
          } catch {
            // The seek slider remains available when decoding is unsupported.
          } finally {
            if (context) void context.close().catch(() => {});
          }
        })();
      }
    }
    return () => { active = false; controller.abort(); };
  }, [src, video]);

  const sync = () => {
    const element = media.current;
    setTime(element.currentTime);
    if (Number.isFinite(element.duration)) setDuration(element.duration);
  };
  const seek = (value) => {
    if (!duration) return;
    media.current.currentTime = Math.min(duration, Math.max(0, value));
    setTime(media.current.currentTime);
  };
  const props = {
    ref: media, src, preload: 'metadata', onTimeUpdate: sync,
    onLoadedMetadata: sync, onDurationChange: sync,
    onPlay: () => setPlaying(true), onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onError: () => onError?.('Unable to play this media. You can still download the file.'),
    onRateChange: () => setSpeed(media.current.playbackRate),
    onVolumeChange: () => { setVolume(media.current.volume); setMuted(media.current.muted); },
  };
  return (
    <div className="message-media-player">
      {video ? <video {...props} playsInline controls className="message-media-video" /> : <audio {...props} />}
      {!video && peaks.length > 0 && (
        <svg className="message-waveform" viewBox="0 0 256 48" role="img" aria-label="Voice note waveform">
          {peaks.map((peak, index) => <rect key={index} x={index * 4} y={24 - Math.max(2, peak * 22)} width="2.5" height={Math.max(4, peak * 44)} rx="1" fill="currentColor" opacity={index / peaks.length < time / duration ? 1 : 0.3} />)}
        </svg>
      )}
      <input className="message-media-seek" type="range" min="0" max={duration || 0} step="0.01" value={Math.min(time, duration)} disabled={!duration} aria-label="Playback position" aria-valuetext={`${timeLabel(time)} of ${timeLabel(duration)}`} onChange={(event) => seek(Number(event.target.value))} />
      <div className="message-media-markers" aria-label="Timestamp markers">
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => <button key={fraction} type="button" disabled={!duration} aria-label={`Seek to ${timeLabel(duration * fraction)}`} onClick={() => seek(duration * fraction)}>{timeLabel(duration * fraction)}</button>)}
      </div>
      <div className="message-media-controls">
        <button type="button" aria-label={playing ? 'Pause media' : 'Play media'} onClick={async () => {
          if (playing) media.current.pause();
          else try { await media.current.play(); } catch { onError?.('Playback could not start. Please try again.'); }
        }}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <span className="message-media-time">{timeLabel(time)} / {timeLabel(duration)}</span>
        <label>Speed <select aria-label="Playback speed" value={speed} onChange={(event) => { media.current.playbackRate = Number(event.target.value); setSpeed(Number(event.target.value)); }}>{[0.5, 1, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
        <button type="button" aria-label={muted ? 'Unmute media' : 'Mute media'} onClick={() => { media.current.muted = !muted; setMuted(!muted); }}>{muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <input className="message-media-volume" type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} aria-label="Media volume" aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`} onChange={(event) => { const value = Number(event.target.value); media.current.volume = value; media.current.muted = false; setVolume(value); setMuted(false); }} />
      </div>
    </div>
  );
}
