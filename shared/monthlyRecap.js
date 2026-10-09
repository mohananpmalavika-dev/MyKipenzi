/**
 * Kipenzi Connect - "Our Month in Review" AI Recap Story
 * Shared utilities for monthly analytics, poetic recaps, and story sharing
 */

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_ML = [
  'ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മേയ്', 'ജൂൺ',
  'ജൂലൈ', 'ആഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ'
];

/**
 * Format year and month string YYYY-MM
 */
export function formatMonthKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get display label for month in English and Malayalam
 */
export function getMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    const now = new Date();
    return {
      en: `${MONTH_NAMES_EN[now.getMonth()]} ${now.getFullYear()}`,
      ml: `${MONTH_NAMES_ML[now.getMonth()]} ${now.getFullYear()}`,
      monthNameEn: MONTH_NAMES_EN[now.getMonth()],
      monthNameMl: MONTH_NAMES_ML[now.getMonth()],
      year: now.getFullYear(),
    };
  }

  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;

  return {
    en: `${MONTH_NAMES_EN[monthIdx] || 'Month'} ${year}`,
    ml: `${MONTH_NAMES_ML[monthIdx] || 'മാസം'} ${year}`,
    monthNameEn: MONTH_NAMES_EN[monthIdx] || '',
    monthNameMl: MONTH_NAMES_ML[monthIdx] || '',
    year,
  };
}

/**
 * Return list of past 12 months for selector
 */
export function getAvailableRecapMonths(count = 6, refDate = new Date()) {
  const months = [];
  const curr = new Date(refDate);

  for (let i = 0; i < count; i++) {
    const key = formatMonthKey(curr);
    const label = getMonthLabel(key);
    months.push({
      key,
      ...label,
      isCurrent: i === 0,
    });
    // move back 1 month
    curr.setMonth(curr.getMonth() - 1);
  }
  return months;
}

/**
 * Generates an evocative AI romantic chronicle / summary poem for the month
 */
export function generateMonthlyPoeticChronicle(stats, partnerName = 'Sweetheart', monthKey) {
  const { en: monthEn, ml: monthMl } = getMonthLabel(monthKey);
  const messagesCount = stats?.messagesCount || 0;
  const photosCount = stats?.photosCount || 0;
  const voiceNotesCount = stats?.voiceNotesCount || 0;
  const heartbeatsCount = stats?.heartbeatsCount || 0;
  const touchesCount = stats?.touchesCount || 0;
  const duetCount = stats?.duetCount || 0;

  // Malayalam Poetic Summary
  let poemMl = '';
  let highlightMl = '';
  if (messagesCount > 50 || photosCount > 5 || heartbeatsCount > 10) {
    poemMl = `${monthMl} മാസത്തിലെ ഓരോ സായാഹ്നങ്ങളിലും നമ്മുടെ പ്രണയം പൂത്തുലഞ്ഞു. ${partnerName}യുമൊത്ത് പങ്കുവെച്ച ${messagesCount} സന്ദേശങ്ങളും ${photosCount > 0 ? `${photosCount} സുന്ദര ചിത്രങ്ങളും ` : ''}${heartbeatsCount > 0 ? `${heartbeatsCount} ഹൃദയസ്പന്ദനങ്ങളും ` : ''}ഈ മാസത്തെ നമ്മുടെ ജീവിതത്തിലെ ഏറ്റവും ധന്യമായ അധ്യായമാക്കി മാറ്റി. വാക്കുകൾക്കപ്പുറം ഹൃദയങ്ങൾ ഒന്നിച്ച മാസമാണിത്.`;
    highlightMl = `നമ്മുടെ സ്നേഹം ഏറ്റവും മനോഹരമായി ഒഴുകിനടന്ന സുവർണ്ണ നിമിഷങ്ങൾ ✨`;
  } else {
    poemMl = `${monthMl} മാസത്തിൽ അകലങ്ങളിൽ നിന്നുകൊണ്ട് നാം ചേർത്തുവെച്ച കൊച്ചു കൊച്ചു ഓർമ്മകൾ. ${partnerName} നൽകിയ ഓരോ സ്നേഹസ്പർശവും കാത്തിരിപ്പിന് മാധുര്യമേകി.`;
    highlightMl = `ഓർമ്മകൾക്ക് തിളക്കമേകിയ കൊച്ചു നിമിഷങ്ങൾ 💖`;
  }

  // English Poetic Summary
  let poemEn = '';
  let highlightEn = '';
  if (messagesCount > 50 || photosCount > 5 || heartbeatsCount > 10) {
    poemEn = `Throughout ${monthEn}, every sunrise and midnight carried whispers of us. With ${messagesCount} heartfelt messages, ${photosCount} captured smiles, and ${heartbeatsCount + touchesCount} synchronized heartbeats, this month blossomed into an unforgettable chapter of togetherness with ${partnerName}.`;
    highlightEn = `A golden month overflowing with warmth, shared laughter, and quiet devotion ✨`;
  } else {
    poemEn = `Even in the quietest days of ${monthEn}, every tender thought brought us closer. A tapestry of love and cherished whispers shared with ${partnerName}.`;
    highlightEn = `Gentle moments that proved distance only makes the heart grow fonder 💖`;
  }

  return {
    poemMl,
    poemEn,
    highlightMl,
    highlightEn,
    titleEn: `Our ${monthEn} in Review`,
    titleMl: `നമ്മുടെ ${monthMl} ഓർമ്മകൾ`,
  };
}

/**
 * Format monthly recap into chat share card
 */
export function formatMonthlyRecapShare(recap) {
  const payload = {
    month: recap.monthKey,
    titleEn: recap.titleEn || `Our Month in Review`,
    titleMl: recap.titleMl || `നമ്മുടെ പ്രതിമാസ ഓർമ്മകൾ`,
    stats: {
      messagesCount: recap.stats?.messagesCount || 0,
      photosCount: recap.stats?.photosCount || 0,
      voiceNotesCount: recap.stats?.voiceNotesCount || 0,
      heartbeatsCount: recap.stats?.heartbeatsCount || 0,
      duetCount: recap.stats?.duetCount || 0,
    },
    highlightMl: recap.chronicle?.highlightMl || '',
    highlightEn: recap.chronicle?.highlightEn || '',
  };

  return `[MONTHLY_RECAP:${JSON.stringify(payload)}]`;
}

/**
 * Parse monthly recap share card from chat message
 */
export function parseMonthlyRecapShare(text) {
  if (!text || typeof text !== 'string') return null;

  if (text.startsWith('[MONTHLY_RECAP:') && text.endsWith(']')) {
    try {
      const jsonStr = text.slice(15, -1);
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  // Fallback for markdown/legacy
  if (text.includes('📸🎞️ [Monthly Recap') || text.includes('📸🎞️ [Our Month in Review')) {
    return {
      month: formatMonthKey(),
      titleEn: 'Our Month in Review',
      titleMl: 'നമ്മുടെ പ്രതിമാസ ഓർമ്മകൾ',
      stats: { messagesCount: 0, photosCount: 0, voiceNotesCount: 0, heartbeatsCount: 0 },
    };
  }

  return null;
}
