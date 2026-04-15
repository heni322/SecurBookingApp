/**
 * languageDetector.ts
 *
 * Custom i18next language detector backed by AsyncStorage.
 * Falls back to 'fr' (app default) when no preference is persisted.
 *
 * We purposely skip `LanguageDetectorAsyncModule` from i18next because its
 * generic signature is version-sensitive. The plain object below satisfies the
 * runtime duck-type that i18next expects without fighting the type system.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@secur_booking/language';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const languageDetector: any = {
  type: 'languageDetector',
  async: true,

  detect: async (callback: (lng: string) => void) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      callback(stored ?? 'fr');
    } catch {
      callback('fr');
    }
  },

  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lng);
    } catch {
      // storage unavailable — non-fatal
    }
  },
};
