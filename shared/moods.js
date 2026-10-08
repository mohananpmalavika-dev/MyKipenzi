import { z } from 'zod';

export const MOODS = [
  { id: 'happy', label: 'Happy', label_ml: 'സന്തോഷം', emoji: '😊', hint: 'A little sunshine to share.' },
  { id: 'tired', label: 'Tired', label_ml: 'ക്ഷീണം', emoji: '😴', hint: 'A little rest, a little love.' },
  { id: 'missing_you', label: 'Missing You', label_ml: 'നിന്നെ മിസ് ചെയ്യുന്നു', emoji: '🥺', hint: 'You are on my mind.' },
  { id: 'need_a_hug', label: 'Need a Hug', label_ml: 'ഒരു ആലിംഗനം വേണം', emoji: '🫂', hint: 'Some days need extra cuddles.' },
];
export const moodInput = z.object({ mood: z.enum(MOODS.map(m => m.id)) }).strict();
export const getMood = id => MOODS.find(m => m.id === id);
export function currentMood(status, now = Date.now()) {
  return status && getMood(status.mood) && new Date(status.expires_at).getTime() > now ? status : null;
}

const bodies = {
  en: {
    happy: name => `😊 ${name} is feeling happy! A little sunshine, just for you. 💛`,
    tired: name => `😴 ${name} is feeling tired. Send a little love and let them rest. 🤍`,
    missing_you: name => `🥺 ${name} is missing you. You are their favourite thought today. 💕`,
    need_a_hug: name => `🫂 ${name} needs a hug. A little cuddle from you would mean so much. 🤍`,
  },
  ml: {
    happy: name => `😊 ${name} സന്തോഷത്തിലാണ്! ആ സന്തോഷത്തിൽ നിനക്കും ഒരു പങ്ക്. 💛`,
    tired: name => `😴 ${name} ക്ഷീണത്തിലാണ്. കുറച്ച് സ്നേഹവും വിശ്രമവും നൽകാം. 🤍`,
    missing_you: name => `🥺 ${name} നിന്നെ മിസ് ചെയ്യുന്നു. ഇന്ന് മനസ്സിൽ നീയാണ്. 💕`,
    need_a_hug: name => `🫂 ${name} ഒരു ആലിംഗനം ആഗ്രഹിക്കുന്നു. നിന്റെ സ്നേഹം ഇപ്പോൾ ഏറെ വിലപ്പെട്ടതാണ്. 🤍`,
  },
  manglish: {
    happy: name => `😊 ${name} santhoshathil aanu! Aa santhoshathil ninakkum oru panku. 💛`,
    tired: name => `😴 ${name} ksheenathil aanu. Kurachu snehavum vishramavum kodukkam. 🤍`,
    missing_you: name => `🥺 ${name} ninne miss cheyyunnu. Innu manassil neeyaanu. 💕`,
    need_a_hug: name => `🫂 ${name} oru hug aagrahikkunnu. Ninte sneham ippol ere vilappettathaanu. 🤍`,
  },
  sw: {
    happy: name => `😊 ${name} ana furaha! Anakutumia mwanga wa furaha. 💛`,
    tired: name => `😴 ${name} amechoka. Mtumie upendo kidogo na umruhusu apumzike. 🤍`,
    missing_you: name => `🥺 ${name} anakukosa. Anakuwaza leo. 💕`,
    need_a_hug: name => `🫂 ${name} anahitaji kukumbatiwa. Upendo wako utamaanisha mengi. 🤍`,
  },
};
export function moodNotification(mood, name = 'Your person', language = 'en') {
  const meta = getMood(mood);
  if (!meta) return null;
  return { title: `${meta.emoji} ${name} · ${meta.label}`, body: (bodies[language] || bodies.en)[mood](name) };
}

// HTTP replies and socket events can arrive in either order.
export function mergeMoodStatus(statuses, incoming) {
  const previous = statuses.find(s => s.user_id === incoming.user_id);
  if (previous && Number(previous.revision) >= Number(incoming.revision)) return statuses;
  return [...statuses.filter(s => s.user_id !== incoming.user_id), incoming];
}
