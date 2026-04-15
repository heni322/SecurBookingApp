/**
 * Badge — status pill with dot indicator.
 * Senior UI: consistent sizing, cleaner border treatment.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props {
  label:   string;
  color?:  string;
  bg?:     string;
  dot?:    boolean;
  size?:   'sm' | 'md';
}

export const Badge: React.FC<Props> = ({
  label,
  color = colors.primary,
  bg    = colors.primarySurface,
  dot   = true,
  size  = 'sm',
}) => (
  <View style={[
    styles.pill,
    { backgroundColor: bg, borderColor: color + '45' },
    size === 'md' && styles.pillMd,
  ]}>
    {dot && <View style={[styles.dot, { backgroundColor: color }]} />}
    <Text
      numberOfLines={1}
      style={[styles.label, { color }, size === 'md' && styles.labelMd]}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[1] + 2,
    borderRadius:      radius.full,
    borderWidth:       1,
    paddingHorizontal: spacing[2] + 2,
    paddingVertical:   3,
    alignSelf:         'flex-start',
    maxWidth:          160,
  },
  pillMd: {
    paddingHorizontal: spacing[3],
    paddingVertical:   spacing[1] + 2,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
    flexShrink:   0,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
  },
  labelMd: { fontSize: fontSize.sm },
});
