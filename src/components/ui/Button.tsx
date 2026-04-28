/**
 * Button — premium interactive element.
 * Senior UI: size variants, ghost/outline/filled, full icon support, loading shimmer.
 */
import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, View,
} from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius, shadow, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

type Variant = 'filled' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  label:     string;
  onPress:   () => void;
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?:    ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const HEIGHT: Record<Size, number> = { sm: 36, md: 44, lg: 52, xl: 58 };
const FONT:   Record<Size, number> = { sm: fontSize.sm, md: fontSize.base, lg: fontSize.base, xl: fontSize.md };
const HPAD:   Record<Size, number> = { sm: spacing[3], md: spacing[5], lg: spacing[6], xl: spacing[7] };

export const Button: React.FC<Props> = ({
  label, onPress,
  variant  = 'filled',
  size     = 'md',
  loading  = false,
  disabled = false,
  fullWidth = false,
  style,
  leftIcon,
  rightIcon,
}) => {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    { height: HEIGHT[size], paddingHorizontal: HPAD[size] },
    variant === 'filled'  && styles.filled,
    variant === 'outline' && styles.outline,
    variant === 'ghost'   && styles.ghost,
    variant === 'danger'  && styles.danger,
    fullWidth             && styles.fullWidth,
    isDisabled            && styles.disabled,
    variant === 'filled' && !isDisabled && styles.filledShadow,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  const textColor =
    variant === 'filled'  ? colors.textInverse :
    variant === 'danger'  ? colors.danger :
    variant === 'outline' ? colors.primary :
    colors.primary;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'filled' ? colors.textInverse : colors.primary} />
      ) : (
        <View style={styles.inner}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={[styles.label, { fontSize: FONT[size], color: textColor }]}>
            {label}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius:   radius.xl,
    alignItems:     'center',
    justifyContent: 'center',
    flexDirection:  'row',
  },
  inner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[2],
  },
  iconLeft:  {},
  iconRight: {},

  filled: {
    backgroundColor: colors.primary,
    borderWidth:     0,
  },
  filledShadow: {
    shadowColor:   colors.primary,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
    elevation:     6,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth:     1.5,
    borderColor:     colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth:     0,
  },
  danger: {
    backgroundColor: colors.dangerSurface,
    borderWidth:     1,
    borderColor:     colors.danger,
  },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.45 },
  label: {
    fontFamily:    fontFamily.bodySemiBold,
    letterSpacing: 0.1,
  },
});

