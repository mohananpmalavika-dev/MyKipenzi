import pairs from './feature-pairs.json' with { type: 'json' };
import swahili from './feature-swahili.json' with { type: 'json' };
import { FEATURE_LANGUAGES, featureCopy, normalizeFeatureText, localFeatureCopy } from './featureLanguage.js';

const canonical = new Map();
for (const [english, translations] of Object.entries(featureCopy)) {
  canonical.set(normalizeFeatureText(english).toLowerCase(), english);
  translations.forEach(text => canonical.set(normalizeFeatureText(text).toLowerCase(), english));
}

// Deterministic Malayalam transliteration for built-in feature content.
const consonants = { 'ക':'k', 'ഖ':'kh', 'ഗ':'g', 'ഘ':'gh', 'ങ':'ng', 'ച':'ch', 'ഛ':'chh', 'ജ':'j', 'ഝ':'jh', 'ഞ':'nj', 'ട':'t', 'ഠ':'th', 'ഡ':'d', 'ഢ':'dh', 'ണ':'n', 'ത':'th', 'ഥ':'th', 'ദ':'d', 'ധ':'dh', 'ന':'n', 'പ':'p', 'ഫ':'ph', 'ബ':'b', 'ഭ':'bh', 'മ':'m', 'യ':'y', 'ര':'r', 'റ':'r', 'ല':'l', 'ള':'l', 'ഴ':'zh', 'വ':'v', 'ശ':'sh', 'ഷ':'sh', 'സ':'s', 'ഹ':'h' };
const vowels = { 'അ':'a','ആ':'aa','ഇ':'i','ഈ':'ee','ഉ':'u','ഊ':'oo','ഋ':'ri','എ':'e','ഏ':'e','ഐ':'ai','ഒ':'o','ഓ':'o','ഔ':'au' };
const marks = { 'ാ':'aa','ി':'i','ീ':'ee','ു':'u','ൂ':'oo','ൃ':'ri','െ':'e','േ':'e','ൈ':'ai','ൊ':'o','ോ':'o','ൌ':'au','ൗ':'au' };
const finals = { 'ം':'m','ഃ':'h','ൺ':'n','ൻ':'n','ർ':'r','ൽ':'l','ൾ':'l','ൿ':'k' };
export function malayalamToManglish(text) {
  const characters = Array.from(text);
  let result = '';
  for (let index = 0; index < characters.length; index++) {
    const character = characters[index], next = characters[index + 1];
    if (consonants[character]) {
      result += consonants[character];
      if (next === '്') index++;
      else if (marks[next]) { result += marks[next]; index++; }
      else result += 'a';
    } else result += vowels[character] || marks[character] || finals[character] || (character === '്' || character === '\u200d' || character === '\u200c' ? '' : character);
  }
  return result;
}

export function featureText(value, requestedLanguage = 'en', values = {}) {
  if (typeof value !== 'string') return value;
  const language = FEATURE_LANGUAGES.includes(requestedLanguage) ? requestedLanguage : 'en';
  const source = normalizeFeatureText(value);
  const pair = pairs[source];
  const english = canonical.get(source.toLowerCase()) || pair?.en || source;
  let translated = language === 'en' ? english : localFeatureCopy(english, language) || pair?.[language] || (language === 'sw' ? swahili[english] : null) || localFeatureCopy(source, language);
  if (!translated && language === 'manglish') translated = malayalamToManglish(pair?.ml || source);
  translated ||= source;
  const withValues = translated.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (placeholder, key) => Object.hasOwn(values, key) ? String(values[key]) : placeholder);
  const first = value.search(/\S/), last = value.length - value.trimEnd().length;
  return `${first > 0 ? value.slice(0, first) : ''}${withValues}${last ? value.slice(-last) : ''}`;
}
