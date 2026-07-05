/**
 * PartnerDashboardScreen — Tableau de bord partenaire (société de sécurité).
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePartnerT } from './_partnerI18n';
import {
  Users, Briefcase, Plus, CircleCheckBig, Clock, Pencil,
  TrendingUp, Wallet, ChevronRight, Building2, ShieldCheck, FileText,
} from 'lucide-react-native';
import { partnerApi }    from '@api/endpoints/partner';
import { useAuthStore }  from '@store/authStore';
import { ScreenHeader }  from '@components/ui/ScreenHeader';
import { EmailVerificationBanner } from '@components/domain/EmailVerificationBanner';
import { Card }          from '@components/ui/Card';
import { Separator }     from '@components/ui/Separator';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatEuros }             from '@utils/formatters';
import type { PartnerDashboard, PartnerTabParamList, PartnerHomeStackParamList } from '@models/index';

// The dashboard lives inside PartnerHome's stack but its quick-actions hop
// across to the Team / Finance / Profile tabs. Compose the native-stack nav
// (in-stack pushes) with the bottom-tab nav (cross-tab hops, which address
// the tab by name and nest a { screen, params } payload). PartnerTabParamList
// already carries NavigatorScreenParams<…> for each stack-hosting tab — no
// shadow type needed here.
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<PartnerHomeStackParamList, 'PartnerHomeDashboard'>,
  BottomTabNavigationProp<PartnerTabParamList>
>;
type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

export const PartnerDashboardScreen: React.FC = () => {
  const navigation  = useNavigation<Nav>();
  const { user }    = useAuthStore();
  const { t } = usePartnerT();
  const [data,      setData]      = useState<PartnerDashboard | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await partnerApi.getDashboard();
      setData((res.data as any)?.data ?? res.data);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.greeting.morning');
    if (h < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  if (loading && !data) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('dashboard.title')} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={data?.company?.companyName ?? t('dashboard.greeting.fallback')} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        <EmailVerificationBanner />
        {/* Greeting */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Building2 size={24} color={colors.primary} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting()}, {user?.fullName?.split(' ')[0] ?? t('dashboard.greeting.fallback')}</Text>
            <Text style={styles.companyName}>{data?.company?.companyName ?? '—'}</Text>
            {data?.company?.city && <Text style={styles.companyCity}>{data.company.city}</Text>}
          </View>
        </View>

        {/* Team KPIs */}
        <Text style={styles.sectionTitle}>{t('dashboard.sections.team')}</Text>
        <View style={styles.kpiRow}>
          <KpiCard Icon={Users}        label={t('dashboard.kpi.agents')}    value={String(data?.teamSize ?? 0)}  color={colors.primary} />
          <KpiCard Icon={CircleCheckBig} label={t('dashboard.kpi.validated')} value={String(data?.validated ?? 0)} color={colors.success} />
        </View>

        {/* Mission KPIs */}
        <Text style={styles.sectionTitle}>{t('dashboard.sections.missions')}</Text>
        <View style={styles.kpiRow}>
          <KpiCard Icon={Briefcase}    label={t('dashboard.kpi.active')}    value={String(data?.missions.active    ?? 0)} color={colors.warning} />
          <KpiCard Icon={CircleCheckBig} label={t('dashboard.kpi.completed')} value={String(data?.missions.completed ?? 0)} color={colors.success} />
        </View>

        {/* Financial summary */}
        <Text style={styles.sectionTitle}>{t('dashboard.sections.finances')}</Text>
        <Card style={styles.financeCard} elevated>
          <View style={styles.financeRow}>
            <View style={styles.financeIconWrap}>
              <Clock size={18} color={colors.warning} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.financeLabel}>{t('dashboard.kpi.scheduledPayouts')}</Text>
              <Text style={[styles.financeAmount, { color: colors.warning }]}>
                {formatEuros(data?.payouts.scheduledAmount ?? 0)}
              </Text>
            </View>
          </View>
          <Separator marginV={spacing[3]} />
          <View style={styles.financeRow}>
            <View style={[styles.financeIconWrap, { backgroundColor: colors.successSurface }]}>
              <Wallet size={18} color={colors.success} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.financeLabel}>{t('dashboard.kpi.totalPaid')}</Text>
              <Text style={[styles.financeAmount, { color: colors.success }]}>
                {formatEuros(data?.payouts.totalPaid ?? 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>{t('dashboard.sections.quickAccess')}</Text>
        <Card style={styles.actionsCard}>
          <ActionRow Icon={Plus}       label={t('dashboard.actions.createMission')} sub={t('dashboard.actions.createMissionSub')} onPress={() => navigation.navigate('PartnerCreateMission')} />
          <Separator marginV={spacing[2]} />
          <ActionRow Icon={Briefcase}  label={t('dashboard.actions.myMissions')}    sub={t('dashboard.actions.myMissionsSub')}    onPress={() => navigation.navigate('PartnerMissions')} />
          <Separator marginV={spacing[2]} />
          <ActionRow Icon={Users}       label={t('dashboard.actions.team')}       sub={t('dashboard.actions.teamSub')}        onPress={() => navigation.navigate('PartnerTeam',    { screen: 'PartnerTeamList' })} />
          <Separator marginV={spacing[2]} />
          <ActionRow Icon={TrendingUp}  label={t('dashboard.actions.finances')}   sub={t('dashboard.actions.financesSub')}    onPress={() => navigation.navigate('PartnerFinance', { screen: 'PartnerFinancials' })} />
          <Separator marginV={spacing[2]} />
          <ActionRow Icon={Wallet}      label={t('dashboard.actions.billing')}    sub={t('dashboard.actions.billingSub')}     onPress={() => navigation.navigate('PartnerFinance', { screen: 'PartnerBilling' })} />
          <Separator marginV={spacing[2]} />
          <ActionRow Icon={ShieldCheck} label={t('dashboard.actions.compliance')} sub={t('dashboard.actions.complianceSub')} onPress={() => navigation.navigate('PartnerProfile', { screen: 'PartnerCompliance' })} />
          <Separator marginV={spacing[2]} />
          <ActionRow Icon={FileText}    label={t('dashboard.actions.documents')}  sub={t('dashboard.actions.documentsSub')}  onPress={() => navigation.navigate('PartnerProfile', { screen: 'PartnerDocuments' })} />
          <Separator marginV={spacing[2]} />
          <ActionRow Icon={Pencil}      label={t('dashboard.actions.editCompany')}sub={t('dashboard.actions.editCompanySub')}onPress={() => navigation.navigate('PartnerProfile', { screen: 'PartnerCompanyEdit' })} />
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const KpiCard: React.FC<{ Icon: LucideIcon; label: string; value: string; color: string }> = ({ Icon, label, value, color }) => (
  <View style={[kpiStyles.card, { borderColor: color + '30' }]}>
    <View style={[kpiStyles.iconWrap, { backgroundColor: color + '18' }]}>
      <Icon size={18} color={color} strokeWidth={1.8} />
    </View>
    <Text style={kpiStyles.value}>{value}</Text>
    <Text style={kpiStyles.label}>{label}</Text>
  </View>
);

const kpiStyles = StyleSheet.create({
  card:     { flex: 1, borderRadius: radius.xl, borderWidth: 1, padding: spacing[4], alignItems: 'center', gap: spacing[2], backgroundColor: colors.surface },
  iconWrap: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  value:    { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.5 },
  label:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
});

const ActionRow: React.FC<{ Icon: LucideIcon; label: string; sub: string; onPress: () => void }> = ({ Icon, label, sub, onPress }) => (
  <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.actionIconWrap}>
      <Icon size={18} color={colors.primary} strokeWidth={1.8} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </View>
    <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:     { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  hero:         { flexDirection: 'row', alignItems: 'center', gap: spacing[4], backgroundColor: colors.primarySurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.borderPrimary },
  heroIconWrap: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  greeting:     { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  companyName:  { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  companyCity:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  sectionTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiRow:       { flexDirection: 'row', gap: spacing[3] },
  financeCard:    { gap: 0 },
  financeRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  financeIconWrap:{ width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.warningSurface, alignItems: 'center', justifyContent: 'center' },
  financeLabel:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  financeAmount:  { fontFamily: fontFamily.display, fontSize: fontSize.xl, letterSpacing: -0.4 },
  actionsCard: { gap: spacing[1] },
  actionRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  actionIconWrap:{ width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  actionSub:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
