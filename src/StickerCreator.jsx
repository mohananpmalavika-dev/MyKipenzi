import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Image as ImageIcon, Plus, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { Modal } from './components.jsx';
import { clampStickerPan, drawSticker, STICKER_SIZE, validateStickerFile } from './stickerTools.js';

const shapes = [
  ['circle', 'Circle', '●'],
  ['rounded', 'Rounded', '▣'],
  ['heart', 'Heart', '♥'],
  ['star', 'Star', '★'],
  ['original', 'Meme card', '▧'],
];
const colors = [
  ['#ffffff', 'White'],
  ['#ffeaa7', 'Yellow'],
  ['#ff7675', 'Coral'],
  ['#55efc4', 'Mint'],
  ['#74b9ff', 'Blue'],
  ['#17483e', 'Green'],
];
const captions = [
  'Miss you ❤️',
  'Love you 🫶',
  'എന്റെ പ്രിയമേ ❤️',
  'പൊളിച്ചു 🔥',
  'Nakupenda 💚',
  'Our inside joke 😂',
];

export function StickerCreatorModal({
  onClose,
  onSendSticker,
  onSaveToLibrary,
  onError,
  sendDisabled = false,
}) {
  const [image, setImage] = useState(null);
  const [shape, setShape] = useState('heart');
  const [borderWidth, setBorderWidth] = useState(12);
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [caption, setCaption] = useState('');
  const [captionPos, setCaptionPos] = useState('bottom');
  const [filter, setFilter] = useState('none');
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const canvasRef = useRef(null),
    fileInputRef = useRef(null),
    dragRef = useRef(null);
  const loadToken = useRef(0),
    imageUrl = useRef(null),
    actionRef = useRef(false);
  const ready = Boolean(image) && !loading && !busy;
  const reportError = useCallback(
    (message) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );
  const close = () => {
    if (!actionRef.current) onClose();
  };

  useEffect(
    () => () => {
      loadToken.current++;
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    },
    [],
  );

  const handleFile = useCallback(
    (file) => {
      try {
        validateStickerFile(file);
      } catch (e) {
        reportError(e.message);
        return;
      }
      const token = ++loadToken.current;
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
      const url = URL.createObjectURL(file);
      imageUrl.current = url;
      setLoading(true);
      setError('');
      setStatus('');
      const nextImage = new Image();
      const release = () => {
        URL.revokeObjectURL(url);
        if (imageUrl.current === url) imageUrl.current = null;
      };
      nextImage.onload = () => {
        release();
        if (loadToken.current !== token) return;
        setLoading(false);
        if (
          !nextImage.naturalWidth ||
          nextImage.naturalWidth * nextImage.naturalHeight > 24000000
        ) {
          reportError('Choose a smaller image, up to 24 megapixels.');
          return;
        }
        setImage(nextImage);
        setScale(1);
        setPan({ x: 0, y: 0 });
      };
      nextImage.onerror = () => {
        release();
        if (loadToken.current !== token) return;
        setLoading(false);
        reportError('This image could not be opened. Try another JPG, PNG, WebP or GIF.');
      };
      nextImage.src = url;
    },
    [reportError],
  );

  useEffect(() => {
    const paste = (event) => {
      if (loading || busy) return;
      const item = Array.from(event.clipboardData?.items || []).find((value) =>
        value.type.startsWith('image/'),
      );
      if (item) {
        event.preventDefault();
        handleFile(item.getAsFile());
      }
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [handleFile, loading, busy]);

  const render = useCallback(() => {
    if (canvasRef.current && image)
      drawSticker(canvasRef.current, image, {
        shape,
        borderWidth,
        borderColor,
        caption,
        captionPos,
        filter,
        scale,
        pan,
      });
  }, [image, shape, borderWidth, borderColor, caption, captionPos, filter, scale, pan]);
  useEffect(() => {
    try {
      render();
    } catch (e) {
      reportError(e.message);
    }
  }, [render, reportError]);
  useEffect(() => {
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) render();
    });
    return () => {
      active = false;
    };
  }, [render]);

  const pointerDown = (event) => {
    if (!ready || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pan,
      factor: STICKER_SIZE / event.currentTarget.getBoundingClientRect().width,
    };
  };
  const pointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    setPan(
      clampStickerPan(image, shape, scale, {
        x: drag.pan.x + (event.clientX - drag.x) * drag.factor,
        y: drag.pan.y + (event.clientY - drag.y) * drag.factor,
      }),
    );
  };
  const moveWithKeys = (event) => {
    if (!ready) return;
    const steps = {
      ArrowLeft: [-12, 0],
      ArrowRight: [12, 0],
      ArrowUp: [0, -12],
      ArrowDown: [0, 12],
    };
    if (steps[event.key]) {
      event.preventDefault();
      const [x, y] = steps[event.key];
      setPan((old) => clampStickerPan(image, shape, scale, { x: old.x + x, y: old.y + y }));
    }
  };
  const exportSticker = async (action) => {
    if (!ready || actionRef.current) return;
    actionRef.current = true;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await document.fonts?.ready;
      render();
      const canvas = canvasRef.current,
        dataUrl = canvas.toDataURL('image/png');
      if (action === 'save') {
        await onSaveToLibrary(dataUrl);
        setStatus('Saved to My Stickers on this device.');
      } else if (action === 'download') {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'sticker-' + Date.now() + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setStatus('PNG downloaded.');
      } else {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Could not export this sticker. Please try again.');
        await onSendSticker(blob, dataUrl);
      }
    } catch (e) {
      reportError(e.message);
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal title="Custom Couple Stickers" onClose={close} wide>
      <p className="sticker-intro">
        Your photos. Your memes. Your inside jokes.{' '}
        <span lang="ml">നമ്മുടെ സ്വന്തം സ്റ്റിക്കറുകൾ ❤️</span>
      </p>
      <div className="sticker-studio">
        <div className="sticker-studio-canvas-col">
          <div
            className={
              'sticker-canvas-stage ' + (image ? 'has-image ' : '') + (dragOver ? 'drag-over' : '')
            }
            role="group"
            aria-label="Sticker preview. Drag or use arrow keys to reposition the photo."
            tabIndex={image ? 0 : -1}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            onLostPointerCapture={() => {
              dragRef.current = null;
            }}
            onKeyDown={moveWithKeys}
            onDragOver={(event) => {
              event.preventDefault();
              if (!busy && !loading) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              if (!busy && !loading) handleFile(event.dataTransfer.files[0]);
            }}
          >
            <canvas
              ref={canvasRef}
              className="sticker-canvas"
              aria-label="Custom sticker preview"
              hidden={!image}
            />
            {!image && (
              <div className="sticker-upload-empty">
                <div className="empty-icon-wrap">
                  <ImageIcon size={38} />
                </div>
                <strong>Drop a photo or meme</strong>
                <p>
                  JPG, PNG, WebP or GIF · Up to 10 MB
                  <br />
                  You can also paste an image.
                </p>
                <button
                  type="button"
                  className="upload-select-btn"
                  disabled={loading || busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Choose photo or meme
                </button>
              </div>
            )}
            {loading && (
              <div className="sticker-loading" role="status">
                Opening your image…
              </div>
            )}
          </div>
          <p className="sticker-preview-note">
            {image
              ? 'Drag to position · Arrow keys also work'
              : 'Start with a favorite moment or a funny meme'}
            <br />
            512 × 512 PNG · Transparent outside the shape
          </p>
          {image && (
            <div className="canvas-adjustments">
              <label className="zoom-control">
                Zoom
                <input
                  aria-label="Sticker zoom"
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={scale}
                  disabled={!ready}
                  onChange={(e) => {
                    setScale(Number(e.target.value));
                    setPan({ x: 0, y: 0 });
                  }}
                />
                <small>{Math.round(scale * 100)}%</small>
              </label>
              <button
                type="button"
                className="reset-btn"
                disabled={!ready}
                onClick={() => {
                  setScale(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          )}
          {image && (
            <button
              type="button"
              className="change-photo-btn"
              disabled={!ready}
              onClick={() => fileInputRef.current?.click()}
            >
              Change photo or meme
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Upload photo or meme"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            disabled={loading || busy}
            onChange={(event) => {
              if (event.target.files?.[0]) handleFile(event.target.files[0]);
              event.target.value = '';
            }}
          />
          <small className="sticker-local-note">
            Editing stays on this device. GIFs become still stickers.
            <br />
            Send uploads the finished sticker to your chat.
          </small>
        </div>
        <fieldset
          className="sticker-studio-controls-col sticker-controls"
          disabled={loading || busy}
        >
          <legend className="sr-only">Customize your sticker</legend>
          <div className="control-section">
            <span className="section-label">Cutout shape</span>
            <div className="shape-options">
              {shapes.map(([id, label, icon]) => (
                <button
                  type="button"
                  key={id}
                  className={'shape-btn ' + (shape === id ? 'active' : '')}
                  aria-pressed={shape === id}
                  onClick={() => {
                    setShape(id);
                    setScale(1);
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="control-section">
            <span className="section-label">Sticker outline</span>
            <div className="border-controls">
              <div className="border-width-pills">
                {[
                  [0, 'None'],
                  [6, 'Thin'],
                  [12, 'Medium'],
                  [20, 'Thick'],
                ].map(([width, label]) => (
                  <button
                    type="button"
                    key={width}
                    className={'width-pill ' + (borderWidth === width ? 'active' : '')}
                    aria-pressed={borderWidth === width}
                    onClick={() => setBorderWidth(width)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {borderWidth > 0 && (
                <div className="color-palette">
                  {colors.map(([color, label]) => (
                    <button
                      type="button"
                      key={color}
                      aria-label={label + ' outline'}
                      aria-pressed={borderColor === color}
                      className={'color-dot ' + (borderColor === color ? 'active' : '')}
                      style={{ backgroundColor: color }}
                      onClick={() => setBorderColor(color)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="control-section">
            <label className="section-label" htmlFor="sticker-caption">
              Caption
            </label>
            <input
              id="sticker-caption"
              dir="auto"
              className="sticker-caption-input"
              placeholder="Love you, പൊളിച്ചു, or your inside joke…"
              maxLength={60}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="quick-tags">
              {captions.map((text) => (
                <button
                  type="button"
                  key={text}
                  className="quick-tag-chip"
                  onClick={() => setCaption(text)}
                >
                  {text}
                </button>
              ))}
            </div>
            <label className="sticker-caption-position">
              Caption position
              <select
                aria-label="Caption position"
                value={captionPos}
                onChange={(e) => setCaptionPos(e.target.value)}
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>
          </div>
          <div className="control-section">
            <span className="section-label">Photo filter</span>
            <div className="filter-chips">
              {[
                ['none', 'Original'],
                ['vibrant', 'Vibrant'],
                ['warm', 'Warm'],
                ['noir', 'B&W'],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  className={'filter-chip ' + (filter === id ? 'active' : '')}
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="sticker-actions-footer">
            <button
              type="button"
              className="save-library-btn"
              disabled={!ready}
              onClick={() => void exportSticker('save')}
            >
              <Plus size={14} /> Save to My Stickers
            </button>
            <button
              type="button"
              className="save-library-btn"
              disabled={!ready}
              onClick={() => void exportSticker('download')}
            >
              <Download size={14} /> Download PNG
            </button>
            <button
              type="button"
              className="send-sticker-btn"
              disabled={!ready || sendDisabled}
              onClick={() => void exportSticker('send')}
            >
              <Sparkles size={15} />
              {busy ? 'Working…' : 'Send as Sticker'}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {status && (
            <p className="sticker-save-status" role="status">
              {status}
            </p>
          )}
        </fieldset>
      </div>
    </Modal>
  );
}
