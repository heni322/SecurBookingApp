import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyRound }             from 'lucide-react-native';
import { Button, ScreenHeader } from '@components/ui';
import { colors }               from '@theme/colors';
import { spacing, radius }      from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import apiClient                from '@api/client';
import { useAuthStore }         from '@store/authStore';
import type { AuthStackParamList, AuthTokens } from '@models/index';
import { useTranslation }       from '@i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'TwoFa'>;

export default function TwoFaScreen({ route }: Props) {
  const { t }  = useTranslation('auth');
  const { t: tc } = useTranslation('common'); // cross-namespace alias

  const { tempToken } = route.params;
  const [code, setCode]       = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs  = useRef<(TextInput | null)[]>([]);
  const { hydrate } = useAuthStore();

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...code];
    next[idx]   = digit;
    setCode(next);
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const verify = async () => {
    const otp = code.join('');
    if (otp.length < 6) {
      Alert.alert(t('two_fa_screen.incomplete_title'), t('two_fa_screen.incomplete_body'));
      return;
    }
    setLoading(true);
    try {
      const res     = await apiClient.post('/auth/2fa/verify', { tempToken, otp });
      const payload = res.data?.data ?? res.data;
      const { user } = payload;
      const tokens: AuthTokens = {
        accessToken:  payload.accessToken  ?? payload.tokens?.accessToken,
        refreshToken: payload.refreshToken ?? payload.tokens?.refreshToken,
        expiresIn:    payload.expiresIn    ?? payload.tokens?.expiresIn ?? 0,
      };
      hydrate(user, tokens);
    } catch {
      Alert.alert(t('two_fa_screen.invalid_title'), t('two_fa_screen.invalid_body'));
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await apiClient.post('/auth/2fa/resend', { tempToken });
      Alert.alert(t('two_fa_screen.resent_title'), t('two_fa_screen.resent_body'));
    } catch {
      // tc() accesses the 'common' namespace — correct cross-namespace pattern
      Alert.alert(tc('error'), t('two_fa_screen.resend_error'));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('two_fa_screen.header')} showBack={false} />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <KeyRound size={36} color={colors.primary} strokeWidth={1.6} />
        </View>
        <Text style={styles.title}>{t('two_fa_screen.title')}</Text>
        <Text style={styles.sub}>{t('two_fa_screen.subtitle')}</Text>

        <View style={styles.row}>
          {code.map((d, i) => (
            <TextInput
              key={i}
              ref={r => { inputs.current[i] = r; }}
              style={[styles.box, !!d && styles.boxFilled]}
              value={d}
              onChangeText={v => handleChange(v, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <Button label={t('two_fa_screen.verify')} onPress={verify} loading={loading} style={styles.btn} fullWidth />
        <TouchableOpacity onPress={resend} style={styles.resend}>
          <Text style={styles.resendTxt}>{t('two_fa_screen.resend')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  iconWrap: {
    width: 80, height: 80, borderRadius: radius.full,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing[6],
  },
  title:     { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.5, textAlign: 'center', marginBottom: spacing[2] },
  sub:       { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing[8] },
  row:       { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[8] },
  box: {
    width: 46, height: 56, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    textAlign: 'center', fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary,
  },
  boxFilled: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  btn:       { marginBottom: spacing[4] },
  resend:    { paddingVertical: spacing[3] },
  resendTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
});
