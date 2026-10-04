import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen }        from '@screens/client/ProfileScreen';
import { ProfileEditScreen }    from '@screens/client/ProfileEditScreen';
import SiteListScreen           from '@screens/client/SiteListScreen';
import SiteDetailScreen         from '@screens/client/SiteDetailScreen';
import { PaymentHistoryScreen } from '@screens/client/PaymentHistoryScreen';
import { AnalyticsScreen }      from '@screens/client/AnalyticsScreen';
import { TwoFaSetupScreen }     from '@screens/client/TwoFaSetupScreen';
import { DeleteAccountScreen }   from '@screens/client/DeleteAccountScreen';
import { PaymentMethodsScreen }   from '@screens/client/PaymentMethodsScreen';
import type { ProfileStackParamList } from '@models/index';
import { AddPaymentMethodScreen } from '@screens/client/AddPaymentMethodScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain"    component={ProfileScreen} />
    <Stack.Screen name="ProfileEdit"    component={ProfileEditScreen} />
    {/* Consignes de site — accès, contacts, codes chiffrés (lot 3, audit 2026-08) */}
    <Stack.Screen name="SiteList"       component={SiteListScreen} />
    <Stack.Screen name="SiteDetail"     component={SiteDetailScreen} />
    <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
    <Stack.Screen name="Analytics"      component={AnalyticsScreen} />
    <Stack.Screen name="TwoFaSetup"     component={TwoFaSetupScreen} />
    <Stack.Screen
      name="DeleteAccount"
      component={DeleteAccountScreen}
      options={{ presentation: 'modal' }}
    />
      <Stack.Screen name="PaymentMethods"   component={PaymentMethodsScreen} />
    <Stack.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} />
  </Stack.Navigator>
);
