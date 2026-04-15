/**
 * PaymentScreen — paiement natif Stripe via @stripe/stripe-react-native.
 *
 * Deux flux supportés :
 *  ─ CARD        : PaymentIntent → CardField → confirmPayment()
 *  ─ SEPA        : SetupIntent  → TextInput IBAN → confirmSetupIntent()
 *                  (FIX: was incorrectly calling confirmPayment() with a
 *                   setup_intent client_secret — broken at runtime)
 *
 * Le webhook setup_intent.succeeded côté API déclenche ensuite la charge SEPA.
 *
 * Icônes : lucide-react-native
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStripe, CardField } from '@stripe/stripe-react-native';
import type { CardFieldInput } from '@stripe/stripe-react-native';
import {
  Lock, CheckCircle2, ShieldCheck, CreditCard,
  AlertCircle, Landmark, Info, ChevronDown, Star,
} from 'lucide-react-native';
import { Button }       from '@components/ui/Button';
import { Card }         from '@components/ui/Card';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Separator }    from '@components/ui/Separator';
import { colors, palette } from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import { formatCurrency }          from '@utils/formatters';
import { useAuthStore }            from '@store/authStore';
import { paymentsApi }              from '@api/endpoints/payments';
import type { PaymentMethod }        from '@models/index';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'PaymentScreen'>;

// ── IBAN helpers ──────────────────────────────────────────────────────────────

/** Basic IBAN format validator (FR + general European). */
const isValidIban = (v: string): boolean => {
  const clean = v.replace(/\s/g, '').toUpperCase();
  return clean.length >= 14 && clean.length <= 34 && /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean);
};

/** Format IBAN with spaces every 4 chars for readability. */
const formatIban = (raw: string): string =>
  raw.replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();

// ── Component ─────────────────────────────────────────────────────────────────

export const PaymentScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    missionId,
    clientSecret,
    totalTTC,
    paymentMethod = 'CARD',
    intentType    = 'payment_intent',
  } = route.params;

  // FIX — import both confirmPayment and confirmSetupIntent
  const { confirmPayment, confirmSetupIntent } = useStripe();

  // Pre-fill billing details from auth store for better UX
  const user = useAuthStore(s => s.user);

  // ── Card state ──────────────────────────────────────────────────────────────
  const [cardComplete, setCardComplete] = useState(false);

  // ── SEPA state ──────────────────────────────────────────────────────────────
  const [iban,        setIban]        = useState('');
  const [ibanFocused, setIbanFocused] = useState(false);
  const ibanValid = isValidIban(iban);

  // ── Shared state ────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [paid,     setPaid]     = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Saved payment methods ────────────────────────────────────────────────
  const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    paymentsApi.getMyMethods().then(({ data: res }) => {
      const list = (res as any)?.data ?? (res as any) ?? [];
      const arr = Array.isArray(list) ? list : [];
      setSavedMethods(arr);
      // Auto-select first compatible saved method
      if (!isSepa) {
        const first = arr.find((m: PaymentMethod) => m.type === 'card');
        if (first) setSelectedMethodId(first.id);
      }
    }).catch(() => {});
  }, []);

  const compatibleSaved = savedMethods.filter(m =>
    isSepa ? m.type === 'sepa_debit' : m.type === 'card'
  );
  const isSepa     = paymentMethod === 'SEPA' || intentType === 'setup_intent';
  const usingSaved = !isSepa && selectedMethodId !== null;
  const canConfirm = isSepa ? ibanValid : (usingSaved || cardComplete);

  const handleCardChange = (details: CardFieldInput.Details) => {
    setCardComplete(details.complete);
    if (errorMsg) setErrorMsg(null);
  };

  const handleIbanChange = (text: string) => {
    const clean = text.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase();
    setIban(formatIban(clean));
    if (errorMsg) setErrorMsg(null);
  };

  // ── Confirm handler ─────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!canConfirm) {
      setErrorMsg(
        isSepa
          ? 'Veuillez saisir un IBAN valide (ex : FR76 3000 4028 3798 7654 3210 943).'
          : 'Veuillez saisir vos informations de carte complètes.',
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSepa) {
        // ── SEPA path ─────────────────────────────────────────────────────────
        //
        // FIX: A setup_intent client_secret MUST be confirmed with
        //      confirmSetupIntent(), NOT confirmPayment().
        //      Using confirmPayment() with a setup_intent secret throws a
        //      Stripe error at runtime and the IBAN is never collected.
        //
        const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
          paymentMethodType: 'SepaDebit',
          paymentMethodData: {
            iban: iban.replace(/\s/g, ''),
            billingDetails: {
              email: user?.email ?? '',
              name:  user?.fullName ?? '',
            },
          },
        });

        if (error) {
          setErrorMsg(mapStripeError(error.code, error.localizedMessage));
          return;
        }

        // SetupIntent statuses: Succeeded or Processing (mandate recorded)
        if (
          setupIntent?.status === 'Succeeded'  ||
          setupIntent?.status === 'Processing'
        ) {
          setPaid(true);
        } else {
          setErrorMsg(
            "Le mandat SEPA n'a pas pu être confirmé. Veuillez réessayer.",
          );
        }
      } else {
        // ── Card path ─────────────────────────────────────────────────────────
        const cardConfirmOptions: any = usingSaved && selectedMethodId
          ? { paymentMethodType: 'Card', paymentMethodData: { paymentMethodId: selectedMethodId } }
          : { paymentMethodType: 'Card', paymentMethodData: { billingDetails: { email: user?.email ?? '', name: user?.fullName ?? '' } } };
        const { paymentIntent, error } = await confirmPayment(clientSecret, cardConfirmOptions);

        if (error) {
          setErrorMsg(mapStripeError(error.code, error.localizedMessage));
          return;
        }

        if (
          paymentIntent?.status === 'Succeeded' ||
          paymentIntent?.status === 'Processing'
        ) {
          setPaid(true);
        } else {
          setErrorMsg("Le paiement n'a pas pu être confirmé. Veuillez réessayer.");
        }
      }
    } catch (err: unknown) {
      setErrorMsg((err as any)?.message ?? 'Une erreur est survenue lors du paiement.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (paid) {
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIcon}>
          <CheckCircle2 size={54} color={colors.success} strokeWidth={1.5} />
        </View>
        <Text style={styles.successTitle}>
          {isSepa ? 'Mandat SEPA enregistré !' : 'Paiement confirmé !'}
        </Text>
        <Text style={styles.successSubtitle}>
          {isSepa
            ? "Votre mandat SEPA est enregistré. Le débit sera effectué dans 1–2 jours ouvrés. Votre mission sera activée dès confirmation du paiement."
            : "Votre mission est confirmée. Les agents qualifiés dans votre secteur vont recevoir une notification. Vous recevrez votre facture par email."
          }
        </Text>
        <Button
          label="Voir ma mission"
          onPress={() => navigation.navigate('MissionDetail', { missionId })}
          fullWidth size="lg" style={styles.successBtn}
        />
        <Button
          label="Retour à l'accueil"
          onPress={() => navigation.navigate('MissionSuccess', { missionId })}
          fullWidth variant="ghost" size="md"
        />
      </View>
    );
  }

    // Stripe CardField only accepts solid hex colors — rgba() crashes on Android.
    const stripeCardStyle = {
      backgroundColor:  '#071e38',
      textColor:        '#FFFFFF',
      placeholderColor: '#66809F',
      cursorColor:      '#bc933b',
      fontSize:         15,
    };
  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Paiement"
        subtitle="Sécurisé par Stripe"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Amount recap */}
        <Card style={styles.amountCard} elevated>
          <Text style={styles.amountLabel}>Montant total TTC</Text>
          <Text style={styles.amountValue}>
            {totalTTC ? formatCurrency(totalTTC * 100) : '–'}
          </Text>
          <Text style={styles.amountSub}>TVA 20% incluse · Virement agent à J+15</Text>
        </Card>

        {/* Method badge */}
        <View style={styles.methodBadge}>
          {isSepa
            ? <Landmark   size={15} color={colors.primary} strokeWidth={1.8} />
            : <CreditCard size={15} color={colors.primary} strokeWidth={1.8} />
          }
          <Text style={styles.methodBadgeText}>
            {isSepa ? 'Débit SEPA' : 'Carte bancaire'}
          </Text>
        </View>


        {/* Saved payment methods selector (card only) */}
        {!isSepa && compatibleSaved.length > 0 && (
          <View style={styles.savedSection}>
            <Text style={styles.savedTitle}>CARTES ENREGISTREES</Text>
            {compatibleSaved.map((m: any) => {
              const selected = selectedMethodId === m.id;
              const brand = m.card?.brand ?? '';
              const label = (brand.charAt(0).toUpperCase() + brand.slice(1)) + '  ···· ' + (m.card?.last4 ?? '');
              const sub = 'Expire ' + String(m.card?.expMonth ?? '').padStart(2,'0') + '/' + (m.card?.expYear ?? '');
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.savedMethod, selected && styles.savedMethodActive]}
                  onPress={() => setSelectedMethodId(selected ? null : m.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.savedMethodIcon, selected && styles.savedMethodIconActive]}>
                    <CreditCard size={16} color={selected ? colors.primary : colors.textMuted} strokeWidth={1.8} />
                  </View>
                  <View style={styles.savedMethodInfo}>
                    <Text style={[styles.savedMethodLabel, selected && styles.savedMethodLabelActive]}>{label}</Text>
                    <Text style={styles.savedMethodSub}>{sub}</Text>
                  </View>
                  <View style={[styles.savedMethodRadio, selected && styles.savedMethodRadioActive]}>
                    {selected && <View style={styles.savedMethodRadioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.newCardToggle}
              onPress={() => setSelectedMethodId(null)}
              activeOpacity={0.75}
            >
              <Star size={13} color={selectedMethodId === null ? colors.primary : colors.textMuted} strokeWidth={2} />
              <Text style={[styles.newCardToggleText, selectedMethodId === null && styles.newCardToggleTextActive]}>
                Utiliser une nouvelle carte
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Stripe form card */}
        <Card style={styles.stripeCard} elevated>
          <View style={styles.stripeHeader}>
            <View style={styles.stripeHeaderLeft}>
              <Lock size={18} color={colors.success} strokeWidth={2} />
              <Text style={styles.stripeTitle}>
                {isSepa ? 'Compte bancaire (IBAN)' : 'Carte bancaire'}
              </Text>
            </View>
            <View style={styles.sslBadge}>
              <ShieldCheck size={12} color={colors.success} strokeWidth={2} />
              <Text style={styles.sslText}>TLS 256-bit</Text>
            </View>
          </View>

          <Separator marginV={spacing[3]} />

          {!isSepa && usingSaved ? (<View style={styles.savedSelectedBanner}><CheckCircle2 size={16} color={colors.success} strokeWidth={2} /><Text style={styles.savedSelectedText}>Carte enregistree selectionnee — aucune saisie requise.</Text></View>) : isSepa ? (
            <>
              {/* SEPA — manual IBAN TextInput (IbanField not exported in v0.40) */}
              <Text style={styles.ibanLabel}>IBAN</Text>
              <TextInput
                style={[
                  styles.ibanInput,
                  ibanFocused && styles.ibanInputFocused,
                  ibanValid   && styles.ibanInputValid,
                ]}
                value={iban}
                onChangeText={handleIbanChange}
                onFocus={() => setIbanFocused(true)}
                onBlur={() => setIbanFocused(false)}
                placeholder="FR76 3000 4028 3798 7654 3210 943"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="default"
                maxLength={42}
                selectionColor={colors.primary}
              />
              {iban.length > 0 && !ibanValid && (
                <Text style={styles.ibanError}>Format IBAN invalide — ex : FR76 3000 4028…</Text>
              )}
              {ibanValid && (
                <View style={styles.ibanValidRow}>
                  <CheckCircle2 size={13} color={colors.success} strokeWidth={2} />
                  <Text style={styles.ibanValidText}>IBAN valide</Text>
                </View>
              )}
              <View style={styles.sepaMandate}>
                <Info size={13} color={colors.primary} strokeWidth={2} />
                <Text style={styles.sepaMandateText}>
                  En fournissant votre IBAN, vous autorisez SecurBook à débiter votre compte
                  du montant indiqué conformément au mandat SEPA. Vous bénéficiez d'un droit
                  au remboursement dans les 8 semaines suivant le débit.
                </Text>
              </View>
            </>
          ) : (
            <>
                {/* Card — Stripe CardField wrapped for native border styling */}
                <View style={[
                  styles.cardFieldWrapper,
                  cardComplete && styles.cardFieldWrapperActive,
                ]}>
                  <CardField
                    postalCodeEnabled={false}
                    placeholders={{ number: '1234  5678  9012  3456' }}
                    cardStyle={stripeCardStyle}
                    style={styles.cardField}
                    onCardChange={handleCardChange}
                  />
                </View>
              <View style={styles.badges}>
                {['Visa', 'Mastercard', 'CB', 'AMEX'].map(b => (
                  <Text key={b} style={styles.badge}>{b}</Text>
                ))}
              </View>
            </>
          )}
        </Card>

        {/* Error */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color={colors.danger} strokeWidth={2} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Security note */}
        <View style={styles.secureInfo}>
          {isSepa
            ? <Landmark   size={15} color={colors.textMuted} strokeWidth={1.5} />
            : <CreditCard size={15} color={colors.textMuted} strokeWidth={1.5} />
          }
          <Text style={styles.secureText}>
            {isSepa
              ? "Vos coordonnées bancaires sont transmises directement à Stripe et ne transitent jamais par les serveurs SecurBook. Conforme au règlement SEPA UE 260/2012."
              : "Vos données bancaires sont chiffrées par Stripe et ne transitent jamais par les serveurs SecurBook. Paiement 3DS conforme DSP2."
            }
          </Text>
        </View>

      </ScrollView>

      {/* Fixed CTA */}
      <View style={styles.footer}>
        <Button
          label={
            loading
              ? 'Traitement en cours…'
              : isSepa
              ? 'Confirmer le mandat SEPA'
              : `Payer ${totalTTC ? formatCurrency(totalTTC * 100) : ''}`
          }
          onPress={handleConfirm}
          loading={loading}
          disabled={!canConfirm || loading}
          fullWidth size="lg"
        />
        <Text style={styles.footerNote}>
          {isSepa
            ? "En confirmant, vous autorisez le débit SEPA du montant indiqué. CGV applicables."
            : "En confirmant, vous acceptez les CGV SecurBook et la politique de remboursement."
          }
        </Text>
      </View>
    </View>
  );
};

// ── Stripe error mapping ──────────────────────────────────────────────────────

function mapStripeError(code?: string, fallback?: string): string {
  const messages: Record<string, string> = {
    card_declined:                     'Votre carte a été refusée. Veuillez utiliser une autre carte.',
    insufficient_funds:                'Fonds insuffisants sur votre carte.',
    expired_card:                      'Votre carte est expirée.',
    incorrect_cvc:                     'Le code CVC est incorrect.',
    incorrect_number:                  'Le numéro de carte est incorrect.',
    invalid_expiry_month:              "Le mois d'expiration est invalide.",
    invalid_expiry_year:               "L'année d'expiration est invalide.",
    processing_error:                  'Une erreur de traitement est survenue. Veuillez réessayer.',
    authentication_required:           'Authentification 3DS requise. Veuillez suivre les instructions.',
    do_not_honor:                      'Paiement refusé par votre banque. Contactez-la pour plus d\'informations.',
    invalid_bank_account_iban_invalid: "L'IBAN saisi est invalide. Vérifiez le format.",
    payment_method_not_available:      "Ce mode de paiement n'est pas disponible.",
    setup_intent_unexpected_state:     "Le mandat SEPA est dans un état inattendu. Réessayez.",
  };
  return messages[code ?? ''] ?? fallback ?? 'Opération refusée. Vérifiez vos informations.';
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[6], gap: spacing[4] },

  amountCard:  { alignItems: 'center', gap: spacing[1], paddingVertical: spacing[5] },
  amountLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  amountValue: { fontFamily: fontFamily.display, fontSize: fontSize['3xl'], color: colors.primary, letterSpacing: -1 },
  amountSub:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },

  methodBadge:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2], alignSelf: 'flex-start', backgroundColor: colors.primarySurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderWidth: 1, borderColor: colors.borderPrimary },
  methodBadgeText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },

  stripeCard:       { gap: spacing[3] },
  stripeHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stripeHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  stripeTitle:      { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textPrimary, letterSpacing: -0.2 },
  sslBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successSurface, paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.success },
  sslText:          { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.success },

  cardFieldWrapper: {
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     '#1a3d5e',
    overflow:        'hidden',
    backgroundColor: '#071e38',
  },
  cardFieldWrapperActive: {
    borderColor: '#bc933b',
    borderWidth: 1.5,
  },
  cardField: { width: '100%', height: 52 },

  badges: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] },
  badge:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, backgroundColor: colors.backgroundElevated, paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },

  ibanLabel:        { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing[2] },
  ibanInput: {
    backgroundColor:   colors.backgroundElevated,
    borderRadius:      radius.lg,
    borderWidth:       1,
    borderColor:       colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical:   Platform.OS === 'ios' ? spacing[3] : spacing[2],
    fontFamily:        fontFamily.mono,
    fontSize:          fontSize.base,
    color:             colors.textPrimary,
    letterSpacing:     1,
  },
  ibanInputFocused: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: 'rgba(59,130,246,0.06)' },
  ibanInputValid:   { borderColor: colors.success },
  ibanError:        { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger, marginTop: spacing[1] },
  ibanValidRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] },
  ibanValidText:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.success },

  sepaMandate:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], marginTop: spacing[3], backgroundColor: colors.primarySurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.borderPrimary },
  sepaMandateText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primary, lineHeight: fontSize.xs * 1.6 },

  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], backgroundColor: colors.dangerSurface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.danger },
  errorText:   { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger, lineHeight: fontSize.sm * 1.6 },

  secureInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], backgroundColor: colors.backgroundElevated, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  secureText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.7 },

  footer:     { paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing[2] },
  footerNote: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: fontSize.xs * 1.6 },

  successScreen:   { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.screenPaddingH, gap: spacing[4] },
  successIcon:     { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.successSurface, borderWidth: 2, borderColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  successTitle:    { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6, textAlign: 'center' },
  successSubtitle: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: fontSize.base * 1.6 },
  savedSection: { gap: spacing[2] },
  savedTitle: { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  savedMethod: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: colors.backgroundElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing[3] },
  savedMethodActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  savedMethodIcon: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  savedMethodIconActive: { backgroundColor: colors.primarySurface },
  savedMethodInfo: { flex: 1 },
  savedMethodLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary },
  savedMethodLabelActive: { color: colors.textPrimary },
  savedMethodSub: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  savedMethodRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  savedMethodRadioActive: { borderColor: colors.primary },
  savedMethodRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  newCardToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2], paddingHorizontal: spacing[3] },
  newCardToggleText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
  newCardToggleTextActive: { color: colors.primary, fontFamily: fontFamily.bodyMedium },
  savedSelectedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: colors.successSurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.success },
  savedSelectedText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.success },
  successBtn:      { marginTop: spacing[2] },
});
