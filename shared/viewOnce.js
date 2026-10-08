export function supportsViewOnce(attachment) {
  return Boolean(attachment && /^(image|video)\//.test(attachment.mime || attachment.type || '') && !/^(voice-note-|sticker-)/.test(attachment.name || ''));
}
