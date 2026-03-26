/**
 * RootNavigator — routeur principal basé sur l'état d'auth.
 * Branche le navigationRef global pour permettre la navigation
 * depuis les services (logout intercepteur 401, etc.).
 */
import React from 'react';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore }    from '@store/authStore';
import { navigationRef }   from '@services/navigationRef';
import { AuthNavigator }   from './AuthNavigator';
import { MainNavigator }   from './MainNavigator';
import { LoadingState }    from '@components/ui/LoadingState';
import type { RootStackParamList } from '@models/index';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isLoggedIn, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingState message="Chargement…" />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
