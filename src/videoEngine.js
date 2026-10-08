/**
 * Video Sync & Watch Party Engine for MyKipenzi
 * Handles YouTube video parsing, curated romantic Malayalam and chill clips,
 * real-time playback drift calculation, and chat message serialization.
 */

// Curated romantic Malayalam songs, scenes, and relaxing video clips
export const CURATED_VIDEOS = [
  {
    id: 'malare-premam',
    youtubeId: '0G2VxhV_gXM',
    titleMl: 'മലരേ നിന്നെ കാണാതിരുന്നാൽ · പ്രേമം',
    titleEn: 'Malare Ninne · Premam Classic',
    category: 'Romantic Songs',
    durationSec: 310,
    thumbnail: 'https://img.youtube.com/vi/0G2VxhV_gXM/hqdefault.jpg',
    description: 'The timeless nostalgic romance of Nivin Pauly & Sai Pallavi.',
  },
  {
    id: 'aaradhike-ambili',
    youtubeId: '2e_dsvA439E',
    titleMl: 'ആരാധികേ · അമ്പിളി റൊമാന്റിക് മെലഡി',
    titleEn: 'Aaradhike · Ambili Soulful Melody',
    category: 'Soulful Melody',
    durationSec: 260,
    thumbnail: 'https://img.youtube.com/vi/2e_dsvA439E/hqdefault.jpg',
    description: 'Sweet, heartwarming melody sung by Sooraj Santhosh & Madhuvanthi.',
  },
  {
    id: 'nee-himamazhayayi',
    youtubeId: '_BqP3b_9y0Y',
    titleMl: 'നീ ഹിമമഴയായ് · എടക്കാട് ബറ്റാലിയൻ',
    titleEn: 'Nee Himamazhayayi · Pure Romance',
    category: 'Romantic Songs',
    durationSec: 245,
    thumbnail: 'https://img.youtube.com/vi/_BqP3b_9y0Y/hqdefault.jpg',
    description: 'Magical love song featuring Tovino Thomas and Samyuktha Menon.',
  },
  {
    id: 'mazhaye-thoomazhaye',
    youtubeId: 'gUj4bS_lX1E',
    titleMl: 'മഴയേ തൂമഴയേ · പട്ടം പോലെ',
    titleEn: 'Mazhaye Thoomazhaye · Rain of Love',
    category: 'Monsoon Love',
    durationSec: 275,
    thumbnail: 'https://img.youtube.com/vi/gUj4bS_lX1E/hqdefault.jpg',
    description: 'Enchanting romantic rain melody by Karthik & Abhirami Ajai.',
  },
  {
    id: 'kerala-backwaters-chill',
    youtubeId: '8Z1eMy2FoGY',
    titleMl: 'കേരള കായലുകളും മഴയും · പ്രകൃതി സൗന്ദര്യം',
    titleEn: 'Monsoon in Kerala Backwaters · Serene Vibes',
    category: 'Scenic & Relaxing',
    durationSec: 360,
    thumbnail: 'https://img.youtube.com/vi/8Z1eMy2FoGY/hqdefault.jpg',
    description: 'Peaceful rain, lush greenery, and soothing backwater ripples in God’s Own Country.',
  },
  {
    id: 'cozy-lofi-night',
    youtubeId: 'jfKfPfyJRdk',
    titleMl: 'കോസി ലോ-ഫൈ & മഴത്തുള്ളികൾ · റിലാക്സ്',
    titleEn: 'Cozy Lofi Beats & Soft Rain · Night Chill',
    category: 'Lofi & Chill',
    durationSec: 600,
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    description: 'Gentle beats and rain sounds to relax and talk with each other.',
  },
];

// Interactive watch party reaction emojis
export const VIDEO_REACTIONS = [
  { emoji: '🍿', label: 'Popcorn' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🥺', label: 'Aww' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '✨', label: 'Magic' },
  { emoji: '🥂', label: 'Cheers' },
  { emoji: '🥰', label: 'Romantic' },
  { emoji: '👏', label: 'Clap' },
];

// Preset quick watch comments for instant couple chat during movie watching
export const QUICK_WATCH_COMMENTS = [
  { id: '1', textMl: 'ഇത് എത്ര മനോഹരമാണ്! 😍', textEn: 'This scene is so beautiful! 😍' },
  { id: '2', textMl: 'നമ്മുടെ പ്രിയപ്പെട്ട രംഗം! ❤️', textEn: 'Our favorite part! ❤️' },
  { id: '3', textMl: 'ഒരു പോപ്കോൺ ബ്രേക്ക് എടുക്കാം 🍿', textEn: 'Quick popcorn snack break! 🍿' },
  { id: '4', textMl: 'നിന്നെ ഒരുപാട് മിസ് ചെയ്യുന്നു ഇവിടെ 🤍', textEn: 'Missing you right now 🤍' },
  { id: '5', textMl: 'ഹഹഹ, ഇത് വീണ്ടും കാണണം! 😂', textEn: 'Rewinding this, hilarious! 😂' },
  { id: '6', textMl: 'നമുക്ക് ഒന്നിച്ച് അവിടെ പോകണം ✨', textEn: 'We should go there together ✨' },
];

/**
 * Extracts a YouTube Video ID from various URL formats
 * Supports standard URLs, youtu.be, shorts, embeds, and raw 11-char IDs.
 */
export function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const clean = urlOrId.trim();

  // If already an 11-character alphanumeric ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // Common YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/watch\?.*[&?]v=([a-zA-Z0-9_-]{11})/i,
  ];

  for (const regex of patterns) {
    const match = clean.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generates high quality YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId) {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS format
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates drift between local and remote playback positions
 * considering transmission latency.
 *
 * @param {number} localPos - Local playback time in seconds
 * @param {number} remotePos - Remote playback time in seconds
 * @param {number} remoteTimestamp - Timestamp when the remote event occurred
 * @param {number} maxDriftThreshold - Maximum allowed drift before seeking (default: 0.45s)
 */
export function calculateVideoDrift(localPos, remotePos, remoteTimestamp, maxDriftThreshold = 0.45) {
  const now = Date.now();
  const latency = Math.max(0, (now - (remoteTimestamp || now)) / 1000);
  const adjustedRemotePos = remotePos + latency;
  const drift = Math.abs(localPos - adjustedRemotePos);

  return {
    drift,
    adjustedRemotePos,
    latency,
    shouldSeek: drift > maxDriftThreshold,
  };
}

/**
 * Formats a Watch Party chat message
 */
export function formatSharedWatchPartyMessage(video, note = '') {
  const titleMl = video.titleMl || 'നമ്മുടെ വാച്ച് പാർട്ടി';
  const titleEn = video.titleEn || 'Watch Party Video';
  const videoRef = video.youtubeId ? `yt:${video.youtubeId}` : (video.videoUrl || video.id || 'clip');
  const base = `🎬 [Watch Party · ${titleMl} (${titleEn}) <${videoRef}>]`;
  return note && note.trim() ? `${base} ${note.trim()}` : base;
}

/**
 * Parses a Watch Party chat message to reconstruct details
 */
export function parseSharedWatchPartyMessage(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/🎬\s*\[Watch Party\s*·\s*([^(\]]+)(?:\(([^)<]+)\))?(?:\s*<([^>]+)>)?\]\s*(.*)/i);
  if (!match) return null;

  const titleMl = match[1] ? match[1].trim() : 'നമ്മുടെ വാച്ച് പാർട്ടി';
  const titleEn = match[2] ? match[2].trim() : 'Watch Party Video';
  const ref = match[3] ? match[3].trim() : '';
  const note = match[4] ? match[4].trim() : '';

  let youtubeId = null;
  let videoUrl = null;

  if (ref.startsWith('yt:')) {
    youtubeId = ref.slice(3);
  } else if (ref.startsWith('http://') || ref.startsWith('https://')) {
    youtubeId = extractYouTubeId(ref);
    if (!youtubeId) videoUrl = ref;
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(ref)) {
    youtubeId = ref;
  }

  return {
    titleMl,
    titleEn,
    youtubeId,
    videoUrl,
    note,
  };
}
