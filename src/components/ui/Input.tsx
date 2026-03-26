/**
 * Input — champ de texte stylisé avec label flottant, icône et erreur.
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface InputProps extends TextInputProps {
  label:         string;
  error?:        string;
  hint?:         string;
  leftIcon?:     React.ReactNode;
  rightIcon?:    React.ReactNode;
  onRightPress?: () => void;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightPress,
  containerStyle,
  ...textInputProps
}) => {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  const borderColor = hasError
    ? colors.danger
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, { borderColor }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          {...textInputProps}
          style={[styles.input, leftIcon ? styles.inputWithLeft : null]}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightPress}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {(error || hint) && (
        <Text style={[styles.hint, hasError && styles.hintError]}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing[4],
  },
  label: {
    fontFamily:   fontFamily.bodyMedium,
    fontSize:     fontSize.sm,
    color:        colors.textSecondary,
    marginBottom: spacing[2],
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    height:          layout.inputHeight,
    borderWidth:     1,
    borderRadius:    radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
  },
  input: {
    flex:        1,
    fontFamily:  fontFamily.body,
    fontSize:    fontSize.base,
    color:       colors.textPrimary,
    height:      '100%',
  },
  inputWithLeft: {
    paddingLeft: spacing[2],
  },
  leftIcon: {
    marginRight: spacing[1],
  },
  rightIcon: {
    marginLeft: spacing[2],
  },
  hint: {
    marginTop:  spacing[1],
    fontSize:   fontSize.xs,
    fontFamily: fontFamily.body,
    color:      colors.textMuted,
  },
  hintError: {
    color: colors.danger,
  },
});
