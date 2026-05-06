/**
 * LoginScreen — Premium dark auth screen.
 * Design: floating logo on navy depth, gold accent glow, clean form.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Fingerprint } from 'lucide-react-native';
import Svg, { Circle, Defs, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';
import { authApi }           from '@api/endpoints/auth';
import { tokenStorage }      from '@services/tokenStorage';
import { useAuthStore }      from '@store/authStore';
import { biometricService }  from '@services/biometricService';
import { Button }            from '@components/ui/Button';
import { Input }             from '@components/ui/Input';
import { colors, palette }   from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { AuthStackParamList, AuthTokens, User } from '@models/index';
import { useTranslation }    from '@i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation('auth');
  const { top } = useSafeAreaInsets();

  const [email,    setEmail]    = useState(__DEV__ ? 'client@demo.fr' : '');
  const [password, setPassword] = useState(__DEV__ ? 'Demo@Client2026!' : '');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const { hydrate } = useAuthStore();
  const [bioAvail,  setBioAvail]  = React.useState(false);
  const [bioLabel,  setBioLabel]  = React.useState<string>(t('login.biometrics'));

  React.useEffect(() => {
    biometricService.isAvailable().then(({ available, biometryType }) => {
      setBioAvail(available);
      setBioLabel(biometricService.labelFor(biometryType));
    });
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim())                e.email    = t('login.errors.email_required');
    if (!/\S+@\S+\.\S+/.test(email))  e.email    = t('login.errors.email_invalid');
    if (!password)                    e.password = t('login.errors.password_required');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data: res } = await authApi.login({ email: email.trim().toLowerCase(), password });
      const payload = (res as any).data as any;
      if (payload?.requires2fa && payload?.tempToken) {
        navigation.navigate('TwoFa', { tempToken: payload.tempToken });
        return;
      }
      const { user, tokens } = payload as { user: User; tokens: AuthTokens };
      if (!tokens?.accessToken) throw new Error('Invalid response');
      tokenStorage.setTokens(tokens);
      hydrate(user, tokens);
    } catch (err: unknown) {
      const status  = (err as any)?.response?.status;
      const message = (err as any)?.response?.data?.message ?? t('login.errors.generic');
      Alert.alert(
        t('login.alert.title'),
        status === 401 ? t('login.errors.invalid_creds') : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Decorative background glow */}
      <View style={styles.glowTop} pointerEvents="none">
        <Svg width={320} height={320} viewBox="0 0 320 320">
          <Defs>
            <SvgRadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor="#bc933b" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#bc933b" stopOpacity="0" />
            </SvgRadialGradient>
          </Defs>
          <Circle cx="160" cy="160" r="160" fill="url(#glow)" />
        </Svg>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: top + spacing[10] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.logoOuter}>
            <View style={styles.logoMid}>
              <View style={styles.logoInner}>
                <ShieldCheck size={34} color={colors.primary} strokeWidth={1.6} />
              </View>
            </View>
          </View>
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>SecurBook</Text>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.tagline}>{t('login.tagline')}</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        </View>

        {/* ── Form card ─────────────────────────────────────────────────── */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{t('login.title')}</Text>
            <Text style={styles.formSub}>{t('login.subtitle')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t('login.email_label')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder={t('login.email_placeholder')}
              error={errors.email}
              leftIcon={<Mail size={16} color={errors.email ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
            />
            <Input
              label={t('login.password_label')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              placeholder={t('login.password_placeholder')}
              error={errors.password}
              leftIcon={<Lock size={16} color={errors.password ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
              rightIcon={
                showPass
                  ? <EyeOff size={16} color={colors.textMuted} strokeWidth={1.8} />
                  : <Eye    size={16} color={colors.textMuted} strokeWidth={1.8} />
              }
              onRightPress={() => setShowPass(v => !v)}
            />
          </View>

          <Button
            label={loading ? t('login.submitting') : t('login.submit')}
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.submitBtn}
            rightIcon={!loading ? <ArrowRight size={18} color={colors.textInverse} strokeWidth={2} /> : undefined}
          />

          {bioAvail && (
            <TouchableOpacity style={styles.bioBtn} onPress={() => {}} activeOpacity={0.8}>
              <Fingerprint size={18} color={colors.primary} strokeWidth={1.8} />
              <Text style={styles.bioBtnText}>{bioLabel}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.secureRow}>
            <ShieldCheck size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.secureText}>{t('login.secure_text')}</Text>
          </View>
        </View>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('login.no_account')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.footerLink}>{t('login.create_link')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  glowTop: { position: 'absolute', top: -60, alignSelf: 'center', opacity: 0.9 },

  scroll: {
    flexGrow:          1,
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom:     spacing[10],
    justifyContent:    'center',
  },

  hero: { alignItems: 'center', marginBottom: spacing[10], gap: spacing[5] },

  logoOuter: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: colors.primarySurface,
    borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoMid: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.primarySurface,
    borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoInner: {
    width: 64, height: 64, borderRadius: 22,
    backgroundColor: colors.primarySurface,
    borderWidth: 1.5, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },

  brandBlock:  { alignItems: 'center', gap: spacing[2] },
  brand: {
    fontFamily: fontFamily.display, fontSize: fontSize['3xl'],
    color: colors.textPrimary, letterSpacing: -1.5,
  },
  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border, maxWidth: 36 },
  tagline: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase',
  },

  formCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius['2xl'], borderWidth: 1, borderColor: colors.border,
    padding: spacing[6], gap: spacing[4],
    shadowColor: colors.scrim, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
  },
  formHeader: { gap: spacing[1] },
  formTitle: {
    fontFamily: fontFamily.display, fontSize: fontSize.xl,
    color: colors.textPrimary, letterSpacing: -0.5,
  },
  formSub: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  form:      { gap: 0 },
  submitBtn: { marginTop: spacing[2] },

  bioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], paddingVertical: spacing[3],
    borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface,
  },
  bioBtnText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },

  secureRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing[2], marginTop: spacing[1],
  },
  secureText: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },

  footer: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: spacing[8], gap: 4,
  },
  footerText: { fontFamily: fontFamily.body,         fontSize: fontSize.sm, color: colors.textSecondary },
  footerLink: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
});

