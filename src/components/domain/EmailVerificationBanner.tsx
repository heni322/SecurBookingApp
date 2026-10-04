/**
 * EmailVerificationBanner
 *
 * Soft-enforcement UI counterpart to the backend email-verification flow.
 * Renders nothing when there is no user or the email is already verified, so
 * it stays safe to mount unconditionally on any screen.
 *
 * Two variants, on purpose:
 *
 *   - `strip`  (default) : a single-line notice pinned under a screen header.
 *                          Ambient, low vertical cost (~48dp instead of the
 *                          ~200dp card it replaces), dismissible with a 24h
 *                          snooze so it does not become wallpaper.
 *   - `inline`           : a compact just-in-time notice placed next to the
 *                          action that verification actually blocks (payment).
 *                          Never dismissible - it explains a real blocker.
 *
 * Layout contract: the component owns NO horizontal margin. Parent screens
 * already apply `layout.screenPaddingH`; the previous `marginHorizontal`
 * stacked on top of it and left the banner visibly inset from every other
 * card on the screen.
 *
 * Colour: `info` (blue), not `warning`. In this theme `warning` resolves to
 * the brand gold that is also used for the primary CTA, the active tab and
 * monetary totals - a passive account nudge must not compete with those.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MailWarning, X } from 'lucide-react-native';
import { useTranslation } from '@i18n';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { useAuthStore } from '@store/authStore';
import { authApi } from '@api/endpoints/auth';
import { useToast } from '@hooks/useToast';

export type EmailVerificationVariant = 'strip' | 'inline';

/** Snooze timestamp (ms epoch) for the dismissible strip. */
const SNOOZE_KEY = '@securbook/emailVerification/snoozedUntil';
/** Client-side guard against resend spamming; mirrors the backend throttle. */
const RESEND_COOLDOWN_S = 60;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export interface EmailVerificationBannerProps {
  variant?: EmailVerificationVariant;
  /** Defaults to true for `strip`, false for `inline`. */
  dismissible?: boolean;
  /** How long a dismissal lasts. */
  snoozeHours?: number;
  style?: StyleProp<ViewStyle>;
}

export function EmailVerificationBanner({
  variant = 'strip',
  dismissible = variant === 'strip',
  snoozeHours = 24,
  style,
}: EmailVerificationBannerProps) {
  const { t } = useTranslation('auth');
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [hidden, setHidden] = useState(false);
  // Non-dismissible variants have nothing to hydrate, so they are ready at once.
  const [ready, setReady] = useState(!dismissible);

  // Hydrate the snooze window once. Rendering stays suppressed until this
  // resolves, otherwise the banner flashes in then disappears on every mount.
  useEffect(() => {
    if (!dismissible) return;
    let alive = true;
    AsyncStorage.getItem(SNOOZE_KEY)
      .then((raw) => {
        if (!alive) return;
        const until = raw ? Number(raw) : 0;
        setHidden(Number.isFinite(until) && until > Date.now());
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [dismissible]);

  // Countdown tick. Self-cancelling, one timer at a time.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (sending || cooldown > 0 || !user) return;
    setSending(true);
    try {
      await authApi.resendVerification({ email: user.email });
      setCooldown(RESEND_COOLDOWN_S);
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
  }, [sending, cooldown, user, toast, t]);

  const handleDismiss = useCallback(() => {
    setHidden(true);
    AsyncStorage.setItem(
      SNOOZE_KEY,
      String(Date.now() + snoozeHours * 60 * 60 * 1000),
    ).catch(() => undefined);
  }, [snoozeHours]);

  // ── Guards (after all hooks, never before) ──────────────────────────────
  if (!user || user.emailVerifiedAt) return null;
  if (!ready || hidden) return null;

  const busy = sending || cooldown > 0;
  const renderAction = (extra?: StyleProp<ViewStyle>) => (
    <TouchableOpacity
      onPress={handleResend}
      disabled={busy}
      activeOpacity={0.75}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={t('emailVerification.resendButton')}
      accessibilityState={{ disabled: busy, busy: sending }}
      style={[styles.action, busy && styles.actionDisabled, extra]}
    >
      {sending ? (
        <ActivityIndicator size="small" color={colors.info} />
      ) : (
        <Text
          style={[styles.actionText, cooldown > 0 && styles.actionTextMuted]}
          numberOfLines={1}
        >
          {cooldown > 0
            ? t('emailVerification.cooldown', { seconds: cooldown })
            : t('emailVerification.resendShort')}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (variant === 'inline') {
    return (
      <View style={[styles.inline, style]} accessibilityRole="alert">
        <MailWarning size={16} color={colors.info} strokeWidth={2} style={styles.inlineIcon} />
        <View style={styles.inlineText}>
          <Text style={styles.inlineTitle}>{t('emailVerification.bannerTitleShort')}</Text>
          <Text style={styles.inlineBody}>{t('emailVerification.inlineBody')}</Text>
          {renderAction(styles.actionStacked)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.strip, style]} accessibilityRole="alert">
      <MailWarning size={18} color={colors.info} strokeWidth={2} />
      <Text style={styles.stripTitle} numberOfLines={1}>
        {t('emailVerification.bannerTitleShort')}
      </Text>
      {renderAction()}
      {dismissible && (
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={HIT_SLOP}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('emailVerification.dismiss')}
          style={styles.close}
        >
          <X size={16} color={colors.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── strip ────────────────────────────────────────────────────────────────
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 48,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.infoSurface,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radius.md,
    marginBottom: spacing[4],
  },
  stripTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodyMedium,
  },
  close: {
    paddingLeft: spacing[1],
  },

  // ── inline (just-in-time, next to a blocked action) ──────────────────────
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.infoSurface,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radius.md,
    marginBottom: spacing[3],
  },
  inlineIcon: {
    marginTop: 2,
  },
  inlineText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  inlineTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
    marginBottom: 2,
  },
  inlineBody: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },

  // ── shared action pill ───────────────────────────────────────────────────
  action: {
    minHeight: 32,
    minWidth: 72,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: radius.full,
  },
  actionStacked: {
    marginTop: spacing[2],
  },
  actionDisabled: {
    borderColor: colors.borderSubtle,
  },
  actionText: {
    color: colors.info,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bodySemiBold,
  },
  actionTextMuted: {
    color: colors.textMuted,
  },
});

export default EmailVerificationBanner;
