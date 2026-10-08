import { stickers } from './constants.js';

export function messagePreview(message) {
  let text = message.translation?.status === 'ready' ? message.translation.text : message.text;
  if (message.translation?.status === 'pending') text = 'New message · Translating…';
  if (!text && message.sticker) text = `${stickers[message.sticker] || '💬'} Sticker`;
  if (!text && message.attachment) {
    const mime = message.attachment.mime || '';
    text = mime.startsWith('image/') ? '📷 Photo' : mime.startsWith('audio/') || /^voice-note-/.test(message.attachment.name || '') ? '🎤 Voice message' : '📎 Attachment';
  }
  return Array.from((text || 'New message').replace(/\s+/g, ' ').trim()).slice(0, 180).join('');
}
