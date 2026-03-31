/**
 * MissionDetailScreen — vue complète d'une mission.
 * Icônes : lucide-react-native
 */
import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, Alert, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Calendar, Clock, MapPin, Radio, Banknote,
  CalendarDays, MessageSquare, Users, ChevronRight,
  AlertTriangle, FileText,
} from 'lucide-react-native';
import { missionsApi } from '@api/endpoints/missions';
import { useApi }      from '@hooks/useApi';
import { BookingCard } from '@components/domain/BookingCard';
import { Badge }       from '@components/ui/Badge';
import { Button }      from '@components/ui/Button';
import { Card }        from '@components/ui/Card';
import { LoadingState } from '@components/ui/LoadingState';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Separator }    from '@components/ui/Separator';
import { colors }       from '@theme/colors';
import { spacing, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatMissionRange, formatCurrency, formatDate } from '@utils/formatters';
import { MISSION_STATUS_LABEL, MISSION_STATUS_COLOR } from '@utils/statusHelpers';
import { isCancellableMission } from '@utils/typeGuards';
import { MissionStatus }        from '@constants/enums';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionDetail'>;

export const MissionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId }                              = route.params;
  const { data: mission, loading, execute, error } = useApi(missionsApi.getById);

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  const handleCancel = () => {
    Alert.alert(
      'Annuler la mission',
      'Cette action est irréversible. Continuer ?',
      [
        { text: 'Retour', style: 'cancel' },
        {
          text:    'Annuler la mission',
          style:   'destructive',
          onPress: async () => {
            try {
              await missionsApi.cancel(missionId);
              load();
            } catch (e: unknown) {
              const msg = (e as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ?? "Impossible d'annuler";
              Alert.alert('Erreur', msg);
            }
          },
        },
      ],
    );
  };

  if (loading && !mission) return <LoadingState message="Chargement…" />;
  if (error || !mission) return (
    <View style={styles.screen}>
      <ScreenHeader title="Mission" onBack={() => navigation.goBack()} />
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>Impossible de charger la mission.</Text>
        <Button label="Réessayer" onPress={load} variant="ghost" />
      </View>
    </View>
  );

  const statusLabel = MISSION_STATUS_LABEL[mission.status] ?? mission.status;
  const statusColor = MISSION_STATUS_COLOR[mission.status] ?? colors.textMuted;
  const canCancel   = isCancellableMission(mission);
  const hasQuote    = Boolean(mission.quote);
  const bookings    = mission.bookings ?? [];

  const openBookings    = bookings.filter((b) => b.status === 'OPEN');
  const hasApplications = openBookings.some((b) => (b.applications?.length ?? 0) > 0);

  const cta = (() => {
    if (mission.status === MissionStatus.DRAFT && !hasQuote)
      return { label: 'Obtenir un devis', onPress: () => navigation.navigate('QuoteDetail', { missionId }) };
    if (mission.status === MissionStatus.DRAFT && hasQuote)
      return { label: 'Voir le devis',    onPress: () => navigation.navigate('QuoteDetail', { missionId }) };
    if (mission.status === MissionStatus.CONFIRMED)
      return { label: 'Voir le devis & payer', onPress: () => navigation.navigate('QuoteDetail', { missionId }) };
    if (mission.status === MissionStatus.PUBLISHED && hasApplications)
      return { label: 'Sélectionner les agents', onPress: () => navigation.navigate('QuoteDetail', { missionId }) };
    if (mission.status === MissionStatus.PUBLISHED)
      return { label: 'En attente de candidatures…', onPress: () => {} };
    if (mission.status === MissionStatus.COMPLETED)
      return { label: 'Messagerie', onPress: () => navigation.navigate('Conversation', { missionId }) };
    return null;
  })();

  const displayTitle = mission.title?.trim() || `Mission à ${mission.city}`;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Détail mission"
        onBack={() => navigation.goBack()}
        rightAction={
          (mission.status === MissionStatus.PUBLISHED ||
           mission.status === MissionStatus.IN_PROGRESS) ? (
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => navigation.navigate('Conversation', { missionId })}
            >
              <MessageSquare size={22} color={colors.primary} strokeWidth={1.8} />
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
        {/* Hero */}
        <View style={styles.hero}>
          <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
          <Text style={styles.title}>{displayTitle}</Text>
          {mission.isUrgent && (
            <View style={styles.urgencyBadge}>
              <AlertTriangle size={12} color={colors.warning} strokeWidth={2} />
              <Text style={styles.urgencyText}>Mission urgente — majoration appliquée</Text>
            </View>
          )}
        </View>

        {/* Infos générales */}
        <Card style={styles.infoCard}>
          <InfoRow Icon={Calendar}    label="Période"   value={formatMissionRange(mission.startAt, mission.endAt)} />
          <Separator marginV={spacing[3]} />
          <InfoRow Icon={Clock}       label="Durée"     value={`${mission.durationHours}h`} />
          <Separator marginV={spacing[3]} />
          <InfoRow Icon={MapPin}      label="Adresse"   value={`${mission.address}, ${mission.city}${mission.zipCode ? ' ' + mission.zipCode : ''}`} />
          <Separator marginV={spacing[3]} />
          <InfoRow Icon={Radio}       label="Rayon"     value={`${mission.radiusKm} km`} />
          {mission.quote && (
            <>
              <Separator marginV={spacing[3]} />
              <InfoRow
                Icon={Banknote}
                label="Total TTC"
                value={formatCurrency(mission.quote.totalWithVat * 100)}
                valueStyle={{ color: colors.primary }}
              />
            </>
          )}
          <Separator marginV={spacing[3]} />
          <InfoRow Icon={CalendarDays} label="Créée le" value={formatDate(mission.createdAt)} />
        </Card>

        {/* Notes */}
        {mission.notes ? (
          <Card style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <FileText size={14} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.sectionLabel}>Notes & consignes</Text>
            </View>
            <Text style={styles.notesText}>{mission.notes}</Text>
          </Card>
        ) : null}

        {/* Bookings */}
        {bookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={16} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.sectionTitle}>Postes ({bookings.length})</Text>
            </View>
            {bookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                perspective="client"
                onPress={() => navigation.navigate('BookingDetail', { bookingId: b.id })}
              />
            ))}
          </View>
        )}

        {cta && (
          <Button
            label={cta.label}
            onPress={cta.onPress}
            fullWidth
            size="lg"
            style={styles.ctaBtn}
            disabled={mission.status === MissionStatus.PUBLISHED && !hasApplications}
          />
        )}

        {canCancel && (
          <Button
            label="Annuler la mission"
            onPress={handleCancel}
            fullWidth
            variant="danger"
            size="sm"
            style={styles.cancelBtn}
          />
        )}
      </ScrollView>
    </View>
  );
};

// ── InfoRow ───────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{
  Icon: React.FC<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  value: string;
  valueStyle?: object;
}> = ({ Icon, label, value, valueStyle }) => (
  <View style={infoStyles.row}>
    <View style={infoStyles.left}>
      <Icon size={15} color={colors.textMuted} strokeWidth={1.8} />
      <Text style={infoStyles.label}>{label}</Text>
    </View>
    <Text style={[infoStyles.value, valueStyle]} numberOfLines={2}>{value}</Text>
  </View>
);

const infoStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[4] },
  left:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textPrimary, flex: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.background },
  flex:      { flex: 1 },
  content:   { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[12] },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  errorText: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary },
  chatBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  hero:       { paddingTop: spacing[5], paddingBottom: spacing[4], gap: spacing[2] },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.6,
    marginTop:     spacing[2],
  },
  urgencyBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing[1] + 2,
    backgroundColor: colors.warningSurface,
    borderRadius:    8,
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[1] + 2,
    borderWidth:     1,
    borderColor:     colors.warning,
    alignSelf:       'flex-start',
  },
  urgencyText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.warning },

  infoCard:    { marginBottom: spacing[4] },
  notesCard:   { marginBottom: spacing[4], gap: spacing[2] },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionLabel:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  notesText:   { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, lineHeight: fontSize.base * 1.6 },

  section:      { marginBottom: spacing[4] },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] },
  sectionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3 },

  ctaBtn:    { marginBottom: spacing[3] },
  cancelBtn: { opacity: 0.8 },
});
