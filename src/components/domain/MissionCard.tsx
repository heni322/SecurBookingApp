/**
 * MissionCard — Premium mission list item.
 * Status label and fallback title are fully i18n-aware.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, MapPin, Clock, Zap, ChevronRight } from 'lucide-react-native';
import { Badge }               from '@components/ui/Badge';
import { colors }              from '@theme/colors';
import { spacing, radius }     from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatMissionRange, formatCurrency } from '@utils/formatters';
import { useMissionStatus }    from '@hooks/useMissionStatus';
import { useTranslation }      from '@i18n';
import type { Mission }        from '@models/index';

interface Props {
  mission:  Mission;
  onPress:  () => void;
  compact?: boolean;
}

export const MissionCard: React.FC<Props> = ({ mission, onPress, compact = false }) => {
  const { t }              = useTranslation('missions');
  const { label, color }   = useMissionStatus(mission.status);
  const totalTTC           = mission.quote?.totalWithVat;

  // Fallback title: use i18n key so it translates with the locale
  const displayTitle = mission.title?.trim() || t('card_fallback_title', { city: mission.city });

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.touch}>
      <View style={styles.card}>

        {/* Left accent bar — color encodes status at a glance */}
        <View style={[styles.accentBar, { backgroundColor: color }]} />

        {/* Main content */}
        <View style={styles.body}>
          {/* Top row: title + badge */}
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>{displayTitle}</Text>
            <Badge label={label} color={color} bg={color + '20'} />
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
                  <Text style={styles.urgencyText}>{t('card_urgent')}</Text>
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
    backgroundColor: colors.backgroundElevated,
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
  accentBar: { width: 4, minHeight: 90 },
  body:      { flex: 1, padding: spacing[4], gap: spacing[2] },
  topRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[3] },
  title:     { flex: 1, fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: -0.2 },
  metaGrid:  { gap: spacing[1] + 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[1] },
  bottomLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  bottomRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  durationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.backgroundElevated, borderRadius: 20,
    paddingHorizontal: spacing[2] + 2, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.border,
  },
  durationText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted },
  urgencyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.warningSurface, borderRadius: 20,
    paddingHorizontal: spacing[2] + 2, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.warning,
  },
  urgencyText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.warning },
  price: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.primary, letterSpacing: -0.3 },
});