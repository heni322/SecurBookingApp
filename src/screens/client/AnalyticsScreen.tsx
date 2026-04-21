/**
 * AnalyticsScreen — spending & mission charts dashboard.
 * Bar chart for monthly spending + pie-like breakdown of mission statuses.
 * Pure RN (no charting lib dependency) — uses animated bars.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TrendingUp, Shield, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { missionsApi }    from '@api/endpoints/missions';
import { paymentsApi }    from '@api/endpoints/payments';
import { useApi }         from '@hooks/useApi';
import { ScreenHeader }   from '@components/ui/ScreenHeader';
import { Card }           from '@components/ui/Card';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatEuros }    from '@utils/formatters';
import { MissionStatus, PaymentStatus } from '@constants/enums';
import type { ProfileStackParamList, Mission, Payment } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Analytics'>;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getLast6Months(): { key: string; label: string }[] {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d);
    result.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return result;
}

// ─── Bar ─────────────────────────────────────────────────────────────────────
const AnimatedBar: React.FC<{ ratio: number; color: string; height: number }> = ({
  ratio, color, height,
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: ratio, useNativeDriver: false, friction: 6, tension: 50 }).start();
  }, [ratio]);
  const barH = anim.interpolate({ inputRange: [0, 1], outputRange: [2, height] });
  return (
    <Animated.View
      style={{
        width:        24,
        height:       barH,
        borderRadius: 4,
        backgroundColor: color,
      }}
    />
  );
};

export const AnalyticsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation('payment');
  const { data: missions, loading: mLoading, execute: loadM } = useApi(missionsApi.getMyMissions);
  const { data: payments, loading: pLoading, execute: loadP } = useApi(paymentsApi.getMyPayments);

  const load = () => { loadM(); loadP(); };
  useEffect(() => { load(); }, []);

  const loading = mLoading || pLoading;
  const months  = getLast6Months();

  // Monthly spending
  const monthlySpend = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of months) map[m.key] = 0;
    for (const p of (Array.isArray(payments) ? payments : [])) {
      if (p.status !== PaymentStatus.PAID) continue;
      const d   = new Date(p.paidAt ?? p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '00')}`;
      if (key in map) map[key] += p.amount;
    }
    return months.map(m => ({ ...m, value: map[m.key] }));
  }, [payments, months]);

  const maxSpend = Math.max(...monthlySpend.map(m => m.value), 1);
  const totalSpend = monthlySpend.reduce((s, m) => s + m.value, 0);

  // Mission statuses
  const statusData = useMemo(() => {
    const all = Array.isArray(missions) ? missions : [];
    return [
      { label: t('history.status.paid'),  count: all.filter((m: Mission) => m.status === MissionStatus.COMPLETED).length,  color: colors.success, Icon: CheckCircle },
      { label: 'En cours',   count: all.filter((m: Mission) => [MissionStatus.IN_PROGRESS, MissionStatus.PUBLISHED, MissionStatus.STAFFED].includes(m.status as any)).length, color: colors.primary, Icon: Shield },
      { label: 'Brouillons', count: all.filter((m: Mission) => m.status === MissionStatus.CREATED).length,      color: colors.textMuted, Icon: Clock },
      { label: 'Cancelled',   count: all.filter((m: Mission) => m.status === MissionStatus.CANCELLED).length,  color: colors.danger, Icon: XCircle },
    ];
  }, [missions]);

  const totalMissions = statusData.reduce((s, d) => s + d.count, 0);

  // Monthly missions count
  const monthlyMissions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of months) map[m.key] = 0;
    for (const miss of (Array.isArray(missions) ? missions : [])) {
      if (miss.status === MissionStatus.CANCELLED) continue;
      const d   = new Date(miss.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '00')}`;
      if (key in map) map[key]++;
    }
    return months.map(m => ({ ...m, count: map[m.key] }));
  }, [missions, months]);

  const maxMissions = Math.max(...monthlyMissions.map(m => m.count), 1);

  const BAR_H = 80;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Analytiques" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
        }
      >

        {/* ── Summary KPIs ─────────────────────────────────────────────── */}
        <View style={styles.kpiRow}>
          <KpiCard label="Total spent"  value={formatEuros(totalSpend)}      accent />
          <KpiCard label="Total missions" value={String(totalMissions)} />
        </View>

        {/* ── Monthly Spending Bar Chart ───────────────────────────────── */}
        <Card elevated style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <TrendingUp size={16} color={colors.primary} strokeWidth={1.8} />
            <Text style={styles.chartTitle}>Dépenses mensuelles</Text>
          </View>
          <View style={styles.barsRow}>
            {monthlySpend.map(m => (
              <View key={m.key} style={styles.barCol}>
                <Text style={styles.barValue}>
                  {m.value > 0 ? `${Math.round(m.value)}€` : ''}
                </Text>
                <View style={[styles.barTrack, { height: BAR_H }]}>
                  <AnimatedBar
                    ratio={m.value / maxSpend}
                    color={colors.primary}
                    height={BAR_H}
                  />
                </View>
                <Text style={styles.barLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ── Monthly Missions Bar Chart ───────────────────────────────── */}
        <Card elevated style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Shield size={16} color={colors.info} strokeWidth={1.8} />
            <Text style={styles.chartTitle}>Missions par mois</Text>
          </View>
          <View style={styles.barsRow}>
            {monthlyMissions.map(m => (
              <View key={m.key} style={styles.barCol}>
                <Text style={styles.barValue}>
                  {m.count > 0 ? m.count : ''}
                </Text>
                <View style={[styles.barTrack, { height: BAR_H }]}>
                  <AnimatedBar
                    ratio={m.count / maxMissions}
                    color={colors.info}
                    height={BAR_H}
                  />
                </View>
                <Text style={styles.barLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ── Status Breakdown ─────────────────────────────────────────── */}
        <Card elevated style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Shield size={16} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.chartTitle}>Répartition des missions</Text>
          </View>
          <View style={styles.statusList}>
            {statusData.map(({ label, count, color, Icon }) => {
              const pct = totalMissions > 0 ? count / totalMissions : 0;
              return (
                <View key={label} style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <Text style={styles.statusLabel}>{label}</Text>
                  <View style={styles.statusTrack}>
                    <View style={[styles.statusFill, { flex: pct, backgroundColor: color + 'AA' }]} />
                    <View style={{ flex: 1 - pct }} />
                  </View>
                  <Text style={[styles.statusCount, { color }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </Card>

      </ScrollView>
    </View>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label, value, accent,
}) => (
  <View style={[kpiStyles.card, accent && kpiStyles.cardAccent]}>
    <Text style={[kpiStyles.value, accent && kpiStyles.valueAccent]}>{value}</Text>
    <Text style={kpiStyles.label}>{label}</Text>
  </View>
);

const kpiStyles = StyleSheet.create({
  card: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing[4],
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    gap:             spacing[1],
  },
  cardAccent:  { backgroundColor: colors.primarySurface, borderColor: colors.borderPrimary },
  value:       { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.5 },
  valueAccent: { color: colors.primary },
  label:       { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
});

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom:     spacing[12],
    gap:               spacing[4],
    paddingTop:        spacing[2],
  },
  kpiRow: { flexDirection: 'row', gap: spacing[3] },

  chartCard:   { padding: spacing[4] },
  chartHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[2],
    marginBottom:  spacing[5],
  },
  chartTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.base,
    color:      colors.textPrimary,
  },

  // Bar chart
  barsRow: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'space-between',
    gap:            spacing[2],
  },
  barCol: {
    flex:       1,
    alignItems: 'center',
    gap:        spacing[1],
  },
  barValue: {
    fontFamily: fontFamily.mono,
    fontSize:   8,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  barTrack: {
    width:          '100%',
    justifyContent: 'flex-end',
    alignItems:     'center',
  },
  barLabel: {
    fontFamily: fontFamily.body,
    fontSize:   9,
    color:      colors.textMuted,
    textAlign:  'center',
  },

  // Status breakdown
  statusList: { gap: spacing[3] },
  statusRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[2],
  },
  statusDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    flexShrink:   0,
  },
  statusLabel: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textSecondary,
    width:      70,
  },
  statusTrack: {
    flex:          1,
    height:        6,
    borderRadius:  3,
    flexDirection: 'row',
    overflow:      'hidden',
    backgroundColor: colors.surface,
  },
  statusFill:  { borderRadius: 3 },
  statusCount: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize:   fontSize.sm,
    width:      20,
    textAlign:  'right',
  },
});
