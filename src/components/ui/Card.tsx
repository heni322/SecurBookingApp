/**
 * Card — elevated surface component.
 * Senior UI: multi-level depth, glow option, press states.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius, shadow } from '@theme/spacing';

interface Props {
  children:  React.ReactNode;
  style?:    ViewStyle | ViewStyle[];
  elevated?: boolean;
  padded?:   boolean;
  glow?:     boolean;   // gold glow border
  danger?:   boolean;   // red tint
  success?:  boolean;   // green tint
}

export const Card: React.FC<Props> = ({
  children,
  style,
  elevated = false,
  padded   = true,
  glow     = false,
  danger   = false,
  success  = false,
}) => {
  const borderColor = glow
    ? colors.borderPrimary
    : danger
    // Fix #9: danger+ '55' for muted red border (was colors.danger + '55' — wrong, danger = txtRed text color)
    ? colors.dangerSurface + '55'
    : success
    // Fix #10: success + '55' for muted green border
    ? colors.successSurface + '55'
    : colors.border;

  const bgColor = glow
    ? colors.primarySurface
    : danger
    // Fix #9: was colors.dangerSurface = vivid '#e11d48' (icon fill token) — wrong for card bg
    // Use a muted rgba tint that reads as a surface, not a vivid icon fill
    ? 'rgba(225, 29, 72, 0.10)'
    : success
    // Fix #10: was colors.successSurface = vivid '#4ade80' (dot/border token) — wrong for card bg
    ? 'rgba(74, 222, 128, 0.10)'
    : elevated
    ? colors.backgroundElevated
    : colors.surface;

  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        { backgroundColor: bgColor, borderColor },
        glow && styles.glowShadow,
        elevated && !glow && styles.elevatedShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth:  1,
  },
  padded: {
    padding: spacing[4],
  },
  glowShadow: {
    shadowColor:   colors.primary,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius:  10,
    elevation:     4,
  },
  elevatedShadow: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius:  12,
    elevation:     6,
  },
});
