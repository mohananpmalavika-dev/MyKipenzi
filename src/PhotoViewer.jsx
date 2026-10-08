import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Minus, Plus, X } from 'lucide-react';
import { downloadFile } from './api.js';

export function PhotoViewer({ src, attachment, onClose, onError, returnFocus }) {
  const dialog = useRef(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const previous = returnFocus?.current || document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.showModal();
    return () => {
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => previous?.focus?.());
    };
  }, [returnFocus]);
  return createPortal(<dialog ref={dialog} className="photo-viewer" aria-label={'Photo: ' + attachment.name} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="photo-viewer-toolbar">
      <strong>{attachment.name}</strong>
      <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}><Minus /></button>
      <button type="button" aria-label="Reset zoom" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
      <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + 0.5))}><Plus /></button>
      <button type="button" aria-label="Download photo" onClick={() => void downloadFile(attachment).catch(error => onError(error.message))}><Download /></button>
      <button type="button" aria-label="Close photo viewer" autoFocus onClick={onClose}><X /></button>
    </div>
    <div className="photo-viewer-stage" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <img src={src} alt={attachment.name} style={{ width: zoom === 1 ? undefined : (zoom * 100) + '%', maxWidth: zoom === 1 ? '100%' : 'none', maxHeight: zoom === 1 ? '100%' : 'none' }} />
    </div>
  </dialog>, document.body);
}
