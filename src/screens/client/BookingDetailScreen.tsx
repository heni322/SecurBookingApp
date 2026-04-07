/**
 * BookingDetailScreen — détail d'un booking côté CLIENT.
 * Nouveautés v2 :
 *  - Bouton "Suivre l'agent en direct" → LiveTrackingScreen (WebSocket GPS)
 *  - Bouton "Évaluer l'agent"          → RateAgentScreen (plein écran)
 *  - Bouton "Ouvrir un litige"         → DisputeScreen
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Star, ShieldCheck, UserCheck, LogIn, LogOut,
  AlertTriangle, Users, Clock, MapPin, Flag,
} from 'lucide-react-native';
import { bookingsApi }  from '@api/endpoints/bookings';
import { useApi }       from '@hooks/useApi';
import { Avatar }       from '@components/ui/Avatar';
import { Badge }        from '@components/ui/Badge';
import { Button }       from '@components/ui/Button';
import { Card }         from '@components/ui/Card';
import { LoadingState } from '@components/ui/LoadingState';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { StarRating }   from '@components/ui/StarRating';
import { colors }       from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDate, formatTime, formatDuration } from '@utils/formatters';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from '@utils/statusHelpers';
import { isActiveBooking } from '@utils/typeGuards';
import { BookingStatus }   from '@constants/enums';
import type { Application, MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'BookingDetail'>;

export const BookingDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId }                             = route.params;
  const { data: booking, loading, execute }       = useApi(bookingsApi.getById);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showAgentModal,    setShowAgentModal]    = useState(false);
  const [incidentDesc,      setIncidentDesc]      = useState('');
  const [selectingAgent,    setSelectingAgent]    = useState(false);
  const [submitting,        setSubmitting]        = useState(false);

  const load = useCallback(() => execute(bookingId), [execute, bookingId]);
  useEffect(() => { load(); }, [load]);

  // ── Sélectionner un agent parmi les candidats ──────────────────────────────
  const handleSelectAgent = async (applicationId: string) => {
    setSelectingAgent(true);
    try {
      await bookingsApi.selectAgent(bookingId, { applicationId });
      setShowAgentModal(false);
      Alert.alert('Agent sélectionné', "L'agent a été assigné à ce poste.");
      load();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? "Impossible de sélectionner l'agent";
      Alert.alert('Erreur', msg);
    } finally { setSelectingAgent(false); }
  };

  // ── Signaler un incident ───────────────────────────────────────────────────
  const handleIncident = async () => {
    if (!incidentDesc.trim()) return;
    setSubmitting(true);
    try {
      await bookingsApi.reportIncident(bookingId, { description: incidentDesc.trim() });
      setShowIncidentModal(false);
      setIncidentDesc('');
      Alert.alert('Incident signalé', "Votre rapport a été transmis à l'équipe SecurBook.");
    } catch {
      Alert.alert('Erreur', "Impossible de signaler l'incident.");
    } finally { setSubmitting(false); }
  };

  // ── Navigation vers les nouveaux écrans ────────────────────────────────────
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

  // ── Computed ───────────────────────────────────────────────────────────────
  if (loading && !booking) return <LoadingState message="Chargement…" />;
  if (!booking) return (
    <View style={styles.screen}>
      <ScreenHeader title="Poste" onBack={() => navigation.goBack()} />
    </View>
  );

  const statusLabel  = BOOKING_STATUS_LABEL[booking.status] ?? booking.status;
  const statusColor  = BOOKING_STATUS_COLOR[booking.status] ?? colors.textMuted;
  const agent        = booking.agent;
  const isCompleted  = booking.status === BookingStatus.COMPLETED;
  const isActive     = isActiveBooking(booking);
  const isInProgress = booking.status === BookingStatus.IN_PROGRESS;
  const isOpen       = booking.status === BookingStatus.OPEN;
  const hasRating    = Boolean((booking as any).rating);
  const applications = booking.applications ?? [];
  const pendingApps  = applications.filter((a) => a.status === 'PENDING');

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Détail du poste" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Statut + durée ─────────────────────────────────────── */}
        <View style={styles.statusRow}>
          <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
          {booking.durationMin !== undefined && (
            <View style={styles.durationRow}>
              <Clock size={13} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.duration}>{formatDuration(booking.durationMin)}</Text>
            </View>
          )}
        </View>

        {/* ── Candidatures ───────────────────────────────────────── */}
        {isOpen && pendingApps.length > 0 && (
          <Card style={styles.applicationsCard}>
            <View style={styles.appHeader}>
              <View style={styles.appHeaderLeft}>
                <Users size={14} color={colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.sectionLabel}>Candidatures ({pendingApps.length})</Text>
              </View>
              <Button
                label="Sélectionner"
                onPress={() => setShowAgentModal(true)}
                size="sm"
                variant="primary"
              />
            </View>
            {pendingApps.slice(0, 3).map((app) => (
              <ApplicationRow
                key={app.id}
                application={app}
                onSelect={() => handleSelectAgent(app.id)}
                loading={selectingAgent}
              />
            ))}
            {pendingApps.length > 3 && (
              <Text style={styles.moreApps}>
                +{pendingApps.length - 3} autre{pendingApps.length - 3 > 1 ? 's' : ''} candidature{pendingApps.length - 3 > 1 ? 's' : ''}
              </Text>
            )}
          </Card>
        )}

        {isOpen && pendingApps.length === 0 && (
          <Card style={styles.waitingCard}>
            <Users size={16} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.waitingText}>En attente de candidatures agents…</Text>
          </Card>
        )}

        {/* ── Agent assigné ──────────────────────────────────────── */}
        {agent && (
          <Card style={styles.agentCard}>
            <Text style={styles.sectionLabel}>Agent assigné</Text>
            <View style={styles.agentRow}>
              <Avatar fullName={agent.fullName} avatarUrl={agent.avatarUrl} size="lg" online={isActive} />
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{agent.fullName}</Text>
                <View style={styles.agentMeta}>
                  {agent.isValidated && (
                    <Badge label="CNAPS ✓" color={colors.success} bg={colors.successSurface} />
                  )}
                  <View style={styles.ratingRow}>
                    <Star size={12} color={colors.warning} strokeWidth={2} />
                    <Text style={styles.agentRating}>{agent.avgRating?.toFixed(1) ?? '—'}</Text>
                  </View>
                  <Text style={styles.agentMissions}>{agent.completedCount} missions</Text>
                </View>
              </View>
            </View>

            {/* ✨ NOUVEAU — Suivi en direct */}
            {isInProgress && (
              <TouchableOpacity style={styles.trackingBtn} onPress={goToLiveTracking}>
                <MapPin size={15} color="#FFF" strokeWidth={2} />
                <Text style={styles.trackingBtnTxt}>Suivre l'agent en direct</Text>
                <View style={styles.trackingDot} />
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* ── Pointages GPS ─────────────────────────────────────── */}
        <Card style={styles.timesCard}>
          <Text style={styles.sectionLabel}>Pointages GPS</Text>
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
            <Text style={styles.timeSub}>Date : {formatDate(booking.checkinAt)}</Text>
          )}
        </Card>

        {/* ── Incidents ─────────────────────────────────────────── */}
        {(booking.incidents ?? []).length > 0 && (
          <Card style={styles.incidentsCard}>
            <View style={styles.incidentHeader}>
              <AlertTriangle size={14} color={colors.warning} strokeWidth={2} />
              <Text style={styles.sectionLabel}>Incidents ({booking.incidents!.length})</Text>
            </View>
            {booking.incidents!.map((inc) => (
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

        {/* ── Actions ✨ ─────────────────────────────────────────── */}
        <View style={styles.actions}>
          {/* Signaler un incident (mission active) */}
          {isActive && (
            <Button
              label="Signaler un incident"
              onPress={() => setShowIncidentModal(true)}
              variant="secondary"
              fullWidth
            />
          )}

          {/* Évaluer l'agent (mission terminée, pas encore noté) */}
          {isCompleted && agent && !hasRating && (
            <TouchableOpacity style={styles.rateBtn} onPress={goToRateAgent}>
              <Star size={16} color={colors.warning} strokeWidth={2} />
              <Text style={styles.rateBtnTxt}>Évaluer l'agent</Text>
            </TouchableOpacity>
          )}

          {/* Déjà évalué */}
          {isCompleted && hasRating && (
            <View style={styles.ratedBanner}>
              <Star size={14} color={colors.warning} strokeWidth={2} fill={colors.warning} />
              <Text style={styles.ratedTxt}>Vous avez déjà évalué cette mission</Text>
            </View>
          )}

          {/* Ouvrir un litige (mission terminée ou en cours) */}
          {(isCompleted || isActive) && (
            <TouchableOpacity style={styles.disputeBtn} onPress={goToDispute}>
              <Flag size={14} color={colors.danger} strokeWidth={2} />
              <Text style={styles.disputeBtnTxt}>Ouvrir un litige</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── Modal sélection agent ───────────────────────────────── */}
      <Modal visible={showAgentModal} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <Text style={modal.title}>Sélectionner un agent</Text>
            <Text style={modal.subtitle}>
              {pendingApps.length} candidature{pendingApps.length > 1 ? 's' : ''} en attente
            </Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {pendingApps.map((app) => (
                <View key={app.id} style={modal.appRow}>
                  <Avatar fullName={app.agent?.fullName} avatarUrl={app.agent?.avatarUrl} size="md" />
                  <View style={modal.appInfo}>
                    <Text style={modal.appName}>{app.agent?.fullName ?? '—'}</Text>
                    <View style={modal.appMetaRow}>
                      <Star size={11} color={colors.warning} strokeWidth={2} />
                      <Text style={modal.appMeta}>
                        {app.agent?.avgRating?.toFixed(1) ?? '—'} · {app.agent?.completedCount ?? 0} missions
                        {app.agent?.isValidated ? ' · CNAPS ✓' : ''}
                      </Text>
                    </View>
                  </View>
                  <Button label="Choisir" onPress={() => handleSelectAgent(app.id)} loading={selectingAgent} size="sm" />
                </View>
              ))}
            </ScrollView>
            <View style={modal.btns}>
              <Button label="Fermer" onPress={() => setShowAgentModal(false)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal incident ──────────────────────────────────────── */}
      <Modal visible={showIncidentModal} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <Text style={modal.title}>Signaler un incident</Text>
            <TextInput
              style={modal.textInput}
              value={incidentDesc}
              onChangeText={setIncidentDesc}
              placeholder="Décrivez l'incident en détail…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={5}
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
const ApplicationRow: React.FC<{
  application: Application;
  onSelect: () => void;
  loading: boolean;
}> = ({ application, onSelect, loading }) => (
  <View style={appStyles.row}>
    <Avatar fullName={application.agent?.fullName} avatarUrl={application.agent?.avatarUrl} size="sm" />
    <View style={appStyles.info}>
      <Text style={appStyles.name}>{application.agent?.fullName ?? '—'}</Text>
      <View style={appStyles.metaRow}>
        <Star size={11} color={colors.warning} strokeWidth={2} />
        <Text style={appStyles.meta}>
          {application.agent?.avgRating?.toFixed(1) ?? '—'}
          {application.agent?.isValidated ? ' · CNAPS ✓' : ''}
        </Text>
      </View>
    </View>
    <TouchableOpacity onPress={onSelect} disabled={loading} style={appStyles.btn}>
      <UserCheck size={14} color={colors.primary} strokeWidth={2} />
      <Text style={appStyles.btnText}>Choisir</Text>
    </TouchableOpacity>
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
  row:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  info:    { flex: 1 },
  name:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    backgroundColor: colors.primarySurface, borderWidth: 1,
    borderColor: colors.borderPrimary, borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1] + 2,
  },
  btnText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
});

const timeStyles = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', gap: spacing[1] },
  value: { fontFamily: fontFamily.mono, fontSize: fontSize.xl, color: colors.textMuted },
  label: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: spacing[6], gap: spacing[4],
  },
  title:      { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4 },
  subtitle:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, marginTop: -spacing[2] },
  appRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  appInfo:    { flex: 1 },
  appName:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  appMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  appMeta:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  textInput: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing[4], fontFamily: fontFamily.body,
    fontSize: fontSize.base, color: colors.textPrimary, minHeight: 100,
  },
  btns: { flexDirection: 'row', gap: spacing[3], justifyContent: 'flex-end' },
});

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  content:   { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[10], gap: spacing[4] },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing[4] },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  duration:    { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.textSecondary },
  sectionLabel:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  applicationsCard: { gap: spacing[2] },
  appHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] },
  appHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  moreApps:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing[2] },

  waitingCard: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.surface },
  waitingText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },

  agentCard: { gap: spacing[3] },
  agentRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  agentInfo: { flex: 1, gap: spacing[2] },
  agentName: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textPrimary, letterSpacing: -0.2 },
  agentMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  agentRating:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  agentMissions: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },

  // ✨ Tracking button
  trackingBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], backgroundColor: '#1E40AF',
    borderRadius: radius.lg, paddingVertical: 12,
  },
  trackingBtnTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: '#FFF', flex: 1 },
  trackingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E', shadowRadius: 4, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
  },

  timesCard:   { gap: 0 },
  timeRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] },
  timeDivider: { width: 1, height: 40, backgroundColor: colors.border, marginHorizontal: spacing[4] },
  timeSub:     { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },

  incidentsCard:  { gap: spacing[3] },
  incidentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  incidentItem:   { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' },
  incidentDesc:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  incidentDate:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  actions: { gap: spacing[3] },

  // ✨ Rate button
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], borderWidth: 1.5, borderColor: colors.warning,
    borderRadius: radius.lg, paddingVertical: 12,
  },
  rateBtnTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.warning },

  // ✨ Rated banner
  ratedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], backgroundColor: '#FFFBEB',
    borderRadius: radius.lg, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  ratedTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#92400E' },

  // ✨ Dispute button
  disputeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], paddingVertical: 10,
  },
  disputeBtnTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger },
});
