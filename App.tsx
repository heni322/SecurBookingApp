/**
 * App.tsx — Point d'entrée SecurBookingApp (CLIENT)
 *
 * Dépendances à installer :
 *   npm install \
 *     axios \
 *     zustand \
 *     @react-navigation/native \
 *     @react-navigation/native-stack \
 *     @react-navigation/bottom-tabs \
 *     react-native-screens \
 *     react-native-safe-area-context \
 *     babel-plugin-module-resolver
 */
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator }    from '@navigation/RootNavigator';
import { useAuthStore }     from '@store/authStore';
import { usersApi }         from '@api/endpoints/users';
import { tokenStorage }     from '@services/tokenStorage';

// Ignorer les warnings non-critiques en dev
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function App(): React.JSX.Element {
  const { hydrate, logout, setLoading } = useAuthStore();

  /**
   * Tentative de restauration de session au démarrage.
   * Si un accessToken est présent (stocké en mémoire/keychain),
   * on récupère le profil et on hydrate le store.
   */
  useEffect(() => {
    const restoreSession = async () => {
      setLoading(true);
      const token = tokenStorage.getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data: res } = await usersApi.getMe();
        const rt = tokenStorage.getRefreshToken()!;
        hydrate(res.data, {
          accessToken:  token,
          refreshToken: rt,
          expiresIn:    900,
        });
      } catch {
        // Token expiré ou invalide — déconnexion silencieuse
        logout();
      }
    };

    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0A0C0F" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
