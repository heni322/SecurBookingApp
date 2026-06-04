/**
 * ResetPasswordScreen — consume a reset token and set a new password.
 *
 * In-app flow (no deep-link yet):
 *  • The user pastes either the full email link
 *    (securbook://auth/reset-password?token=…) or just the bare token — the
 *    token is extracted automatically.
 *  • If the screen is reached via a future deep-link, `route.params.token`
 *    pre-fills the field and it is locked.
 *
 * Password policy mirrors the backend DTO exactly:
 *   /^(?=.*[A-Z])(?=.*\d).{8,}$/  → min 8 chars, 1 uppercase, 1 digit.
 * On success the backend revokes all active sessions.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Lock, Eye, EyeOff, KeyRound, ArrowLeft, ArrowRight, CheckCircle2, Check, Circle,
} from 'lucide-react-native';
import { Button, Input, ScreenHeader } from '@components/ui';
import { authApi }              from '@api/endpoints/auth';
import { colors }               from '@theme/colors';
import { spacing, radius }      from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { AuthStackParamList } from '@models/index';
import { useTranslation }       from '@i18n';
import { useToast }             from '@hooks/useToast';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

/** Pull the token out of a pasted deep-link, or return the trimmed input. */
const extractToken = (raw: string): string => {
  const m = raw.match(/[?&]token=([^&\s]+)/i);
  return (m ? m[1] : raw).trim();
};

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation('auth');
  const toast = useToast();

  const deepLinkToken = route.params?.token;

  const [token,    setToken]    = useState(deepLinkToken ?? '');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  // ── Live password policy (kept in lockstep with the backend regex) ─────────
  const checks = useMemo(() => ({
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    digit:     /\d/.test(password),
  }), [password]);
  const isLong = password.length >= 12;
  const policyOk = checks.length && checks.uppercase && checks.digit;

  const strength = useMemo(() => {
    if (!password) return { score: 0, key: 'weak' as const, color: colors.border };
    const base = [checks.length, checks.uppercase, checks.digit].filter(Boolean).length;
    const score = base + (isLong ? 1 : 0); // 0..4
    if (score <= 1) return { score, key: 'weak'   as const, color: colors.danger  };
    if (score === 2) return { score, key: 'fair'   as const, color: colors.warning };
    if (score === 3) return { score, key: 'good'   as const, color: colors.info ?? colors.primary };
    return { score, key: 'strong' as const, color: colors.success };
  }, [password, checks, isLong]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!extractToken(token))          e.token    = t('reset_password.errors.token_required');
    if (password.length < 8)           e.password = t('reset_password.errors.password_length');
    else if (!checks.uppercase || !checks.digit) e.password = t('reset_password.errors.password_complexity');
    if (confirm !== password)          e.confirm  = t('reset_password.errors.mismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.resetPassword(extractToken(token), password);
      setDone(true);
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      if (status === 400) {
        setErrors(prev => ({ ...prev, token: t('reset_password.errors.invalid_token') }));
        toast.error(t('reset_password.errors.invalid_token'), { title: t('reset_password.header') });
      } else {
        toast.error(t('reset_password.errors.generic'), { title: t('reset_password.header') });
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.root}>
        <ScreenHeader title={t('reset_password.header')} showBack={false} />
        <View style={styles.content}>
          <View style={[styles.iconWrap, styles.iconSuccess]}>
            <CheckCircle2 size={36} color={colors.success} strokeWidth={1.6} />
          </View>
          <Text style={styles.title}>{t('reset_password.success_title')}</Text>
          <Text style={styles.sub}>{t('reset_password.success_body')}</Text>
          <Button
            label={t('reset_password.go_to_login')}
            onPress={() => navigation.navigate('Login')}
            fullWidth
            size="lg"
            style={styles.cta}
            rightIcon={<ArrowRight size={18} color={colors.textInverse} strokeWidth={2} />}
          />
        </View>
      </View>
    );
  }

  // ── Form state ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('reset_password.header')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <KeyRound size={32} color={colors.primary} strokeWidth={1.6} />
        </View>
        <Text style={styles.title}>{t('reset_password.title')}</Text>
        <Text style={styles.sub}>{t('reset_password.subtitle')}</Text>

        <View style={styles.form}>
          {!deepLinkToken && (
            <Input
              label={t('reset_password.token_label')}
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('reset_password.token_placeholder')}
              hint={t('reset_password.token_hint')}
              error={errors.token}
              multiline
              leftIcon={<KeyRound size={16} color={errors.token ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
            />
          )}

          <Input
            label={t('reset_password.password_label')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            autoCapitalize="none"
            placeholder={t('reset_password.password_placeholder')}
            error={errors.password}
            leftIcon={<Lock size={16} color={errors.password ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
            rightIcon={showPass
              ? <EyeOff size={16} color={colors.textMuted} strokeWidth={1.8} />
              : <Eye    size={16} color={colors.textMuted} strokeWidth={1.8} />}
            onRightPress={() => setShowPass(v => !v)}
          />

          {/* Strength meter — only shown once the user starts typing */}
          {password.length > 0 && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthTrack}>
                <View style={[styles.strengthFill, { width: `${(strength.score / 4) * 100}%`, backgroundColor: strength.color }]} />
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {t(`reset_password.strength.${strength.key}`)}
              </Text>
            </View>
          )}

          {/* Requirement checklist */}
          <View style={styles.reqs}>
            <Requirement ok={checks.length}    label={t('reset_password.requirements.length')} />
            <Requirement ok={checks.uppercase} label={t('reset_password.requirements.uppercase')} />
            <Requirement ok={checks.digit}     label={t('reset_password.requirements.digit')} />
          </View>

          <Input
            label={t('reset_password.confirm_label')}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showConf}
            autoCapitalize="none"
            placeholder={t('reset_password.confirm_placeholder')}
            error={errors.confirm}
            leftIcon={<Lock size={16} color={errors.confirm ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
            rightIcon={showConf
              ? <EyeOff size={16} color={colors.textMuted} strokeWidth={1.8} />
              : <Eye    size={16} color={colors.textMuted} strokeWidth={1.8} />}
            onRightPress={() => setShowConf(v => !v)}
          />
        </View>

        <Button
          label={loading ? t('reset_password.submitting') : t('reset_password.submit')}
          onPress={handleSubmit}
          loading={loading}
          disabled={!policyOk || confirm !== password || !extractToken(token)}
          fullWidth
          size="lg"
          style={styles.cta}
          rightIcon={!loading ? <ArrowRight size={18} color={colors.textInverse} strokeWidth={2} /> : undefined}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.backRow}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={15} color={colors.textSecondary} strokeWidth={2} />
          <Text style={styles.backTxt}>{t('reset_password.back_to_login')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const Requirement: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <View style={styles.reqRow}>
    {ok
      ? <Check  size={14} color={colors.success}  strokeWidth={2.4} />
      : <Circle size={14} color={colors.textMuted} strokeWidth={1.8} />}
    <Text style={[styles.reqTxt, ok && { color: colors.textSecondary }]}>{label}</Text>
  </View>
);

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing[10] },
  content:{ flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  iconWrap: {
    width: 72, height: 72, borderRadius: radius.full,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing[5],
  },
  iconSuccess: { backgroundColor: colors.successSurface, borderColor: colors.successBorder },
  title: {
    fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary,
    letterSpacing: -0.5, textAlign: 'center', marginBottom: spacing[2],
  },
  sub: {
    fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: spacing[6], paddingHorizontal: spacing[2],
  },
  form: { width: '100%', gap: spacing[1] },
  strengthWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    marginTop: spacing[1], marginBottom: spacing[2],
  },
  strengthTrack: {
    flex: 1, height: 5, borderRadius: radius.full,
    backgroundColor: colors.border, overflow: 'hidden',
  },
  strengthFill:  { height: '100%', borderRadius: radius.full },
  strengthLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, minWidth: 56, textAlign: 'right' },
  reqs:   { gap: spacing[2], marginTop: spacing[1], marginBottom: spacing[3], paddingLeft: spacing[1] },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  reqTxt: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  cta:    { marginTop: spacing[4] },
  backRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], marginTop: spacing[6] },
  backTxt:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
});
