import './types';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { languageDetector } from './languageDetector';
import en from './locales/en';
import fr from './locales/fr';

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type  SupportedLanguage   = typeof SUPPORTED_LANGUAGES[number];
export const DEFAULT_NS = 'common' as const;
export const NAMESPACES = ['common','auth','home','missions','profile','navigation','notifications','quote','payment','account'] as const;

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: { en, fr },
    defaultNS: DEFAULT_NS, ns: NAMESPACES, fallbackNS: DEFAULT_NS,
    fallbackLng: 'fr', supportedLngs: SUPPORTED_LANGUAGES,
    interpolation:    { escapeValue: false },
    returnNull:       false,
    returnEmptyString: false,
    parseMissingKeyHandler: __DEV__
      ? (key: string) => { console.warn(`[i18n] Missing key: "${key}"`); return key; }
      : (key: string) => key,
    compatibilityJSON: 'v4',
  });

export default i18n;
export { useTranslation } from 'react-i18next';
