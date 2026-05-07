/**
 * MissionDetailScreen — full mission view, redesigned for clarity and hierarchy.
 *
 * Information architecture (top → bottom):
 *   1. Header (back, chat shortcut)
 *   2. Status journey stepper      — where am I in the mission lifecycle
 *   3. Hero card                   — title, city, range, quote total (if any)
 *   4. Approach banner             — when an agent is en route (priority slot)
 *   5. Quick stats chips           — duration · radius · created
 *   6. Location card               — full address + static map
 *   7. Notes card                  — optional client instructions
 *   8. Bookings list               — staffed positions
 *   9. Sticky footer CTA           — primary action + subtle cancel link
 */
import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Alert, StyleSheet, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Calendar, Clock, MapPin, Radio, Banknote,
  CalendarDays, MessageSquare, FileText, ChevronRight, Zap, Activity,
  Check, Hourglass, Users, PlayCircle, CheckCheck, XCircle,
} from 'lucide-react-native';
import { missionsApi }          from '@api/endpoints/missions';
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
import type { MissionStackParamList } from '@models/index';
import { useTranslation }        from '@i18n';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionDetail'>;
type Cta   = { label: string; isLive?: boolean; disabled?: boolean; onPress: () => void };

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_I18N_KEY: Record<MissionStatus, keyof MissionsNS['statuses']> = {
  [MissionStatus.CREATED]:     'created',
  [MissionStatus.PUBLISHED]:   'published',
  [MissionStatus.STAFFING]:    'staffing',
  [MissionStatus.STAFFED]:     'staffed',
  [MissionStatus.IN_PROGRESS]: 'in_progress',
  [MissionStatus.COMPLETED]:   'completed',
  [MissionStatus.CANCELLED]:   'cancelled',
};

/** Lifecycle steps shown in the journey stepper (cancelled is excluded — handled separately). */
const JOURNEY_STEPS: Array<{
  status: MissionStatus;
  Icon:   React.FC<{ size: number; color: string; strokeWidth: number }>;
}> = [
  { status: MissionStatus.CREATED,     Icon: FileText  },
  { status: MissionStatus.PUBLISHED,   Icon: Hourglass },
  { status: MissionStatus.STAFFED,     Icon: Users     },
  { status: MissionStatus.IN_PROGRESS, Icon: PlayCircle },
  { status: MissionStatus.COMPLETED,   Icon: CheckCheck },
];

/** STAFFING is a sub-state of PUBLISHED for the stepper visualisation. */
const journeyIndex = (s: MissionStatus): number => {
  if (s === MissionStatus.STAFFING) return 1; // counts as PUBLISHED step
  if (s === MissionStatus.STAFFED)  return 2;
  return JOURNEY_STEPS.findIndex(step => step.status === s);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a short "starts in X" string when the mission is upcoming, or
 * null when not relevant.
 */
function startsInLabel(startAt: string | Date | undefined): string | null {
  if (!startAt) return null;
  const ms = new Date(startAt).getTime() - Date.now();
  if (ms <= 0 || ms > 1000 * 60 * 60 * 24 * 7) return null; // future, but within 7 days
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `Démarre dans ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Démarre dans ${hours}h${minutes % 60 ? ` ${minutes % 60}min` : ''}`;
  const days = Math.floor(hours / 24);
  return `Démarre dans ${days} jour${days > 1 ? 's' : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Horizontal status stepper. Each step has 3 visual states:
 *   - completed (filled gold dot, gold connector behind)
 *   - active    (gold ring, larger, gentle pulse)
 *   - upcoming  (muted dot, dotted connector)
 */
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

  const ringScale   = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  if (status === MissionStatus.CANCELLED) {
    // Cancelled gets its own treatment — no stepper, just a banner.
    return (
      <View style={stepStyles.cancelledBanner}>
        <XCircle size={16} color={colors.danger} strokeWidth={2} />
        <Text style={stepStyles.cancelledText}>Mission annulée</Text>
      </View>
    );
  }

  const activeIdx = journeyIndex(status);

  return (
    <View style={stepStyles.wrap}>
      {JOURNEY_STEPS.map((step, idx) => {
        const isActive    = idx === activeIdx;
        const isCompleted = idx < activeIdx;
        const isUpcoming  = idx > activeIdx;
        const Icon        = step.Icon;

        return (
          <React.Fragment key={step.status}>
            <View style={stepStyles.step}>
              <View
                style={[
                  stepStyles.dot,
                  isActive    && stepStyles.dotActive,
                  isCompleted && stepStyles.dotCompleted,
                  isUpcoming  && stepStyles.dotUpcoming,
                ]}
              >
                {isActive && (
                  <Animated.View
                    style={[
                      stepStyles.activeRing,
                      { transform: [{ scale: ringScale }], opacity: ringOpacity },
                    ]}
                  />
                )}
                {isCompleted
                  ? <Check size={11} color={palette.bg} strokeWidth={3.5} />
                  : <Icon size={12} color={isActive ? colors.primary : colors.textMuted} strokeWidth={2} />
                }
              </View>
            </View>
            {idx < JOURNEY_STEPS.length - 1 && (
              <View
                style={[
                  stepStyles.connector,
                  idx < activeIdx ? stepStyles.connectorDone : stepStyles.connectorPending,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

/**
 * Live tracking CTA — pulsing dot + "Track now" label.
 * Uses the vivid `dangerDot` token (post-palette-refactor) so the button
 * stays bright red instead of translucent.
 */
const LiveButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.7, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <TouchableOpacity style={liveStyles.btn} onPress={onPress} activeOpacity={0.85}>
      <View style={liveStyles.dotWrap}>
        <Animated.View style={[liveStyles.ring, { transform: [{ scale: pulse }] }]} />
        <View style={liveStyles.core} />
      </View>
      <Activity size={16} color={palette.white} strokeWidth={2.2} />
      <Text style={liveStyles.text}>{label}</Text>
      <ChevronRight size={18} color={palette.white} strokeWidth={2.2} />
    </TouchableOpacity>
  );
};

/**
 * Compact horizontal info chip — replaces the 2x2 grid that wrapped awkwardly.
 */
const InfoChip: React.FC<{
  Icon:   React.FC<{ size: number; color: string; strokeWidth: number }>;
  label:  string;
  value:  string;
  accent?: boolean;
}> = ({ Icon, label, value, accent }) => (
  <View style={[chipStyles.wrap, accent && chipStyles.wrapAccent]}>
    <Icon size={13} color={accent ? colors.primary : colors.textMuted} strokeWidth={1.8} />
    <View style={chipStyles.col}>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, accent && chipStyles.valueAccent]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

const SectionLabel: React.FC<{
  Icon?:  React.FC<{ size: number; color: string; strokeWidth: number }>;
  text:   string;
  count?: number;
  tone?:  'default' | 'info' | 'primary';
}> = ({ Icon, text, count, tone = 'default' }) => {
  const color =
    tone === 'info'    ? colors.info
    : tone === 'primary' ? colors.primary
    : colors.textMuted;
  return (
    <View style={sectionStyles.row}>
      <View style={[sectionStyles.accent, { backgroundColor: color }]} />
      {Icon && <Icon size={13} color={color} strokeWidth={1.8} />}
      <Text style={[sectionStyles.text, { color }]}>{text}</Text>
      {typeof count === 'number' && (
        <View style={sectionStyles.countPill}>
          <Text style={sectionStyles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export const MissionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t }         = useTranslation('missions');
  const { missionId } = route.params;
  const { data: mission, loading, execute, error } = useApi(missionsApi.getById);

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  const handleCancel = useCallback(() => {
    Alert.alert(t('detail.cancel_title'), t('detail.cancel_body'), [
      { text: t('detail.cancel_back'), style: 'cancel' },
      {
        text: t('detail.cancel_confirm'), style: 'destructive',
        onPress: async () => {
          try {
            await missionsApi.cancel(missionId);
            load();
          } catch (e: unknown) {
            Alert.alert(
              t('detail.cancel_title'),
              (e as any)?.response?.data?.message ?? t('detail.cancel_error'),
            );
          }
        },
      },
    ]);
  }, [t, missionId, load]);

  // ── Derived values ────────────────────────────────────────────────────────
  // NOTE: ALL hooks must be called unconditionally before any early returns.

  const statusLabel = useMemo(
    () => mission ? t(`statuses.${STATUS_I18N_KEY[mission.status as MissionStatus]}`) : '',
    [mission, t],
  );

  const statusColor = useMemo(
    () => mission ? (MISSION_STATUS_COLOR[mission.status] ?? colors.textMuted) : colors.textMuted,
    [mission],
  );

  const canCancel = useMemo(() => mission ? isCancellableMission(mission) : false, [mission]);
  const hasQuote  = useMemo(() => Boolean(mission?.quote), [mission]);
  const bookings  = useMemo(() => mission?.bookings ?? [], [mission]);

  const displayTitle = useMemo(
    () => mission?.title?.trim() || t('card_fallback_title', { city: mission?.city }),
    [mission, t],
  );

  const hasCoords = useMemo(
    () =>
      typeof mission?.latitude  === 'number' && mission.latitude  !== 0 &&
      typeof mission?.longitude === 'number' && mission.longitude !== 0,
    [mission],
  );

  const approachBooking = useMemo(
    () => bookings.find(b => (b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS') && b.agent),
    [bookings],
  );

  const showApproachBanner = useMemo(
    () => approachBooking?.status === 'ASSIGNED' && hasCoords && approachBooking.agent != null,
    [approachBooking, hasCoords],
  );

  const startsIn = useMemo(
    () => startsInLabel(mission?.startAt as any),
    [mission?.startAt],
  );

  const fullAddress = useMemo(
    () => [mission?.address, mission?.city, mission?.zipCode].filter(Boolean).join(', '),
    [mission],
  );

  // ── CTA logic ─────────────────────────────────────────────────────────────
  const cta = useMemo((): Cta | null => {
    if (!mission) return null;

    if (mission.status === MissionStatus.CREATED && !hasQuote)
      return { label: t('detail.cta_get_quote'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };

    if (mission.status === MissionStatus.CREATED && hasQuote)
      return { label: t('detail.cta_see_quote'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };

    if (mission.status === MissionStatus.PUBLISHED)
      return { label: t('detail.cta_waiting'), onPress: () => {}, disabled: true };

    if (mission.status === MissionStatus.STAFFING) {
      const openBookings = bookings.filter(b => b.status === 'OPEN');
      if (openBookings.length > 0) {
        const target = openBookings.length === 1
          ? { screen: 'SelectAgent' as const,    params: { bookingId: openBookings[0].id } }
          : { screen: 'SelectCreneau' as const,  params: { missionId } };
        return {
          label:   t('detail.cta_select'),
          onPress: () => navigation.navigate(target.screen as any, target.params as any),
        };
      }
      return { label: t('detail.cta_assigning'), onPress: () => {}, disabled: true };
    }

    if (mission.status === MissionStatus.STAFFED)
      return { label: t('detail.cta_pay'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };

    if (mission.status === MissionStatus.IN_PROGRESS) {
      const liveBooking = bookings.find(b => b.status === 'IN_PROGRESS' && b.agent);
      if (liveBooking) return {
        label:   t('detail.track'),
        isLive:  true,
        onPress: () => navigation.navigate('LiveTracking', {
          missionId,
          bookingId:      liveBooking.id,
          agentName:      (liveBooking?.agent as any)?.fullName ?? 'Agent',
          missionAddress: mission?.address ?? mission?.city ?? '',
          siteLat:        mission?.latitude  as number,
          siteLng:        mission?.longitude as number,
        }),
      };
    }

    if (mission.status === MissionStatus.COMPLETED)
      return { label: t('detail.cta_messaging'), onPress: () => navigation.navigate('Conversation', { missionId }) };

    return null;
  }, [mission, hasQuote, bookings, t, navigation, missionId]);

  const goToLiveTracking = useCallback((b: typeof approachBooking) => {
    if (!b?.agent || !mission) return;
    navigation.navigate('LiveTracking', {
      missionId,
      bookingId:      b.id,
      agentName:      (b.agent as any).fullName ?? 'Agent',
      missionAddress: mission?.address ?? mission?.city ?? '',
      siteLat:        mission?.latitude  as number,
      siteLng:        mission?.longitude as number,
    });
  }, [approachBooking, mission, missionId, navigation]);

  // ── Early returns — AFTER all hooks ───────────────────────────────────────

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

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
        }
      >
        {/* ── 1. Journey stepper ────────────────────────────────────────── */}
        <JourneyStepper status={mission.status as MissionStatus} />

        {/* ── 2. Hero card — title, place, quote total ──────────────────── */}
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

              {mission.status === MissionStatus.IN_PROGRESS && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveBadgeDot} />
                  <Text style={styles.liveBadgeText}>{t('detail.badge_live')}</Text>
                </View>
              )}
            </View>

            <Text style={styles.title} numberOfLines={2}>{displayTitle}</Text>

            <View style={styles.metaRow}>
              <MapPin size={14} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.metaText} numberOfLines={1}>{mission.city}</Text>
              <Text style={styles.metaSep}>·</Text>
              <Calendar size={14} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.metaText} numberOfLines={1}>
                {formatMissionRange(mission.startAt, mission.endAt)}
              </Text>
            </View>

            {startsIn && (
              <View style={styles.countdownPill}>
                <Clock size={12} color={colors.info} strokeWidth={2} />
                <Text style={styles.countdownText}>{startsIn}</Text>
              </View>
            )}

            {hasQuote && mission.quote && (
              <View style={styles.priceBlock}>
                <Text style={styles.priceLabel}>{t('detail.total_ttc')}</Text>
                <Text style={styles.priceValue}>{formatCurrency(mission.quote.totalWithVat * 100)}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* ── 3. Approach banner (priority slot) ────────────────────────── */}
        {showApproachBanner && approachBooking && (
          <View style={styles.section}>
            <SectionLabel Icon={Activity} text={t('detail.section_approach')} tone="info" />
            <AgentApproachBanner
              missionId={missionId}
              bookingId={approachBooking.id}
              agent={approachBooking.agent as any}
              siteLat={mission.latitude as number}
              siteLng={mission.longitude as number}
              onTrack={() => goToLiveTracking(approachBooking)}
            />
          </View>
        )}

        {/* ── 4. Quick stats chips ──────────────────────────────────────── */}
        <View style={styles.chipsRow}>
          <InfoChip Icon={Clock}        label={t('detail.duration')}   value={`${mission.durationHours}h`} />
          <InfoChip Icon={Radio}        label={t('detail.radius')}     value={`${mission.radiusKm} km`} />
          <InfoChip Icon={CalendarDays} label={t('detail.created_on')} value={formatDate(mission.createdAt)} />
        </View>

        {/* ── 5. Location card ──────────────────────────────────────────── */}
        {hasCoords && !showApproachBanner && (
          <View style={styles.section}>
            <SectionLabel Icon={MapPin} text={t('detail.section_location')} />
            <Card style={styles.locationCard}>
              <View style={styles.addressRow}>
                <View style={styles.addressIconWrap}>
                  <MapPin size={16} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.addressTextWrap}>
                  <Text style={styles.addressLine1} numberOfLines={2}>
                    {mission.address || mission.city}
                  </Text>
                  {fullAddress !== (mission.address || mission.city) && (
                    <Text style={styles.addressLine2} numberOfLines={1}>
                      {[mission.city, mission.zipCode].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.mapWrap}>
                <MissionMapView
                  latitude={mission.latitude as number}
                  longitude={mission.longitude as number}
                  radiusKm={mission.radiusKm ?? 0}
                  title={displayTitle}
                  height={200}
                  interactive={false}
                />
              </View>
            </Card>
          </View>
        )}

        {/* ── 6. Notes ──────────────────────────────────────────────────── */}
        {mission.notes && (
          <View style={styles.section}>
            <SectionLabel Icon={FileText} text={t('detail.section_notes')} />
            <Card style={styles.notesCard}>
              <Text style={styles.notesText}>{mission.notes}</Text>
            </Card>
          </View>
        )}

        {/* ── 7. Bookings ───────────────────────────────────────────────── */}
        {bookings.length > 0 && (
          <View style={styles.section}>
            <SectionLabel
              Icon={Users}
              text={t('detail.section_bookings')}
              count={bookings.length}
              tone="primary"
            />
            <View style={styles.bookingsList}>
              {bookings.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  perspective="client"
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: b.id })}
                />
              ))}
            </View>
          </View>
        )}

        {/* Subtle cancel link — moved to scroll content, not a giant red button */}
        {canCancel && (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelLink} activeOpacity={0.7}>
            <Text style={styles.cancelLinkText}>{t('detail.cancel')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── 8. Sticky footer CTA ────────────────────────────────────────── */}
      {cta && (
        <View style={styles.footerSticky}>
          {cta.isLive
            ? <LiveButton label={cta.label} onPress={cta.onPress} />
            : (
              <Button
                label={cta.label}
                onPress={cta.onPress}
                fullWidth
                size="lg"
                disabled={cta.disabled ?? false}
                rightIcon={<ChevronRight size={18} color={colors.textInverse} strokeWidth={2} />}
              />
            )
          }
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  flex:      { flex: 1 },
  content:   {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[3],
    paddingBottom:     120, // room for sticky footer
    gap:               spacing[5],
  },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  errorText: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary },
  chatBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // ── Hero card ──
  heroCard:    { padding: 0, overflow: 'hidden' },
  heroAccent:  { width: 4, position: 'absolute', left: 0, top: 0, bottom: 0 },
  heroContent: { paddingLeft: spacing[5], paddingRight: spacing[4], paddingVertical: spacing[4], gap: spacing[3] },

  heroBadges: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },

  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4, borderWidth: 1 },
  statusPillDot:  { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontFamily: fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },

  urgencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warningSurface, borderRadius: radius.full, paddingHorizontal: spacing[2] + 2, paddingVertical: 3, borderWidth: 1, borderColor: colors.warningBorder },
  urgencyText:  { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.warning, letterSpacing: 0.5 },

  approachBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.infoSurface, borderRadius: radius.full, paddingHorizontal: spacing[2] + 2, paddingVertical: 3, borderWidth: 1, borderColor: colors.infoBorder },
  approachBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.infoDot },
  approachBadgeText:{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.info, letterSpacing: 0.5 },

  liveBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.dangerSurface, borderRadius: radius.full, paddingHorizontal: spacing[2] + 2, paddingVertical: 3, borderWidth: 1, borderColor: colors.dangerBorder },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dangerDot },
  liveBadgeText:{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.danger, letterSpacing: 0.8 },

  title:    { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6, lineHeight: fontSize['2xl'] * 1.15 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  metaSep:  { color: colors.border, fontSize: fontSize.sm },

  countdownPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.infoSurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 4, borderWidth: 1, borderColor: colors.infoBorder },
  countdownText: { fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.info, letterSpacing: 0.3 },

  priceBlock: { marginTop: spacing[1], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  priceLabel: { fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  priceValue: { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.primary, letterSpacing: -0.6 },

  // ── Sections ──
  section:        { gap: spacing[3] },

  // ── Chips row ──
  chipsRow: { flexDirection: 'row', gap: spacing[2] },

  // ── Location card ──
  locationCard:    { padding: 0, overflow: 'hidden' },
  addressRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[4], paddingVertical: spacing[4] },
  addressIconWrap: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderPrimary },
  addressTextWrap: { flex: 1 },
  addressLine1:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: fontSize.sm * 1.4 },
  addressLine2:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  mapWrap:         { borderTopWidth: 1, borderTopColor: colors.border },

  // ── Notes ──
  notesCard: { padding: spacing[4] },
  notesText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.7 },

  // ── Bookings ──
  bookingsList: { gap: spacing[3] },

  // ── Cancel link ──
  cancelLink:     { alignSelf: 'center', paddingVertical: spacing[3], paddingHorizontal: spacing[4], marginTop: spacing[2] },
  cancelLinkText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.danger, textDecorationLine: 'underline' },

  // ── Sticky footer ──
  footerSticky: {
    position:        'absolute',
    left:            0,
    right:           0,
    bottom:          0,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[3],
    paddingBottom:     spacing[5],
    backgroundColor:   colors.background,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
  },
});

const stepStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[1], marginTop: spacing[2] },
  step: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  dot:           { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dotUpcoming:   { backgroundColor: colors.surface, borderColor: colors.border },
  dotActive:     { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  dotCompleted:  { backgroundColor: colors.primary, borderColor: colors.primary },
  activeRing:    { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary },

  connector: { flex: 1, height: 2, marginHorizontal: 4, borderRadius: 1 },
  connectorDone:    { backgroundColor: colors.primary },
  connectorPending: { backgroundColor: colors.border },

  cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.dangerSurface, borderRadius: radius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderWidth: 1, borderColor: colors.dangerBorder },
  cancelledText:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.danger },
});

const sectionStyles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  accent: { width: 3, height: 14, borderRadius: 2 },
  text:   { fontFamily: fontFamily.bodySemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  countPill: { backgroundColor: colors.primarySurface, borderRadius: radius.full, paddingHorizontal: spacing[2] + 2, paddingVertical: 1, borderWidth: 1, borderColor: colors.borderPrimary, minWidth: 22, alignItems: 'center' },
  countText: { fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.primary },
});

const chipStyles = StyleSheet.create({
  wrap:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.backgroundElevated, borderRadius: radius.lg, paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderWidth: 1, borderColor: colors.border, minHeight: 56 },
  wrapAccent: { borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface },
  col:        { flex: 1 },
  label:      { fontFamily: fontFamily.body, fontSize: 9, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  value:      { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 1 },
  valueAccent:{ color: colors.primary },
});

const liveStyles = StyleSheet.create({
  btn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing[2],
    paddingVertical: spacing[4] + 2,
    paddingHorizontal: spacing[4],
    borderRadius:    radius.xl,
    backgroundColor: colors.dangerDot,
    shadowColor:     colors.dangerDot,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.55,
    shadowRadius:    16,
    elevation:       12,
  },
  dotWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  ring:    { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: palette.white30 },
  core:    { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.white },
  text:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: palette.white, flex: 1, textAlign: 'center' },
});
