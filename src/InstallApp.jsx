import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from './components.jsx';

const InstallContext = createContext(null);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function InstallProvider({ children }) {
  const prompt = useRef(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const capture = (event) => {
      event.preventDefault();
      prompt.current = event;
      setAvailable(true);
    };
    const completed = () => {
      prompt.current = null;
      setAvailable(false);
      setInstalled(true);
    };
    const display = window.matchMedia('(display-mode: standalone)');
    const changed = () => setInstalled(isStandalone());
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', completed);
    display.addEventListener('change', changed);
    return () => {
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', completed);
      display.removeEventListener('change', changed);
    };
  }, []);
  const install = async () => {
    const event = prompt.current;
    if (!event) return false;
    prompt.current = null;
    setAvailable(false);
    setBusy(true);
    try {
      await event.prompt();
      await event.userChoice;
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };
  return <InstallContext.Provider value={{ installed, available, busy, install }}>{children}</InstallContext.Provider>;
}

export function InstallApp({ compact = false }) {
  const { installed, available, busy, install } = useContext(InstallContext);
  const [instructions, setInstructions] = useState(false);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (installed) return null;
  const start = async () => {
    if (!available || !(await install())) setInstructions(true);
  };
  return (
    <>
      <button type="button" className={compact ? 'icon-btn install-compact' : 'install-app-btn'} title="Install Kipenzi app" aria-label="Install Kipenzi app" disabled={busy} onClick={() => void start()}>
        <Download size={compact ? 20 : 18} />
        {!compact && <span>{busy ? 'Opening install…' : 'Install app'}</span>}
      </button>
      {instructions && (
        <Modal title="Install Kipenzi on your phone" onClose={() => setInstructions(false)}>
          <p>Keep Kipenzi on your Home Screen and open it like an app.</p>
          {ios ? (
            <ol className="install-steps">
              <li>Open this website in Safari.</li>
              <li>Tap Share, then Add to Home Screen.</li>
              <li>Turn on Open as Web App if shown, then tap Add.</li>
            </ol>
          ) : (
            <ol className="install-steps">
              <li>Open this website in Chrome or your phone’s browser.</li>
              <li>Open the browser menu and choose Install app or Add to Home screen.</li>
              <li>Confirm Install or Add.</li>
            </ol>
          )}
          <p className="install-note">If you opened this link inside another app, open it in your phone’s browser first. Chat and calls need an internet connection.</p>
          {available && <button type="button" className="primary" disabled={busy} onClick={() => void start()}>Install app</button>}
        </Modal>
      )}
    </>
  );
}
