/**
 * QuoteBreakdownCard — détail financier d'un devis.
 * Adapté aux champs plats du backend (pas d'objet breakdown imbriqué).
 */
import React from 'react';
import { useTranslation } from '@i18n';
import { View, Text, StyleSheet } from 'react-native';
import { Card }      from '@components/ui/Card';
import { Separator } from '@components/ui/Separator';
import { Button }    from '@components/ui/Button';
import { colors }    from '@theme/colors';
import { spacing }   from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatCurrency, formatDate } from '@utils/formatters';
import type { Quote } from '@models/index';

interface Props {
  quote:     Quote;
  onAccept?: () => void;
  loading?:  boolean;
  readonly?: boolean;
}

export const QuoteBreakdownCard: React.FC<Props> = ({
  quote,
  onAccept,
  loading  = false,
  readonly = false,
}) => {
  const isAccepted = quote.status === 'ACCEPTED';
  const { t } = useTranslation('quote');

  // Lignes financières depuis les champs plats du backend
  const rows: Array<{ label: string; value: number; muted?: boolean }> = [
    { label: t('row_base_ht'),               value: quote.totalClientPrice - quote.nightSurcharge - quote.weekendSurcharge - quote.urgencySurcharge },
    { label: t('row_night'),       value: quote.nightSurcharge,   muted: quote.nightSurcharge === 0 },
    { label: t('row_weekend'),   value: quote.weekendSurcharge, muted: quote.weekendSurcharge === 0 },
    { label: t('row_urgency'),    value: quote.urgencySurcharge, muted: quote.urgencySurcharge === 0 },
    { label: t('row_subtotal'),        value: quote.totalClientPrice },
    { label: t('row_vat'),              value: quote.vatAmount },
  ];

  return (
    <Card elevated style={styles.card}>
      <Text style={styles.heading}>{t('breakdown_title')}</Text>

      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={[styles.rowLabel, row.muted && styles.muted]}>{row.label}</Text>
            <Text style={[styles.rowValue, row.muted && styles.muted]}>
              {row.muted ? '—' : formatCurrency(row.value * 100)}
            </Text>
          </View>
        ))}
      </View>

      <Separator marginV={spacing[3]} />

      {/* Total TTC */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t('row_total_ttc')}</Text>
        <Text style={styles.totalValue}>{formatCurrency(quote.totalWithVat * 100)}</Text>
      </View>

      {/* Rémunération agent */}
      <View style={styles.row}>
        <Text style={styles.agentLabel}>{t('agent_payout')}</Text>
        <Text style={styles.agentValue}>{formatCurrency(quote.totalAgentSalary * 100)}</Text>
      </View>

      {/* Commission plateforme */}
      <View style={[styles.row, { marginTop: 4 }]}>
        <Text style={styles.agentLabel}>{t('row_commission')}</Text>
        <Text style={[styles.agentValue, { color: colors.textMuted }]}>
          {formatCurrency(quote.platformMargin * 100)}
        </Text>
      </View>

      {/* CTA accepter */}
      {!readonly && !isAccepted && onAccept && (
        <>
          <Separator marginV={spacing[3]} />
          <Button
            label={t('accept_label')}
            onPress={onAccept}
            loading={loading}
            fullWidth
            variant="filled"
          />
          <Text style={styles.expiryNote}>
            {t('valid_until', { date: formatDate(quote.expiresAt) })}
          </Text>
        </>
      )}

      {isAccepted && (
        <View style={styles.acceptedBadge}>
          <Text style={styles.acceptedText}>{t('accepted_badge')}</Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card:       { gap: 0 },
  heading: {
    fontFamily:   fontFamily.display,
    fontSize:     fontSize.md,
    color:        colors.textPrimary,
    marginBottom: spacing[4],
    letterSpacing: -0.3,
  },
  rows:       { gap: spacing[2] },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  rowValue:   { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.textPrimary },
  muted:      { color: colors.textMuted },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing[1] },
  totalLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  totalValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.primary, letterSpacing: -0.5 },
  agentLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  agentValue: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.success },
  expiryNote: { textAlign: 'center', fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing[2] },
  acceptedBadge: {
    marginTop:       spacing[3],
    backgroundColor: colors.successSurface,
    borderRadius:    10,
    paddingVertical: spacing[3],
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     colors.success,
  },
  acceptedText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, color: colors.success },
});
