import { stickers } from './constants.js';

export function exportName(name) {
  return Array.from((name || 'chat').normalize('NFC'), char => char.charCodeAt(0) < 32 ? '_' : char).join('').replace(/[\\/:*?"<>|]/g, '_').replace(/^\.+|[. ]+$/g, '').slice(0,100) || 'chat';
}
export function attachmentPath(attachment) {
  return 'attachments/' + attachment.id + '-' + exportName(attachment.name);
}
export function conversationText(title, messages, includeAttachments, exportedAt = new Date()) {
  const lines = ['Kipenzi Connect — ' + title, 'Exported: ' + exportedAt.toISOString(), 'Times are shown in UTC.', 'Deleted and expired messages are excluded.', ''];
  for (const message of messages) {
    lines.push('[' + new Date(message.created_at).toISOString() + '] ' + message.sender.name + ' (@' + message.sender.handle + ')' + (message.edited_at ? ' [edited]' : ''));
    if (message.text) lines.push(message.text);
    if (message.sticker) lines.push('[Sticker] ' + (stickers[message.sticker] || message.sticker));
    if (message.translation?.text && message.translation.text !== message.text) lines.push('[Translation: ' + message.translation.language + '] ' + message.translation.text);
    if (message.attachment) lines.push('[Attachment] ' + (includeAttachments ? attachmentPath(message.attachment) : message.attachment.name));
    if (message.expires_at) lines.push('[Disappearing message: expires ' + new Date(message.expires_at).toISOString() + ']');
    lines.push('');
  }
  return lines.join('\n');
}
const crcTable = Array.from({length:256}, (_, index) => {
  let value = index;
  for (let bit=0;bit<8;bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
// Store entries without compression to avoid recompressing photos and videos.
export function zipArchive(entries) {
  if (entries.length > 65535) throw new Error('Too many attachments. Export text only.');
  const encoder = new TextEncoder(), parts = [], directory = [];
  let offset = 0, directorySize = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name), bytes = entry.bytes;
    if (name.length > 65535 || offset + bytes.length > 0xffffffff) throw new Error('Export is too large. Export text only.');
    const crc = crc32(bytes);
    const local = new Uint8Array(30 + name.length), view = new DataView(local.buffer);
    view.setUint32(0,0x04034b50,true); view.setUint16(4,20,true); view.setUint16(6,0x800,true); view.setUint16(12,33,true);
    view.setUint32(14,crc,true); view.setUint32(18,bytes.length,true); view.setUint32(22,bytes.length,true); view.setUint16(26,name.length,true); local.set(name,30);
    parts.push(local,bytes);
    const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true); cv.setUint16(8,0x800,true); cv.setUint16(14,33,true);
    cv.setUint32(16,crc,true); cv.setUint32(20,bytes.length,true); cv.setUint32(24,bytes.length,true); cv.setUint16(28,name.length,true); cv.setUint32(42,offset,true); central.set(name,46);
    directory.push(central); directorySize += central.length; offset += local.length + bytes.length;
  }
  const end = new Uint8Array(22), view = new DataView(end.buffer);
  view.setUint32(0,0x06054b50,true); view.setUint16(8,entries.length,true); view.setUint16(10,entries.length,true); view.setUint32(12,directorySize,true); view.setUint32(16,offset,true);
  return new Blob([...parts,...directory,end],{type:'application/zip'});
}
