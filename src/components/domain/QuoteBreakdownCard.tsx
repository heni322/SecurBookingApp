/**
 * QuoteBreakdownCard — détail financier d'un devis.
 *
 * NOUVEAU (avr 2026) — Section "Prestations" détaillée :
 *   Groupe les bookings de la mission par ServiceType et affiche pour chaque
 *   type d'agent :  Nom — N agents — Heures — Taux HT/h — Sous-total
 *
 * AFFICHAGE CLIENT — règles strictes :
 *   ✗ JAMAIS de ligne "Rémunération agent" (donnée RH interne)
 *   ✗ JAMAIS de ligne "Commission Provalk" (donnée plateforme interne)
 *   ✓ Total HT = totalClientPrice = prix tout-inclus avant TVA
 *   ✓ TVA = totalWithVat − totalClientPrice (taux dynamique depuis le moteur)
 *
 * Si la prop `mission` n'est pas fournie (rétrocompat), la section Prestations
 * est masquée et seules les majorations + TVA s'affichent.
 *
 * FIX (mai 2026): baseRatePerHour est un Prisma Decimal sérialisé en string
 *   over JSON. Était stocké tel quel dans PrestationRow.ratePerHour → crash
 *   "undefined is not a function" lors du .toFixed(). Désormais coercé via
 *   Number() dès l'ingestion dans buildPrestationRows.
 *
 * FIX (mai 2026): vatRate = 0.2 (décimal, 0–1) côté DB mais affiché en %
 *   — multiplié par 100 pour l'affichage ("TVA 20%" au lieu de "TVA 0.2%").
 */
import React, { useMemo } from 'react';
import { useTranslation } from '@i18n';
import { View, Text, StyleSheet } from 'react-native';
import { Card }      from '@components/ui/Card';
import { Separator } from '@components/ui/Separator';
import { Button }    from '@components/ui/Button';
import { colors }    from '@theme/colors';
import { spacing }   from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { formatCurrency, formatDate } from '@utils/formatters';
import type { Quote, Mission, Booking } from '@models/index';

interface Props {
  quote:     Quote;
  /**
   * Mission associée — si fournie, ses `bookings` sont groupés par ServiceType
   * pour afficher le détail par type d'agent (nombre, heures, taux, sous-total).
   * Non requise : si absente, la section Prestations est masquée.
   */
  mission?:  Mission;
  onAccept?: () => void;
  loading?:  boolean;
  readonly?: boolean;
}

/** Ligne agrégée par type de service pour l'affichage. */
interface PrestationRow {
  serviceTypeId: string;
  serviceName:   string;
  agentCount:    number;
  hours:         number;
  ratePerHour:   number;   // tarif HT pratiqué — toujours un number (coercé depuis string)
  subtotal:      number;   // agentCount × hours × ratePerHour
}

/**
 * Regroupe les bookings non annulés par serviceTypeId.
 *
 * IMPORTANT: ServiceType.baseRatePerHour est un Prisma Decimal — il arrive
 * sérialisé en *string* via JSON (ex: "18", "24.5"). On le coerce en number
 * avec Number() ici pour que .toFixed() et l'arithmétique fonctionnent
 * correctement dans le rendu.
 *
 * Note : c'est un affichage indicatif — le vrai total reste
 * `quote.totalClientPrice`.
 */
function buildPrestationRows(
  bookings: Booking[],
  durationHours: number,
): PrestationRow[] {
  const map = new Map<string, PrestationRow>();
  for (const b of bookings) {
    if (!b.serviceTypeId || !b.serviceType) continue;
    if (['CANCELLED', 'ABANDONED'].includes(b.status)) continue;

    // Coerce Prisma Decimal / string → number. Fallback to 0 on parse failure.
    const rate = Number(b.serviceType.baseRatePerHour ?? 0) || 0;

    const existing = map.get(b.serviceTypeId);
    if (existing) {
      existing.agentCount += 1;
      existing.subtotal = existing.agentCount * existing.hours * existing.ratePerHour;
    } else {
      map.set(b.serviceTypeId, {
        serviceTypeId: b.serviceTypeId,
        serviceName:   b.serviceType.name,
        agentCount:    1,
        hours:         durationHours,
        ratePerHour:   rate,
        subtotal:      durationHours * rate,
      });
    }
  }
  return Array.from(map.values());
}

export const QuoteBreakdownCard: React.FC<Props> = ({
  quote,
  mission,
  onAccept,
  loading  = false,
  readonly = false,
}) => {
  const isAccepted = quote.status === 'ACCEPTED';
  const { t } = useTranslation('quote');

  // ── Numeric guard ────────────────────────────────────────────────────────────
  // All Quote financial fields come from Prisma NUMERIC columns and are
  // serialized as strings over JSON. num() safely coerces them.
  const num = (v: unknown): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const totalClientPrice = num(quote.totalClientPrice); // HT — tout inclus
  const totalWithVat     = num(quote.totalWithVat);     // TTC
  const nightSurcharge   = num(quote.nightSurcharge);
  const weekendSurcharge = num(quote.weekendSurcharge);
  const urgencySurcharge = num(quote.urgencySurcharge);

  // vatRate is stored as a decimal fraction (0.2 = 20%) in the DB.
  // Multiply by 100 for display ("TVA 20%") but keep raw for computation.
  const vatRateRaw     = num(quote.vatRate ?? 0.2);   // e.g. 0.2
  const vatRateDisplay = vatRateRaw <= 1              // guard: if already 20 keep it
    ? Math.round(vatRateRaw * 100)                    // 0.2 → 20
    : Math.round(vatRateRaw);                         // 20 → 20 (legacy)

  const vatAmount =
    quote.vatAmount != null && Number.isFinite(num(quote.vatAmount))
      ? num(quote.vatAmount)
      : Math.round((totalWithVat - totalClientPrice) * 100) / 100;

  // Base HT = sous-total sans les majorations explicitement affichées
  const baseHt =
    totalClientPrice - nightSurcharge - weekendSurcharge - urgencySurcharge;

  // ── Prestations (groupées par ServiceType) ───────────────────────────────────
  const prestations = useMemo<PrestationRow[]>(() => {
    if (!mission?.bookings || mission.bookings.length === 0) return [];
    const dh = num(mission.durationHours);
    if (dh === 0) return [];
    return buildPrestationRows(mission.bookings, dh);
  }, [mission]);

  // ── Lignes de la ventilation (majorations + sous-total + TVA) ────────────────
  const breakdownRows: Array<{ label: string; value: number; muted?: boolean }> = [
    { label: t('row_base_ht'),     value: baseHt },
    { label: t('row_night'),       value: nightSurcharge,   muted: nightSurcharge === 0 },
    { label: t('row_weekend'),     value: weekendSurcharge, muted: weekendSurcharge === 0 },
    { label: t('row_urgency'),     value: urgencySurcharge, muted: urgencySurcharge === 0 },
    { label: t('row_subtotal'),    value: totalClientPrice },
    { label: t('row_vat', { rate: vatRateDisplay }), value: vatAmount },
  ];

  return (
    <Card elevated style={styles.card}>
      <Text style={styles.heading}>{t('breakdown_title')}</Text>

      {/* ── Section Prestations (par type d'agent) ─────────────────────────── */}
      {prestations.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>{t('prestations_title')}</Text>
          <View style={styles.prestationsBlock}>
            {prestations.map((p) => (
              <View key={p.serviceTypeId} style={styles.prestationItem}>
                <View style={styles.prestationHeader}>
                  <Text style={styles.prestationName} numberOfLines={1}>
                    {p.serviceName}
                  </Text>
                  <Text style={styles.prestationSubtotal}>
                    {formatCurrency(p.subtotal * 100)}
                  </Text>
                </View>
                <View style={styles.prestationMeta}>
                  <Text style={styles.prestationMetaText}>
                    {t(
                      p.agentCount > 1
                        ? 'prestation_agents_plural'
                        : 'prestation_agents',
                      { count: p.agentCount },
                    )}
                    {'  ·  '}
                    {t('prestation_hours', { hours: p.hours.toFixed(p.hours % 1 === 0 ? 0 : 1) })}
                    {'  ·  '}
                    {t('prestation_rate', { rate: p.ratePerHour.toFixed(2) })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Separator marginV={spacing[3]} />
        </>
      )}

      {/* ── Ventilation (majorations + TVA) ─────────────────────────────────── */}
      <View style={styles.rows}>
        {breakdownRows.map((row) => (
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
        <Text style={styles.totalValue}>{formatCurrency(totalWithVat * 100)}</Text>
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
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.md,
    color:         colors.textPrimary,
    marginBottom:  spacing[4],
    letterSpacing: -0.3,
  },

  // ── Section Prestations ─────────────────────────────────────────────────────
  sectionLabel: {
    fontFamily:     fontFamily.bodySemiBold,
    fontSize:       fontSize.xs,
    color:          colors.textSecondary,
    letterSpacing:  1,
    textTransform:  'uppercase',
    marginBottom:   spacing[3],
  },
  prestationsBlock: {
    gap: spacing[3],
  },
  prestationItem: {
    gap: spacing[1],
  },
  prestationHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  prestationName: {
    flex:          1,
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.sm,
    color:         colors.textPrimary,
    marginRight:   spacing[2],
  },
  prestationSubtotal: {
    fontFamily: fontFamily.mono,
    fontSize:   fontSize.sm,
    color:      colors.textPrimary,
  },
  prestationMeta: {
    flexDirection: 'row',
  },
  prestationMetaText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.textMuted,
  },

  // ── Ventilation ─────────────────────────────────────────────────────────────
  rows:       { gap: spacing[2] },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary },
  rowValue:   { fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: colors.textPrimary },
  muted:      { color: colors.textMuted },

  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing[1] },
  totalLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  totalValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.primary, letterSpacing: -0.5 },

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
