/**
 * EmptyState — illustration + message quand une liste est vide.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { Button } from './Button';

interface Props {
  icon?:       string;   // emoji ou caractère unicode
  title:       string;
  subtitle?:   string;
  actionLabel?: string;
  onAction?:   () => void;
}

export const EmptyState: React.FC<Props> = ({
  icon       = '📭',
  title,
  subtitle,
  actionLabel,
  onAction,
}) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Text style={styles.icon}>{icon}</Text>
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    {actionLabel && onAction && (
      <Button
        label={actionLabel}
        onPress={onAction}
        variant="ghost"
        size="sm"
        style={styles.action}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical:   spacing[12],
    gap:            spacing[3],
  },
  iconWrap: {
    width:           72,
    height:          72,
    borderRadius:    radius.xl,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing[2],
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontFamily: fontFamily.displayMedium,
    fontSize:   fontSize.md,
    color:      colors.textPrimary,
    textAlign:  'center',
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: fontSize.sm * 1.6,
  },
  action: {
    marginTop: spacing[2],
  },
});
