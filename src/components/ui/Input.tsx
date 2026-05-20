/**
 * Input — text field, enterprise-grade.
 *
 * Drop-in compatible with the previous API (label / error / hint / leftIcon /
 * rightIcon / onRightPress / style). Adds:
 *   - forwardRef + imperative handle (focus / blur / clear / isFocused)
 *   - `type` prop drives keyboardType, autoComplete, textContentType,
 *     autoCapitalize, autoCorrect, secureTextEntry per-platform
 *   - Built-in password show/hide toggle when type="password"
 *   - Disabled state (visual + editable + a11y)
 *   - Multiline support (top-aligned, no vertical-centering bug)
 *   - Tap anywhere on the row focuses the input
 *   - Reserved error/hint slot — no layout shift when error appears
 *   - Full a11y: label/hint association, error announced via live region
 */
import React, {
  forwardRef, useImperativeHandle, useMemo, useRef, useState, useCallback,
} from 'react';
import type { ViewStyle, TextInputProps} from 'react-native';
import {
  View, Text, TextInput, Pressable,
  StyleSheet
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors }                 from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }   from '@theme/typography';

// Derive focus/blur handler types straight from TextInputProps so we stay
// compatible with whatever event shape the installed RN version exposes
// (RN 0.84+ renamed these to FocusEvent / BlurEvent internally).
type TextInputFocusHandler = NonNullable<TextInputProps['onFocus']>;
type TextInputBlurHandler  = NonNullable<TextInputProps['onBlur']>;

// ─── Public types ────────────────────────────────────────────────────────────

export type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'phone'
  | 'name'
  | 'postal-code'
  | 'numeric'
  | 'currency'
  | 'otp'
  | 'multiline';

export interface InputHandle {
  focus:     () => void;
  blur:      () => void;
  clear:     () => void;
  isFocused: () => boolean;
}

interface Props extends TextInputProps {
  label?:             string;
  error?:             string;
  hint?:              string;
  leftIcon?:          React.ReactNode;
  rightIcon?:         React.ReactNode;
  onRightPress?:      () => void;
  style?:             ViewStyle;
  /**
   * Drives keyboardType / autoComplete / textContentType / autoCapitalize /
   * autoCorrect / secureTextEntry. Caller props always override these defaults.
   * Default: 'text'.
   */
  type?:              InputType;
  /** Visual + functional disabled state (sets editable=false + a11y). */
  disabled?:          boolean;
  /**
   * Reserve space for the error/hint line so the layout doesn't jump when
   * an error appears. Default: true.
   */
  reserveErrorSpace?: boolean;
}

// ─── Native prop defaults per `type` ─────────────────────────────────────────
// Each entry is a Partial<TextInputProps>; caller-provided props override these.
// textContentType is iOS-only; autoComplete is Android-driven on RN ≥ 0.68.

const TYPE_PROPS: Record<InputType, Partial<TextInputProps>> = {
  text: {
    keyboardType: 'default',       autoComplete: 'off',           textContentType: 'none',
    autoCapitalize: 'sentences',   autoCorrect: true,             secureTextEntry: false,
  },
  email: {
    keyboardType: 'email-address', autoComplete: 'email',         textContentType: 'emailAddress',
    autoCapitalize: 'none',        autoCorrect: false,            secureTextEntry: false,
    spellCheck: false,
  },
  password: {
    keyboardType: 'default',       autoComplete: 'password',      textContentType: 'password',
    autoCapitalize: 'none',        autoCorrect: false,            secureTextEntry: true,
    spellCheck: false,
  },
  phone: {
    keyboardType: 'phone-pad',     autoComplete: 'tel',           textContentType: 'telephoneNumber',
    autoCapitalize: 'none',        autoCorrect: false,            secureTextEntry: false,
  },
  name: {
    keyboardType: 'default',       autoComplete: 'name',          textContentType: 'name',
    autoCapitalize: 'words',       autoCorrect: false,            secureTextEntry: false,
  },
  'postal-code': {
    keyboardType: 'number-pad',    autoComplete: 'postal-code',   textContentType: 'postalCode',
    autoCapitalize: 'characters',  autoCorrect: false,            secureTextEntry: false,
  },
  numeric: {
    keyboardType: 'numeric',       autoComplete: 'off',           textContentType: 'none',
    autoCapitalize: 'none',        autoCorrect: false,            secureTextEntry: false,
  },
  currency: {
    keyboardType: 'decimal-pad',   autoComplete: 'off',           textContentType: 'none',
    autoCapitalize: 'none',        autoCorrect: false,            secureTextEntry: false,
  },
  otp: {
    keyboardType: 'number-pad',    autoComplete: 'one-time-code', textContentType: 'oneTimeCode',
    autoCapitalize: 'none',        autoCorrect: false,            secureTextEntry: false,
  },
  multiline: {
    keyboardType: 'default',       autoComplete: 'off',           textContentType: 'none',
    autoCapitalize: 'sentences',   autoCorrect: true,             secureTextEntry: false,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export const Input = forwardRef<InputHandle, Props>((props, ref) => {
  const {
    // Custom Input props
    label, error, hint,
    leftIcon, rightIcon, onRightPress,
    style,
    type              = 'text',
    disabled          = false,
    reserveErrorSpace = true,
    // TextInput props we manage internally
    multiline:           multilineProp,
    secureTextEntry:     secureTextEntryProp,
    editable:            editableProp,
    onFocus:             onFocusProp,
    onBlur:              onBlurProp,
    accessibilityLabel:  a11yLabel,
    accessibilityHint:   a11yHint,
    // Everything else passes through
    ...textInputRest
  } = props;

  const inputRef = useRef<TextInput>(null);
  const [focused,   setFocused]   = useState(false);
  const [pwVisible, setPwVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    focus:     () => inputRef.current?.focus(),
    blur:      () => inputRef.current?.blur(),
    clear:     () => inputRef.current?.clear(),
    isFocused: () => inputRef.current?.isFocused() ?? false,
  }), []);

  const isMultiline  = multilineProp ?? type === 'multiline';
  const isPassword   = type === 'password';
  const isEditable   = !disabled && editableProp !== false;
  const typeDefaults = TYPE_PROPS[type];

  // Password toggle overrides type's secureTextEntry default;
  // for non-password types the caller's prop wins, then the type default.
  const effectiveSecure = isPassword
    ? !pwVisible
    : (secureTextEntryProp ?? typeDefaults.secureTextEntry ?? false);

  // Visual border color
  const borderColor =
    disabled ? colors.borderSubtle :
    error    ? colors.danger      :
    focused  ? colors.primary     :
    colors.border;
  const borderWidth = focused || error ? 1.5 : 1;

  // Tap row → focus input. Skip if disabled or already focused.
  const handleRowPress = useCallback(() => {
    if (!isEditable) return;
    if (inputRef.current?.isFocused()) return;
    inputRef.current?.focus();
  }, [isEditable]);

  const handleFocus: TextInputFocusHandler = (e) => {
    setFocused(true);
    onFocusProp?.(e);
  };

  const handleBlur: TextInputBlurHandler = (e) => {
    setFocused(false);
    onBlurProp?.(e);
  };

  // Default password toggle — only if caller didn't supply their own rightIcon
  const passwordToggle = useMemo(() => {
    if (!isPassword || rightIcon) return null;
    return (
      <Pressable
        onPress={() => setPwVisible(v => !v)}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={pwVisible ? 'Hide password' : 'Show password'}
        style={styles.iconRight}
      >
        {pwVisible
          ? <EyeOff size={20} color={colors.textMuted} />
          : <Eye    size={20} color={colors.textMuted} />}
      </Pressable>
    );
  }, [isPassword, rightIcon, pwVisible, disabled]);

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            error                && styles.labelError,
            focused && !disabled && styles.labelFocused,
            disabled             && styles.labelDisabled,
          ]}
          onPress={handleRowPress}
          accessible={false}
        >
          {label}
        </Text>
      )}

      <Pressable
        onPress={handleRowPress}
        disabled={!isEditable}
        // Visual is focus-driven, not press-driven — keep the row stable on press.
        style={[
          styles.row,
          isMultiline && styles.rowMultiline,
          disabled    && styles.rowDisabled,
          { borderColor, borderWidth },
        ]}
      >
        {leftIcon && (
          <View style={styles.iconLeft} importantForAccessibility="no-hide-descendants">
            {leftIcon}
          </View>
        )}

        <TextInput
          ref={inputRef}
          // Sensible visual defaults — caller can override via textInputRest
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          // Type-derived native defaults (keyboardType, autoComplete, etc.)
          {...typeDefaults}
          // Caller props override type defaults
          {...textInputRest}
          // Props we control unconditionally — must come last
          editable={isEditable}
          multiline={isMultiline}
          textAlignVertical={isMultiline ? 'top' : 'center'}
          secureTextEntry={effectiveSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          // a11y
          accessibilityLabel={a11yLabel ?? label}
          accessibilityHint={a11yHint  ?? hint}
          accessibilityState={{ disabled }}
          style={[
            styles.input,
            isMultiline && styles.inputMultiline,
            disabled    && styles.inputDisabled,
          ]}
        />

        {/* Right slot: caller's rightIcon wins; password toggle is fallback */}
        {rightIcon ? (
          <Pressable
            onPress={onRightPress}
            disabled={!onRightPress || disabled}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole={onRightPress ? 'button' : undefined}
            style={styles.iconRight}
          >
            {rightIcon}
          </Pressable>
        ) : passwordToggle}
      </Pressable>

      {/* Helper slot — reserves a fixed-height row so error appearance
          doesn't push subsequent fields down. */}
      <View
        style={[
          styles.helperSlot,
          reserveErrorSpace && styles.helperSlotReserved,
        ]}
      >
        {error ? (
          <Text
            style={styles.error}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    </View>
  );
});

Input.displayName = 'Input';

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing[3] },

  label: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.xs,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  spacing[1],
  },
  labelError:    { color: colors.danger },
  labelFocused:  { color: colors.primary },
  labelDisabled: { color: colors.textMuted, opacity: 0.6 },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    minHeight:         layout.inputHeight,
    borderRadius:      radius.xl,
    backgroundColor:   colors.surface,
    paddingHorizontal: spacing[4],
    gap:               spacing[2],
  },
  rowMultiline: {
    alignItems:    'flex-start',
    paddingTop:    spacing[3],
    paddingBottom: spacing[3],
    minHeight:     layout.inputHeight * 2,
  },
  rowDisabled: { opacity: 0.55 },

  iconLeft:  { flexShrink: 0 },
  iconRight: { flexShrink: 0, padding: 2 },

  input: {
    flex:       1,
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    color:      colors.textPrimary,
    height:     '100%',
    // Strip Android's default underline / extra padding so the row owns layout.
    padding:    0,
  },
  inputMultiline: {
    height:     undefined,
    minHeight:  layout.inputHeight - spacing[3] * 2,
    paddingTop: 0,
  },
  inputDisabled: { color: colors.textMuted },

  helperSlot:         { marginTop: spacing[1] },
  // ~ one line of fontSize.xs (11pt) including its line-height — keeps the
  // form layout stable whether or not an error/hint is currently shown.
  helperSlotReserved: { minHeight: 16 },

  error: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.danger,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },
});
