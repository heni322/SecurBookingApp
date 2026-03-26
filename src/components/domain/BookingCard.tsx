/**
 * BookingCard — carte résumé d'un booking (poste de mission).
 * Utilise AgentSummary (pas AgentProfile) côté client.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card }   from '@components/ui/Card';
import { Badge }  from '@components/ui/Badge';
import { Avatar } from '@components/ui/Avatar';
import { colors }   from '@theme/colors';
import { spacing }  from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatMissionRange, formatDuration } from '@utils/formatters';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from '@utils/statusHelpers';
import type { Booking } from '@models/index';

interface Props {
  booking:      Booking;
  onPress:      () => void;
  perspective?: 'agent' | 'client';
}

export const BookingCard: React.FC<Props> = ({
  booking,
  onPress,
  perspective = 'client',
}) => {
  const statusLabel = BOOKING_STATUS_LABEL[booking.status] ?? booking.status;
  const statusColor = BOOKING_STATUS_COLOR[booking.status] ?? colors.textMuted;
  const agent       = booking.agent;   // AgentSummary — fullName, avatarUrl, avgRating, completedCount
  const mission     = booking.mission;

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
      <Card style={styles.card}>
        {/* Top row */}
        <View style={styles.topRow}>
          <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
          {booking.durationMin !== undefined && (
            <Text style={styles.duration}>{formatDuration(booking.durationMin)}</Text>
          )}
        </View>

        {/* Mission info (agent perspective) */}
        {perspective === 'agent' && mission && (
          <>
            <Text style={styles.missionTitle} numberOfLines={1}>{mission.title}</Text>
            <Text style={styles.meta}>🗓 {formatMissionRange(mission.startAt, mission.endAt)}</Text>
            <Text style={styles.meta} numberOfLines={1}>📍 {mission.location.city}</Text>
          </>
        )}

        {/* Agent info (client perspective) */}
        {perspective === 'client' && agent && (
          <View style={styles.agentRow}>
            <Avatar
              fullName={agent.fullName}
              avatarUrl={agent.avatarUrl}
              size="sm"
            />
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>{agent.fullName}</Text>
              <Text style={styles.agentRating}>
                ★ {agent.avgRating.toFixed(1)} · {agent.completedCount} missions
              </Text>
            </View>
          </View>
        )}

        {/* No agent yet */}
        {perspective === 'client' && !agent && (
          <Text style={styles.meta}>👥 En attente de candidatures</Text>
        )}

        {/* Timestamps */}
        {(booking.checkinAt || booking.checkoutAt) && (
          <View style={styles.timestamps}>
            {booking.checkinAt && (
              <Text style={styles.timestamp}>
                ✅ Arrivée{' '}
                {new Date(booking.checkinAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            )}
            {booking.checkoutAt && (
              <Text style={styles.timestamp}>
                🏁 Départ{' '}
                {new Date(booking.checkoutAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card:         { marginBottom: spacing[3], gap: spacing[2] },
  topRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  duration:     { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.textSecondary },
  missionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textPrimary, letterSpacing: -0.3 },
  meta:         { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  agentRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[1] },
  agentInfo:    { flex: 1 },
  agentName:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  agentRating:  { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.primary },
  timestamps: {
    marginTop:      spacing[2],
    gap:            spacing[1],
    paddingTop:     spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timestamp: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
});
