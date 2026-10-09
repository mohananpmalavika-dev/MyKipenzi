import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { messagePreview } from '../shared/notifications.js';
import { currentMood, moodNotification } from '../shared/moods.js';
import { captureNotification } from '../shared/captureAlerts.js';

export function useMessageAlerts(userId, language = 'en') {
  const [preview, setPreview] = useState(null);
  const [soundEnabled, setSound] = useState(() => {
    try { return localStorage.getItem(`kipenzi-alert-sound:${userId}`) !== 'off'; }
    catch { return true; }
  });
  const sound = useRef(soundEnabled);
  const context = useRef(null);
  const seen = useRef(new Set());
  const latestMoodRevision = useRef(new Map());
  const timer = useRef(null);
  const active = useRef(true);
  const unseen = useRef(0);
  const title = useRef(document.title);
  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setPreview(null);
  }, []);
  const setSoundEnabled = useCallback((enabled) => {
    sound.current = enabled;
    setSound(enabled);
    try { localStorage.setItem(`kipenzi-alert-sound:${userId}`, enabled ? 'on' : 'off'); }
    catch { /* The control works even when browser storage is unavailable. */ }
  }, [userId]);
  const unlockSound = useCallback(() => {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      context.current ||= new Audio();
      void context.current.resume().catch(() => {});
    } catch { /* Sound is optional when this browser blocks audio. */ }
  }, []);
  const playSound = useCallback(() => {
    if (!sound.current || context.current?.state !== 'running') return;
    try {
      const audio = context.current;
      [880, 1100].forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + index * 0.16;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.055, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(start);
        oscillator.stop(start + 0.15);
      });
    } catch { /* The visual preview remains available if audio fails. */ }
  }, []);
  useEffect(() => {
    active.current = true;
    const originalTitle = title.current;
    const clearCount = () => {
      if (document.visibilityState === 'visible') {
        unseen.current = 0;
        document.title = originalTitle;
      }
    };
    document.addEventListener('pointerdown', unlockSound);
    document.addEventListener('keydown', unlockSound);
    document.addEventListener('visibilitychange', clearCount);
    window.addEventListener('focus', clearCount);
    return () => {
      active.current = false;
      clearTimeout(timer.current);
      document.removeEventListener('pointerdown', unlockSound);
      document.removeEventListener('keydown', unlockSound);
      document.removeEventListener('visibilitychange', clearCount);
      window.removeEventListener('focus', clearCount);
      document.title = originalTitle;
      void context.current?.close().catch(() => {});
      context.current = null;
    };
  }, [unlockSound]);
  const receive = useCallback(async ({ message_id, sender_id }) => {
    if (sender_id === userId || seen.current.has(message_id)) return;
    seen.current.add(message_id);
    if (seen.current.size > 200) seen.current.delete(seen.current.values().next().value);
    try {
      const message = await api(`/messages/${message_id}`);
      if (!active.current || message.sender_id === userId) return;
      setPreview({ id: message.id, conversation_id: message.conversation_id, name: message.sender?.name || 'Your friend', body: messagePreview(message) });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setPreview(null), 9000);
      playSound();
      if (document.visibilityState !== 'visible') {
        unseen.current += 1;
        document.title = `(${unseen.current}) New message · Kipenzi`;
      }
    } catch { seen.current.delete(message_id); }
  }, [userId, playSound]);
  const receiveMood = useCallback(async (payload) => {
    if (payload.user_id === userId || !currentMood(payload)) return;
    const key = `${payload.conversation_id}:${payload.user_id}`;
    const revision = Number(payload.revision);
    if (revision < (latestMoodRevision.current.get(key) || 0)) return;
    latestMoodRevision.current.set(key, revision);
    if (latestMoodRevision.current.size > 200) latestMoodRevision.current.delete(latestMoodRevision.current.keys().next().value);
    const id = `mood:${payload.conversation_id}:${payload.user_id}:${payload.revision}`;
    if (seen.current.has(id)) return;
    seen.current.add(id);
    if (seen.current.size > 200) seen.current.delete(seen.current.values().next().value);
    try {
      const result = await api(`/conversations/${payload.conversation_id}/moods`);
      const status = result.statuses.find(s => s.user_id === payload.user_id && s.revision === payload.revision);
      if (!active.current || !currentMood(status) || latestMoodRevision.current.get(key) !== revision) return;
      const notification = moodNotification(status.mood, status.sender_name, language);
      if (!notification) return;
      setPreview({ id, conversation_id: payload.conversation_id, name: notification.title, body: notification.body, kind: 'mood' });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setPreview(null), 9000);
      playSound();
      if (document.visibilityState !== 'visible') {
        unseen.current += 1;
        document.title = `(${unseen.current}) Mood check-in · Kipenzi`;
      }
    } catch { seen.current.delete(id); }
  }, [userId, language, playSound]);
  const receiveCapture = useCallback(async ({ id, sender_id }) => {
    const key = 'capture:' + id;
    if (sender_id === userId || seen.current.has(key)) return;
    seen.current.add(key);
    if (seen.current.size > 200) seen.current.delete(seen.current.values().next().value);
    try {
      const alert = await api(`/capture-alerts/${id}`);
      if (!active.current || alert.sender_id === userId) return;
      const notification = captureNotification(alert, language);
      if (!notification) return;
      setPreview({ id: key, conversation_id: alert.conversation_id, name: notification.title, body: notification.body, kind: 'capture' });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setPreview(null), 12000);
      playSound();
    } catch { seen.current.delete(key); }
  }, [userId, language, playSound]);
  const update = useCallback(async (messageId) => {
    if (!seen.current.has(messageId)) return;
    try {
      const message = await api(`/messages/${messageId}`);
      if (active.current) setPreview(current => current?.id === message.id ? { ...current, body: messagePreview(message) } : current);
    } catch { /* Keep the existing preview if translation refresh fails. */ }
  }, []);
  return { preview, dismiss, receive, receiveMood, receiveCapture, update, soundEnabled, setSoundEnabled, playSound };
}
