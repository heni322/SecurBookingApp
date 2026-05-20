/**
 * Button — premium interactive element.
 *
 * A11y (WCAG 2.1 AA)
 * ───────────────────
 * • accessibilityRole="button" on all variants.
 * • accessibilityLabel defaults to `label` prop — callers can override.
 * • accessibilityState: disabled when loading or disabled.
 * • accessibilityHint: optional hint for VoiceOver / TalkBack.
 * • Minimum touch target: 44×44pt (WCAG 2.5.5 / Apple HIG).
 * • Text uses allowFontScaling for Dynamic Type support.
 *
 * Dynamic Type
 * ─────────────
 * Font sizes go through rf() — scales with system font size.
 */
import React from 'react';
import type { ViewStyle} from 'react-native';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, View,
} from 'react-native';
import { colors }              from '@theme/colors';
import { spacing, radius }     from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { rf }                  from '@utils/responsive';

type Variant = 'filled' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  label:              string;
  onPress:            () => void;
  variant?:           Variant;
  size?:              Size;
  loading?:           boolean;
  disabled?:          boolean;
  fullWidth?:         boolean;
  style?:             ViewStyle;
  leftIcon?:          React.ReactNode;
  rightIcon?:         React.ReactNode;
  /** Overrides label as accessibilityLabel (use when label is icon-only). */
  accessibilityLabel?: string;
  /** Optional TalkBack / VoiceOver hint describing the action result. */
  accessibilityHint?:  string;
}

const HEIGHT: Record<Size, number> = { sm: 36, md: 44, lg: 52, xl: 58 };
const FONT:   Record<Size, number> = {
  sm: fontSize.sm, md: fontSize.base, lg: fontSize.base, xl: fontSize.md,
};
const HPAD:   Record<Size, number> = {
  sm: spacing[3], md: spacing[5], lg: spacing[6], xl: spacing[7],
};

export const Button: React.FC<Props> = ({
  label, onPress,
  variant   = 'filled',
  size      = 'md',
  loading   = false,
  disabled  = false,
  fullWidth  = false,
  style,
  leftIcon,
  rightIcon,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    {
      height:            Math.max(HEIGHT[size], 44), // WCAG 2.5.5 min 44pt
      paddingHorizontal: HPAD[size],
    },
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
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'filled' ? colors.textInverse : colors.primary}
          accessibilityLabel="Loading"
        />
      ) : (
        <View style={styles.inner}>
          {leftIcon && (
            <View style={styles.iconLeft} importantForAccessibility="no-hide-descendants">
              {leftIcon}
            </View>
          )}
          <Text
            style={[styles.label, { fontSize: rf(FONT[size]), color: textColor }]}
            allowFontScaling
          >
            {label}
          </Text>
          {rightIcon && (
            <View style={styles.iconRight} importantForAccessibility="no-hide-descendants">
              {rightIcon}
            </View>
          )}
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
