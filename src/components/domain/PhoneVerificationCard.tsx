/**
 * PhoneVerificationCard
 *
 * Soft-enforcement UI for SMS phone verification (companion to the backend
 * phone/send-code + phone/verify endpoints). Renders an inline card on profile
 * screens when the logged-in user has a phone on file that is not yet verified
 * (user.phoneVerifiedAt is null/undefined). Tapping "Verify" opens a modal:
 * send code -> enter 6-digit OTP -> confirm.
 *
 * Renders nothing when there is no user, no phone, or the phone is already
 * verified, so it is safe to mount unconditionally.
 *
 * Ported from the agent app; adapted to the client app's conventions
 * (useToast instead of showAlert, @i18n useTranslation).
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ShieldCheck, X } from 'lucide-react-native';
import { useTranslation } from '@i18n';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { useAuthStore } from '@store/authStore';
import { authApi } from '@api/endpoints/auth';
import { useToast } from '@hooks/useToast';

export function PhoneVerificationCard() {
  const { t } = useTranslation('auth');
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');

  // Nothing to verify.
  if (!user?.phone || user.phoneVerifiedAt) return null;

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await authApi.sendPhoneCode();
      setCodeSent(true);
      toast.success(t('phoneVerification.sentBody'), {
        title: t('phoneVerification.sentTitle'),
      });
    } catch {
      toast.error(t('phoneVerification.sendErrorBody'), {
        title: t('phoneVerification.errorTitle'),
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (verifying || code.length !== 6) return;
    setVerifying(true);
    try {
      await authApi.verifyPhone({ code });
      // Optimistically reflect verification in local state.
      setUser({ ...user, phoneVerifiedAt: new Date().toISOString() });
      setOpen(false);
      setCode('');
      setCodeSent(false);
      toast.success(t('phoneVerification.verifiedBody'), {
        title: t('phoneVerification.verifiedTitle'),
      });
    } catch (e: unknown) {
      const axiosErr = e as { response?: { data?: { message?: string } } };
      toast.error(
        axiosErr?.response?.data?.message ?? t('phoneVerification.verifyErrorBody'),
        { title: t('phoneVerification.errorTitle') },
      );
    } finally {
      setVerifying(false);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setCode('');
    setCodeSent(false);
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <ShieldCheck size={20} color={colors.warning} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{t('phoneVerification.cardTitle')}</Text>
          <Text style={styles.body}>{t('phoneVerification.cardBody')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          style={styles.cta}
        >
          <Text style={styles.ctaText}>{t('phoneVerification.verifyButton')}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <View style={styles.sheet}>
            <TouchableOpacity
              onPress={closeModal}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t('phoneVerification.close')}
            >
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.sheetTitle}>{t('phoneVerification.modalTitle')}</Text>
            <Text style={styles.sheetBody}>
              {t('phoneVerification.modalBody', { phone: user.phone })}
            </Text>

            {!codeSent ? (
              <TouchableOpacity
                onPress={handleSend}
                disabled={sending}
                style={styles.primaryBtn}
                accessibilityRole="button"
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {t('phoneVerification.sendButton')}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="------"
                  placeholderTextColor={colors.textMuted}
                  style={styles.codeInput}
                  accessibilityLabel={t('phoneVerification.codeLabel')}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleVerify}
                  disabled={verifying || code.length !== 6}
                  style={[
                    styles.primaryBtn,
                    (verifying || code.length !== 6) && styles.primaryBtnDisabled,
                  ]}
                  accessibilityRole="button"
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {t('phoneVerification.confirmButton')}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={sending}
                  style={styles.resend}
                  accessibilityRole="button"
                >
                  <Text style={styles.resendText}>
                    {t('phoneVerification.resendButton')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSurface,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: { paddingTop: 2 },
  textWrap: { flex: 1 },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    marginBottom: 2,
  },
  body: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 18 },
  cta: {
    backgroundColor: colors.warning,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ctaText: {
    color: colors.textInverse,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
  },
  close: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 1, padding: 4 },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.displayMedium,
    marginBottom: spacing.sm,
  },
  sheetBody: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  codeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radius.md,
    color: colors.textPrimary,
    fontSize: 28,
    fontFamily: fontFamily.mono,
    letterSpacing: 12,
    textAlign: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    color: colors.textInverse,
    fontSize: fontSize.md,
    fontFamily: fontFamily.bodySemiBold,
  },
  resend: { marginTop: spacing.md, alignItems: 'center' },
  resendText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
  },
});

export default PhoneVerificationCard;
