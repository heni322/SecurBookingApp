/**
 * PartnerNavigator — Bottom-tab navigator for users whose `role === 'PARTNER'`.
 *
 * Mounted from RootNavigator when the authenticated user is a partner
 * (sécurité-société). Layout:
 *
 *   Tab bar : Dashboard · Équipe · Finances · Profil
 *   Stacks  : HomeStack    (Dashboard · CreateMission · Missions · Funding · Contracts)
 *             TeamStack    (TeamList · AgentDetail)
 *             FinanceStack (Financials · Billing)
 *             ProfileStack (Profile · CompanyEdit · Documents · Compliance · AddDocument)
 *
 * Enterprise migration note: the `PartnerCreateMission` route renders the
 * CLIENT app's `MissionCreateScreen` (the rich 2-step UX with draft autosave
 * and per-slot staffing) instead of a separate partner-only screen. The
 * backend's `POST /missions/create` auto-routes by JWT role: when called by
 * a PARTNER it attaches the mission to the partner's auto-provisioned client
 * profile. No payload change required.
 *
 * [FIX 2026-10-07 · navigation audit]
 *  - Tab labels were hardcoded French and the tabs had no accessibility label
 *    (tabBarLabel is null, so screen readers announced nothing useful).
 *  - Fixed 72dp bar ignored the Android gesture-bar / iOS home-indicator
 *    inset; now safe-area aware like the client bar.
 *  - The tab bar stayed visible during mission creation (a stray tap left the
 *    order mid-way), and the Home tab could re-open a stale create form;
 *    hidden + reset to the dashboard, same rules as the client app.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets }          from 'react-native-safe-area-context';
import { useTranslation }             from '@i18n';
import { Building2, Users, TrendingUp, User } from 'lucide-react-native';

import { PartnerDashboardScreen }     from '@screens/partner/PartnerDashboardScreen';
import { PartnerTeamScreen }          from '@screens/partner/PartnerTeamScreen';
import { PartnerAgentDetailScreen }   from '@screens/partner/PartnerAgentDetailScreen';
import { PartnerFinancialsScreen }    from '@screens/partner/PartnerFinancialsScreen';
import { PartnerBillingScreen }       from '@screens/partner/PartnerBillingScreen';
import { PartnerTimesheetsScreen }    from '@screens/partner/PartnerTimesheetsScreen';
import { PartnerCompanyEditScreen }   from '@screens/partner/PartnerCompanyEditScreen';
import { PartnerDocumentsScreen }     from '@screens/partner/PartnerDocumentsScreen';
import { PartnerComplianceScreen }    from '@screens/partner/PartnerComplianceScreen';
import { PartnerAddDocumentScreen }   from '@screens/partner/PartnerAddDocumentScreen';
import { PartnerProfileScreen }       from '@screens/partner/PartnerProfileScreen';
import { PartnerMissionsScreen }      from '@screens/partner/PartnerMissionsScreen';
import { PartnerMissionFundingScreen } from '@screens/partner/PartnerMissionFundingScreen';
import { PartnerContractCreateScreen } from '@screens/partner/PartnerContractCreateScreen';
import { PartnerContractDetailScreen } from '@screens/partner/PartnerContractDetailScreen';
import { PartnerContractsScreen }      from '@screens/partner/PartnerContractsScreen';
import { PartnerStaffingScreen }       from '@screens/partner/PartnerStaffingScreen';
import { PartnerAssignAgentScreen }    from '@screens/partner/PartnerAssignAgentScreen';
import { PartnerMissionDetailScreen }  from '@screens/partner/PartnerMissionDetailScreen';
// Mission creation reuses the client experience — see header note.
import { MissionCreateScreen }        from '@screens/client/MissionCreateScreen';

import { colors, palette }      from '@theme/colors';
import { spacing, radius }      from '@theme/spacing';
import { fontFamily, fontSize } from '@theme/typography';
import type {
  PartnerTabParamList,
  PartnerHomeStackParamList,
  PartnerTeamStackParamList,
  PartnerFinanceStackParamList,
  PartnerProfileStackParamList,
} from '@models/index';

// ── Home stack (Home tab) ────────────────────────────────────────────────────
//   Dashboard + self-service mission creation + missions list / funding
//   + employment contract create / detail.
const HomeStack = createNativeStackNavigator<PartnerHomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="PartnerHomeDashboard"  component={PartnerDashboardScreen} />
      {/* Reuses the client's MissionCreateScreen — see header note. */}
      {/* Cross-stack reuse: MissionCreateScreen is typed for MissionStackParamList
            but the partner home stack hosts it under PartnerCreateMission.
            React Navigation only inspects shape at runtime, so the cast is safe. */}
            <HomeStack.Screen
              name="PartnerCreateMission"
              component={MissionCreateScreen as unknown as React.ComponentType<unknown>}
            />
      <HomeStack.Screen name="PartnerMissions"       component={PartnerMissionsScreen} />
      <HomeStack.Screen name="PartnerMissionFunding" component={PartnerMissionFundingScreen} />
      <HomeStack.Screen name="PartnerContractCreate" component={PartnerContractCreateScreen} />
      <HomeStack.Screen name="PartnerContractDetail" component={PartnerContractDetailScreen} />
      <HomeStack.Screen name="PartnerContracts"      component={PartnerContractsScreen} />
      <HomeStack.Screen name="PartnerStaffing"       component={PartnerStaffingScreen} />
      <HomeStack.Screen name="PartnerAssignAgent"    component={PartnerAssignAgentScreen} />
      <HomeStack.Screen name="PartnerMissionDetail"  component={PartnerMissionDetailScreen} />
    </HomeStack.Navigator>
  );
}

// ── Team stack (Team tab) ────────────────────────────────────────────────────
const TeamStack = createNativeStackNavigator<PartnerTeamStackParamList>();

function TeamStackNavigator() {
  return (
    <TeamStack.Navigator screenOptions={{ headerShown: false }}>
      <TeamStack.Screen name="PartnerTeamList"    component={PartnerTeamScreen} />
      <TeamStack.Screen name="PartnerAgentDetail" component={PartnerAgentDetailScreen} />
    </TeamStack.Navigator>
  );
}

// ── Finance stack (Finance tab) ──────────────────────────────────────────────
const FinanceStack = createNativeStackNavigator<PartnerFinanceStackParamList>();

function FinanceStackNavigator() {
  return (
    <FinanceStack.Navigator screenOptions={{ headerShown: false }}>
      <FinanceStack.Screen name="PartnerFinancials" component={PartnerFinancialsScreen} />
      <FinanceStack.Screen name="PartnerBilling"    component={PartnerBillingScreen} />
      <FinanceStack.Screen name="PartnerTimesheets" component={PartnerTimesheetsScreen} />
    </FinanceStack.Navigator>
  );
}

// ── Profile stack (Profile tab) ──────────────────────────────────────────────
//   Route name `PartnerDashboard` retained for back-compat with deep links;
//   the rendered screen is the real partner profile, not a dashboard.
const ProfileStack = createNativeStackNavigator<PartnerProfileStackParamList>();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="PartnerDashboard"   component={PartnerProfileScreen} />
      <ProfileStack.Screen name="PartnerCompanyEdit" component={PartnerCompanyEditScreen} />
      <ProfileStack.Screen name="PartnerDocuments"   component={PartnerDocumentsScreen} />
      <ProfileStack.Screen name="PartnerCompliance"  component={PartnerComplianceScreen} />
      <ProfileStack.Screen name="PartnerAddDocument" component={PartnerAddDocumentScreen} />
    </ProfileStack.Navigator>
  );
}

// ── Tab Navigator ────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<PartnerTabParamList>();

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;
type TabKey = 'dashboard' | 'team' | 'finance' | 'profile';
interface TabDef { name: keyof PartnerTabParamList; labelKey: TabKey; Icon: LucideIcon }

const TABS: TabDef[] = [
  { name: 'PartnerHome',    labelKey: 'dashboard', Icon: Building2 },
  { name: 'PartnerTeam',    labelKey: 'team',      Icon: Users },
  { name: 'PartnerFinance', labelKey: 'finance',   Icon: TrendingUp },
  { name: 'PartnerProfile', labelKey: 'profile',   Icon: User },
];

/** One-off flows: tab bar hidden, and the tab resets to its root if left there. */
const IMMERSIVE_ROUTES = new Set<string>(['PartnerCreateMission']);

export const PartnerNavigator: React.FC = () => {
  const { t }  = useTranslation('navigation');
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, spacing[2]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab   = TABS.find(td => td.name === route.name)!;
        const label = t(`partner_tabs.${tab.labelKey}`);
        const hide  = IMMERSIVE_ROUTES.has(getFocusedRouteNameFromRoute(route) ?? '');
        return {
          headerShown: false,
          tabBarStyle: hide
            ? { display: 'none' }
            : [styles.tabBar, { height: 64 + bottomPad, paddingBottom: bottomPad }],
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: label,
          tabBarIcon: ({ focused }) => <TabItem Icon={tab.Icon} label={label} focused={focused} />,
        };
      }}
    >
      <Tab.Screen
        name="PartnerHome"
        component={HomeStackNavigator}
        listeners={({ navigation, route }) => ({
          // Never re-open a stale create form from the tab: back to the
          // dashboard (the draft is autosaved and offered again).
          tabPress: (e) => {
            const focused  = getFocusedRouteNameFromRoute(route);
            const stackKey = (route as { state?: { key?: string } }).state?.key;
            if (focused && IMMERSIVE_ROUTES.has(focused) && stackKey) {
              e.preventDefault();
              navigation.dispatch({
                ...CommonActions.reset({ index: 0, routes: [{ name: 'PartnerHomeDashboard' }] }),
                target: stackKey,
              });
              navigation.navigate('PartnerHome');
            }
          },
        })}
      />
      <Tab.Screen name="PartnerTeam"    component={TeamStackNavigator} />
      <Tab.Screen name="PartnerFinance" component={FinanceStackNavigator} />
      <Tab.Screen name="PartnerProfile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};

// ── TabItem ──────────────────────────────────────────────────────────────────
const TabItem: React.FC<{ Icon: LucideIcon; label: string; focused: boolean }> = ({ Icon, label, focused }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const labelAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.18, duration: 110, useNativeDriver: true }),
        Animated.spring(scaleAnim,  { toValue: 1,   friction: 4,  useNativeDriver: true }),
      ]).start();
    }
    Animated.timing(labelAnim, { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [focused, scaleAnim, labelAnim]);

  const labelTranslY = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] });

  return (
    <View style={tabStyles.outer}>
      <View style={[tabStyles.pill, focused && tabStyles.pillActive]}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Icon
            size={19}
            color={focused ? '#ffffff' : palette.white30}
            strokeWidth={focused ? 2.4 : 1.8}
          />
        </Animated.View>
      </View>
      <Animated.Text
        numberOfLines={1}
        style={[
          tabStyles.label,
          focused && tabStyles.labelActive,
          { opacity: focused ? labelAnim : 0.5, transform: [{ translateY: labelTranslY }] },
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Height is set per render from the safe-area inset (see PartnerNavigator).
  tabBar: {
    backgroundColor: 'rgba(5,23,43,0.97)',
    borderTopWidth:  0,
    ...Platform.select({
      ios:     { shadowColor: palette.gold, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 24 },
    }),
  },
});

const tabStyles = StyleSheet.create({
  outer:       { width: 66, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: spacing[2] },
  pill:        { width: 48, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  pillActive:  {
    backgroundColor: palette.gold,
    ...Platform.select({
      ios:     { shadowColor: palette.gold, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.7, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  label:       { fontFamily: fontFamily.body,       fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 0.2 },
  labelActive: { fontFamily: fontFamily.bodyMedium, color: palette.gold },
});
