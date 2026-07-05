/**
 * PartnerFinancialsScreen — Synthèse financière + billing breakdown + PDF.
 */
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Linking, Modal, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePartnerT } from './_partnerI18n';
import {
  Wallet, TrendingUp, Clock, CircleCheckBig, Download,
  Calendar, Users, ChevronDown, ChevronUp, Search, CircleAlert, X,
} from 'lucide-react-native';
import { partnerApi }   from '@api/endpoints/partner';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Button }       from '@components/ui/Button';
import { Separator }    from '@components/ui/Separator';
import { LoadingState } from '@components/ui/LoadingState';
import { EmptyState }   from '@components/ui/EmptyState';
import { showAlert }    from '@components/ui/AlertModal';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatEuros, formatDate } from '@utils/formatters';
import type { PartnerBillingBreakdown, PartnerFinanceStackParamList } from '@models/index';

// PartnerFinancialsScreen lives in PartnerFinanceStackNavigator (Finance tab).
type Nav = NativeStackNavigationProp<PartnerFinanceStackParamList, 'PartnerFinancials'>;

const y = new Date().getFullYear();

interface Preset { label: string; from: string; to: string }
function buildPresets(t: any): Preset[] {
  return [
    { label: t('financials.period.year', { year: y }),   from: `${y}-01-01`,   to: `${y}-12-31` },
    { label: t('financials.period.year', { year: y-1 }), from: `${y-1}-01-01`, to: `${y-1}-12-31` },
    { label: `T1 ${y}`, from: `${y}-01-01`, to: `${y}-03-31` },
    { label: `T2 ${y}`, from: `${y}-04-01`, to: `${y}-06-30` },
    { label: `T3 ${y}`, from: `${y}-07-01`, to: `${y}-09-30` },
    { label: `T4 ${y}`, from: `${y}-10-01`, to: `${y}-12-31` },
    { label: t('financials.period.all_periods'), from: '', to: '' },
  ];
}

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

const TotalCard: React.FC<{ Icon: LucideIcon; label: string; value: string; color: string }> = ({ Icon, label, value, color }) => (
  <View style={[totalS.card, { borderColor: color + '30' }]}>
    <Icon size={16} color={color} strokeWidth={1.8} />
    <Text style={[totalS.value, { color }]}>{value}</Text>
    <Text style={totalS.label}>{label}</Text>
  </View>
);
const totalS = StyleSheet.create({
  card:  { flex: 1, alignItems: 'center', gap: spacing[1], padding: spacing[3], borderRadius: radius.xl, borderWidth: 1, backgroundColor: colors.surface },
  value: { fontFamily: fontFamily.display, fontSize: fontSize.lg, letterSpacing: -0.3 },
  label: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center' },
});

export const PartnerFinancialsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = usePartnerT();

  const PRESETS = useMemo(() => buildPresets(t), [t]);

  const [from,       setFrom]       = useState(`${y}-01-01`);
  const [to,         setTo]         = useState(`${y}-12-31`);
  const [data,       setData]       = useState<PartnerBillingBreakdown | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search,     setSearch]     = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (f = from, t2 = to, refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await partnerApi.getBillingBreakdown(f || undefined, t2 || undefined);
      setData((res.data as any)?.data ?? res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? t('financials.errors.load'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [from, to, t]);

  useEffect(() => { load(from, to); }, []); // eslint-disable-line

  const applyPreset = (p: Preset) => {
    setFrom(p.from); setTo(p.to);
    setShowPicker(false);
    load(p.from, p.to);
  };

  const handleGeneratePdf = async () => {
    if (!from || !to) {
      showAlert(t('financials.errors.periodRequired.title'), t('financials.errors.periodRequired.body'));
      return;
    }
    setGenerating(true);
    try {
      const res = await partnerApi.generateInvoice(from, to);
      const url = (res.data as any)?.data?.pdfUrl ?? (res.data as any)?.pdfUrl;
      if (url) {
        await Linking.openURL(url).catch(() => showAlert(t('financials.pdf.generated'), t('financials.pdf.cannotOpen')));
      } else {
        showAlert(t('financials.pdf.generated'), t('financials.pdf.generatedBody'));
      }
    } catch (err: any) {
      showAlert(t('common:errors.title'), err?.response?.data?.message ?? t('financials.errors.pdfFailed'));
    } finally { setGenerating(false); }
  };

  const agents = useMemo(() => {
    const all = data?.agents ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(a => a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [data, search]);

  const totals = data?.totals;
  const periodLabel = (!from && !to) ? t('financials.period.all') : `${from} → ${to}`;

  if (loading && !data) return <LoadingState message={t('financials.loading')} />;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('financials.title')} subtitle={t('financials.subtitle')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(from, to, true)} tintColor={colors.primary} />}
      >
        {/* Period picker */}
        <TouchableOpacity style={styles.periodBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
          <Calendar size={16} color={colors.primary} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <Text style={styles.periodBtnLabel}>{t('financials.period.label')}</Text>
            <Text style={styles.periodBtnValue}>{periodLabel}</Text>
          </View>
          <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBanner}>
            <CircleAlert size={15} color={colors.danger} strokeWidth={2} />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {totals && (
          <View style={styles.totalRow}>
            <TotalCard Icon={CircleCheckBig} label={t('financials.totals.paid')}     value={formatEuros(totals.totalEarned)}  color={colors.success} />
            <TotalCard Icon={Clock}        label={t('financials.totals.pending')}   value={formatEuros(totals.totalPending)} color={colors.warning} />
            <TotalCard Icon={Users}        label={t('financials.totals.missions')}  value={String(totals.totalMissions)}     color={colors.primary} />
          </View>
        )}

        {(data?.agents?.length ?? 0) > 0 && (
          <View style={styles.searchWrap}>
            <Search size={15} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('financials.search.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={14} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {search
            ? t(agents.length === 1 ? 'financials.sections.byAgentWithResults_one' : 'financials.sections.byAgentWithResults_other', { count: agents.length })
            : t('financials.sections.byAgent')}
        </Text>

        {agents.length === 0 && !loading ? (
          <Card><Text style={styles.emptyText}>{search ? t('financials.empty.noResults') : t('financials.empty.noPayments')}</Text></Card>
        ) : (
          agents.map(agent => {
            const isExpanded = expandedId === agent.agentId;
            return (
              <Card key={agent.agentId} style={styles.agentCard}>
                <TouchableOpacity style={styles.agentHeader} onPress={() => setExpandedId(isExpanded ? null : agent.agentId)} activeOpacity={0.75}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agentName}>{agent.fullName}</Text>
                    <Text style={styles.agentEmail} numberOfLines={1}>{agent.email}</Text>
                  </View>
                  <View style={styles.agentAmounts}>
                    <Text style={[styles.agentEarned, { color: colors.success }]}>{formatEuros(agent.totalEarned)}</Text>
                    {agent.totalPending > 0 && (
                      <Text style={[styles.agentPending, { color: colors.warning }]}>
                        {t('financials.payout.pending', { amount: formatEuros(agent.totalPending) })}
                      </Text>
                    )}
                  </View>
                  {isExpanded ? <ChevronUp size={16} color={colors.textMuted} strokeWidth={2} /> : <ChevronDown size={16} color={colors.textMuted} strokeWidth={2} />}
                </TouchableOpacity>

                {isExpanded && (
                  <>
                    <Separator marginV={spacing[2]} />
                    <Text style={styles.payoutTitle}>
                      {t(agent.missions === 1 ? 'financials.payout.mission_one' : 'financials.payout.mission_other', { count: agent.missions })}
                    </Text>
                    {agent.payouts.map(p => (
                      <View key={p.id} style={styles.payoutRow}>
                        <View style={[styles.payoutDot, { backgroundColor: p.status === 'PAID' ? colors.success : p.status === 'FAILED' ? colors.danger : colors.warning }]} />
                        <View style={{ flex: 1 }}>
                          {p.mission && <Text style={styles.payoutMission} numberOfLines={1}>{p.mission.title} · {p.mission.city}</Text>}
                          <Text style={styles.payoutDate}>{formatDate(p.scheduledFor)}</Text>
                        </View>
                        <Text style={[styles.payoutAmount, { color: p.status === 'PAID' ? colors.success : p.status === 'FAILED' ? colors.danger : colors.warning }]}>
                          {formatEuros(p.amount)}
                        </Text>
                        <Text style={styles.payoutStatus}>
                          {p.status === 'PAID' ? t('financials.payout.status.paid') : p.status === 'FAILED' ? t('financials.payout.status.failed') : t('financials.payout.status.scheduled')}
                        </Text>
                      </View>
                    ))}
                    {agent.payouts.length === 0 && <Text style={styles.emptyText}>{t('financials.empty.noPaymentsForAgent')}</Text>}
                  </>
                )}
              </Card>
            );
          })
        )}

        <Card style={styles.pdfCard}>
          <View style={styles.pdfHeader}>
            <Download size={18} color={colors.primary} strokeWidth={1.8} />
            <Text style={styles.pdfTitle}>{t('financials.pdf.title')}</Text>
          </View>
          <Text style={styles.pdfSub}>{t('financials.pdf.subtitle')}</Text>
          <Button
            label={generating ? t('financials.pdf.generating') : t('financials.pdf.generate')}
            onPress={handleGeneratePdf}
            loading={generating}
            disabled={!from || !to}
            fullWidth size="md"
          />
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={showPicker} transparent animationType="fade">
        <View style={modalS.backdrop}>
          <View style={modalS.sheet}>
            <View style={modalS.header}>
              <Text style={modalS.title}>{t('financials.period.pickTitle')}</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {PRESETS.map(p => {
              const active = p.from === from && p.to === to;
              return (
                <TouchableOpacity key={p.label} style={[modalS.option, active && modalS.optionActive]} onPress={() => applyPreset(p)} activeOpacity={0.75}>
                  <Text style={[modalS.optionTxt, active && modalS.optionTxtActive]}>{p.label}</Text>
                  {active && <CircleCheckBig size={16} color={colors.primary} strokeWidth={2} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const modalS = StyleSheet.create({
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: colors.backgroundElevated, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing[6], paddingBottom: spacing[10], gap: spacing[2] },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] },
  title:          { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  option:         { paddingVertical: spacing[4], paddingHorizontal: spacing[3], borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionActive:   { backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary },
  optionTxt:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textSecondary },
  optionTxtActive:{ color: colors.primary },
});

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  periodBtn:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.primarySurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.borderPrimary },
  periodBtnLabel:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  periodBtnValue:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.primary },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], backgroundColor: colors.dangerSurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.danger + '55' },
  errorTxt:    { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger },
  totalRow: { flexDirection: 'row', gap: spacing[2] },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textPrimary, padding: 0 },
  sectionTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  agentCard:    { gap: spacing[2] },
  agentHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  agentName:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  agentEmail:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  agentAmounts: { alignItems: 'flex-end' },
  agentEarned:  { fontFamily: fontFamily.display, fontSize: fontSize.base, letterSpacing: -0.2 },
  agentPending: { fontFamily: fontFamily.body, fontSize: fontSize.xs },
  payoutTitle:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing[2] },
  payoutRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[1] },
  payoutDot:     { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  payoutMission: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textPrimary },
  payoutDate:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  payoutAmount:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  payoutStatus:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, width: 56, textAlign: 'right' },
  pdfCard:   { gap: spacing[3] },
  pdfHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  pdfTitle:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  pdfSub:    { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.6 },
  emptyText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing[4] },
});
