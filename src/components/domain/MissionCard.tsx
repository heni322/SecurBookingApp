/**
 * MissionCard — Premium mission list item.
 * Senior UI: status accent strip, rich info density, price callout.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, MapPin, Clock, Zap, ChevronRight } from 'lucide-react-native';
import { Badge } from '@components/ui/Badge';
import { colors }  from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatMissionRange, formatCurrency } from '@utils/formatters';
import { MISSION_STATUS_LABEL, MISSION_STATUS_COLOR } from '@utils/statusHelpers';
import type { Mission } from '@models/index';

interface Props {
  mission:  Mission;
  onPress:  () => void;
  compact?: boolean;
}

export const MissionCard: React.FC<Props> = ({ mission, onPress, compact = false }) => {
  const statusLabel  = MISSION_STATUS_LABEL[mission.status] ?? mission.status;
  const statusColor  = MISSION_STATUS_COLOR[mission.status] ?? colors.textMuted;
  const totalTTC     = mission.quote?.totalWithVat;
  const displayTitle = mission.title?.trim() || `Mission à ${mission.city}`;

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.touch}>
      <View style={styles.card}>

        {/* Left accent bar + status indicator */}
        <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

        {/* Main content */}
        <View style={styles.body}>
          {/* Top row: title + badge */}
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>{displayTitle}</Text>
            <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
          </View>

          {/* Meta info */}
          <View style={styles.metaGrid}>
            <MetaItem Icon={Calendar} label={formatMissionRange(mission.startAt, mission.endAt)} />
            <MetaItem Icon={MapPin}   label={mission.city + (mission.address ? ` · ${mission.address}` : '')} />
          </View>

          {/* Bottom row: duration + urgency + price */}
          <View style={styles.bottomRow}>
            <View style={styles.bottomLeft}>
              <View style={styles.durationPill}>
                <Clock size={11} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.durationText}>{mission.durationHours}h</Text>
              </View>
              {mission.isUrgent && !compact && (
                <View style={styles.urgencyPill}>
                  <Zap size={11} color={colors.warning} strokeWidth={2.2} />
                  <Text style={styles.urgencyText}>Urgence</Text>
                </View>
              )}
            </View>

            <View style={styles.bottomRight}>
              {totalTTC !== undefined && (
                <Text style={styles.price}>{formatCurrency(totalTTC * 100)}</Text>
              )}
              <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const MetaItem: React.FC<{
  Icon:  React.FC<{ size: number; color: string; strokeWidth: number }>;
  label: string;
}> = ({ Icon, label }) => (
  <View style={metaStyles.row}>
    <Icon size={12} color={colors.textMuted} strokeWidth={1.8} />
    <Text style={metaStyles.label} numberOfLines={1}>{label}</Text>
  </View>
);

const metaStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 },
  label: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, flex: 1 },
});

const styles = StyleSheet.create({
  touch: { marginBottom: spacing[3] },
  card: {
    flexDirection:   'row',
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.15,
    shadowRadius:    6,
    elevation:       2,
  },

  // Left accent bar
  accentBar: {
    width:  4,
    minHeight: 90,
  },

  // Body
  body: {
    flex:    1,
    padding: spacing[4],
    gap:     spacing[2],
  },

  // Top row
  topRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            spacing[3],
  },
  title: {
    flex:          1,
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.base,
    color:         colors.textPrimary,
    letterSpacing: -0.2,
  },

  // Meta grid
  metaGrid: { gap: spacing[1] + 2 },

  // Bottom row
  bottomRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      spacing[1],
  },
  bottomLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  bottomRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },

  durationPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    backgroundColor:   colors.backgroundElevated,
    borderRadius:      20,
    paddingHorizontal: spacing[2] + 2,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  durationText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
  urgencyPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    backgroundColor:   colors.warningSurface,
    borderRadius:      20,
    paddingHorizontal: spacing[2] + 2,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       colors.warning,
  },
  urgencyText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.warning,
  },
  price: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.base,
    color:         colors.primary,
    letterSpacing: -0.3,
  },
});
