/**
 * RootNavigator — routeur principal basé sur l'état d'auth + onboarding.
 */
import React, { useEffect, useState } from 'react';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider }           from 'react-native-safe-area-context';
import { useAuthStore }    from '@store/authStore';
import { navigationRef }   from '@services/navigationRef';
import { fcmService }      from '@services/fcmService';
import { flushPendingNotification } from '@services/notificationRouter';
import { AuthNavigator }   from './AuthNavigator';
import { MainNavigator }   from './MainNavigator';
import { LoadingState }    from '@components/ui/LoadingState';
import i18n from '@i18n';
import { OnboardingScreen, checkOnboardingDone } from '@screens/auth/OnboardingScreen';
import type { RootStackParamList } from '@models/index';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuthStore();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingDone().then(done => setOnboardingDone(done));
  }, []);

  if (isLoading || onboardingDone === null) {
    return (
      <SafeAreaProvider>
        <LoadingState message={i18n.t('common:loading')} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          // Navigation is mounted: safe to wire push tap-through and replay any
          // notification that cold-started the app (quit state).
          fcmService.registerTapHandlers();
          flushPendingNotification();
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          {!onboardingDone ? (
            <Stack.Screen name="Onboarding">
              {() => <OnboardingScreen onDone={() => setOnboardingDone(true)} />}
            </Stack.Screen>
          ) : isLoggedIn ? (
            <Stack.Screen name="Main" component={MainNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};
