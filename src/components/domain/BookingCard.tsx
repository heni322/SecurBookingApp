/**
 * BookingCard — carte résumé d'un booking (poste de mission).
 * Utilise AgentSummary (pas AgentProfile) côté client.
 *
 * Fix: BOOKING_STATUS_LABEL was imported from statusHelpers but does not
 * exist there (same pattern as MISSION_STATUS_LABEL — labels live in i18n).
 * Metro resolved the named import to `undefined` → crash at line 28:
 *   TypeError: Cannot convert undefined value to object
 * Fix: removed the dead import, added BOOKING_STATUS_I18N_KEY static map,
 * use t('statuses.*') from the booking namespace.
 *
 * v2 (2026-10-07, device QA on MissionDetail):
 *  - Agent rendered as "?" avatar, no name, "★ — · 0 missions": the API sent
 *    raw agent columns, not AgentSummary (fixed server-side, toAgentSummary).
 *    The card now also degrades gracefully: missing name → "Agent assigné",
 *    unrated → "Nouvel agent" instead of a bare dash, singular "1 mission".
 *  - Emoji (✅ 🏁 🗓 📍 👥) replaced with lucide icons — emoji render
 *    differently per OEM and clashed with the line-icon system.
 *  - Hardcoded French ("Arrivée", "Départ", "missions", "En attente de
 *    candidatures") and fr-FR time formatting now go through i18n.
 *  - Service type shown in the header (which post this is).
 *  - Chevron added: the whole card navigates, but nothing said so.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  ChevronRight, LogIn, LogOut, Star, Users, CalendarDays, MapPin,
} from 'lucide-react-native';
import { Card }   from '@components/ui/Card';
import { Badge }  from '@components/ui/Badge';
import { Avatar } from '@components/ui/Avatar';
import { colors }   from '@theme/colors';
import { spacing }  from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatMissionRange, formatDuration } from '@utils/formatters';
import { BOOKING_STATUS_COLOR } from '@utils/statusHelpers';
import { BookingStatus }        from '@constants/enums';
import type { BookingNS }       from '@i18n/locales/types';
import { useTranslation }       from '@i18n';
import i18n from '@i18n';
import type { Booking }         from '@models/index';
import { inParis } from '@utils/parisTime';

interface Props {
  booking:      Booking;
  onPress:      () => void;
  perspective?: 'agent' | 'client';
}

const BOOKING_STATUS_I18N_KEY: Record<BookingStatus, keyof BookingNS['statuses']> = {
  [BookingStatus.OPEN]:        'open',
  [BookingStatus.ASSIGNED]:    'assigned',
  [BookingStatus.IN_PROGRESS]: 'in_progress',
  [BookingStatus.COMPLETED]:   'completed',
  [BookingStatus.CANCELLED]:   'cancelled',
  [BookingStatus.ABANDONED]:   'abandoned',
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString(i18n.language, inParis({ hour: '2-digit', minute: '2-digit' }));

export const BookingCard: React.FC<Props> = ({
  booking,
  onPress,
  perspective = 'client',
}) => {
  const { t } = useTranslation('booking');

  const statusLabel = t(`statuses.${BOOKING_STATUS_I18N_KEY[booking.status as BookingStatus]}`);
  const statusColor = BOOKING_STATUS_COLOR[booking.status] ?? colors.textMuted;
  const agent       = booking.agent;
  const mission     = booking.mission;
  const serviceName = booking.serviceType?.name?.trim();

  const agentName  = agent?.fullName?.trim() || t('agent.assigned_label');
  const rating     = typeof agent?.avgRating === 'number' && agent.avgRating > 0 ? agent.avgRating : null;
  const doneCount  = agent?.completedCount ?? 0;
  const statsLabel = rating === null && doneCount === 0
    ? t('agent.new_agent')
    : t(doneCount === 1 ? 'agent.missions_count_one' : 'agent.missions_count', { count: doneCount });

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[serviceName, statusLabel, perspective === 'client' && agent ? agentName : null]
        .filter(Boolean).join(', ')}
    >
      <Card style={styles.card}>
        {/* Top row */}
        <View style={styles.topRow}>
          <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
          {serviceName ? (
            <Text style={styles.serviceName} numberOfLines={1}>{serviceName}</Text>
          ) : <View style={styles.flex} />}
          {booking.durationMin !== undefined && (
            <Text style={styles.duration}>{formatDuration(booking.durationMin)}</Text>
          )}
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
        </View>

        {/* Mission info (agent perspective) */}
        {perspective === 'agent' && mission && (
          <>
            <Text style={styles.missionTitle} numberOfLines={1}>
              {mission.title?.trim() || i18n.t('missions:card_fallback_title', { city: mission.city })}
            </Text>
            <View style={styles.metaRow}>
              <CalendarDays size={13} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.meta}>{formatMissionRange(mission.startAt, mission.endAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={13} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.meta} numberOfLines={1}>{mission.city}</Text>
            </View>
          </>
        )}

        {/* Agent info (client perspective) */}
        {perspective === 'client' && agent && (
          <View style={styles.agentRow}>
            <Avatar fullName={agentName} avatarUrl={agent.avatarUrl} size="md" />
            <View style={styles.agentInfo}>
              <Text style={styles.agentName} numberOfLines={1}>{agentName}</Text>
              <View style={styles.metaRow}>
                {rating !== null && (
                  <>
                    <Star size={12} color={colors.primary} fill={colors.primary} strokeWidth={1.5} />
                    <Text style={styles.agentRating}>{rating.toFixed(1)}</Text>
                    <Text style={styles.dot}>·</Text>
                  </>
                )}
                <Text style={styles.agentStats}>{statsLabel}</Text>
              </View>
            </View>
          </View>
        )}

        {/* No agent yet */}
        {perspective === 'client' && !agent && (
          <View style={styles.metaRow}>
            <Users size={14} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.meta}>{t('agent.awaiting_agent')}</Text>
          </View>
        )}

        {/* Timestamps */}
        {(booking.checkinAt || booking.checkoutAt) && (
          <View style={styles.timestamps}>
            {booking.checkinAt && (
              <View style={styles.metaRow}>
                <LogIn size={14} color={colors.success} strokeWidth={2} />
                <Text style={styles.timestamp}>
                  {t('agent.checkin_at', { time: formatTime(booking.checkinAt) })}
                </Text>
              </View>
            )}
            {booking.checkoutAt && (
              <View style={styles.metaRow}>
                <LogOut size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.timestamp}>
                  {t('agent.checkout_at', { time: formatTime(booking.checkoutAt) })}
                </Text>
              </View>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card:         { gap: spacing[3] },
  flex:         { flex: 1 },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  serviceName:  { flex: 1, fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  duration:     { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.textSecondary },
  missionTitle: { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textPrimary, letterSpacing: -0.3 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  meta:         { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  agentRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  agentInfo:    { flex: 1, gap: 3 },
  agentName:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.textPrimary },
  agentRating:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
  dot:          { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
  agentStats:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
  timestamps: {
    gap:            spacing[2],
    paddingTop:     spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timestamp: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
});
