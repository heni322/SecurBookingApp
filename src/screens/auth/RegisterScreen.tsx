/**
 * RegisterScreen — Premium account creation.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft, User, Building2, Mail, Phone,
  Lock, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2,
} from 'lucide-react-native';
import { authApi }      from '@api/endpoints/auth';
import { useAuthStore } from '@store/authStore';
import { Button }       from '@components/ui/Button';
import { Input }        from '@components/ui/Input';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { AuthStackParamList, AuthTokens, User as UserModel } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation('auth');

  const [fullName,   setFullName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [clientType, setClientType] = useState<'INDIVIDUAL' | 'COMPANY'>('INDIVIDUAL');
  const [loading,    setLoading]    = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const { hydrate } = useAuthStore();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim())             e.fullName = t('register.errors.full_name_required');
    if (!email.trim())                e.email    = t('register.errors.email_required');
    if (!/\S+@\S+\.\S+/.test(email)) e.email    = t('register.errors.email_invalid');
    if (password.length < 8)          e.password = t('register.errors.password_length');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data: res } = await authApi.register({
        fullName: fullName.trim(),
        email:    email.trim().toLowerCase(),
        password,
        phone:    phone.trim() || undefined,
        role:     'CLIENT' as const,
        clientType,
      });
      const { user, accessToken, refreshToken } = (res as any).data as {
        user: UserModel; accessToken: string; refreshToken: string;
      };
      const tokens: AuthTokens = { accessToken, refreshToken, expiresIn: 900 };
      hydrate(user, tokens);
    } catch (err: unknown) {
      const message = (err as any)?.response?.data?.message ?? t('register.errors.generic');
      Alert.alert(t('register.alert.title'), message);
    } finally {
      setLoading(false);
    }
  };

  const TYPE_OPTIONS: Array<{ type: 'INDIVIDUAL' | 'COMPANY'; label: string; sub: string; Icon: typeof User }> = [
    { type: 'INDIVIDUAL', label: t('register.individual'), sub: t('register.individual_sub'), Icon: User      },
    { type: 'COMPANY',    label: t('register.company'),    sub: t('register.company_sub'),    Icon: Building2 },
  ];

  const PERKS = [
    t('register.perks.verified'),
    t('register.perks.quote'),
    t('register.perks.payment'),
  ];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
            onChangeText={setEmail}
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
            leftIcon={<Phone size={16} color={colors.textMuted} strokeWidth={1.8} />}
          />
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

          <Button
            label={t('register.submit')}
            onPress={handleRegister}
            loading={loading}
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
    paddingTop: spacing[10], paddingBottom: spacing[10], gap: spacing[5],
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
