import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Mic,
  StopCircle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Send,
  Volume2,
  Sliders,
  Music,
  Check,
  Headphones,
} from 'lucide-react';
import { Avatar } from './components.jsx';
import {
  getAudioContext,
  decodeAudioBlob,
  extractWaveformPeaks,
  mixDuetTracks,
} from './voiceDuetEngine.js';
import { playSyncChime, triggerHeartbeatHaptics } from './heartbeatAudio.js';

export function VoiceDuetStudio({
  user,
  peer,
  partnerAudioBlob,
  partnerAudioUrl,
  _partnerAudioTitle = 'Song Line',
  onClose,
  onSendDuet,
  onError,
}) {
  const [partnerBuffer, setPartnerBuffer] = useState(null);
  const [partnerPeaks, setPartnerPeaks] = useState([]);
  const [partnerDuration, setPartnerDuration] = useState(0);
  const [isPlayingPartner, setIsPlayingPartner] = useState(false);

  // User recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [_userAudioBlob, setUserAudioBlob] = useState(null);
  const [userBuffer, setUserBuffer] = useState(null);
  const [userPeaks, setUserPeaks] = useState([]);
  const [_userDuration, setUserDuration] = useState(0);
  const [isPlayingUser, setIsPlayingUser] = useState(false);

  // Duet mixing settings
  const [duetMode, setDuetMode] = useState('sequential'); // 'sequential' | 'harmony'
  const [partnerVolume, setPartnerVolume] = useState(1.0);
  const [userVolume, setUserVolume] = useState(1.0);
  const [applyReverb, setApplyReverb] = useState(true);

  // Merged preview state
  const [mergedBlob, setMergedBlob] = useState(null);
  const [mergedBuffer, setMergedBuffer] = useState(null);
  const [mergedDuration, setMergedDuration] = useState(0);
  const [isPlayingDuet, setIsPlayingDuet] = useState(false);
  const [isMixing, setIsMixing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Audio refs
  const audioCtxRef = useRef(null);
  const partnerSourceRef = useRef(null);
  const userSourceRef = useRef(null);
  const duetSourceRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordTimerRef = useRef(null);

  // Initialize and decode partner audio
  useEffect(() => {
    let active = true;

    async function loadPartnerAudio() {
      try {
        let blob = partnerAudioBlob;
        if (!blob && partnerAudioUrl) {
          const res = await fetch(partnerAudioUrl);
          blob = await res.blob();
        }
        if (!blob) return;

        if (!audioCtxRef.current) audioCtxRef.current = getAudioContext();
        const buffer = await decodeAudioBlob(blob, audioCtxRef.current);
        if (!active) return;

        setPartnerBuffer(buffer);
        setPartnerDuration(buffer.duration);
        setPartnerPeaks(extractWaveformPeaks(buffer, 36));
      } catch (err) {
        onError?.('Could not decode partner voice note: ' + err.message);
      }
    }

    void loadPartnerAudio();
    return () => {
      active = false;
      partnerSourceRef.current?.stop();
      userSourceRef.current?.stop();
      duetSourceRef.current?.stop();
    };
  }, [partnerAudioBlob, partnerAudioUrl, onError]);

  // Play / Pause Partner track
  const togglePlayPartner = () => {
    if (!partnerBuffer || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (isPlayingPartner) {
      partnerSourceRef.current?.stop();
      setIsPlayingPartner(false);
    } else {
      partnerSourceRef.current?.stop();
      const src = ctx.createBufferSource();
      src.buffer = partnerBuffer;
      src.connect(ctx.destination);
      src.onended = () => setIsPlayingPartner(false);
      src.start(0);
      partnerSourceRef.current = src;
      setIsPlayingPartner(true);
    }
  };

  // Play / Pause User track
  const togglePlayUser = () => {
    if (!userBuffer || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (isPlayingUser) {
      userSourceRef.current?.stop();
      setIsPlayingUser(false);
    } else {
      userSourceRef.current?.stop();
      const src = ctx.createBufferSource();
      src.buffer = userBuffer;
      src.connect(ctx.destination);
      src.onended = () => setIsPlayingUser(false);
      src.start(0);
      userSourceRef.current = src;
      setIsPlayingUser(true);
    }
  };

  // Start recording user's response line
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('Microphone access is not available.');
      }

      // Stop any active playbacks
      partnerSourceRef.current?.stop();
      userSourceRef.current?.stop();
      duetSourceRef.current?.stop();
      setIsPlayingPartner(false);
      setIsPlayingUser(false);
      setIsPlayingDuet(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((m) =>
        MediaRecorder.isTypeSupported(m)
      );

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        clearInterval(recordTimerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);

        const recordedBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        setUserAudioBlob(recordedBlob);

        if (!audioCtxRef.current) audioCtxRef.current = getAudioContext();
        try {
          const buffer = await decodeAudioBlob(recordedBlob, audioCtxRef.current);
          setUserBuffer(buffer);
          setUserDuration(buffer.duration);
          setUserPeaks(extractWaveformPeaks(buffer, 36));
          triggerHeartbeatHaptics([60, 80]);
        } catch (e) {
          onError?.('Could not process recorded line: ' + e.message);
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      triggerHeartbeatHaptics([40]);

      const started = Date.now();
      recordTimerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - started) / 1000);
        setRecordSeconds(sec);
        if (sec >= 120) recorder.stop();
      }, 1000);
    } catch (err) {
      onError?.(err.message);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Mix tracks together
  const handleMixDuet = useCallback(async () => {
    if (!partnerBuffer && !userBuffer) return;
    setIsMixing(true);
    try {
      const res = await mixDuetTracks(partnerBuffer, userBuffer, {
        mode: duetMode,
        partnerGain: partnerVolume,
        userGain: userVolume,
        applyWarmReverb: applyReverb,
      });
      setMergedBlob(res.mergedBlob);
      setMergedBuffer(res.mergedBuffer);
      setMergedDuration(res.duration);
      triggerHeartbeatHaptics([50, 70]);
    } catch (err) {
      onError?.('Duet mixing failed: ' + err.message);
    } finally {
      setIsMixing(false);
    }
  }, [partnerBuffer, userBuffer, duetMode, partnerVolume, userVolume, applyReverb, onError]);

  // Auto-mix whenever both tracks are ready or settings change
  useEffect(() => {
    if (partnerBuffer && userBuffer) {
      void handleMixDuet();
    }
  }, [partnerBuffer, userBuffer, duetMode, partnerVolume, userVolume, applyReverb, handleMixDuet]);

  // Toggle Play / Pause Full Duet
  const togglePlayDuet = () => {
    if (!mergedBuffer || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (isPlayingDuet) {
      duetSourceRef.current?.stop();
      setIsPlayingDuet(false);
    } else {
      partnerSourceRef.current?.stop();
      userSourceRef.current?.stop();
      duetSourceRef.current?.stop();

      const src = ctx.createBufferSource();
      src.buffer = mergedBuffer;
      src.connect(ctx.destination);
      src.onended = () => setIsPlayingDuet(false);
      src.start(0);
      duetSourceRef.current = src;
      setIsPlayingDuet(true);
      triggerHeartbeatHaptics([30]);
    }
  };

  // Send Duet into chat
  const handleSendDuet = async () => {
    if (!mergedBlob || isSending) return;
    setIsSending(true);
    try {
      const duetFilename = `voice-duet-${Date.now()}.wav`;
      const duetFile = new File([mergedBlob], duetFilename, { type: 'audio/wav' });
      const duetCaption = `🎙️🎶 [Voice Duet: ${user.name} & ${peer?.name || 'Partner'} - Our Song]`;

      await onSendDuet?.(duetFile, duetCaption);
      playSyncChime();
      triggerHeartbeatHaptics([80, 100, 120]);
      onClose?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="voice-duet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Voice Note Duet Studio"
      onClick={onClose}
    >
      <div
        className="voice-duet-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="voice-duet-header">
          <div className="voice-duet-title-group">
            <div className="voice-duet-icon-badge">
              <Music size={22} />
            </div>
            <div>
              <h2>Voice Note Duet 🎙️🎶</h2>
              <p>രണ്ടുപേരും ചേർന്ന് പാടുന്ന പ്രണയഗാനം (Couple Duet Studio)</p>
            </div>
          </div>
          <button
            type="button"
            className="voice-duet-close-btn"
            onClick={onClose}
            aria-label="Close Duet Studio"
          >
            <X size={20} />
          </button>
        </div>

        <div className="voice-duet-body">
          {/* Track 1: Partner's Line */}
          <div className="duet-track-card partner-track">
            <div className="duet-track-header">
              <div className="duet-singer-info">
                <Avatar user={peer || { name: 'Partner' }} size={38} />
                <div>
                  <span className="duet-singer-role">ആദ്യ വരി (Part 1 · Line 1)</span>
                  <strong className="duet-singer-name">{peer?.name || 'Partner'}</strong>
                </div>
              </div>
              <button
                type="button"
                className={`duet-play-chip ${isPlayingPartner ? 'playing' : ''}`}
                onClick={togglePlayPartner}
                disabled={!partnerBuffer}
              >
                {isPlayingPartner ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlayingPartner ? 'Pause' : 'Listen Line'}</span>
              </button>
            </div>

            {/* Waveform for Partner */}
            <div className="duet-waveform-box partner-wave">
              {partnerPeaks.length > 0 ? (
                partnerPeaks.map((peak, idx) => (
                  <span
                    key={idx}
                    className="wave-bar partner-bar"
                    style={{ height: `${Math.max(15, peak * 100)}%` }}
                  />
                ))
              ) : (
                <div className="duet-wave-placeholder">
                  <span>{partnerAudioBlob || partnerAudioUrl ? 'ശബ്ദം ലോഡ് ചെയ്യുന്നു...' : 'പങ്കാളിയുടെ വോയ്സ് നോട്ട് തിരഞ്ഞെടുക്കുക'}</span>
                </div>
              )}
            </div>
            <div className="duet-track-footer">
              <small>{partnerBuffer ? `${formatSeconds(partnerDuration)} duration` : 'Line ready'}</small>
              <small className="duet-hint-caption">പങ്കാളി പാടിയ ആദ്യ വരി കേൾക്കൂ 🌸</small>
            </div>
          </div>

          {/* Track 2: User's Response Line */}
          <div className="duet-track-card user-track">
            <div className="duet-track-header">
              <div className="duet-singer-info">
                <Avatar user={user} size={38} />
                <div>
                  <span className="duet-singer-role">മറുപടി വരി (Part 2 · Your Response)</span>
                  <strong className="duet-singer-name">{user.name}</strong>
                </div>
              </div>

              {userBuffer && !isRecording && (
                <button
                  type="button"
                  className={`duet-play-chip ${isPlayingUser ? 'playing' : ''}`}
                  onClick={togglePlayUser}
                >
                  {isPlayingUser ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlayingUser ? 'Pause' : 'Listen Mine'}</span>
                </button>
              )}
            </div>

            {/* User Waveform or Recording View */}
            <div className="duet-waveform-box user-wave">
              {isRecording ? (
                <div className="duet-recording-meter">
                  <span className="duet-live-dot" />
                  <span className="duet-rec-text">പാടുന്നു... {recordSeconds}s</span>
                  <div className="duet-live-soundwaves">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span key={i} className="live-wave-bar" />
                    ))}
                  </div>
                </div>
              ) : userPeaks.length > 0 ? (
                userPeaks.map((peak, idx) => (
                  <span
                    key={idx}
                    className="wave-bar user-bar"
                    style={{ height: `${Math.max(15, peak * 100)}%` }}
                  />
                ))
              ) : (
                <div className="duet-wave-placeholder">
                  <span>മറുപടി വരി പാടാൻ റെക്കോർഡ് ചെയ്യുക 🎙️</span>
                </div>
              )}
            </div>

            <div className="duet-record-actions">
              {isRecording ? (
                <button
                  type="button"
                  className="duet-rec-btn stop"
                  onClick={stopRecording}
                >
                  <StopCircle size={18} />
                  <span>റെക്കോർഡിംഗ് നിർത്തൂ (Done Singing)</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="duet-rec-btn start"
                  onClick={startRecording}
                >
                  <Mic size={18} />
                  <span>
                    {userBuffer
                      ? 'വീണ്ടും പാടുക (Re-record Line)'
                      : 'അടുത്ത വരി പാടുക (Record Next Line)'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Duet Mode & Mixing Controls */}
          <div className="duet-settings-card">
            <div className="duet-mode-row">
              <span className="duet-mode-label">ഡ്യുയറ്റ് ശൈലി (Duet Arrangement):</span>
              <div className="duet-mode-toggles">
                <button
                  type="button"
                  className={`duet-mode-pill ${duetMode === 'sequential' ? 'active' : ''}`}
                  onClick={() => setDuetMode('sequential')}
                >
                  🔁 ആദ്യ വരി + മറുപടി വരി (Call & Response)
                </button>
                <button
                  type="button"
                  className={`duet-mode-pill ${duetMode === 'harmony' ? 'active' : ''}`}
                  onClick={() => setDuetMode('harmony')}
                >
                  🎼 ഒന്നിച്ച് പാടാം (Harmonize Together)
                </button>
              </div>
            </div>

            <div className="duet-fx-row">
              <label className="duet-fx-checkbox">
                <input
                  type="checkbox"
                  checked={applyReverb}
                  onChange={(e) => setApplyReverb(e.target.checked)}
                />
                <span>✨ റൊമാന്റിക് എക്കോ & റീവെർബ് (Romance Acoustic Warmth)</span>
              </label>
            </div>

            <div className="duet-volume-row">
              <span className="duet-mode-label">ശബ്ദ ക്രമീകരണം (Volume Balance):</span>
              <div className="duet-volume-sliders">
                <label>
                  <span>{peer?.name || 'Partner'}: {Math.round(partnerVolume * 100)}%</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={partnerVolume}
                    onChange={(e) => setPartnerVolume(parseFloat(e.target.value))}
                  />
                </label>
                <label>
                  <span>{user.name}: {Math.round(userVolume * 100)}%</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={userVolume}
                    onChange={(e) => setUserVolume(parseFloat(e.target.value))}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Merged Duet Preview Section */}
          {mergedBuffer && (
            <div className="duet-merged-preview-card">
              <div className="duet-preview-header">
                <div className="duet-preview-title">
                  <Sparkles size={16} />
                  <strong>
                    {isMixing ? 'മിക്സ് ചെയ്യുന്നു... (Mixing)' : 'നമ്മുടെ പൂർണ്ണ ഗാനം (Full Duet Preview)'}
                  </strong>
                </div>
                <span className="duet-total-duration">
                  {formatSeconds(mergedDuration)}
                </span>
              </div>

              <div className="duet-dual-spectrum">
                {/* Visual spectrum preview with both colors */}
                {Array.from({ length: 32 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`spectrum-bar ${idx % 2 === 0 ? 'partner-bar' : 'user-bar'} ${isPlayingDuet ? 'pulse' : ''}`}
                    style={{ height: `${30 + (idx * 7) % 65}%` }}
                  />
                ))}
              </div>

              <div className="duet-preview-controls">
                <button
                  type="button"
                  className="duet-preview-play-btn"
                  onClick={togglePlayDuet}
                >
                  {isPlayingDuet ? <Pause size={18} /> : <Play size={18} />}
                  <span>{isPlayingDuet ? 'Pause Duet' : 'ഡ്യുയറ്റ് കേൾക്കാം (Play Full Song)'}</span>
                </button>
                <button
                  type="button"
                  className="duet-send-main-btn"
                  onClick={handleSendDuet}
                  disabled={isSending}
                >
                  <Send size={18} />
                  <span>
                    {isSending
                      ? 'പാട്ട് അയക്കുന്നു... (Sending Duet)'
                      : 'ചാറ്റിലേക്ക് പങ്കിടുക (Send Duet to Chat) 🎶'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
