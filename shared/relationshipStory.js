/**
 * Relationship Timeline & Milestone Counter ("Our Story" / "നമ്മുടെ കഥ")
 * Shared business logic, date calculations, milestones, and timeline helpers.
 */

export const STORY_CATEGORIES = Object.freeze({
  first_chat: {
    id: 'first_chat',
    labelEn: 'First Chat',
    labelMl: 'ആദ്യ ചാറ്റ് 💬',
    icon: '💬',
    color: '#3b82f6',
    badge: 'Where It Began',
  },
  first_date: {
    id: 'first_date',
    labelEn: 'First Date',
    labelMl: 'ആദ്യ കൂടിക്കാഴ്ച ☕',
    icon: '☕',
    color: '#ec4899',
    badge: 'Butterflies',
  },
  proposal: {
    id: 'proposal',
    labelEn: 'Proposal Moment',
    labelMl: 'പ്രൊപ്പോസൽ 💍',
    icon: '💍',
    color: '#8b5cf6',
    badge: 'She Said Yes',
  },
  official_start: {
    id: 'official_start',
    labelEn: 'Day We Became "Us"',
    labelMl: 'ഒരുമിച്ചായ ദിവസം 💖',
    icon: '💖',
    color: '#ef4444',
    badge: 'Official Love',
  },
  anniversary: {
    id: 'anniversary',
    labelEn: 'Anniversary',
    labelMl: 'വാർഷികം / ആനിവേഴ്സറി 🥂',
    icon: '🥂',
    color: '#f59e0b',
    badge: 'Forever & Always',
  },
  trip: {
    id: 'trip',
    labelEn: 'Romantic Trip',
    labelMl: 'യാത്ര ✈️',
    icon: '✈️',
    color: '#10b981',
    badge: 'Adventures',
  },
  photo_memory: {
    id: 'photo_memory',
    labelEn: 'Photo Memory',
    labelMl: 'ഫോട്ടോ ഓർമ്മ 📸',
    icon: '📸',
    color: '#6366f1',
    badge: 'Captured Moment',
  },
  sweet_moment: {
    id: 'sweet_moment',
    labelEn: 'Special Moment',
    labelMl: 'പ്രത്യേക നിമിഷം ✨',
    icon: '✨',
    color: '#14b8a6',
    badge: 'Pure Magic',
  },
});

export const PRESET_MILESTONES = [
  100, 200, 300, 365, 500, 730, 1000, 1500, 2000, 2500, 3000, 3650, 5000,
];

/**
 * Normalizes date object or string into UTC midnight or local date parts
 */
export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  // If string format is YYYY-MM-DD
  const parts = String(dateInput).slice(0, 10).split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates days together and breakdown (years, months, days)
 */
export function calculateDaysTogether(startDateInput, referenceDate = new Date()) {
  const start = parseDate(startDateInput);
  if (!start) {
    return {
      totalDays: 0,
      years: 0,
      months: 0,
      days: 0,
      formattedDurationEn: '0 days',
      formattedDurationMl: '0 ദിവസങ്ങൾ',
      headlineTextEn: 'Together for 0 days',
      headlineTextMl: 'ഒരുമിച്ച് 0 ദിവസങ്ങൾ',
      nextMilestone: null,
      passedMilestones: [],
    };
  }

  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  // Normalize both dates to midnight local time for pure day difference
  const startMid = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = nowMid.getTime() - startMid.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / msPerDay));

  // Calculate detailed year, month, day breakdown
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // Days in previous month
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) {
    years = 0;
    months = 0;
    days = 0;
  }

  // Duration text formatting
  const partsEn = [];
  const partsMl = [];

  if (years > 0) {
    partsEn.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
    partsMl.push(`${years} വർഷം`);
  }
  if (months > 0) {
    partsEn.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
    partsMl.push(`${months} മാസം`);
  }
  if (days > 0 || (years === 0 && months === 0)) {
    partsEn.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
    partsMl.push(`${days} ദിവസം`);
  }

  const formattedDurationEn = partsEn.join(', ');
  const formattedDurationMl = partsMl.join(', ');
  const headlineTextEn = `Together for ${totalDays} ${totalDays === 1 ? 'Day' : 'Days'}`;
  const headlineTextMl = `ഒരുമിച്ച് ${totalDays} ദിവസങ്ങൾ`;

  // Milestone progression (e.g. 100, 365, 500, 1000 days)
  let nextMilestoneDays = PRESET_MILESTONES.find((m) => m > totalDays);
  if (!nextMilestoneDays) {
    nextMilestoneDays = Math.ceil((totalDays + 1) / 500) * 500;
  }

  // Previous milestone target
  const prevMilestoneDays =
    [...PRESET_MILESTONES].reverse().find((m) => m <= totalDays) || 0;

  const daysRemaining = Math.max(0, nextMilestoneDays - totalDays);
  const milestoneRange = nextMilestoneDays - prevMilestoneDays;
  const progressSoFar = totalDays - prevMilestoneDays;
  const progressPercentage = Math.min(
    100,
    Math.max(0, Math.round((progressSoFar / Math.max(1, milestoneRange)) * 100)),
  );

  const nextMilestone = {
    targetDays: nextMilestoneDays,
    daysRemaining,
    progressPercentage,
    labelEn: `${nextMilestoneDays} Days Milestone 💖`,
    labelMl: `${nextMilestoneDays} ദിവസങ്ങളുടെ നാഴികക്കല്ല്! ✨`,
  };

  const passedMilestones = PRESET_MILESTONES.filter((m) => m <= totalDays).map((m) => {
    const reachedDate = new Date(startMid.getTime() + m * msPerDay);
    return {
      days: m,
      reachedDate: formatDateKey(reachedDate),
      labelEn: `${m} Days Together`,
      labelMl: `${m} ദിവസങ്ങൾ ഒരുമിച്ച്`,
    };
  });

  return {
    totalDays,
    years,
    months,
    days,
    formattedDurationEn,
    formattedDurationMl,
    headlineTextEn,
    headlineTextMl,
    nextMilestone,
    passedMilestones,
    startDateFormatted: formatDateKey(start),
  };
}

/**
 * Calculates countdown for an upcoming special date or recurring anniversary
 */
export function calculateMilestoneCountdown(targetDateInput, isAnnual = false, referenceDate = new Date()) {
  const target = parseDate(targetDateInput);
  if (!target) return null;

  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  let nextTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0);

  if (isAnnual) {
    // For annual recurring events (e.g. Anniversary), compute next celebration in this or next year
    nextTarget.setFullYear(now.getFullYear());
    // If today is past that date this year (ignoring hours)
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    if (nextTarget < todayMid) {
      nextTarget.setFullYear(now.getFullYear() + 1);
    }
  }

  // Diff in milliseconds
  const diffMs = nextTarget.getTime() - now.getTime();
  const isToday =
    now.getFullYear() === nextTarget.getFullYear() &&
    now.getMonth() === nextTarget.getMonth() &&
    now.getDate() === nextTarget.getDate();

  const isPast = diffMs < 0 && !isToday;

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let humanTextEn = `${days} ${days === 1 ? 'day' : 'days'} left`;
  let humanTextMl = `${days} ദിവസം ബാക്കി`;

  if (isToday) {
    humanTextEn = "Today is the special day! 🎉 Happy Anniversary!";
    humanTextMl = 'ഇന്നാണ് ആ വിശേഷ ദിവസം! 🎉 ഹൃദയം നിറഞ്ഞ ആശംസകൾ!';
  } else if (days === 1) {
    humanTextEn = 'Tomorrow! ✨';
    humanTextMl = 'നാളെയാണ്! ✨';
  } else if (days === 0 && !isPast) {
    humanTextEn = `${hours}h ${minutes}m left`;
    humanTextMl = `${hours} മണിക്കൂർ ബാക്കി`;
  }

  return {
    targetDateFormatted: formatDateKey(nextTarget),
    originalDateFormatted: formatDateKey(target),
    isAnnual,
    isToday,
    isPast,
    days,
    hours,
    minutes,
    seconds,
    totalSecondsRemaining: isPast ? -1 : totalSeconds,
    humanTextEn,
    humanTextMl,
  };
}

/**
 * Builds list of initial default memories when none exist yet
 */
export function buildDefaultMemories(startDateStr, _partnerName = 'My Love') {
  const start = parseDate(startDateStr) || new Date();
  const firstDate = new Date(start.getTime() - 14 * 24 * 3600 * 1000);
  const firstChatDate = new Date(start.getTime() - 45 * 24 * 3600 * 1000);

  return [
    {
      id: 'mem_first_chat',
      title: 'ആദ്യമായി സംസാരിച്ച നിമിഷം (Our First "Hi")',
      memory_date: formatDateKey(firstChatDate),
      category: 'first_chat',
      emoji: '💬',
      description: 'The first message that turned a stranger into my favorite person in the entire universe. A nervous "Hello" that changed our lives forever.',
      reactions: ['❤️', '🥰'],
    },
    {
      id: 'mem_first_date',
      title: 'ആദ്യ കൂടിക്കാഴ്ച (Our First Date)',
      memory_date: formatDateKey(firstDate),
      category: 'first_date',
      emoji: '☕',
      description: 'Hands trembling, smiles holding back a thousand thoughts. Coffee was cold, but hearts were overflowing with warmth.',
      reactions: ['🥰', '💖', '✨'],
    },
    {
      id: 'mem_official_start',
      title: 'നമ്മൾ ഒന്നിച്ചായ ദിവസം (The Day "Us" Began)',
      memory_date: formatDateKey(start),
      category: 'official_start',
      emoji: '💖',
      description: 'The day we promised to stand by each other through all the sunshine and thunderstorms. Two souls woven into one beautiful story.',
      reactions: ['❤️', '💍', '🥹'],
    },
  ];
}

/**
 * Message sharing formatting
 */
export const STORY_SHARE_PREFIX_MEMORY = '[OUR_STORY_MEMORY]';
export const STORY_SHARE_PREFIX_MILESTONE = '[OUR_STORY_MILESTONE]';

export function formatStoryMemoryShare(memory) {
  return `${STORY_SHARE_PREFIX_MEMORY}\n${JSON.stringify({
    id: memory.id,
    title: memory.title,
    date: memory.memory_date,
    category: memory.category,
    emoji: memory.emoji || '✨',
    description: memory.description || '',
    photo_url: memory.photo_url || null,
  })}`;
}

export function formatStoryMilestoneShare(milestoneData) {
  return `${STORY_SHARE_PREFIX_MILESTONE}\n${JSON.stringify({
    title: milestoneData.title,
    daysTogether: milestoneData.daysTogether,
    daysRemaining: milestoneData.daysRemaining,
    targetDate: milestoneData.targetDate,
    category: milestoneData.category || 'milestone',
    emoji: milestoneData.emoji || '💖',
    note: milestoneData.note || '',
  })}`;
}

export function parseStoryShare(content) {
  if (!content || typeof content !== 'string') return null;
  const trimmed = content.trim();

  if (trimmed.startsWith(STORY_SHARE_PREFIX_MEMORY)) {
    try {
      const jsonStr = trimmed.slice(STORY_SHARE_PREFIX_MEMORY.length).trim();
      const data = JSON.parse(jsonStr);
      return { type: 'memory', ...data };
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith(STORY_SHARE_PREFIX_MILESTONE)) {
    try {
      const jsonStr = trimmed.slice(STORY_SHARE_PREFIX_MILESTONE.length).trim();
      const data = JSON.parse(jsonStr);
      return { type: 'milestone', ...data };
    } catch {
      return null;
    }
  }

  return null;
}
