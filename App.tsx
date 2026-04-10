import React, { useEffect } from 'react';
import { StatusBar, LogBox }  from 'react-native';
import { SafeAreaProvider }   from 'react-native-safe-area-context';
import { StripeProvider }     from '@stripe/stripe-react-native';
import { RootNavigator }      from '@navigation/RootNavigator';
import { useAuthStore }       from '@store/authStore';
import { useNotificationsStore } from '@store/notificationsStore';
import { tokenStorage }       from '@services/tokenStorage';
import { fcmService }         from '@services/fcmService';

LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

// Register FCM background handler before any other messaging call
fcmService.setBackgroundMessageHandler();

/**
 * Stripe publishable key.
 * Production : utiliser react-native-config ou une variable d'environnement.
 * Ne jamais mettre la secret key dans le bundle natif.
 */
const STRIPE_PUBLISHABLE_KEY = __DEV__
  ? 'pk_test_REMPLACER_PAR_VOTRE_CLE_TEST_STRIPE'
  : 'pk_live_REMPLACER_PAR_VOTRE_CLE_LIVE_STRIPE';

function App(): React.JSX.Element {
  const { rehydrate }  = useAuthStore();
  const { increment, setUnreadCount } = useNotificationsStore();

  useEffect(() => {
    // 1. Hydrate token storage from AsyncStorage
    tokenStorage.hydrate().then(() => {
      // 2. Restore session: re-fetch user + reconnect WebSocket + re-register FCM
      rehydrate();
    });

    // 3. FCM foreground messages → increment badge + log
    const unsubFcm = fcmService.onForegroundMessage((type, title, body) => {
      console.log(`[FCM] ${type}: ${title} — ${body}`);
      // Increment unread badge for any notification type
      increment();
    });

    return () => { unsubFcm(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      // urlScheme="securbook"          // required for 3DS redirect on iOS
      // merchantIdentifier="merchant.fr.securbook" // required for Apple Pay
    >
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0A0C0F" />
        <RootNavigator />
      </SafeAreaProvider>
    </StripeProvider>
  );
}

export default App;
