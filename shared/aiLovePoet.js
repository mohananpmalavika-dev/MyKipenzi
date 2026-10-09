/**
 * Kipenzi Connect - AI Love Poetry & Letter Polisher
 * Helps couples craft touching poetry, heartfelt apologies, and polished love letters in Malayalam, Manglish, and English
 */

export const LOVE_POET_TONES = [
  {
    id: 'romantic_deep',
    labelEn: 'Deep Romantic',
    labelMl: 'തീവ്ര പ്രണയം',
    icon: '🌹',
    description: 'Soulful, passionate words expressing boundless love',
  },
  {
    id: 'apology',
    labelEn: 'Heartfelt Apology',
    labelMl: 'സ്നേഹത്തോടെയുള്ള ക്ഷമാപണം',
    icon: '🥺',
    description: 'Sincere regret, softness, and healing after a misunderstanding',
  },
  {
    id: 'kavitha',
    labelEn: 'Malayalam Poetry',
    labelMl: 'പ്രണയ കവിത (വരികൾ)',
    icon: '📜',
    description: 'Lyrical rhyming Malayalam poetic stanzas with metaphors',
  },
  {
    id: 'playful',
    labelEn: 'Playful & Flirty',
    labelMl: 'കൊഞ്ചലും തമാശയും',
    icon: '✨',
    description: 'Cheeky, sweet teasing with cute affection',
  },
  {
    id: 'comfort',
    labelEn: 'Comfort & Care',
    labelMl: 'ആശ്വാസവും തുണയും',
    icon: '🫂',
    description: 'A warm verbal embrace when partner is tired or upset',
  },
  {
    id: 'goodnight',
    labelEn: 'Goodnight Wish',
    labelMl: 'മനോഹരമായ ശുഭരാത്രി',
    icon: '🌙',
    description: 'Tender whispers to guide them into peaceful dreams',
  },
  {
    id: 'goodmorning',
    labelEn: 'Morning Sunshine',
    labelMl: 'സുപ്രഭാതം പ്രിയേ',
    icon: '☀️',
    description: 'Warming their morning with love and enthusiasm',
  },
];

export const QUICK_SPARKS = [
  { label: 'Saying Sorry for Being Busy', text: 'ഞാൻ ജോലിത്തിരക്കിൽ നിന്നെ ശ്രദ്ധിച്ചില്ല, സോറി പ്രിയേ' },
  { label: 'Missing You Deeply', text: 'ഇന്ന് നിന്റെ ശബ്ദം കേൾക്കാതെ ഉറങ്ങാൻ വയ്യ, വല്ലാതെ ഓർക്കുന്നു' },
  { label: 'Your Beautiful Smile', text: 'നിന്റെ ചിരി കാണുമ്പോൾ എന്റെ സങ്കടങ്ങളെല്ലാം മാഞ്ഞുപോകുന്നു' },
  { label: 'After a Small Fight', text: 'നമ്മൾ വഴക്കിട്ടതിൽ എനിക്ക് വല്ലാത്ത വിഷമമുണ്ട്, നമുക്കൊന്ന് കെട്ടിപ്പിടിക്കാം' },
  { label: 'Proud of You Today', text: 'നീ ഇന്ന് ചെയ്ത കാര്യം ഓർത്ത് എനിക്ക് ഒരുപാട് അഭിമാനം തോന്നുന്നു' },
  { label: 'Tired Evening Comfort', text: 'ഒരുപാട് ജോലി ചെയ്ത് ക്ഷീണിച്ചല്ലേ, എന്റെ മടിയിൽ തലവെച്ച് കിടക്കൂ' },
];

/**
 * Curated poetic and letter generation library for diverse situations and languages
 */
const POETIC_LIBRARY = {
  romantic_deep: {
    ml: [
      `എന്റെ ഓരോ ശ്വാസത്തിലും നിന്റെ ഓർമ്മകളുണ്ട്. നീ അടുത്തില്ലാത്ത നേരങ്ങളിൽ പോലും, നിന്റെ സ്നേഹത്തിന്റെ തണലിലാണ് ഞാൻ ജീവിക്കുന്നത്. ഈ ജന്മം മുഴുവൻ നിന്നോടൊപ്പം ചേർത്തുവെക്കാൻ ഞാൻ ആഗ്രഹിക്കുന്നു, എന്റെ പ്രാണനേ... ❤️`,
      `കടലോളം സ്നേഹം ഉള്ളിലൊതുക്കി ഞാൻ നിന്നെ നോക്കുമ്പോൾ, ലോകത്തിലെ മറ്റെല്ലാം അപ്രസക്തമാകുന്നു. എന്റെ സന്തോഷങ്ങളുടെയും പ്രാർത്ഥനകളുടെയും ഒരേയൊരു പേര് നീയാണ്. 💖`,
      `നിന്റെ ഒരു കൊച്ചു സ്പർശനത്തിൽ പോലും എന്റെ ഹൃദയം പടപടാ മിടിക്കുന്നു. എത്ര കണ്ടാലും മതിവരാത്ത, എത്ര കേട്ടാലും കൊതി തീരാത്ത ഒരേയൊരു സംഗീതമാണ് നീയെനിക്ക്. 💕`,
    ],
    manglish: [
      `Ente oro swasathilum ninte ormakalundu. Nee aduthillatha samayathum, ninte sneham enikku thunayayi nilkkunnu. Ee janmam muzhuvan ninakkullathanu ente ponne... ❤️`,
      `Kadalolam sneham ullilothukki njan ninne kaanumbol, ee lokam thanne marannu pokunnu. Ente santhoshangalude ore oru peraanu nee. 💖`,
      `Ninte oru cheru thodukayil polum ente hridayam padapada midikkunnu. Ethra kandallum mathi varatha enikku priyappetta geethamaanu nee. 💕`,
    ],
    en: [
      `In every quiet beat of my heart, your name echoes softly. Even across distances, the warmth of your soul wraps around me like home. You are not just a part of my life, you are the music in it. ❤️`,
      `Looking into your eyes feels like arriving where I was always meant to be. My world becomes softer, kinder, and infinitely more beautiful simply because you exist in it. 💖`,
      `Every single day I find a new reason to fall in love with you all over again. Thank you for making my ordinary life feel extraordinary. 💕`,
    ],
  },
  apology: {
    ml: [
      `എന്റെ വാക്കുകൾ നിന്നെ വേദനിപ്പിച്ചുവെന്ന് ഓർക്കുമ്പോൾ എന്റെ മനസ്സ് നീറുന്നു. ഞാൻ തെറ്റുകാരനാണ്/തെറ്റുകാരിയാണ് പ്രിയേ... നിന്റെ കണ്ണുകൾ നിറയാൻ ഞാൻ ഒരിക്കലും ആഗ്രഹിച്ചിട്ടില്ല. എന്നോട് ക്ഷമിക്കാമോ? നിന്റെ ഒരു പുഞ്ചിരി കാണാതെ എനിക്ക് സമാധാനമില്ല. 🥺💔`,
      `ഞാൻ അങ്ങനെ പറയരുതായിരുന്നു. ദേഷ്യത്തിന്റെ നിമിഷത്തിൽ എന്റെ ഉള്ളിലെ സ്നേഹം മറന്നുപോയതിൽ എന്നോട് ക്ഷമിക്കൂ. നീയില്ലാതെ എനിക്കൊരു നിമിഷം പോലും മുന്നോട്ട് പോകാനാവില്ല. നമുക്ക് പഴയതുപോലെ ഒത്തുചേരാം... 🕊️`,
      `എന്റെ വാശി നിന്റെ മനസ്സ് വേദനിപ്പിച്ചു, എനിക്കറിയാം. തെറ്റുകൾ തിരുത്തി നിന്നെ കൂടുതൽ സ്നേഹിക്കാൻ എനിക്ക് ഒരവസരം തരൂ പ്രിയേ. ഐ ആം സോ സോറി... ❤️`,
    ],
    manglish: [
      `Ente vaakkukal ninne vedanippichu ennorthu ente manassu neerukayanu. Ente thettanu ponne... Ninte kannu nirayan njan orikkalum aagrahichittilla. Ennodu kshamikkamo? Ninte punchiri kaanathe enikku samadhanam illa. 🥺💔`,
      `Njan angane parayaruthayirunnu. Deshyathinte oru nimisham ente ullile sneham marannu poyathinu ennodu kshamikkoo. Nee illathe enikku oru nimisham polum munnottu pokan aavilla. 🕊️`,
      `Ente vaashi ninte manassu vedanippichu, enikkariyam. Thettukal thiruthi ninne kooduthal snehanthode cherthu pidikkaan enikku oru avasaram tharoo. I am so sorry... ❤️`,
    ],
    en: [
      `It breaks my heart knowing my clumsy words caused you hurt. I never want to be the reason behind your tears, my love. Please forgive me... life feels completely hollow until I see your smile again. 🥺💔`,
      `I reacted hastily and lost sight of the gentleness you deserve. You mean the entire world to me, and hurting you hurts me deeply inside. Can we please hold hands and heal this together? 🕊️`,
      `I am genuinely sorry for letting my stubbornness get in the way. I promise to listen better, love you softer, and treasure your feelings above all else. I am so sorry. ❤️`,
    ],
  },
  kavitha: {
    ml: [
      `മഴവില്ലഴകുള്ള നിൻ മിഴികളിൽ\nമയങ്ങുന്നുയെൻ പ്രാണന്റെ സ്വപ്നങ്ങൾ...\nമറവി തൻ കടലിലും മായാതെ\nമൊഴിയുന്നു നിൻ പ്രണയ മന്ത്രങ്ങൾ! 🌸✨`,
      `ഇരുളിൽ തെളിയും താരകം പോലെ,\nഇടവഴിയിൽ പൂക്കും മുല്ല പോലെ,\nഎൻ ഹൃദയത്തിൻ ഓരോ താളത്തിലും\nഇടവിടാതെ തുളുമ്പുന്നു നിൻ ഓർമ്മകൾ! 🌺💫`,
      `കാറ്റിന്റെ ചിറകിൽ വന്നണയും\nകുളിർതെന്നൽ പോലെ നിൻ സാമീപ്യം...\nവാക്കുകൾക്കപ്പുറം വാഴുന്നൊരെൻ\nഅമൃത പ്രണയത്തിൻ പുണ്യമേ നീ! 🍃💖`,
    ],
    manglish: [
      `Mazhavillazhakulla nin mizhikalil\nMayangunnu yen praanante swapnangal...\nMaravi than kadalilum maayathe\Mozhiyunnu nin pranaya manthrangal! 🌸✨`,
      `Irulil theliyum thaarakam pole,\nIdavazhiyil pookkum mulla pole,\nEn hridayathin oro thaalathilum\nIdavidaathe thulumpunnu nin ormakal! 🌺💫`,
      `Kaatinte chirakil vannanayum\nKulirthennal pole nin saameepyam...\nVaakkukalkkappuram vaazhunnoren\nAmrutha pranayathin punyame nee! 🍃💖`,
    ],
    en: [
      `Like petals softly whispering to the rain,\nYour gentle touch relieves my every pain.\nAcross the skies and till the oceans end,\nYou are my sweetest love, my truest friend. 🌸✨`,
      `Through moonlit nights and golden rays of dawn,\nMy heart's devotion ever wanders on,\nTo rest within the haven of your smile,\nAnd linger by your side a lifetime's while. 🌺💫`,
    ],
  },
  playful: {
    ml: [
      `ഹലോ എന്റെ കുറുമ്പീ/കുറുമ്പാ! ഇന്ന് എന്നെ ഓർക്കാതെ എന്താ പരിപാടി? നിന്റെ ചിന്തകൾ വന്ന് എന്റെ തലയ്ക്കുള്ളിൽ ഡാൻസ് കളിക്കുകയാണ്. പെട്ടെന്ന് ഒരു ഉമ്മ തന്ന് എന്നെ സമാധാനിപ്പിക്ക്! 😜💋`,
      `നിനക്ക് എന്നെ എത്ര ഇഷ്ടമാണെന്ന് പറഞ്ഞില്ലല്ലോ ഇന്ന്? ഞാൻ കാത്തിരിക്കുകയാണ് കേട്ടോ... എന്നെ സ്നേഹിക്കാൻ വൈകിയതിന് വലിയൊരു പിഴ തരണമെന്ന് ഓർമ്മിപ്പിക്കുന്നു! 🙈✨`,
      `ലോകത്തിലെ ഏറ്റവും സുന്ദരിയായ/സുന്ദരനായ ആളെ ഞാനിപ്പോൾ ചാറ്റിൽ മെസേജ് അയക്കുകയാണ്. അതാരാണെന്ന് അറിയാമോ? കണ്ണാടിയിൽ നോക്കിയാൽ കാണാം! 😘`,
    ],
    manglish: [
      `Hello ente kurumbi/kurumba! Innu enne orkkaathe entha paripadi? Ninte chinthakal vannu ente thalaykkullil dance kalikkukayanu. Pettannu oru umma thannu enne samadhanippikku! 😜💋`,
      `Ninakku enne ethra ishtamanennu paranjillallo innu? Njan kaathirikkukayanu ketto... Enne snehikkan vaikiyathinu valiyoru pizha tharanam! 🙈✨`,
      `Lokathile ettavum sundariyaya/sundaranaya aale njan ippol chatil message ayakkukayanu. Atharaanu ennu ariyamo? Kannaadiyil nokkiyal kaanam! 😘`,
    ],
    en: [
      `Excuse me, cutie! Why are your thoughts running through my mind all day rent-free? You owe me a minimum of ten kisses to clear the tab! 😜💋`,
      `Just checked my schedule today and it turns out I have a severe deficiency of your hugs. Emergency cuddles required immediately! 🙈✨`,
      `Are you always this cute, or is today a special performance just to make my heart flutter? Stop being so adorable, it's distracting! 😘`,
    ],
  },
  comfort: {
    ml: [
      `നീ തനിച്ചല്ല കേട്ടോ, എന്ത് വിഷമമുണ്ടായാലും നിനക്ക് ഞാനുണ്ട്. കണ്ണ് നിറയാതെ എന്റെ തോളിലേക്ക് ചാരിയിരിക്കൂ. എല്ലാം നല്ലതായി മാറും പ്രിയേ, ഞാൻ നിന്നോടൊപ്പമുണ്ട്. 🫂❤️`,
      `ഇന്ന് ഒരുപാട് സങ്കടപ്പെട്ടുവെന്ന് എനിക്കറിയാം. നിന്റെ സങ്കടങ്ങളുടെ ഭാരം എനിക്ക് തരൂ. എന്റെ രണ്ട് കൈകളും ചേർത്ത് നിന്നെ പൊതിഞ്ഞുപിടിക്കാൻ ഞാൻ കൊതിക്കുന്നു. എല്ലാം ശരിയാകും... 🕊️✨`,
      `നീ എത്ര ശക്തയാണെന്ന്/ശക്തനാണെന്ന് എനിക്കറിയാം, എങ്കിലും ക്ഷീണം തോന്നുമ്പോൾ എന്റെ നെഞ്ചിലേക്ക് ചായാൻ മറക്കരുത്. നീ എനിക്ക് ഏറ്റവും വിലപ്പെട്ടതാണ്. 🤍`,
    ],
    manglish: [
      `Nee thanichalla ketto, enthu vishamamu undayaalum ninakku njanundu. Kannu nirayaathe ente tholilekku chaariyirikkoo. Ellaam nallathaayi maarum ponne, njan ninnodoppamundu. 🫂❤️`,
      `Innu orupaadu sangadappettu ennu enikkariyam. Ninte sangadangalude bhaaram enikku tharoo. Ente randu kaikalum cherthu ninne pothinju pidikkan njan aagrahikkunnu. 🕊️✨`,
      `Nee ethra shakthan/shakthayano ennu enikkariyam, engilum ksheenam thonnumbol ente nenjilekku chayan marakkaruthe. Nee enikku ettavum vilappettathanu. 🤍`,
    ],
    en: [
      `Take a deep breath, my love. You don't have to carry the weight of the world alone. Put your worries on my shoulders, rest your tired head, and remember that I am right here beside you through it all. 🫂❤️`,
      `Bad days don't define how brilliant and strong you are. I believe in you, I cherish you, and I am sending you the warmest, softest hug imaginable across the distance. 🕊️✨`,
      `Whatever happens, you will never walk alone. Wrap yourself in my love tonight and let it protect you from every storm. 🤍`,
    ],
  },
  goodnight: {
    ml: [
      `നിലാവുപോലെ സുന്ദരമായ നിന്റെ മുഖം മനസ്സിലോർത്ത് ഞാൻ കണ്ണടയ്ക്കുകയാണ്. സ്വപ്നങ്ങളിൽ ഞാൻ നിന്നെ കാത്തിരിക്കും. ശുഭരാത്രി എന്റെ പ്രിയപ്പെട്ട കൂട്ടുകാരി/കൂട്ടുകാരാ, സുഖമായി ഉറങ്ങൂ... 🌙⭐`,
      `നക്ഷത്രങ്ങൾ മിന്നിനിൽക്കുന്ന ഈ രാത്രിയിൽ, നിന്റെ ഓർമ്മകൾ എന്റെ ഹൃദയത്തിൽ താരാട്ടുപാടുന്നു. സകല സങ്കടങ്ങളും മറന്ന് സുഖമായൊരു നിദ്ര ആശംസിക്കുന്നു. ഗുഡ് നൈറ്റ് മുത്തേ! 💤✨`,
    ],
    manglish: [
      `Nilaavu pole sundaramaya ninte mukham manassilorthu njan kannadaykkukayanu. Swapnangalil njan ninne kaathirikkum. Shubhathri ente priyappetta muthe, sukhamaayi urangoo... 🌙⭐`,
      `Nakshathrangal minni nilkkunna ee raathriyil, ninte ormakal ente hridayathil thaaraattu paadunnu. Sukhamayoru nidra aashamsikkunnu. Good night ponne! 💤✨`,
    ],
    en: [
      `As the stars light up the evening sky, my heart glows with gratitude for having you in my life. Meet me in our sweetest dreams tonight. Sleep peacefully, my love. 🌙⭐`,
      `May the moonlight wrap you in warmth and the breeze whisper how deeply you are adored. Close your eyes knowing tomorrow brings us another day together. Goodnight, angel. 💤✨`,
    ],
  },
  goodmorning: {
    ml: [
      `സുപ്രഭാതം എന്റെ സൂര്യവെളിച്ചമേ! ഇന്ന് നിന്റെ ദിവസം ചിരികൾ കൊണ്ടും നേട്ടങ്ങൾ കൊണ്ടും നിറയട്ടെ. പ്രഭാതത്തിലെ ആദ്യ ചിന്ത നീയായിരുന്നു, ഒടുവിലത്തേതും നീ തന്നെയായിരിക്കും! ☀️🌻`,
      `പുലർകാല കുളിർകാറ്റിൽ നിന്റെ മധുരമായ സാമീപ്യം അനുഭവപ്പെടുന്നു. ഉണരൂ പ്രിയേ, പുതിയൊരു സുന്ദരദിനം നിന്നെ കാത്തിരിക്കുന്നു. ഒരുപാട് സ്നേഹത്തോടെ ഗുഡ് മോർണിംഗ്! 💛☕`,
    ],
    manglish: [
      `Suprabhatham ente sooryavelichame! Innu ninte divasam chirikal kondum netangal kondum nirayatte. Prabhathathile aadhya chintha neeyayirunnu, oduvilatheyum nee thanneyayirikkum! ☀️🌻`,
      `Pularkala kulirkaattil ninte madhuramaya saameepyam anubhavapedunnu. Unaroo ponne, puthiyoru sundaradinam ninne kaathirikkunnu. Orupaadu snehathode Good morning! 💛☕`,
    ],
    en: [
      `Good morning, my sunshine! May your day be as radiant and lovely as your smile. You were the first thought on my mind when I opened my eyes, and my favorite reason to look forward to the day. ☀️🌻`,
      `A new morning, a fresh breeze, and another beautiful day to love you with everything I have. Have a glorious morning, sweetheart! 💛☕`,
    ],
  },
};

/**
 * Generates or polishes a love expression based on tone, prompt, style, and language
 */
export function generateLoveText({
  tone = 'romantic_deep',
  language = 'ml',
  style = 'letter',
  prompt = '',
  partnerName = 'Sweetheart',
  seedIndex = 0,
}) {
  const toneData = POETIC_LIBRARY[tone] || POETIC_LIBRARY.romantic_deep;
  const langKey = language === 'manglish' ? 'manglish' : language === 'en' ? 'en' : 'ml';
  const pool = toneData[langKey] || toneData.ml || [];

  if (pool.length === 0) return '';

  const index = Math.abs(seedIndex) % pool.length;
  let text = pool[index];

  // If user provided a specific prompt, personalize or blend it
  if (prompt && prompt.trim()) {
    const cleanPrompt = prompt.trim();
    if (langKey === 'ml') {
      if (style === 'poetic') {
        text = `"${cleanPrompt}"\n\nഎന്ന നിന്റെ ചിന്തകൾക്കൊപ്പം:\n` + text;
      } else {
        text = `${cleanPrompt}... ${text}`;
      }
    } else if (langKey === 'manglish') {
      text = `${cleanPrompt}... ${text}`;
    } else {
      text = `Regarding "${cleanPrompt}":\n${text}`;
    }
  }

  // Personalize partner name replacement if placeholder found
  if (partnerName) {
    text = text.replace(/പ്രിയേ/g, `${partnerName}`).replace(/Sweetheart/g, partnerName);
  }

  // Adjust style length
  if (style === 'short') {
    // Pick first sentence
    const sentences = text.split(/(?<=[.?!])\s+/);
    if (sentences.length > 1) {
      text = sentences.slice(0, 2).join(' ');
    }
  }

  return text;
}
