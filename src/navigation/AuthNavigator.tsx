import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen }    from '@screens/auth/LoginScreen';
import { RegisterScreen } from '@screens/auth/RegisterScreen';
import TwoFaScreen        from '@screens/auth/TwoFaScreen';
import type { AuthStackParamList } from '@models/index';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login"    component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="TwoFa"    component={TwoFaScreen}
      options={{ presentation: 'modal', gestureEnabled: false }} />
  </Stack.Navigator>
);
