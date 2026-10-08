/**
 * Digital Time Capsule (Love Letters for Future / ഭാവിയിലേക്കുള്ള പ്രണയലേഖനങ്ങൾ)
 * Shared constants, validation, countdown calculations, themes, and chat card helpers.
 */

export const TIME_CAPSULE_OCCASIONS = Object.freeze({
  birthday: {
    id: 'birthday',
    labelEn: "Partner's Birthday",
    labelMl: 'ജന്മദിനം 🎂',
    icon: '🎂',
    color: '#ec4899',
    badgeTextEn: 'Birthday Secret',
    badgeTextMl: 'ജന്മദിന സമ്മാനം',
    defaultTitleEn: 'Happy Birthday My Love 🎂',
    defaultTitleMl: 'എന്റെ പ്രിയപ്പെട്ടവൾക്ക്/പ്രിയന് ജന്മദിനാശംസകൾ 🎂',
    promptEn: 'A sweet letter, wishes, and love note to open exactly on their special birthday!',
    promptMl: 'നിന്റെ പങ്കാളിയുടെ ജന്മദിനത്തിൽ മാത്രം തുറക്കാൻ കഴിയുന്ന മാന്ത്രിക കത്ത്!',
  },
  anniversary: {
    id: 'anniversary',
    labelEn: 'Anniversary',
    labelMl: 'വാർഷികം / ആനിവേഴ്സറി 🥂',
    icon: '🥂',
    color: '#f59e0b',
    badgeTextEn: 'Anniversary Capsule',
    badgeTextMl: 'വിവാഹവാർഷിക കത്ത്',
    defaultTitleEn: 'Happy Anniversary, Forever & Always 🥂',
    defaultTitleMl: 'ഹാപ്പി ആനിവേഴ്സറി, എന്നും എപ്പോഴും 🥂',
    promptEn: 'Reminisce about your journey and celebrate your milestone together.',
    promptMl: 'നമ്മുടെ ഒന്നിച്ചുള്ള ജീവിതത്തിന്റെ മറ്റൊരു മനോഹരമായ വാർഷികത്തിന്!',
  },
  valentines: {
    id: 'valentines',
    labelEn: "Valentine's Day",
    labelMl: 'പ്രണയദിനം (Valentine) 💖',
    icon: '💖',
    color: '#ef4444',
    badgeTextEn: 'Valentine Promise',
    badgeTextMl: 'പ്രണയദിന വാഗ്ദാനം',
    defaultTitleEn: 'To My Eternal Valentine 💖',
    defaultTitleMl: 'എന്റെ വാലന്റൈന് ഒരു സ്നേഹസമ്മാനം 💖',
    promptEn: 'Lock your eternal love vows to be unlocked on Valentine’s Day.',
    promptMl: 'പ്രണയദിനത്തിൽ മാത്രം തുറക്കുന്ന രഹസ്യ പ്രണയലേഖനം!',
  },
  new_year: {
    id: 'new_year',
    labelEn: 'New Year Midnight',
    labelMl: 'പുതുവത്സര രാവ് 🎆',
    icon: '🎆',
    color: '#8b5cf6',
    badgeTextEn: 'New Year Hope',
    badgeTextMl: 'പുതുവത്സര പ്രതീക്ഷ',
    defaultTitleEn: 'Entering Another Beautiful Year Together 🎆',
    defaultTitleMl: 'ഒരു പുതിയ വർഷം കൂടി നിന്നോടൊപ്പം 🎆',
    promptEn: 'New dreams, new promises, and hopes sealed for midnight of the New Year.',
    promptMl: 'പുതുവർഷത്തിന്റെ പുലരിയിൽ തുറക്കാനായി ഒരു സമ്മാനം.',
  },
  milestone: {
    id: 'milestone',
    labelEn: 'Milestone Moment',
    labelMl: 'വിശേഷ നിമിഷം 🌟',
    icon: '🌟',
    color: '#10b981',
    badgeTextEn: 'Milestone Secret',
    badgeTextMl: 'നാഴികക്കല്ല് രഹസ്യം',
    defaultTitleEn: 'A Special Milestone Surprise 🌟',
    defaultTitleMl: 'നമ്മുടെ ജീവിതത്തിലെ വലിയൊരു നേട്ടത്തിന് 🌟',
    promptEn: 'Unlock on a graduation, new home, job, or relationship milestone date.',
    promptMl: 'നമ്മുടെ ഒരു വലിയ സ്വപ്നം സാക്ഷാത്കരിക്കപ്പെടുന്ന സുദിനത്തിനായി.',
  },
  custom: {
    id: 'custom',
    labelEn: 'Secret Love Letter',
    labelMl: 'രഹസ്യ കത്ത് 💌',
    icon: '💌',
    color: '#3b82f6',
    badgeTextEn: 'Time Capsule',
    badgeTextMl: 'ടൈം ക്യാപ്സ്യൂൾ',
    defaultTitleEn: 'Open When The Time Comes 💌',
    defaultTitleMl: 'ഈ ശുഭമുഹൂർത്തത്തിൽ മാത്രം തുറക്കുക 💌',
    promptEn: 'Choose any future date & time that holds magic for the two of you.',
    promptMl: 'ഭാവിയിലെ ഒരു പ്രത്യേക ദിനത്തിൽ മാത്രം തുറക്കാൻ കഴിയുന്ന രഹസ്യ കത്ത്.',
  },
});

export const TIME_CAPSULE_THEMES = Object.freeze({
  classic_rose: {
    id: 'classic_rose',
    nameEn: 'Royal Crimson Rose',
    nameMl: 'രാജകീയ റോസ് 🌹',
    accentColor: '#f43f5e',
    sealColor: '#be123c',
    sealGlow: 'rgba(244, 63, 94, 0.45)',
    cardBg: 'linear-gradient(135deg, rgba(76, 5, 25, 0.95) 0%, rgba(26, 5, 12, 0.98) 100%)',
    parchmentBg: 'linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%)',
    parchmentText: '#881337',
    envelopeBorder: '#f43f5e',
  },
  golden_parchment: {
    id: 'golden_parchment',
    nameEn: 'Vintage Golden Letter',
    nameMl: 'വിന്റേജ് സുവർണ്ണ കത്ത് 📜',
    accentColor: '#f59e0b',
    sealColor: '#b45309',
    sealGlow: 'rgba(245, 158, 11, 0.45)',
    cardBg: 'linear-gradient(135deg, rgba(69, 39, 10, 0.95) 0%, rgba(24, 15, 5, 0.98) 100%)',
    parchmentBg: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
    parchmentText: '#78350f',
    envelopeBorder: '#f59e0b',
  },
  starlight_midnight: {
    id: 'starlight_midnight',
    nameEn: 'Midnight Starlight',
    nameMl: 'നക്ഷത്ര രാവ് 🌙',
    accentColor: '#818cf8',
    sealColor: '#4338ca',
    sealGlow: 'rgba(129, 140, 248, 0.45)',
    cardBg: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)',
    parchmentBg: 'linear-gradient(180deg, #e0e7ff 0%, #c7d2fe 100%)',
    parchmentText: '#1e1b4b',
    envelopeBorder: '#818cf8',
  },
  lavender_sunset: {
    id: 'lavender_sunset',
    nameEn: 'Lavender Sunset',
    nameMl: 'ലാവെൻഡർ സന്ധ്യ 💜',
    accentColor: '#c084fc',
    sealColor: '#7e22ce',
    sealGlow: 'rgba(192, 132, 252, 0.45)',
    cardBg: 'linear-gradient(135deg, rgba(46, 16, 101, 0.95) 0%, rgba(17, 4, 38, 0.98) 100%)',
    parchmentBg: 'linear-gradient(180deg, #f3e8ff 0%, #e9d5ff 100%)',
    parchmentText: '#581c87',
    envelopeBorder: '#c084fc',
  },
});

export const SEAL_SYMBOLS = Object.freeze({
  heart: { id: 'heart', emoji: '❤️', labelEn: 'Eternal Heart', labelMl: 'ഹൃദയം ❤️' },
  ring: { id: 'ring', emoji: '💍', labelEn: 'Sacred Promise', labelMl: 'മോതിരം 💍' },
  rose: { id: 'rose', emoji: '🌹', labelEn: 'True Passion', labelMl: 'റോസ് 🌹' },
  infinity: { id: 'infinity', emoji: '♾️', labelEn: 'Forever Love', labelMl: 'അനന്ത പ്രണയം ♾️' },
  crown: { id: 'crown', emoji: '👑', labelEn: 'Royal Love', labelMl: 'കിരീടം 👑' },
  key: { id: 'key', emoji: '🗝️', labelEn: 'Key to My Heart', labelMl: 'ഹൃദയ താക്കോൽ 🗝️' },
});

export const ROMANTIC_REACTIONS = ['❤️', '🥺', '😭', '💍', '🫂', '💋', '✨', '🥰'];

/**
 * Calculates countdown until unlock date.
 * @param {string|Date} unlockAt
 * @param {Date} [refDate]
 * @returns {object}
 */
export function calculateCapsuleCountdown(unlockAt, refDate = new Date()) {
  if (!unlockAt) {
    return {
      isUnlocked: true,
      totalSecondsRemaining: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      labelEn: 'Unlocked',
      labelMl: 'തുറന്നു',
    };
  }

  const target = new Date(unlockAt);
  const now = refDate instanceof Date ? refDate : new Date(refDate);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      isUnlocked: true,
      totalSecondsRemaining: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      labelEn: 'Unlocked with Love! 💌',
      labelMl: 'സ്നേഹത്തോടെ തുറന്നു! 💌',
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let labelEn = '';
  let labelMl = '';

  if (days > 0) {
    labelEn = `${days}d ${hours}h remaining`;
    labelMl = `${days} ദിവസവും ${hours} മണിക്കൂറും ബാക്കി`;
  } else if (hours > 0) {
    labelEn = `${hours}h ${minutes}m remaining`;
    labelMl = `${hours} മണിക്കൂറും ${minutes} മിനിറ്റും ബാക്കി`;
  } else if (minutes > 0) {
    labelEn = `${minutes}m ${seconds}s remaining`;
    labelMl = `${minutes} മിനിറ്റും ${seconds} സെക്കൻഡും ബാക്കി`;
  } else {
    labelEn = `${seconds}s remaining`;
    labelMl = `${seconds} സെക്കൻഡ് മാത്രം ബാക്കി`;
  }

  return {
    isUnlocked: false,
    totalSecondsRemaining: totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    labelEn,
    labelMl,
  };
}

/**
 * Formats unlock timestamp into friendly human date in English & Malayalam.
 * @param {string|Date} dateInput
 * @returns {{ formattedEn: string, formattedMl: string }}
 */
export function formatCapsuleUnlockDate(dateInput) {
  if (!dateInput) return { formattedEn: '', formattedMl: '' };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { formattedEn: '', formattedMl: '' };

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  const formattedEn = d.toLocaleDateString('en-US', options);

  const monthsMl = [
    'ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മേയ്', 'ജൂൺ',
    'ജൂലൈ', 'ഓഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ'
  ];
  const day = d.getDate();
  const month = monthsMl[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  const formattedMl = `${year} ${month} ${day}, ${hours}:${mins} ${ampm}`;

  return { formattedEn, formattedMl };
}

/**
 * Validates capsule creation input.
 * @param {object} input
 */
export function validateCapsuleInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid capsule details.');
  }

  const title = (input.title || '').trim();
  if (!title) {
    throw new Error('Please enter a sweet title for your love letter.');
  }
  if (title.length > 250) {
    throw new Error('Title cannot exceed 250 characters.');
  }

  if (!input.unlock_at) {
    throw new Error('Please select an unlock date and time for the future.');
  }

  const unlockDate = new Date(input.unlock_at);
  if (isNaN(unlockDate.getTime())) {
    throw new Error('Invalid unlock date format.');
  }

  // Must be in the future (at least 30 seconds ahead)
  const now = new Date();
  if (unlockDate.getTime() <= now.getTime() + 15000) {
    throw new Error('Unlock time must be in the future.');
  }

  const letterText = (input.letter_text || '').trim();
  const hasAudio = !!input.audio_url;
  const hasPhoto = !!input.photo_url;

  if (!letterText && !hasAudio && !hasPhoto) {
    throw new Error('Please write a love letter or record a voice note for your capsule.');
  }

  if (letterText.length > 10000) {
    throw new Error('Love letter exceeds maximum length of 10,000 characters.');
  }

  const occasion = input.occasion || 'custom';
  if (!TIME_CAPSULE_OCCASIONS[occasion]) {
    throw new Error('Invalid occasion specified.');
  }

  const theme = input.theme || 'classic_rose';
  if (!TIME_CAPSULE_THEMES[theme]) {
    throw new Error('Invalid theme specified.');
  }

  const seal_symbol = input.seal_symbol || 'heart';
  if (!SEAL_SYMBOLS[seal_symbol]) {
    throw new Error('Invalid seal symbol.');
  }

  return {
    title,
    occasion,
    unlock_at: unlockDate.toISOString(),
    theme,
    seal_symbol,
    letter_text: letterText || null,
    audio_url: input.audio_url || null,
    photo_url: input.photo_url || null,
  };
}

/**
 * Serializes a time capsule into a rich in-chat share string.
 * @param {object} capsule
 * @param {object} [sender]
 * @returns {string}
 */
export function formatTimeCapsuleChatShare(capsule, sender) {
  const payload = {
    id: capsule.id,
    title: capsule.title,
    occasion: capsule.occasion || 'anniversary',
    unlock_at: capsule.unlock_at,
    theme: capsule.theme || 'classic_rose',
    seal_symbol: capsule.seal_symbol || 'heart',
    sender_name: sender?.name || 'Your Partner',
    sender_id: capsule.user_id,
    has_audio: !!capsule.audio_url,
    has_photo: !!capsule.photo_url,
  };

  return `[TIME_CAPSULE:${JSON.stringify(payload)}]`;
}

/**
 * Parses an in-chat message to see if it is a Time Capsule card share.
 * @param {string} text
 * @returns {object|null}
 */
export function parseTimeCapsuleChatShare(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/^\[TIME_CAPSULE:(\{.*?\})\]$/);
  if (!match) return null;

  try {
    const data = JSON.parse(match[1]);
    if (data && data.id && data.title && data.unlock_at) {
      return data;
    }
  } catch {
    // Malformed JSON fallback
  }
  return null;
}
