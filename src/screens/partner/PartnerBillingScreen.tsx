/**
 * PartnerBillingScreen — PDF récapitulatif salaires équipe (spec §2.3).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePartnerT } from './_partnerI18n';
import {
  Download, Calendar, CircleCheckBig, Clock,
  Users, FileText, X, CircleAlert, ChevronDown,
} from 'lucide-react-native';
import { partnerApi }   from '@api/endpoints/partner';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Button }       from '@components/ui/Button';
import { LoadingState } from '@components/ui/LoadingState';
import { showAlert }    from '@components/ui/AlertModal';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatEuros } from '@utils/formatters';
import type { PartnerBillingBreakdown, PartnerFinanceStackParamList } from '@models/index';

// PartnerBillingScreen lives in PartnerFinanceStackNavigator (Finance tab).
type Nav = NativeStackNavigationProp<PartnerFinanceStackParamList, 'PartnerBilling'>;

const y = new Date().getFullYear();

interface Preset { label: string; from: string; to: string }

function buildPresets(t: any): Preset[] {
  return [
    { label: `T1 ${y}`,                              from: `${y}-01-01`,   to: `${y}-03-31` },
    { label: `T2 ${y}`,                              from: `${y}-04-01`,   to: `${y}-06-30` },
    { label: `T3 ${y}`,                              from: `${y}-07-01`,   to: `${y}-09-30` },
    { label: `T4 ${y}`,                              from: `${y}-10-01`,   to: `${y}-12-31` },
    { label: t('financials.period.year', { year: y   }), from: `${y}-01-01`,   to: `${y}-12-31` },
    { label: t('financials.period.year', { year: y-1 }), from: `${y-1}-01-01`, to: `${y-1}-12-31` },
  ];
}

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

const StatRow: React.FC<{ Icon: LucideIcon; label: string; value: string; color: string }> = ({ Icon, label, value, color }) => (
  <View style={s.statRow}>
    <View style={[s.statIcon, { backgroundColor: color + '18' }]}>
      <Icon size={16} color={color} strokeWidth={1.8} />
    </View>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={[s.statValue, { color }]}>{value}</Text>
  </View>
);

export const PartnerBillingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = usePartnerT();
  const PRESETS    = buildPresets(t);

  const [from,        setFrom]        = useState(`${y}-01-01`);
  const [to,          setTo]          = useState(`${y}-12-31`);
  const [loading,     setLoading]     = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const [preview,     setPreview]     = useState<PartnerBillingBreakdown | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const loadPreview = useCallback(async (f: string, t2: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await partnerApi.getBillingBreakdown(f, t2);
      setPreview((res.data as any)?.data ?? res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('billing.errors.load'));
    } finally { setLoading(false); }
  }, [t]);

  // Load the default (current-year) preview on mount - previously the card
  // stayed empty until the user tapped a preset.
  useEffect(() => {
    loadPreview(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only initial load
  }, []);

  const applyPreset = (p: Preset) => {
    setFrom(p.from); setTo(p.to);
    setShowPicker(false);
    loadPreview(p.from, p.to);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await partnerApi.generateInvoice(from, to);
      const url = (res.data as any)?.data?.url ?? (res.data as any)?.url ?? (res.data as any)?.data?.pdfUrl ?? (res.data as any)?.pdfUrl;
      if (url) {
        await Linking.openURL(url).catch(() => showAlert(t('billing.alerts.generated'), t('billing.alerts.cannotOpen')));
      } else {
        showAlert(t('billing.alerts.generated'), t('billing.alerts.generatedBody'));
      }
    } catch (err: any) {
      showAlert(t('billing.alerts.error'), err?.response?.data?.message ?? t('billing.alerts.errorBody'));
    } finally { setGenerating(false); }
  };

  const totals = preview?.totals;

  return (
    <View style={s.screen}>
      <ScreenHeader title={t('billing.title')} subtitle={t('billing.subtitle')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Notice */}
        <View style={s.noticeBanner}>
          <FileText size={15} color={colors.primary} strokeWidth={2} />
          <Text style={s.noticeTxt}>{t('billing.notice')}</Text>
        </View>

        {/* Period */}
        <Text style={s.sectionLabel}>{t('billing.steps.period')}</Text>
        <TouchableOpacity style={s.periodBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
          <Calendar size={16} color={colors.primary} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <Text style={s.periodBtnSub}>{t('billing.period.label')}</Text>
            <Text style={s.periodBtnVal}>{from} → {to}</Text>
          </View>
          <ChevronDown size={15} color={colors.textMuted} strokeWidth={2} />
        </TouchableOpacity>

        {error && (
          <View style={s.errorBanner}>
            <CircleAlert size={14} color={colors.danger} strokeWidth={2} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        )}

        {/* Preview */}
        <Text style={s.sectionLabel}>{t('billing.steps.preview')}</Text>
        {loading ? (
          <Card><LoadingState message={t('billing.preview.loading')} /></Card>
        ) : preview ? (
          <Card style={s.previewCard}>
            <StatRow Icon={CircleCheckBig} label={t('billing.preview.totalPaid')} value={formatEuros(totals?.totalEarned ?? 0)}  color={colors.success} />
            <View style={s.divider} />
            <StatRow Icon={Clock}        label={t('billing.preview.pending')}   value={formatEuros(totals?.totalPending ?? 0)} color={colors.warning} />
            <View style={s.divider} />
            <StatRow Icon={Users}        label={t('billing.preview.missions')}  value={String(totals?.totalMissions ?? 0)}     color={colors.primary} />
            <View style={s.divider} />
            <StatRow Icon={FileText}     label={t('billing.preview.agents')}    value={String(preview.agents.length)}          color={colors.textSecondary} />
          </Card>
        ) : (
          <Card><Text style={s.emptyTxt}>{t('billing.preview.empty')}</Text></Card>
        )}

        {/* Generate */}
        <Text style={s.sectionLabel}>{t('billing.steps.generate')}</Text>
        <Card style={s.generateCard}>
          <View style={s.generateHeader}>
            <Download size={20} color={colors.primary} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={s.generateTitle}>{t('billing.generate.title')}</Text>
              <Text style={s.generateSub}>{t('billing.generate.subtitle')}</Text>
            </View>
          </View>
          <Button
            label={generating ? t('billing.generate.loading') : t('billing.generate.cta')}
            onPress={handleGenerate}
            loading={generating}
            disabled={!from || !to}
            fullWidth size="lg"
          />
          {(!from || !to) && <Text style={s.disabledHint}>{t('billing.generate.disabledHint')}</Text>}
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={m.backdrop}>
          <View style={m.sheet}>
            <View style={m.header}>
              <Text style={m.title}>{t('billing.period.pickTitle')}</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {PRESETS.map(p => {
              const active = p.from === from && p.to === to;
              return (
                <TouchableOpacity key={p.label} style={[m.option, active && m.optionActive]} onPress={() => applyPreset(p)} activeOpacity={0.75}>
                  <Text style={[m.optionTxt, active && m.optionTxtActive]}>{p.label}</Text>
                  <Text style={m.optionRange}>{p.from} → {p.to}</Text>
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

const m = StyleSheet.create({
  backdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: colors.backgroundElevated, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing[6], paddingBottom: spacing[10], gap: spacing[1] },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] },
  title:          { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  option:         { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3], paddingHorizontal: spacing[3], borderRadius: radius.lg },
  optionActive:   { backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary },
  optionTxt:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textSecondary, flex: 1 },
  optionTxtActive:{ color: colors.primary },
  optionRange:    { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textMuted },
});

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  noticeBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], backgroundColor: colors.primarySurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.borderPrimary },
  noticeTxt:    { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.primaryLight, lineHeight: fontSize.sm * 1.6 },
  sectionLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  periodBtn:    { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  periodBtnSub: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  periodBtnVal: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  errorBanner:  { flexDirection: 'row', gap: spacing[2], backgroundColor: colors.dangerSurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.danger + '55' },
  errorTxt:     { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger },
  previewCard:  { gap: 0 },
  statRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3] },
  statIcon:     { width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  statLabel:    { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  statValue:    { fontFamily: fontFamily.display, fontSize: fontSize.lg, letterSpacing: -0.3 },
  divider:      { height: 1, backgroundColor: colors.border, marginHorizontal: spacing[2] },
  generateCard:   { gap: spacing[3] },
  generateHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  generateTitle:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  generateSub:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.6, marginTop: 2 },
  disabledHint:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  emptyTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing[4] },
});
