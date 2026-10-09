// Presets and shared helpers for Romantic Surprises, Love Coupons, Couple Bucket List, and Date Night Wheel

export const LOVE_COUPON_PRESETS = [
  {
    id: 'head-massage',
    title: 'Free Head Massage 💆‍♂️',
    titleMl: 'സൗജന്യ തല മസ്സാജ് 💆‍♂️',
    emoji: '💆‍♂️',
    description: 'A soothing, relaxing 15-minute head & shoulder massage with scented oil and zero interruptions!',
    descriptionMl: 'മനോഹരമായ 15 മിനിറ്റ് റിലാക്സിങ് തല മസ്സാജ്. യാതൊരു പരാതികളും ഇല്ലാതെ!',
  },
  {
    id: 'fav-dinner',
    title: 'Cook your favorite dinner tonight 🍝',
    titleMl: 'ഇഷ്ട ഡിന്നർ ഇന്ന് ഞാൻ ഉണ്ടാക്കാം 🍝',
    emoji: '🍝',
    description: 'I will cook your favorite homemade comfort dinner with love, snacks, and dessert included!',
    descriptionMl: 'നിങ്ങൾക്ക് ഏറ്റവും ഇഷ്ടമുള്ള ഡിന്നർ ഇന്ന് ഞാൻ സ്നേഹത്തോടെ ഉണ്ടാക്കിത്തരും!',
  },
  {
    id: 'virtual-hug',
    title: '10-Minute Virtual Hug with no complaints 🫂',
    titleMl: '10 മിനിറ്റ് വാം ഹഗ്ഗ് (പരാതികളില്ലാതെ) 🫂',
    emoji: '🫂',
    description: 'A long, tender 10-minute tight hug (in person or synced virtual touch) with absolute warmth and comfort.',
    descriptionMl: 'കംപ്ലൈന്റുകളൊന്നുമില്ലാതെ മനസ്സ് നിറയുന്ന 10 മിനിറ്റ് ആലിംഗനം!',
  },
  {
    id: 'wish-granted',
    title: 'One Wish Granted anytime 🧞‍♀️',
    titleMl: 'എന്ത് ആഗ്രഹവും സാധിച്ചു തരും 🧞‍♀️',
    emoji: '🧞‍♀️',
    description: 'Your secret genie voucher! Redeem anytime for any cute favor, date, or treat of your choice.',
    descriptionMl: 'എപ്പോൾ വേണമെങ്കിലും റിഡീം ചെയ്യാം; നിങ്ങളുടെ ഇഷ്ടപ്പെട്ട ഒരു ആഗ്രഹം ഉടൻ സാധിച്ചു തരും!',
  },
  {
    id: 'midnight-dessert',
    title: 'Midnight Snack & Ice Cream Run 🍦',
    titleMl: 'പാതിരാ ഐസ്ക്രീം / സ്വീറ്റ്സ് ട്രീറ്റ് 🍦',
    emoji: '🍦',
    description: 'Late night cravings rescue! Immediate sweet treat or ice cream delivery with lots of love.',
    descriptionMl: 'പാതിരാത്രി മധുരം കഴിക്കാൻ തോന്നുമ്പോൾ ഉടനടി ഐസ്ക്രീം അല്ലെങ്കിൽ സ്വീറ്റ്സ്!',
  },
  {
    id: 'movie-night',
    title: 'Movie Night: Your Choice, Zero Vetoes 🍿',
    titleMl: 'സിനിമ നിന്റെ ചോയ്സ്, എനിക്ക് നോ പറയാൻ പറ്റില്ല 🍿',
    emoji: '🍿',
    description: 'You pick whatever movie, show, or anime we watch together, and I promise not to complain or look at my phone.',
    descriptionMl: 'ഇഷ്ടമുള്ള സിനിമയോ ഷോയോ തിരഞ്ഞെടുക്കാം, ഞാൻ നോ പറയാതെ കൂടെയിരുന്ന് കാണും!',
  },
  {
    id: 'forgive-pass',
    title: 'Forgive Any Small Argument Free Pass 🕊️',
    titleMl: 'ഒരു കുഞ്ഞു പിണക്കത്തിൽ നിന്ന് രക്ഷപ്പെടാൻ പാസ് 🕊️',
    emoji: '🕊️',
    description: 'Instant truce pass! Dissolve any stubborn disagreement with an instant kiss and a fresh start.',
    descriptionMl: 'ഒരു കുഞ്ഞു പിണക്കമോ വാശിയോ ഉടൻ മാറ്റി പരസ്പരം ചിരിക്കാനുള്ള മാന്ത്രിക പാസ്!',
  },
  {
    id: 'breakfast-bed',
    title: 'Morning Coffee & Breakfast in Bed ☕🥞',
    titleMl: 'ബെഡ് ടീ / കാപ്പിയും പ്രഭാതഭക്ഷണവും ☕🥞',
    emoji: '☕',
    description: 'Wake up completely lazy while I bring hot tea/coffee and tasty breakfast right to your bed.',
    descriptionMl: 'രാവിലെ എഴുന്നേൽക്കുമ്പോൾ ബെഡ് ടീയും ചൂടുള്ള ബ്രേക്ക്ഫാസ്റ്റും!',
  },
];

export const BUCKET_LIST_PRESETS = [
  {
    id: 'munnar-winter',
    title: 'മുന്നാറിൽ ഒരുമിച്ച് മഞ്ഞുകാലത്ത് യാത്ര പോവുക 🏔️',
    titleEn: 'Winter trip to Munnar misty tea gardens together',
    category: 'travel',
    emoji: '🏔️',
    notes: 'പുകമഞ്ഞിലൂടെ കൈകൾ കോർത്തുപിടിച്ച് നടക്കണം, ചൂട് ചായ കുടിക്കണം ☕',
  },
  {
    id: 'adopt-kitten',
    title: 'ഒരു പൂച്ചക്കുട്ടിയെ ദത്തെടുക്കുക 🐱',
    titleEn: 'Adopt an adorable kitten together',
    category: 'pets',
    emoji: '🐱',
    notes: 'നമ്മുടെ സ്വന്തം കുഞ്ഞു പൂച്ചക്കുട്ടിക്ക് ഒരു ക്യൂട്ട് പേര് കണ്ടുപിടിക്കണം!',
  },
  {
    id: 'midnight-beach',
    title: 'അർദ്ധരാത്രി ബീച്ചിൽ ഇരിക്കുക 🌊🌙',
    titleEn: 'Sit by the beach at midnight listening to the waves',
    category: 'romantic',
    emoji: '🌊',
    notes: 'തിരമാലകളുടെ ശബ്ദം കേട്ട് നിലാവെളിച്ചത്തിൽ മണിക്കൂറുകളോളം സംസാരിച്ചിരിക്കണം.',
  },
  {
    id: 'bake-cake',
    title: 'ഒരുമിച്ച് കേക്ക് ബേക്ക് ചെയ്യുക 🎂',
    titleEn: 'Bake a warm homemade cake together from scratch',
    category: 'cozy',
    emoji: '🎂',
    notes: 'പരസ്പരം മുഖത്ത് ക്രീം തേച്ച് തമാശകൾ പറഞ്ഞ് ഒരുമിച്ച് ഒരു കേക്ക് ഉണ്ടാക്കണം.',
  },
  {
    id: 'sunset-camping',
    title: 'സൂര്യാസ്തമയം കണ്ട് ക്യാമ്പിംഗ് ചെയ്യുക ⛺🌅',
    titleEn: 'Camp under the open starry sky watching the sunset',
    category: 'adventure',
    emoji: '⛺',
    notes: 'ടെന്റും ബോൺഫയറും പാട്ടുകളും ആയി പ്രകൃതിയുടെ ശാന്തതയിൽ ഒരു രാത്രി.',
  },
  {
    id: 'stargazing-night',
    title: 'നക്ഷത്രങ്ങൾ എണ്ണി സംസാരിച്ചിരിക്കുക 🌌',
    titleEn: 'Stargazing on a clear terrace and deep conversations',
    category: 'romantic',
    emoji: '🌌',
    notes: 'ടെറസ്സിൽ പായ വിരിച്ച് കിടന്ന് നക്ഷത്രങ്ങളെ നോക്കി ഭാവിയെക്കുറിച്ച് കിനാവ് കാണണം.',
  },
  {
    id: 'rainy-chai',
    title: 'മഴയത്ത് നനഞ്ഞ് തട്ടുകടയിൽ നിന്ന് ചൂട് ചായയും പഴംപൊരിയും 🌧️☕',
    titleEn: 'Get drenched in the rain and have piping hot roadside chai & snacks',
    category: 'cozy',
    emoji: '🌧️',
    notes: 'മഴയത്ത് കുടയില്ലാതെ നടന്ന് ഒരു നാടൻ ചായക്കടയിൽ ചൂട് ചായ കുടിക്കൽ!',
  },
  {
    id: 'long-drive-sunrise',
    title: 'പാതിരാ ലോങ് ഡ്രൈവ് പോയി പുലർച്ചെ സൂര്യോദയം കാണുക 🚗🌅',
    titleEn: 'Midnight long drive to catch the first golden rays of sunrise',
    category: 'adventure',
    emoji: '🚗',
    notes: 'നമ്മുടെ പ്രിയപ്പെട്ട പ്ലേലിസ്റ്റ് വെച്ച് രാത്രി മുഴുവൻ ഡ്രൈവ് ചെയ്ത് വ്യൂപോയിന്റിൽ എത്തണം.',
  },
];

export const BUCKET_LIST_CATEGORIES = [
  { id: 'all', label: 'All Dreams (എല്ലാം)', emoji: '✨' },
  { id: 'travel', label: 'Travel & Trips (യാത്രകൾ)', emoji: '✈️' },
  { id: 'romantic', label: 'Romantic (റൊമാന്റിക്)', emoji: '💖' },
  { id: 'cozy', label: 'Cozy Home (വീട്ടിലെ കാര്യങ്ങൾ)', emoji: '🏡' },
  { id: 'adventure', label: 'Adventure (അഡ്വഞ്ചർ)', emoji: '🚀' },
  { id: 'pets', label: 'Pets & Life (ക്യൂട്ട് നിമിഷങ്ങൾ)', emoji: '🐾' },
];

export const DATE_NIGHT_IDEAS = [
  {
    id: 'blanket-fort',
    category: 'in_house',
    emoji: '🏕️',
    titleMl: 'ലിവിംഗ് റൂം ബ്ലാങ്കറ്റ് ഫോർട്ട് & മൂവി നൈറ്റ് 🍿',
    titleEn: 'Living Room Blanket Fort & Nostalgic Movie Night 🍿',
    descMl: 'തലയിണകളും ബ്ലാങ്കറ്റുകളും ഫെയറി ലൈറ്റുകളും കൊണ്ട് ഒരു ടെന്റ് കെട്ടി പ്രിയപ്പെട്ട സിനിമ കാണാം!',
    descEn: 'Build a cozy blanket fort with pillows & fairy lights, bring popcorn, and binge a nostalgic film!',
    budget: 'Free / Cozy',
    duration: '2-3 hours',
  },
  {
    id: 'pasta-cookoff',
    category: 'in_house',
    emoji: '🍝',
    titleMl: 'ഒരുമിച്ച് ഒരു സ്പെഷ്യൽ പാസ്ത / വിഭവം കുക്ക് ചെയ്യാം 👩‍🍳',
    titleEn: 'Cook a Brand New Gourmet Recipe Together 👩‍🍳',
    descMl: 'നല്ലൊരു ബാക്ക്ഗ്രൗണ്ട് മ്യൂസിക് വെച്ച്, ഒരു പുതിയ പാചകക്കുറിപ്പ് ഒന്നിച്ച് ഉണ്ടാക്കി കഴിക്കാം.',
    descEn: 'Put on acoustic jazz, pour drinks, and prepare a delicious fresh meal together from scratch.',
    budget: 'Budget-friendly',
    duration: '1.5 hours',
  },
  {
    id: 'candlelight-karaoke',
    category: 'in_house',
    emoji: '🎤',
    titleMl: 'മെഴുകുതിരി വെളിച്ചത്തിൽ സ്വകാര്യ കരോക്കെ നൈറ്റ് 🎶',
    titleEn: 'Candlelight Living Room Acoustic Karaoke 🎶',
    descMl: 'നമുക്ക് രണ്ടുപേർക്കും ഇഷ്ടമുള്ള മെലഡികൾ പരസ്പരം പാടിക്കൊടുക്കാം, ഡാൻസ് ചെയ്യാം!',
    descEn: 'Sing your heart out to your favourite couple songs and have a slow dance in the living room.',
    budget: 'Free',
    duration: '1 hour',
  },
  {
    id: 'spa-massage',
    category: 'in_house',
    emoji: '💆‍♀️',
    titleMl: 'ഹോം സ്പാ & റിലാക്സിങ് മസ്സാജ് സെഷൻ 🕯️',
    titleEn: 'At-Home Relaxing Spa & Gentle Massage Night 🕯️',
    descMl: 'റിലാക്സിങ് മ്യൂസിക്കും ഫേസ് മാസ്കും സുഗന്ധമുള്ള ഓയിലുകളും വെച്ച് പരസ്പരം മസ്സാജ് ചെയ്തു കൊടുക്കാം.',
    descEn: 'Light scented candles, put on cucumber eye pads/face masks, and pamper each other with gentle massages.',
    budget: 'Free / Pampering',
    duration: '1-2 hours',
  },
  {
    id: 'late-night-drive',
    category: 'outdoor',
    emoji: '🚗',
    titleMl: 'പാതിരാ ലോങ് ഡ്രൈവും തണുത്ത കാറ്റും 🎶',
    titleEn: 'Spontaneous Midnight Drive with Windows Down 🎶',
    descMl: 'നഗരത്തിന്റെ തിരക്കുകൾ ഒഴിഞ്ഞ രാത്രിയിൽ ഗ്ലാസ് താഴ്ത്തി പാട്ടും കേട്ട് ഡ്രൈവ് ചെയ്യാം.',
    descEn: 'Roll the windows down, play our nostalgic road-trip songs, and drive through the empty night roads.',
    budget: 'Fuel / Easy',
    duration: '1-2 hours',
  },
  {
    id: 'beach-sunset-chai',
    category: 'outdoor',
    emoji: '🌊',
    titleMl: 'ബീച്ചിൽ സൂര്യാസ്തമയ നടപ്പും ചൂട് ചായയും 🌅☕',
    titleEn: 'Sunset Beach Walk & Roadside Kadukkan Chai 🌅☕',
    descMl: 'കടൽത്തീരത്ത് കൈകൾ കോർത്തുപിടിച്ച് നടന്ന് സൂര്യാസ്തമയം കണ്ട് തട്ടുകടയിൽ നിന്ന് ചായ കുടിക്കാം.',
    descEn: 'Walk barefoot on cool sand as the sky turns orange, then grab hot tea and roadside snacks.',
    budget: 'Budget-friendly',
    duration: '2 hours',
  },
  {
    id: 'rooftop-stargazing',
    category: 'outdoor',
    emoji: '🔭',
    titleMl: 'ടെറസ്സിൽ സ്റ്റാർ ഗേസിംഗും ഡീപ് ടോക്കും 🌌',
    titleEn: 'Rooftop Stargazing & Heart-to-Heart Deep Talk 🌌',
    descMl: 'ടെറസ്സിൽ ഒരു പായയും കുഷ്യനുകളും ഇട്ട് ആകാശത്തിലെ നക്ഷത്രങ്ങളെ നോക്കി സ്വപ്നങ്ങൾ പങ്കുവെക്കാം.',
    descEn: 'Lay a soft mat with pillows on the terrace, stargaze, and talk about our happiest memories.',
    budget: 'Free',
    duration: '1-2 hours',
  },
  {
    id: 'street-food-crawl',
    category: 'outdoor',
    emoji: '🌮',
    titleMl: 'സ്ട്രീറ്റ് ഫുഡ് ഹണ്ടിംഗ് (3 പുതിയ രുചികൾ) 🍜',
    titleEn: 'Secret Street Food Crawl: Try 3 New Spots! 🍜',
    descMl: 'നഗരത്തിലെ 3 വ്യത്യസ്ത സ്ട്രീറ്റ് ഫുഡ് സ്പോട്ടുകളിൽ പോയി ചെറിയ വിഭവങ്ങൾ ഷെയർ ചെയ്ത് രുചിക്കാം.',
    descEn: 'Visit three different local street food stalls and share small bites at each spot.',
    budget: 'Budget-friendly',
    duration: '2 hours',
  },
  {
    id: 'candlelight-rooftop-dinner',
    category: 'romantic',
    emoji: '🕯️',
    titleMl: 'ക്യാൻഡിൽ ലൈറ്റ് ഡിന്നറും ഡ്രീമി വൈബും 🍷',
    titleEn: 'Dress-Up Candlelight Dinner & Romantic Vibe 🍷',
    descMl: 'നല്ല വസ്ത്രങ്ങൾ ധരിച്ച്, ലൈറ്റുകൾ അണച്ച് മെഴുകുതിരി വെളിച്ചത്തിൽ ഒരു സ്പെഷ്യൽ ഡിന്നർ കഴിക്കാം.',
    descEn: 'Dress up elegantly for each other, dim the overhead lights, light candles, and share an intimate meal.',
    budget: 'Special Night',
    duration: '2 hours',
  },
  {
    id: 'ice-cream-hunt',
    category: 'romantic',
    emoji: '🍦',
    titleMl: 'അർദ്ധരാത്രി ഐസ്ക്രീം ഹണ്ട് & വാക്ക് 🌙',
    titleEn: 'Late Night Ice Cream Hunt & Hand-in-Hand Stroll 🌙',
    descMl: 'രാത്രി വൈകി ഒരു ഐസ്ക്രീം പാർലർ അല്ലെങ്കിൽ തട്ടുകട കണ്ടെത്തി പരസ്പരം രുചികൾ പങ്കിടാം.',
    descEn: 'Head out late for dessert, get two different ice creams, taste each others, and stroll quietly.',
    budget: 'Pocket-friendly',
    duration: '1 hour',
  },
];

export const DATE_NIGHT_CATEGORIES = [
  { id: 'all', label: 'All Ideas 🎲', emoji: '🎲' },
  { id: 'in_house', label: 'Cozy In-House 🛋️', emoji: '🛋️' },
  { id: 'outdoor', label: 'Outdoor Adventure 🚗', emoji: '🚗' },
  { id: 'romantic', label: 'Romantic & Foodie 🍷', emoji: '🍷' },
];

/**
 * Format chat message when a Love Coupon is redeemed
 */
export function formatCouponRedeemedShare(coupon, redeemerName) {
  const emoji = coupon.emoji || '🎟️';
  const title = coupon.title || 'Love Coupon';
  return `🎟️✨ [Love Coupon Redeemed!] ${redeemerName || 'Partner'} just scratched and claimed:\n"${title}" ${emoji}\n💖 "Promised with all my heart!"`;
}

/**
 * Format chat message when a Bucket list item is completed
 */
export function formatBucketCompletedShare(item, completedBy, dateStr) {
  const emoji = item.emoji || '✈️';
  const title = item.title || 'Couple Dream';
  const date = dateStr ? ` on ${dateStr}` : '';
  const note = item.completion_note ? `\n📝 "${item.completion_note}"` : '';
  return `✈️🎉 [Bucket List Milestone Completed!]\n"${title}" ${emoji}\nAchieved together by ${completedBy || 'Us'}${date}!${note}\n💖 Another beautiful dream lived together! ✨`;
}

/**
 * Format chat message when Date Night Wheel selects an idea
 */
export function formatDateWheelPickShare(idea, userName) {
  const emoji = idea.emoji || '🎲';
  const title = idea.titleMl || idea.titleEn || 'Date Night Idea';
  return `🎲🕯️ [Tonight's Date Night Pick!]\n${userName || 'Partner'} spun the wheel and got:\n"${title}" ${emoji}\n${idea.descMl || idea.descEn || ''}\nAre you ready for tonight? 💖✨`;
}
