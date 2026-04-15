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
    ? colors.danger + '55'
    : success
    ? colors.success + '55'
    : colors.border;

  const bgColor = glow
    ? colors.primarySurface
    : danger
    ? colors.dangerSurface
    : success
    ? colors.successSurface
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
    shadowColor:   '#bc933b',
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
