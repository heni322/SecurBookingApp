// ── i18n must be the very first import so resources are registered
// before any component tree renders.
import '@i18n';
import './src/i18n/types'; // TypeScript augmentation (no runtime cost)

import React, { useEffect } from 'react';
import { StatusBar, LogBox, View } from 'react-native';
import { SafeAreaProvider }        from 'react-native-safe-area-context';
import { QueryClientProvider }     from '@tanstack/react-query';
import { StripeProvider }          from '@stripe/stripe-react-native';
import { RootNavigator }           from '@navigation/RootNavigator';
import { queryClient }             from '@lib/queryClient';
import { config }                  from '@config';
import { useAuthStore }            from '@store/authStore';
import { useNotificationsStore }   from '@store/notificationsStore';
import { tokenStorage }            from '@services/tokenStorage';
import { fcmService }              from '@services/fcmService';
import { connectivityService }     from '@services/connectivityService';
import { ErrorBoundary }           from '@components/ui/ErrorBoundary';
import { OfflineBanner }           from '@components/ui/OfflineBanner';
import { ToastHost }               from '@components/ui/ToastHost';
import { ConfirmDialogHost }        from '@components/ui/ConfirmDialog';
import AsyncStorage                from '@react-native-async-storage/async-storage';
import i18n                        from '@i18n';

LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

const LANGUAGE_STORAGE_KEY = '@secur_booking/language';

function App(): React.JSX.Element {
  const { rehydrate } = useAuthStore();
  const { increment } = useNotificationsStore();

  useEffect(() => {
    // Start the single connectivity subscription early so reconnect-driven
    // refetches work app-wide, not only while the OfflineBanner is mounted.
    connectivityService.start();

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
      if (config.features.debugLogging) console.log(`[FCM] ${type}: ${title} — ${body}`);
      increment();
    });

    return () => { unsubFcm(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StripeProvider
          publishableKey={config.stripe.publishableKey}
          merchantIdentifier={config.stripe.merchantIdentifier || undefined}
        >
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
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
