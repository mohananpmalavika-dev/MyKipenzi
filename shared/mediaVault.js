/**
 * Shared Media Vault & Private Scrapbook ("പോളറോയ്ഡ് ആൽബം" / Polaroid Vault)
 * Logic, filtering, statistics, date grouping, and styling helpers for
 * photos and videos sent in chat.
 */

export const POLAROID_TAPES = [
  'tape-rose',
  'tape-lavender',
  'tape-gold',
  'tape-mint',
  'tape-kraft',
];

export const POLAROID_STICKERS = [
  '❤️', '✨', '📸', '☕', '🌸', '🧸', '💌', '🍃', '💫', '🥂', '🎞️', '🦋'
];

export const SCRAPBOOK_THEMES = [
  { id: 'classic-wood', labelEn: 'Wooden Desk', labelMl: 'തടി മേശ 🪵', bgClass: 'sb-theme-wood' },
  { id: 'blush-linen', labelEn: 'Blush Linen', labelMl: 'റോസ് ലിനൻ 🌸', bgClass: 'sb-theme-blush' },
  { id: 'cork-board', labelEn: 'Memory Board', labelMl: 'ഓർമ്മ ബോർഡ് 📌', bgClass: 'sb-theme-cork' },
  { id: 'vintage-paper', labelEn: 'Vintage Parchment', labelMl: 'വിന്റേജ് പേപ്പർ 📜', bgClass: 'sb-theme-parchment' },
  { id: 'starry-night', labelEn: 'Starry Twilight', labelMl: 'നക്ഷത്ര രാവ് 🌌', bgClass: 'sb-theme-stars' },
];

/**
 * Checks whether an attachment is eligible for the Shared Media Vault / Polaroid Scrapbook.
 * Must be an image or video, NOT a sticker, NOT a voice note, and NOT view_once.
 */
export function isVaultMedia(attachment) {
  if (!attachment || !attachment.mime) return false;
  if (attachment.view_once) return false;

  const mime = String(attachment.mime).toLowerCase();
  const name = String(attachment.name || '').toLowerCase();

  // Reject stickers
  if (name.startsWith('sticker-') || name.includes('sticker')) return false;

  // Reject voice notes (audio/* or video/webm voice-notes)
  if (mime.startsWith('audio/')) return false;
  if (name.startsWith('voice-note-') && mime === 'video/webm') return false;

  // Must be image or video
  return mime.startsWith('image/') || mime.startsWith('video/');
}

/**
 * Returns 'photo', 'video', or null.
 */
export function getMediaType(attachment) {
  if (!isVaultMedia(attachment)) return null;
  return attachment.mime.toLowerCase().startsWith('video/') ? 'video' : 'photo';
}

/**
 * Deterministic rotation angle (-3 to +3 degrees) from a string ID or index.
 * Ensures consistent aesthetic tilt on each Polaroid render.
 */
export function getPolaroidRotation(seed = '') {
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  // Range from -2.8 to +2.8 degrees
  const angle = ((Math.abs(hash) % 56) - 28) / 10;
  return Math.abs(angle) < 0.4 ? (angle < 0 ? -1.2 : 1.2) : angle;
}

/**
 * Deterministic washi tape style.
 */
export function getPolaroidTape(seed = '') {
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % POLAROID_TAPES.length;
  return POLAROID_TAPES[idx];
}

const MALAYALAM_MONTHS = [
  'ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ',
  'മേയ്', 'ജൂൺ', 'ജൂലൈ', 'ഓഗസ്റ്റ്',
  'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ',
];

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

/**
 * Formats a timestamp into a romantic Polaroid date string.
 */
export function formatPolaroidDate(dateInput, language = 'ml') {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const day = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  const timeStr = `${hours}:${minutes} ${ampm}`;

  if (language === 'ml') {
    return {
      date: `${day} ${MALAYALAM_MONTHS[monthIdx]} ${year}`,
      time: timeStr,
      full: `${day} ${MALAYALAM_MONTHS[monthIdx]} ${year}, ${timeStr}`,
      short: `${day} ${MALAYALAM_MONTHS[monthIdx]}`,
    };
  }

  return {
    date: `${day} ${ENGLISH_MONTHS[monthIdx].slice(0, 3)} ${year}`,
    time: timeStr,
    full: `${day} ${ENGLISH_MONTHS[monthIdx].slice(0, 3)} ${year}, ${timeStr}`,
    short: `${day} ${ENGLISH_MONTHS[monthIdx].slice(0, 3)}`,
  };
}

/**
 * Calculates aggregate stats for vault media items.
 */
export function calculateVaultStats(messages = []) {
  const valid = messages.filter((m) => m && m.attachment && isVaultMedia(m.attachment));
  let photos = 0;
  let videos = 0;
  const senders = {};
  let oldest = null;
  let newest = null;

  for (const m of valid) {
    const type = getMediaType(m.attachment);
    if (type === 'photo') photos++;
    if (type === 'video') videos++;

    const senderId = m.sender?.id || m.sender_id;
    if (senderId) {
      senders[senderId] = (senders[senderId] || 0) + 1;
    }

    const t = new Date(m.created_at).getTime();
    if (!isNaN(t)) {
      if (!oldest || t < oldest) oldest = t;
      if (!newest || t > newest) newest = t;
    }
  }

  return {
    total: valid.length,
    photos,
    videos,
    oldestDate: oldest ? new Date(oldest).toISOString() : null,
    newestDate: newest ? new Date(newest).toISOString() : null,
    senders,
  };
}

/**
 * Filter vault messages by type ('all' | 'photos' | 'videos'), sender ID,
 * search term (caption or filename), and starred status.
 */
export function filterVaultItems(messages = [], options = {}) {
  const {
    type = 'all',
    senderId = null,
    query = '',
    onlyStarred = false,
  } = options;

  const q = String(query).trim().toLowerCase();

  return messages.filter((m) => {
    if (!m || !m.attachment || !isVaultMedia(m.attachment)) return false;

    // Type filter
    const mediaType = getMediaType(m.attachment);
    if (type === 'photos' && mediaType !== 'photo') return false;
    if (type === 'videos' && mediaType !== 'video') return false;

    // Sender filter
    if (senderId) {
      const msgSenderId = m.sender?.id || m.sender_id;
      if (msgSenderId !== senderId) return false;
    }

    // Starred filter
    if (onlyStarred && !m.starred) return false;

    // Query filter (searches caption text and attachment name)
    if (q) {
      const textMatch = m.text && m.text.toLowerCase().includes(q);
      const nameMatch = m.attachment.name && m.attachment.name.toLowerCase().includes(q);
      const senderMatch = m.sender?.name && m.sender.name.toLowerCase().includes(q);
      if (!textMatch && !nameMatch && !senderMatch) return false;
    }

    return true;
  });
}

/**
 * Groups messages chronologically by Year-Month ("YYYY-MM").
 * Returns array of groups: { key, labelEn, labelMl, year, month, items, photosCount, videosCount }
 */
export function groupMemoriesByMonth(messages = []) {
  const valid = messages.filter((m) => m && m.attachment && isVaultMedia(m.attachment));
  const groupsMap = new Map();

  for (const item of valid) {
    const d = new Date(item.created_at);
    if (isNaN(d.getTime())) continue;

    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        year,
        month,
        labelEn: `${ENGLISH_MONTHS[month]} ${year}`,
        labelMl: `${MALAYALAM_MONTHS[month]} ${year}`,
        items: [],
        photosCount: 0,
        videosCount: 0,
      });
    }

    const group = groupsMap.get(key);
    group.items.push(item);
    if (getMediaType(item.attachment) === 'video') {
      group.videosCount++;
    } else {
      group.photosCount++;
    }
  }

  // Sort groups descending by date key (newest month first)
  return Array.from(groupsMap.values()).sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * Formats a romantic memory share card text to send into the chat.
 */
export function formatPolaroidShareCard(item, _senderName = 'Your person') {
  if (!item || !item.attachment) return '';
  const isVideo = getMediaType(item.attachment) === 'video';
  const icon = isVideo ? '🎥' : '📸';
  const typeText = isVideo ? 'വീഡിയോ ഓർമ്മ (Video Memory)' : 'പോളറോയ്ഡ് ഓർമ്മ (Polaroid Memory)';
  const dateObj = formatPolaroidDate(item.created_at, 'ml');
  const caption = item.text ? `\n💬 "${item.text.trim()}"` : '';

  return `${icon} [${typeText}] · ${dateObj.date}\nസ്നേഹത്തോടെ പങ്കിട്ട നിമിഷം ✨${caption}\n(Shared from Private Scrapbook Vault)`;
}

/**
 * Detects whether a message text is a shared Polaroid memory card.
 */
export function parsePolaroidShareCard(text = '') {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/(?:📸|🎥)\s*\[(പോളറോയ്ഡ് ഓർമ്മ|വീഡിയോ ഓർമ്മ)[^\]]*\]\s*·\s*([^\n]+)/);
  if (!match) return null;

  return {
    isPolaroidShare: true,
    type: match[1].includes('വീഡിയോ') ? 'video' : 'photo',
    dateLabel: match[2].trim(),
  };
}
