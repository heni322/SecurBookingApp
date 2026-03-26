/**
 * MainNavigator — Tab bar CLIENT avec MissionStack branché sur Home & Missions.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNotificationsStore }    from '@store/notificationsStore';
import { MissionStackNavigator }    from './MissionStackNavigator';
import { NotificationsScreen }      from '@screens/client/NotificationsScreen';
import { ProfileScreen }            from '@screens/client/ProfileScreen';
import { HomeScreen }               from '@screens/client/HomeScreen';
import { colors }    from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontFamily } from '@theme/typography';
import type { MainTabParamList } from '@models/index';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TABS: Array<{ name: keyof MainTabParamList; icon: string; label: string }> = [
  { name: 'Home',          icon: '🏠', label: 'Accueil'  },
  { name: 'Missions',      icon: '🛡',  label: 'Missions' },
  { name: 'Notifications', icon: '🔔', label: 'Alertes'  },
  { name: 'Profile',       icon: '👤', label: 'Profil'   },
];

export const MainNavigator: React.FC = () => {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabel: () => null,
        tabBarIcon:  ({ focused }) => {
          const tab   = TABS.find((t) => t.name === route.name)!;
          const badge = route.name === 'Notifications' ? unreadCount : 0;
          return <TabItem icon={tab.icon} label={tab.label} focused={focused} badge={badge} />;
        },
      })}
    >
      <Tab.Screen name="Home"          component={HomeScreen}             />
      <Tab.Screen name="Missions"      component={MissionStackNavigator}  />
      <Tab.Screen name="Notifications" component={NotificationsScreen}    />
      <Tab.Screen name="Profile"       component={ProfileScreen}          />
    </Tab.Navigator>
  );
};

const TabItem: React.FC<{
  icon: string; label: string; focused: boolean; badge?: number;
}> = ({ icon, label, focused, badge = 0 }) => (
  <View style={[tabStyles.wrap, focused && tabStyles.wrapActive]}>
    <View>
      <Text style={tabStyles.icon}>{icon}</Text>
      {badge > 0 && (
        <View style={tabStyles.badge}>
          <Text style={tabStyles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
    <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  tabBar: {
    height:          layout.tabBarHeight,
    backgroundColor: colors.backgroundElevated,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
    paddingBottom:   0,
  },
});

const tabStyles = StyleSheet.create({
  wrap: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[2],
    borderRadius:    radius.lg,
    gap:             3,
  },
  wrapActive:   { backgroundColor: colors.primarySurface },
  icon:         { fontSize: 22 },
  badge: {
    position:        'absolute',
    top:             -4,
    right:           -8,
    backgroundColor: colors.danger,
    borderRadius:    10,
    minWidth:        16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
    borderWidth:     1.5,
    borderColor:     colors.backgroundElevated,
  },
  badgeText: {
    fontFamily: fontFamily.monoMedium,
    fontSize:   8,
    color:      colors.white,
    lineHeight: 11,
  },
  label:        { fontFamily: fontFamily.body,       fontSize: 10, color: colors.textMuted },
  labelActive:  { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.primary },
});
