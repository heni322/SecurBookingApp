import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { SafeAreaProvider }  from 'react-native-safe-area-context';
import { StripeProvider }    from '@stripe/stripe-react-native';
import { RootNavigator }     from '@navigation/RootNavigator';
import { useAuthStore }      from '@store/authStore';
import { tokenStorage }      from '@services/tokenStorage';
import { fcmService }        from '@services/fcmService';

LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

// Handle FCM messages received while app is in background/quit
fcmService.setBackgroundMessageHandler();

/**
 * Stripe publishable key.
 * En production : stocker dans une variable d'environnement via react-native-config
 * ou un fichier .env (jamais la secret key dans le code natif).
 *
 * Exemple avec react-native-config :
 *   import Config from 'react-native-config';
 *   const STRIPE_PK = Config.STRIPE_PUBLISHABLE_KEY;
 */
const STRIPE_PUBLISHABLE_KEY = __DEV__
  ? 'pk_test_REMPLACER_PAR_VOTRE_CLE_TEST_STRIPE'
  : 'pk_live_REMPLACER_PAR_VOTRE_CLE_LIVE_STRIPE';

function App(): React.JSX.Element {
  const { rehydrate } = useAuthStore();

  useEffect(() => {
    // 1. Load persisted tokens into memory cache
    tokenStorage.hydrate().then(() => {
      // 2. Restore session (re-fetch user + reconnect WS + re-register FCM)
      rehydrate();
    });

    // 3. Listen for FCM messages in foreground → show in-app alert / refresh notifications
    const unsubFcm = fcmService.onForegroundMessage((type, title, body) => {
      console.log(`[FCM] ${type}: ${title} — ${body}`);
      // TODO: dispatch to notification store for badge update
    });

    return () => { unsubFcm(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      // urlScheme="securbook" // requis pour 3DS redirect sur iOS
      // merchantIdentifier="merchant.fr.securbook" // requis pour Apple Pay
    >
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0A0C0F" />
        <RootNavigator />
      </SafeAreaProvider>
    </StripeProvider>
  );
}

export default App;
