/**
 * MainNavigator - CLIENT bottom tab bar.
 *
 * Design ported from the Agent app for visual parity:
 *   - Animated gold "pill" fill behind the active tab (fade + scale in).
 *   - Icon crossfade: muted (inactive) -> navy-on-gold (active).
 *   - Focus bounce, honouring the OS "Reduce Motion" setting.
 *   - Selection haptic + full accessibility (role / selected / label / badge).
 *   - Safe-area aware height so the bar clears the home-indicator / gesture bar.
 *
 * 4 tabs: Home - Missions - Notifications - Profile
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Platform,
  Pressable,
  AccessibilityInfo,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Shield, Bell, User } from 'lucide-react-native';
import { useNotificationsStore }  from '@store/notificationsStore';
import { MissionStackNavigator }  from './MissionStackNavigator';
import { ProfileStackNavigator }  from './ProfileStackNavigator';
import { HomeScreen }             from '@screens/client/HomeScreen';
import { NotificationsScreen }    from '@screens/client/NotificationsScreen';
import { colors, palette }        from '@theme/colors';
import { spacing, radius }        from '@theme/spacing';
import { fontFamily, fontSize }   from '@theme/typography';
import { haptic }                 from '@utils/haptics';
import type { MainTabParamList }  from '@models/index';
import { useTranslation }         from '@i18n';

const Tab = createBottomTabNavigator<MainTabParamList>();

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

interface TabDef {
  name:     keyof MainTabParamList;
  /** i18n key under the `navigation` namespace -> `tabs.<labelKey>`. */
  labelKey: 'home' | 'missions' | 'notifications' | 'profile';
  Icon:     LucideIcon;
}

const TABS: TabDef[] = [
  { name: 'Home',          labelKey: 'home',          Icon: Home   },
  { name: 'Missions',      labelKey: 'missions',      Icon: Shield },
  { name: 'Notifications', labelKey: 'notifications', Icon: Bell   },
  { name: 'Profile',       labelKey: 'profile',       Icon: User   },
];

/** Core content height of the bar, before the device safe-area inset. */
const BAR_CONTENT_HEIGHT = 58;

export const MainNavigator: React.FC = () => {
  const { t }       = useTranslation('navigation');
  const insets      = useSafeAreaInsets();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  // Respect the OS "Reduce Motion" accessibility setting (live-updates).
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Honour the home-indicator / gesture-bar; fall back to a comfortable min.
  const bottomPad = Math.max(insets.bottom, spacing[2]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab     = TABS.find((tdef) => tdef.name === route.name)!;
        const label   = t(`tabs.${tab.labelKey}`);
        const isNotif = route.name === 'Notifications';
        const badge   = isNotif ? unreadCount : 0;

        return {
          headerShown:          false,
          tabBarShowLabel:      false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: [
            styles.tabBar,
            { height: BAR_CONTENT_HEIGHT + bottomPad, paddingBottom: bottomPad },
          ],
          tabBarButton: (props) => (
            <TabBarButton {...props} label={label} badge={badge} />
          ),
          tabBarIcon: ({ focused }) => (
            <TabItem
              Icon={tab.Icon}
              label={label}
              focused={focused}
              badge={badge}
              reduceMotion={reduceMotion}
            />
          ),
        };
      }}
    >
      <Tab.Screen name="Home"          component={HomeScreen}            />
      <Tab.Screen name="Missions"      component={MissionStackNavigator} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}   />
      <Tab.Screen name="Profile"       component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};

/**
 * Accessible, ripple-free press target wrapping the whole tab cell.
 * Exposes the tab role + selected state + an a11y label that includes the
 * unread badge count so screen readers announce e.g. "Notifications, selected, 3".
 * Fires a gentle selection haptic on press.
 */
const TabBarButton: React.FC<BottomTabBarButtonProps & { label: string; badge: number }> = ({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  label,
  badge,
  style,
}) => {
  const selected = accessibilityState?.selected ?? false;

  return (
    <Pressable
      onPress={(e) => {
        haptic('selection');
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityValue={badge > 0 ? { text: String(badge) } : undefined}
      android_ripple={null}
      hitSlop={6}
      style={({ pressed }) => [styles.tabButton, style, { opacity: pressed ? 0.55 : 1 }]}
    >
      {children}
    </Pressable>
  );
};

const TabItem: React.FC<{
  Icon: LucideIcon;
  label: string;
  focused: boolean;
  badge?: number;
  reduceMotion?: boolean;
}> = ({ Icon, label, focused, badge = 0, reduceMotion = false }) => {
  // Single driver (0 -> 1) powers: pill fill, icon crossfade, label tint.
  const active = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const scale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(active, {
      toValue: focused ? 1 : 0,
      duration: reduceMotion ? 0 : 200,
      useNativeDriver: true,
    }).start();

    if (focused && !reduceMotion) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.16, duration: 110, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1);
    }
  }, [focused, reduceMotion, active, scale]);

  const inactiveIconOpacity = active.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    // pointerEvents none -> presses are handled by the parent TabBarButton.
    <View style={tabStyles.outer} pointerEvents="none">
      <View style={tabStyles.pillWrap}>
        {/* Animated gold fill - fades / scales in when the tab becomes active. */}
        <Animated.View
          style={[
            tabStyles.pillFill,
            focused && tabStyles.pillGlow,
            { opacity: active, transform: [{ scale }] },
          ]}
        />

        {/* Inactive (muted) icon layer. */}
        <Animated.View style={[tabStyles.iconLayer, { opacity: inactiveIconOpacity }]}>
          <Icon size={20} color={palette.white40} strokeWidth={1.9} />
        </Animated.View>

        {/* Active (navy on gold) icon layer - crossfades over the inactive one. */}
        <Animated.View style={[tabStyles.iconLayer, { opacity: active, transform: [{ scale }] }]}>
          <Icon size={20} color={palette.navy} strokeWidth={2.4} />
        </Animated.View>

        {badge > 0 && (
          <View style={tabStyles.badge}>
            <Text style={tabStyles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>

      <Text numberOfLines={1} style={[tabStyles.label, focused && tabStyles.labelActive]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(7,17,33,0.98)',
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  'rgba(188,147,59,0.22)',
    paddingTop:      spacing[2],
    elevation:       0,
    ...Platform.select({
      ios: {
        shadowColor:   palette.gold,
        shadowOffset:  { width: 0, height: -5 },
        shadowOpacity: 0.14,
        shadowRadius:  22,
      },
      android: { elevation: 24 },
    }),
  },
  tabButton: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
});

const tabStyles = StyleSheet.create({
  outer: {
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
    minWidth:       64,
  },
  pillWrap: {
    width:          56,
    height:         32,
    borderRadius:   radius.full,
    alignItems:     'center',
    justifyContent: 'center',
  },
  pillFill: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    borderRadius:    radius.full,
    backgroundColor: palette.gold,
  },
  pillGlow: {
    ...Platform.select({
      ios: {
        shadowColor:   palette.gold,
        shadowOffset:  { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius:  10,
      },
      android: { elevation: 10 },
    }),
  },
  iconLayer: {
    position:       'absolute',
    top:            0,
    left:           0,
    right:          0,
    bottom:         0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  badge: {
    position:          'absolute',
    top:               -4,
    right:             4,
    backgroundColor:   colors.danger,
    borderRadius:      radius.full,
    minWidth:          17,
    height:            17,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
    borderWidth:       1.5,
    borderColor:       'rgba(7,17,33,0.98)',
  },
  badgeText: {
    fontFamily: fontFamily.monoMedium,
    fontSize:   8,
    color:      colors.white,
    lineHeight: 11,
  },
  label: {
    fontFamily:    fontFamily.body,
    fontSize:      fontSize.xs,
    color:         colors.textMuted,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontFamily: fontFamily.bodyMedium,
    color:      palette.goldTxt,
  },
});
