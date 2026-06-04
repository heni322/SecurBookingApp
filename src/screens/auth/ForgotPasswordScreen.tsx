/**
 * ForgotPasswordScreen — request a password-reset link.
 *
 * Security / UX notes
 * ───────────────────
 *  • The backend always returns 200 (anti-enumeration): we therefore show the
 *    same "check your inbox" confirmation whether or not the email exists.
 *  • In-app flow only — no deep-link yet. After sending, the user comes back and
 *    taps "Enter the code" to reach the ResetPassword screen and paste the
 *    link/token from their email.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, Linking, TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, MailCheck, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { Button, Input, ScreenHeader } from '@components/ui';
import { authApi }             from '@api/endpoints/auth';
import { colors }              from '@theme/colors';
import { spacing, radius }     from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { AuthStackParamList } from '@models/index';
import { useTranslation }      from '@i18n';
import { useToast }            from '@hooks/useToast';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { t }   = useTranslation('auth');
  const toast   = useToast();

  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const validate = () => {
    if (!email.trim())               { setError(t('forgot_password.errors.email_required')); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError(t('forgot_password.errors.email_invalid'));  return false; }
    setError(undefined);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      // Backend is intentionally non-revealing — always treat as success.
      setSent(true);
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      // 429 = rate-limited; any 2xx/4xx body still means "request received".
      // Only a true network/5xx failure should surface an error.
      if (status && status < 500 && status !== 429) {
        setSent(true);
      } else {
        toast.error(t('forgot_password.errors.generic'), { title: t('forgot_password.header') });
      }
    } finally {
      setLoading(false);
    }
  };

  const openMail = () => {
    Linking.openURL('mailto:').catch(() => {/* no mail client — silently ignore */});
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('forgot_password.header')} onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          {sent
            ? <MailCheck size={34} color={colors.primary} strokeWidth={1.6} />
            : <Mail      size={34} color={colors.primary} strokeWidth={1.6} />}
        </View>

        {!sent ? (
          <>
            <Text style={styles.title}>{t('forgot_password.title')}</Text>
            <Text style={styles.sub}>{t('forgot_password.subtitle')}</Text>

            <View style={styles.form}>
              <Input
                label={t('forgot_password.email_label')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('forgot_password.email_placeholder')}
                error={error}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                leftIcon={<Mail size={16} color={error ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
              />
            </View>

            <Button
              label={loading ? t('forgot_password.submitting') : t('forgot_password.submit')}
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.cta}
              rightIcon={!loading ? <ArrowRight size={18} color={colors.textInverse} strokeWidth={2} /> : undefined}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('forgot_password.sent_title')}</Text>
            <Text style={styles.sub}>{t('forgot_password.sent_body')}</Text>

            <View style={styles.form}>
              <Button
                label={t('forgot_password.enter_code')}
                onPress={() => navigation.navigate('ResetPassword')}
                fullWidth
                size="lg"
                rightIcon={<ArrowRight size={18} color={colors.textInverse} strokeWidth={2} />}
              />
              <Button
                label={t('forgot_password.open_mail')}
                onPress={openMail}
                variant="outline"
                fullWidth
                size="lg"
                style={styles.secondaryBtn}
              />
              <TouchableOpacity onPress={handleSubmit} disabled={loading} style={styles.resend} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.resendTxt}>{t('forgot_password.resend')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.backRow}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={15} color={colors.textSecondary} strokeWidth={2} />
          <Text style={styles.backTxt}>{t('forgot_password.back_to_login')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  iconWrap: {
    width: 76, height: 76, borderRadius: radius.full,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing[6],
  },
  title: {
    fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary,
    letterSpacing: -0.5, textAlign: 'center', marginBottom: spacing[2],
  },
  sub: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: spacing[8], paddingHorizontal: spacing[2],
  },
  form: { width: '100%', gap: spacing[3] },
  cta:  { marginTop: spacing[2] },
  secondaryBtn: { marginTop: spacing[1] },
  resend:    { alignSelf: 'center', paddingVertical: spacing[3], marginTop: spacing[1] },
  resendTxt: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },
  backRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[8] },
  backTxt:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
});
