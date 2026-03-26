/**
 * MissionCreateScreen — formulaire de création de mission (multi-étapes).
 * Étape 1 : Informations générales (titre, description, nb agents)
 * Étape 2 : Lieu (adresse, ville, coordonnées)
 * Étape 3 : Dates (startAt, endAt)
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { missionsApi } from '@api/endpoints/missions';
import { quotesApi }   from '@api/endpoints/quotes';
import { Button }      from '@components/ui/Button';
import { Input }       from '@components/ui/Input';
import { ScreenHeader } from '@components/ui/ScreenHeader';
import { colors }      from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionCreate'>;

type Step = 1 | 2 | 3;

interface FormData {
  title:       string;
  description: string;
  agentCount:  string;
  address:     string;
  city:        string;
  latitude:    string;
  longitude:   string;
  startAt:     string;  // ISO string
  endAt:       string;
  radiusKm:    string;
}

const INITIAL: FormData = {
  title:       '',
  description: '',
  agentCount:  '1',
  address:     '',
  city:        '',
  latitude:    '',
  longitude:   '',
  startAt:     '',
  endAt:       '',
  radiusKm:    '50',
};

const STEP_TITLES: Record<Step, string> = {
  1: 'Informations',
  2: 'Lieu de mission',
  3: 'Dates & horaires',
};

export const MissionCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const { serviceTypeId } = route.params;
  const [step, setStep]   = useState<Step>(1);
  const [form, setForm]   = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);

  const set = useCallback(
    (key: keyof FormData) => (val: string) =>
      setForm((prev) => ({ ...prev, [key]: val })),
    [],
  );

  // ── Validation par étape ──────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (step === 1) {
      if (!form.title.trim())                e.title      = 'Titre requis';
      if (parseInt(form.agentCount, 10) < 1) e.agentCount = 'Au moins 1 agent';
    }
    if (step === 2) {
      if (!form.address.trim()) e.address = 'Adresse requise';
      if (!form.city.trim())    e.city    = 'Ville requise';
      if (form.latitude && isNaN(parseFloat(form.latitude)))  e.latitude  = 'Latitude invalide';
      if (form.longitude && isNaN(parseFloat(form.longitude))) e.longitude = 'Longitude invalide';
    }
    if (step === 3) {
      if (!form.startAt) e.startAt = 'Date de début requise';
      if (!form.endAt)   e.endAt   = 'Date de fin requise';
      if (form.startAt && form.endAt) {
        const diffH = (new Date(form.endAt).getTime() - new Date(form.startAt).getTime()) / 3_600_000;
        if (diffH < 6) e.endAt = 'Durée minimum : 6 heures';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < 3) { setStep((s) => (s + 1) as Step); return; }
    handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Créer la mission
      const { data: mRes } = await missionsApi.create({
        serviceTypeId,
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        agentCount:  parseInt(form.agentCount, 10),
        radiusKm:    parseInt(form.radiusKm, 10),
        location: {
          address:   form.address.trim(),
          city:      form.city.trim(),
          latitude:  parseFloat(form.latitude) || 0,
          longitude: parseFloat(form.longitude) || 0,
        },
        startAt: form.startAt,
        endAt:   form.endAt,
      });
      const mission = mRes.data;

      // 2. Générer le devis automatiquement
      await quotesApi.calculate({ missionId: mission.id });

      navigation.replace('QuoteDetail', { missionId: mission.id });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? 'Erreur lors de la création';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers datetime ──────────────────────────────────────────────────────
  const now = new Date();
  const pad  = (n: number) => String(n).padStart(2, '0');
  const todayISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T08:00`;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={STEP_TITLES[step]}
        subtitle={`Étape ${step} sur 3`}
        onBack={() => (step > 1 ? setStep((s) => (s - 1) as Step) : navigation.goBack())}
      />

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {([1, 2, 3] as Step[]).map((s) => (
          <View
            key={s}
            style={[
              styles.progressSegment,
              step >= s && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step 1 : Infos ───────────────────────────────────────────── */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <StepHero icon="📋" title="Décrivez votre besoin" />
            <Input
              label="Titre de la mission *"
              value={form.title}
              onChangeText={set('title')}
              placeholder="Ex : Gardiennage soirée privée"
              error={errors.title}
              leftIcon={<Text style={styles.inputIcon}>📌</Text>}
              maxLength={100}
            />
            <Input
              label="Description (optionnel)"
              value={form.description}
              onChangeText={set('description')}
              placeholder="Détails supplémentaires, consignes particulières…"
              multiline
              numberOfLines={4}
              style={styles.textArea}
              leftIcon={<Text style={styles.inputIcon}>📝</Text>}
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Nombre d'agents *"
                  value={form.agentCount}
                  onChangeText={set('agentCount')}
                  keyboardType="number-pad"
                  error={errors.agentCount}
                  leftIcon={<Text style={styles.inputIcon}>👥</Text>}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Rayon (km)"
                  value={form.radiusKm}
                  onChangeText={set('radiusKm')}
                  keyboardType="number-pad"
                  leftIcon={<Text style={styles.inputIcon}>📡</Text>}
                />
              </View>
            </View>
          </View>
        )}

        {/* ── Step 2 : Lieu ────────────────────────────────────────────── */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <StepHero icon="📍" title="Lieu de la mission" />
            <Input
              label="Adresse *"
              value={form.address}
              onChangeText={set('address')}
              placeholder="12 Rue de la Paix"
              error={errors.address}
              leftIcon={<Text style={styles.inputIcon}>🏠</Text>}
            />
            <Input
              label="Ville *"
              value={form.city}
              onChangeText={set('city')}
              placeholder="Paris"
              error={errors.city}
              leftIcon={<Text style={styles.inputIcon}>🏙</Text>}
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Latitude"
                  value={form.latitude}
                  onChangeText={set('latitude')}
                  keyboardType="decimal-pad"
                  placeholder="48.8566"
                  error={errors.latitude}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Longitude"
                  value={form.longitude}
                  onChangeText={set('longitude')}
                  keyboardType="decimal-pad"
                  placeholder="2.3522"
                  error={errors.longitude}
                />
              </View>
            </View>
            <View style={styles.geoHint}>
              <Text style={styles.geoHintText}>
                💡 Les coordonnées GPS permettent aux agents de valider leur présence sur site (périmètre 500 m).
              </Text>
            </View>
          </View>
        )}

        {/* ── Step 3 : Dates ───────────────────────────────────────────── */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <StepHero icon="🗓" title="Quand se déroule la mission ?" />
            <Input
              label="Début de mission *"
              value={form.startAt}
              onChangeText={set('startAt')}
              placeholder={todayISO}
              error={errors.startAt}
              leftIcon={<Text style={styles.inputIcon}>▶️</Text>}
              hint="Format : AAAA-MM-JJTHH:MM"
            />
            <Input
              label="Fin de mission *"
              value={form.endAt}
              onChangeText={set('endAt')}
              placeholder={`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T20:00`}
              error={errors.endAt}
              leftIcon={<Text style={styles.inputIcon}>⏹️</Text>}
              hint="Durée minimum : 6 heures (obligation légale)"
            />

            {/* Récap tarifaire indicatif */}
            {form.startAt && form.endAt && !errors.endAt && (
              <View style={styles.durationHint}>
                <Text style={styles.durationText}>
                  ⏱{' '}
                  {(
                    (new Date(form.endAt).getTime() - new Date(form.startAt).getTime()) /
                    3_600_000
                  ).toFixed(1)}{' '}
                  heures de mission
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* CTA fixe en bas */}
      <View style={styles.footer}>
        <Button
          label={step < 3 ? 'Étape suivante →' : 'Créer et obtenir un devis'}
          onPress={handleNext}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

// ── StepHero ──────────────────────────────────────────────────────────────────
const StepHero: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <View style={heroStyles.wrap}>
    <Text style={heroStyles.icon}>{icon}</Text>
    <Text style={heroStyles.title}>{title}</Text>
  </View>
);

const heroStyles = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[5] },
  icon:  { fontSize: 28 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4 },
});

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: colors.background },
  progressBar: {
    flexDirection:     'row',
    gap:               4,
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[3],
    backgroundColor:   colors.background,
  },
  progressSegment: {
    flex:          1,
    height:        3,
    borderRadius:  2,
    backgroundColor: colors.border,
  },
  progressSegmentActive: { backgroundColor: colors.primary },
  scroll: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
    paddingBottom:     spacing[6],
  },
  stepContent: { gap: 0 },
  row:         { flexDirection: 'row', gap: spacing[3] },
  half:        { flex: 1 },
  textArea:    { height: 100, textAlignVertical: 'top', paddingTop: spacing[3] },
  inputIcon:   { fontSize: 16 },
  geoHint: {
    backgroundColor: colors.infoSurface,
    borderRadius:    radius.lg,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.info,
    marginTop:       spacing[2],
  },
  geoHintText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.info,
    lineHeight: fontSize.sm * 1.6,
  },
  durationHint: {
    backgroundColor: colors.primarySurface,
    borderRadius:    radius.lg,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
    marginTop:       spacing[2],
    alignItems:      'center',
  },
  durationText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.base,
    color:      colors.primary,
  },
  footer: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[4],
    backgroundColor:   colors.background,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
  },
});
