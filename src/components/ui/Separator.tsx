/**
 * Separator — ligne de séparation horizontale.
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';

interface Props {
  style?: ViewStyle;
  marginV?: number;
}

export const Separator: React.FC<Props> = ({ style, marginV = spacing[4] }) => (
  <View style={[styles.line, { marginVertical: marginV }, style]} />
);

const styles = StyleSheet.create({
  line: {
    height:          1,
    backgroundColor: colors.border,
  },
});
