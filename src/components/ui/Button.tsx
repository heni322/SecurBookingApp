/**
 * Button — composant bouton principal de SecurBook.
 * Variantes : primary | secondary | ghost | danger
 * Tailles : sm | md | lg
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius, layout, shadow } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label:      string;
  onPress:    () => void;
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  disabled?:  boolean;
  fullWidth?: boolean;
  style?:     ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: {
      backgroundColor: colors.primary,
      borderWidth: 0,
      ...shadow.amber,
    },
    text: { color: colors.textInverse },
  },
  secondary: {
    container: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    text: { color: colors.textPrimary },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',   // ← valeur littérale, pas de lookup colors
      borderWidth: 1,
      borderColor: colors.borderPrimary,
    },
    text: { color: colors.primary },
  },
  danger: {
    container: {
      backgroundColor: colors.dangerSurface,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    text: { color: colors.danger },
  },
};

const sizeStyles: Record<Size, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { height: 36, paddingHorizontal: spacing[3], borderRadius: radius.md },
    text:      { fontSize: fontSize.sm },
  },
  md: {
    container: { height: layout.buttonHeight, paddingHorizontal: spacing[5], borderRadius: radius.lg },
    text:      { fontSize: fontSize.base },
  },
  lg: {
    container: { height: 60, paddingHorizontal: spacing[6], borderRadius: radius.xl },
    text:      { fontSize: fontSize.md },
  },
};

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled  = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles[variant].container,
        sizeStyles[size].container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.textInverse : colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.label,
            variantStyles[variant].text,
            sizeStyles[size].text,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    alignSelf:      'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily:    fontFamily.bodySemiBold,
    letterSpacing: 0.2,
  },
});
