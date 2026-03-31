/**
 * MissionCreateScreen â€” formulaire multi-Ã©tapes de crÃ©ation de mission.
 * IcÃ´nes : lucide-react-native
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView,
  KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ClipboardList, MapPin, CalendarClock,
  Users, Radius, FileText, Pencil, Home,
  Building2, Hash, Crosshair, Play, Square,
  Clock, Zap, Info,
} from 'lucide-react-native';
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
type Step  = 1 | 2 | 3;

interface FormData {
  agentCount: string;
  radiusKm:   string;
  title:      string;
  notes:      string;
  address:    string;
  city:       string;
  zipCode:    string;
  latitude:   string;
  longitude:  string;
  startAt:    string;
  endAt:      string;
}

const INITIAL: FormData = {
  agentCount: '1',
  radiusKm:   '50',
  title:      '',
  notes:      '',
  address:    '',
  city:       '',
  zipCode:    '',
  latitude:   '',
  longitude:  '',
  startAt:    '',
  endAt:      '',
};

const STEP_TITLES: Record<Step, string> = {
  1: 'Informations',
  2: 'Lieu de mission',
  3: 'Dates & horaires',
};

const STEP_SUBTITLES: Record<Step, string> = {
  1: 'Ã‰tape 1 sur 3 Â· DÃ©tails de la mission',
  2: 'Ã‰tape 2 sur 3 Â· OÃ¹ se dÃ©roule la mission ?',
  3: 'Ã‰tape 3 sur 3 Â· Planification temporelle',
};

export const MissionCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const { serviceTypeId } = route.params;
  const [step,    setStep]    = useState<Step>(1);
  const [form,    setForm]    = useState<FormData>(INITIAL);
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const set = useCallback(
    (key: keyof FormData) => (val: string) =>
      setForm((prev) => ({ ...prev, [key]: val })),
    [],
  );

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (step === 1) {
      const n = parseInt(form.agentCount, 10);
      if (isNaN(n) || n < 1) e.agentCount = 'Au moins 1 agent requis';
    }
    if (step === 2) {
      if (!form.address.trim()) e.address = 'Adresse requise';
      if (!form.city.trim())    e.city    = 'Ville requise';
      if (form.latitude  && isNaN(parseFloat(form.latitude)))  e.latitude  = 'Latitude invalide';
      if (form.longitude && isNaN(parseFloat(form.longitude))) e.longitude = 'Longitude invalide';
    }
    if (step === 3) {
      if (!form.startAt) e.startAt = 'Date de dÃ©but requise';
      if (!form.endAt)   e.endAt   = 'Date de fin requise';
      if (form.startAt && form.endAt) {
        const diffH = durationHours(form.startAt, form.endAt);
        if (diffH < 6)   e.endAt = 'DurÃ©e minimum : 6 heures (obligation lÃ©gale)';
        if (diffH > 240) e.endAt = 'DurÃ©e maximum : 10 jours';
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
      const durH = durationHours(form.startAt, form.endAt);
      const { data: mRes } = await missionsApi.create({
        address:       form.address.trim(),
        city:          form.city.trim(),
        zipCode:       form.zipCode.trim() || undefined,
        latitude:      parseFloat(form.latitude)  || 0,
        longitude:     parseFloat(form.longitude) || 0,
        startAt:       new Date(form.startAt).toISOString(),
        endAt:         new Date(form.endAt).toISOString(),
        durationHours: Math.round(durH * 10) / 10,
        title:         form.title.trim() || undefined,
        notes:         form.notes.trim() || undefined,
        radiusKm:      parseInt(form.radiusKm, 10) || 50,
      });
      const mission = (mRes as any).data;
      await quotesApi.calculate({
        missionId:    mission.id,
        bookingLines: [{ serviceTypeId, agentCount: parseInt(form.agentCount, 10) }],
      });
      navigation.replace('QuoteDetail', { missionId: mission.id });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Erreur lors de la crÃ©ation';
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  const now      = new Date();
  const pad      = (n: number) => String(n).padStart(2, '0');
  const isoLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const defaultStart = isoLocal(new Date(now.getTime() + 24 * 3_600_000));
  const defaultEnd   = isoLocal(new Date(now.getTime() + 24 * 3_600_000 + 8 * 3_600_000));
  const durH = form.startAt && form.endAt ? durationHours(form.startAt, form.endAt) : 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={STEP_TITLES[step]}
        subtitle={STEP_SUBTITLES[step]}
        onBack={() => (step > 1 ? setStep((s) => (s - 1) as Step) : navigation.goBack())}
      />

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {([1, 2, 3] as Step[]).map((s) => (
          <View key={s} style={[styles.progressSeg, step >= s && styles.progressSegActive]} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* â”€â”€ Ã‰tape 1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <StepHero Icon={ClipboardList} title="Informations de la mission" color={colors.primary} />
            <Input
              label="Titre (optionnel)"
              value={form.title}
              onChangeText={set('title')}
              placeholder="Ex : Gardiennage soirÃ©e privÃ©e"
              leftIcon={<Pencil size={16} color={colors.textMuted} strokeWidth={1.8} />}
              maxLength={100}
            />
            <Input
              label="Notes / consignes (optionnel)"
              value={form.notes}
              onChangeText={set('notes')}
              placeholder="Instructions particuliÃ¨res pour les agentsâ€¦"
              multiline
              numberOfLines={3}
              style={styles.textArea}
              leftIcon={<FileText size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Nombre d'agents *"
                  value={form.agentCount}
                  onChangeText={set('agentCount')}
                  keyboardType="number-pad"
                  error={errors.agentCount}
                  leftIcon={<Users size={16} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Rayon (km)"
                  value={form.radiusKm}
                  onChangeText={set('radiusKm')}
                  keyboardType="number-pad"
                  leftIcon={<Radius size={16} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
            </View>
          </View>
        )}

        {/* â”€â”€ Ã‰tape 2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <StepHero Icon={MapPin} title="Lieu de la mission" color={colors.info} />
            <Input
              label="Adresse *"
              value={form.address}
              onChangeText={set('address')}
              placeholder="12 Rue de la Paix"
              error={errors.address}
              leftIcon={<Home size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Ville *"
                  value={form.city}
                  onChangeText={set('city')}
                  placeholder="Paris"
                  error={errors.city}
                  leftIcon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Code postal"
                  value={form.zipCode}
                  onChangeText={set('zipCode')}
                  keyboardType="number-pad"
                  placeholder="75001"
                  leftIcon={<Hash size={16} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label="Latitude GPS"
                  value={form.latitude}
                  onChangeText={set('latitude')}
                  keyboardType="decimal-pad"
                  placeholder="48.8566"
                  error={errors.latitude}
                  leftIcon={<Crosshair size={16} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label="Longitude GPS"
                  value={form.longitude}
                  onChangeText={set('longitude')}
                  keyboardType="decimal-pad"
                  placeholder="2.3522"
                  error={errors.longitude}
                  leftIcon={<Crosshair size={16} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
            </View>
            <View style={styles.geoHint}>
              <Info size={16} color={colors.info} strokeWidth={1.8} />
              <Text style={styles.geoHintText}>
                Les coordonnÃ©es GPS permettent la validation check-in/check-out des agents dans un pÃ©rimÃ¨tre de 500 m.
              </Text>
            </View>
          </View>
        )}

        {/* â”€â”€ Ã‰tape 3 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <StepHero Icon={CalendarClock} title="Quand se dÃ©roule la mission ?" color={colors.warning} />
            <Input
              label="DÃ©but de mission *"
              value={form.startAt}
              onChangeText={set('startAt')}
              placeholder={defaultStart}
              error={errors.startAt}
              leftIcon={<Play size={16} color={colors.textMuted} strokeWidth={1.8} />}
              hint="Format : AAAA-MM-JJTHH:MM"
            />
            <Input
              label="Fin de mission *"
              value={form.endAt}
              onChangeText={set('endAt')}
              placeholder={defaultEnd}
              error={errors.endAt}
              leftIcon={<Square size={16} color={colors.textMuted} strokeWidth={1.8} />}
              hint="DurÃ©e minimum lÃ©gale : 6 heures"
            />

            {durH >= 6 && !errors.endAt && (
              <View style={styles.durationBadge}>
                <Clock size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.durationText}>{durH.toFixed(1)} heures de mission</Text>
                {isToday(form.startAt) && (
                  <View style={styles.urgencyRow}>
                    <Zap size={12} color={colors.warning} strokeWidth={2} />
                    <Text style={styles.urgencyNote}>Majoration urgence appliquÃ©e</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* CTA fixe */}
      <View style={styles.footer}>
        <Button
          label={step < 3 ? 'Ã‰tape suivante' : 'CrÃ©er et obtenir un devis'}
          onPress={handleNext}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function durationHours(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  return (e - s) / 3_600_000;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

// â”€â”€ StepHero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StepHero: React.FC<{
  Icon: React.FC<{ size: number; color: string; strokeWidth: number }>;
  title: string;
  color: string;
}> = ({ Icon, title, color }) => (
  <View style={heroStyles.wrap}>
    <View style={[heroStyles.iconBox, { backgroundColor: color + '1A', borderColor: color + '44' }]}>
      <Icon size={22} color={color} strokeWidth={1.8} />
    </View>
    <Text style={heroStyles.title}>{title}</Text>
  </View>
);

const heroStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[5] },
  iconBox: {
    width:        44,
    height:       44,
    borderRadius: radius.lg,
    borderWidth:  1,
    alignItems:   'center',
    justifyContent: 'center',
    flexShrink:   0,
  },
  title: {
    fontFamily:    fontFamily.display,
    fontSize:      fontSize.xl,
    color:         colors.textPrimary,
    letterSpacing: -0.4,
    flex:          1,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  progressBar: {
    flexDirection:     'row',
    gap:               4,
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[3],
    backgroundColor:   colors.background,
  },
  progressSeg: {
    flex:            1,
    height:          3,
    borderRadius:    2,
    backgroundColor: colors.border,
  },
  progressSegActive: { backgroundColor: colors.primary },
  scroll: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[4],
    paddingBottom:     spacing[6],
  },
  stepContent: { gap: spacing[1] },
  row:         { flexDirection: 'row', gap: spacing[3] },
  half:        { flex: 1 },
  textArea:    { height: 90, textAlignVertical: 'top', paddingTop: spacing[3] },
  geoHint: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing[3],
    backgroundColor: colors.infoSurface,
    borderRadius:    radius.lg,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.info,
    marginTop:       spacing[1],
  },
  geoHintText: {
    flex:       1,
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.info,
    lineHeight: fontSize.sm * 1.6,
  },
  durationBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing[2],
    backgroundColor: colors.primarySurface,
    borderRadius:    radius.lg,
    padding:         spacing[4],
    borderWidth:     1,
    borderColor:     colors.borderPrimary,
    marginTop:       spacing[2],
    flexWrap:        'wrap',
  },
  durationText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.base,
    color:      colors.primary,
    flex:       1,
  },
  urgencyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  urgencyNote: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.xs,
    color:      colors.warning,
  },
  footer: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[4],
    backgroundColor:   colors.background,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
  },
});

