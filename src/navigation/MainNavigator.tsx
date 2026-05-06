/**
 * MainNavigator — Tab bar CLIENT premium.
 * 4 tabs: Home · Missions · Notifications · Profile
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Shield, Bell, User } from 'lucide-react-native';
import { useNotificationsStore }  from '@store/notificationsStore';
import { MissionStackNavigator }  from './MissionStackNavigator';
import { ProfileStackNavigator }  from './ProfileStackNavigator';
import { HomeScreen }             from '@screens/client/HomeScreen';
import { NotificationsScreen }    from '@screens/client/NotificationsScreen';
import { colors, palette }        from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontFamily, fontSize }   from '@theme/typography';
import type { MainTabParamList }  from '@models/index';
import { useTranslation }         from '@i18n';

const Tab = createBottomTabNavigator<MainTabParamList>();

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

interface TabDef {
  name:     keyof MainTabParamList;
  labelKey: 'home' | 'missions' | 'notifications' | 'profile';
  Icon:     LucideIcon;
}

const TAB_DEFS: TabDef[] = [
  { name: 'Home',          labelKey: 'home',          Icon: Home    },
  { name: 'Missions',      labelKey: 'missions',      Icon: Shield  },
  { name: 'Notifications', labelKey: 'notifications', Icon: Bell    },
  { name: 'Profile',       labelKey: 'profile',       Icon: User    },
];

export const MainNavigator: React.FC = () => {
  const { t }       = useTranslation('navigation');
  const unreadCount = useNotificationsStore(s => s.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabel: () => null,
        tabBarIcon: ({ focused }) => {
          const tab   = TAB_DEFS.find(td => td.name === route.name)!;
          const badge = route.name === 'Notifications' ? unreadCount : 0;
          return (
            <TabItem
              Icon={tab.Icon}
              label={t(`tabs.${tab.labelKey}`)}
              focused={focused}
              badge={badge}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home"          component={HomeScreen}            />
      <Tab.Screen name="Missions"      component={MissionStackNavigator} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}   />
      <Tab.Screen name="Profile"       component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};

// ── TabItem ───────────────────────────────────────────────────────────────────
const TabItem: React.FC<{
  Icon: LucideIcon; label: string; focused: boolean; badge?: number;
}> = ({ Icon, label, focused, badge = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.18, duration: 110, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4,      useNativeDriver: true }),
      ]).start();
    }
    Animated.parallel([
      Animated.timing(glowAnim,  { toValue: focused ? 1 : 0, duration: 220, useNativeDriver: false }),
      Animated.timing(labelAnim, { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: false }),
    ]).start();
  }, [focused]);

  const iconColor    = focused ? palette.navy : palette.white60;
  const glowOpacity  = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const labelTranslY = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] });

  return (
    <View style={tabStyles.outer}>
      <View style={[tabStyles.pill, focused && tabStyles.pillActive]}>
        {focused && <Animated.View style={[tabStyles.glow, { shadowOpacity: glowOpacity }]} />}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Icon size={20} color={iconColor} strokeWidth={focused ? 2.4 : 1.8} />
        </Animated.View>
        {badge > 0 && (
          <View style={tabStyles.badge}>
            <Text style={tabStyles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Animated.Text
        numberOfLines={1}
        style={[
          tabStyles.label,
          focused && tabStyles.labelActive,
          { opacity: focused ? labelAnim : 0.6, transform: [{ translateY: labelTranslY }] },
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    // Fix #5: use design token instead of hardcoded 74
    height:          layout.tabBarHeight + (Platform.OS === 'ios' ? 16 : 0),
    backgroundColor: 'rgba(12,18,32,0.97)',
    // Fix #6: borderTopWidth: 0 makes borderTopColor dead code — removed
    borderTopWidth:  0,
    ...Platform.select({
      ios:     { shadowColor: palette.gold, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 24 },
    }),
    paddingBottom: 0,
    paddingTop:    0,
  },
});

const tabStyles = StyleSheet.create({
  outer:      { width: 64, alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: spacing[2] },
  pill:       { width: 48, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  pillActive: {
    backgroundColor: palette.gold,
    ...Platform.select({
      ios:     { shadowColor: palette.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.7, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  glow:        { position: 'absolute', width: 48, height: 34, borderRadius: radius.full, backgroundColor: palette.gold, shadowColor: palette.gold, shadowOffset: { width: 0, height: 0 }, shadowRadius: 18 },
  badge:       { position: 'absolute', top: -3, right: -3, backgroundColor: colors.dangerSurface, borderRadius: radius.full, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: palette.panelSolid },
  badgeText:   { fontFamily: fontFamily.monoMedium, fontSize: 8, color: colors.white, lineHeight: 11 },
  label:       { fontFamily: fontFamily.body, fontSize: 10, color: colors.textMuted, letterSpacing: 0.2, textAlign: 'center' },
  labelActive: { fontFamily: fontFamily.bodyMedium, color: palette.gold, fontSize: 10 },
});
