/**
 * Daily "Us" Prompts Bank (ദിവസേനയുള്ള "നമ്മൾ" ചോദ്യങ്ങൾ)
 * Curated romantic, playful, deep, and nostalgic prompts for couples.
 */

export const PROMPT_CATEGORIES = Object.freeze({
  memories: {
    id: 'memories',
    labelEn: 'Memory Lane',
    labelMl: 'ഓർമ്മച്ചെപ്പ് 💫',
    color: '#8b5cf6',
  },
  romance: {
    id: 'romance',
    labelEn: 'Sweet Romance',
    labelMl: 'പ്രണയം ❤️',
    color: '#f43f5e',
  },
  deep: {
    id: 'deep',
    labelEn: 'Heart to Heart',
    labelMl: 'ഉള്ളുതുറന്ന് 🌙',
    color: '#0ea5e9',
  },
  playful: {
    id: 'playful',
    labelEn: 'Playful & Silly',
    labelMl: 'കുസൃതി 🤪',
    color: '#f59e0b',
  },
  dreams: {
    id: 'dreams',
    labelEn: 'Future Dreams',
    labelMl: 'സ്വപ്നക്കൂട് 🏡',
    color: '#10b981',
  },
});

export const DAILY_PROMPTS = [
  {
    id: 'prompt_unforgettable_moment',
    question_ml: 'നമ്മൾ ഒന്നിച്ചുണ്ടായിരുന്നതിൽ ഏറ്റവും മറക്കാനാവാത്ത നിമിഷം ഏതാണ്?',
    question_en: "What was our most unforgettable moment together so far?",
    category: 'memories',
    icon: '✨',
    sparks: ['ആദ്യത്തെ യാത്ര ✈️', 'ആ മഴയത്തുള്ള നടത്തം 🌧️', 'നമ്മുടെ പ്രത്യേക ദിവസം 💫'],
  },
  {
    id: 'prompt_first_impression',
    question_ml: 'എന്നെ ആദ്യമായി കണ്ടപ്പോൾ നിന്റെ മനസ്സിൽ തോന്നിയ ആദ്യ ചിന്ത എന്തായിരുന്നു?',
    question_en: 'What was your very first thought when you first saw me?',
    category: 'romance',
    icon: '👀',
    sparks: ['ആ നോട്ടം 🙈', 'ആദ്യമായി സംസാരിച്ചപ്പോൾ 💬', 'ഹൃദയം മിടിച്ച ആ നിമിഷം 💓'],
  },
  {
    id: 'prompt_favorite_secret',
    question_ml: 'നമുക്ക് രണ്ടുപേർക്കും മാത്രം അറിയാവുന്ന, മറ്റാരോടും പറയാത്ത ഒരു രഹസ്യം?',
    question_en: 'A special secret that only the two of us know and will never tell anyone?',
    category: 'deep',
    icon: '🤫',
    sparks: ['നമ്മുടെ ആ കൊച്ചു നുണ 🤭', 'അന്ന് രാത്രി സംഭവിച്ചത് 🌙', 'ആ രഹസ്യ സ്വപ്നം 🗝️'],
  },
  {
    id: 'prompt_cook_for_me',
    question_ml: 'നീ എനിക്ക് വേണ്ടി സ്വന്തം കൈകൊണ്ട് ഉണ്ടാക്കിത്തരാൻ ഏറ്റവും ഇഷ്ടപ്പെടുന്ന ഭക്ഷണം?',
    question_en: "What special dish would you love to cook for me with your own hands?",
    category: 'playful',
    icon: '🍲',
    sparks: ['ഒരു ചൂടു ചായയും പലഹാരവും ☕', 'എന്റെ പ്രിയപ്പെട്ട ബിരിയാണി 🍛', 'സ്പെഷ്യൽ ഡെസേർട്ട് 🍰'],
  },
  {
    id: 'prompt_dream_trip',
    question_ml: 'നമ്മൾ രണ്ടുപേരും മാത്രം പോവാൻ ഏറ്റവും കൊതിക്കുന്ന സ്വപ്ന യാത്ര എവിടേക്കാണ്?',
    question_en: 'Where is the dream destination you want us two to escape to together?',
    category: 'dreams',
    icon: '✈️',
    sparks: ['ഒരു മഞ്ഞു മലനിര ❄️', 'ശാന്തമായ കടൽത്തീരം 🌊', 'ആളൊഴിഞ്ഞൊരു കാടകം 🌲'],
  },
  {
    id: 'prompt_silly_habit',
    question_ml: 'നിന്നെ എപ്പോഴും ചിരിപ്പിക്കുന്ന അല്ലെങ്കിൽ കളിപ്പിക്കുന്ന എന്റെ ഒരു സ്വഭാവം?',
    question_en: 'What silly habit of mine never fails to make you smile or laugh?',
    category: 'playful',
    icon: '😄',
    sparks: ['എന്റെ ദേഷ്യം അഭിനയിക്കൽ 😤', 'ആ കൊച്ചു കൊഞ്ചലുകൾ 🥺', 'പാട്ട് പാടുമ്പോഴുള്ള കോപ്രായം 🎶'],
  },
  {
    id: 'prompt_our_song',
    question_ml: 'നമ്മൾ ഒരുമിച്ച് കേൾക്കുമ്പോൾ "ഇത് നമ്മുടേതാണ്" എന്ന് തോന്നുന്ന ആ ഒരു പാട്ട്?',
    question_en: 'Which song feels like it was written just for the two of us?',
    category: 'romance',
    icon: '🎵',
    sparks: ['ആ പഴയ മെലഡി 📻', 'നമ്മൾ ഒരുമിച്ച് മൂളിയ വരികൾ 🎤', 'നമ്മുടെ ഫേവറിറ്റ് മൂവി സോങ് 🎬'],
  },
  {
    id: 'prompt_twenty_four_hours',
    question_ml: 'ഒരു മുഴുവൻ ദിവസവും ഫോണോ ശല്യങ്ങളോ ഇല്ലാതെ നമുക്ക് മാത്രമായി കിട്ടിയാൽ നീ എന്ത് ചെയ്യും?',
    question_en: 'If we had 24 uninterrupted hours with no phones or world, what would we do?',
    category: 'deep',
    icon: '⏳',
    sparks: ['നേരം വെളുക്കുവോളം വർത്തമാനം 🌙', 'കൈകോർത്ത് ഒരു നടത്തം 🤝', 'മടിപിടിച്ച് ഒരുമിച്ചിരിക്കുക ☕'],
  },
  {
    id: 'prompt_cherished_trait',
    question_ml: 'നമ്മുടെ ഈ ബന്ധത്തിൽ നീ ഏറ്റവും കൂടുതൽ വിലമതിക്കുന്ന കാര്യം എന്താണ്?',
    question_en: 'What quality about our bond do you cherish the most deeply?',
    category: 'deep',
    icon: '💎',
    sparks: ['പരസ്പരമുള്ള വിശ്വാസം 🤝', 'മനസ്സുതുറന്നുള്ള സ്വാതന്ത്ര്യം 🕊️', 'മായാത്ത സ്നേഹം ❤️'],
  },
  {
    id: 'prompt_missing_you_thought',
    question_ml: 'എന്നെ ഒരുപാട് മിസ്സ് ചെയ്യുമ്പോൾ നിന്റെ ഓർമ്മയിൽ ആദ്യം ഓടിയെത്തുന്നതെന്താണ്?',
    question_en: 'When you miss me so badly, what is the first memory that runs into your mind?',
    category: 'romance',
    icon: '💭',
    sparks: ['ആ ചിരി ഓർക്കുമ്പോൾ 😊', 'അവസാനം പറഞ്ഞ വാക്കുകൾ 💬', 'ഒന്നിച്ച് കൈകോർത്ത നിമിഷം 🫂'],
  },
  {
    id: 'prompt_growing_old',
    question_ml: 'നമുക്ക് ഒരുമിച്ച് പ്രായമാകുമ്പോൾ നമ്മൾ എങ്ങനെയായിരിക്കും എന്നാണ് നിന്റെ സങ്കൽപം?',
    question_en: 'How do you picture us when we grow wrinkled and old together?',
    category: 'dreams',
    icon: '👵👴',
    sparks: ['വരാന്തയിലിരുന്ന് ചായ കുടിക്കും 🍵', 'അപ്പോഴും ഇതുപോലെ കളി പറയും 🤭', 'എന്നും പ്രണയത്തോടെ ❤️'],
  },
  {
    id: 'prompt_heart_words',
    question_ml: 'ഞാൻ എപ്പോഴോ പറഞ്ഞതിൽ നിന്റെ ഹൃദയത്തിൽ ഇപ്പോഴും മായാതെ നിൽക്കുന്ന വാക്കുകൾ?',
    question_en: 'What words of mine have remained deeply etched in your heart?',
    category: 'deep',
    icon: '💌',
    sparks: ['ആ ഒരു ഉറപ്പ് 🤞', 'സങ്കടം വന്നപ്പോൾ പറഞ്ഞ ആശ്വാസം 🤍', 'ആദ്യമായി പറഞ്ഞ ഐ ലവ് യു 💖'],
  },
  {
    id: 'prompt_comfort_superpower',
    question_ml: 'എനിക്ക് നല്ല സങ്കടമോ സങ്കീർണ്ണതയോ വരുമ്പോൾ എന്നെ ചിരിപ്പിക്കാൻ നീ ചെയ്യുന്ന മാജിക്?',
    question_en: 'When I am having a rough or low day, what is your magic way to comfort me?',
    category: 'playful',
    icon: '🪄',
    sparks: ['ഒരു നീണ്ട ആലിംഗനം 🫂', 'കളിതമാശകൾ പറഞ്ഞു ചിരിപ്പിക്കൽ 😂', 'പ്രിയപ്പെട്ട ഭക്ഷണം വാങ്ങിത്തരൽ 🍫'],
  },
  {
    id: 'prompt_favorite_gift',
    question_ml: 'ഞാൻ നിനക്ക് തന്നതിൽ ഏറ്റവും പ്രിയപ്പെട്ട സമ്മാനമോ ഓർമ്മയോ ഏതാണ്?',
    question_en: 'What is the most precious gift or little token I have ever given you?',
    category: 'memories',
    icon: '🎁',
    sparks: ['ആ ചെറിയ കത്ത് 📜', 'ഒരു പ്രത്യേക സമ്മാനം 🎀', 'നീ തന്ന ആ സമയം ⏳'],
  },
  {
    id: 'prompt_future_milestone',
    question_ml: 'നമ്മുടെ ജീവിതത്തിൽ വരാനിരിക്കുന്ന ദിവസങ്ങളിൽ നീ ഏറ്റവും കാത്തിരിക്കുന്ന നിമിഷം?',
    question_en: 'What future milestone are you most excited for us to celebrate together?',
    category: 'dreams',
    icon: '🌟',
    sparks: ['നമ്മുടെ സ്വന്തം വീട് 🏡', 'ആ വലിയ വിജയം 🏆', 'ഒരുമിച്ചുള്ള പുലരികൾ 🌅'],
  },
  {
    id: 'prompt_spark_in_eyes',
    question_ml: 'എന്റെ കണ്ണുകളിലോ ചിരിയിലോ നിന്നെ ഏറ്റവും കൂടുതൽ ആകർഷിക്കുന്നത് എന്താണ്?',
    question_en: 'What is that little spark in my eyes or smile that catches your heart every time?',
    category: 'romance',
    icon: '🥰',
    sparks: ['കണ്ണുകളിലെ കുസൃതി 💫', 'മനസ്സുതുറന്നുള്ള ആ പൊട്ടിച്ചിരി 😄', 'സ്നേഹത്തോടെയുള്ള നോട്ടം 💖'],
  },
  {
    id: 'prompt_midnight_cravings',
    question_ml: 'അർദ്ധരാത്രി 2 മണിക്ക് നമ്മൾ ഒരുമിച്ച് ഉണ്ടാക്കിക്കഴിക്കാൻ കൊതിക്കുന്ന പലഹാരം?',
    question_en: 'At 2 AM when everyone is asleep, what midnight snack would we sneak and eat together?',
    category: 'playful',
    icon: '🌙',
    sparks: ['മാഗി നൂഡിൽസ് 🍜', 'ഐസ്ക്രീം ടബ് 🍨', 'ചൂട് കാപ്പി ☕'],
  },
  {
    id: 'prompt_superhero_couple',
    question_ml: 'നമുക്ക് രണ്ടുപേർക്കും ഓരോ സൂപ്പർ പവർ കിട്ടിയാൽ നമ്മൾ എന്ത് ചെയ്യും?',
    question_en: 'If the two of us had super powers, what cute or wild thing would we do?',
    category: 'playful',
    icon: '🦸‍♀️🦸‍♂️',
    sparks: ['ഞൊടിയിടയിൽ പരസ്പരം അടുത്തെത്തും ⚡', 'ലോകം ചുറ്റി പറക്കും 🌍', 'സമയം നിശ്ചലമാക്കും ⏱️'],
  },
  {
    id: 'prompt_first_realization_love',
    question_ml: 'നമ്മൾ സാധാരണ സുഹൃത്തുക്കൾ മാത്രമല്ല, മറ്റെന്തോ ആണെന്ന് മനസ്സിൽ ആദ്യമായി തോന്നിയ നിമിഷം?',
    question_en: 'The very exact moment you realized this is not just casual, but something truly deep?',
    category: 'romance',
    icon: '💘',
    sparks: ['ആ നീണ്ട ഫോൺ കോൾ 📞', 'ഒരുമിച്ചുണ്ടായിരുന്ന ആ വൈകുന്നേരം 🌇', 'വിടപറയാൻ തോന്നാത്ത ആ നിമിഷം 🥺'],
  },
  {
    id: 'prompt_grateful_today',
    question_ml: 'ഇന്നത്തെ ഈ ദിവസം എന്നെക്കുറിച്ച് ഓർത്ത് നിനക്ക് ഏറ്റവും സന്തോഷം തോന്നിയ ഒരു കാര്യം?',
    question_en: 'Today, what is one small thing about me that made you feel grateful or warm?',
    category: 'deep',
    icon: '🌸',
    sparks: ['നീ അയച്ച മെസ്സേജ് 💌', 'നിന്റെ ശബ്ദം കേട്ടപ്പോൾ 🎙️', 'നീ കൂടെയുണ്ടെന്ന ധൈര്യം 🤍'],
  },
];

/**
 * Deterministically pick today's prompt based on date string (YYYY-MM-DD).
 */
export function getPromptForDate(dateStr, offset = 0) {
  if (!dateStr || typeof dateStr !== 'string') {
    dateStr = getTodayDateKey();
  }
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  const index = Math.abs(hash + offset) % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[index];
}

/**
 * Returns date formatted as 'YYYY-MM-DD' in local timezone.
 */
export function getTodayDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats date key into human-readable English + Malayalam representation.
 */
export function formatPromptDateLabel(dateStr) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const en = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return en;
  } catch {
    return dateStr;
  }
}
