/**
 * MissionCreateScreen — multi-step mission creation.
 *
 * Step 1 : Prestations & tenues par agent + titre / notes / rayon
 * Step 2 : Lieu (OSM autocomplete + carte Leaflet WebView)
 * Step 3 : Dates & horaires + récapitulatif complet
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, Alert, StyleSheet, TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ClipboardList, MapPin, CalendarClock,
  Radius, FileText, Pencil, Clock, Zap, Users, Plus, Minus, Check,
} from 'lucide-react-native';
import { useTranslation }    from '@i18n';
import { missionsApi }       from '@api/endpoints/missions';
import { quotesApi }         from '@api/endpoints/quotes';
import { Button }            from '@components/ui/Button';
import { Input }             from '@components/ui/Input';
import { ScreenHeader }      from '@components/ui/ScreenHeader';
import { AddressSearch }     from '@components/ui/AddressSearch';
import { MapLocationPicker } from '@components/ui/MapLocationPicker';
import { DateTimePicker }    from '@components/ui/DateTimePicker';
import type { NominatimResult } from '@components/ui/AddressSearch';
import { UNIFORM_OPTIONS }   from './ServicePickerScreen';
import { colors }            from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'MissionCreate'>;
type Step  = 1 | 2 | 3;

// ── Internal line structure ───────────────────────────────────────────────────
interface BookingLineLocal {
  serviceTypeId:  string;
  agentCount:     number;
  name:           string;
  accent:         string;
  agentUniforms:  (string | null)[];   // one entry per agent, null = not specified
}

// ── Form ──────────────────────────────────────────────────────────────────────
interface FormData {
  radiusKm:  string;
  title:     string;
  notes:     string;
  address:   string;
  city:      string;
  zipCode:   string;
  latitude:  number | null;
  longitude: number | null;
  startAt:   string;
  endAt:     string;
}
const INITIAL: FormData = {
  radiusKm: '50', title: '', notes: '', address: '', city: '', zipCode: '',
  latitude: null, longitude: null, startAt: '', endAt: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const UNIFORM_EMOJI: Record<string, string> = {
  STANDARD:     '🦺',
  CIVIL:        '👔',
  EVENEMENTIEL: '🤵',
  SSIAP:        '🔥',
  CYNOPHILE:    '🐕',
};

function durationHours(start: string, end: string): number {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  return (e - s) / 3_600_000;
}

function isToday(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso), t = new Date();
  return d.getDate() === t.getDate()
    && d.getMonth()  === t.getMonth()
    && d.getFullYear() === t.getFullYear();
}

// ── Screen ────────────────────────────────────────────────────────────────────
export const MissionCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation('missions');

  // Normalise incoming bookingLines → agentUniforms[]
  const initialLines: BookingLineLocal[] = (route.params.bookingLines ?? []).map(l => ({
    serviceTypeId: l.serviceTypeId,
    agentCount:    l.agentCount,
    name:          l.name,
    accent:        l.accent,
    agentUniforms: l.agentUniforms ?? Array(l.agentCount).fill(null),
  }));

  const [step,    setStep]    = useState<Step>(1);
  const [form,    setForm]    = useState<FormData>(INITIAL);
  const [lines,   setLines]   = useState<BookingLineLocal[]>(initialLines);
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [mapScrollLocked, setMapScrollLocked] = useState(false);

  const setField = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(p => ({ ...p, [k]: v })), []);

  const totalAgents = useMemo(() => lines.reduce((s, l) => s + l.agentCount, 0), [lines]);

  // ── Per-line mutations ────────────────────────────────────────────────────
  const changeCount = useCallback((id: string, delta: number) => {
    setLines(prev => prev.map(l => {
      if (l.serviceTypeId !== id) return l;
      const count         = Math.min(20, Math.max(1, l.agentCount + delta));
      const agentUniforms = Array.from({ length: count }, (_, i) => l.agentUniforms[i] ?? null);
      return { ...l, agentCount: count, agentUniforms };
    }));
  }, []);

  const changeAgentUniform = useCallback((id: string, idx: number, uniform: string) => {
    setLines(prev => prev.map(l => {
      if (l.serviceTypeId !== id) return l;
      const agentUniforms = [...l.agentUniforms];
      agentUniforms[idx] = uniform;
      return { ...l, agentUniforms };
    }));
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines(prev => {
      const next = prev.filter(l => l.serviceTypeId !== id);
      if (next.length === 0) { navigation.goBack(); return prev; }
      return next;
    });
  }, [navigation]);

  // ── Address handlers ──────────────────────────────────────────────────────
  const handleAddressSelect = useCallback((r: NominatimResult) => {
    const a = r.address;
    const road = a.road ?? '', num = a.house_number ?? '';
    setForm(p => ({
      ...p,
      address:   num ? `${num} ${road}` : road,
      city:      a.city ?? a.town ?? a.village ?? p.city,
      zipCode:   a.postcode ?? p.zipCode,
      latitude:  parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    }));
    setErrors(e => ({ ...e, address: undefined, latitude: undefined }));
  }, []);

  const handleMapSelect = useCallback((coords: { latitude: number; longitude: number }, addr?: string) => {
    setForm(p => ({ ...p, latitude: coords.latitude, longitude: coords.longitude, address: addr ?? p.address }));
    setErrors(e => ({ ...e, latitude: undefined }));
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};

    if (step === 1 && lines.length === 0) {
      Alert.alert(t('create.service_required_title'), t('create.service_required_body'));
      return false;
    }
    if (step === 1) {
      const km = parseInt(form.radiusKm, 10);
      if (isNaN(km) || km < 5)  e.radiusKm = t('create.radius_min');
      else if (km > 500)        e.radiusKm = t('create.radius_max');
    }
    if (step === 2) {
      if (!form.address.trim())  e.address = t('create.address_required');
      if (!form.city.trim())     e.city    = t('create.city_required');
      if (form.latitude == null) e.latitude = t('create.map_position_required');
    }
    if (step === 3) {
      if (!form.startAt) e.startAt = t('create.start_required');
      if (!form.endAt)   e.endAt = t('create.end_required');
      if (form.startAt) {
        const start    = new Date(form.startAt);
        const minStart = new Date(Date.now() + 3_600_000);
        if (start < minStart) e.startAt = t('create.start_min_future');
      }
      if (form.startAt && form.endAt) {
        const d = durationHours(form.startAt, form.endAt);
        if (d < 6)   e.endAt = t('create.duration_min');
        if (d > 240) e.endAt = t('create.duration_max');
        if (new Date(form.endAt) <= new Date(form.startAt)) e.endAt = t('create.end_before_start');
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < 3) { setStep(s => (s + 1) as Step); return; }
    handleSubmit();
  };

  // FIX Mobile B1 — navigate back to ServicePicker carrying current lines so
  // the user can add more services without losing their existing selection.
  const handleAddMore = useCallback(() => {
    navigation.navigate('ServicePicker', {
      existingLines: lines.map(l => ({
        serviceTypeId: l.serviceTypeId,
        agentCount:    l.agentCount,
        name:          l.name,
        accent:        l.accent,
        agentUniforms: l.agentUniforms,
      })),
    });
  }, [navigation, lines]);

  const handleSubmit = async () => {
    setLoading(true);
    let createdMissionId: string | null = null;
    try {
      const durH = durationHours(form.startAt, form.endAt);
      const clampedDurH = Math.max(6, Math.round(durH * 10) / 10);

      const { data: mRes } = await missionsApi.create({
        address:       form.address.trim(),
        city:          form.city.trim(),
        zipCode:       form.zipCode.trim() || undefined,
        latitude:      form.latitude  ?? 0,
        longitude:     form.longitude ?? 0,
        startAt:       new Date(form.startAt).toISOString(),
        endAt:         new Date(form.endAt).toISOString(),
        durationHours: clampedDurH,
        title:         form.title.trim() || undefined,
        notes:         form.notes.trim() || undefined,
        radiusKm:      Math.min(500, Math.max(5, parseInt(form.radiusKm, 10) || 50)),
      });
      const mission = (mRes as any).data;
      createdMissionId = mission.id;

      await quotesApi.calculate({
        missionId:    mission.id,
        bookingLines: lines.map(l => ({
          serviceTypeId: l.serviceTypeId,
          agentCount:    l.agentCount,
          agentUniforms: l.agentUniforms,
        })) as any,
      });

      navigation.replace('QuoteDetail', { missionId: mission.id });
    } catch (err: unknown) {
      if (createdMissionId) {
        await missionsApi.cancel(createdMissionId).catch(() => {
          console.warn('[MissionCreate] Could not cancel orphan mission', createdMissionId);
        });
      }
      const msg = (err as any)?.response?.data?.message ?? t('create.error_create');
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  const durH    = form.startAt && form.endAt ? durationHours(form.startAt, form.endAt) : 0;
  const minDate = new Date(Date.now() + 3_600_000);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={['', t('create.step_one'), t('create.step_two'), t('create.step_three')][step]}
        subtitle={['', t('create.step_one'), t('create.step_two'), t('create.step_three')][step]}
        onBack={() => step > 1 ? setStep(s => (s - 1) as Step) : navigation.goBack()}
      />

      {/* Progress bar */}
      <View style={styles.progressBar}>
        {([1, 2, 3] as Step[]).map(s => (
          <View key={s} style={[styles.progressSeg, step >= s && styles.progressSegActive]} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        scrollEnabled={!mapScrollLocked}
        nestedScrollEnabled={true}
      >

        {/* ── STEP 1 — Prestations & tenues ────────────────────────── */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <StepHero Icon={ClipboardList} title="Prestations & tenues" color={colors.primary} />

            {lines.map((line) => (
              <View key={line.serviceTypeId} style={[styles.lineCard, { borderColor: line.accent + '60' }]}>

                {/* Line header */}
                <View style={styles.lineHeader}>
                  <View style={[styles.lineDot, { backgroundColor: line.accent }]} />
                  <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>

                  {/* Agent stepper */}
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[styles.stepBtn, line.agentCount <= 1 && styles.stepBtnDim]}
                      onPress={() => changeCount(line.serviceTypeId, -1)}
                      disabled={line.agentCount <= 1}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Minus size={12} color={line.agentCount <= 1 ? colors.textMuted : line.accent} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <Text style={[styles.stepCountText, { color: line.accent }]}>{line.agentCount}</Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, line.agentCount >= 20 && styles.stepBtnDim]}
                      onPress={() => changeCount(line.serviceTypeId, +1)}
                      disabled={line.agentCount >= 20}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Plus size={12} color={line.agentCount >= 20 ? colors.textMuted : line.accent} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>

                  {/* Remove */}
                  {lines.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeLine(line.serviceTypeId)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Per-agent uniform rows */}
                <View style={styles.agentsBlock}>
                  <Text style={[styles.agentsBlockTitle, { color: line.accent }]}>{t('create.uniform_per_agent')}</Text>
                  {line.agentUniforms.map((uniform, agentIdx) => (
                    <View key={agentIdx} style={styles.agentRow}>
                      <View style={[styles.agentBadge, { backgroundColor: line.accent + '20', borderColor: line.accent + '50' }]}>
                        <Text style={[styles.agentBadgeNum, { color: line.accent }]}>{agentIdx + 1}</Text>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.uniformChips}
                      >
                        {UNIFORM_OPTIONS.map(opt => {
                          const active = uniform === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.uniformChip,
                                active && { backgroundColor: line.accent + '20', borderColor: line.accent },
                              ]}
                              onPress={() => changeAgentUniform(line.serviceTypeId, agentIdx, opt.value)}
                              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                            >
                              <Text style={styles.uniformChipEmoji}>{opt.emoji}</Text>
                              <View>
                                <Text style={[styles.uniformChipLabel, active && { color: line.accent }]}>
                                  {opt.label}
                                </Text>
                                {active && (
                                  <Text style={[styles.uniformChipDesc, { color: line.accent }]} numberOfLines={1}>
                                    {opt.desc}
                                  </Text>
                                )}
                              </View>
                              {active && (
                                <View style={[styles.uniformActiveCheck, { backgroundColor: line.accent }]}>
                                  <Check size={7} color="#fff" strokeWidth={3} />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ))}
                </View>

                {/* Uniform summary */}
                <View style={styles.uniformSummary}>
                  <Users size={12} color={colors.textMuted} strokeWidth={1.8} />
                  <Text style={styles.uniformSummaryText}>
                    {line.agentUniforms.map((u, i) =>
                      `Agent ${i + 1}: ${u
                        ? (UNIFORM_EMOJI[u] + ' ' + (UNIFORM_OPTIONS.find(o => o.value === u)?.label ?? u))
                        : '—'}`
                    ).join('  ·  ')}
                  </Text>
                </View>
              </View>
            ))}

            {/* Total */}
            <View style={styles.totalRow}>
              <Users size={14} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.totalText}>
                {t('create.total_agents', { count: totalAgents, lines: lines.length })}
              </Text>
            </View>

            {/* Add more */}
            <TouchableOpacity style={styles.addMoreBtn} onPress={handleAddMore} activeOpacity={0.75}>
              <Plus size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addMoreText}>{t('create.add_service')}</Text>
            </TouchableOpacity>

            {/* Optional fields */}
            <Input
            label={t('create.title_label')}
              value={form.title}
              onChangeText={v => setField('title', v)}
              placeholder={t('create.title_placeholder')}
              leftIcon={<Pencil size={16} color={colors.textMuted} strokeWidth={1.8} />}
              maxLength={100}
            />
            <Input
              label={t('create.notes_label')}
              value={form.notes}
              onChangeText={v => setField('notes', v)}
              placeholder={t('create.instructions_placeholder')}
              multiline
              numberOfLines={3}
              style={styles.textArea}
              leftIcon={<FileText size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
            <Input
              label={t('create.radius_label')}
              value={form.radiusKm}
              onChangeText={v => setField('radiusKm', v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              hint={t('create.radius_hint')}
              error={errors.radiusKm}
              leftIcon={<Radius size={16} color={colors.textMuted} strokeWidth={1.8} />}
            />
          </View>
        )}

        {/* ── STEP 2 — Location ────────────────────────────────────── */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <StepHero Icon={MapPin} title={t('create.step_two_title')} color={colors.infoSurface} />
            <AddressSearch
              value={form.address}
              error={errors.address}
              onSelect={handleAddressSelect}
              placeholder={t('create.address_placeholder')}
              countrycodes="fr"
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <Input
                  label={t('create.city_label')}
                  value={form.city}
                  onChangeText={v => setField('city', v)}
                  placeholder={t('create.city_placeholder')}
                  error={errors.city}
                  leftIcon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
              <View style={styles.half}>
                <Input
                  label={t('create.zip_label')}
                  value={form.zipCode}
                  onChangeText={v => setField('zipCode', v)}
                  keyboardType="number-pad"
                  placeholder={t('create.zip_placeholder')}
                  leftIcon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />}
                />
              </View>
            </View>
            <MapLocationPicker
              latitude={form.latitude  ?? undefined}
              longitude={form.longitude ?? undefined}
              onSelect={handleMapSelect}
              onInteractionChange={setMapScrollLocked}
            />
            {errors.latitude && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errors.latitude}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── STEP 3 — Schedule ────────────────────────────────────── */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <StepHero Icon={CalendarClock} title={t('create.schedule_title')} color={colors.primary} />
            <DateTimePicker
              label={t('create.start_label')}
              value={form.startAt}
              onChange={v => setField('startAt', v)}
              minDate={minDate}
              error={errors.startAt}
              hint={t('create.start_hint')}
            />
            <DateTimePicker
              label={t('create.end_label')}
              value={form.endAt}
              onChange={v => setField('endAt', v)}
              minDate={form.startAt
                ? new Date(new Date(form.startAt).getTime() + 6 * 3_600_000)
                : minDate}
              error={errors.endAt}
              hint={t('create.end_hint')}
            />
            {durH >= 6 && !errors.endAt && (
              <View style={styles.durationBadge}>
                <Clock size={16} color={colors.primary} strokeWidth={2} />
                <View style={styles.durationInfo}>
                  <Text style={styles.durationText}>{t('create.duration_hours', { hours: durH.toFixed(1) })}</Text>
                  {isToday(form.startAt) && (
                    <View style={styles.urgencyRow}>
                      <Zap size={12} color={colors.primaryLight} strokeWidth={2} />
                      <Text style={styles.urgencyNote}>{t('create.urgency_note')}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Full recap */}
            {form.startAt && form.endAt && durH >= 6 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{t('create.summary_title')}</Text>
                <SummaryRow label={t('create.summary_location')}    value={`${form.address}, ${form.city}`} />
                <SummaryRow
                  label={t('create.summary_start')}
                  value={new Date(form.startAt).toLocaleString('fr-FR', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                  })}
                />
                <SummaryRow
                  label={t('create.summary_end')}
                  value={new Date(form.endAt).toLocaleString('fr-FR', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                  })}
                />
                <SummaryRow
                  label={t('create.summary_duration')}
                  value={`${durH.toFixed(1)} heures`}
                  accent
                />

                <View style={styles.recapLinesWrap}>
                  <Text style={styles.recapLinesTitle}>{t('create.recap_section')}</Text>
                  {lines.map(l => (
                    <View key={l.serviceTypeId} style={styles.recapLine}>
                      <View style={[styles.recapDot, { backgroundColor: l.accent }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recapLineName}>{l.name}</Text>
                        <Text style={styles.recapLineDetail}>
                          {l.agentUniforms.map((u, i) =>
                            `${u ? UNIFORM_EMOJI[u] : "—"} ${t("create.agent_label", { n: i + 1 })}`
                          ).join('  ')}
                        </Text>
                      </View>
                      <Text style={[styles.recapLineCount, { color: l.accent }]}>×{l.agentCount}</Text>
                    </View>
                  ))}
                  <View style={styles.recapTotal}>
                    <Text style={styles.recapTotalLabel}>{t('create.total_agents_label')}</Text>
                    <Text style={styles.recapTotalValue}>{totalAgents}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label={step < 3 ? t('create.next_btn') : t('create.create_btn')}
          onPress={handleNext}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────
type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

const StepHero: React.FC<{ Icon: LucideIcon; title: string; color: string }> = ({ Icon, title, color }) => (
  <View style={heroS.wrap}>
    <View style={[heroS.box, { backgroundColor: color + '1A', borderColor: color + '44' }]}>
      <Icon size={22} color={color} strokeWidth={1.8} />
    </View>
    <Text style={heroS.title}>{title}</Text>
  </View>
);

const SummaryRow: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <View style={sumS.row}>
    <Text style={sumS.label}>{label}</Text>
    <Text style={[sumS.value, accent && sumS.valueAccent]} numberOfLines={2}>{value}</Text>
  </View>
);

const heroS = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] },
  box:   { width: 44, height: 44, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4, flex: 1 },
});

const sumS = StyleSheet.create({
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  label:       { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  value:       { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textPrimary, flex: 2, textAlign: 'right' },
  valueAccent: { fontFamily: fontFamily.display, color: colors.primary, fontSize: fontSize.base },
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex:              { flex: 1, backgroundColor: colors.background },
  progressBar:       { flexDirection: 'row', gap: 4, paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[3] },
  progressSeg:       { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  progressSegActive: { backgroundColor: colors.primary },
  scroll:            { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[8] },
  stepContent:       { gap: spacing[3] },
  row:               { flexDirection: 'row', gap: spacing[3] },
  half:              { flex: 1 },
  textArea:          { height: 90, textAlignVertical: 'top', paddingTop: spacing[3] },

  // Line card
  lineCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius:    radius.xl,
    borderWidth:     1,
    overflow:        'hidden',
  },
  lineHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[3],
    gap:               spacing[3],
  },
  lineDot:       { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  lineName:      { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  stepper:       { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  stepBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDim:    { opacity: 0.35 },
  stepCountText: { fontFamily: fontFamily.display, fontSize: fontSize.base, minWidth: 22, textAlign: 'center' },
  removeText:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.danger, opacity: 0.7, paddingHorizontal: spacing[1] },

  // Agents block
  agentsBlock: {
    paddingHorizontal: spacing[4],
    paddingBottom:     spacing[3],
    gap:               spacing[2],
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    paddingTop:        spacing[3],
  },
  agentsBlockTitle: { fontFamily: fontFamily.bodyMedium, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase' },
  agentRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  agentBadge: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  agentBadgeNum:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs },
  uniformChips:     { gap: spacing[2], alignItems: 'center' },
  uniformChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, position: 'relative',
  },
  uniformChipEmoji:   { fontSize: 15 },
  uniformChipLabel:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.textSecondary },
  uniformChipDesc:    { fontFamily: fontFamily.body, fontSize: 9, lineHeight: 12, maxWidth: 80 },
  uniformActiveCheck: {
    position: 'absolute', top: -4, right: -4,
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.background,
  },

  // Uniform summary
  uniformSummary: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  uniformSummaryText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.6 },

  // Total + add more
  totalRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  totalText:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2],
    paddingVertical: spacing[3], borderRadius: radius.xl,
    borderWidth: 1, borderStyle: 'dashed' as any, borderColor: colors.borderPrimary,
    backgroundColor: colors.primarySurface,
  },
  addMoreText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },

  // Error
  errorBanner:     { backgroundColor: 'rgba(225,29,72,0.12)', borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.danger },
  errorBannerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger },

  // Duration badge
  durationBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3],
    backgroundColor: colors.primarySurface, borderRadius: radius.xl,
    padding: spacing[4], borderWidth: 1, borderColor: colors.borderPrimary,
  },
  durationInfo:  { flex: 1, gap: spacing[1] },
  durationText:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.primary },
  urgencyRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  urgencyNote:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primaryLight },

  // Summary card
  summaryCard: {
    backgroundColor: colors.backgroundElevated, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, padding: spacing[4], marginTop: spacing[2],
  },
  summaryTitle:    { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 1.2, marginBottom: spacing[2] },
  recapLinesWrap:  { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border, gap: spacing[2] },
  recapLinesTitle: { fontFamily: fontFamily.bodyMedium, fontSize: 9, color: colors.textMuted, letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: spacing[1] },
  recapLine:       { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  recapDot:        { width: 6, height: 6, borderRadius: 3, flexShrink: 0, marginTop: 4 },
  recapLineName:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  recapLineDetail: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16, marginTop: 2 },
  recapLineCount:  { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, flexShrink: 0 },
  recapTotal:      { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing[1] },
  recapTotalLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  recapTotalValue: { fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.primary },

  footer: {
    paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[4],
    backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
  },
});

