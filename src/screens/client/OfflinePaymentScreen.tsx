/**
 * OfflinePaymentScreen — Virement bancaire ou cheque (FIX #6).
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Clipboard,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Landmark, FileText, Copy, CheckCircle2,
  Building2, ArrowRight, Info,
} from 'lucide-react-native';
import { Button }       from '@components/ui/Button';
import { Card }         from '@components/ui/Card';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Separator }    from '@components/ui/Separator';
import { paymentsApi }  from '@api/endpoints/payments';
import { formatEuros }  from '@utils/formatters';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList, OfflinePaymentInstructions } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'OfflinePayment'>;
type OfflineMethod = 'VIREMENT' | 'CHEQUE';

export const OfflinePaymentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId, totalTTC } = route.params;
  const [method,       setMethod]       = useState<OfflineMethod>('VIREMENT');
  const [submitting,   setSubmitting]   = useState(false);
  const [instructions, setInstructions] = useState<OfflinePaymentInstructions | null>(null);
  const [copiedKey,    setCopiedKey]    = useState<string | null>(null);

  const handleCopy = (key: string, value: string) => {
    Clipboard.setString(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: res } = await paymentsApi.declareOffline({ missionId, method });
      const result = (res as any).data ?? res;
      setInstructions(result.instructions);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? 'Une erreur est survenue.';
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (instructions) {
    const isVirement = instructions.type === 'VIREMENT';
    return (
      <View style={styles.screen}>
        <ScreenHeader
          title={isVirement ? 'Coordonnees bancaires' : 'Envoi du cheque'}
          subtitle="Votre declaration a ete enregistree"
          onBack={() => navigation.popToTop()}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.successWrap}>
            <View style={styles.successIcon}>
              <CheckCircle2 size={36} color={colors.success} strokeWidth={1.6} />
            </View>
            <Text style={styles.successTitle}>Declaration enregistree</Text>
            <Text style={styles.successSubtitle}>
              {isVirement
                ? "Effectuez le virement avec les coordonnees ci-dessous. Votre mission sera confirmee des reception (1 a 3 jours ouvres)."
                : "Envoyez votre cheque a l'adresse ci-dessous. Votre mission sera confirmee des reception."
              }
            </Text>
          </View>
          <Card elevated style={styles.instructCard}>
            {isVirement ? (
              <>
                <Text style={styles.instructTitle}>COORDONNEES BANCAIRES</Text>
                <Separator marginV={spacing[3]} />
                <InstructRow label="Beneficiaire" value={instructions.beneficiary ?? 'SecurBook SAS'} copyKey="beneficiary" copiedKey={copiedKey} onCopy={handleCopy} />
                <InstructRow label="IBAN" value={instructions.iban ?? ''} copyKey="iban" copiedKey={copiedKey} onCopy={handleCopy} mono />
                <InstructRow label="BIC / SWIFT" value={instructions.bic ?? ''} copyKey="bic" copiedKey={copiedKey} onCopy={handleCopy} mono />
                <InstructRow label="Reference obligatoire" value={instructions.reference ?? ''} copyKey="ref" copiedKey={copiedKey} onCopy={handleCopy} accent />
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Montant exact</Text>
                  <Text style={styles.amountValue}>{formatEuros(totalTTC * 100)}</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.instructTitle}>ENVOI DU CHEQUE</Text>
                <Separator marginV={spacing[3]} />
                <InstructRow label="A l'ordre de" value={instructions.payable ?? 'SecurBook SAS'} copyKey="payable" copiedKey={copiedKey} onCopy={handleCopy} />
                <InstructRow label="Adresse d'envoi" value={instructions.address ?? ''} copyKey="address" copiedKey={copiedKey} onCopy={handleCopy} />
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Montant du cheque</Text>
                  <Text style={styles.amountValue}>{formatEuros(totalTTC * 100)}</Text>
                </View>
              </>
            )}
          </Card>
          <View style={styles.infoBox}>
            <Info size={14} color={colors.info} strokeWidth={2} />
            <Text style={styles.infoText}>{instructions.message}</Text>
          </View>
          <Button
            label="Suivre ma mission"
            onPress={() => navigation.replace('MissionDetail', { missionId })}
            fullWidth size="lg"
            rightIcon={<ArrowRight size={18} color={colors.textInverse} strokeWidth={2} />}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Paiement hors-ligne" subtitle="Virement ou cheque" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card elevated style={styles.amountCard}>
          <Text style={styles.amountCardLabel}>Montant total TTC</Text>
          <Text style={styles.amountCardValue}>{formatEuros(totalTTC * 100)}</Text>
          <Text style={styles.amountCardSub}>TVA 20% incluse</Text>
        </Card>
        <View style={styles.methodSection}>
          <Text style={styles.methodSectionTitle}>MODE DE PAIEMENT</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity style={[styles.methodChip, method === 'VIREMENT' && styles.methodChipActive]} onPress={() => setMethod('VIREMENT')} activeOpacity={0.8}>
              <Landmark size={20} color={method === 'VIREMENT' ? colors.primary : colors.textMuted} strokeWidth={1.8} />
              <Text style={[styles.methodChipLabel, method === 'VIREMENT' && styles.methodChipLabelActive]}>Virement</Text>
              <Text style={styles.methodChipSub}>Bancaire</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.methodChip, method === 'CHEQUE' && styles.methodChipActive]} onPress={() => setMethod('CHEQUE')} activeOpacity={0.8}>
              <FileText size={20} color={method === 'CHEQUE' ? colors.primary : colors.textMuted} strokeWidth={1.8} />
              <Text style={[styles.methodChipLabel, method === 'CHEQUE' && styles.methodChipLabelActive]}>Cheque</Text>
              <Text style={styles.methodChipSub}>Postal</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoBox}>
          <Info size={14} color={colors.info} strokeWidth={2} />
          <Text style={styles.infoText}>
            {method === 'VIREMENT'
              ? "Vous recevrez les coordonnees bancaires (IBAN + reference). Votre mission sera publiee apres reception du virement (1 a 3 jours ouvres)."
              : "Vous recevrez l'adresse d'envoi du cheque. Votre mission sera publiee apres reception et validation."
            }
          </Text>
        </View>
        <Card style={styles.delayCard}>
          <Building2 size={16} color={colors.warning} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <Text style={styles.delayTitle}>Delai de traitement</Text>
            <Text style={styles.delayText}>
              {method === 'VIREMENT'
                ? "1 a 3 jours ouvres. Pour une confirmation immediate, privilegiez la carte ou le SEPA."
                : "2 a 5 jours ouvres selon les delais postaux."
              }
            </Text>
          </View>
        </Card>
        <Button
          label={submitting ? 'Enregistrement...' : `Confirmer le ${method === 'VIREMENT' ? 'virement' : 'cheque'}`}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          fullWidth size="lg"
        />
      </ScrollView>
    </View>
  );
};

const InstructRow: React.FC<{
  label: string; value: string; copyKey: string; copiedKey: string | null;
  onCopy: (key: string, value: string) => void; mono?: boolean; accent?: boolean;
}> = ({ label, value, copyKey, copiedKey, onCopy, mono, accent }) => {
  const copied = copiedKey === copyKey;
  return (
    <View style={rowStyles.wrap}>
      <View style={rowStyles.left}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={[rowStyles.value, mono && rowStyles.mono, accent && rowStyles.accent]}>{value}</Text>
      </View>
      <TouchableOpacity style={[rowStyles.copyBtn, copied && rowStyles.copyBtnDone]} onPress={() => onCopy(copyKey, value)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
        {copied
          ? <CheckCircle2 size={16} color={colors.success} strokeWidth={2} />
          : <Copy size={16} color={colors.textMuted} strokeWidth={1.8} />
        }
      </TouchableOpacity>
    </View>
  );
};

const rowStyles = StyleSheet.create({
  wrap:        { flexDirection:'row', alignItems:'center', paddingVertical:spacing[3], borderBottomWidth:1, borderBottomColor:colors.border },
  left:        { flex:1, gap:2 },
  label:       { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.xs, color:colors.textMuted, textTransform:'uppercase', letterSpacing:0.5 },
  value:       { fontFamily:fontFamily.body, fontSize:fontSize.base, color:colors.textPrimary },
  mono:        { fontFamily:fontFamily.mono, letterSpacing:0.5 },
  accent:      { fontFamily:fontFamily.bodySemiBold, color:colors.primary, fontSize:fontSize.md },
  copyBtn:     { width:32, height:32, borderRadius:radius.lg, borderWidth:1, borderColor:colors.border, backgroundColor:colors.surface, alignItems:'center', justifyContent:'center' },
  copyBtnDone: { borderColor:colors.success, backgroundColor:colors.successSurface },
});

const styles = StyleSheet.create({
  screen:              { flex:1, backgroundColor:colors.background },
  content:             { paddingHorizontal:layout.screenPaddingH, paddingTop:spacing[4], paddingBottom:spacing[10], gap:spacing[4] },
  successWrap:         { alignItems:'center', gap:spacing[3] },
  successIcon:         { width:80, height:80, borderRadius:40, backgroundColor:colors.successSurface, borderWidth:1.5, borderColor:colors.success, alignItems:'center', justifyContent:'center' },
  successTitle:        { fontFamily:fontFamily.display, fontSize:fontSize.xl, color:colors.textPrimary, letterSpacing:-0.4, textAlign:'center' },
  successSubtitle:     { fontFamily:fontFamily.body, fontSize:fontSize.sm, color:colors.textSecondary, textAlign:'center', lineHeight:20 },
  instructCard:        { gap:0 },
  instructTitle:       { fontFamily:fontFamily.bodyMedium, fontSize:10, color:colors.textMuted, letterSpacing:1.2, textTransform:'uppercase' },
  amountRow:           { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:spacing[3], marginTop:spacing[1] },
  amountLabel:         { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.sm, color:colors.textMuted },
  amountValue:         { fontFamily:fontFamily.display, fontSize:fontSize.xl, color:colors.primary, letterSpacing:-0.4 },
  amountCard:          { alignItems:'center', gap:spacing[1], paddingVertical:spacing[5] },
  amountCardLabel:     { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.xs, color:colors.textMuted, textTransform:'uppercase', letterSpacing:1 },
  amountCardValue:     { fontFamily:fontFamily.display, fontSize:fontSize['3xl'], color:colors.primary, letterSpacing:-1 },
  amountCardSub:       { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted },
  methodSection:       { gap:spacing[3] },
  methodSectionTitle:  { fontFamily:fontFamily.bodyMedium, fontSize:10, color:colors.textMuted, letterSpacing:1.2 },
  methodRow:           { flexDirection:'row', gap:spacing[3] },
  methodChip:          { flex:1, alignItems:'center', justifyContent:'center', gap:spacing[1], paddingVertical:spacing[4], borderRadius:radius.xl, backgroundColor:colors.backgroundElevated, borderWidth:1.5, borderColor:colors.border },
  methodChipActive:    { backgroundColor:colors.primarySurface, borderColor:colors.primary },
  methodChipLabel:     { fontFamily:fontFamily.bodySemiBold, fontSize:fontSize.base, color:colors.textSecondary },
  methodChipLabelActive:{ color:colors.primary },
  methodChipSub:       { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textMuted },
  infoBox:             { flexDirection:'row', alignItems:'flex-start', gap:spacing[3], backgroundColor:colors.infoSurface, borderRadius:radius.xl, padding:spacing[4], borderWidth:1, borderColor:colors.info+'40' },
  infoText:            { flex:1, fontFamily:fontFamily.body, fontSize:fontSize.sm, color:colors.textSecondary, lineHeight:20 },
  delayCard:           { flexDirection:'row', alignItems:'flex-start', gap:spacing[3], backgroundColor:colors.warningSurface, borderRadius:radius.xl, padding:spacing[4], borderWidth:1, borderColor:colors.warning+'40' },
  delayTitle:          { fontFamily:fontFamily.bodyMedium, fontSize:fontSize.sm, color:colors.warning, marginBottom:3 },
  delayText:           { fontFamily:fontFamily.body, fontSize:fontSize.xs, color:colors.textSecondary, lineHeight:18 },
});
