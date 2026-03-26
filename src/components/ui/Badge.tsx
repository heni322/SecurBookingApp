/**
 * Badge — pill de statut coloré.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface BadgeProps {
  label:  string;
  color?: string;   // couleur du texte & bordure
  bg?:    string;   // couleur de fond
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = colors.primary,
  bg    = colors.primarySurface,
}) => (
  <View style={[styles.pill, { backgroundColor: bg, borderColor: color }]}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={[styles.label, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection:  'row',
    alignItems:     'center',
    alignSelf:      'flex-start',
    paddingHorizontal: spacing[2] + 2,
    paddingVertical:   4,
    borderRadius:   radius.full,
    borderWidth:    1,
    gap:            5,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  label: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
