
/**
 * AddPaymentMethodScreen - save a card or SEPA mandate without a mission.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStripe, CardField } from '@stripe/stripe-react-native';
import type { CardFieldInput } from '@stripe/stripe-react-native';
import { CreditCard, Landmark, Lock, ShieldCheck, CheckCircle2, AlertCircle, Info, ChevronRight } from 'lucide-react-native';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Separator } from '@components/ui/Separator';
import { colors } from '@theme/colors';
import { palette } from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import { paymentsApi } from '@api/endpoints/payments';
import { useAuthStore } from '@store/authStore';
import type { ProfileStackParamList } from '@models/index';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AddPaymentMethod'>;
type MethodType = 'card' | 'sepa_debit';

const isValidIban = (v: string): boolean => {
  const c = v.replace(/\s/g, '').toUpperCase();
  return c.length >= 14 && c.length <= 34 && /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(c);
};
const formatIban = (raw: string): string =>
  raw.replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();

const CARD_STYLE = { backgroundColor: palette.panelSolid, textColor: palette.white, placeholderColor: palette.muted, cursorColor: palette.gold, fontSize: 15 };
export const AddPaymentMethodScreen: React.FC<Props> = ({ navigation }) => {
  const { confirmSetupIntent } = useStripe();
  const user = useAuthStore(s => s.user);
  const [step, setStep] = useState<'pick' | 'form' | 'success'>('pick');
  const [methodType, setMethodType] = useState<MethodType>('card');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [iban, setIban] = useState('');
  const [ibanFocused, setIbanFocused] = useState(false);
  const ibanValid = isValidIban(iban);
  const canConfirm = methodType === 'card' ? cardComplete : ibanValid;

  const handlePickType = (t: MethodType) => {
    setMethodType(t); setErrorMsg(null); setCardComplete(false); setIban(''); setStep('form');
  };

  const handleConfirm = async () => {
    if (!canConfirm) {
      setErrorMsg(methodType === 'card' ? 'Veuillez saisir vos informations de carte completes.' : 'Veuillez saisir un IBAN valide.');
      return;
    }
    setLoading(true); setErrorMsg(null);
    try {
      const { data: res } = await paymentsApi.setupMethodIntent(methodType);
      const secret = (res as any)?.data?.clientSecret ?? (res as any)?.clientSecret;
      if (!secret) { setErrorMsg('Impossible de creer la session. Reessayez.'); return; }
      if (methodType === 'card') {
        const { setupIntent, error } = await confirmSetupIntent(secret, {
          paymentMethodType: 'Card',
          paymentMethodData: { billingDetails: { email: user?.email ?? '', name: user?.fullName ?? '' } },
        });
        if (error) { setErrorMsg(error.localizedMessage ?? 'Carte refusee.'); return; }
        if (setupIntent?.status !== 'Succeeded' && setupIntent?.status !== 'Processing') {
          setErrorMsg('La carte na pas pu etre enregistree.'); return;
        }
      } else {
        const { setupIntent, error } = await confirmSetupIntent(secret, {
          paymentMethodType: 'SepaDebit',
          paymentMethodData: { iban: iban.replace(/\s/g, ''), billingDetails: { email: user?.email ?? '', name: user?.fullName ?? '' } },
        });
        if (error) { setErrorMsg(error.localizedMessage ?? 'IBAN refuse.'); return; }
        if (setupIntent?.status !== 'Succeeded' && setupIntent?.status !== 'Processing') {
          setErrorMsg('Le mandat SEPA na pas pu etre enregistre.'); return;
        }
      }
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Une erreur est survenue.');
    } finally { setLoading(false); }
  };
  if (step === 'success') {
    return (
      <View style={s.screen}>
        <ScreenHeader title="Moyen de paiement" onBack={() => navigation.goBack()} />
        <View style={s.successWrap}>
          <View style={s.successIcon}>
            <CheckCircle2 size={52} color={colors.success} strokeWidth={1.5} />
          </View>
          <Text style={s.successTitle}>
            {methodType === 'card' ? 'Carte enregistree !' : 'Mandat SEPA enregistre !'}
          </Text>
          <Text style={s.successSub}>
            {methodType === 'card'
              ? 'Votre carte est sauvegardee en securite chez Stripe. Utilisez-la lors de vos prochains paiements.'
              : 'Votre IBAN est enregistre et disponible pour vos prochaines missions SEPA.'}
          </Text>
          <Button label="Voir mes moyens de paiement" onPress={() => navigation.goBack()} fullWidth size="lg" style={s.successBtn} />
        </View>
      </View>
    );
  }

  if (step === 'pick') {
    return (
      <View style={s.screen}>
        <ScreenHeader title="Ajouter un moyen de paiement" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.pickTitle}>Choisissez un type</Text>
          <Text style={s.pickSub}>Stocke en securite chez Stripe (PCI-DSS niveau 1).</Text>
          <TouchableOpacity style={s.pickCard} onPress={() => handlePickType('card')} activeOpacity={0.82}>
            <View style={[s.pickIcon, { backgroundColor: colors.primarySurface }]}>
              <CreditCard size={24} color={colors.primary} strokeWidth={1.8} />
            </View>
            <View style={s.pickInfo}>
              <Text style={s.pickLabel}>Carte bancaire</Text>
              <Text style={s.pickDesc}>Visa - Mastercard - CB - AMEX</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={s.pickCard} onPress={() => handlePickType('sepa_debit')} activeOpacity={0.82}>
            <View style={[s.pickIcon, { backgroundColor: colors.infoSurface }]}>
              <Landmark size={24} color={colors.info} strokeWidth={1.8} />
            </View>
            <View style={s.pickInfo}>
              <Text style={s.pickLabel}>Debit SEPA (IBAN)</Text>
              <Text style={s.pickDesc}>Virement SEPA - Zone euro</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
          <Card style={s.secNote}>
            <ShieldCheck size={14} color={colors.success} strokeWidth={2} />
            <Text style={s.secNoteText}>Vos donnees transitent directement vers Stripe via TLS 256-bit.</Text>
          </Card>
        </ScrollView>
      </View>
    );
  }
  const isSepa = methodType === 'sepa_debit';
  return (
    <View style={s.screen}>
      <ScreenHeader title={isSepa ? 'Ajouter un IBAN' : 'Ajouter une carte'} onBack={() => setStep('pick')} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.methodBadge}>
          {isSepa ? <Landmark size={14} color={colors.primary} strokeWidth={1.8} /> : <CreditCard size={14} color={colors.primary} strokeWidth={1.8} />}
          <Text style={s.methodBadgeText}>{isSepa ? 'Debit SEPA' : 'Carte bancaire'}</Text>
        </View>
        <Card style={s.formCard} elevated>
          <View style={s.formHeader}>
            <View style={s.formHeaderL}>
              <Lock size={16} color={colors.success} strokeWidth={2} />
              <Text style={s.formTitle}>{isSepa ? 'Coordonnees bancaires' : 'Informations de carte'}</Text>
            </View>
            <View style={s.sslBadge}>
              <ShieldCheck size={11} color={colors.success} strokeWidth={2} />
              <Text style={s.sslText}>TLS 256-bit</Text>
            </View>
          </View>
          <Separator marginV={spacing[3]} />
          {isSepa ? (
            <>
              <Text style={s.ibanLabel}>IBAN</Text>
              <TextInput
                style={[s.ibanInput, ibanFocused && s.ibanFocused, ibanValid && s.ibanValid]}
                value={iban}
                onChangeText={t => { setIban(formatIban(t.replace(/[^A-Za-z0-9 ]/g, ''))); if (errorMsg) setErrorMsg(null); }}
                onFocus={() => setIbanFocused(true)}
                onBlur={() => setIbanFocused(false)}
                placeholder="FR76 3000 4028 3798 7654 3210 943"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={42}
                selectionColor={colors.primary}
              />
              {iban.length > 0 && !ibanValid && <Text style={s.ibanErr}>Format IBAN invalide</Text>}
              {ibanValid && <View style={s.ibanOkRow}><CheckCircle2 size={13} color={colors.success} strokeWidth={2} /><Text style={s.ibanOkText}>IBAN valide</Text></View>}
              <View style={s.mandate}>
                <Info size={13} color={colors.primary} strokeWidth={2} />
                <Text style={s.mandateText}>En fournissant votre IBAN vous autorisez Provalk a debiter votre compte conformement au mandat SEPA. Droit au remboursement dans les 8 semaines.</Text>
              </View>
            </>
          ) : (
            <>
              <View style={[s.cardWrap, cardComplete && s.cardWrapActive]}>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{ number: '1234  5678  9012  3456' }}
                  cardStyle={CARD_STYLE}
                  style={s.cardField}
                  onCardChange={(d: CardFieldInput.Details) => { setCardComplete(d.complete); if (errorMsg) setErrorMsg(null); }}
                />
              </View>
              <View style={s.brands}>
                {['Visa','Mastercard','CB','AMEX'].map(b => <Text key={b} style={s.brand}>{b}</Text>)}
              </View>
            </>
          )}
        </Card>
        {errorMsg && (
          <View style={s.errBanner}>
            <AlertCircle size={15} color={colors.danger} strokeWidth={2} />
            <Text style={s.errText}>{errorMsg}</Text>
          </View>
        )}
        <View style={s.secInfo}>
          {isSepa ? <Landmark size={14} color={colors.textMuted} strokeWidth={1.5} /> : <CreditCard size={14} color={colors.textMuted} strokeWidth={1.5} />}
          <Text style={s.secInfoText}>{isSepa ? 'Vos coordonnees bancaires transitent directement vers Stripe.' : 'Vos donnees de carte sont chiffrees par Stripe. Paiement 3DS DSP2.'}</Text>
        </View>
      </ScrollView>
      <View style={s.footer}>
        <Button
          label={loading ? 'Enregistrement...' : isSepa ? "Enregistrer l'IBAN" : 'Enregistrer la carte'}
          onPress={handleConfirm} loading={loading} disabled={!canConfirm || loading} fullWidth size="lg"
        />
        <Text style={s.footerNote}>{isSepa ? 'En confirmant vous autorisez Provalk a utiliser cet IBAN.' : 'Donnees tokenisees par Stripe, jamais stockees sur nos serveurs.'}</Text>
      </View>
    </View>
  );
};
const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[5], paddingBottom: spacing[6], gap: spacing[4] },
  pickTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4 },
  pickSub:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm * 1.6, marginTop: -spacing[2] },
  pickCard:  { flexDirection: 'row', alignItems: 'center', gap: spacing[4], backgroundColor: colors.backgroundElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing[4] },
  pickIcon:  { width: 50, height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pickInfo:  { flex: 1 },
  pickLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.textPrimary },
  pickDesc:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3 },
  secNote:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], padding: spacing[4] },
  secNoteText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  methodBadge:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2], alignSelf: 'flex-start', backgroundColor: colors.primarySurface, borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderWidth: 1, borderColor: colors.borderPrimary },
  methodBadgeText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.primary },
  formCard:    { gap: spacing[3] },
  formHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formHeaderL: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  formTitle:   { fontFamily: fontFamily.display, fontSize: fontSize.md, color: colors.textPrimary, letterSpacing: -0.2 },
  sslBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.successSurface, paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.success },
  sslText:     { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.success },
  cardWrap:       { borderRadius: 12, borderWidth: 1, borderColor: palette.panelBorder, overflow: 'hidden', backgroundColor: palette.panelSolid },
  cardWrapActive: { borderColor: colors.primary, borderWidth: 1.5 },
  cardField:      { width: '100%', height: 52 },
  brands: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] },
  brand:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, backgroundColor: colors.backgroundElevated, paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  ibanLabel:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing[2] },
  ibanInput:   { backgroundColor: colors.backgroundElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing[4], paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2], fontFamily: fontFamily.mono, fontSize: fontSize.base, color: colors.textPrimary, letterSpacing: 1 },
  ibanFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  ibanValid:   { borderColor: colors.success },
  ibanErr:     { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger, marginTop: spacing[1] },
  ibanOkRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] },
  ibanOkText:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.success },
  mandate:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], marginTop: spacing[3], backgroundColor: colors.primarySurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.borderPrimary },
  mandateText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primary, lineHeight: fontSize.xs * 1.6 },
  errBanner:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], backgroundColor: colors.dangerSurface, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.danger },
  errText:     { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger, lineHeight: fontSize.sm * 1.5 },
  secInfo:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], backgroundColor: colors.backgroundElevated, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: colors.border },
  secInfoText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.7 },
  footer:     { paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing[2] },
  footerNote: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: fontSize.xs * 1.6 },
  successWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.screenPaddingH, gap: spacing[4] },
  successIcon:  { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.successSurface, borderWidth: 2, borderColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  successTitle: { fontFamily: fontFamily.display, fontSize: fontSize['2xl'], color: colors.textPrimary, letterSpacing: -0.6, textAlign: 'center' },
  successSub:   { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: fontSize.base * 1.6 },
  successBtn:   { marginTop: spacing[2], width: '100%' },
});




