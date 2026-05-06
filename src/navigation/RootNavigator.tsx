/**
 * RootNavigator — routeur principal basé sur l'état d'auth + onboarding.
 */
import React, { useEffect, useState } from 'react';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider }           from 'react-native-safe-area-context';
import { useAuthStore }    from '@store/authStore';
import { navigationRef }   from '@services/navigationRef';
import { AuthNavigator }   from './AuthNavigator';
import { MainNavigator }   from './MainNavigator';
import { LoadingState }    from '@components/ui/LoadingState';
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
        <LoadingState message="Chargement…" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
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
