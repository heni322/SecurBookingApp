/**
 * StripeSetupBanner — makes a broken Stripe setup visible instead of silent.
 *
 * Renders nothing when everything is healthy, so it costs nothing in the happy
 * path. When something IS wrong it replaces the previous failure mode (a greyed
 * -out CTA and no explanation) with the actual cause and the fix.
 *
 * Two audiences, two messages:
 *   • __DEV__ — the developer. Full detail: which fact failed, and what to do.
 *   • release — the end user. They can neither diagnose nor fix this, and the
 *     internals (SDK versions, file paths, key values) must not ship to them.
 *     They get a plain "card payment unavailable, use SEPA/transfer" and the
 *     engineering detail goes to console.error / crash reporting instead.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Wrench } from 'lucide-react-native';
import { colors } from '@theme/colors';
import { spacing, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { StripeIssue } from '@utils/stripeDiagnostics';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

interface Props {
  issues: StripeIssue[];
  /** Shown in release builds as the user-facing alternative. */
  fallbackHint?: string;
}

export const StripeSetupBanner: React.FC<Props> = ({ issues, fallbackHint }) => {
  if (issues.length === 0) return null;

  // ── Release: no internals, just an honest status and a way forward ────────
  if (!IS_DEV) {
    return (
      <View style={styles.prodBanner} accessibilityRole="alert">
        <AlertTriangle size={16} color={colors.warning} strokeWidth={2} />
        <Text style={styles.prodText}>
          {fallbackHint ??
            "Le paiement par carte est momentanément indisponible. Vous pouvez régler par virement."}
        </Text>
      </View>
    );
  }

  // ── Dev: the whole truth ──────────────────────────────────────────────────
  return (
    <View style={styles.devBanner} accessibilityRole="alert">
      <View style={styles.devHeader}>
        <Wrench size={15} color={colors.danger} strokeWidth={2} />
        <Text style={styles.devHeaderText}>
          Stripe non configuré — {issues.length} problème
          {issues.length > 1 ? 's' : ''} (visible en DEV uniquement)
        </Text>
      </View>

      {issues.map(issue => (
        <View key={issue.code} style={styles.issue}>
          <Text style={styles.issueTitle}>
            {issue.blocksCardEntry ? '⛔ ' : '⚠️ '}
            {issue.title}
          </Text>
          <Text style={styles.issueDetail}>{issue.detail}</Text>
          <Text style={styles.issueFix}>→ {issue.fix}</Text>
        </View>
      ))}

      <Text style={styles.devFooter}>
        Le bouton de paiement reste désactivé tant que ceci n'est pas résolu —
        ce n'est pas une erreur de saisie.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  prodBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.warningSurface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  prodText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: fontSize.sm * 1.6,
  },

  devBanner: {
    backgroundColor: colors.dangerSurface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    gap: spacing[3],
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  devHeaderText: {
    flex: 1,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  issue: {
    gap: 3,
    borderLeftWidth: 2,
    borderLeftColor: colors.dangerBorder,
    paddingLeft: spacing[3],
  },
  issueTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  issueDetail: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.6,
  },
  issueFix: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: colors.warning,
    lineHeight: fontSize.xs * 1.6,
  },
  devFooter: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
