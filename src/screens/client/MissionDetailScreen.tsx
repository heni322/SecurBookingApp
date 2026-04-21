/**
 * MissionDetailScreen — full mission view with location map + Uber-style approach banner.
 */
import React, { useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Alert, StyleSheet, Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Calendar, Clock, MapPin, Radio, Banknote,
  CalendarDays, MessageSquare, FileText, ChevronRight, Zap, Activity,
} from 'lucide-react-native';
import { missionsApi }          from '@api/endpoints/missions';
import { useApi }               from '@hooks/useApi';
import { AgentApproachBanner }  from '@components/domain/AgentApproachBanner';
import { BookingCard }          from '@components/domain/BookingCard';
import { Badge }                from '@components/ui/Badge';
import { Button }               from '@components/ui/Button';
import { Card }                 from '@components/ui/Card';
import { LoadingState }         from '@components/ui/LoadingState';
import { MissionMapView }       from '@components/ui/MissionMapView';
import { ScreenHeader }         from '@components/ui/ScreenHeader';
import { Separator }            from '@components/ui/Separator';
import { colors }               from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatMissionRange, formatCurrency, formatDate } from '@utils/formatters';
import { MISSION_STATUS_LABEL, MISSION_STATUS_COLOR }     from '@utils/statusHelpers';
import { isCancellableMission } from '@utils/typeGuards';
import { MissionStatus }        from '@constants/enums';
import type { MissionStackParamList } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionDetail'>;

type Cta = { label: string; isLive?: boolean; onPress: () => void };

// ── Live CTA button ───────────────────────────────────────────────────────────
const LiveButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <TouchableOpacity style={styles.liveBtn} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.liveDotWrap}>
        <Animated.View style={[styles.liveDotRing, { transform: [{ scale: pulse }] }]} />
        <View style={styles.liveDotCore} />
      </View>
      <Activity size={16} color="#fff" strokeWidth={2} />
      <Text style={styles.liveBtnText}>{label}</Text>
      <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
    </TouchableOpacity>
  );
};

// ── Screen ────────────────────────────────────────────────────────────────────
export const MissionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation('missions');
  const { missionId } = route.params;
  const { data: mission, loading, execute, error } = useApi(missionsApi.getById);

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  const handleCancel = () => {
    Alert.alert(t('detail.cancel_title'), t('detail.cancel_body'), [
      { text: t('detail.cancel_back'), style: 'cancel' },
      {
        text: t('detail.cancel_confirm'), style: 'destructive',
        onPress: async () => {
          try { await missionsApi.cancel(missionId); load(); }
          catch (e: unknown) {
            Alert.alert(t('detail.cancel_title'), (e as any)?.response?.data?.message ?? t('detail.cancel_error'));
          }
        },
      },
    ]);
  };

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

  const statusLabel = MISSION_STATUS_LABEL[mission.status] ?? mission.status;
  const statusColor = MISSION_STATUS_COLOR[mission.status] ?? colors.textMuted;
  const canCancel   = isCancellableMission(mission);
  const hasQuote    = Boolean(mission.quote);
  const bookings    = mission.bookings ?? [];
  const openBookings      = bookings.filter(b => b.status === 'OPEN');
  const hasApplications   = openBookings.some(b => (b.applications?.length ?? 0) > 0);
  const displayTitle      = mission.title?.trim() || `Mission — ${mission.city}`;
  const hasCoords         = typeof mission.latitude  === 'number' && mission.latitude  !== 0
                         && typeof mission.longitude === 'number' && mission.longitude !== 0;

  // Booking with assigned/in-progress agent — used for approach banner + CTA
  const approachBooking = bookings.find(
    b => (b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS') && b.agent,
  );

  // Show approach banner when agent is ASSIGNED and heading to site
  // (hides once IN_PROGRESS → LiveTracking takes over as the live view)
  const showApproachBanner = approachBooking?.status === 'ASSIGNED'
    && hasCoords
    && approachBooking.agent != null;

  // CTA logic — exact flow: CREATED → PUBLISHED → STAFFING → STAFFED → IN_PROGRESS → COMPLETED
  const cta = ((): Cta | null => {
    if (mission.status === MissionStatus.CREATED && !hasQuote)
      return { label: t('detail.cta_get_quote'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };

    if (mission.status === MissionStatus.CREATED && hasQuote)
      return { label: t('detail.cta_see_quote'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };

    if (mission.status === MissionStatus.PUBLISHED && !hasApplications)
      return { label: t('detail.cta_waiting'), onPress: () => {} };

    if (mission.status === MissionStatus.PUBLISHED && hasApplications)
      return {
        label: t('detail.cta_select'),
        onPress: () => {
          const b = openBookings.find(bk => (bk.applications?.length ?? 0) > 0);
          if (b) navigation.navigate('BookingDetail', { bookingId: b.id });
        },
      };

    if (mission.status === MissionStatus.STAFFING)
      return { label: t('detail.cta_waiting'), onPress: () => {} };

    if (mission.status === MissionStatus.STAFFED)
      return { label: t('detail.cta_pay'), onPress: () => navigation.navigate('QuoteDetail', { missionId }) };

    if (mission.status === MissionStatus.IN_PROGRESS) {
      const liveBooking = bookings.find(b => b.status === 'IN_PROGRESS' && b.agent);
      if (liveBooking) return {
        label: "Suivre l'agent en direct", isLive: true,
        onPress: () => navigation.navigate('LiveTracking', {
          missionId,
          bookingId:      liveBooking.id,
          agentName:      (liveBooking.agent as any)?.fullName ?? 'Agent',
          missionAddress: mission.address ?? mission.city ?? '',
          siteLat:        mission.latitude  as number,
          siteLng:        mission.longitude as number,
        }),
      };
    }

    if (mission.status === MissionStatus.COMPLETED)
      return { label: t('detail.cta_messaging'), onPress: () => navigation.navigate('Conversation', { missionId }) };

    return null;
  })();

  const goToLiveTracking = (b: typeof approachBooking) => {
    if (!b?.agent) return;
    navigation.navigate('LiveTracking', {
      missionId,
      bookingId:      b.id,
      agentName:      (b.agent as any).fullName ?? 'Agent',
      missionAddress: mission.address ?? mission.city ?? '',
      siteLat:        mission.latitude  as number,
      siteLng:        mission.longitude as number,
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('detail.screen_title')}
        onBack={() => navigation.goBack()}
        rightAction={
          ([MissionStatus.PUBLISHED, MissionStatus.STAFFING, MissionStatus.STAFFED, MissionStatus.IN_PROGRESS].includes(mission.status as any)) ? (
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        {/* ── Hero ── */}
        <View style={[styles.heroBanner, { borderLeftColor: statusColor }]}>
          <View style={styles.heroTop}>
            <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
            {mission.isUrgent && (
              <View style={styles.urgencyBadge}>
                <Zap size={11} color={colors.warning} strokeWidth={2.2} />
                <Text style={styles.urgencyText}>URGENT</Text>
              </View>
            )}
            {mission.status === MissionStatus.IN_PROGRESS && (
              <View style={styles.heroBadgeLive}>
                <View style={styles.heroBadgeDot} />
                <Text style={styles.heroBadgeText}>EN DIRECT</Text>
              </View>
            )}
            {approachBooking?.status === 'ASSIGNED' && (
              <View style={styles.heroBadgeApproach}>
                <View style={styles.heroBadgeApproachDot} />
                <Text style={styles.heroBadgeApproachText}>AGENT EN ROUTE</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{displayTitle}</Text>
          <View style={styles.heroMeta}>
            <MapPin size={13} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.heroCity}>{mission.city}</Text>
            <Text style={styles.heroDot}>·</Text>
            <Calendar size={13} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.heroDate}>{formatMissionRange(mission.startAt, mission.endAt)}</Text>
          </View>
        </View>

        {/* ── Info grid ── */}
        <Card elevated style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <InfoTile Icon={Clock}        label={t('detail.duration')}   value={`${mission.durationHours}h`} />
            <InfoTile Icon={Radio}        label="Rayon"                   value={`${mission.radiusKm} km`} />
            {mission.quote && (
              <InfoTile Icon={Banknote}   label="Total TTC"
                value={formatCurrency(mission.quote.totalWithVat * 100)} accent />
            )}
            <InfoTile Icon={CalendarDays} label={t('detail.created_on')} value={formatDate(mission.createdAt)} />
          </View>
          {(mission.address || mission.city) && (
            <>
              <Separator marginV={spacing[3]} />
              <View style={styles.addressRow}>
                <MapPin size={14} color={colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.addressText}>
                  {[mission.address, mission.city, mission.zipCode].filter(Boolean).join(', ')}
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* ── Uber-style approach banner (ASSIGNED) ── */}
        {showApproachBanner && approachBooking && (
          <View style={styles.approachSection}>
            <View style={styles.sectionLabelRow}>
              <Activity size={13} color={colors.info} strokeWidth={2} />
              <Text style={[styles.sectionLabel, { color: colors.info }]}>Votre agent arrive</Text>
            </View>
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

        {/* ── Carte OSM statique (cachée si banner d'approche affiché) ── */}
        {hasCoords && !showApproachBanner && (
          <View style={styles.mapSection}>
            <View style={styles.sectionLabelRow}>
              <MapPin size={13} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.sectionLabel}>Localisation de la mission</Text>
            </View>
            <MissionMapView
              latitude={mission.latitude as number}
              longitude={mission.longitude as number}
              radiusKm={mission.radiusKm ?? 0}
              title={displayTitle}
              height={220}
              interactive={false}
            />
          </View>
        )}

        {/* ── Notes ── */}
        {mission.notes && (
          <Card style={styles.notesCard}>
            <View style={styles.sectionLabelRow}>
              <FileText size={13} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.sectionLabel}>Notes & instructions</Text>
            </View>
            <Text style={styles.notesText}>{mission.notes}</Text>
          </Card>
        )}

        {/* ── Bookings ── */}
        {bookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Postes</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{bookings.length}</Text>
              </View>
            </View>
            {bookings.map(b => (
              <BookingCard key={b.id} booking={b} perspective="client"
                onPress={() => navigation.navigate('BookingDetail', { bookingId: b.id })} />
            ))}
          </View>
        )}

        {/* ── CTA ── */}
        {cta && (
          <View style={styles.ctaArea}>
            {cta.isLive
              ? <LiveButton label={cta.label} onPress={cta.onPress} />
              : <Button label={cta.label} onPress={cta.onPress} fullWidth size="lg"
                  rightIcon={<ChevronRight size={18} color={colors.textInverse} strokeWidth={2} />}
                  disabled={mission.status === MissionStatus.PUBLISHED && !hasApplications} />
            }
          </View>
        )}

        {canCancel && (
          <Button label={t('detail.cancel')} onPress={handleCancel}
            fullWidth variant="danger" size="sm" style={styles.cancelBtn} />
        )}
      </ScrollView>
    </View>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────
type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;
const InfoTile: React.FC<{ Icon: LucideIcon; label: string; value: string; accent?: boolean }> = ({
  Icon, label, value, accent,
}) => (
  <View style={tileStyles.wrap}>
    <Icon size={14} color={accent ? colors.primary : colors.textMuted} strokeWidth={1.8} />
    <Text style={tileStyles.label}>{label}</Text>
    <Text style={[tileStyles.value, accent && { color: colors.primary }]}>{value}</Text>
  </View>
);
const tileStyles = StyleSheet.create({
  wrap:  { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: spacing[3], gap: spacing[1] },
  label: { fontFamily: fontFamily.body, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },
});

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.background },
  flex:     { flex: 1 },
  content:  { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[12], gap: spacing[4] },
  errorWrap:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  errorText:{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary },
  chatBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroBanner:    { marginTop: spacing[4], paddingLeft: spacing[4], borderLeftWidth: 3, borderLeftColor: colors.primary, gap: spacing[2] },
  heroTop:       { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  urgencyBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.warningSurface, borderRadius: radius.full, paddingHorizontal: spacing[2]+2, paddingVertical: 3, borderWidth: 1, borderColor: colors.warning },
  urgencyText:   { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.warning, letterSpacing: 0.5 },
  // Live badge (IN_PROGRESS)
  heroBadgeLive: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dc262618', borderRadius: radius.full, paddingHorizontal: spacing[2]+2, paddingVertical: 3, borderWidth: 1, borderColor: '#dc262650' },
  heroBadgeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#dc2626' },
  heroBadgeText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: '#dc2626', letterSpacing: 0.8 },
  // Approach badge (ASSIGNED)
  heroBadgeApproach:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.infoSurface, borderRadius: radius.full, paddingHorizontal: spacing[2]+2, paddingVertical: 3, borderWidth: 1, borderColor: colors.info + '40' },
  heroBadgeApproachDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.info },
  heroBadgeApproachText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.info, letterSpacing: 0.8 },

  title:    { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[1]+2 },
  heroCity: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  heroDot:  { color: colors.border },
  heroDate: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },

  // Info card
  infoCard:    { gap: spacing[2] },
  infoGrid:    { flexDirection: 'row', flexWrap: 'wrap' },
  addressRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  addressText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },

  // Sections
  approachSection: { gap: spacing[2] },
  mapSection:      { gap: spacing[2] },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionLabel:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Notes
  notesCard: { gap: spacing[3] },
  notesText: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, lineHeight: fontSize.base * 1.6 },

  // Bookings
  section:       { gap: spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] },
  sectionAccent: { width: 3, height: 18, borderRadius: 2, backgroundColor: colors.primary },
  sectionTitle:  { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3, flex: 1 },
  countPill:     { backgroundColor: colors.primarySurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: 3, borderWidth: 1, borderColor: colors.borderPrimary },
  countText:     { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary },

  // CTA
  ctaArea:   { marginTop: spacing[2] },
  cancelBtn: { marginTop: spacing[2], opacity: 0.8 },

  // Live button
  liveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], paddingVertical: spacing[4]+2, paddingHorizontal: spacing[4],
    borderRadius: radius.xl, backgroundColor: '#dc2626',
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55, shadowRadius: 14, elevation: 10,
  },
  liveDotWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  liveDotRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.35)' },
  liveDotCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: '#fff', flex: 1, textAlign: 'center' },
});
