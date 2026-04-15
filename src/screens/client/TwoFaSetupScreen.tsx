/**
 * TwoFaSetupScreen — enable / disable 2FA from profile.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck, ShieldOff, KeyRound } from 'lucide-react-native';
import { authApi }      from '@api/endpoints/auth';
import { usersApi }     from '@api/endpoints/users';
import { useAuthStore } from '@store/authStore';
import { Input }        from '@components/ui/Input';
import { Button }       from '@components/ui/Button';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { LoadingState } from '@components/ui/LoadingState';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { ProfileStackParamList } from '@models/index';
import { useTranslation } from '@i18n';

type Props = NativeStackScreenProps<ProfileStackParamList, 'TwoFaSetup'>;

export const TwoFaSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { t }     = useTranslation('account');
  const { t: tc } = useTranslation('common'); // cross-namespace: error title

  const { user, setUser } = useAuthStore();
  const isEnabled = user?.twoFaEnabled ?? false;

  const [step,       setStep]       = useState<'idle' | 'scan' | 'verify' | 'done'>('idle');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [secret,     setSecret]     = useState('');
  const [code,       setCode]       = useState('');
  const [loading,    setLoading]    = useState(false);

  const handleSetup = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await authApi.setup2FA();
      const payload = (res as any).data ?? res;
      setOtpauthUrl(payload.otpauthUrl);
      setSecret(payload.secret);
      setStep('scan');
    } catch (err: any) {
      Alert.alert(tc('error'), err?.response?.data?.message ?? t('two_fa.error_setup'));
    } finally {
      setLoading(false);
    }
  }, [t, tc]);

  const handleEnable = useCallback(async () => {
    if (code.length !== 6) {
      Alert.alert(t('two_fa.code_required_title'), t('two_fa.code_required_body'));
      return;
    }
    setLoading(true);
    try {
      await authApi.enable2FA(code);
      const { data: userRes } = await usersApi.getMe();
      setUser((userRes as any).data ?? userRes);
      setStep('done');
    } catch {
      Alert.alert(t('two_fa.invalid_title'), t('two_fa.invalid_body'));
    } finally {
      setLoading(false);
    }
  }, [code, setUser, t]);

  const handleDisable = useCallback(() => {
    Alert.alert(
      t('two_fa.disable_title'),
      t('two_fa.disable_body'),
      [
        { text: t('two_fa.disable_cancel'), style: 'cancel' },
        {
          text: t('two_fa.disable_confirm'), style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              Alert.prompt(
                t('two_fa.disable_code_title'),
                t('two_fa.disable_code_body'),
                async inputCode => {
                  if (!inputCode) { setLoading(false); return; }
                  try {
                    await authApi.disable2FA(inputCode);
                    const { data: userRes } = await usersApi.getMe();
                    setUser((userRes as any).data ?? userRes);
                    Alert.alert(t('two_fa.disabled_title'), t('two_fa.disabled_body'));
                    navigation.goBack();
                  } catch {
                    Alert.alert(t('two_fa.invalid_title'), t('two_fa.invalid_body'));
                  } finally { setLoading(false); }
                },
                'plain-text',
              );
            } catch { setLoading(false); }
          },
        },
      ],
    );
  }, [setUser, navigation, t]);

  if (loading && step === 'idle') return <LoadingState message={t('two_fa.loading')} />;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('two_fa.title')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status banner */}
        <View style={[styles.statusBanner, isEnabled ? styles.bannerEnabled : styles.bannerDisabled]}>
          {isEnabled
            ? <ShieldCheck size={20} color={colors.success}  strokeWidth={2} />
            : <ShieldOff   size={20} color={colors.textMuted} strokeWidth={2} />
          }
          <View style={styles.bannerText}>
            <Text style={[styles.bannerTitle, isEnabled && { color: colors.success }]}>
              {isEnabled ? t('two_fa.status_enabled') : t('two_fa.status_disabled')}
            </Text>
            <Text style={styles.bannerBody}>
              {isEnabled ? t('two_fa.status_body_enabled') : t('two_fa.status_body_disabled')}
            </Text>
          </View>
        </View>

        {/* idle + not enabled → setup button */}
        {!isEnabled && step === 'idle' && (
          <Button label={t('two_fa.setup_btn')} onPress={handleSetup} loading={loading} fullWidth size="lg" />
        )}

        {/* scan: show QR code */}
        {step === 'scan' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('two_fa.scan_title')}</Text>
            <Text style={styles.cardBody}>{t('two_fa.scan_subtitle')}</Text>
            {!!otpauthUrl && (
              <Image
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(otpauthUrl)}&size=200x200&bgcolor=0D1117&color=bc933b` }}
                style={styles.qrCode}
              />
            )}
            {!!secret && (
              <View style={styles.secretBox}>
                <Text style={styles.secretLabel}>{t('two_fa.secret_label')}</Text>
                <Text style={styles.secretCode}>{secret}</Text>
              </View>
            )}
            <Button label={t('two_fa.scanned_btn')} onPress={() => setStep('verify')} fullWidth size="lg" style={styles.btn} />
          </View>
        )}

        {/* verify: enter code */}
        {step === 'verify' && (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <KeyRound size={28} color={colors.primary} strokeWidth={1.6} />
            </View>
            <Text style={styles.cardTitle}>{t('two_fa.verify_title')}</Text>
            <Text style={styles.cardBody}>{t('two_fa.verify_subtitle')}</Text>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder={t('two_fa.code_placeholder')}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <Button
              label={loading ? t('two_fa.verifying') : t('two_fa.verify_btn')}
              onPress={handleEnable}
              loading={loading}
              fullWidth size="lg" style={styles.btn}
            />
            <Text style={styles.perkText}>{t('two_fa.perk_code_body')}</Text>
          </View>
        )}

        {/* done */}
        {step === 'done' && (
          <View style={[styles.card, styles.doneCard]}>
            <ShieldCheck size={40} color={colors.success} strokeWidth={1.6} />
            <Text style={styles.doneTitle}>{t('two_fa.done_title')}</Text>
            <Text style={styles.cardBody}>{t('two_fa.done_subtitle')}</Text>
            <Button label={t('two_fa.done_close')} onPress={() => navigation.goBack()} fullWidth size="lg" style={styles.btn} />
          </View>
        )}

        {/* enabled + idle → disable button */}
        {isEnabled && step === 'idle' && (
          <Button
            label={t('two_fa.disable_title')}
            onPress={handleDisable}
            loading={loading}
            fullWidth size="lg" variant="danger"
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: colors.background },
  content:        { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[6], paddingBottom: spacing[12], gap: spacing[5] },
  statusBanner:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4], borderRadius: radius.xl, padding: spacing[5], borderWidth: 1 },
  bannerEnabled:  { backgroundColor: colors.successSurface, borderColor: colors.success + '40' },
  bannerDisabled: { backgroundColor: colors.surface, borderColor: colors.border },
  bannerText:     { flex: 1, gap: spacing[1] },
  bannerTitle:    { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.3 },
  bannerBody:     { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  card:           { backgroundColor: colors.backgroundElevated, borderRadius: radius['2xl'], borderWidth: 1, borderColor: colors.border, padding: spacing[6], gap: spacing[4], alignItems: 'center' },
  doneCard:       { borderColor: colors.success + '60', backgroundColor: colors.successSurface },
  cardTitle:      { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4, textAlign: 'center' },
  cardBody:       { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  doneTitle:      { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.success, letterSpacing: -0.5 },
  qrCode:         { width: 200, height: 200, borderRadius: radius.xl },
  secretBox:      { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing[4], gap: spacing[2] },
  secretLabel:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  secretCode:     { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.primary, letterSpacing: 2 },
  btn:            { width: '100%' },
  iconWrap:       { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center' },
  perkText:       { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },
});
