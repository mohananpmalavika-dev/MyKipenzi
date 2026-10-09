import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Fingerprint, LockKeyhole } from 'lucide-react';
import { lockStore } from './appLockStore.js';
import { failedAttempt, matchesPin, pinRecord, pinDestination, registerDevice, unlockDevice, deviceAvailable } from './appLockSecurity.js';
import { DecoyLists } from './DecoyLists.jsx';

const LockContext = createContext(null);
const errorText = error => error.name === 'NotAllowedError' ? 'Device verification cancelled or unavailable. You can use your PIN.' : error.message;
async function clearPrivateNotifications(userId) {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const notifications = await registration?.getNotifications();
    for (const notification of notifications || []) if (notification.data?.user_id === userId) notification.close();
  } catch { /* Notification cleanup is optional where the browser does not expose it. */ }
}

export function AppLock({ user, children }) {
  const [record, setRecord] = useState(null);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(true);
  const [destination, setDestination] = useState('private');
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(false);
  const [now, setNow] = useState(Date.now());
  const generation = useRef(0);
  const working = useRef(false);
  const channel = useRef(null);
  const load = async () => {
    try {
      const saved = await lockStore(user.id);
      setRecord(saved); setLocked(!!saved); setDestination('private'); setReady(true); setError('');
    } catch (e) { setError(e.message); }
  };
  useEffect(() => {
    let active = true;
    lockStore(user.id).then(saved => {
      if (active) { setRecord(saved); setLocked(!!saved); setReady(true); }
    }).catch(e => { if (active) setError(e.message); });
    deviceAvailable().then(value => { if (active) setAvailable(value); });
    if (globalThis.BroadcastChannel) {
      channel.current = new BroadcastChannel('kipenzi-lock-control');
      channel.current.onmessage = event => {
        if (event.data?.user_id !== user.id) return;
        generation.current++; setLocked(true); setDestination('private'); setPin(''); setError('');
        lockStore(user.id).then(saved => {
          if (active) { setRecord(saved); setLocked(!!saved); setReady(true); }
        }).catch(e => { if (active) setError(e.message); });
      };
    }
    const currentGeneration = generation;
    const currentChannel = channel.current;
    return () => { active = false; currentGeneration.current++; currentChannel?.close(); };
  }, [user.id]);
  const lock = () => {
    generation.current++; setLocked(true); setDestination('private'); setPin(''); setError('');
    channel.current?.postMessage({ user_id: user.id });
    if (record?.decoyPin || record?.privacyMode) void clearPrivateNotifications(user.id);
  };
  useEffect(() => {
    const hide = event => {
      if (record && (event.type === 'pagehide' || document.visibilityState === 'hidden')) {
        generation.current++; setLocked(true); setDestination('private'); setPin(''); setError('');
      }
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', hide); };
  }, [record]);
  useEffect(() => {
    if (!record || locked || !record.autoLockMinutes) return;
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        generation.current++; setLocked(true); setDestination('private'); setPin(''); setError('');
      }, record.autoLockMinutes * 60 * 1000);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer, true));
    resetTimer();
    return () => { clearTimeout(timeout); events.forEach(event => document.removeEventListener(event, resetTimer, true)); };
  }, [record, locked]);
  useEffect(() => {
    if (!locked || !record?.retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [locked, record?.retryAt]);
  const save = async value => {
    await lockStore(user.id, value);
    setRecord(value);
    channel.current?.postMessage({ user_id: user.id });
    if (value?.decoyPin || value?.privacyMode) void clearPrivateNotifications(user.id);
  };
  const unlock = async biometric => {
    if (working.current || !record) return;
    working.current = true; setBusy(true); setError('');
    const version = generation.current;
    try {
      let target = 'private';
      if (biometric) await unlockDevice(record.device);
      else {
        if (record.retryAt > Date.now()) throw new Error('Too many attempts. Please wait before trying your PIN again.');
        target = await pinDestination(pin, record);
        if (!target) {
          const failed = failedAttempt(record);
          await lockStore(user.id, failed);
          setRecord(failed);
          throw new Error('Incorrect PIN. Please try again.');
        }
      }
      if (version !== generation.current || document.visibilityState === 'hidden') return;
      const reset = { ...record, failures: 0, retryAt: 0 };
      await lockStore(user.id, reset);
      if (version === generation.current && document.visibilityState !== 'hidden') {
        setRecord(reset); setDestination(target); setLocked(false);
        if (target === 'decoy') {
          channel.current?.postMessage({ user_id: user.id });
          void clearPrivateNotifications(user.id);
        }
      }
      setPin('');
    } catch (e) { setError(errorText(e)); setPin(''); }
    finally { working.current = false; setBusy(false); setNow(Date.now()); }
  };
  if (!ready || locked) return <main className="app-lock-page"><section className="app-lock-card" aria-label="App lock">
    <LockKeyhole size={36} /><h1>Sanctuary locked</h1>
    <p>{ready ? 'Unlock your private space. (ആപ്പ് അൺലോക്ക് ചെയ്യൂ)' : 'Checking app lock…'}</p>
    {error && <p role="alert">{error}</p>}
    {!ready ? error && <button className="primary" onClick={() => void load()}>Retry</button> : <>
      {record?.device && available && <button className="primary" disabled={busy} onClick={() => void unlock(true)}><Fingerprint size={20} /> Fingerprint / Face ID</button>}
      <form onSubmit={e => { e.preventDefault(); void unlock(false); }}>
        <label>6-digit PIN<input autoFocus type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} disabled={busy} required /></label>
        {record?.retryAt > now && <p role="status">Try PIN again in {Math.ceil((record.retryAt - now) / 1000)} seconds.</p>}
        <button className="secondary" disabled={busy || pin.length !== 6 || record?.retryAt > now}>{busy ? 'Verifying…' : 'Unlock with PIN'}</button>
      </form>
    </>}
  </section></main>;
  if (destination === 'decoy') return <DecoyLists userId={user.id} onLock={lock} />;
  return <LockContext.Provider value={{ record, save, lock, available, user }}>{children}</LockContext.Provider>;
}

export function AppLockSettings() {
  const controls = useContext(LockContext);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [decoy, setDecoy] = useState('');
  const [decoyConfirm, setDecoyConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [autoLockMinutes, setAutoLockMinutes] = useState(5);
  const [privacyMode, setPrivacyMode] = useState(false);
  const working = useRef(false);
  const record = controls?.record;
  useEffect(() => {
    setAutoLockMinutes(record?.autoLockMinutes ?? 5);
    setPrivacyMode(record?.privacyMode || false);
  }, [record]);
  if (!controls) return null;
  const { save, lock, available, user } = controls;
  const run = async action => {
    if (working.current) return;
    working.current = true; setBusy(true); setError(''); setStatus('');
    try { await action(); setPin(''); setConfirm(''); setDecoy(''); setDecoyConfirm(''); }
    catch (e) { setError(errorText(e)); }
    finally { working.current = false; setBusy(false); }
  };
  const authorize = async () => {
    if (record.retryAt > Date.now()) throw new Error('Too many attempts. Wait before trying again.');
    if (!await matchesPin(pin, record.pin)) {
      await save(failedAttempt(record));
      throw new Error('Incorrect current PIN.');
    }
  };
  return <section className="app-lock-settings">
    <h3><Fingerprint size={18} /> App Lock (ആപ്പ് ലോക്ക്)</h3>
    <p>Lock this browser when you leave the app or reload. Your PIN remains available.</p>
    <p>{record ? record.device ? 'PIN + biometric unlock enabled' : 'PIN lock enabled' : 'App lock is off'}</p>
    <label>{record ? 'Current 6-digit PIN' : 'Choose a 6-digit PIN'}<input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} disabled={busy} /></label>
    {!record && <label>Confirm PIN<input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))} disabled={busy} /></label>}
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    {record && <>
      <label>Auto-lock after inactivity<select value={autoLockMinutes} onChange={e => setAutoLockMinutes(Number(e.target.value))} disabled={busy}>
        {[1, 2, 5, 10, 15, 30].map(minutes => <option key={minutes} value={minutes}>{minutes} {minutes === 1 ? 'minute' : 'minutes'}</option>)}
        <option value={0}>Never (manual only)</option>
      </select></label>
      <label className="checkbox-label"><input type="checkbox" checked={privacyMode} onChange={e => setPrivacyMode(e.target.checked)} disabled={busy} /><span>Hide background notification previews on this browser<small>Use a neutral notification without sender or content. Always enabled when a Decoy PIN is set.</small></span></label>
      <button type="button" className="secondary" disabled={busy || pin.length !== 6} onClick={() => void run(async () => {
        await authorize(); await save({ ...record, failures: 0, retryAt: 0, autoLockMinutes, privacyMode }); setStatus('Lock settings saved.');
      })}>Save Settings</button>
      <section className="decoy-settings" aria-label="Decoy PIN settings">
        <h4>🎭 Decoy PIN · കപട പിൻ കോഡ്</h4>
        <p>The real PIN opens your chat. A different Decoy PIN opens an ordinary grocery list. Chat, calls, and private alerts stay unmounted in the decoy screen.</p>
        <p>{record.decoyPin ? 'Decoy PIN is enabled on this browser.' : 'Decoy PIN is off.'}</p>
        <label>Choose a Decoy PIN<input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={decoy} onChange={e => setDecoy(e.target.value.replace(/\D/g, ''))} disabled={busy} /></label>
        <label>Confirm Decoy PIN<input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={decoyConfirm} onChange={e => setDecoyConfirm(e.target.value.replace(/\D/g, ''))} disabled={busy} /></label>
        <button type="button" className="secondary" disabled={busy || pin.length !== 6 || decoy.length !== 6 || decoy !== decoyConfirm} onClick={() => void run(async () => {
          await authorize();
          if (await matchesPin(decoy, record.pin)) throw new Error('Choose a Decoy PIN different from your real PIN.');
          await save({ ...record, decoyPin: await pinRecord(decoy), failures: 0, retryAt: 0 });
          setStatus('Decoy PIN saved. Lock the app to try your grocery list.');
        })}>{record.decoyPin ? 'Change Decoy PIN' : 'Enable Decoy PIN'}</button>
        {record.decoyPin && <button type="button" className="text-btn" disabled={busy || pin.length !== 6} onClick={() => void run(async () => {
          await authorize(); await save({ ...record, decoyPin: null, failures: 0, retryAt: 0 }); setStatus('Decoy PIN disabled.');
        })}>Disable Decoy PIN</button>}
      </section>
    </>}
    <div className="app-lock-actions">
      {!record ? <button type="button" className="secondary" disabled={busy || pin.length !== 6 || pin !== confirm} onClick={() => void run(async () => save({ pin: await pinRecord(pin), failures: 0, retryAt: 0, autoLockMinutes: 5, privacyMode: false }))}>Enable PIN lock</button> : <>
        <button type="button" className="secondary" disabled={busy} onClick={lock}>Lock now</button>
        <button type="button" className="secondary" disabled={busy || pin.length !== 6 || (!record.device && !available)} onClick={() => void run(async () => {
          await authorize(); const device = record.device ? null : await registerDevice(user);
          await save({ ...record, device, failures: 0, retryAt: 0 });
        })}>{record.device ? 'Disable biometric unlock' : 'Enable Fingerprint / Face ID'}</button>
        <button type="button" className="text-btn" disabled={busy || pin.length !== 6} onClick={() => void run(async () => { await authorize(); await save(null); })}>Disable app lock</button>
      </>}
    </div>
    <small>{available ? 'Device verification requires a fingerprint, face, or device PIN.' : 'Biometric verification is unavailable here. Your PIN still works.'} This browser lock does not encrypt chat history.</small>
  </section>;
}
