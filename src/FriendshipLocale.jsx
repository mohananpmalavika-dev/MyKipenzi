import { createContext, useContext } from 'react';
import { featureText } from '../shared/featureLocale.js';

const FeatureLanguage = createContext('en');
// Receive language affects message delivery only. The app interface is always English.
export function FeatureLocaleProvider({ children }) {
  return <FeatureLanguage.Provider value="en">{children}</FeatureLanguage.Provider>;
}
export function useFeatureLanguage() {
  const language = useContext(FeatureLanguage);
  return { language, t: (text, values) => featureText(text, language, values) };
}
export function FeatureText({ value }) {
  const { t } = useFeatureLanguage();
  return typeof value === 'string' ? t(value) : value;
}
