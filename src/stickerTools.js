export const STICKER_SIZE = 512;
export const MAX_STICKER_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CUSTOM_STICKERS = 50;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export function validateStickerFile(file) {
  if (!file || !imageTypes.has(file.type)) throw new Error('Choose a JPG, PNG, WebP or GIF photo or meme.');
  if (!file.size || file.size > MAX_STICKER_FILE_BYTES) throw new Error('Choose an image smaller than 10 MB.');
}
export function coverImage(width, height, size = STICKER_SIZE, zoom = 1, pan = { x: 0, y: 0 }) {
  const ratio = Math.max(size / width, size / height) * zoom;
  const w = width * ratio, h = height * ratio;
  const x = Math.max(-(w - size) / 2, Math.min((w - size) / 2, pan.x));
  const y = Math.max(-(h - size) / 2, Math.min((h - size) / 2, pan.y));
  return { x: (size - w) / 2 + x, y: (size - h) / 2 + y, width: w, height: h };
}
export function wrapCaption(text, measure, maxWidth) {
  const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text.trim());
  const lines = []; let line = '';
  for (const { segment } of segments) {
    if (line && measure(line + segment) > maxWidth) { lines.push(line.trim()); line = segment.trimStart(); }
    else line += segment;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
export function clampStickerPan(image, shape, zoom, pan) {
  const fit = shape === 'original' ? Math.min(410 / image.naturalWidth, 410 / image.naturalHeight) : Math.max(512 / image.naturalWidth, 512 / image.naturalHeight);
  const baseWidth = shape === 'original' ? image.naturalWidth * fit : 512;
  const baseHeight = shape === 'original' ? image.naturalHeight * fit : 512;
  const dx = (image.naturalWidth * fit * zoom - baseWidth) / 2;
  const dy = (image.naturalHeight * fit * zoom - baseHeight) / 2;
  return { x: Math.max(-dx, Math.min(dx, pan.x)) || 0, y: Math.max(-dy, Math.min(dy, pan.y)) || 0 };
}
export function drawSticker(canvas, image, options) {
  const { shape, borderWidth, borderColor, caption, captionPos, filter, scale, pan } = options;
  const size = STICKER_SIZE;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create a sticker preview.');
  ctx.clearRect(0, 0, size, size);
  const fit = Math.min(410 / image.naturalWidth, 410 / image.naturalHeight);
  const memeWidth = image.naturalWidth * fit, memeHeight = image.naturalHeight * fit;
  ctx.save(); ctx.beginPath();
  if (shape === 'circle') ctx.arc(256, 256, 205, 0, Math.PI * 2);
  else if (shape === 'heart') {
    ctx.moveTo(256, 132);
    ctx.bezierCurveTo(125, 12, 8, 170, 96, 278);
    ctx.bezierCurveTo(140, 336, 208, 391, 256, 442);
    ctx.bezierCurveTo(304, 391, 372, 336, 416, 278);
    ctx.bezierCurveTo(504, 170, 387, 12, 256, 132);
  } else if (shape === 'star') {
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? 112 : 205, angle = -Math.PI / 2 + i * Math.PI / 5;
      const x = 256 + Math.cos(angle) * radius, y = 256 + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (shape === 'original') ctx.roundRect((size - memeWidth) / 2, (size - memeHeight) / 2, memeWidth, memeHeight, Math.min(16, memeWidth / 2, memeHeight / 2));
  else ctx.roundRect(51, 51, 410, 410, 64);
  if (borderWidth) {
    ctx.lineWidth = borderWidth * 2; ctx.strokeStyle = borderColor; ctx.lineJoin = 'round'; ctx.stroke();
  }
  ctx.clip();
  ctx.filter = { vibrant: 'saturate(1.5) contrast(1.15)', warm: 'sepia(0.25) saturate(1.3)', noir: 'grayscale(1) contrast(1.2)' }[filter] || 'none';
  const position = clampStickerPan(image, shape, scale, pan);
  const crop = shape === 'original'
    ? { x: (size - memeWidth * scale) / 2 + position.x, y: (size - memeHeight * scale) / 2 + position.y, width: memeWidth * scale, height: memeHeight * scale }
    : coverImage(image.naturalWidth, image.naturalHeight, size, scale, position);
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height);
  ctx.restore();
  if (caption.trim()) {
    ctx.save();
    let fontSize = 32, lines;
    do {
      ctx.font = 'bold ' + fontSize + 'px "DM Sans", system-ui, sans-serif';
      lines = wrapCaption(caption, value => ctx.measureText(value).width, 420);
      if (lines.length <= 2 || fontSize <= 18) break;
      fontSize -= 2;
    } while (fontSize >= 18);
    const lineHeight = fontSize * 1.5, height = lineHeight * lines.length + 20;
    const width = Math.max(...lines.map(line => ctx.measureText(line).width)) + 32;
    const y = captionPos === 'top' ? 62 : size - 62 - height;
    ctx.fillStyle = '#17483e'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect((size - width) / 2, y, width, height, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((line, i) => ctx.fillText(line, size / 2, y + 10 + lineHeight * (i + 0.5)));
    ctx.restore();
  }
}
export const stickerLibraryKey = userId => 'kipenzi_custom_stickers:' + userId;
const isSticker = item => item && typeof item.id === 'string' && typeof item.dataUrl === 'string' &&
  item.dataUrl.length <= 1500000 && item.dataUrl.startsWith('data:image/png;base64,') && /^[A-Za-z0-9+/]+=*$/.test(item.dataUrl.slice(22));
export function loadStickerLibrary(storage, userId) {
  try {
    const items = JSON.parse(storage.getItem(stickerLibraryKey(userId)) || '[]');
    return Array.isArray(items) ? items.filter(isSticker).slice(0, MAX_CUSTOM_STICKERS) : [];
  } catch { return []; }
}
export function persistStickerLibrary(storage, userId, items) {
  try { storage.setItem(stickerLibraryKey(userId), JSON.stringify(items)); }
  catch { throw new Error('Could not save your stickers on this device. Free some browser storage or download the PNG instead.'); }
}
export function addStickerToLibrary(items, dataUrl) {
  const existing = items.find(item => item.dataUrl === dataUrl);
  if (existing) return items;
  const item = { id: crypto.randomUUID(), dataUrl, createdAt: Date.now() };
  if (!isSticker(item)) throw new Error('This sticker is too large to save. Download it instead.');
  if (items.length >= MAX_CUSTOM_STICKERS) throw new Error('Your library has 50 stickers. Delete one before saving another.');
  return [item, ...items];
}
