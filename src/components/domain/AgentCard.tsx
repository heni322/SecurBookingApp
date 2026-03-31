/**
 * AgentCard — fiche agent pour la sélection dans BookingDetail.
 * Utilise AgentSummary (shape allégée côté client).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card }       from '@components/ui/Card';
import { Badge }      from '@components/ui/Badge';
import { Avatar }     from '@components/ui/Avatar';
import { StarRating } from '@components/ui/StarRating';
import { Button }     from '@components/ui/Button';
import { colors }     from '@theme/colors';
import { spacing }    from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { AgentSummary } from '@models/index';

interface Props {
  agent:       AgentSummary;
  onPress?:    () => void;
  onSelect?:   () => void;
  selectable?: boolean;
}

export const AgentCard: React.FC<Props> = ({
  agent,
  onPress,
  onSelect,
  selectable = false,
}) => (
  <TouchableOpacity activeOpacity={onPress ? 0.82 : 1} onPress={onPress}>
    <Card style={styles.card}>
      <View style={styles.header}>
        <Avatar
          fullName={agent.fullName}
          avatarUrl={agent.avatarUrl}
          size="lg"
          online={agent.isValidated}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{agent.fullName}</Text>
          <View style={styles.ratingRow}>
            <StarRating value={agent.avgRating ?? 0} size={14} readonly />
            <Text style={styles.ratingText}>
              {(agent.avgRating ?? 0).toFixed(1)} ({agent.completedCount ?? 0} missions)
            </Text>
          </View>
        </View>
        {agent.isValidated && (
          <Badge label="CNAPS" color={colors.success} bg={colors.successSurface} />
        )}
      </View>

      {selectable && onSelect && (
        <Button
          label="Sélectionner cet agent"
          onPress={onSelect}
          fullWidth
          style={styles.selectBtn}
        />
      )}
    </Card>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { marginBottom: spacing[3], gap: spacing[3] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  info:   { flex: 1, gap: spacing[1] },
  name: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.md,
    color:         colors.textPrimary,
    letterSpacing: -0.2,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  ratingText: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
  selectBtn: { marginTop: spacing[1] },
});
