/**
 * BookingDetailScreen — détail d'un booking côté client.
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView,
  Alert, TextInput, Modal, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { bookingsApi }  from '@api/endpoints/bookings';
import { ratingsApi }   from '@api/endpoints/ratings';
import { useApi }       from '@hooks/useApi';
import { useAuthStore } from '@store/authStore';
import { Avatar }       from '@components/ui/Avatar';
import { Badge }        from '@components/ui/Badge';
import { Button }       from '@components/ui/Button';
import { Card }         from '@components/ui/Card';
import { LoadingState } from '@components/ui/LoadingState';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Separator }    from '@components/ui/Separator';
import { StarRating }   from '@components/ui/StarRating';
import { colors }       from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatDate, formatTime, formatDuration } from '@utils/formatters';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from '@utils/statusHelpers';
import { isActiveBooking }         from '@utils/typeGuards';
import { BookingStatus }           from '@constants/enums';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'BookingDetail'>;

export const BookingDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId }                             = route.params;
  const { user }                                  = useAuthStore();
  const { data: booking, loading, execute }       = useApi(bookingsApi.getById);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showRatingModal,   setShowRatingModal]   = useState(false);
  const [incidentDesc,      setIncidentDesc]      = useState('');
  const [ratingScore,       setRatingScore]       = useState(0);
  const [ratingComment,     setRatingComment]     = useState('');
  const [submitting,        setSubmitting]        = useState(false);

  const load = useCallback(() => execute(bookingId), [execute, bookingId]);
  useEffect(() => { load(); }, [load]);

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
    } finally {
      setSubmitting(false);
    }
  };

  const handleRate = async () => {
    if (!booking?.agentId || ratingScore === 0) return;
    setSubmitting(true);
    try {
      await ratingsApi.create({
        targetId: booking.agentId,
        bookingId,
        score:    ratingScore,
        comment:  ratingComment.trim() || undefined,
      });
      setShowRatingModal(false);
      Alert.alert('Merci !', 'Votre évaluation a été enregistrée.');
      load();
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer l'évaluation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !booking) return <LoadingState message="Chargement…" />;
  if (!booking) return (
    <View style={styles.screen}>
      <ScreenHeader title="Booking" onBack={() => navigation.goBack()} />
    </View>
  );

  const statusLabel = BOOKING_STATUS_LABEL[booking.status] ?? booking.status;
  const statusColor = BOOKING_STATUS_COLOR[booking.status] ?? colors.textMuted;
  const agent       = booking.agent;
  const isCompleted = booking.status === BookingStatus.COMPLETED;
  const isActive    = isActiveBooking(booking);      // ← remplace `as any`

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Détail du poste" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status + durée */}
        <View style={styles.statusRow}>
          <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
          {booking.durationMin !== undefined && (
            <Text style={styles.duration}>{formatDuration(booking.durationMin)}</Text>
          )}
        </View>

        {/* Agent assigné */}
        {agent ? (
          <Card style={styles.agentCard}>
            <Text style={styles.sectionLabel}>Agent assigné</Text>
            <View style={styles.agentRow}>
              <Avatar fullName={agent.fullName} avatarUrl={agent.avatarUrl} size="lg" online={isActive} />
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{agent.fullName}</Text>
                <View style={styles.agentMeta}>
                  {agent.isValidated && (
                    <Badge label="CNAPS" color={colors.success} bg={colors.successSurface} />
                  )}
                  <Text style={styles.agentRating}>★ {agent.avgRating.toFixed(1)}</Text>
                  <Text style={styles.agentMissions}>{agent.completedCount} missions</Text>
                </View>
              </View>
            </View>
          </Card>
        ) : (
          <Card style={styles.noAgentCard}>
            <Text style={styles.noAgentText}>
              👥 Aucun agent assigné — en attente de candidatures.
            </Text>
          </Card>
        )}

        {/* Pointages */}
        <Card style={styles.timesCard}>
          <Text style={styles.sectionLabel}>Pointages</Text>
          <View style={styles.timeRow}>
            <TimeItem
              label="Check-in"
              value={booking.checkinAt ? formatTime(booking.checkinAt) : '—'}
              icon="📍"
              active={Boolean(booking.checkinAt)}
            />
            <View style={styles.timeDivider} />
            <TimeItem
              label="Check-out"
              value={booking.checkoutAt ? formatTime(booking.checkoutAt) : '—'}
              icon="🏁"
              active={Boolean(booking.checkoutAt)}
            />
          </View>
          {booking.checkinAt && (
            <Text style={styles.timeSub}>Date : {formatDate(booking.checkinAt)}</Text>
          )}
        </Card>

        {/* Incidents */}
        {(booking.incidents ?? []).length > 0 && (
          <Card style={styles.incidentsCard}>
            <Text style={styles.sectionLabel}>
              Incidents signalés ({booking.incidents!.length})
            </Text>
            {booking.incidents!.map((inc) => (
              <View key={inc.id} style={styles.incidentItem}>
                <Text style={styles.incidentIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.incidentDesc}>{inc.description}</Text>
                  <Text style={styles.incidentDate}>{formatDate(inc.createdAt)}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {isActive && (
            <Button
              label="⚠️  Signaler un incident"
              onPress={() => setShowIncidentModal(true)}
              variant="secondary"
              fullWidth
            />
          )}
          {isCompleted && agent && (
            <Button
              label="⭐  Évaluer l'agent"
              onPress={() => setShowRatingModal(true)}
              variant="ghost"
              fullWidth
            />
          )}
        </View>
      </ScrollView>

      {/* Incident Modal */}
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

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <Text style={modal.title}>Évaluer l'agent</Text>
            <Text style={modal.ratingName}>{agent?.fullName}</Text>
            <StarRating value={ratingScore} onChange={setRatingScore} size={36} />
            <TextInput
              style={modal.textInput}
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Commentaire (optionnel)"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={modal.btns}>
              <Button label="Annuler" onPress={() => setShowRatingModal(false)} variant="ghost" />
              <Button
                label="Soumettre"
                onPress={handleRate}
                loading={submitting}
                disabled={ratingScore === 0}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const TimeItem: React.FC<{ label: string; value: string; icon: string; active: boolean }> = ({
  label, value, icon, active,
}) => (
  <View style={timeStyles.wrap}>
    <Text style={timeStyles.icon}>{icon}</Text>
    <Text style={[timeStyles.value, active && timeStyles.valueActive]}>{value}</Text>
    <Text style={timeStyles.label}>{label}</Text>
  </View>
);

const timeStyles = StyleSheet.create({
  wrap:        { flex: 1, alignItems: 'center', gap: spacing[1] },
  icon:        { fontSize: 22 },
  value:       { fontFamily: fontFamily.mono, fontSize: fontSize.xl, color: colors.textMuted },
  valueActive: { color: colors.textPrimary },
  label:       { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
});

const modal = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: spacing[6], gap: spacing[4],
  },
  title:      { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4 },
  ratingName: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textSecondary },
  textInput: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing[4], fontFamily: fontFamily.body,
    fontSize: fontSize.base, color: colors.textPrimary, minHeight: 100,
  },
  btns: { flexDirection: 'row', gap: spacing[3], justifyContent: 'flex-end' },
});

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.background },
  content:      { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[10], gap: spacing[4] },
  statusRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing[4] },
  duration:     { fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.textSecondary },
  sectionLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing[3] },
  agentCard:    { gap: 0 },
  agentRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  agentInfo:    { flex: 1, gap: spacing[2] },
  agentName:    { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textPrimary, letterSpacing: -0.2 },
  agentMeta:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  agentRating:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
  agentMissions:{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  noAgentCard:  { backgroundColor: colors.surface },
  noAgentText:  { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  timesCard:    { gap: 0 },
  timeRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] },
  timeDivider:  { width: 1, height: 40, backgroundColor: colors.border, marginHorizontal: spacing[4] },
  timeSub:      { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  incidentsCard:{ gap: spacing[3] },
  incidentItem: { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' },
  incidentIcon: { fontSize: 18 },
  incidentDesc: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  incidentDate: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  actions:      { gap: spacing[3] },
});
