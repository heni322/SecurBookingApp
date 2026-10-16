/**
 * PartnerMissionDetailScreen — one mission the partner ordered, read-only.
 *
 * Added 2026-10-07 (P1 of the partner roadmap). The missions list only gave a
 * filled/total count; a partner could not see which post was filled by whom,
 * whether the agent had arrived, or whether an incident was reported. The
 * client's MissionDetailScreen could not be reused: its actions open
 * client-only screens (quote, live tracking, chat) absent from this stack.
 *
 * GET /missions/get/:id — ownership enforced by the API (another company's
 * mission answers 404). Times are Paris time, like everywhere in the app.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MapPin, CalendarClock, Receipt, UserRound, UserX, LogIn, LogOut, TriangleAlert, XCircle,
} from 'lucide-react-native';
import i18n from '@i18n';
import { usePartnerT } from './_partnerI18n';
import { statusBadge } from './PartnerMissionsScreen';
import { missionsApi } from '@api/endpoints/missions';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Card }         from '@components/ui/Card';
import { Badge }        from '@components/ui/Badge';
import { EmptyState }   from '@components/ui/EmptyState';
import { colors, palette } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDate, formatTime, formatEuros } from '@utils/formatters';
import type { PartnerStackParamList } from '@models/index';

type Props = NativeStackScreenProps<PartnerStackParamList, 'PartnerMissionDetail'>;

interface PostRow {
  id: string;
  status: string;
  slotId: string | null;
  serviceType?: { name?: string } | null;
  agent?: { fullName?: string | null } | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  incidents?: unknown[];
  incidentReports?: unknown[];
}

const BOOKING_COLOR: Record<string, { color: string; bg: string }> = {
  OPEN:        { color: colors.warning, bg: colors.warningSurface },
  ASSIGNED:    { color: colors.info,    bg: colors.infoSurface },
  IN_PROGRESS: { color: colors.primary, bg: colors.primarySurface },
  COMPLETED:   { color: colors.success, bg: colors.successSurface },
  CANCELLED:   { color: colors.danger,  bg: colors.dangerSurface },
  ABANDONED:   { color: colors.danger,  bg: colors.dangerSurface },
};

export const PartnerMissionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId } = route.params;
  const { t } = usePartnerT();

  const [mission,    setMission]    = useState<any | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(false);
    try {
      const { data: res } = await missionsApi.getById(missionId);
      setMission((res as any)?.data ?? res);
    } catch {
      setError(true);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [missionId]);

  // Check-ins and staffing move while the partner is elsewhere.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  /** Posts grouped by slot, slots in time order. */
  const groups = useMemo(() => {
    if (!mission) return [];
    const slots = [...(mission.slots ?? [])].sort(
      (a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const posts: PostRow[] = (mission.bookings ?? []).filter((b: PostRow) => b.status !== 'CANCELLED');
    if (slots.length === 0) return [{ slot: null as any, posts }];
    return slots.map((s: any) => ({ slot: s, posts: posts.filter(p => p.slotId === s.id) }))
      .filter(g => g.posts.length > 0);
  }, [mission]);

  if (loading && !mission) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('missionDetail.title')} onBack={() => navigation.goBack()} showBack />
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      </View>
    );
  }

  if (error && !mission) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('missionDetail.title')} onBack={() => navigation.goBack()} showBack />
        <View style={styles.emptyWrap}>
          <EmptyState Icon={XCircle} title={t('missionDetail.errorTitle')} subtitle={t('missionDetail.errorBody')}
            actionLabel={t('missionDetail.retry')} onAction={() => load()} />
        </View>
      </View>
    );
  }

  const m = mission;
  const paymentStatus: string = m.payment?.status ?? 'none';
  const paymentColor = paymentStatus === 'PAID' ? colors.success
    : paymentStatus === 'FAILED' ? colors.danger
    : paymentStatus === 'none' ? colors.textMuted : colors.warning;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={m.title || m.city || t('missionDetail.title')} onBack={() => navigation.goBack()} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {/* Summary */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <Badge label={t(`missionsList.status.${m.status}`, { defaultValue: String(m.status) })} {...statusBadge(m.status)} />
            <Text style={styles.note}>{t('missionDetail.timesNote')}</Text>
          </View>
          <View style={styles.meta}>
            <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaTxt}>{[m.address, [m.zipCode, m.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</Text>
          </View>
          {m.startAt ? (
            <View style={styles.meta}>
              <CalendarClock size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.metaTxt}>{`${formatDate(m.startAt)} · ${formatTime(m.startAt)}${m.endAt ? ` → ${formatDate(m.endAt) === formatDate(m.startAt) ? '' : `${formatDate(m.endAt)} · `}${formatTime(m.endAt)}` : ''}`}</Text>
            </View>
          ) : null}
        </Card>

        {/* Payment */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.meta}>
              <Receipt size={15} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>{t('missionDetail.paymentTitle')}</Text>
            </View>
            {m.quote?.totalWithVat != null && (
              <Text style={styles.amount}>{formatEuros(Number(m.quote.totalWithVat))}</Text>
            )}
          </View>
          <Text style={[styles.metaTxt, { color: paymentColor }]}>
            {t(`missionDetail.payment.${paymentStatus}`, { defaultValue: paymentStatus })}
          </Text>
          {m.status === 'CREATED' && (
            <TouchableOpacity
              style={styles.fundBtn}
              onPress={() => navigation.navigate('PartnerMissionFunding', { missionId: m.id, bookingLines: [] })}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={styles.fundTxt}>
                {paymentStatus === 'PENDING' ? t('missionsList.transferPending') : t('missionsList.fundAction')}
              </Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Posts, per slot */}
        <Text style={styles.sectionLabel}>{t('missionDetail.posts')}</Text>
        {groups.map((g: any, gi: number) => (
          <Card key={g.slot?.id ?? `g${gi}`} style={styles.card}>
            {g.slot && (
              <Text style={styles.slotTitle}>
                {`${t('missionDetail.slotLabel', { n: gi + 1 })} · ${formatDate(g.slot.startAt)} · ${formatTime(g.slot.startAt)}–${formatTime(g.slot.endAt)}`}
              </Text>
            )}
            {g.posts.map((p: PostRow, pi: number) => {
              const incidents = (p.incidents?.length ?? 0) + (p.incidentReports?.length ?? 0);
              const badge = BOOKING_COLOR[p.status] ?? BOOKING_COLOR.OPEN;
              const name = p.agent?.fullName?.trim();
              return (
                <View key={p.id} style={[styles.post, pi > 0 && styles.postSep]}>
                  <View style={styles.rowBetween}>
                    <View style={[styles.meta, { flex: 1 }]}>
                      {name
                        ? <UserRound size={15} color={colors.textPrimary} strokeWidth={2} />
                        : <UserX size={15} color={colors.warning} strokeWidth={2} />}
                      <Text style={[styles.agent, !name && { color: colors.warning }]} numberOfLines={1}>
                        {name || t('missionDetail.open')}
                      </Text>
                    </View>
                    <Badge
                      label={i18n.t(`booking:statuses.${p.status.toLowerCase()}`, { defaultValue: p.status })}
                      color={badge.color} bg={badge.bg}
                    />
                  </View>
                  {p.serviceType?.name ? <Text style={styles.service}>{p.serviceType.name}</Text> : null}
                  {(p.checkinAt || p.checkoutAt) && (
                    <View style={styles.checkRow}>
                      {p.checkinAt && (
                        <View style={styles.meta}>
                          <LogIn size={13} color={colors.success} strokeWidth={2} />
                          <Text style={styles.checkTxt}>{t('missionDetail.checkin', { time: formatTime(p.checkinAt) })}</Text>
                        </View>
                      )}
                      {p.checkoutAt && (
                        <View style={styles.meta}>
                          <LogOut size={13} color={colors.textSecondary} strokeWidth={2} />
                          <Text style={styles.checkTxt}>{t('missionDetail.checkout', { time: formatTime(p.checkoutAt) })}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {incidents > 0 && (
                    <View style={styles.meta}>
                      <TriangleAlert size={13} color={colors.danger} strokeWidth={2} />
                      <Text style={[styles.checkTxt, { color: colors.danger }]}>{t('missionDetail.incidents', { count: incidents })}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        ))}
        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: layout.screenPaddingH },
  content:   { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], gap: spacing[3] },
  card:      { gap: spacing[2] },
  rowBetween:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  meta:      { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  metaTxt:   { flexShrink: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  note:      { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  sectionTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  sectionLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing[2] },
  amount:    { fontFamily: fontFamily.display, fontSize: fontSize.base, color: palette.gold },
  fundBtn:   { minHeight: 44, borderRadius: radius.md, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center', marginTop: spacing[1] },
  fundTxt:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: palette.navy },
  slotTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  post:      { gap: spacing[1] + 2, paddingVertical: spacing[2] },
  postSep:   { borderTopWidth: 1, borderTopColor: colors.border },
  agent:     { flexShrink: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  service:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  checkRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  checkTxt:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
});
