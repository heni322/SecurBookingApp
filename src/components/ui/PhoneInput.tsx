import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from '@i18n';
import {
  View, TextInput, Text, TouchableOpacity, StyleSheet,
  type StyleProp, type ViewStyle, Animated,
  ActivityIndicator,
} from 'react-native';
import { ChevronDown, CircleAlert, CircleCheckBig } from 'lucide-react-native';
import {
  AsYouType,
  parsePhoneNumberFromString,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';
import { colors, palette } from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';

// ─── Country registry ─────────────────────────────────────────────────────────
// To unlock more countries: add entries here and flip `SINGLE_COUNTRY = false`.
// Everything else (picker, formatting, validation) adapts automatically via
// libphonenumber-js metadata.

interface CountryEntry {
  code:      CountryCode;
  flag:      string;
  /** Example national number for the placeholder — library-formatted. */
  example:   string;
}

/**
 * Ordered list of supported countries.
 * The first entry is the default.
 */
const COUNTRIES: CountryEntry[] = [
  { code: 'FR', flag: '🇫🇷', example: '612345678' },
  // ── Future countries ─────────────────────────────────
  // { code: 'BE', flag: '🇧🇪', example: '470123456'  },
  // { code: 'CH', flag: '🇨🇭', example: '781234567'  },
  // { code: 'LU', flag: '🇱🇺', example: '628123456'  },
];

/** When true, the prefix is non-interactive (no chevron, no picker). */
const SINGLE_COUNTRY = COUNTRIES.length === 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip everything that isn't a digit. */
const digitsOnly = (s: string): string => s.replace(/\D/g, '');

/**
 * Remove the national trunk prefix (leading 0) so the stored value is always
 * the *subscriber* number.  French users habitually type 06… / 07… — we
 * silently normalise to 6… / 7… for E.164.
 */
const stripTrunk = (digits: string, _country: CountryCode): string => {
  // France (and most European countries) use a single-digit trunk prefix "0".
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
};

/**
 * Format a national digit string using libphonenumber-js `AsYouType`.
 * Returns only the national portion (i.e. without the dial code).
 */
const formatNational = (digits: string, country: CountryCode): string => {
  if (!digits) return '';
  const dialCode   = `+${getCountryCallingCode(country)}`;
  const full       = `${dialCode}${digits}`;
  const formatted  = new AsYouType(country).input(full);

  // Strip the "+XX " prefix that AsYouType prepends.
  if (formatted.startsWith(dialCode)) {
    return formatted.slice(dialCode.length).trimStart();
  }
  return formatted;
};

/**
 * Build a nicely-formatted placeholder from the example number.
 */
const buildPlaceholder = (entry: CountryEntry): string =>
  formatNational(entry.example, entry.code);

/** Build the full E.164 string. */
const toE164 = (digits: string, country: CountryCode): string => {
  if (!digits) return '';
  return `+${getCountryCallingCode(country)}${digits}`;
};

// ─── Validation ───────────────────────────────────────────────────────────────

export type PhoneValidation =
  | { valid: true;  e164: string }
  | { valid: false; reason: 'too_short' | 'too_long' | 'invalid' | 'empty' };

/**
 * Validate a national digit string against libphonenumber-js metadata.
 * Exported so the parent screen can call it on submit without duplicating logic.
 */
export const validatePhone = (
  nationalDigits: string,
  country: CountryCode = 'FR',
): PhoneValidation => {
  if (!nationalDigits) return { valid: false, reason: 'empty' };
  const e164   = toE164(nationalDigits, country);
  const parsed = parsePhoneNumberFromString(e164, country);
  if (!parsed)                    return { valid: false, reason: 'invalid' };
  if (!parsed.isPossible())       return { valid: false, reason: 'too_short' };
  if (!parsed.isValid())          return { valid: false, reason: 'invalid' };
  return { valid: true, e164: parsed.format('E.164') };
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PhoneInputProps {
  label:           string;
  /**
   * Full E.164 value (e.g. "+33612345678") — controlled from parent.
   * Pass empty string when no number has been entered.
   */
  value:           string;
  /** Called with the full E.164 string, or empty string when cleared. */
  onChangePhone:   (e164: string) => void;
  /**
   * Called on every keystroke with a live validity snapshot.
   * Useful for enabling/disabling a "Next" button without running a
   * separate validation pass.
   */
  onValidation?:   (result: PhoneValidation) => void;
  error?:          string;
  hint?:           string;
  success?:        string;
  loading?:        boolean;
  /** If true, validates on blur and shows inline error automatically. */
  autoValidate?:   boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?:         string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value,
  onChangePhone,
  onValidation,
  error: externalError,
  hint,
  success,
  loading = false,
  autoValidate = false,
  containerStyle,
  testID,
}) => {
  const { t } = useTranslation('common');
  const [country, setCountry] = useState<CountryEntry>(COUNTRIES[0]);
  const [focused, setFocused] = useState(false);
  const [internalError, setInternalError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const dialCode = useMemo(
    () => `+${getCountryCallingCode(country.code)}`,
    [country.code],
  );
  const placeholder = useMemo(() => buildPlaceholder(country), [country]);

  // ── Derive display text from E.164 value ────────────────────────────────
  const nationalDigits = useMemo(() => {
    if (!value) return '';
    return value.startsWith(dialCode) ? value.slice(dialCode.length) : digitsOnly(value);
  }, [value, dialCode]);

  const displayText = useMemo(
    () => formatNational(nationalDigits, country.code),
    [nationalDigits, country.code],
  );

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleChangeText = useCallback(
    (raw: string) => {
      let digits = digitsOnly(raw);

      // Silently strip trunk prefix (e.g. French users typing "06…")
      digits = stripTrunk(digits, country.code);

      // Cap to a reasonable max (E.164 max is 15 digits total;
      // subtract dial-code length)
      const maxNational = 15 - dialCode.length + 1; // +1 for the "+"
      digits = digits.slice(0, maxNational);

      const e164 = digits.length > 0 ? toE164(digits, country.code) : '';
      onChangePhone(e164);

      // Live validation callback
      if (onValidation) {
        onValidation(validatePhone(digits, country.code));
      }

      // Clear internal error on edit
      if (internalError) setInternalError(undefined);
    },
    [country.code, dialCode, onChangePhone, onValidation, internalError],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
    Animated.timing(glowAnim, {
      toValue: 1, duration: 200, useNativeDriver: false,
    }).start();
  }, [glowAnim]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    setTouched(true);
    Animated.timing(glowAnim, {
      toValue: 0, duration: 150, useNativeDriver: false,
    }).start();

    // Auto-validate on blur if opted in
    if (autoValidate && nationalDigits.length > 0) {
      const result = validatePhone(nationalDigits, country.code);
      if (!result.valid) {
        setInternalError(
          result.reason === 'too_short'
            ? t('phone_too_short')
            : t('phone_invalid'),
        );
      } else {
        setInternalError(undefined);
      }
    }
  }, [glowAnim, autoValidate, nationalDigits, country.code]);

  // ── Visual states ───────────────────────────────────────────────────────
  const error    = externalError ?? internalError;
  const hasError   = !!error;
  const hasSuccess = !!success && !hasError;

  const borderColor = hasError
    ? colors.danger
    : hasSuccess
      ? colors.success
      : focused
        ? colors.primary
        : colors.border;

  const bgColor = hasError
    ? 'rgba(248,113,113,0.06)'
    : hasSuccess
      ? 'rgba(52,211,153,0.06)'
      : focused
        ? 'rgba(188,147,59,0.06)'
        : colors.surface;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.wrapper, containerStyle]} testID={testID}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text
          style={[
            styles.label,
            focused  && styles.labelFocused,
            hasError && styles.labelError,
          ]}
        >
          {label}
        </Text>
      </View>

      {/* Input row */}
      <Animated.View
        style={[
          styles.row,
          {
            borderColor,
            backgroundColor: bgColor,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        {/* ── Country prefix ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.prefixBtn}
          activeOpacity={SINGLE_COUNTRY ? 1 : 0.7}
          disabled={SINGLE_COUNTRY}
          onPress={() => {
            if (!SINGLE_COUNTRY) {
              // TODO: open country picker bottom-sheet
            }
            inputRef.current?.focus();
          }}
          accessibilityLabel={`${country.flag} ${dialCode}`}
          accessibilityRole="button"
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.dialCode}>{dialCode}</Text>
          {!SINGLE_COUNTRY && (
            <ChevronDown size={14} color={colors.textMuted} strokeWidth={2} />
          )}
        </TouchableOpacity>

        {/* ── Vertical separator ───────────────────────────────────────── */}
        <View style={[styles.separator, focused && styles.separatorFocused]} />

        {/* ── Number input ─────────────────────────────────────────────── */}
        <TextInput
          ref={inputRef}
          value={displayText}
          onChangeText={handleChangeText}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={colors.primary}
          accessibilityLabel={label}
          testID={testID ? `${testID}-input` : undefined}
        />

        {/* ── Status icon ──────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.statusIcon}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : hasSuccess ? (
          <View style={styles.statusIcon}>
            <CircleCheckBig size={17} color={colors.success} strokeWidth={2} />
          </View>
        ) : hasError ? (
          <View style={styles.statusIcon}>
            <CircleAlert size={17} color={colors.danger} strokeWidth={2} />
          </View>
        ) : null}
      </Animated.View>

      {/* ── Feedback text ────────────────────────────────────────────── */}
      {(error || success || hint) ? (
        <View style={styles.feedbackRow}>
          <Text
            style={[
              styles.feedback,
              hasError   && styles.feedbackError,
              hasSuccess && styles.feedbackSuccess,
            ]}
          >
            {error ?? success ?? hint}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing[4] },

  // Label
  labelRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  label:        { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase' },
  labelFocused: { color: colors.primary },
  labelError:   { color: colors.danger },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.inputHeight,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3],
    overflow: 'hidden',
  },

  // Prefix
  prefixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingRight: spacing[1],
  },
  flag: {
    fontSize: 22,
    lineHeight: 28,
  },
  dialCode: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },

  // Separator
  separator: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing[3],
  },
  separatorFocused: {
    backgroundColor: colors.primary,
    opacity: 0.5,
  },

  // Input
  input: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    height: '100%',
    padding: 0,
    letterSpacing: 0.8,
  },

  // Status
  statusIcon: { marginLeft: spacing[2], flexShrink: 0 },

  // Feedback
  feedbackRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] },
  feedback:        { flex: 1, fontSize: fontSize.xs, fontFamily: fontFamily.body, color: colors.textMuted, lineHeight: fontSize.xs * 1.5 },
  feedbackError:   { color: colors.danger },
  feedbackSuccess: { color: colors.success },
});
