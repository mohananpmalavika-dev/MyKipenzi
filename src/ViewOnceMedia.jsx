import './viewOnce.css';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, LoaderCircle } from 'lucide-react';
import { openViewOnce } from './api.js';

function OnceViewer({ media, onClose, returnFocus }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = returnFocus.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.showModal();
    const leave = () => { if (document.hidden) onClose(); };
    document.addEventListener('visibilitychange', leave);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('visibilitychange', leave);
      requestAnimationFrame(() => {
        if (previous?.disabled) previous.parentElement?.focus();
        else previous?.focus();
      });
    };
  }, [onClose, returnFocus]);
  return createPortal(<dialog ref={dialog} className="photo-viewer view-once-viewer" aria-label="View-once media" onContextMenu={event => event.preventDefault()} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="photo-viewer-toolbar"><strong>① View once</strong><span>Closing removes this media</span><button type="button" aria-label="Close view-once media" autoFocus onClick={onClose}><X /></button></div>
    <div className="photo-viewer-stage">
      {media.mime.startsWith('video/') ? <video src={media.url} controls autoPlay controlsList="nodownload noremoteplayback" disablePictureInPicture onEnded={onClose} onError={onClose} /> : <img src={media.url} alt="View-once photo" draggable={false} onError={onClose} />}
    </div>
  </dialog>, document.body);
}

export function ViewOnceMedia({ message, mine, onError }) {
  const [media, setMedia] = useState(null);
  const [busy, setBusy] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const trigger = useRef(null);
  const session = useRef({ active: true, url: null, controller: null, pending: false });
  useEffect(() => {
    const state = session.current;
    state.active = true;
    return () => {
      state.active = false;
      state.controller?.abort();
      if (state.url) URL.revokeObjectURL(state.url);
    };
  }, []);
  const close = useRef(() => {
    if (session.current.url) URL.revokeObjectURL(session.current.url);
    session.current.url = null;
    setMedia(null);
  }).current;
  const open = async () => {
    const state = session.current;
    if (state.pending || consumed || message.view_once_opened_at || mine) return;
    state.pending = true;
    state.controller = new AbortController();
    setBusy(true);
    try {
      const blob = await openViewOnce(message.id, state.controller.signal);
      if (!state.active) return;
      setConsumed(true);
      if (document.hidden) return;
      state.url = URL.createObjectURL(blob);
      setMedia({ url: state.url, mime: blob.type });
    } catch (error) {
      if (state.active) {
        if (error.status === 410) setConsumed(true);
        if (error.name !== 'AbortError') onError(error.message);
      }
    } finally {
      state.pending = false;
      if (state.active) setBusy(false);
    }
  };
  const opened = consumed || Boolean(message.view_once_opened_at);
  const label = message.attachment?.mime?.startsWith('video/') ? 'Video' : 'Photo';
  return <div className="view-once-card" tabIndex={-1}>
    <button ref={trigger} type="button" disabled={mine || opened || busy || message.deleted_at} onClick={() => void open()} aria-label={opened ? 'View-once media opened' : 'Open view-once ' + label.toLowerCase()}>
      {busy ? <LoaderCircle size={20} className="spin" /> : <span className="view-once-symbol">①</span>}
      <strong>{opened ? 'Opened' : busy ? 'Opening…' : label + ' · View once'}</strong>
    </button>
    {!opened && <small>{mine ? 'Your partner can open this once.' : 'Open once. Closing or leaving the viewer removes the media.'}</small>}
    {media && <OnceViewer media={media} onClose={close} returnFocus={trigger} />}
  </div>;
}
