/**
 * RegisterScreen — Premium account creation (enterprise hardened).
 *
 * Improvements vs previous version:
 *  ● Response shape fix — backend returns { user, tokens: { ... } }, not flat.
 *  ● Mandatory CGU/RGPD consent checkbox (`acceptTerms: true`).
 *  ● Live password-strength meter (length / uppercase / digit / 12+).
 *  ● Conditional COMPANY-client fields (companyName + SIRET) with validation.
 *  ● Phone E.164 normalization on submit (strip spaces / dashes / parens).
 *  ● Per-field backend error mapping (409 → email, 400 → field, 429 → throttle).
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft, User, Building2, Mail, Phone,
  Lock, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2,
  Hash, FileText, Check,
} from 'lucide-react-native';
import { authApi }      from '@api/endpoints/auth';
import { useAuthStore } from '@store/authStore';
import { Button }       from '@components/ui/Button';
import { Input }        from '@components/ui/Input';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { AuthStackParamList, AuthTokens, User as UserModel, RegisterPayload } from '@models/index';
import { useTranslation } from '@i18n';
import { useToast }       from '@hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Strip whitespace / dashes / parens for E.164 normalization. */
const normalizePhone = (raw: string): string =>
  raw.replace(/[\s().-]/g, '');

/** SIRET = exactly 14 digits. */
const isValidSiret = (raw: string): boolean => /^\d{14}$/.test(raw.replace(/\s/g, ''));

/** Phone E.164: optional leading +, then 7–15 digits, first digit non-zero. */
const isValidPhone = (raw: string): boolean => {
  const v = normalizePhone(raw);
  return v === '' || /^\+?[1-9]\d{6,14}$/.test(v);
};

/** Password strength — returns 0..4. */
const computePasswordStrength = (pwd: string): number => {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd))    score++;
  if (pwd.length >= 12 && /[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
};

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation('auth');
  const { top } = useSafeAreaInsets();
  const toast   = useToast();

  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [clientType,  setClientType]  = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [companyName, setCompanyName] = useState('');
  const [siret,       setSiret]       = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const { hydrate } = useAuthStore();

  const pwStrength = useMemo(() => computePasswordStrength(password), [password]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2)
      e.fullName = t('register.errors.full_name_required');

    if (!email.trim())
      e.email = t('register.errors.email_required');
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      e.email = t('register.errors.email_invalid');

    if (phone.trim() && !isValidPhone(phone))
      e.phone = t('register.errors.phone_invalid');

    if (password.length < 8)
      e.password = t('register.errors.password_length');
    else if (!/[A-Z]/.test(password) || !/\d/.test(password))
      e.password = t('register.errors.password_complexity');

    if (clientType === 'COMPANY') {
      if (!companyName.trim() || companyName.trim().length < 2)
        e.companyName = t('register.errors.company_name_required');
      if (!siret.trim() || !isValidSiret(siret))
        e.siret = t('register.errors.siret_invalid');
    }

    if (!acceptTerms)
      e.acceptTerms = t('register.errors.terms_required');

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Backend error mapping (409 / 400 / 429) ───────────────────────────────
  const mapBackendError = (err: any): string => {
    const status = err?.response?.status;
    const data   = err?.response?.data;
    const msg    = Array.isArray(data?.message) ? data.message[0] : data?.message;

    if (status === 409) {
      setErrors(prev => ({ ...prev, email: t('register.errors.email_taken') }));
      return t('register.errors.email_taken');
    }
    if (status === 429)
      return t('register.errors.too_many_attempts');
    if (status === 400 && msg)
      return msg;
    if (!err?.response)
      return t('register.errors.network');
    return msg ?? t('register.errors.generic');
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: RegisterPayload = {
        fullName:    fullName.trim().replace(/\s+/g, ' '),
        email:       email.trim().toLowerCase(),
        password,
        phone:       phone.trim() ? normalizePhone(phone) : undefined,
        role:        'CLIENT',
        clientType,
        acceptTerms: true,
        ...(clientType === 'COMPANY' && {
          companyName: companyName.trim(),
          siret:       siret.replace(/\s/g, ''),
        }),
      };

      const res = await authApi.register(payload);
      // axios → res.data is the API envelope { data: { user, tokens }, message, success }
      const envelope = res.data as { data: { user: UserModel; tokens: AuthTokens } };
      const { user, tokens } = envelope.data;

      if (!tokens?.accessToken) {
        throw new Error('Invalid response: missing tokens');
      }

      hydrate(user, tokens);
    } catch (err: unknown) {
      const message = mapBackendError(err);
      toast.error(message, { title: t('register.alert.title'), duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  // ── UI building blocks ────────────────────────────────────────────────────
  const TYPE_OPTIONS: Array<{ type: 'INDIVIDUAL' | 'COMPANY'; label: string; sub: string; Icon: typeof User }> = [
    { type: 'INDIVIDUAL', label: t('register.individual'), sub: t('register.individual_sub'), Icon: User      },
    { type: 'COMPANY',    label: t('register.company'),    sub: t('register.company_sub'),    Icon: Building2 },
  ];

  const PERKS = [
    t('register.perks.verified'),
    t('register.perks.quote'),
    t('register.perks.payment'),
  ];

  const STRENGTH_LABELS = [
    t('register.strength.weak'),
    t('register.strength.weak'),
    t('register.strength.fair'),
    t('register.strength.good'),
    t('register.strength.strong'),
  ];
  const STRENGTH_COLORS = [
    colors.border, colors.danger, colors.warning, colors.success, colors.success,
  ];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: top + spacing[5] }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={18} color={colors.textPrimary} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('register.title')}</Text>
            <Text style={styles.subtitle}>{t('register.subtitle')}</Text>
          </View>
        </View>

        {/* ── Perks ───────────────────────────────────────────────────────── */}
        <View style={styles.perksRow}>
          {PERKS.map((p, i) => (
            <View key={i} style={styles.perkItem}>
              <CheckCircle2 size={12} color={colors.success} strokeWidth={2.5} />
              <Text style={styles.perkText}>{p}</Text>
            </View>
          ))}
        </View>

        {/* ── Account type ────────────────────────────────────────────────── */}
        <View style={styles.typeSection}>
          <Text style={styles.sectionLabel}>{t('register.account_type')}</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map(({ type, label, sub, Icon }) => {
              const active = clientType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  onPress={() => setClientType(type)}
                  activeOpacity={0.78}
                >
                  <View style={[styles.typeIconWrap, { backgroundColor: active ? colors.primarySurface : colors.surface }]}>
                    <Icon size={22} color={active ? colors.primary : colors.textSecondary} strokeWidth={1.8} />
                  </View>
                  <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{label}</Text>
                  <Text style={styles.typeSub}>{sub}</Text>
                  {active && <View style={styles.typeCheck} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Form card ─────────────────────────────────────────────────── */}
        <View style={styles.formCard}>
          <Input
            label={t('register.full_name_label')}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholder={t('register.full_name_placeholder')}
            error={errors.fullName}
            leftIcon={<User size={16} color={errors.fullName ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
          />
          <Input
            label={t('register.email_label' as any) ?? 'Email'}
            value={email}
            onChangeText={(v) => { setEmail(v); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={t('login.email_placeholder')}
            error={errors.email}
            leftIcon={<Mail size={16} color={errors.email ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
          />
          <Input
            label={t('register.phone_label')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder={t('register.phone_placeholder')}
            error={errors.phone}
            leftIcon={<Phone size={16} color={errors.phone ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
          />

          {/* ── Conditional COMPANY fields ─────────────────────────────── */}
          {clientType === 'COMPANY' && (
            <>
              <Input
                label={t('register.company_name_label')}
                value={companyName}
                onChangeText={setCompanyName}
                autoCapitalize="words"
                placeholder={t('register.company_name_placeholder')}
                error={errors.companyName}
                leftIcon={<Building2 size={16} color={errors.companyName ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
              />
              <Input
                label={t('register.siret_label')}
                value={siret}
                onChangeText={setSiret}
                keyboardType="number-pad"
                maxLength={14}
                placeholder="14 chiffres"
                error={errors.siret}
                hint={!errors.siret ? t('register.siret_hint') : undefined}
                leftIcon={<Hash size={16} color={errors.siret ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
              />
            </>
          )}

          <Input
            label={t('login.password_label')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            placeholder={t('register.password_placeholder')}
            error={errors.password}
            hint={!errors.password ? t('register.password_hint') : undefined}
            leftIcon={<Lock size={16} color={errors.password ? colors.danger : colors.textMuted} strokeWidth={1.8} />}
            rightIcon={
              showPass
                ? <EyeOff size={16} color={colors.textMuted} strokeWidth={1.8} />
                : <Eye    size={16} color={colors.textMuted} strokeWidth={1.8} />
            }
            onRightPress={() => setShowPass(v => !v)}
          />

          {/* ── Password strength meter ────────────────────────────────── */}
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {[0, 1, 2, 3].map(i => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    { backgroundColor: i < pwStrength ? STRENGTH_COLORS[pwStrength] : colors.border },
                  ]}
                />
              ))}
              <Text style={[styles.strengthLabel, { color: STRENGTH_COLORS[pwStrength] }]}>
                {STRENGTH_LABELS[pwStrength]}
              </Text>
            </View>
          )}

          {/* ── Terms of Service / RGPD consent ───────────────────────── */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptTerms(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxActive]}>
              {acceptTerms && <Check size={12} color={colors.textInverse} strokeWidth={3} />}
            </View>
            <Text style={[styles.termsText, errors.acceptTerms && { color: colors.danger }]}>
              {t('register.accept_terms')}
            </Text>
          </TouchableOpacity>
          {errors.acceptTerms ? (
            <Text style={styles.termsError}>{errors.acceptTerms}</Text>
          ) : null}

          <Button
            label={t('register.submit')}
            onPress={handleRegister}
            loading={loading}
            disabled={!acceptTerms}
            fullWidth
            size="lg"
            style={styles.submitBtn}
            rightIcon={!loading ? <ArrowRight size={18} color={colors.textInverse} strokeWidth={2} /> : undefined}
          />

          <View style={styles.rgpdRow}>
            <ShieldCheck size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.rgpdText}>{t('register.rgpd')}</Text>
          </View>
        </View>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('register.has_account')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.footerLink}>{t('register.login_link')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1, paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing[10], gap: spacing[5],
  },
  header:  { gap: spacing[4] },
  backBtn: {
    width: 38, height: 38, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { gap: spacing[1] },
  title: {
    fontFamily: fontFamily.display, fontSize: fontSize['2xl'],
    color: colors.textPrimary, letterSpacing: -0.8,
  },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },

  perksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  perkItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    backgroundColor: colors.successSurface, borderRadius: radius.full,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1] + 2,
    borderWidth: 1, borderColor: colors.success + '40',
  },
  perkText: { fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.success },

  typeSection: { gap: spacing[3] },
  sectionLabel: {
    fontFamily: fontFamily.bodyMedium, fontSize: 10,
    color: colors.textMuted, letterSpacing: 1.2,
  },
  typeRow: { flexDirection: 'row', gap: spacing[3] },
  typeCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing[4],
    paddingHorizontal: spacing[3], borderRadius: radius.xl,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    gap: spacing[1] + 2, position: 'relative',
  },
  typeCardActive:  { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  typeIconWrap: {
    width: 48, height: 48, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing[1],
  },
  typeLabel: {
    fontFamily: fontFamily.display, fontSize: fontSize.base,
    color: colors.textSecondary, letterSpacing: -0.2,
  },
  typeLabelActive: { color: colors.primary },
  typeSub: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  typeCheck: {
    position: 'absolute', top: spacing[2], right: spacing[2],
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary,
  },

  formCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius['2xl'], borderWidth: 1, borderColor: colors.border,
    padding: spacing[5],
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 16, elevation: 8, gap: 0,
  },

  strengthRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing[1] + 2, marginTop: -spacing[1], marginBottom: spacing[3],
  },
  strengthBar: {
    flex: 1, height: 4, borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: fontFamily.bodyMedium, fontSize: 11,
    minWidth: 50, textAlign: 'right',
  },

  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing[2] + 2, marginTop: spacing[2], paddingVertical: spacing[2],
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    borderColor: colors.primary, backgroundColor: colors.primary,
  },
  termsText: {
    flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.textSecondary, lineHeight: fontSize.xs * 1.6,
  },
  termsError: {
    fontFamily: fontFamily.body, fontSize: 11,
    color: colors.danger, marginLeft: 28, marginTop: -spacing[1],
  },

  submitBtn: { marginTop: spacing[3], marginBottom: spacing[3] },
  rgpdRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  rgpdText: {
    flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs,
    color: colors.textMuted, lineHeight: fontSize.xs * 1.6,
  },

  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  footerText: { fontFamily: fontFamily.body,         fontSize: fontSize.sm, color: colors.textSecondary },
  footerLink: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
});
