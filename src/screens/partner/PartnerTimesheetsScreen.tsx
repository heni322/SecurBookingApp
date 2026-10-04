/**
 * PartnerTimesheetsScreen — review and approve the hours of the company's
 * agents (audit 2026-09, C3). Backed by GET /employment/timesheets/review
 * (scoped server-side to the partner's company) and
 * PATCH /employment/timesheets/:id/status.
 *
 * Without objection, the API approves a timesheet 48 h after the end of the
 * shift unless an incident or a dispute is open; approval makes the
 * company's settlement for that shift payable.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CircleCheckBig, Clock, TriangleAlert, CircleAlert, CloudOff } from 'lucide-react-native';
import { usePartnerT } from './_partnerI18n';
import { timesheetsApi, type ReviewTimesheet } from '@api/endpoints/partner';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { LoadingState } from '@components/ui/LoadingState';
import { EmptyState } from '@components/ui/EmptyState';
import { showAlert } from '@components/ui/AlertModal';
import { confirm } from '@store/confirmDialogStore';
import { colors } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatDate } from '@utils/formatters';
import type { PartnerFinanceStackParamList } from '@models/index';

type Nav = NativeStackNavigationProp<PartnerFinanceStackParamList, 'PartnerTimesheets'>;
type Tab = 'PENDING' | 'PARTNER_APPROVED';

const hoursText = (n: number | string) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export const PartnerTimesheetsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = usePartnerT();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [rows, setRows] = useState<ReviewTimesheet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (which: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await timesheetsApi.review(which);
      const body = (res.data as any)?.data ?? res.data;
      setRows(Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('timesheets.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(tab); }, [load, tab]);

  const agentName = (r: ReviewTimesheet) =>
    [r.contract?.agent?.firstName, r.contract?.agent?.lastName].filter(Boolean).join(' ') || '—';

  const approve = async (r: ReviewTimesheet) => {
    const ok = await confirm({
      title: t('timesheets.confirmTitle'),
      message: t('timesheets.confirmBody', { agent: agentName(r), hours: hoursText(r.paidHours) }),
      confirmLabel: t('timesheets.approve'),
    });
    if (!ok) return;
    setBusyId(r.id);
    try {
      await timesheetsApi.approve(r.id);
      setRows(prev => (prev ?? []).filter(x => x.id !== r.id));
    } catch (err: any) {
      showAlert(t('timesheets.errors.approve'), err?.response?.data?.message ?? '');
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item: r }: { item: ReviewTimesheet }) => {
    const incidents = r.booking?.incidentReports?.length ?? 0;
    return (
      <Card style={s.card}>
        <View style={s.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.agent}>{agentName(r)}</Text>
            <Text style={s.mission} numberOfLines={1}>
              {r.booking?.mission?.title || r.booking?.mission?.city || '—'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.hours}>{t('timesheets.hours', { hours: hoursText(r.paidHours) })}</Text>
            <Text style={s.meta}>{t('timesheets.planned', { hours: hoursText(r.contract?.plannedHours ?? 0) })}</Text>
          </View>
        </View>
        <Text style={s.meta}>{formatDate(r.checkinAt)} · {new Date(r.checkinAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} → {new Date(r.checkoutAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
        {r.offlineCapture ? (
          <View style={s.flag}>
            <CloudOff size={14} color={colors.warning} strokeWidth={2} />
            <Text style={[s.flagTxt, { color: colors.warning }]}>{t('timesheets.offline')}</Text>
          </View>
        ) : null}
        {incidents > 0 ? (
          <View style={s.flag}>
            <TriangleAlert size={14} color={colors.warning} strokeWidth={2} />
            <Text style={[s.flagTxt, { color: colors.warning }]}>{t('timesheets.incidents', { count: incidents })}</Text>
          </View>
        ) : r.autoApproveAt && tab === 'PENDING' ? (
          <View style={s.flag}>
            <Clock size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={s.flagTxt}>{t('timesheets.autoOn', { date: formatDate(r.autoApproveAt) })}</Text>
          </View>
        ) : null}
        {tab === 'PENDING' ? (
          <Button
            label={t('timesheets.approve')}
            onPress={() => approve(r)}
            loading={busyId === r.id}
            disabled={busyId !== null}
            size="sm"
          />
        ) : (
          <View style={s.flag}>
            <CircleCheckBig size={14} color={colors.success} strokeWidth={2} />
            <Text style={[s.flagTxt, { color: colors.success }]}>{t('timesheets.approved')}</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={s.screen}>
      <ScreenHeader title={t('timesheets.title')} subtitle={t('timesheets.subtitle')} onBack={() => navigation.goBack()} />
      <View style={s.tabs}>
        {(['PENDING', 'PARTNER_APPROVED'] as Tab[]).map(k => (
          <TouchableOpacity key={k} style={[s.tab, tab === k && s.tabActive]} onPress={() => setTab(k)} activeOpacity={0.8}>
            <Text style={[s.tabTxt, tab === k && s.tabTxtActive]}>
              {k === 'PENDING' ? t('timesheets.tabs.pending') : t('timesheets.tabs.approved')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && (
        <View style={s.errorBanner}>
          <CircleAlert size={14} color={colors.danger} strokeWidth={2} />
          <Text style={s.errorTxt}>{error}</Text>
        </View>
      )}
      {loading && rows === null ? (
        <LoadingState message={t('timesheets.loading')} />
      ) : (
        <FlatList
          data={rows ?? []}
          keyExtractor={r => r.id}
          renderItem={renderItem}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(tab)} tintColor={colors.primary} />}
          ListHeaderComponent={<Text style={s.notice}>{t('timesheets.notice')}</Text>}
          ListEmptyComponent={<EmptyState title={t('timesheets.empty')} />}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[8], gap: spacing[3] },
  notice: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.5, marginBottom: spacing[2] },
  tabs: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[3] },
  tab: { flex: 1, paddingVertical: spacing[2], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primarySurface, borderColor: colors.borderPrimary },
  tabTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  tabTxtActive: { color: colors.primary },
  card: { gap: spacing[2] },
  rowTop: { flexDirection: 'row', gap: spacing[3] },
  agent: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.textPrimary },
  mission: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  hours: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary },
  meta: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  flag: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  flagTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  errorBanner: { flexDirection: 'row', gap: spacing[2], marginHorizontal: layout.screenPaddingH, backgroundColor: colors.dangerSurface, borderRadius: radius.lg, padding: spacing[3] },
  errorTxt: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger },
});
