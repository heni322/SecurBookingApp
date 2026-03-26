/**
 * tokenStorage — stockage sécurisé des JWT.
 *
 * En production, remplacer par `react-native-keychain` ou
 * `@react-native-async-storage/async-storage` selon le niveau de sécurité requis.
 *
 * Pour l'instant : stockage en mémoire (volatile, remis à zéro à chaque démarrage).
 * Suffisant pour le dev — à remplacer avant la mise en production.
 */

let _accessToken:  string | null = null;
let _refreshToken: string | null = null;

export const tokenStorage = {
  getAccessToken:  (): string | null => _accessToken,
  getRefreshToken: (): string | null => _refreshToken,

  setTokens: ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
    _accessToken  = accessToken;
    _refreshToken = refreshToken;
  },

  clearTokens: () => {
    _accessToken  = null;
    _refreshToken = null;
  },
};
