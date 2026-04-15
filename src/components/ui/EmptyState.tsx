/**
 * EmptyState — illustration + message when a list is empty.
 *
 * Accepts a Lucide icon component via the `Icon` prop.
 * Renders the icon inside a styled circle container with brand colors.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { Button } from './Button';

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

interface Props {
  /** Lucide icon component — e.g. Icon={Shield}  */
  Icon?:        LucideIcon;
  /** Icon size (default 28) */
  iconSize?:    number;
  /** Icon color (default colors.textMuted) */
  iconColor?:   string;
  title:        string;
  subtitle?:    string;
  actionLabel?: string;
  onAction?:    () => void;
}

export const EmptyState: React.FC<Props> = ({
  Icon       = Search,
  iconSize   = 28,
  iconColor  = colors.textMuted,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Icon size={iconSize} color={iconColor} strokeWidth={1.6} />
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
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing[8],
    paddingVertical:   spacing[12],
    gap:               spacing[3],
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
