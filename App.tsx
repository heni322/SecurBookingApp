// ── i18n must be the very first import so resources are registered
// before any component tree renders.
import '@i18n';
import './src/i18n/types'; // TypeScript augmentation (no runtime cost)

import React, { useEffect } from 'react';
import { StatusBar, LogBox, View } from 'react-native';
import { SafeAreaProvider }        from 'react-native-safe-area-context';
import { StripeProvider }          from '@stripe/stripe-react-native';
import { RootNavigator }           from '@navigation/RootNavigator';
import { useAuthStore }            from '@store/authStore';
import { useNotificationsStore }   from '@store/notificationsStore';
import { tokenStorage }            from '@services/tokenStorage';
import { fcmService }              from '@services/fcmService';
import { ErrorBoundary }           from '@components/ui/ErrorBoundary';
import { OfflineBanner }           from '@components/ui/OfflineBanner';
import { ToastHost }               from '@components/ui/ToastHost';
import { ConfirmDialogHost }        from '@components/ui/ConfirmDialog';
import AsyncStorage                from '@react-native-async-storage/async-storage';
import i18n                        from '@i18n';

LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

const STRIPE_PUBLISHABLE_KEY = __DEV__
  ? 'pk_test_REMPLACER_PAR_VOTRE_CLE_TEST_STRIPE'
  : 'pk_live_REMPLACER_PAR_VOTRE_CLE_LIVE_STRIPE';

const LANGUAGE_STORAGE_KEY = '@secur_booking/language';

function App(): React.JSX.Element {
  const { rehydrate } = useAuthStore();
  const { increment } = useNotificationsStore();

  useEffect(() => {
    // CRITICAL FIX: tokenStorage.hydrate() populates the in-memory token
    // cache (_accessToken / _refreshToken) from AsyncStorage.
    // rehydrate() calls tokenStorage.getAccessToken() synchronously — so it
    // MUST run only AFTER hydrate() resolves.  Previously both were chained
    // with a bare .then() which did not guarantee ordering: if the JS
    // microtask queue yielded between the two, rehydrate() would read null
    // tokens and immediately set isLoggedIn:false, logging the user out on
    // every cold start.
    //
    // Fix: .catch() before .then() so rehydrate() is always called even
    // when AsyncStorage is unavailable (e.g. first boot, storage full).
    tokenStorage
      .hydrate()
      .catch(() => {
        // AsyncStorage unavailable — in-memory cache stays null.
        // rehydrate() will handle the no-token path gracefully.
        if (__DEV__) console.warn('[App] tokenStorage.hydrate() failed — proceeding without cache');
      })
      .then(() => rehydrate());

    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((lang: string | null) => {
        if (lang && lang !== i18n.language) {
          i18n.changeLanguage(lang);
        }
      })
      .catch(() => {/* AsyncStorage unavailable — stay on 'fr' */});

    const unsubFcm = fcmService.onForegroundMessage((type, title, body) => {
      if (__DEV__) console.log(`[FCM] ${type}: ${title} — ${body}`);
      increment();
    });

    return () => { unsubFcm(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#05172b" />
          <View style={{ flex: 1 }}>
            <OfflineBanner />
            <RootNavigator />
            <ToastHost />
            <ConfirmDialogHost />
          </View>
        </SafeAreaProvider>
      </StripeProvider>
    </ErrorBoundary>
  );
}

export default App;
