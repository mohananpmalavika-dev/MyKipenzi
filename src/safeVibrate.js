/**
 * Safe haptic vibration utility that respects Chrome's user-gesture intervention requirement:
 * "Blocked call to navigator.vibrate because user hasn't tapped on the frame or any embedded frame yet"
 */

let hasUserInteracted = false;

if (typeof window !== 'undefined') {
  if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) {
    hasUserInteracted = true;
  } else {
    const onUserGesture = () => {
      hasUserInteracted = true;
      window.removeEventListener('pointerdown', onUserGesture, true);
      window.removeEventListener('touchstart', onUserGesture, true);
      window.removeEventListener('click', onUserGesture, true);
      window.removeEventListener('keydown', onUserGesture, true);
    };
    window.addEventListener('pointerdown', onUserGesture, { capture: true, passive: true });
    window.addEventListener('touchstart', onUserGesture, { capture: true, passive: true });
    window.addEventListener('click', onUserGesture, { capture: true, passive: true });
    window.addEventListener('keydown', onUserGesture, { capture: true, passive: true });
  }
}

export function canVibrate() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }
  // Modern Chromium / Safari userActivation API
  if (navigator.userActivation && typeof navigator.userActivation.hasBeenActive === 'boolean') {
    return navigator.userActivation.hasBeenActive;
  }
  // In test / non-DOM environments where navigator.vibrate is mocked
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return true;
  }
  return hasUserInteracted;
}

export function safeVibrate(pattern) {
  if (!canVibrate()) return false;
  try {
    return Boolean(navigator.vibrate(pattern));
  } catch {
    return false;
  }
}
