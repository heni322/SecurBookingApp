import './types';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import fr from './locales/fr';

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type  SupportedLanguage   = typeof SUPPORTED_LANGUAGES[number];
export const DEFAULT_NS = 'common' as const;
export const NAMESPACES = ['common','auth','home','missions','profile','navigation','notifications','quote','payment','account'] as const;

/**
 * WHY no async languageDetector:
 *
 * The previous setup used an async AsyncStorage detector. i18next fires .init()
 * and React renders the first frame BEFORE the async callback resolves — so t()
 * returns '' on every first render. No hook, dep array, ready flag, or event
 * subscription can fix this because the component paints before i18next has a
 * language.
 *
 * Fix: initialize synchronously with lng:'fr' and initAsync:false.
 * t() is functional on frame 1, zero race condition.
 *
 * The user's saved language preference (en/fr) is applied by App.tsx via
 * i18n.changeLanguage() after AsyncStorage hydration — react-i18next re-renders
 * all t() consumers automatically at that point.
 */
i18n
  .use(initReactI18next)
  .init({
    resources:        { en, fr },
    lng:              'fr',
    fallbackLng:      'fr',
    supportedLngs:    SUPPORTED_LANGUAGES,
    defaultNS:        DEFAULT_NS,
    ns:               NAMESPACES,
    fallbackNS:       DEFAULT_NS,
    interpolation:    { escapeValue: false },
    returnNull:       false,
    returnEmptyString: false,
    initAsync:        false,  // v26 rename of initImmediate — synchronous init
    parseMissingKeyHandler: __DEV__
      ? (key: string) => { console.warn(`[i18n] Missing key: "${key}"`); return key; }
      : (key: string) => key,
    compatibilityJSON: 'v4',
  });

export default i18n;
export { useTranslation } from 'react-i18next';
