/**
 * MissionCard — carte résumé d'une mission pour les listes.
 * Icônes : lucide-react-native
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, MapPin, Clock, Zap } from 'lucide-react-native';
import { Card }  from '@components/ui/Card';
import { Badge } from '@components/ui/Badge';
import { colors }  from '@theme/colors';
import { spacing } from '@theme/spacing';
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
  const statusLabel = MISSION_STATUS_LABEL[mission.status] ?? mission.status;
  const statusColor = MISSION_STATUS_COLOR[mission.status] ?? colors.textMuted;
  const totalTTC    = mission.quote?.totalWithVat;
  const displayTitle = mission.title?.trim() || `Mission à ${mission.city}`;

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
      <Card style={styles.card} padded={false}>
        {/* Header strip */}
        <View style={[styles.strip, { backgroundColor: statusColor + '22' }]}>
          <View style={[styles.stripAccent, { backgroundColor: statusColor }]} />
          <View style={styles.stripContent}>
            <Badge label={statusLabel} color={statusColor} bg={statusColor + '20'} />
            {totalTTC !== undefined && (
              <Text style={styles.price}>{formatCurrency(totalTTC * 100)}</Text>
            )}
          </View>
        </View>

        {/* Corps */}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{displayTitle}</Text>

          <View style={styles.meta}>
            <MetaItem Icon={Calendar} label={formatMissionRange(mission.startAt, mission.endAt)} />
            <MetaItem Icon={MapPin}   label={`${mission.city}${mission.address ? ' · ' + mission.address : ''}`} />
            {!compact && (
              <View style={styles.metaRow}>
                <MetaItem
                  Icon={Clock}
                  label={`${mission.durationHours}h`}
                />
                {mission.isUrgent && (
                  <View style={styles.urgencyPill}>
                    <Zap size={11} color={colors.warning} strokeWidth={2.2} />
                    <Text style={styles.urgencyText}>Urgence</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const MetaItem: React.FC<{
  Icon: React.FC<{ size: number; color: string; strokeWidth: number }>;
  label: string;
}> = ({ Icon, label }) => (
  <View style={metaStyles.row}>
    <Icon size={13} color={colors.textMuted} strokeWidth={1.8} />
    <Text style={metaStyles.label} numberOfLines={1}>{label}</Text>
  </View>
);

const metaStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 },
  label: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
});

const styles = StyleSheet.create({
  card:         { marginBottom: spacing[3], overflow: 'hidden' },
  strip:        { flexDirection: 'row', alignItems: 'center' },
  stripAccent:  { width: 4, minHeight: 44 },
  stripContent: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[3],
  },
  price: {
    fontFamily:    fontFamily.mono,
    fontSize:      fontSize.base,
    color:         colors.primary,
    letterSpacing: 0.5,
  },
  body:     { padding: spacing[4], gap: spacing[2] },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.md,
    color:         colors.textPrimary,
    letterSpacing: -0.3,
  },
  meta:      { gap: spacing[1] + 2, marginTop: spacing[1] },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  urgencyPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    backgroundColor:   colors.warningSurface,
    borderRadius:      20,
    paddingHorizontal: spacing[2],
    paddingVertical:   2,
    borderWidth:       1,
    borderColor:       colors.warning,
  },
  urgencyText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs - 1,
    color:      colors.warning,
  },
});
