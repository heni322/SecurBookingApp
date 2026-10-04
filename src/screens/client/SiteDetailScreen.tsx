/**
 * SiteDetailScreen — Consignes d'un site (lot 3, audit 2026-08).
 *
 * Création si `siteId` est absent, édition sinon.
 *
 * ── Deux séparations à ne pas confondre ─────────────────────────────────────
 * `accessInstructions` décrit les moyens d'accès NON secrets (« portail
 * livraisons côté rue Lecourbe », « badge à retirer à l'accueil »). Les CODES
 * vont dans la section dédiée : ils sont chiffrés au repos, exposés à l'agent
 * seulement pendant sa vacation, et chaque consultation est journalisée.
 *
 * Modifier les consignes incrémente `briefingVersion` côté serveur et oblige
 * les agents à réacquitter avant leur prochaine prise de service — l'écran le
 * dit explicitement pour que ce ne soit pas une surprise.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useTranslation } from '@i18n';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Plus, Trash2, KeyRound, Users, ClipboardList, TriangleAlert, ShieldCheck,
} from 'lucide-react-native';

import { sitesApi } from '@api/endpoints/sites';
import type { SiteContactRole, SiteSecretKind } from '@api/endpoints/sites';
import { qk } from '@api/queryKeys';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { showAlert } from '@components/ui/AlertModal';
import { useAuthStore } from '@store/authStore';
import { colors } from '@theme/colors';
import { spacing, layout, radius } from '@theme/spacing';
import { fontSize, fontFamily } from '@theme/typography';
import type { ProfileStackParamList } from '@models/index';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SiteDetail'>;

const CONTACT_ROLES: SiteContactRole[] = [
  'REMISE_CLES', 'RETOUR_CLES', 'ASTREINTE',
  'HIERARCHIE', 'DONNEUR_ORDRES', 'TECHNIQUE', 'AUTRE',
];

const SECRET_KINDS: SiteSecretKind[] = [
  'BOITE_CLES', 'ALARME', 'CADENAS', 'BADGE', 'INTERPHONE', 'AUTRE',
];

export default function SiteDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation('sites');
  const queryClient = useQueryClient();
  const clientId = useAuthStore(s => s.user?.clientId);
  const siteId = route.params?.siteId;
  const isNew = !siteId;

  const [form, setForm] = useState({
    label: '', address: '', city: '', zipCode: '',
    accessInstructions: '', particularExpectations: '',
  });
  const [loaded, setLoaded] = useState(false);

  const siteQuery = useQuery({
    queryKey: qk.sites.detail(siteId ?? ''),
    queryFn: async () => (await sitesApi.getById(siteId!)).data.data,
    enabled: !!siteId,
  });

  const secretsQuery = useQuery({
    queryKey: qk.sites.secrets(siteId ?? ''),
    queryFn: async () => (await sitesApi.listSecrets(siteId!)).data.data,
    enabled: !!siteId,
  });

  // Hydrate une seule fois : réhydrater à chaque refetch écraserait une saisie
  // en cours si une invalidation survient pendant que le client tape.
  if (siteQuery.data && !loaded) {
    setForm({
      label: siteQuery.data.label,
      address: siteQuery.data.address,
      city: siteQuery.data.city,
      zipCode: siteQuery.data.zipCode,
      accessInstructions: siteQuery.data.accessInstructions ?? '',
      particularExpectations: siteQuery.data.particularExpectations ?? '',
    });
    setLoaded(true);
  }

  const setField = useCallback(
    (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v })),
    [],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        label: form.label.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        zipCode: form.zipCode.trim(),
        accessInstructions: form.accessInstructions.trim() || undefined,
        particularExpectations: form.particularExpectations.trim() || undefined,
      };
      return isNew
        ? (await sitesApi.create(payload)).data.data
        : (await sitesApi.update(siteId!, payload)).data.data;
    },
    onSuccess: created => {
      queryClient.invalidateQueries({ queryKey: qk.sites.all });
      if (isNew && created?.id) {
        // On reste sur la fiche : postes, contacts et codes ne peuvent être
        // ajoutés qu'une fois le site créé.
        navigation.replace('SiteDetail', { siteId: created.id });
      } else {
        showAlert.success(t('saved_title'), t('saved_body'));
      }
    },
    onError: () => showAlert(t('save_error'), t('save_error')),
  });

  const addSecretMutation = useMutation({
    mutationFn: async (p: { kind: SiteSecretKind; label: string; value: string }) =>
      sitesApi.createSecret(siteId!, p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.sites.secrets(siteId!) });
      queryClient.invalidateQueries({ queryKey: qk.sites.all });
    },
    onError: () => showAlert(t('save_error'), t('secret_error')),
  });

  const [newSecret, setNewSecret] = useState({
    kind: 'BOITE_CLES' as SiteSecretKind,
    label: '',
    value: '',
  });

  const canSave =
    form.label.trim().length >= 2 &&
    form.address.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.zipCode.trim().length > 0 &&
    !saveMutation.isPending;

  const briefingChanged =
    !isNew &&
    loaded &&
    (form.accessInstructions !== (siteQuery.data?.accessInstructions ?? '') ||
      form.particularExpectations !== (siteQuery.data?.particularExpectations ?? ''));

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={isNew ? t('new_title') : t('edit_title')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Identité du site */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('sections.identity')}</Text>
          <Field label={t('fields.label')} value={form.label}
                 onChange={v => setField('label', v)} required />
          <Field label={t('fields.address')} value={form.address}
                 onChange={v => setField('address', v)} required />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label={t('fields.zipCode')} value={form.zipCode}
                     onChange={v => setField('zipCode', v)} required />
            </View>
            <View style={{ flex: 2 }}>
              <Field label={t('fields.city')} value={form.city}
                     onChange={v => setField('city', v)} required />
            </View>
          </View>
        </Card>

        {/* Consignes */}
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <ClipboardList size={14} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>{t('sections.access')}</Text>
          </View>
          <Text style={styles.hint}>{t('access_hint')}</Text>
          <TextInput
            style={styles.textarea}
            value={form.accessInstructions}
            onChangeText={v => setField('accessInstructions', v)}
            placeholder={t('access_placeholder')}
            placeholderTextColor={colors.textMuted}
            multiline maxLength={3000}
          />

          <View style={styles.headerRow}>
            <ShieldCheck size={14} color={colors.primary} strokeWidth={2} />
            <Text style={styles.sectionTitle}>
              {t('sections.expectations')}
            </Text>
          </View>
          <TextInput
            style={styles.textarea}
            value={form.particularExpectations}
            onChangeText={v => setField('particularExpectations', v)}
            placeholder={t('expectations_placeholder')}
            placeholderTextColor={colors.textMuted}
            multiline maxLength={3000}
          />

          {/* Prévenir avant, pas après : l'incrément de briefingVersion oblige
              les agents à réacquitter, ce qui n'est pas anodin en pleine nuit. */}
          {briefingChanged && (
            <View style={styles.warnBanner}>
              <TriangleAlert size={14} color={colors.warning} strokeWidth={2} />
              <Text style={styles.warnText}>{t('briefing_change_warning')}</Text>
            </View>
          )}
        </Card>

        <Button
          label={saveMutation.isPending ? t('saving') : t('save')}
          onPress={() => saveMutation.mutate()}
          disabled={!canSave}
          fullWidth size="lg"
        />

        {/* Codes d'accès — uniquement après création du site */}
        {!isNew && (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <KeyRound size={14} color={colors.warning} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.warning }]}>
                {t('sections.codes')}
              </Text>
            </View>
            <Text style={styles.hint}>{t('codes_hint')}</Text>

            {(secretsQuery.data ?? []).map(s => (
              <View key={s.id} style={styles.secretRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{s.label}</Text>
                  <Text style={styles.muted}>
                    {t(`kinds.${s.kind}`, { defaultValue: s.kind })}
                    {s.staleRotation ? ` · ${t('stale_rotation')}` : ''}
                  </Text>
                </View>
                {/* La valeur n'est jamais réaffichée, même à celui qui l'a
                    saisie : elle n'existe en clair nulle part hors du coffre. */}
                <Text style={styles.masked}>••••</Text>
              </View>
            ))}

            <View style={styles.addSecret}>
              <View style={styles.chipsRow}>
                {SECRET_KINDS.map(k => (
                  <TouchableOpacity
                    key={k}
                    style={[styles.chip, newSecret.kind === k && styles.chipOn]}
                    onPress={() => setNewSecret(p => ({ ...p, kind: k }))}
                  >
                    <Text style={[styles.chipText, newSecret.kind === k && styles.chipTextOn]}>
                      {t(`kinds.${k}`, { defaultValue: k })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={newSecret.label}
                onChangeText={v => setNewSecret(p => ({ ...p, label: v }))}
                placeholder={t('secret_label_placeholder')}
                placeholderTextColor={colors.textMuted}
                maxLength={200}
              />
              <TextInput
                style={styles.input}
                value={newSecret.value}
                onChangeText={v => setNewSecret(p => ({ ...p, value: v }))}
                placeholder={t('secret_value_placeholder')}
                placeholderTextColor={colors.textMuted}
                maxLength={200}
                secureTextEntry
              />
              <Button
                label={t('add_code')}
                onPress={() => {
                  addSecretMutation.mutate({
                    kind: newSecret.kind,
                    label: newSecret.label.trim(),
                    value: newSecret.value,
                  });
                  setNewSecret({ kind: 'BOITE_CLES', label: '', value: '' });
                }}
                disabled={
                  !newSecret.label.trim() ||
                  !newSecret.value ||
                  addSecretMutation.isPending
                }
                fullWidth size="sm" variant="outline"
              />
            </View>
          </Card>
        )}

        {isNew && (
          <Text style={styles.hint}>{t('create_first')}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const Field: React.FC<{
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}> = ({ label, value, onChange, required }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>
      {label}{required ? <Text style={styles.required}> *</Text> : null}
    </Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholderTextColor={colors.textMuted}
    />
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: layout.screenPaddingH, paddingBottom: spacing[10], gap: spacing[3] },

  card: { gap: spacing[3] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs,
    color: colors.primary, textTransform: 'uppercase', letterSpacing: 1,
  },
  row: { flexDirection: 'row', gap: spacing[3] },

  field: { gap: spacing[1] },
  fieldLabel: {
    fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary,
  },
  required: { color: colors.danger },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textPrimary,
  },
  textarea: {
    minHeight: 88, textAlignVertical: 'top',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textPrimary,
  },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  muted: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  itemTitle: {
    fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary,
  },

  warnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    padding: spacing[3], borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.warning,
  },
  warnText: {
    flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.warning,
  },

  secretRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingVertical: spacing[2],
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  masked: {
    fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.md,
    color: colors.textMuted, letterSpacing: 3,
  },

  addSecret: { gap: spacing[2], marginTop: spacing[2] },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    paddingVertical: 5, paddingHorizontal: spacing[3],
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textPrimary },
  chipTextOn: { color: colors.white, fontFamily: fontFamily.bodySemiBold },
});
