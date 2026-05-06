/**
 * SelectCreneauScreen — Sélection du créneau (poste à pourvoir).
 *
 * Quand une mission a plusieurs MissionSlot ou plusieurs bookings OPEN,
 * le client choisit ici quel poste il veut staffer en premier. Chaque tile
 * affiche le créneau (date + heures), le service demandé, et l'état du poste
 * (OPEN/ASSIGNED/etc.). Tap sur un tile OPEN → SelectAgent.
 *
 * Si la mission n'a qu'un seul booking OPEN, MissionDetailScreen route
 * directement vers SelectAgent en sautant cette étape.
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Calendar, Clock, ChevronRight, CheckCircle2, MapPin, Users, Lock,
} from 'lucide-react-native';
import { missionsApi } from '@api/endpoints/missions';
import { useApi } from '@hooks/useApi';
import { Card } from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { LoadingState } from '@components/ui/LoadingState';
import { EmptyState } from '@components/ui/EmptyState';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { colors } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatDate, formatTime } from '@utils/formatters';
import { BookingStatus } from '@constants/enums';
import type { Booking, MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'SelectCreneau'>;

// Status colors for the booking pills
const BOOKING_STATUS_COLOR: Record<string, string> = {
  OPEN:        colors.warning,
  ASSIGNED:    colors.success,
  IN_PROGRESS: colors.danger,
  COMPLETED:   colors.textMuted,
  CANCELLED:   colors.textMuted,
  ABANDONED:   colors.textMuted,
};

const BOOKING_STATUS_LABEL: Record<string, string> = {
  OPEN:        'À pourvoir',
  ASSIGNED:    'Pourvu',
  IN_PROGRESS: 'En cours',
  COMPLETED:   'Terminé',
  CANCELLED:   'Annulé',
  ABANDONED:   'Abandonné',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — group bookings by their slot (or "no-slot" bucket)
// ─────────────────────────────────────────────────────────────────────────────

interface SlotGroup {
  /** Slot id, or 'mission' for legacy single-slot missions. */
  key:           string;
  startAt:       string;
  endAt:         string;
  durationHours: number;
  slotIndex?:    number;
  bookings:      Booking[];
}

function groupBookingsBySlot(
  bookings: Booking[],
  mission: { startAt: string; endAt: string; durationHours: number; slots?: any[] },
): SlotGroup[] {
  // Multi-slot path : each booking has slotId
  if (mission.slots && mission.slots.length > 0) {
    const groups: SlotGroup[] = [];
    for (const slot of mission.slots) {
      const slotBookings = bookings.filter((b: any) => b.slotId === slot.id);
      if (slotBookings.length === 0) continue;
      groups.push({
        key:           slot.id,
        startAt:       slot.startAt,
        endAt:         slot.endAt,
        durationHours: slot.durationHours,
        slotIndex:     slot.slotIndex,
        bookings:      slotBookings,
      });
    }
    // Bookings without a slotId fall in the "mission" bucket
    const orphans = bookings.filter((b: any) => !b.slotId);
    if (orphans.length > 0) {
      groups.push({
        key:           'mission',
        startAt:       mission.startAt,
        endAt:         mission.endAt,
        durationHours: mission.durationHours,
        bookings:      orphans,
      });
    }
    return groups.sort((a, b) =>
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }

  // Single-slot path : everything in one bucket
  return [{
    key:           'mission',
    startAt:       mission.startAt,
    endAt:         mission.endAt,
    durationHours: mission.durationHours,
    bookings,
  }];
}

// ─────────────────────────────────────────────────────────────────────────────

export const SelectCreneauScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId } = route.params;
  const { data: mission, loading, execute } = useApi(missionsApi.getById);

  const load = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    if (!mission) return [];
    return groupBookingsBySlot(mission.bookings ?? [], mission);
  }, [mission]);

  const totalOpen = useMemo(() => {
    return groups.reduce(
      (sum, g) => sum + g.bookings.filter(b => b.status === BookingStatus.OPEN).length,
      0,
    );
  }, [groups]);

  // Auto-skip : single OPEN booking → straight to SelectAgent
  useEffect(() => {
    if (!mission || loading) return;
    const openBookings = (mission.bookings ?? []).filter(b => b.status === BookingStatus.OPEN);
    if (openBookings.length === 1) {
      navigation.replace('SelectAgent', { bookingId: openBookings[0].id });
    }
  }, [mission, loading, navigation]);

  if (loading && !mission) return <LoadingState message="Chargement des créneaux…" />;

  if (!mission) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Choisir un créneau" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Mission introuvable"
          subtitle="Impossible de charger les créneaux de cette mission."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Choisir un créneau" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
        }
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            {totalOpen > 0
              ? `${totalOpen} poste${totalOpen > 1 ? 's' : ''} à pourvoir`
              : 'Tous les postes sont pourvus'}
          </Text>
          <Text style={styles.heroSubtitle}>
            Sélectionnez un créneau pour choisir un agent.
          </Text>
        </View>

        {/* ── Groups ───────────────────────────────────────────────────── */}
        {groups.length === 0 && (
          <EmptyState
            title="Aucun poste"
            subtitle="Cette mission n'a pas encore de poste à pourvoir."
          />
        )}

        {groups.map((g, gIdx) => (
          <View key={g.key} style={styles.group}>
            {/* Slot header — only show when there are multiple slots */}
            {groups.length > 1 && (
              <View style={styles.slotHeader}>
                <View style={styles.slotHeaderRow}>
                  <Calendar size={14} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.slotHeaderText}>
                    Créneau {(g.slotIndex ?? gIdx) + 1} · {formatDate(g.startAt)}
                  </Text>
                </View>
                <View style={styles.slotHeaderRow}>
                  <Clock size={12} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.slotHours}>
                    {formatTime(g.startAt)} → {formatTime(g.endAt)} ·{' '}
                    {g.durationHours}h
                  </Text>
                </View>
              </View>
            )}

            {/* Booking tiles */}
            {g.bookings.map((b, bIdx) => {
              const statusColor = BOOKING_STATUS_COLOR[b.status] ?? colors.textMuted;
              const statusLabel = BOOKING_STATUS_LABEL[b.status] ?? b.status;
              const isOpen      = b.status === BookingStatus.OPEN;
              const isAssigned  = b.status === BookingStatus.ASSIGNED && b.agent != null;

              return (
                <TouchableOpacity
                  key={b.id}
                  activeOpacity={isOpen ? 0.85 : 1}
                  onPress={() => isOpen && navigation.navigate('SelectAgent', { bookingId: b.id })}
                  disabled={!isOpen}
                >
                  <Card style={[styles.tile, ...(!isOpen ? [styles.tileDisabled] : [])] as ViewStyle[]}>
                    {/* Left icon */}
                    <View
                      style={[
                        styles.iconBubble,
                        { backgroundColor: statusColor + '22', borderColor: statusColor + '55' },
                      ]}
                    >
                      {isOpen      && <Users         size={18} color={statusColor} strokeWidth={2} />}
                      {isAssigned  && <CheckCircle2  size={18} color={statusColor} strokeWidth={2} />}
                      {!isOpen && !isAssigned && <Lock size={16} color={statusColor} strokeWidth={2} />}
                    </View>

                    {/* Body */}
                    <View style={styles.tileBody}>
                      <View style={styles.tileTopRow}>
                        <Text style={styles.tileTitle} numberOfLines={1}>
                          Poste {bIdx + 1}
                          {b.serviceType?.name ? ` · ${b.serviceType.name}` : ''}
                        </Text>
                        <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
                      </View>

                      {b.uniform && (
                        <Text style={styles.tileMeta}>Tenue : {b.uniform}</Text>
                      )}

                      {isAssigned && b.agent && (
                        <View style={styles.tileAgentRow}>
                          <MapPin size={11} color={colors.success} strokeWidth={2} />
                          <Text style={styles.tileAgent} numberOfLines={1}>
                            {b.agent.fullName}
                          </Text>
                        </View>
                      )}

                      {isOpen && (
                        <Text style={styles.tileCta}>Choisir un agent →</Text>
                      )}
                    </View>

                    {isOpen && (
                      <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
    paddingBottom:     spacing[12],
    gap:               spacing[5],
  },

  // Hero
  hero:        { gap: spacing[1] },
  heroTitle:   {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize['2xl'],
    color:         colors.textPrimary,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },

  // Groups
  group: { gap: spacing[3] },

  slotHeader:    { gap: spacing[1], marginBottom: spacing[1] },
  slotHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  slotHeaderText: {
    fontFamily:    fontFamily.bodySemiBold,
    fontSize:      fontSize.sm,
    color:         colors.primary,
    letterSpacing: -0.2,
  },
  slotHours: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },

  // Tile
  tile: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[3],
    padding:       spacing[3],
  },
  tileDisabled: { opacity: 0.55 },

  iconBubble: {
    width:           38,
    height:          38,
    borderRadius:    radius.lg,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
  },

  tileBody:    { flex: 1, gap: spacing[1] },
  tileTopRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2], justifyContent: 'space-between' },
  tileTitle:   {
    fontFamily:    fontFamily.bodySemiBold,
    fontSize:      fontSize.base,
    color:         colors.textPrimary,
    letterSpacing: -0.2,
    flex:          1,
  },
  tileMeta: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  tileAgentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  tileAgent: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.success,
  },
  tileCta: {
    fontFamily:    fontFamily.bodySemiBold,
    fontSize:      fontSize.xs,
    color:         colors.primary,
    letterSpacing: 0.3,
  },
});
