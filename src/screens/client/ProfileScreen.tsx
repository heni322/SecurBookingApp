/**
 * ProfileScreen — Premium client profile.
 *
 * v2 (2026-10-07, device QA):
 *  - Empty fullName rendered a "?" avatar and a blank title line, leaving the
 *    email floating alone. Now: initials fall back to the email, and a gold
 *    "Ajouter votre nom" call-to-action replaces the missing name.
 *  - "CLIENT VÉRIFIÉ" was shown to EVERY user regardless of status — a false
 *    trust claim. It now reflects emailVerifiedAt; unverified accounts see a
 *    neutral "E-mail non vérifié" chip instead.
 *  - "Depuis ven. 2 octobre 2026": weekday + exact day is noise for a tenure
 *    line → "Membre depuis octobre 2026".
 *  - Three entry points to the same edit screen (header pencil, avatar, row):
 *    header pencil removed.
 *  - Info section repeated the email and the join date already in the hero;
 *    it now holds only what the hero lacks (email verification, phone).
 *  - 2FA "Désactivé" in muted grey read as neutral: shown as a warning with
 *    the reason to enable it (this account stores cards / SEPA mandates).
 *  - Raw UUID at the bottom is now labelled and selectable for support.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, RefreshControl, Modal, Pressable, Linking,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Mail, Phone, ShieldCheck,
  FileText, Info, LogOut, ChevronRight, CreditCard,
  Bell, Lock, Wallet, Fingerprint, Trash2, Edit3, BarChart2, Globe,
  Scale, LifeBuoy, Receipt,
} from 'lucide-react-native';
import { Avatar }           from '@components/ui/Avatar';
import { Card }             from '@components/ui/Card';
import { PhoneVerificationCard } from '@components/domain/PhoneVerificationCard';
import { ScreenHeader }     from '@components/ui/ScreenHeader';
import { ProfileSkeleton }  from '@components/ui/SkeletonLoader';
import { useAuthStore }     from '@store/authStore';
import { usersApi }         from '@api/endpoints/users';
import { biometricService } from '@services/biometricService';
import { colors, palette }  from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { ProfileStackParamList } from '@models/index';
import { useTranslation }   from '@i18n';
import { useConfirmDialogStore } from '@store/confirmDialogStore';
import { config }           from '@config';
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@i18n';

/** Opens a legal / support page; a missing browser or mail app is not fatal. */
const openExternal = (url: string) => {
  Linking.openURL(url).catch(() => { /* no handler for this URL on the device */ });
};

type Nav = NativeStackNavigationProp<ProfileStackParamList>;
type LucideIconComp = React.FC<{ size: number; color: string; strokeWidth: number }>;

export const ProfileScreen: React.FC = () => {
  const { t }                       = useTranslation('profile');
  const navigation                  = useNavigation<Nav>();
  const { user, logout, setUser }   = useAuthStore();
  const confirm = useConfirmDialogStore((s) => s.confirm);
  const [loading,    setLoading]    = useState(false);
  const [bioAvail,   setBioAvail]   = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLabel,   setBioLabel]   = useState<string>(t('menu.quick_login'));
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) ?? 'fr',
  );

  useEffect(() => {
    (async () => {
      const { available, biometryType } = await biometricService.isAvailable();
      setBioAvail(available);
      setBioLabel(biometricService.labelFor(biometryType));
      if (available) setBioEnabled(await biometricService.isEnabled());
    })();
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await usersApi.getMe();
      setUser((res as any).data ?? res);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [setUser]);

  const toggleBiometric = useCallback(async (val: boolean) => {
    if (val) {
      const ok = await biometricService.authenticate(`${t('menu.quick_login')} — ${bioLabel}`);
      if (!ok) return;
    }
    await biometricService.setEnabled(val);
    setBioEnabled(val);
  }, [bioLabel, t]);

  const handleLogout = async () => {
    const ok = await confirm({
      title:        t('logout.title'),
      message:      t('logout.message'),
      confirmLabel: t('logout.confirm'),
      cancelLabel:  t('logout.cancel'),
      confirmStyle: 'destructive',
    });
    if (ok) await logout();
  };

  const handleSelectLanguage = useCallback((lang: SupportedLanguage) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    setLangModalVisible(false);
  }, []);

  const currentLangLabel = currentLang === 'fr' ? t('menu.language_fr') : t('menu.language_en');

  if (!user) return <ProfileSkeleton />;

  const displayName   = user.fullName?.trim() || '';
  const emailVerified = !!user.emailVerifiedAt;
  const memberSince   = (() => {
    const d = new Date(user.createdAt);
    return isNaN(d.getTime())
      ? null
      : new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(d);
  })();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('title')} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* ── Hero card ── */}
        <Card style={styles.heroCard} elevated>
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={() => navigation.navigate('ProfileEdit')} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('menu.edit_profile')}>
              <View style={styles.avatarRingOuter}>
                <View style={styles.avatarRingInner}>
                  <Avatar name={displayName || user.email} avatarUrl={user.avatarUrl} size={72} />
                </View>
              </View>
              <View style={styles.avatarEditBadge}>
                <Edit3 size={11} color={palette.navy} strokeWidth={2.4} />
              </View>
            </TouchableOpacity>
            <View style={styles.heroInfo}>
              {displayName ? (
                <Text style={styles.fullName} numberOfLines={2}>{displayName}</Text>
              ) : (
                <TouchableOpacity onPress={() => navigation.navigate('ProfileEdit')} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8 }}>
                  <Text style={styles.addName}>{t('hero.add_name')}</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
              {user.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
            </View>
          </View>
          <View style={styles.tierRow}>
            {emailVerified ? (
              <View style={styles.tierBadge}>
                <ShieldCheck size={12} color={colors.primary} strokeWidth={2} />
                <Text style={styles.tierText}>{t('hero.verified')}</Text>
              </View>
            ) : (
              <View style={[styles.tierBadge, styles.tierBadgeMuted]}>
                <Mail size={12} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.tierText, styles.tierTextMuted]}>{t('hero.email_unverified')}</Text>
              </View>
            )}
            {memberSince && (
              <Text style={styles.memberSince} numberOfLines={1}>{t('hero.since', { date: memberSince })}</Text>
            )}
          </View>
        </Card>

        {/* Phone verification prompt (renders only when phone present & unverified) */}
        <PhoneVerificationCard />

        {/* ── My Account ── */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>{t('sections.account')}</Text>
          <Card elevated style={styles.menuCard}>
            <MenuRow Icon={Edit3}    iconColor={colors.primary} label={t('menu.edit_profile')}    tappable onPress={() => navigation.navigate('ProfileEdit')} />
            <Divider />
            <MenuRow Icon={BarChart2} iconColor={colors.info}    label={t('menu.analytics')}       tappable onPress={() => navigation.navigate('Analytics')} />
            <Divider />
            <MenuRow Icon={CreditCard} iconColor={colors.success} label={t('menu.payment_history')} tappable onPress={() => navigation.navigate('PaymentHistory')} />
            <Divider />
            <MenuRow Icon={Wallet}   iconColor={colors.warning}  label={t('menu.payment_methods')} tappable onPress={() => navigation.navigate('PaymentMethods')} />
          </Card>
        </View>

        {/* ── Security ── */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>{t('sections.security')}</Text>
          <Card elevated style={styles.menuCard}>
            <MenuRow
              Icon={Lock}
              iconColor={colors.warning}
              label={t('menu.two_fa')}
              value={user.twoFaEnabled ? t('menu.two_fa_enabled') : t('menu.two_fa_recommended')}
              valueColor={user.twoFaEnabled ? colors.success : colors.warning}
              tappable
              onPress={() => navigation.navigate('TwoFaSetup')}
            />
            {bioAvail && (
              <>
                <Divider />
                <View style={rowStyles.row}>
                  <View style={[rowStyles.iconBox, { backgroundColor: colors.infoSurface }]}>
                    <Fingerprint size={15} color={colors.info} strokeWidth={1.8} />
                  </View>
                  <View style={rowStyles.content}>
                    <Text style={rowStyles.label}>{bioLabel}</Text>
                    <Text style={rowStyles.value}>{t('menu.quick_login')}</Text>
                  </View>
                  <Switch
                    value={bioEnabled}
                    onValueChange={toggleBiometric}
                    trackColor={{ false: colors.border, true: colors.primary + '80' }}
                    thumbColor={bioEnabled ? colors.primary : colors.textMuted}
                  />
                </View>
              </>
            )}
          </Card>
        </View>

        {/* ── Preferences ── */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>{t('sections.preferences')}</Text>
          <Card elevated style={styles.menuCard}>
            <MenuRow
              Icon={Bell}
              iconColor={colors.warning}
              label={t('menu.notifications')}
              tappable
              onPress={() => navigation.dispatch(CommonActions.navigate('Notifications'))}
            />
            <Divider />
            <MenuRow
              Icon={Globe}
              iconColor={colors.info}
              label={t('menu.language')}
              value={currentLangLabel}
              tappable
              onPress={() => setLangModalVisible(true)}
            />
          </Card>
        </View>

        {/* ── Information ── */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>{t('sections.info')}</Text>
          <Card elevated style={styles.menuCard}>
            <MenuRow
              Icon={Mail}
              iconColor={colors.info}
              label={t('menu.email')}
              value={emailVerified ? t('hero.email_verified') : t('hero.email_unverified')}
              valueColor={emailVerified ? colors.success : colors.warning}
            />
            <Divider />
            <MenuRow
              Icon={Phone}
              iconColor={colors.success}
              label={t('menu.phone')}
              value={user.phone || t('hero.phone_not_set')}
              valueColor={user.phone ? undefined : colors.warning}
              tappable={!user.phone}
              onPress={() => navigation.navigate('ProfileEdit')}
            />
          </Card>
        </View>

        {/* ── Legal ── (audit 2026-09-30, P0-9: these rows had no onPress) */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle}>{t('sections.legal')}</Text>
          <Card elevated style={styles.menuCard}>
            <MenuRow Icon={Info}        iconColor={colors.textMuted} label={t('menu.version')}        value={config.appVersion} />
            <Divider />
            <MenuRow Icon={ShieldCheck} iconColor={colors.success}   label={t('menu.privacy_policy')} tappable onPress={() => openExternal(config.legal.privacyUrl)} />
            <Divider />
            <MenuRow Icon={FileText}    iconColor={colors.textMuted} label={t('menu.terms')}           tappable onPress={() => openExternal(config.legal.termsUrl)} />
            <Divider />
            <MenuRow Icon={Receipt}     iconColor={colors.textMuted} label={t('menu.sales_terms')}     tappable onPress={() => openExternal(config.legal.salesTermsUrl)} />
            <Divider />
            <MenuRow Icon={Scale}       iconColor={colors.textMuted} label={t('menu.legal_notice')}    tappable onPress={() => openExternal(config.legal.legalNoticeUrl)} />
            <Divider />
            <MenuRow Icon={LifeBuoy}    iconColor={colors.info}      label={t('menu.support')}         tappable onPress={() => openExternal(config.legal.supportUrl)} />
          </Card>
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.78} accessibilityRole="button" accessibilityLabel={t('logout.button')}>
          <LogOut size={18} color={colors.danger} strokeWidth={2} />
          <Text style={styles.logoutText}>{t('logout.button')}</Text>
        </TouchableOpacity>

        {/* ── Delete account ── */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => navigation.navigate('DeleteAccount')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('delete_account')}>
          <Trash2 size={14} color={colors.danger + '99'} strokeWidth={2} />
          <Text style={styles.deleteText}>{t('delete_account')}</Text>
        </TouchableOpacity>

        <Text style={styles.uid} selectable>{t('hero.account_id', { id: user.id })}</Text>
      </ScrollView>

      {/* ── Language Picker Modal ── */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLangModalVisible(false)}
      >
        <Pressable style={modalStyles.backdrop} onPress={() => setLangModalVisible(false)}>
          <Pressable style={modalStyles.sheet} onPress={() => {}}>
            {/* Handle bar */}
            <View style={modalStyles.handle} />

            <Text style={modalStyles.title}>{t('language_picker.title')}</Text>
            <Text style={modalStyles.subtitle}>{t('language_picker.subtitle')}</Text>

            <View style={modalStyles.options}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = currentLang === lang;
                const label = lang === 'fr' ? t('menu.language_fr') : t('menu.language_en');
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[modalStyles.option, isActive && modalStyles.optionActive]}
                    onPress={() => handleSelectLanguage(lang)}
                    activeOpacity={0.75}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={label}
                  >
                    <Text style={[modalStyles.optionText, isActive && modalStyles.optionTextActive]}>
                      {label}
                    </Text>
                    {isActive && (
                      <View style={modalStyles.checkDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// ── Sub-components ──
const Divider: React.FC = () => <View style={divStyles.line} />;
const divStyles = StyleSheet.create({
  line: { height: 1, backgroundColor: colors.border, marginLeft: spacing[4] + 36 + spacing[3] },
});

const MenuRow: React.FC<{
  Icon: LucideIconComp; iconColor?: string; label: string;
  value?: string; valueColor?: string; tappable?: boolean; onPress?: () => void;
}> = ({ Icon, iconColor = colors.textMuted, label, value, valueColor, tappable, onPress }) => (
  <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={tappable ? 0.7 : 1} disabled={!tappable} accessibilityRole={tappable ? 'button' : 'text'} accessibilityLabel={value ? `${label}: ${value}` : label}>
    <View style={[rowStyles.iconBox, { backgroundColor: (iconColor ?? colors.textMuted) + '18' }]}>
      <Icon size={15} color={iconColor ?? colors.textMuted} strokeWidth={1.8} />
    </View>
    <View style={rowStyles.content}>
      <Text style={rowStyles.label}>{label}</Text>
      {value && <Text style={[rowStyles.value, valueColor ? { color: valueColor } : {}]} numberOfLines={1}>{value}</Text>}
    </View>
    {tappable && <ChevronRight size={15} color={colors.textMuted} strokeWidth={2} />}
  </TouchableOpacity>
);

const rowStyles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[4], paddingHorizontal: spacing[4], gap: spacing[3] },
  iconBox: { width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content: { flex: 1 },
  label:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  value:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundElevated, // Fix #12: surface=rgba(0.5) was semi-transparent; elevated=rgba(0.8)
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    paddingTop: spacing[3],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing[5],
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing[5],
  },
  options: {
    gap: spacing[3],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  optionText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  optionTextActive: {
    color: colors.primary,
    fontFamily: fontFamily.bodySemiBold,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: colors.background },
  content:         { paddingHorizontal: layout.screenPaddingH, paddingBottom: spacing[12], gap: spacing[4] },
  heroCard:        { padding: spacing[5], gap: spacing[4] },
  avatarSection:   { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  avatarRingOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: 'rgba(188,147,59,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarRingInner: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroInfo:        { flex: 1, gap: spacing[1] },
  fullName:        { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4 },
  addName:         { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.primary, textDecorationLine: 'underline' },
  avatarEditBadge: {
    position: 'absolute', right: 2, bottom: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  tierBadgeMuted:  { backgroundColor: colors.surface, borderColor: colors.border },
  tierTextMuted:   { color: colors.textMuted },
  email:           { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  phone:           { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
  tierRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  tierBadge:       { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2, backgroundColor: colors.primarySurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1] + 2, borderWidth: 1, borderColor: colors.borderPrimary },
  tierText:        { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.primary, letterSpacing: 0.8 },
  memberSince:     { flexShrink: 1, textAlign: 'right', fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  sectionGroup:    { gap: spacing[2] },
  sectionTitle:    { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginLeft: spacing[1] },
  menuCard:        { padding: 0, overflow: 'hidden' },
  logoutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3], marginTop: spacing[2], paddingVertical: spacing[4], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.danger + '55', backgroundColor: colors.dangerSurface },
  logoutText:      { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.danger },
  deleteBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], opacity: 0.6 },
  deleteText:      { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger },
  uid:             { textAlign: 'center', fontFamily: fontFamily.mono, fontSize: 10, color: colors.textMuted, marginTop: spacing[2] },
});



