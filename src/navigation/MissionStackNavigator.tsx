/**
 * MissionStackNavigator — stack de navigation pour le flux mission complet.
 * Utilisé dans les onglets Home & Missions via navigation.navigate.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ServicePickerScreen }  from '@screens/client/ServicePickerScreen';
import { MissionCreateScreen }  from '@screens/client/MissionCreateScreen';
import { MissionDetailScreen }  from '@screens/client/MissionDetailScreen';
import { QuoteDetailScreen }    from '@screens/client/QuoteDetailScreen';
import { PaymentScreen }        from '@screens/client/PaymentScreen';
import { BookingDetailScreen }  from '@screens/client/BookingDetailScreen';
import { ConversationScreen }   from '@screens/client/ConversationScreen';
import { MissionSuccessScreen } from '@screens/client/MissionSuccessScreen';
import { MissionsScreen }       from '@screens/client/MissionsScreen';
import type { MissionStackParamList } from '@models/index';

const Stack = createNativeStackNavigator<MissionStackParamList>();

export const MissionStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MissionList"    component={MissionsScreen}       />
    <Stack.Screen name="ServicePicker"  component={ServicePickerScreen}  />
    <Stack.Screen name="MissionCreate"  component={MissionCreateScreen}  />
    <Stack.Screen name="MissionDetail"  component={MissionDetailScreen}  />
    <Stack.Screen name="QuoteDetail"    component={QuoteDetailScreen}    />
    <Stack.Screen name="PaymentScreen"  component={PaymentScreen}        />
    <Stack.Screen name="BookingDetail"  component={BookingDetailScreen}  />
    <Stack.Screen name="Conversation"   component={ConversationScreen}   />
    <Stack.Screen name="MissionSuccess" component={MissionSuccessScreen} />
  </Stack.Navigator>
);
