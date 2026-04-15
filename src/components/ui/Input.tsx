/**
 * Input — refined text field.
 * Senior UI: floating label animation feel, focus ring, icon support.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ViewStyle, TextInputProps,
} from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props extends TextInputProps {
  label?:        string;
  error?:        string;
  hint?:         string;
  leftIcon?:     React.ReactNode;
  rightIcon?:    React.ReactNode;
  onRightPress?: () => void;
  style?:        ViewStyle;
}

export const Input: React.FC<Props> = ({
  label, error, hint,
  leftIcon, rightIcon, onRightPress,
  style, ...rest
}) => {
  const [focused, setFocused] = useState(false);

  const borderColor =
    error   ? colors.danger :
    focused ? colors.primary :
    colors.border;

  const borderWidth = focused || error ? 1.5 : 1;

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={[styles.label, error && styles.labelError, focused && styles.labelFocused]}>
          {label}
        </Text>
      )}

      <View style={[styles.row, { borderColor, borderWidth }]}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          {...rest}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightPress}
            style={styles.iconRight}
            disabled={!onRightPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {!error && hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: spacing[1] + 2, marginBottom: spacing[3] },
  label: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  spacing[1],
  },
  labelError:   { color: colors.danger },
  labelFocused: { color: colors.primary },
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    height:          layout.inputHeight,
    borderRadius:    radius.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[4],
    gap:             spacing[2],
  },
  iconLeft:  { flexShrink: 0 },
  iconRight: { flexShrink: 0, padding: 2 },
  input: {
    flex:       1,
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    color:      colors.textPrimary,
    height:     '100%',
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.danger,
    marginTop:  spacing[1],
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
    marginTop:  spacing[1],
  },
});
