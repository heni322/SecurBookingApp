/**
 * Card — conteneur de surface élevée réutilisable.
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius, shadow } from '@theme/spacing';

interface CardProps {
  children:  React.ReactNode;
  style?:    ViewStyle;
  elevated?: boolean;
  padded?:   boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevated = false,
  padded   = true,
}) => (
  <View
    style={[
      styles.base,
      elevated && styles.elevated,
      padded   && styles.padded,
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  elevated: {
    backgroundColor: colors.backgroundElevated,
    ...shadow.md,
  },
  padded: {
    padding: spacing[4],
  },
});
