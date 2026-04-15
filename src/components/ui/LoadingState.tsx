/**
 * LoadingState — branded spinner with optional message.
 * Senior UI: gold spinner on dark surface, subtle pulse ring.
 */
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props {
  message?: string;
  size?:    'small' | 'large';
  /** Show inside a card-like container rather than full flex */
  inline?:  boolean;
}

export const LoadingState: React.FC<Props> = ({
  message,
  size    = 'large',
  inline  = false,
}) => (
  <View style={[styles.container, inline && styles.containerInline]}>
    <View style={styles.spinnerWrap}>
      <ActivityIndicator color={colors.primary} size={size} />
    </View>
    {message && <Text style={styles.message}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing[4],
    paddingVertical: spacing[12],
  },
  containerInline: {
    flex:            undefined,
    paddingVertical: spacing[8],
  },
  spinnerWrap: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: colors.primarySurface,
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  message: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    textAlign:  'center',
  },
});
