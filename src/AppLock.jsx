import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Fingerprint, LockKeyhole } from 'lucide-react';
import { lockStore } from './appLockStore.js';
import { failedAttempt, matchesPin, pinRecord, registerDevice, unlockDevice, deviceAvailable } from './appLockSecurity.js';

const LockContext = createContext(null);
const errorText = (error) => error.name === 'NotAllowedError' ? 'Device verification cancelled or unavailable. You can use your PIN.' : error.message;

export function AppLock({ user, children }) {
  const [record, setRecord] = useState(null);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(true);
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(false);
  const [now, setNow] = useState(Date.now());
  const generation = useRef(0);
  const working = useRef(false);
  const load = async () => {
    try {
      const saved = await lockStore(user.id);
      setRecord(saved); setLocked(!!saved); setReady(true); setError('');
    } catch (e) { setError(e.message); }
  };
  useEffect(() => {
    let active = true;
    lockStore(user.id).then(saved => {
      if (active) { setRecord(saved); setLocked(!!saved); setReady(true); }
    }).catch(e => { if (active) setError(e.message); });
    deviceAvailable().then(value => { if (active) setAvailable(value); });
    const currentGeneration = generation;
    return () => { active = false; currentGeneration.current++; };
  }, [user.id]);
  useEffect(() => {
    const hide = event => {
      if (record && (event.type === 'pagehide' || document.visibilityState === 'hidden')) {
        generation.current++; setLocked(true); setPin(''); setError('');
      }
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    return () => { document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', hide); };
  }, [record]);
  useEffect(() => {
    if (!locked || !record?.retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [locked, record?.retryAt]);
  const save = async value => { await lockStore(user.id, value); setRecord(value); };
  const lock = () => { generation.current++; setLocked(true); setPin(''); setError(''); };
  const unlock = async biometric => {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    const version = generation.current;
    try {
      if (biometric) await unlockDevice(record.device);
      else {
        if (record.retryAt > Date.now()) throw new Error('Too many attempts. Please wait before trying your PIN again.');
        if (!await matchesPin(pin, record.pin)) {
          await save(failedAttempt(record));
          throw new Error('Incorrect PIN. Please try again.');
        }
      }
      if (version !== generation.current || document.visibilityState === 'hidden') return;
      await save({ ...record, failures: 0, retryAt: 0 });
      if (version === generation.current && document.visibilityState !== 'hidden') setLocked(false);
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
  return <LockContext.Provider value={{ record, save, lock, available, user }}>{children}</LockContext.Provider>;
}

export function AppLockSettings() {
  const controls = useContext(LockContext);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const working = useRef(false);
  if (!controls) return null;
  const { record, save, lock, available, user } = controls;
  const run = async action => {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try { await action(); setPin(''); setConfirm(''); }
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
    <div className="app-lock-actions">
      {!record ? <button type="button" className="secondary" disabled={busy || pin.length !== 6 || pin !== confirm} onClick={() => void run(async () => save({ pin: await pinRecord(pin), failures: 0, retryAt: 0 }))}>Enable PIN lock</button> : <>
        <button type="button" className="secondary" disabled={busy} onClick={lock}>Lock now</button>
        <button type="button" className="secondary" disabled={busy || pin.length !== 6 || (!record.device && !available)} onClick={() => void run(async () => {
          await authorize();
          const device = record.device ? null : await registerDevice(user);
          await save({ ...record, device, failures: 0, retryAt: 0 });
        })}>{record.device ? 'Disable biometric unlock' : 'Enable Fingerprint / Face ID'}</button>
        <button type="button" className="text-btn" disabled={busy || pin.length !== 6} onClick={() => void run(async () => { await authorize(); await save(null); })}>Disable app lock</button>
      </>}
    </div>
    <small>{available ? 'Your device may use Face ID, fingerprint, or its screen lock. Biometric data stays on your device.' : 'Biometric unlock needs HTTPS (or localhost) and a supported device with a screen lock.'}</small>
  </section>;
}
