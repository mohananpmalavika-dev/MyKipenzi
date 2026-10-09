import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Wand2,
  Sparkles,
  Eye,
  EyeOff,
  Clock,
  RotateCcw,
  Heart,
  LoaderCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  FOG_THEMES,
  parseInvisibleInk,
  playScratchChime,
  playFogWhoosh,
  playRevealTada,
  triggerScratchHaptics,
  triggerRevealHaptics,
} from './invisibleInk.js';
import { fileBlob } from './api.js';

export function InvisibleInkCard({
  message,
  text: rawText,
  attachment: overrideAttachment,
  mine,
  onError,
  isPreview: _isPreview = false,
}) {
  const text = message ? message.text : rawText || '';
  const attachment = message ? message.attachment : overrideAttachment;
  const parsed = parseInvisibleInk(text);
  const theme = FOG_THEMES[parsed.theme] || FOG_THEMES.rose;

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isScratchingRef = useRef(false);
  const lastPointRef = useRef(null);
  const timerRef = useRef(null);

  const [scratchPercent, setScratchPercent] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isConcealed, setIsConcealed] = useState(true);
  const [countdown, setCountdown] = useState(parsed.concealDelay || 8);
  const [sparkles, setSparkles] = useState([]);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Load attachment media blob if present
  useEffect(() => {
    let active = true;
    let objectUrl = null;

    if (attachment && (attachment.mime?.startsWith('image/') || attachment.mime?.startsWith('video/'))) {
      if (attachment.dataUrl) {
        setMediaUrl(attachment.dataUrl);
      } else if (attachment.id) {
        setMediaLoading(true);
        fileBlob(attachment.id)
          .then((blob) => {
            if (active) {
              objectUrl = URL.createObjectURL(blob);
              setMediaUrl(objectUrl);
            }
          })
          .catch((err) => {
            if (onError) onError(err.message);
          })
          .finally(() => {
            if (active) setMediaLoading(false);
          });
      }
    }

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, onError]);

  // Redraw the magical sparkling fog layer on canvas
  const drawFog = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Reset composite operation to draw opaque fog
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);

    // 1. Rich Dreamy Gradient Background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, theme.fogColors[0]);
    grad.addColorStop(0.5, theme.fogColors[1]);
    grad.addColorStop(1, theme.fogColors[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Swirling cloud puffs
    const puffCount = Math.max(12, Math.floor((width * height) / 3500));
    for (let i = 0; i < puffCount; i++) {
      const px = ((i * 12345) % width);
      const py = ((i * 67891) % height);
      const radius = 35 + ((i * 17) % 45);

      const radGrad = ctx.createRadialGradient(px, py, 2, px, py, radius);
      radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      radGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
      radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Sprinkle twinkling stars & sparkles across the fog
    const starChars = ['✦', '★', '✧', '♥', '✨'];
    const starCount = Math.min(18, Math.floor(width / 18));
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let s = 0; s < starCount; s++) {
      const sx = ((s * 39 + 20) % (width - 30)) + 15;
      const sy = ((s * 53 + 15) % (height - 30)) + 15;
      const char = starChars[s % starChars.length];
      const color = theme.sparkleColors[s % theme.sparkleColors.length];

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillText(char, sx, sy);
    }
    ctx.shadowBlur = 0;

    // 4. Centered Call-to-Action Shimmer Badge
    const badgeW = Math.min(width * 0.84, 260);
    const badgeH = 46;
    const badgeX = (width - badgeW) / 2;
    const badgeY = (height - badgeH) / 2;

    // Frosted Pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 23);
    ctx.fill();
    ctx.stroke();

    // Badge Text
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px "DM Sans", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🪄 Invisible Ink', width / 2, badgeY + 17);

    ctx.fillStyle = theme.primaryColor;
    ctx.font = '500 11px "DM Sans", -apple-system, sans-serif';
    ctx.fillText('✨ Scratch to reveal', width / 2, badgeY + 33);
  }, [theme]);

  // Resize canvas to match container dimensions
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = Math.round(rect.width) || 280;
    const h = Math.round(rect.height) || 120;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      drawFog();
    }
  }, [drawFog]);

  useEffect(() => {
    updateCanvasDimensions();
    const timer = setTimeout(updateCanvasDimensions, 100);
    window.addEventListener('resize', updateCanvasDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, [updateCanvasDimensions, mediaUrl]);

  // Calculate scratched area percentage
  const calculateScratchCoverage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return 0;

    // Sample pixels in a grid to keep performance ultra-high
    const sampleStep = 8;
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      let transparentPixels = 0;
      let totalSamples = 0;

      for (let y = 0; y < h; y += sampleStep) {
        for (let x = 0; x < w; x += sampleStep) {
          const alphaIndex = (y * w + x) * 4 + 3;
          if (data[alphaIndex] < 128) {
            transparentPixels++;
          }
          totalSamples++;
        }
      }

      const percent = totalSamples > 0 ? (transparentPixels / totalSamples) * 100 : 0;
      return Math.round(percent);
    } catch {
      return 0;
    }
  };

  // Erase fog at given coordinates with soft feathered brush
  const scratchAt = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';

    const radius = 28;
    const grad = ctx.createRadialGradient(x, y, 6, x, y, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // If there was a previous point, connect with a thick stroke to prevent gaps
    if (lastPointRef.current) {
      ctx.lineWidth = radius * 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastPointRef.current = { x, y };

    // Emit light sparkle particle at cursor/touch
    spawnSparkle(x, y);
    playScratchChime();
    triggerScratchHaptics();

    // Update scratch percentage
    const coverage = calculateScratchCoverage();
    setScratchPercent(coverage);

    if (coverage > 28 && !isRevealed) {
      setIsRevealed(true);
      setIsConcealed(false);
      playRevealTada();
      triggerRevealHaptics();
      startAutoConcealCountdown();
    } else if (coverage > 10 && isConcealed) {
      setIsConcealed(false);
      startAutoConcealCountdown();
    }
  };

  const spawnSparkle = (x, y) => {
    const id = Date.now() + Math.random();
    const newSparkle = {
      id,
      x: x + (Math.random() * 20 - 10),
      y: y + (Math.random() * 20 - 10),
      color: theme.sparkleColors[Math.floor(Math.random() * theme.sparkleColors.length)],
      size: 10 + Math.random() * 8,
    };
    setSparkles((prev) => [...prev.slice(-12), newSparkle]);
    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => s.id !== id));
    }, 600);
  };

  // Auto-conceal countdown timer logic
  const startAutoConcealCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const delay = parsed.concealDelay || 8;
    setCountdown(delay);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          handleRefog();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [parsed.concealDelay]);

  // Re-fog action: covers the secret back up in magical mist
  const handleRefog = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    playFogWhoosh();
    drawFog();
    setIsConcealed(true);
    setIsRevealed(false);
    setScratchPercent(0);
    setCountdown(parsed.concealDelay || 8);
  }, [drawFog, parsed.concealDelay]);

  // Reveal all action for easy reading
  const handleRevealAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setScratchPercent(100);
    setIsRevealed(true);
    setIsConcealed(false);
    playRevealTada();
    triggerRevealHaptics();
    startAutoConcealCountdown();
  };

  // Pointer event handlers
  const handlePointerDown = (e) => {
    isScratchingRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    scratchAt(x, y);
  };

  const handlePointerMove = (e) => {
    if (!isScratchingRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    scratchAt(x, y);
  };

  const handlePointerUp = () => {
    isScratchingRef.current = false;
    lastPointRef.current = null;
    const coverage = calculateScratchCoverage();
    if (coverage > 8 && !timerRef.current) {
      startAutoConcealCountdown();
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div
      className={`invisible-ink-card ${mine ? 'mine' : 'peer'} ${isRevealed ? 'revealed' : ''}`}
      style={{
        '--ink-primary': theme.primaryColor,
        '--ink-glow': theme.glowColor,
        '--ink-border': theme.borderGlow,
        '--ink-bg': theme.cardBg,
      }}
    >
      {/* Top Banner with Fog Theme & Sparkle Indicator */}
      <div className="invisible-ink-header">
        <div className="invisible-ink-title">
          <Wand2 size={16} className="ink-wand-icon" />
          <strong>Invisible Ink 🪄 ({theme.name})</strong>
        </div>
        <div className="invisible-ink-meta-tags">
          <span className="ink-theme-pill">{theme.emoji} {theme.name}</span>
          {!isConcealed && (
            <span className="ink-countdown-pill" title={`Auto-refog in ${countdown}s`}>
              <Clock size={12} /> {countdown}s
            </span>
          )}
        </div>
      </div>

      {/* Main Secret Content Stage */}
      <div
        ref={containerRef}
        className="invisible-ink-stage"
        style={{ minHeight: attachment ? '220px' : '100px' }}
      >
        {/* Layer 1: Secret Content Underneath */}
        <div className="invisible-ink-secret-content">
          {attachment && (
            <div className="invisible-ink-media-wrap">
              {mediaLoading ? (
                <div className="ink-media-loading">
                  <LoaderCircle size={24} className="spin" />
                  <span>Loading secret photo...</span>
                </div>
              ) : mediaUrl ? (
                <img
                  src={mediaUrl}
                  alt="Secret Invisible Ink attachment"
                  className="ink-secret-photo"
                  onLoad={updateCanvasDimensions}
                />
              ) : (
                <div className="ink-media-placeholder">
                  <Heart size={32} />
                  <span>Secret photo</span>
                </div>
              )}
            </div>
          )}

          {parsed.content && (
            <div className="invisible-ink-text-wrap">
              <p className="ink-secret-text" dir="auto">
                {parsed.content}
              </p>
            </div>
          )}

          {!attachment && !parsed.content && (
            <p className="ink-secret-text italic" dir="auto">
              (Secret message)
            </p>
          )}
        </div>

        {/* Layer 2: Interactive Scratch Canvas Fog Layer on Top */}
        <canvas
          ref={canvasRef}
          className={`invisible-ink-canvas ${isConcealed ? 'concealed' : 'scratched'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label="Magic fog canvas. Scratch to reveal secret message"
        />

        {/* Sparkle particle dust animations on touch */}
        {sparkles.map((s) => (
          <span
            key={s.id}
            className="ink-touch-sparkle"
            style={{
              left: `${s.x}px`,
              top: `${s.y}px`,
              color: s.color,
              fontSize: `${s.size}px`,
            }}
          >
            ✦
          </span>
        ))}
      </div>

      {/* Footer Controls & Live Countdown Notice */}
      <div className="invisible-ink-footer">
        <div className="invisible-ink-status">
          {isConcealed ? (
            <span className="ink-hint-text">
              <Sparkles size={13} className="sparkle-anim" /> Scratch to reveal
            </span>
          ) : (
            <span className="ink-revealed-notice">
              <Eye size={13} /> Revealed ({scratchPercent}%) · Conceals again in {countdown}s 🌫️
            </span>
          )}
        </div>

        <div className="invisible-ink-actions">
          {!isConcealed && (
            <button
              type="button"
              className="ink-action-btn refog-btn"
              onClick={handleRefog}
              title="Conceal again"
            >
              <EyeOff size={13} /> Hide
            </button>
          )}
          {isConcealed && (
            <button
              type="button"
              className="ink-action-btn reveal-btn"
              onClick={handleRevealAll}
              title="Reveal all"
            >
              <Eye size={13} /> Reveal
            </button>
          )}
          {!isConcealed && (
            <button
              type="button"
              className="ink-action-btn reset-btn"
              onClick={handleRevealAll}
              title="Clear fog"
            >
              <RotateCcw size={13} /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
