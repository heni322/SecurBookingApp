/**
 * LoadingState — spinner centré avec message optionnel.
 */
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props {
  message?: string;
  size?:    'small' | 'large';
}

export const LoadingState: React.FC<Props> = ({
  message,
  size = 'large',
}) => (
  <View style={styles.container}>
    <ActivityIndicator color={colors.primary} size={size} />
    {message && <Text style={styles.message}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing[3],
    paddingVertical: spacing[12],
  },
  message: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    textAlign:  'center',
  },
});
