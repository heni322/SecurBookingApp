import React, { useState } from 'react';
import {
  View, TextInput, Text, TouchableOpacity, StyleSheet,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { colors } from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

interface Props extends TextInputProps {
  label:         string;
  error?:        string;
  hint?:         string;
  leftIcon?:     React.ReactNode;
  rightIcon?:    React.ReactNode;
  onRightPress?: () => void;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<Props> = ({
  label, error, hint, leftIcon, rightIcon,
  onRightPress, containerStyle, ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, { borderColor }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          {...rest}
          style={[styles.input, leftIcon ? styles.inputWithLeft : undefined]}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => { setFocused(true);  rest.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); rest.onBlur?.(e);  }}
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
        <Text style={[styles.hint, error ? styles.hintError : undefined]}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:       { marginBottom: spacing[4] },
  label:         { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing[2], letterSpacing: 0.3, textTransform: 'uppercase' },
  row:           { flexDirection: 'row', alignItems: 'center', height: layout.inputHeight, borderWidth: 1, borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: spacing[4] },
  input:         { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textPrimary, height: '100%' },
  inputWithLeft: { paddingLeft: spacing[2] },
  leftIcon:      { marginRight: spacing[1] },
  rightIcon:     { marginLeft: spacing[2] },
  hint:          { marginTop: spacing[1], fontSize: fontSize.xs, fontFamily: fontFamily.body, color: colors.textMuted },
  hintError:     { color: colors.danger },
});
