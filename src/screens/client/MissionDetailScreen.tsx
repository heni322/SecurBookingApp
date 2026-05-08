/**
 * MissionDetailScreen — full mission view.
 *
 * FIX: "Obtenir un devis" CTA now calls POST /quotes/calculate inline before
 * navigating so QuoteDetailScreen always opens with a fresh quote rather than
 * hitting a dead-end 404 EmptyState.
 */
import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Calendar, Clock, MapPin, Radio, Banknote,
  CalendarDays, MessageSquare, FileText, Zap, Activity,
  Check, Hourglass, Users, PlayCircle, CheckCheck, XCircle,
} from 'lucide-react-native';
import { missionsApi }          from '@api/endpoints/missions';
import { quotesApi }            from '@api/endpoints/quotes';
import { useApi }               from '@hooks/useApi';
import { AgentApproachBanner }  from '@components/domain/AgentApproachBanner';
import { BookingCard }          from '@components/domain/BookingCard';
import { Button }               from '@components/ui/Button';
import { Card }                 from '@components/ui/Card';
import { LoadingState }         from '@components/ui/LoadingState';
import { MissionMapView }       from '@components/ui/MissionMapView';
import { ScreenHeader }         from '@components/ui/ScreenHeader';
import { colors, palette }      from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatMissionRange, formatCurrency, formatDate } from '@utils/formatters';
import { MISSION_STATUS_COLOR }  from '@utils/statusHelpers';
import { isCancellableMission }  from '@utils/typeGuards';
import { MissionStatus }         from '@constants/enums';
import type { MissionsNS }       from '@i18n/locales/types';
import type { MissionStackParamList, Booking } from '@models/index';
import { useTranslation }        from '@i18n';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { useToast } from '@hooks/useToast';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionDetail'>;
// Button.variant is 'filled'|'outline'|'ghost'|'danger' — no 'primary'
type Cta = { label: string; isLive?: boolean; disabled?: boolean; loading?: boolean; onPress: () => void };

const STATUS_I18N_KEY: Record<MissionStatus, keyof MissionsNS['statuses']> = {
  [MissionStatus.CREATED]:     'created',
  [MissionStatus.PUBLISHED]:   'published',
  [MissionStatus.STAFFING]:    'staffing',
  [MissionStatus.STAFFED]:     'staffed',
  [MissionStatus.IN_PROGRESS]: 'in_progress',
  [MissionStatus.COMPLETED]:   'completed',
  [MissionStatus.CANCELLED]:   'cancelled',
};

const JOURNEY_STEPS: Array<{
  status: MissionStatus;
  Icon:   React.FC<{ size: number; color: string; strokeWidth: number }>;
}> = [
  { status: MissionStatus.CREATED,     Icon: FileText   },
  { status: MissionStatus.PUBLISHED,   Icon: Hourglass  },
  { status: MissionStatus.STAFFED,     Icon: Users      },
  { status: MissionStatus.IN_PROGRESS, Icon: PlayCircle },
  { status: MissionStatus.COMPLETED,   Icon: CheckCheck },
];

const journeyIndex = (s: MissionStatus): number => {
  if (s === MissionStatus.STAFFING) return 1;
  if (s === MissionStatus.STAFFED)  return 2;
  return JOURNEY_STEPS.findIndex(step => step.status === s);
};

function startsInLabel(startAt: string | Date | undefined): string | null {
  if (!startAt) return null;
  const ms = new Date(startAt).getTime() - Date.now();
  if (ms <= 0 || ms > 1000 * 60 * 60 * 24 * 7) return null;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `Démarre dans ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Démarre dans ${hours}h${minutes % 60 ? ` ${minutes % 60}min` : ''}`;
  const days = Math.floor(hours / 24);
  return `Démarre dans ${days} jour${days > 1 ? 's' : ''}`;
}

/**
 * Build bookingLines for POST /quotes/calculate from existing mission bookings.
 * Groups non-cancelled bookings by serviceTypeId, counting agents per line.
 */
function buildBookingLines(bookings: Booking[]): Array<{
  serviceTypeId: string; agentCount: number; agentUniforms: string[];
}> {
  const active = bookings.filter(b =>
    b.serviceTypeId && !['CANCELLED', 'ABANDONED'].includes(b.status),
  );
  const map = new Map<string, { agentCount: number; agentUniforms: string[] }>();
  for (const b of active) {
    const id  = b.serviceTypeId!;
    const row = map.get(id) ?? { agentCount: 0, agentUniforms: [] };
    row.agentCount += 1;
    row.agentUniforms.push(b.uniform ?? 'STANDARD');
    map.set(id, row);
  }
  return Array.from(map.entries()).map(([serviceTypeId, v]) => ({
    serviceTypeId, agentCount: v.agentCount, agentUniforms: v.agentUniforms,
  }));
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const JourneyStepper: React.FC<{ status: MissionStatus }> = ({ status }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  if (status === MissionStatus.CANCELLED) {
    return (
      <View style={stepStyles.cancelledRow}>
        <XCircle size={16} color={colors.danger} strokeWidth={1.8} />
        <Text style={stepStyles.cancelledText}>Mission annulée</Text>
      </View>
    );
  }

  const current = journeyIndex(status);
  return (
    <View style={stepStyles.row}>
      {JOURNEY_STEPS.map((step, idx) => {
        const done   = idx < current;
        const active = idx === current;
        const color  = done || active ? palette.gold : colors.borderPrimary;
        const Icon   = step.Icon;
        return (
          <React.Fragment key={step.status}>
            <View style={[stepStyles.dot, { borderColor: color, backgroundColor: done ? palette.gold : active ? palette.panelSolid : 'transparent' }]}>
              {done   ? <Check size={9} color={palette.navy} strokeWidth={3} />
              : active ? <Animated.View style={[stepStyles.activeDot, { opacity: pulse.interpolate({ inputRange:[0,1], outputRange:[0.6,1] }) }]} />
              :           <Icon size={9} color={colors.textMuted} strokeWidth={1.8} />}
            </View>
            {idx < JOURNEY_STEPS.length - 1 && (
              <View style={[stepStyles.line, { backgroundColor: idx < current ? palette.gold : colors.borderPrimary }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const InfoChip: React.FC<{
  Icon: React.FC<{ size: number; color: string; strokeWidth: number }>;
  label: string; value: string; accent?: boolean;
}> = ({ Icon, label, value, accent }) => (
  <View style={[chipStyles.wrap, accent && chipStyles.wrapAccent]}>
    <Icon size={13} color={accent ? colors.primary : colors.textMuted} strokeWidth={1.8} />
    <View style={chipStyles.col}>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, accent && chipStyles.valueAccent]} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const SectionLabel: React.FC<{
  Icon?: React.FC<{ size: number; color: string; strokeWidth: number }>;
  text: string; count?: number; tone?: 'default' | 'info' | 'primary';
}> = ({ Icon, text, count, tone = 'default' }) => {
  const color = tone === 'info' ? colors.info : tone === 'primary' ? colors.primary : colors.textMuted;
  return (
    <View style={sectionStyles.row}>
      <View style={[sectionStyles.accent, { backgroundColor: color }]} />
      {Icon && <Icon size={13} color={color} strokeWidth={1.8} />}
      <Text style={[sectionStyles.text, { color }]}>{text}</Text>
      {typeof count === 'number' && (
        <View style={sectionStyles.countPill}><Text style={sectionStyles.countText}>{count}</Text></View>
      )}
    </View>
  );
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export const MissionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t }         = useTranslation('missions');
  const { t: tc }     = useTranslation('common');
  const toast         = useToast();
  const confirm       = useConfirmDialogStore((s) => s.confirm);
  const { missionId } = route.params;
  const { data: mission, loading, execute, error } = useApi(missionsApi.getById);
  const [gettingQuote, setGettingQuote] = useState(false);

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  const handleCancel = useCallback(async () => {
    const ok = await confirm({
      title: t('detail.cancel_title'), message: t('detail.cancel_body'),
      confirmLabel: t('detail.cancel_confirm'), cancelLabel: t('detail.cancel_back'),
      confirmStyle: 'destructive',
    });
    if (!ok) return;
    try {
      await missionsApi.cancel(missionId);
      load();
    } catch (e: unknown) {
      toast.error((e as any)?.response?.data?.message ?? t('detail.cancel_error'), { title: t('detail.cancel_title') });
    }
  }, [t, missionId, load, confirm, toast]);

  /**
   * FIX: "Obtenir un devis" CTA handler.
   *
   * Previously the CTA called navigation.navigate('QuoteDetail') directly.
   * QuoteDetailScreen immediately fetched GET /quotes/mission/:id — which
   * returned 404 because no quote existed yet — showing a dead-end EmptyState.
   *
   * Fix: call POST /quotes/calculate here first (building bookingLines from the
   * already-loaded mission.bookings), then navigate only on success.
   */
  const handleGetQuote = useCallback(async () => {
    if (!mission) return;
    setGettingQuote(true);
    try {
      const bookingLines = buildBookingLines(mission.bookings ?? []);
      if (bookingLines.length === 0) {
        toast.error(t('detail.error_load'), { title: tc('error') });
        return;
      }
      await quotesApi.calculate({ missionId, bookingLines });
      navigation.navigate('QuoteDetail', { missionId });
    } catch (err: unknown) {
      toast.error((err as any)?.response?.data?.message ?? t('detail.error_load'), { title: tc('error') });
    } finally {
      setGettingQuote(false);
    }
  }, [mission, missionId, navigation, t, tc, toast]);

  const statusLabel    = useMemo(() => mission ? t(`statuses.${STATUS_I18N_KEY[mission.status as MissionStatus]}`) : '', [mission, t]);
  const statusColor    = useMemo(() => mission ? (MISSION_STATUS_COLOR[mission.status] ?? colors.textMuted) : colors.textMuted, [mission]);
  const canCancel      = useMemo(() => mission ? isCancellableMission(mission) : false, [mission]);
  const hasQuote       = useMemo(() => Boolean(mission?.quote), [mission]);
  const bookings       = useMemo(() => mission?.bookings ?? [], [mission]);
  const displayTitle   = useMemo(() => mission?.title?.trim() || t('card_fallback_title', { city: mission?.city }), [mission, t]);
  const hasCoords      = useMemo(() =>
    typeof mission?.latitude  === 'number' && mission.latitude  !== 0 &&
    typeof mission?.longitude === 'number' && mission.longitude !== 0,
  [mission]);
  const approachBooking = useMemo(() =>
    bookings.find(b => (b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS') && b.agent),
  [bookings]);
  const showApproachBanner = useMemo(() =>
    approachBooking?.status === 'ASSIGNED' && hasCoords && approachBooking.agent != null,
  [approachBooking, hasCoords]);
  const startsIn       = useMemo(() => startsInLabel(mission?.startAt as any), [mission?.startAt]);
  const fullAddress    = useMemo(() => [mission?.address, mission?.city, mission?.zipCode].filter(Boolean).join(', '), [mission]);

  const cta = useMemo((): Cta | null => {
    if (!mission) return null;
    if (mission.status === MissionStatus.CREATED && !hasQuote)
      return { label: t('detail.cta_get_quote'), loading: gettingQuote, onPress: handleGetQuote };
    if (mission.status === MissionStatus.CREATED && hasQuote)
      return { label: t('detail.cta_see_quote'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };
    if (mission.status === MissionStatus.PUBLISHED)
      return { label: t('detail.cta_waiting'), onPress: () => {}, disabled: true };
    if (mission.status === MissionStatus.STAFFING) {
      const openBookings = bookings.filter(b => b.status === 'OPEN');
      if (openBookings.length > 0) {
        const target = openBookings.length === 1
          ? { screen: 'SelectAgent'   as const, params: { bookingId: openBookings[0].id } }
          : { screen: 'SelectCreneau' as const, params: { missionId } };
        return { label: t('detail.cta_select'), onPress: () => navigation.navigate(target.screen as any, target.params as any) };
      }
      return { label: t('detail.cta_assigning'), onPress: () => {}, disabled: true };
    }
    if (mission.status === MissionStatus.STAFFED)
      return { label: t('detail.cta_pay'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };
    if (mission.status === MissionStatus.IN_PROGRESS) {
      const liveBooking = bookings.find(b => b.status === 'IN_PROGRESS' && b.agent);
      if (liveBooking) return {
        label: t('detail.track'), isLive: true,
        onPress: () => navigation.navigate('LiveTracking', {
          missionId, bookingId: liveBooking.id,
          agentName: (liveBooking?.agent as any)?.fullName ?? 'Agent',
          missionAddress: mission?.address ?? mission?.city ?? '',
          siteLat: mission?.latitude as number, siteLng: mission?.longitude as number,
        }),
      };
    }
    if (mission.status === MissionStatus.COMPLETED)
      return { label: t('detail.cta_messaging'), onPress: () => navigation.navigate('Conversation', { missionId }) };
    return null;
  }, [mission, hasQuote, bookings, t, navigation, missionId, gettingQuote, handleGetQuote]);

  const goToLiveTracking = useCallback((b: typeof approachBooking) => {
    if (!b?.agent || !mission) return;
    navigation.navigate('LiveTracking', {
      missionId, bookingId: b.id,
      agentName: (b.agent as any).fullName ?? 'Agent',
      missionAddress: mission?.address ?? mission?.city ?? '',
      siteLat: mission?.latitude as number, siteLng: mission?.longitude as number,
    });
  }, [approachBooking, mission, missionId, navigation]);

  if (loading && !mission) return <LoadingState message={t('detail.loading')} />;

  if (error || !mission) return (
    <View style={styles.screen}>
      <ScreenHeader title={t('detail.screen_title')} onBack={() => navigation.goBack()} />
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>{t('detail.error_load')}</Text>
        <Button label={t('detail.retry')} onPress={load} variant="ghost" />
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('detail.screen_title')}
        onBack={() => navigation.goBack()}
        rightAction={
          [MissionStatus.PUBLISHED, MissionStatus.STAFFING, MissionStatus.STAFFED, MissionStatus.IN_PROGRESS]
            .includes(mission.status as any) ? (
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => navigation.navigate('Conversation', { missionId })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MessageSquare size={20} color={colors.primary} strokeWidth={1.8} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <JourneyStepper status={mission.status as MissionStatus} />

        <Card elevated style={styles.heroCard}>
          <View style={[styles.heroAccent, { backgroundColor: statusColor }]} />
          <View style={styles.heroContent}>
            <View style={styles.heroBadges}>
              <View style={[styles.statusPill, { backgroundColor: statusColor + '1F', borderColor: statusColor + '55' }]}>
                <View style={[styles.statusPillDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              {mission.isUrgent && (
                <View style={styles.urgencyBadge}>
                  <Zap size={11} color={colors.warning} strokeWidth={2.2} />
                  <Text style={styles.urgencyText}>{t('detail.badge_urgent')}</Text>
                </View>
              )}
              {approachBooking?.status === 'ASSIGNED' && (
                <View style={styles.approachBadge}>
                  <View style={styles.approachBadgeDot} />
                  <Text style={styles.approachBadgeText}>{t('detail.badge_approach')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{displayTitle}</Text>
            <View style={styles.heroMeta}>
              <MapPin size={13} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.heroMetaText} numberOfLines={1}>{mission.city}</Text>
            </View>
            {startsIn && (
              <View style={styles.startsInRow}>
                <Radio size={11} color={colors.primary} strokeWidth={2} />
                <Text style={styles.startsInText}>{startsIn}</Text>
              </View>
            )}
            {mission.quote && (
              <View style={styles.quoteSummaryRow}>
                <Banknote size={13} color={palette.gold} strokeWidth={1.8} />
                <Text style={styles.quoteSummaryText}>{formatCurrency(mission.quote.totalWithVat)} TTC</Text>
              </View>
            )}
          </View>
        </Card>

        {showApproachBanner && approachBooking?.agent && hasCoords && (
          <AgentApproachBanner
            missionId={missionId}
            bookingId={approachBooking.id}
            agent={{
              fullName:    (approachBooking.agent as any).fullName,
              avatarUrl:   (approachBooking.agent as any).avatarUrl,
              avgRating:   (approachBooking.agent as any).avgRating,
              isValidated: (approachBooking.agent as any).isValidated,
            }}
            siteLat={mission.latitude}
            siteLng={mission.longitude}
            onTrack={() => goToLiveTracking(approachBooking)}
          />
        )}

        {/*
          FIX: InfoChip labels use existing i18n keys:
          detail.date / detail.duration / detail.radius / detail.created_on
          (detail.chip_date etc. don't exist in MissionsNS)
        */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
          <InfoChip Icon={Calendar}     label={t('detail.date')}       value={formatMissionRange(mission.startAt, mission.endAt)} />
          <InfoChip Icon={Clock}        label={t('detail.duration')}   value={`${mission.durationHours}h`} />
          <InfoChip Icon={Activity}     label={t('detail.radius')}     value={`${mission.radiusKm} km`} />
          <InfoChip Icon={CalendarDays} label={t('detail.created_on')} value={formatDate(mission.createdAt)} />
        </ScrollView>

        <Card elevated style={styles.locationCard}>
          <SectionLabel Icon={MapPin} text={t('detail.section_location')} tone="info" />
          <Text style={styles.locationAddress}>{fullAddress}</Text>
          {hasCoords && (
            <View style={styles.mapWrap}>
              {/* FIX: MissionMapView has no `address` prop — pass as `title` */}
              <MissionMapView latitude={mission.latitude} longitude={mission.longitude} title={mission.address} />
            </View>
          )}
        </Card>

        {mission.notes?.trim() ? (
          <Card elevated style={styles.notesCard}>
            <SectionLabel Icon={FileText} text={t('detail.section_notes')} />
            <Text style={styles.notesText}>{mission.notes}</Text>
          </Card>
        ) : null}

        {bookings.length > 0 && (
          <View style={styles.bookingsSection}>
            <SectionLabel Icon={Users} text={t('detail.section_bookings')} count={bookings.length} tone="primary" />
            {bookings.map(b => (
              <BookingCard key={b.id} booking={b} onPress={() => navigation.navigate('BookingDetail', { bookingId: b.id })} />
            ))}
          </View>
        )}

        <View style={{ height: spacing[4] }} />
      </ScrollView>

      {cta && (
        <View style={styles.footer}>
          {/*
            FIX: Button variant 'primary' does not exist — use 'filled'.
            valid values: 'filled' | 'outline' | 'ghost' | 'danger'
          */}
          <Button
            label={cta.label}
            onPress={cta.onPress}
            disabled={cta.disabled || cta.loading}
            loading={cta.loading}
            fullWidth
            size="lg"
            variant={cta.isLive ? 'danger' : 'filled'}
          />
          {canCancel && (
            <TouchableOpacity onPress={handleCancel} style={styles.cancelLink} activeOpacity={0.7}>
              {/* FIX: 'detail.cancel_link' doesn't exist in MissionsNS — use 'detail.cancel' */}
              <Text style={styles.cancelLinkText}>{t('detail.cancel')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: colors.background },
  flex:              { flex: 1 },
  content:           { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[2], gap: spacing[4] },
  errorWrap:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  errorText:         { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  chatBtn:           { padding: spacing[2] },
  heroCard:          { overflow: 'hidden', padding: 0 },
  heroAccent:        { height: 3, width: '100%' },
  heroContent:       { padding: spacing[5], gap: spacing[3] },
  heroBadges:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  heroTitle:         { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.5 },
  heroMeta:          { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  heroMetaText:      { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  statusPill:        { flexDirection: 'row', alignItems: 'center', gap: spacing[1]+2, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1]+2, borderWidth: 1 },
  statusPillDot:     { width: 6, height: 6, borderRadius: 3 },
  statusPillText:    { fontFamily: fontFamily.bodyMedium, fontSize: 10, letterSpacing: 0.3 },
  urgencyBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warningSurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1]+2, borderWidth: 1, borderColor: colors.warning + '50' },
  urgencyText:       { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.warning, letterSpacing: 0.3 },
  approachBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.successSurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1]+2, borderWidth: 1, borderColor: colors.success + '40' },
  approachBadgeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  approachBadgeText: { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.success, letterSpacing: 0.3 },
  startsInRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  startsInText:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
  quoteSummaryRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  quoteSummaryText:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: palette.gold },
  chipsScroll:       { marginHorizontal: -layout.screenPaddingH },
  chipsRow:          { paddingHorizontal: layout.screenPaddingH, gap: spacing[3], flexDirection: 'row' },
  locationCard:      { gap: spacing[3] },
  locationAddress:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 21 },
  mapWrap:           { borderRadius: radius.lg, overflow: 'hidden', height: 160 },
  notesCard:         { gap: spacing[3] },
  notesText:         { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 22 },
  bookingsSection:   { gap: spacing[3] },
  footer:            { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[8], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: spacing[3] },
  cancelLink:        { alignItems: 'center', paddingVertical: spacing[1] },
  cancelLinkText:    { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
});

const stepStyles = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[2] },
  dot:          { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  activeDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.gold },
  line:         { flex: 1, height: 1.5, marginHorizontal: 2 },
  cancelledRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[2] },
  cancelledText:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.danger },
});

const chipStyles = StyleSheet.create({
  wrap:        { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[3], flexDirection: 'row', alignItems: 'center', gap: spacing[2], borderWidth: 1, borderColor: colors.border },
  wrapAccent:  { borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface },
  col:         { gap: 2 },
  label:       { fontFamily: fontFamily.body, fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  value:       { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  valueAccent: { color: colors.primary },
});

const sectionStyles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  accent:    { width: 3, height: 14, borderRadius: 2 },
  text:      { fontFamily: fontFamily.bodyMedium, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  countPill: { backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing[2], paddingVertical: 2, borderWidth: 1, borderColor: colors.border },
  countText: { fontFamily: fontFamily.monoMedium, fontSize: 10, color: colors.textSecondary },
});
