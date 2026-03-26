/**
 * MissionCard — carte résumé d'une mission pour les listes.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card }  from '@components/ui/Card';
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
  const statusLabel = MISSION_STATUS_LABEL[mission.status] ?? mission.status;
  const statusColor = MISSION_STATUS_COLOR[mission.status] ?? colors.textMuted;
  const totalTTC    = mission.quote?.breakdown?.totalTTC;

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
      <Card style={styles.card} padded={false}>
        {/* Header strip */}
        <View style={[styles.strip, { backgroundColor: statusColor + '22' }]}>
          <View style={[styles.stripAccent, { backgroundColor: statusColor }]} />
          <View style={styles.stripContent}>
            <Badge
              label={statusLabel}
              color={statusColor}
              bg={statusColor + '20'}
            />
            {totalTTC !== undefined && (
              <Text style={styles.price}>{formatCurrency(totalTTC * 100)}</Text>
            )}
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{mission.title}</Text>

          {mission.serviceType && (
            <Text style={styles.serviceType}>{mission.serviceType.name}</Text>
          )}

          <View style={styles.meta}>
            <MetaItem icon="🗓" label={formatMissionRange(mission.startAt, mission.endAt)} />
            <MetaItem icon="📍" label={`${mission.location.city} · ${mission.location.address}`} />
            {!compact && (
              <MetaItem icon="👥" label={`${mission.agentCount} agent${mission.agentCount > 1 ? 's' : ''}`} />
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const MetaItem: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <View style={metaStyles.row}>
    <Text style={metaStyles.icon}>{icon}</Text>
    <Text style={metaStyles.label} numberOfLines={1}>{label}</Text>
  </View>
);

const metaStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 },
  icon:  { fontSize: 13 },
  label: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
});

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[3],
    overflow:     'hidden',
  },
  strip: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  stripAccent: {
    width:  4,
    height: '100%',
    minHeight: 44,
  },
  stripContent: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  price: {
    fontFamily:    fontFamily.mono,
    fontSize:      fontSize.base,
    color:         colors.primary,
    letterSpacing: 0.5,
  },
  body: {
    padding: spacing[4],
    gap:     spacing[2],
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize:   fontSize.md,
    color:      colors.textPrimary,
    letterSpacing: -0.3,
  },
  serviceType: {
    fontFamily:  fontFamily.bodyMedium,
    fontSize:    fontSize.xs,
    color:       colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  meta: {
    gap:       spacing[1] + 2,
    marginTop: spacing[1],
  },
});
