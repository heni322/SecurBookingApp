/**
 * EmailVerificationBanner
 *
 * Soft-enforcement UI counterpart to the backend email-verification flow. Shown
 * at the top of the home screen when the logged-in user has not yet confirmed
 * their email (user.emailVerifiedAt is null/undefined). Lets the user trigger a
 * resend without leaving the screen.
 *
 * Renders nothing when there is no user or the email is already verified, so it
 * is safe to mount unconditionally on any screen.
 *
 * Ported from the agent app; adapted to the client app's conventions
 * (useToast instead of showAlert, @i18n useTranslation).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MailWarning } from 'lucide-react-native';
import { useTranslation } from '@i18n';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { useAuthStore } from '@store/authStore';
import { authApi } from '@api/endpoints/auth';
import { useToast } from '@hooks/useToast';

export function EmailVerificationBanner() {
  const { t } = useTranslation('auth');
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [sending, setSending] = useState(false);

  // Already verified, or not logged in -> render nothing.
  if (!user || user.emailVerifiedAt) return null;

  const handleResend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await authApi.resendVerification({ email: user.email });
      toast.success(t('emailVerification.sentBody'), {
        title: t('emailVerification.sentTitle'),
      });
    } catch {
      // Backend always returns 200 for valid input; a throw here means a
      // network/5xx error, not "email unknown". Keep the message generic.
      toast.error(t('emailVerification.errorBody'), {
        title: t('emailVerification.errorTitle'),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <MailWarning size={20} color={colors.warning} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{t('emailVerification.bannerTitle')}</Text>
        <Text style={styles.body}>{t('emailVerification.bannerBody')}</Text>
        <TouchableOpacity
          onPress={handleResend}
          disabled={sending}
          accessibilityRole="button"
          style={styles.action}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.warning} />
          ) : (
            <Text style={styles.actionText}>
              {t('emailVerification.resendButton')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningSurface,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: {
    paddingTop: 2,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    marginBottom: 2,
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  action: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  actionText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
  },
});

export default EmailVerificationBanner;
