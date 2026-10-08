/**
 * Shared Calendar & To-Do Lists Business Logic
 */

export const EVENT_CATEGORIES = Object.freeze({
  anniversary: {
    id: 'anniversary',
    labelEn: 'Anniversary',
    labelMl: 'വാർഷികം 💕',
    icon: '💕',
    color: '#f43f5e',
  },
  birthday: {
    id: 'birthday',
    labelEn: 'Birthday',
    labelMl: 'ജന്മദിനം 🎂',
    icon: '🎂',
    color: '#f59e0b',
  },
  date_night: {
    id: 'date_night',
    labelEn: 'Date Night',
    labelMl: 'ഡേറ്റ് നൈറ്റ് 🌹',
    icon: '🌹',
    color: '#ec4899',
  },
  special_date: {
    id: 'special_date',
    labelEn: 'Special Date',
    labelMl: 'പ്രത്യേക ദിവസം ✨',
    icon: '✨',
    color: '#8b5cf6',
  },
  trip: {
    id: 'trip',
    labelEn: 'Trip',
    labelMl: 'യാത്ര ✈️',
    icon: '✈️',
    color: '#10b981',
  },
  appointment: {
    id: 'appointment',
    labelEn: 'Appointment',
    labelMl: 'അപ്പോയിൻമെന്റ് 📋',
    icon: '📋',
    color: '#6366f1',
  },
  other: {
    id: 'other',
    labelEn: 'Other',
    labelMl: 'മറ്റുള്ളവ 📅',
    icon: '📅',
    color: '#64748b',
  },
});

export const REMINDER_OPTIONS = Object.freeze([
  { value: 0, labelEn: 'No reminder', labelMl: 'റിമൈൻഡർ വേണ്ട' },
  { value: 15, labelEn: '15 minutes before', labelMl: '15 മിനിറ്റ് മുമ്പ്' },
  { value: 30, labelEn: '30 minutes before', labelMl: '30 മിനിറ്റ് മുമ്പ്' },
  { value: 60, labelEn: '1 hour before', labelMl: '1 മണിക്കൂർ മുമ്പ്' },
  { value: 120, labelEn: '2 hours before', labelMl: '2 മണിക്കൂർ മുമ്പ്' },
  { value: 1440, labelEn: '1 day before', labelMl: '1 ദിവസം മുമ്പ്' },
  { value: 2880, labelEn: '2 days before', labelMl: '2 ദിവസം മുമ്പ്' },
  { value: 10080, labelEn: '1 week before', labelMl: '1 ആഴ്ച മുമ്പ്' },
]);

export const RECURRENCE_PATTERNS = Object.freeze([
  { value: null, labelEn: 'Does not repeat', labelMl: 'ആവർത്തിക്കില്ല' },
  { value: 'daily', labelEn: 'Daily', labelMl: 'ദിവസവും' },
  { value: 'weekly', labelEn: 'Weekly', labelMl: 'ആഴ്ചതോറും' },
  { value: 'monthly', labelEn: 'Monthly', labelMl: 'മാസം തോറും' },
  { value: 'yearly', labelEn: 'Yearly', labelMl: 'വർഷം തോറും' },
]);

export const TODO_PRIORITIES = Object.freeze([
  { value: 'low', labelEn: 'Low', labelMl: 'കുറവ്', color: '#64748b' },
  { value: 'normal', labelEn: 'Normal', labelMl: 'സാധാരണ', color: '#3b82f6' },
  { value: 'high', labelEn: 'High', labelMl: 'ഉയർന്നത്', color: '#ef4444' },
]);

/**
 * Calculate countdown to an event
 */
export function calculateCountdown(eventDate, eventTime = null) {
  const now = new Date();
  const target = new Date(eventDate);

  if (eventTime) {
    const [hours, minutes] = eventTime.split(':').map(Number);
    target.setHours(hours, minutes, 0, 0);
  } else {
    target.setHours(23, 59, 59, 999);
  }

  const diffMs = target.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

  let countdownText = '';
  let countdownTextMl = '';

  if (days > 0) {
    countdownText = `${days} day${days > 1 ? 's' : ''}`;
    countdownTextMl = `${days} ദിവസം`;
  } else if (hours > 0) {
    countdownText = `${hours} hour${hours > 1 ? 's' : ''}`;
    countdownTextMl = `${hours} മണിക്കൂർ`;
  } else {
    countdownText = `${minutes} minute${minutes > 1 ? 's' : ''}`;
    countdownTextMl = `${minutes} മിനിറ്റ്`;
  }

  return {
    days,
    hours,
    minutes,
    isPast,
    countdownText: isPast ? `${countdownText} ago` : `in ${countdownText}`,
    countdownTextMl: isPast ? `${countdownTextMl} മുമ്പ്` : `${countdownTextMl} കഴിഞ്ഞ്`,
    isToday: days === 0 && !isPast,
    isUpcoming: !isPast && days <= 7,
  };
}

/**
 * Format date for display
 */
export function formatEventDate(eventDate, eventTime = null, locale = 'en') {
  const date = new Date(eventDate);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  let formatted = dateFormatter.format(date);

  if (eventTime) {
    const [hours, minutes] = eventTime.split(':').map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours, minutes);
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    formatted += ` at ${timeFormatter.format(timeDate)}`;
  }

  return formatted;
}

/**
 * Validate event input
 */
export function validateEventInput(input) {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Event title is required');
  }

  if (input.title.length > 200) {
    throw new Error('Event title must be 200 characters or less');
  }

  if (input.description && input.description.length > 2000) {
    throw new Error('Event description must be 2000 characters or less');
  }

  if (!input.event_date) {
    throw new Error('Event date is required');
  }

  if (input.is_recurring && input.recurrence_pattern && input.recurrence_end_date) {
    const startDate = new Date(input.event_date);
    const endDate = new Date(input.recurrence_end_date);
    if (endDate <= startDate) {
      throw new Error('Recurrence end date must be after event start date');
    }
  }

  return true;
}

/**
 * Validate to-do input
 */
export function validateTodoInput(input) {
  if (!input.text || input.text.trim().length === 0) {
    throw new Error('To-do item text is required');
  }

  if (input.text.length > 500) {
    throw new Error('To-do item text must be 500 characters or less');
  }

  return true;
}
