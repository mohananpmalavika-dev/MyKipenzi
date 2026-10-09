import { z } from 'zod';

export const captureInput = z.object({
  client_id: z.string().uuid(),
  kind: z.enum(['screenshot_shortcut', 'recording_shortcut', 'screen_sharing']),
  message_id: z.string().uuid().optional(),
}).strict().refine(input => input.kind !== 'screen_sharing' || !input.message_id, { message: 'Screen-sharing reports refer to a call, not view-once media.' });

export function captureShortcut(event) {
  if (!event.isTrusted || event.repeat) return null;
  if (event.key === 'PrintScreen' || event.code === 'PrintScreen') return 'screenshot_shortcut';
  if (event.metaKey && event.shiftKey && !event.altKey && ['Digit3', 'Digit4', 'KeyS'].includes(event.code)) return 'screenshot_shortcut';
  if ((event.metaKey && event.shiftKey && event.code === 'Digit5') || (event.metaKey && event.altKey && event.code === 'KeyR')) return 'recording_shortcut';
  return null;
}
export function captureNotification(alert, language = 'en') {
  const name = alert.sender_name || 'Your partner';
  const viewOnce = alert.context === 'view_once';
  const scope = viewOnce ? 'view-once media' : 'your chat';
  const bodies = {
    screenshot_shortcut: `${name} used a screenshot shortcut while viewing ${scope}. A completed screenshot cannot be confirmed by this browser.`,
    recording_shortcut: `${name} used a capture/recording shortcut while viewing ${scope}. Recording cannot be confirmed by this browser.`,
    screen_sharing: `${name} started screen sharing during your call. The shared screen may include chat content.`,
  };
  if (!bodies[alert.kind]) return null;
  if (language === 'ml') {
    const context = viewOnce ? 'view-once മീഡിയ' : 'ചാറ്റ്';
    const translations = {
      screenshot_shortcut: `${name} ${context} കാണുമ്പോൾ screenshot shortcut ഉപയോഗിച്ചു. Screenshot എടുത്തെന്ന് browser-ന് ഉറപ്പിക്കാനാവില്ല.`,
      recording_shortcut: `${name} ${context} കാണുമ്പോൾ capture/recording shortcut ഉപയോഗിച്ചു. Recording നടന്നെന്ന് browser-ന് ഉറപ്പിക്കാനാവില്ല.`,
      screen_sharing: `${name} കോളിൽ screen sharing ആരംഭിച്ചു. പങ്കിട്ട സ്ക്രീനിൽ chat ഉൾപ്പെട്ടേക്കാം.`,
    };
    return { title: '📸 സ്വകാര്യതാ അലർട്ട്', body: translations[alert.kind] };
  }
  return { title: alert.kind === 'screen_sharing' ? '📺 Screen sharing alert' : '📸 Capture shortcut alert', body: bodies[alert.kind] };
}
