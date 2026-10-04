// â”€â”€ i18n must be the very first import so resources are registered
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
import { logStripeSetupOnce }      from '@utils/stripeDiagnostics';
import { ErrorBoundary }           from '@components/ui/ErrorBoundary';
import { OfflineBanner }           from '@components/ui/OfflineBanner';
import { ToastHost }               from '@components/ui/ToastHost';
import { ConfirmDialogHost }        from '@components/ui/ConfirmDialog';
import { AlertProvider }            from '@components/ui/AlertModal';
import AsyncStorage                from '@react-native-async-storage/async-storage';
import i18n                        from '@i18n';
import { apiClient }               from '@api/client';
import { checkVersionPolicy }      from '@services/appVersion';
import { useAppUpdateStore }       from '@store/appUpdateStore';
import { UpdateRequiredScreen }    from '@components/ui/UpdateRequiredScreen';
import { initSentry, setSentryUser } from '@services/sentry';

LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);

// Crash reporting first, so errors during the rest of the boot are caught
// (audit 2026-10-02, H4). No-op without a DSN.
initSentry();

const LANGUAGE_STORAGE_KEY = '@secur_booking/language';

function App(): React.JSX.Element {
  const { rehydrate } = useAuthStore();
  const userId   = useAuthStore((st) => st.user?.id);
  const userRole = useAuthStore((st) => st.user?.role);
  const { increment } = useNotificationsStore();
  const updateRequired = useAppUpdateStore((st) => st.required);

  useEffect(() => {
    // Start the single connectivity subscription early so reconnect-driven
    // refetches work app-wide, not only while the OfflineBanner is mounted.
    connectivityService.start();

    // Minimum supported version (audit 2026-10-02, H9): checked at launch so a
    // signed-out user is stopped before typing anything. Not awaited.
    void checkVersionPolicy(() => apiClient.get('/app/version-policy').then((r) => r.data));

    // Report Stripe setup problems at BOOT rather than at checkout. A
    // placeholder publishable key, or a CardField that cannot work on the
    // active renderer, otherwise surfaces only as a permanently disabled pay
    // button with nothing logged and nothing on screen (2026-09-12).
    logStripeSetupOnce();

    // CRITICAL FIX: tokenStorage.hydrate() populates the in-memory token
    // cache (_accessToken / _refreshToken) from AsyncStorage.
    // rehydrate() calls tokenStorage.getAccessToken() synchronously â€” so it
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
        // AsyncStorage unavailable â€” in-memory cache stays null.
        // rehydrate() will handle the no-token path gracefully.
        if (__DEV__) console.warn('[App] tokenStorage.hydrate() failed â€” proceeding without cache');
      })
      .then(() => rehydrate());

    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((lang: string | null) => {
        if (lang && lang !== i18n.language) {
          i18n.changeLanguage(lang);
        }
      })
      .catch(() => {/* AsyncStorage unavailable â€” stay on 'fr' */});

    const unsubFcm = fcmService.onForegroundMessage((type, title, body) => {
      if (config.features.debugLogging) console.log(`[FCM] ${type}: ${title} â€” ${body}`);
      increment();
    });

    return () => { unsubFcm(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sentry user context: id and role only.
  useEffect(() => {
    setSentryUser(userId ? { id: userId, role: userRole } : null);
  }, [userId, userRole]);

  if (updateRequired) {
    return (
      <SafeAreaProvider>
        <UpdateRequiredScreen requirement={updateRequired} />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StripeProvider
          publishableKey={config.stripe.publishableKey}
          merchantIdentifier={config.stripe.merchantIdentifier || undefined}
        >
          <SafeAreaProvider>
            <StatusBar barStyle="light-content" backgroundColor="#05172b" />
            <AlertProvider>
              <View style={{ flex: 1 }}>
              <OfflineBanner />
              <RootNavigator />
              <ToastHost />
              <ConfirmDialogHost />
              </View>
            </AlertProvider>
          </SafeAreaProvider>
        </StripeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
