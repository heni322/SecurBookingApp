/**
 * DisputeScreen — Ouverture d'un litige client après une mission.
 * 6 motifs prédéfinis · Description libre · Soumission → Admin review 48h
 * Icônes : lucide-react-native (toutes — plus aucun emoji)
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView,
  TextInput, TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AlertTriangle, CheckCircle2,
  UserX, Clock, ThumbsDown, ReceiptEuro, Ban, ClipboardList,
} from 'lucide-react-native';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { Button }       from '@components/ui/Button';
import { Card }         from '@components/ui/Card';
import { colors }       from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import apiClient from '@api/client';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'Dispute'>;

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

// ── Motifs avec icônes Lucide ─────────────────────────────────────────────────
const REASONS: ReadonlyArray<{
  id:    string;
  Icon:  LucideIcon;
  label: string;
  desc:  string;
  color: string;
}> = [
  { id: 'agent_absent', Icon: UserX,         label: 'Agent absent',         desc: "L'agent ne s'est pas présenté",          color: colors.danger   },
  { id: 'agent_late',   Icon: Clock,         label: 'Agent en retard',      desc: 'Retard significatif sans prévenir',       color: colors.warning  },
  { id: 'quality',      Icon: ThumbsDown,    label: 'Qualité insuffisante', desc: 'Prestation non conforme aux attentes',    color: colors.warning  },
  { id: 'billing',      Icon: ReceiptEuro,   label: 'Problème facturation', desc: 'Montant incorrect ou double facturation', color: colors.info     },
  { id: 'behavior',     Icon: Ban,           label: 'Comportement',         desc: "Comportement inapproprié de l'agent",     color: colors.danger   },
  { id: 'other',        Icon: ClipboardList, label: 'Autre motif',          desc: 'Autre motif de litige',                   color: colors.textMuted},
] as const;

type ReasonId = (typeof REASONS)[number]['id'];

export default function DisputeScreen({ navigation, route }: Props) {
  const { missionId, bookingId, missionTitle } = route.params;
  const [reason, setReason] = useState<ReasonId | ''>('');
  const [desc,   setDesc]   = useState('');
  const [busy,   setBusy]   = useState(false);
  const [done,   setDone]   = useState(false);

  const canSubmit = reason !== '' && desc.trim().length >= 20;

  const handleSubmit = async () => {
    if (!reason) { Alert.alert('Motif requis', 'Sélectionnez un motif de litige.'); return; }
    if (desc.trim().length < 20) { Alert.alert('Description trop courte', 'Minimum 20 caractères requis.'); return; }
    setBusy(true);
    try {
      await apiClient.post('/disputes', {
        missionId,
        ...(bookingId ? { bookingId } : {}),
        reason,
        description: desc.trim(),
      });
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Impossible d'ouvrir le litige. Contactez le support.";
      Alert.alert('Erreur', msg);
    } finally {
      setBusy(false);
    }
  };

  // ── Confirmation ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Litige ouvert" />
        <View style={styles.center}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={52} color={colors.success} strokeWidth={1.5} />
          </View>
          <Text style={styles.doneTitle}>Litige enregistré</Text>
          <Text style={styles.doneSub}>
            Notre équipe examinera votre litige dans les 48h.
            Vous serez notifié de chaque mise à jour par email et notification.
          </Text>
          <Button
            label="Retour à mes missions"
            onPress={() => navigation.popToTop()}
            fullWidth
            size="lg"
            style={styles.doneBtn}
          />
        </View>
      </View>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Ouvrir un litige"
        subtitle={missionTitle}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bannière info */}
        <View style={styles.infoBanner}>
          <AlertTriangle size={16} color={colors.info} strokeWidth={2} />
          <Text style={styles.infoText}>
            Un litige déclenche une revue manuelle sous 48h. Les informations transmises peuvent conduire
            à un remboursement total ou partiel selon les conditions SecurBook.
          </Text>
        </View>

        {/* Motif */}
        <Text style={styles.sectionLabel}>Motif du litige *</Text>
        {REASONS.map((r) => {
          const active = reason === r.id;
          return (
            <TouchableOpacity
              key={r.id}
              style={[styles.reasonCard, active && styles.reasonCardOn]}
              onPress={() => setReason(r.id)}
              activeOpacity={0.75}
            >
              {/* Lucide icon in a small tinted circle */}
              <View style={[styles.reasonIconWrap, { backgroundColor: active ? colors.primarySurface : colors.surface }]}>
                <r.Icon size={18} color={active ? colors.primary : r.color} strokeWidth={1.8} />
              </View>

              <View style={styles.reasonText}>
                <Text style={[styles.reasonLabel, active && styles.reasonLabelOn]}>{r.label}</Text>
                <Text style={styles.reasonDesc}>{r.desc}</Text>
              </View>
              {active && <View style={styles.reasonCheck} />}
            </TouchableOpacity>
          );
        })}

        {/* Description */}
        <Text style={styles.sectionLabel}>Description détaillée *</Text>
        <Card style={styles.textareaCard}>
          <TextInput
            style={styles.textarea}
            placeholder="Décrivez précisément les faits : date, heure, ce qui s'est passé, les préjudices subis…"
            placeholderTextColor={colors.textMuted}
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={600}
          />
          <View style={styles.textareaFooter}>
            <Text style={styles.charCount}>{desc.length} / 600</Text>
            {desc.trim().length > 0 && desc.trim().length < 20 && (
              <Text style={styles.charWarning}>Minimum 20 caractères</Text>
            )}
          </View>
        </Card>

        {/* Actions */}
        <Button
          label={busy ? 'Envoi en cours…' : 'Soumettre le litige'}
          onPress={handleSubmit}
          loading={busy}
          disabled={!canSubmit}
          fullWidth
          size="lg"
          style={styles.submitBtn}
        />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelTxt}>Annuler</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], gap: spacing[4] },

  center: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: layout.screenPaddingH,
    gap:               spacing[4],
  },
  successIcon: {
    width:           110,
    height:          110,
    borderRadius:    55,
    backgroundColor: colors.successSurface,
    borderWidth:     2,
    borderColor:     colors.success,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing[2],
  },
  doneTitle: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4, textAlign: 'center' },
  doneSub:   { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: fontSize.sm * 1.6 },
  doneBtn:   { marginTop: spacing[2] },

  infoBanner: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing[3],
    backgroundColor: colors.infoSurface,
    borderRadius:    radius.lg,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.info,
  },
  infoText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.info, lineHeight: fontSize.sm * 1.6 },

  sectionLabel: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      fontSize.sm,
    color:         colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  reasonCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing[3],
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    padding:         spacing[4],
    borderWidth:     1.5,
    borderColor:     colors.border,
  },
  reasonCardOn: { borderColor: colors.primary, backgroundColor: colors.primarySurface },

  // Lucide icon container — replaces the emoji Text
  reasonIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    radius.md,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     colors.border,
    flexShrink:      0,
  },

  reasonText:    { flex: 1 },
  reasonLabel:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textSecondary },
  reasonLabelOn: { color: colors.primary },
  reasonDesc:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  reasonCheck:   { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, flexShrink: 0 },

  textareaCard: { padding: 0, overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
  textarea: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    color:      colors.textPrimary,
    minHeight:  140,
    padding:    spacing[4],
    lineHeight: fontSize.base * 1.6,
  },
  textareaFooter: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: spacing[4],
    paddingBottom:     spacing[3],
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    paddingTop:        spacing[2],
  },
  charCount:   { fontFamily: fontFamily.mono, fontSize: fontSize.xs, color: colors.textMuted },
  charWarning: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.warning },

  submitBtn: {},
  cancelBtn: { alignItems: 'center', padding: spacing[3] },
  cancelTxt: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textMuted },
});
