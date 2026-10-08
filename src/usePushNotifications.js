import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

function keyBytes(key) {
  const decoded = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}
async function registration() {
  const worker = await navigator.serviceWorker.register('/sw.js', { type: 'module', updateViaCache: 'none' });
  await worker.update();
  if (worker.waiting) worker.waiting.postMessage({ type: 'ACTIVATE_PUSH' });
  await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('App setup is still loading. Please try again.')), 15000))]);
  return worker;
}
function preference(userId) {
  try { return localStorage.getItem(`kipenzi-push:${userId}`) === 'on'; }
  catch { return false; }
}
function savePreference(userId, enabled) {
  try { localStorage.setItem(`kipenzi-push:${userId}`, enabled ? 'on' : 'off'); }
  catch { /* Notifications can still be enabled for this session. */ }
}
export function usePushNotifications(userId, onError) {
  const supported = window.isSecureContext && 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
  const [configured, setConfigured] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const config = await api('/notifications/config');
        if (!active) return;
        setConfigured(config);
        if (supported && preference(userId) && Notification.permission === 'granted') {
          const worker = await registration();
          const subscription = await worker.pushManager.getSubscription();
          if (subscription && active) {
            await api('/notifications/subscription', { method: 'POST', body: subscription.toJSON() });
            if (active) setEnabled(true);
          }
        }
      } catch { /* The enable button can retry setup if connectivity fails. */ }
    };
    void restore();
    return () => { active = false; };
  }, [userId, supported]);
  const enable = useCallback(async () => {
    if (!supported) return onError('Open Kipenzi in Chrome, or install it on your iPhone Home Screen and open the app to enable notifications.');
    if (!configured?.enabled) return onError('Background notifications need server setup before they can be enabled.');
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Allow notifications in your phone or browser settings, then try again.');
      const worker = await registration();
      let subscription = await worker.pushManager.getSubscription();
      if (subscription?.options.applicationServerKey) {
        const existing = new Uint8Array(subscription.options.applicationServerKey);
        const desired = keyBytes(configured.public_key);
        if (existing.length !== desired.length || existing.some((byte, index) => byte !== desired[index])) {
          await subscription.unsubscribe();
          subscription = null;
        }
      }
      subscription ||= await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(configured.public_key) });
      await api('/notifications/subscription', { method: 'POST', body: subscription.toJSON() });
      savePreference(userId, true);
      setEnabled(true);
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }, [configured, supported, userId, onError]);
  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const worker = await navigator.serviceWorker.getRegistration();
      const subscription = await worker?.pushManager.getSubscription();
      if (subscription) {
        await api('/notifications/subscription', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      savePreference(userId, false);
      setEnabled(false);
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }, [userId, onError]);
  const clearNotifications = useCallback(async () => {
    try {
      const worker = await navigator.serviceWorker.getRegistration();
      for (const notification of await worker?.getNotifications() || []) notification.close();
    } catch { /* Logout still removes the server subscription. */ }
  }, []);
  return { enabled, busy, configured, enable, disable, clearNotifications };
}
