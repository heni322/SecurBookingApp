/**
 * BookingDetailScreen — détail d'un booking côté CLIENT.
 * Affiche : agent, statut, pointages GPS, photos check-in/checkout, incidents, actions.
 *
 * Fix: BOOKING_STATUS_LABEL imported from statusHelpers does not exist there —
 * labels live in i18n (same root cause as MissionDetailScreen + BookingCard).
 * Metro resolved the named import to `undefined` → crash at line 122:
 *   TypeError: Cannot convert undefined value to object
 * Fix: removed dead import, added useTranslation('booking') +
 * BOOKING_STATUS_I18N_KEY static map, use t('statuses.*').
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, StyleSheet, Image,
  Dimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Star, ShieldCheck, UserCheck, LogIn, LogOut,
  AlertTriangle, Users, Clock, MapPin, Flag,
  Camera, ZoomIn, X, CheckCircle, ChevronRight,
} from 'lucide-react-native';
import { bookingsApi }  from '@api/endpoints/bookings';
import { useApi }       from '@hooks/useApi';
import { Avatar }       from '@components/ui/Avatar';
import { Badge }        from '@components/ui/Badge';
import { Button }       from '@components/ui/Button';
import { Card }         from '@components/ui/Card';
import { LoadingState } from '@components/ui/LoadingState';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { colors }       from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDate, formatTime, formatDuration } from '@utils/formatters';
import { BOOKING_STATUS_COLOR } from '@utils/statusHelpers'; // BOOKING_STATUS_LABEL removed — does not exist
import { isActiveBooking }      from '@utils/typeGuards';
import { BookingStatus }        from '@constants/enums';
import type { BookingNS }       from '@i18n/locales/types';
import { useTranslation }       from '@i18n';
import type { Application, MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'BookingDetail'>;

const { width: SCREEN_W } = Dimensions.get('window');

// ── Uniform label map ──────────────────────────────────────────────────────────
const UNIFORM_LABEL: Record<string, string> = {
  STANDARD:     '🦺 Standard',
  CIVIL:        '👔 Civil',
  EVENEMENTIEL: '🤵 Soirée',
  SSIAP:        '🔥 SSIAP',
  CYNOPHILE:    '🐕 Cynophile',
};

/**
 * Static map: BookingStatus → keyof BookingNS['statuses']
 * Prevents t(`statuses.${string}`) template-literal widening (TS2345).
 */
const BOOKING_STATUS_I18N_KEY: Record<BookingStatus, keyof BookingNS['statuses']> = {
  [BookingStatus.OPEN]:        'open',
  [BookingStatus.ASSIGNED]:    'assigned',
  [BookingStatus.IN_PROGRESS]: 'in_progress',
  [BookingStatus.COMPLETED]:   'completed',
  [BookingStatus.CANCELLED]:   'cancelled',
  [BookingStatus.ABANDONED]:   'abandoned',
};

export const BookingDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId }                             = route.params;
  const { t }                                     = useTranslation('booking');
  const { data: booking, loading, execute }       = useApi(bookingsApi.getById);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
    const [incidentDesc,      setIncidentDesc]      = useState('');
    const [submitting,        setSubmitting]        = useState(false);
  const [lightboxUrl,       setLightboxUrl]       = useState<string | null>(null);

  const load = useCallback(() => execute(bookingId), [execute, bookingId]);
  useEffect(() => { load(); }, [load]);

  // Auto-assign: agent selection handled automatically — no manual selection needed.











  const handleIncident = async () => {
    if (!incidentDesc.trim()) return;
    setSubmitting(true);
    try {
      await bookingsApi.reportIncident(bookingId, { description: incidentDesc.trim() });
      setShowIncidentModal(false);
      setIncidentDesc('');
      Alert.alert(t('incidents.reported_title'), t('incidents.reported_body'));
    } catch { Alert.alert(t('errors.generic'), t('incidents.report_error')); }
    finally   { setSubmitting(false); }
  };

  const goToLiveTracking = () => {
    if (!booking?.mission || !booking.agent) return;
    (navigation as any).navigate('LiveTracking', {
      missionId:      booking.missionId,
      bookingId:      booking.id,
      agentName:      booking.agent.fullName,
      missionAddress: booking.mission.address ?? booking.mission.city,
      siteLat:        booking.mission.latitude,
      siteLng:        booking.mission.longitude,
    });
  };

  const goToRateAgent = () => {
    if (!booking?.agent) return;
    (navigation as any).navigate('RateAgent', {
      bookingId,
      agentName:    booking.agent.fullName,
      agentId:      booking.agent.id,
      missionTitle: booking.mission?.title ?? booking.mission?.city ?? 'Mission',
    });
  };

  const goToDispute = () => {
    (navigation as any).navigate('Dispute', {
      missionId:    booking?.missionId ?? '',
      bookingId:    booking?.id,
      missionTitle: booking?.mission?.title ?? booking?.mission?.city ?? 'Mission',
    });
  };

  if (loading && !booking) return <LoadingState message="Chargement…" />;
  if (!booking) return (
    <View style={styles.screen}>
      <ScreenHeader title={t('screen_title')} onBack={() => navigation.goBack()} />
    </View>
  );

  // ── Derived values ──────────────────────────────────────────────────────────

  /**
   * FIX: BOOKING_STATUS_LABEL[booking.status] crashed because the export doesn't
   * exist in statusHelpers. Now uses the BOOKING_STATUS_I18N_KEY static map
   * for a type-safe, locale-reactive t() call from the booking namespace.
   */
  const statusLabel  = t(`statuses.${BOOKING_STATUS_I18N_KEY[booking.status as BookingStatus]}`);
  const statusColor  = BOOKING_STATUS_COLOR[booking.status] ?? colors.textMuted;
  const agent        = booking.agent;
  const isCompleted  = booking.status === BookingStatus.COMPLETED;
  const isActive     = isActiveBooking(booking);
  const isInProgress = booking.status === BookingStatus.IN_PROGRESS;
  const isOpen       = booking.status === BookingStatus.OPEN;
  const hasRating    = Boolean((booking as any).rating);
  const applications = booking.applications ?? [];
  const pendingApps  = applications.filter(a => a.status === 'PENDING');

  const checkinPhotos  = [booking.checkinPhotoUrl,  booking.checkinPhotoUrl2].filter(Boolean) as string[];
  const checkoutPhotos = [booking.checkoutPhotoUrl, booking.checkoutPhotoUrl2].filter(Boolean) as string[];
  const hasPhotos      = checkinPhotos.length > 0 || checkoutPhotos.length > 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('screen_title')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Statut + durée ─────────────────────────────────────── */}
        <View style={styles.statusRow}>
          <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
          <View style={styles.statusRight}>
            {booking.uniform && (
              <Text style={styles.uniformBadge}>
                {UNIFORM_LABEL[booking.uniform] ?? booking.uniform}
              </Text>
            )}
            {booking.durationMin !== undefined && (
              <View style={styles.durationRow}>
                <Clock size={13} color={colors.textSecondary} strokeWidth={1.8} />
                <Text style={styles.duration}>{formatDuration(booking.durationMin)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Candidatures ──────────────────────────────────────── */}
        {isOpen && pendingApps.length > 0 && (
          <Card style={styles.applicationsCard}>
            <View style={styles.appHeader}>
              <View style={styles.appHeaderLeft}>
                <Users size={14} color={colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.sectionLabel}>{t('applications.section_title', { count: pendingApps.length })}</Text>
              </View>
              <View style={styles.autoAssignNote}><Text style={styles.autoAssignText}>Attribution automatique</Text></View>
            </View>
            {pendingApps.slice(0, 3).map(app => (
              <ApplicationRow key={app.id} application={app} />
            ))}
            {pendingApps.length > 3 && (
              <Text style={styles.moreApps}>
                {t(pendingApps.length - 3 === 1 ? 'applications.more' : 'applications.more_plural', { count: pendingApps.length - 3 })}
              </Text>
            )}
          </Card>
        )}

        {isOpen && pendingApps.length === 0 && (
          <Card style={styles.waitingCard}>
            <Users size={16} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.waitingText}>{t('applications.waiting')}</Text>
          </Card>
        )}

        {/* ── Agent assigné ──────────────────────────────────────── */}
        {agent && (
          <Card style={styles.agentCard}>
            <Text style={styles.sectionLabel}>{t('agent.assigned_label')}</Text>
            <View style={styles.agentRow}>
              <Avatar name={agent.fullName} avatarUrl={agent.avatarUrl} size={52} />
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{agent.fullName}</Text>
                <View style={styles.agentMeta}>
                  {agent.isValidated && (
                    <View style={styles.validatedBadge}>
                      <ShieldCheck size={11} color={colors.success} strokeWidth={2} />
                      <Text style={styles.validatedText}>{t('agent.cnaps_badge')}</Text>
                    </View>
                  )}
                  <View style={styles.ratingRow}>
                    <Star size={12} color={colors.warning} strokeWidth={2} />
                    <Text style={styles.agentRating}>{agent.avgRating?.toFixed(1) ?? t('agent.rating_empty')}</Text>
                  </View>
                  <Text style={styles.agentMissions}>{t('agent.missions_count', { count: agent.completedCount ?? 0 })}</Text>
                </View>
              </View>
            </View>
            {isInProgress && (
              <TouchableOpacity style={styles.trackingBtn} onPress={goToLiveTracking}>
                <MapPin size={15} color="#FFF" strokeWidth={2} />
                <Text style={styles.trackingBtnTxt}>{t('agent.follow_live')}</Text>
                <View style={styles.trackingDot} />
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* ── Pointages GPS ──────────────────────────────────────── */}
        <Card style={styles.timesCard}>
          <Text style={styles.sectionLabel}>{t('checkins.section_title')}</Text>
          <View style={styles.timeRow}>
            <TimeItem
              Icon={LogIn}
              label="Check-in"
              value={booking.checkinAt ? formatTime(booking.checkinAt) : '—'}
              active={Boolean(booking.checkinAt)}
              color={colors.success}
            />
            <View style={styles.timeDivider} />
            <TimeItem
              Icon={LogOut}
              label="Check-out"
              value={booking.checkoutAt ? formatTime(booking.checkoutAt) : '—'}
              active={Boolean(booking.checkoutAt)}
              color={colors.primary}
            />
          </View>
          {booking.checkinAt && (
            <Text style={styles.timeSub}>{t('checkins.date_label', { date: formatDate(booking.checkinAt) })}</Text>
          )}
        </Card>

        {/* ── Photos de présence ─────────────────────────────────── */}
        {hasPhotos ? (
          <Card style={styles.photosCard}>
            <View style={styles.photosHeader}>
              <Camera size={15} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.sectionLabel}>{t('photos.section_title')}</Text>
              <View style={styles.photosBadge}>
                <CheckCircle size={11} color={colors.success} strokeWidth={2} />
                <Text style={styles.photosBadgeText}>{t('photos.verified_badge')}</Text>
              </View>
            </View>

            {checkinPhotos.length > 0 && (
              <View style={styles.photoGroup}>
                <View style={styles.photoGroupHeader}>
                  <LogIn size={12} color={colors.success} strokeWidth={2} />
                  <Text style={styles.photoGroupLabel}>
                    {t('checkins.checkin_label', { time: booking.checkinAt ? formatTime(booking.checkinAt) : '' })}
                  </Text>
                </View>
                <View style={styles.photoRow}>
                  {checkinPhotos.map((url, i) => (
                    <TouchableOpacity key={i} style={styles.photoThumbWrap} onPress={() => setLightboxUrl(url)} activeOpacity={0.85}>
                      <Image source={{ uri: url }} style={styles.photoThumb} resizeMode="cover" />
                      <View style={styles.photoZoomIcon}><ZoomIn size={12} color="#fff" strokeWidth={2} /></View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {checkoutPhotos.length > 0 && (
              <View style={styles.photoGroup}>
                <View style={styles.photoGroupHeader}>
                  <LogOut size={12} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.photoGroupLabel}>
                    {t('checkins.checkout_label', { time: booking.checkoutAt ? formatTime(booking.checkoutAt) : '' })}
                  </Text>
                </View>
                <View style={styles.photoRow}>
                  {checkoutPhotos.map((url, i) => (
                    <TouchableOpacity key={i} style={styles.photoThumbWrap} onPress={() => setLightboxUrl(url)} activeOpacity={0.85}>
                      <Image source={{ uri: url }} style={styles.photoThumb} resizeMode="cover" />
                      <View style={styles.photoZoomIcon}><ZoomIn size={12} color="#fff" strokeWidth={2} /></View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={styles.photosFootnote}>{t('photos.caption', { name: agent?.fullName ?? '' })}</Text>
          </Card>
        ) : (
          (isInProgress || isCompleted) && (
            <Card style={styles.noPhotosCard}>
              <Camera size={16} color={colors.textMuted} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noPhotosTitle}>{t('photos.no_photos_title')}</Text>
                <Text style={styles.noPhotosText}>
                  {isInProgress
                    ? "Les photos apparaîtront ici lors du check-in de l'agent."
                    : "Aucune photo de présence disponible pour cette mission."}
                </Text>
              </View>
            </Card>
          )
        )}

        {/* ── Incidents ─────────────────────────────────────────── */}
        {(booking.incidents ?? []).length > 0 && (
          <Card style={styles.incidentsCard}>
            <View style={styles.incidentHeader}>
              <AlertTriangle size={14} color={colors.warning} strokeWidth={2} />
              <Text style={styles.sectionLabel}>{t('incidents.section_title', { count: booking.incidents!.length })}</Text>
            </View>
            {booking.incidents!.map(inc => (
              <View key={inc.id} style={styles.incidentItem}>
                <AlertTriangle size={16} color={colors.warning} strokeWidth={1.8} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.incidentDesc}>{inc.description}</Text>
                  <Text style={styles.incidentDate}>{formatDate(inc.createdAt)}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* ── Actions ───────────────────────────────────────────── */}
        <View style={styles.actions}>
          {isActive && (
            <Button label={t('incidents.report_title')} onPress={() => setShowIncidentModal(true)} variant="outline" fullWidth />
          )}
          {isCompleted && agent && !hasRating && (
            <TouchableOpacity style={styles.rateBtn} onPress={goToRateAgent}>
              <Star size={16} color={colors.warning} strokeWidth={2} />
              <Text style={styles.rateBtnTxt}>{t('actions.rate_agent')}</Text>
            </TouchableOpacity>
          )}
          {isCompleted && hasRating && (
            <View style={styles.ratedBanner}>
              <Star size={14} color={colors.warning} strokeWidth={2} fill={colors.warning} />
              <Text style={styles.ratedTxt}>{t('actions.already_rated')}</Text>
            </View>
          )}
          {(isCompleted || isActive) && (
            <TouchableOpacity style={styles.disputeBtn} onPress={goToDispute}>
              <Flag size={14} color={colors.danger} strokeWidth={2} />
              <Text style={styles.disputeBtnTxt}>{t('actions.open_dispute')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── Photo Lightbox ─────────────────────────────────────── */}
      <Modal visible={!!lightboxUrl} transparent animationType="fade" onRequestClose={() => setLightboxUrl(null)}>
        <View style={lightbox.overlay}>
          <TouchableOpacity style={lightbox.closeBtn} onPress={() => setLightboxUrl(null)}>
            <X size={22} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          {lightboxUrl && (
            <Image source={{ uri: lightboxUrl }} style={lightbox.image} resizeMode="contain" />
          )}
          <Text style={lightbox.caption}>{t('photos.caption', { name: booking?.agent?.fullName ?? '' })}</Text>
        </View>
      </Modal>

      {/* ── Modal sélection agent ──────────────────────────────── */}
































      {/* ── Modal incident ─────────────────────────────────────── */}
      <Modal visible={showIncidentModal} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <Text style={modal.title}>{t('incidents.report_title')}</Text>
            <TextInput
              style={modal.textInput}
              value={incidentDesc}
              onChangeText={setIncidentDesc}
              placeholder={t('incidents.placeholder')}
              placeholderTextColor={colors.textMuted}
              multiline numberOfLines={5}
              textAlignVertical="top"
            />
            <View style={modal.btns}>
              <Button label="Annuler" onPress={() => setShowIncidentModal(false)} variant="ghost" />
              <Button label="Envoyer" onPress={handleIncident} loading={submitting} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── ApplicationRow ────────────────────────────────────────────────────────────
const ApplicationRow: React.FC<{ application: Application }> = ({ application }) => (
  <View style={appStyles.row}>
    <Avatar name={application.agent?.fullName} avatarUrl={application.agent?.avatarUrl} size={36} />
    <View style={appStyles.info}>
      <Text style={appStyles.name}>{application.agent?.fullName ?? '—'}</Text>
      <View style={appStyles.metaRow}>
        <Star size={11} color={colors.warning} strokeWidth={2} />
        <Text style={appStyles.meta}>
          {application.agent?.avgRating?.toFixed(1) ?? '—'}
          {application.agent?.isValidated ? ' \u00b7 CNAPS \u2713' : ''}
        </Text>
      </View>
    </View>
    {/* Auto-assigned — badge only, no select button */}
    <View style={appStyles.autoBadge}>
      <UserCheck size={13} color={colors.success} strokeWidth={2} />
      <Text style={appStyles.autoText}>Auto</Text>
    </View>
  </View>
);

// ── TimeItem ──────────────────────────────────────────────────────────────────
const TimeItem: React.FC<{
  Icon: React.FC<{ size: number; color: string; strokeWidth: number }>;
  label: string; value: string; active: boolean; color: string;
}> = ({ Icon, label, value, active, color }) => (
  <View style={timeStyles.wrap}>
    <Icon size={20} color={active ? color : colors.textMuted} strokeWidth={1.8} />
    <Text style={[timeStyles.value, active && { color: colors.textPrimary }]}>{value}</Text>
    <Text style={timeStyles.label}>{label}</Text>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const appStyles = StyleSheet.create({
  row:       { flexDirection:'row', alignItems:'center', gap:spacing[3], paddingVertical:spacing[2] },
  info:      { flex:1 },
  name:      { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.sm, color:colors.textPrimary },
  metaRow:   { flexDirection:'row', alignItems:'center', gap:4, marginTop:2 },
  meta:      { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted },
  autoBadge: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:colors.successSurface, borderRadius:radius.full, paddingHorizontal:spacing[2]+2, paddingVertical:3 },
  autoText:  { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.xs, color:colors.success },
});

const timeStyles = StyleSheet.create({
  wrap:  { flex:1, alignItems:'center', gap:spacing[1] },
  value: { fontFamily:fontFamily.mono, fontSize:fontSize.xl, color:colors.textMuted },
  label: { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5 },
});

const lightbox = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.92)', alignItems:'center', justifyContent:'center' },
  closeBtn: {
    position:'absolute', top:52, right:20,
    width:40, height:40, borderRadius:20,
    backgroundColor:'rgba(255,255,255,0.15)',
    alignItems:'center', justifyContent:'center', zIndex:10,
  },
  image:   { width:SCREEN_W, height:SCREEN_W, maxHeight:'75%' },
  caption: { position:'absolute', bottom:60, fontFamily:fontFamily.body, fontSize:fontSize.sm, color:colors.textMuted },
});

const modal = StyleSheet.create({
  overlay: { flex:1, backgroundColor:colors.scrim, justifyContent:'flex-end' },
  sheet: {
    backgroundColor:colors.backgroundElevated,
    borderTopLeftRadius:28, borderTopRightRadius:28,
    padding:spacing[6], gap:spacing[4],
  },
  title:      { fontFamily:fontFamily.display, fontSize:fontSize.xl, color:colors.textPrimary, letterSpacing:-0.4 },
  subtitle:   { fontFamily:fontFamily.body, fontSize:fontSize.sm, color:colors.textSecondary, marginTop:-spacing[2] },
  appRow:     { flexDirection:'row', alignItems:'center', gap:spacing[3], paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.border },
  appInfo:    { flex:1 },
  appName:    { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.base, color:colors.textPrimary },
  appMetaRow: { flexDirection:'row', alignItems:'center', gap:4, marginTop:2 },
  appMeta:    { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted },
  textInput: {
    backgroundColor:colors.surface, borderRadius:radius.lg,
    borderWidth:1, borderColor:colors.border,
    padding:spacing[4], fontFamily:fontFamily.body,
    fontSize:fontSize.base, color:colors.textPrimary, minHeight:100,
  },
  btns: { flexDirection:'row', gap:spacing[3], justifyContent:'flex-end' },
});

const styles = StyleSheet.create({
  screen:  { flex:1, backgroundColor:colors.background },
  content: { paddingHorizontal:layout.screenPaddingH, paddingBottom:spacing[10], gap:spacing[4] },

  statusRow:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingTop:spacing[4] },
  statusRight: { flexDirection:'row', alignItems:'center', gap:spacing[3] },
  uniformBadge: {
    fontFamily:fontFamily.bodyMedium, fontSize:fontSize.xs, color:colors.textSecondary,
    backgroundColor:colors.surface, borderRadius:radius.full,
    paddingHorizontal:spacing[3], paddingVertical:spacing[1]+2,
    borderWidth:1, borderColor:colors.border,
  },
  durationRow:  { flexDirection:'row', alignItems:'center', gap:spacing[1]+2 },
  duration:     { fontFamily:fontFamily.mono, fontSize:fontSize.base, color:colors.textSecondary },
  sectionLabel: { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.xs, color:colors.textMuted, textTransform:'uppercase', letterSpacing:1 },

  applicationsCard: { gap:spacing[2] },
  appHeader:        { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:spacing[2] },
  appHeaderLeft:    { flexDirection:'row', alignItems:'center', gap:spacing[2] },
  moreApps:         { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted, textAlign:'center', marginTop:spacing[2] },

  waitingCard: { flexDirection:'row', alignItems:'center', gap:spacing[3], backgroundColor:colors.surface },
  waitingText: { fontFamily:fontFamily.body, fontSize:fontSize.sm, color:colors.textSecondary },

  agentCard:  { gap:spacing[3] },
  agentRow:   { flexDirection:'row', alignItems:'center', gap:spacing[4] },
  agentInfo:  { flex:1, gap:spacing[2] },
  agentName:  { fontFamily:fontFamily.display, fontSize:fontSize.md, color:colors.textPrimary, letterSpacing:-0.2 },
  agentMeta:  { flexDirection:'row', alignItems:'center', gap:spacing[2], flexWrap:'wrap' },
  validatedBadge: { flexDirection:'row', alignItems:'center', gap:3, backgroundColor:colors.successSurface, borderRadius:radius.full, paddingHorizontal:spacing[2], paddingVertical:2 },
  validatedText:  { fontFamily:fontFamily.bodyMedium, fontSize:10, color:colors.success },
  ratingRow:      { flexDirection:'row', alignItems:'center', gap:3 },
  agentRating:    { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.sm, color:colors.textSecondary },
  agentMissions:  { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted },
  trackingBtn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    gap:spacing[2], backgroundColor:colors.infoSurface,
    borderRadius:radius.lg, paddingVertical:12,
  },
  trackingBtnTxt: { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.sm, color:colors.white, flex:1 },
  trackingDot:    { width:8, height:8, borderRadius:4, backgroundColor:colors.successSurface, shadowColor:colors.successSurface, shadowRadius:4, shadowOpacity:0.8, shadowOffset:{width:0,height:0} },

  timesCard:   { gap:0 },
  timeRow:     { flexDirection:'row', alignItems:'center', marginBottom:spacing[3] },
  timeDivider: { width:1, height:40, backgroundColor:colors.border, marginHorizontal:spacing[4] },
  timeSub:     { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted, textAlign:'center' },

  photosCard:      { gap:spacing[3] },
  photosHeader:    { flexDirection:'row', alignItems:'center', gap:spacing[2] },
  photosBadge:     { flexDirection:'row', alignItems:'center', gap:3, backgroundColor:colors.successSurface, borderRadius:radius.full, paddingHorizontal:spacing[2], paddingVertical:2, marginLeft:'auto' },
  photosBadgeText: { fontFamily:fontFamily.bodyMedium, fontSize:10, color:colors.success },
  photoGroup:      { gap:spacing[2] },
  photoGroupHeader:{ flexDirection:'row', alignItems:'center', gap:spacing[2] },
  photoGroupLabel: { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.xs, color:colors.textSecondary },
  photoRow:        { flexDirection:'row', gap:spacing[3] },
  photoThumbWrap: {
    width:(SCREEN_W - layout.screenPaddingH*2 - spacing[3]*3) / 2,
    height:120, borderRadius:radius.xl, overflow:'hidden',
    backgroundColor:colors.surface, position:'relative',
  },
  photoThumb:    { width:'100%', height:'100%' },
  photoZoomIcon: {
    position:'absolute', bottom:spacing[2], right:spacing[2],
    width:28, height:28, borderRadius:14,
    backgroundColor:'rgba(0,0,0,0.55)',
    alignItems:'center', justifyContent:'center',
  },
  photosFootnote: { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted, lineHeight:fontSize.xs*1.6 },

  noPhotosCard:  { flexDirection:'row', alignItems:'flex-start', gap:spacing[3], backgroundColor:colors.surface },
  noPhotosTitle: { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.sm, color:colors.textSecondary },
  noPhotosText:  { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted, marginTop:2, lineHeight:16 },

  incidentsCard:  { gap:spacing[3] },
  incidentHeader: { flexDirection:'row', alignItems:'center', gap:spacing[2] },
  incidentItem:   { flexDirection:'row', gap:spacing[3], alignItems:'flex-start' },
  incidentDesc:   { fontFamily:fontFamily.body, fontSize:fontSize.sm, color:colors.textSecondary },
  incidentDate:   { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted, marginTop:2 },

  actions:      { gap:spacing[3] },
  rateBtn:      { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing[2], borderWidth:1.5, borderColor:colors.warning, borderRadius:radius.lg, paddingVertical:12 },
  rateBtnTxt:   { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.base, color:colors.warning },
  ratedBanner:  { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing[2], backgroundColor:colors.primarySurface, borderRadius:radius.lg, paddingVertical:10, borderWidth:1, borderColor:colors.borderPrimary },
  ratedTxt:     { fontFamily:fontFamily.body, fontSize:fontSize.sm, color:colors.primaryDark },
  disputeBtn:   { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing[2], paddingVertical:10 },
  disputeBtnTxt:{ fontFamily:fontFamily.body, fontSize:fontSize.sm, color:colors.danger },
  autoAssignNote: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], backgroundColor: colors.infoSurface, borderRadius: radius.lg },
  autoAssignText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.info },
});

