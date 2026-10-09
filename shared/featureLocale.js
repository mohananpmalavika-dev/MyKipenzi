import pairs from './feature-pairs.json' with { type: 'json' };
import extra from './feature-extra.json' with { type: 'json' };
import englishUi from './english-ui.json' with { type: 'json' };
import { featureCopy, normalizeFeatureText } from './featureLanguage.js';

const canonical = new Map();
const sourceEnglish = {
  'മഴയുള്ള രാത്രിയിൽ ബ്ലാങ്കറ്റിൽ സിനിമ കാണൽ 🌧️': 'Watching a film under a blanket on a rainy night 🌧️',
  'ബീച്ചിൽ സൂര്യാസ്തമയ നടപ്പ് 🌅': 'A sunset walk on the beach 🌅',
  'മിഡ്‌നൈറ്റ് ലോങ് ഡ്രൈവ് & മ്യൂസിക് 🚗': 'A midnight drive with music 🚗',
  'വീട്ടിൽ ഉണ്ടാക്കിയ ക്യാൻഡിൽ ലൈറ്റ് ഡിന്നർ 🕯️': 'A homemade candlelight dinner 🕯️',
  'വികാരങ്ങൾ വാക്കുകളാക്കാൻ AI പ്രണയ സഹായി': 'A writing assistant to turn feelings into words',
};
for (const [english, translations] of Object.entries(featureCopy)) {
  canonical.set(normalizeFeatureText(english).toLowerCase(), english);
  translations.forEach(text => canonical.set(normalizeFeatureText(text).toLowerCase(), english));
}
for (const [english, translations] of Object.entries(extra)) {
  canonical.set(normalizeFeatureText(english).toLowerCase(), english);
  canonical.set(normalizeFeatureText(translations[0]).toLowerCase(), english);
}

// Legacy bilingual labels are normalized to English. Receive language is message-only.
export function featureText(value, _requestedLanguage = 'en', values = {}) {
  if (typeof value !== 'string') return value;
  const source = normalizeFeatureText(value);
  const supplemental = extra[source];
  const pair = supplemental ? { en: source, ml: supplemental[0], sw: supplemental[1] } : pairs[source];
  const english = canonical.get(source.toLowerCase()) || pair?.en || source;
  const translated = englishUi[source] || sourceEnglish[source] || englishUi[english] || english;
  const withValues = translated.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (placeholder, key) => Object.hasOwn(values, key) ? String(values[key]) : placeholder);
  const first = value.search(/\S/), last = value.length - value.trimEnd().length;
  return `${first > 0 ? value.slice(0, first) : ''}${withValues}${last ? value.slice(-last) : ''}`;
}
