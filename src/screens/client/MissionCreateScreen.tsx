/**
 * MissionCreateScreen — 3-step mission creation.
 *
 * Step 1 · Services & uniforms (global — used as default for every slot)
 * Step 2 · Location
 * Step 3 · Schedule
 *   ├─ Single-slot  → one startAt/endAt, uses Step-1 lines globally
 *   └─ Multi-slot   → N time windows, each with its own service lines
 *       The client can assign different service types per slot:
 *         Day 08-18h   → 3× SECURITE STANDARD
 *         Night 22-06h → 1× SSIAP + 1× CYNOPHILE
 *
 * API flow (multi-slot):
 *   POST /missions  { slots: [{ startAt, endAt, durationHours, notes, bookingLines }] }
 *   → mission is created with slots + bookings in one atomic transaction
 *   POST /quotes/calculate { missionId, slotLines: [{ slotId, bookingLines }] }
 *   → quote is computed per slot (night/weekend surcharges applied to each window)
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, Alert, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import type { TFunction } from 'i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ClipboardList, MapPin, CalendarClock,
  Radius, FileText, Pencil, Clock, Zap, Users, Plus, Minus, Check,
  Calendar, Layers, X, ChevronDown, ChevronUp,
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
import type { MissionStackParamList, MissionSlotRecord } from '@models/index';

type MissionsT = TFunction<'missions'>;
type Props     = NativeStackScreenProps<MissionStackParamList, 'MissionCreate'>;
type Step      = 1 | 2 | 3;
type ScheduleMode = 'SINGLE' | 'MULTI';

// ── Local types ────────────────────────────────────────────────────────────────

/** One service-type line in the UI (carries display metadata). */
interface BookingLineLocal {
  serviceTypeId: string;
  agentCount:    number;
  name:          string;
  accent:        string;
  agentUniforms: (string | null)[];
}

/** One slot draft — includes its own booking lines. */
interface SlotDraft {
  key:          string;
  startAt:      string;
  endAt:        string;
  notes:        string;
  /**
   * Per-slot service lines.  Starts as a copy of the global lines (Step 1)
   * so the user can customise per slot without starting from scratch.
   */
  bookingLines: BookingLineLocal[];
  /** Whether the per-slot lines panel is expanded. */
  linesExpanded: boolean;
}

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

const INITIAL_FORM: FormData = {
  radiusKm: '50', title: '', notes: '', address: '', city: '', zipCode: '',
  latitude: null, longitude: null, startAt: '', endAt: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const UNIFORM_EMOJI: Record<string, string> = {
  STANDARD: '🦺', CIVIL: '👔', EVENEMENTIEL: '🎩', SSIAP: '🚒', CYNOPHILE: '🐕',
};

function durationHours(start: string, end: string): number {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  return (e - s) / 3_600_000;
}

function isToday(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso), t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function clampDuration(h: number): number {
  return Math.max(6, Math.round(h * 10) / 10);
}

function totalSlotHours(drafts: SlotDraft[]): number {
  return drafts.reduce((sum, s) => sum + durationHours(s.startAt, s.endAt), 0);
}

function totalSlotAgents(lines: BookingLineLocal[]): number {
  return lines.reduce((n, l) => n + l.agentCount, 0);
}

let _slotKey = 0;
function nextKey(): string { return `slot_${Date.now()}_${_slotKey++}`; }

/** Deep-clone booking lines for a fresh slot. */
function cloneLines(lines: BookingLineLocal[]): BookingLineLocal[] {
  return lines.map(l => ({ ...l, agentUniforms: [...l.agentUniforms] }));
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export const MissionCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t }     = useTranslation('missions');
  const { t: tc } = useTranslation('common');

  const initialLines: BookingLineLocal[] = (route.params.bookingLines ?? []).map(l => ({
    serviceTypeId: l.serviceTypeId,
    agentCount:    l.agentCount,
    name:          l.name,
    accent:        l.accent,
    agentUniforms: l.agentUniforms ?? Array(l.agentCount).fill(null),
  }));

  const [step,            setStep]            = useState<Step>(1);
  const [form,            setForm]            = useState<FormData>(INITIAL_FORM);
  const [globalLines,     setGlobalLines]     = useState<BookingLineLocal[]>(initialLines);
  const [scheduleMode,    setScheduleMode]    = useState<ScheduleMode>('SINGLE');
  const [slots,           setSlots]           = useState<SlotDraft[]>([]);
  const [errors,          setErrors]          = useState<Record<string, string>>({});
  const [loading,         setLoading]         = useState(false);
  const [mapScrollLocked, setMapScrollLocked] = useState(false);

  const setField = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(p => ({ ...p, [k]: v })), []);

  const totalGlobalAgents = useMemo(() => totalSlotAgents(globalLines), [globalLines]);

  // ── Global line mutations (Step 1) ─────────────────────────────────────────
  const changeCount = useCallback((id: string, delta: number) => {
    setGlobalLines(prev => prev.map(l => {
      if (l.serviceTypeId !== id) return l;
      const count         = Math.min(20, Math.max(1, l.agentCount + delta));
      const agentUniforms = Array.from({ length: count }, (_, i) => l.agentUniforms[i] ?? null);
      return { ...l, agentCount: count, agentUniforms };
    }));
  }, []);

  const changeAgentUniform = useCallback((id: string, idx: number, uniform: string) => {
    setGlobalLines(prev => prev.map(l => {
      if (l.serviceTypeId !== id) return l;
      const agentUniforms = [...l.agentUniforms];
      agentUniforms[idx] = uniform;
      return { ...l, agentUniforms };
    }));
  }, []);

  const removeLine = useCallback((id: string) => {
    setGlobalLines(prev => {
      const next = prev.filter(l => l.serviceTypeId !== id);
      if (next.length === 0) { navigation.goBack(); return prev; }
      return next;
    });
  }, [navigation]);

  // ── Address ─────────────────────────────────────────────────────────────────
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
    setErrors(e => ({ ...e, address: undefined!, latitude: undefined! }));
  }, []);

  const handleMapSelect = useCallback((coords: { latitude: number; longitude: number }, addr?: string) => {
    setForm(p => ({ ...p, latitude: coords.latitude, longitude: coords.longitude, address: addr ?? p.address }));
    setErrors(e => ({ ...e, latitude: undefined! }));
  }, []);

  // ── Schedule mode ──────────────────────────────────────────────────────────
  const toggleScheduleMode = useCallback((mode: ScheduleMode) => {
    setScheduleMode(mode);
    setErrors({});
    if (mode === 'MULTI') {
      setForm(p => ({ ...p, startAt: '', endAt: '' }));
      // Seed one slot pre-populated with current global lines
      if (slots.length === 0) {
        setSlots([{
          key: nextKey(), startAt: '', endAt: '', notes: '',
          bookingLines: cloneLines(globalLines), linesExpanded: false,
        }]);
      }
    }
  }, [slots, globalLines]);

  // ── Slot CRUD ──────────────────────────────────────────────────────────────
  const addSlot = useCallback(() => {
    setSlots(prev => [...prev, {
      key: nextKey(), startAt: '', endAt: '', notes: '',
      bookingLines: cloneLines(globalLines), linesExpanded: false,
    }]);
  }, [globalLines]);

  const removeSlot = useCallback((key: string) => {
    setSlots(prev => prev.length <= 1 ? prev : prev.filter(s => s.key !== key));
  }, []);

  const updateSlot = useCallback((key: string, patch: Partial<Omit<SlotDraft, 'key'>>) => {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s));
    setErrors(prev => {
      const next = { ...prev };
      Object.keys(next).filter(k => k.startsWith(`slot_${key}_`)).forEach(k => delete next[k]);
      return next;
    });
  }, []);

  const toggleSlotLines = useCallback((key: string) => {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, linesExpanded: !s.linesExpanded } : s));
  }, []);

  // ── Per-slot line mutations ────────────────────────────────────────────────
  const changeSlotLineCount = useCallback((slotKey: string, serviceTypeId: string, delta: number) => {
    setSlots(prev => prev.map(s => {
      if (s.key !== slotKey) return s;
      return {
        ...s,
        bookingLines: s.bookingLines.map(l => {
          if (l.serviceTypeId !== serviceTypeId) return l;
          const count         = Math.min(20, Math.max(1, l.agentCount + delta));
          const agentUniforms = Array.from({ length: count }, (_, i) => l.agentUniforms[i] ?? null);
          return { ...l, agentCount: count, agentUniforms };
        }),
      };
    }));
  }, []);

  const changeSlotAgentUniform = useCallback((slotKey: string, serviceTypeId: string, agentIdx: number, uniform: string) => {
    setSlots(prev => prev.map(s => {
      if (s.key !== slotKey) return s;
      return {
        ...s,
        bookingLines: s.bookingLines.map(l => {
          if (l.serviceTypeId !== serviceTypeId) return l;
          const agentUniforms = [...l.agentUniforms];
          agentUniforms[agentIdx] = uniform;
          return { ...l, agentUniforms };
        }),
      };
    }));
  }, []);

  const removeSlotLine = useCallback((slotKey: string, serviceTypeId: string) => {
    setSlots(prev => prev.map(s => {
      if (s.key !== slotKey) return s;
      const next = s.bookingLines.filter(l => l.serviceTypeId !== serviceTypeId);
      // Must keep at least one line — if last, reset to global
      return { ...s, bookingLines: next.length > 0 ? next : cloneLines(globalLines) };
    }));
  }, [globalLines]);

  /** Reset a slot's lines back to the global Step-1 defaults. */
  const resetSlotLines = useCallback((slotKey: string) => {
    setSlots(prev => prev.map(s =>
      s.key === slotKey ? { ...s, bookingLines: cloneLines(globalLines) } : s,
    ));
  }, [globalLines]);

  // ── Add More (navigate to ServicePicker) ───────────────────────────────────
  const handleAddMore = useCallback(() => {
    navigation.navigate('ServicePicker', {
      existingLines: globalLines.map(l => ({
        serviceTypeId: l.serviceTypeId, agentCount: l.agentCount,
        name: l.name, accent: l.accent, agentUniforms: l.agentUniforms,
      })),
    });
  }, [navigation, globalLines]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (step === 1) {
      if (globalLines.length === 0) {
        Alert.alert(t('create.service_required_title'), t('create.service_required_body'));
        return false;
      }
      const km = parseInt(form.radiusKm, 10);
      if (isNaN(km) || km < 5)  e.radiusKm = t('create.radius_min');
      else if (km > 500)        e.radiusKm = t('create.radius_max');
    }

    if (step === 2) {
      if (!form.address.trim())  e.address  = t('create.address_required');
      if (!form.city.trim())     e.city     = t('create.city_required');
      if (form.latitude == null) e.latitude = t('create.map_position_required');
    }

    if (step === 3) {
      if (scheduleMode === 'SINGLE') {
        if (!form.startAt) e.startAt = t('create.start_required');
        if (!form.endAt)   e.endAt   = t('create.end_required');
        if (form.startAt) {
          if (new Date(form.startAt) < new Date(Date.now() + 3_600_000))
            e.startAt = t('create.start_min_future');
        }
        if (form.startAt && form.endAt) {
          const d = durationHours(form.startAt, form.endAt);
          if (new Date(form.endAt) <= new Date(form.startAt)) e.endAt = t('create.end_before_start');
          else if (d < 6)   e.endAt = t('create.duration_min');
          else if (d > 240) e.endAt = t('create.duration_max');
        }
      } else {
        if (slots.length === 0) e.slots_global = t('create.slot_required');
        else if (slots.length > 30) e.slots_global = t('create.slot_max');

        const minStart = new Date(Date.now() + 3_600_000);
        const parsedValid: Array<{ start: Date; end: Date; key: string }> = [];

        slots.forEach(s => {
          if (!s.startAt) { e[`slot_${s.key}_startAt`] = t('create.slot_start_required'); return; }
          if (!s.endAt)   { e[`slot_${s.key}_endAt`]   = t('create.slot_end_required');   return; }
          const start = new Date(s.startAt), end = new Date(s.endAt);
          if (end <= start) { e[`slot_${s.key}_endAt`] = t('create.slot_end_before_start'); return; }
          const dur = durationHours(s.startAt, s.endAt);
          if (dur < 6) { e[`slot_${s.key}_endAt`] = t('create.slot_duration_min'); return; }
          if (s.bookingLines.length === 0) { e[`slot_${s.key}_lines`] = t('create.slot_lines_required'); return; }
          parsedValid.push({ start, end, key: s.key });
        });

        if (parsedValid.length > 0) {
          const sorted = [...parsedValid].sort((a, b) => a.start.getTime() - b.start.getTime());
          if (sorted[0].start < minStart) e[`slot_${sorted[0].key}_startAt`] = t('create.start_min_future');
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].end > sorted[i + 1].start)
              e[`slot_${sorted[i + 1].key}_startAt`] = t('create.slot_overlap');
          }
        }
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    let createdMissionId: string | null = null;
    try {
      const base = {
        address:   form.address.trim(),
        city:      form.city.trim(),
        zipCode:   form.zipCode.trim() || undefined,
        latitude:  form.latitude  ?? 0,
        longitude: form.longitude ?? 0,
        title:     form.title.trim() || undefined,
        notes:     form.notes.trim() || undefined,
        radiusKm:  Math.min(500, Math.max(5, parseInt(form.radiusKm, 10) || 50)),
      };

      let missionPayload: Parameters<typeof missionsApi.create>[0];

      if (scheduleMode === 'SINGLE') {
        const durH = durationHours(form.startAt, form.endAt);
        missionPayload = {
          ...base,
          startAt:       new Date(form.startAt).toISOString(),
          endAt:         new Date(form.endAt).toISOString(),
          durationHours: clampDuration(durH),
          isUrgent:      isToday(form.startAt),
          // Global booking lines sent with the mission for single-slot
          bookingLines: globalLines.map(l => ({
            serviceTypeId: l.serviceTypeId,
            agentCount:    l.agentCount,
            agentUniforms: l.agentUniforms.map(u => u ?? 'STANDARD'),
          })),
        };
      } else {
        const sortedDrafts = [...slots].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        );
        missionPayload = {
          ...base,
          isUrgent: isToday(sortedDrafts[0]?.startAt ?? ''),
          slots: sortedDrafts.map(s => ({
            startAt:       new Date(s.startAt).toISOString(),
            endAt:         new Date(s.endAt).toISOString(),
            durationHours: clampDuration(durationHours(s.startAt, s.endAt)),
            notes:         s.notes.trim() || undefined,
            // Embed per-slot booking lines directly in the mission payload
            bookingLines: s.bookingLines.map(l => ({
              serviceTypeId: l.serviceTypeId,
              agentCount:    l.agentCount,
              agentUniforms: l.agentUniforms.map(u => u ?? 'STANDARD'),
            })),
          })),
        };
      }

      // === Step 1: Create the mission (mission + slots + bookings atomic on API) ===
      const { data: mRes } = await missionsApi.create(missionPayload);
      let mission = (mRes as any).data;
      createdMissionId = mission.id;
      console.log('[MissionCreate] Mission ' + mission.id + ' created with ' + (mission.slots ?? []).length + ' slot(s)');

      // === Step 2: Calculate the quote ===
      if (scheduleMode === 'SINGLE') {
        await quotesApi.calculate({
          missionId:    mission.id,
          bookingLines: globalLines.map(l => ({
            serviceTypeId: l.serviceTypeId,
            agentCount:    l.agentCount,
            agentUniforms: l.agentUniforms.map(u => u ?? 'STANDARD'),
          })),
        });
      } else {
        // Multi-slot: we need the created MissionSlot IDs to reference them in the quote.
        // If the create response didn't include them (e.g. older API version), refetch.
        let createdSlots: MissionSlotRecord[] = (mission.slots ?? []).slice();

        if (createdSlots.length === 0) {
          console.warn('[MissionCreate] mission.slots missing in create response, refetching');
          try {
            const { data: refetch } = await missionsApi.getById(mission.id);
            mission = (refetch as any).data;
            createdSlots = (mission.slots ?? []).slice();
            console.log('[MissionCreate] Refetch returned ' + createdSlots.length + ' slot(s)');
          } catch (refetchErr) {
            console.error('[MissionCreate] Refetch failed:', refetchErr);
          }
        }

        if (createdSlots.length === 0) {
          throw new Error(
            'Mission creee (id ' + mission.id + ') mais les creneaux n ont pas pu etre recuperes. ' +
            'Ouvrez la mission depuis "Mes missions" pour generer le devis.',
          );
        }

        // Match each draft to its created slot by chronological start time —
        // robust against any insertion order on the API side.
        const sortedSlots = [...createdSlots].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        );
        const sortedDrafts = [...slots].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        );

        if (sortedDrafts.length !== sortedSlots.length) {
          throw new Error(
            'Decalage creneaux : ' + sortedDrafts.length + ' envoyes, ' + sortedSlots.length + ' recus. ' +
            'Mission ' + mission.id + ' creee mais devis non genere.',
          );
        }

        await quotesApi.calculate({
          missionId: mission.id,
          slotLines: sortedDrafts.map((draft, idx) => ({
            slotId: sortedSlots[idx].id,
            bookingLines: draft.bookingLines.map(l => ({
              serviceTypeId: l.serviceTypeId,
              agentCount:    l.agentCount,
              agentUniforms: l.agentUniforms.map(u => u ?? 'STANDARD'),
            })),
          })),
        });
      }

      // === Step 3: Navigate to the quote screen ===
      navigation.replace('QuoteDetail', { missionId: mission.id });
    } catch (err: unknown) {
      console.error('[MissionCreate] Submit failed:', err);

      // Decide whether to roll back. Roll back ONLY for server errors (5xx) or
      // network failures. Otherwise keep the mission so the user can retry the
      // quote from the missions list without re-entering all the data.
      const status      = (err as any)?.response?.status;
      const apiMsg      = (err as any)?.response?.data?.message;
      const localMsg    = (err as any)?.message;
      const isNetworkErr = !status && typeof localMsg === 'string' && localMsg.includes('Network');
      const isServerErr  = (typeof status === 'number' && status >= 500) || isNetworkErr;

      if (createdMissionId && isServerErr) {
        missionsApi.cancel(createdMissionId).catch(() =>
          console.warn('[MissionCreate] Could not cancel orphan mission', createdMissionId),
        );
      }

      const userMsg =
        (Array.isArray(apiMsg) ? apiMsg.join('\n') : apiMsg) ??
        localMsg ??
        t('create.error_create');

      // If the mission was created and the failure is recoverable, offer a
      // button to jump to the mission detail screen for manual quote retry.
      if (createdMissionId && !isServerErr) {
        Alert.alert(
          tc('error'),
          userMsg,
          [
            { text: tc('cancel'), style: 'cancel' },
            {
              text:    t('detail.cta_get_quote'),
              onPress: () => navigation.replace('MissionDetail', { missionId: createdMissionId! }),
            },
          ],
        );
      } else {
        Alert.alert(tc('error'), userMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const singleDurH  = form.startAt && form.endAt ? durationHours(form.startAt, form.endAt) : 0;
  const multiTotalH = useMemo(() => totalSlotHours(slots), [slots]);
  const minDate     = new Date(Date.now() + 3_600_000);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={['', t('create.step_one'), t('create.step_two'), t('create.step_three')][step]}
        onBack={() => step > 1 ? setStep(s => (s - 1) as Step) : navigation.goBack()}
      />

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
        nestedScrollEnabled
      >
        {/* ══════════════════ STEP 1 — Services & uniforms ══════════════════ */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <StepHero Icon={ClipboardList} title={t('create.step_one_title')} color={colors.primary} />

            {globalLines.map(line => (
              <LineCard
                key={line.serviceTypeId}
                line={line}
                onChangeCount={delta => changeCount(line.serviceTypeId, delta)}
                onChangeUniform={(idx, u) => changeAgentUniform(line.serviceTypeId, idx, u)}
                onRemove={globalLines.length > 1 ? () => removeLine(line.serviceTypeId) : undefined}
                t={t}
              />
            ))}

            <View style={styles.totalRow}>
              <Users size={14} color={colors.textMuted} strokeWidth={1.8} />
              <Text style={styles.totalText}>
                {t('create.total_agents', { count: totalGlobalAgents, lines: globalLines.length })}
              </Text>
            </View>

            <TouchableOpacity style={styles.addMoreBtn} onPress={handleAddMore} activeOpacity={0.75}>
              <Plus size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addMoreText}>{t('create.add_service')}</Text>
            </TouchableOpacity>

            <Input label={t('create.title_label')} value={form.title}
              onChangeText={v => setField('title', v)} placeholder={t('create.title_placeholder')}
              leftIcon={<Pencil size={16} color={colors.textMuted} strokeWidth={1.8} />} maxLength={100} />
            <Input label={t('create.notes_label')} value={form.notes}
              onChangeText={v => setField('notes', v)} placeholder={t('create.instructions_placeholder')}
              multiline numberOfLines={3} style={styles.textArea}
              leftIcon={<FileText size={16} color={colors.textMuted} strokeWidth={1.8} />} />
            <Input label={t('create.radius_label')} value={form.radiusKm}
              onChangeText={v => setField('radiusKm', v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad" hint={t('create.radius_hint')} error={errors.radiusKm}
              leftIcon={<Radius size={16} color={colors.textMuted} strokeWidth={1.8} />} />
          </View>
        )}

        {/* ══════════════════ STEP 2 — Location ════════════════════════════ */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <StepHero Icon={MapPin} title={t('create.step_two_title')} color={colors.infoSurface} />
            <AddressSearch value={form.address} error={errors.address}
              onSelect={handleAddressSelect} placeholder={t('create.address_placeholder')} countrycodes="fr" />
            <View style={styles.row}>
              <View style={styles.half}>
                <Input label={t('create.city_label')} value={form.city}
                  onChangeText={v => setField('city', v)} placeholder={t('create.city_placeholder')}
                  error={errors.city} leftIcon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />} />
              </View>
              <View style={styles.half}>
                <Input label={t('create.zip_label')} value={form.zipCode}
                  onChangeText={v => setField('zipCode', v)} keyboardType="number-pad"
                  placeholder={t('create.zip_placeholder')}
                  leftIcon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />} />
              </View>
            </View>
            <MapLocationPicker latitude={form.latitude ?? undefined} longitude={form.longitude ?? undefined}
              onSelect={handleMapSelect} onInteractionChange={setMapScrollLocked} />
            {errors.latitude && (
              <View style={styles.errorBanner}><Text style={styles.errorBannerText}>{errors.latitude}</Text></View>
            )}
          </View>
        )}

        {/* ══════════════════ STEP 3 — Schedule ════════════════════════════ */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <StepHero Icon={CalendarClock} title={t('create.schedule_title')} color={colors.primary} />

            {/* Mode toggle */}
            <View style={styles.modeToggleRow}>
              <ModeBtn
                label={t('create.slot_mode_single')}
                icon={<Calendar size={13} color={scheduleMode === 'SINGLE' ? colors.primary : colors.textMuted} strokeWidth={2} />}
                active={scheduleMode === 'SINGLE'} onPress={() => toggleScheduleMode('SINGLE')} />
              <ModeBtn
                label={t('create.slot_mode_multi')}
                icon={<Layers size={13} color={scheduleMode === 'MULTI' ? colors.primary : colors.textMuted} strokeWidth={2} />}
                active={scheduleMode === 'MULTI'} onPress={() => toggleScheduleMode('MULTI')} />
            </View>

            {/* ── SINGLE ── */}
            {scheduleMode === 'SINGLE' && (
              <>
                <DateTimePicker label={t('create.start_label')} value={form.startAt}
                  onChange={v => setField('startAt', v)} minDate={minDate}
                  error={errors.startAt} hint={t('create.start_hint')} />
                <DateTimePicker label={t('create.end_label')} value={form.endAt}
                  onChange={v => setField('endAt', v)}
                  minDate={form.startAt ? new Date(new Date(form.startAt).getTime() + 6 * 3_600_000) : minDate}
                  error={errors.endAt} hint={t('create.end_hint')} />
                {singleDurH >= 6 && !errors.endAt && (
                  <DurationBadge t={t} hours={singleDurH} urgent={isToday(form.startAt)} />
                )}
                {form.startAt && form.endAt && singleDurH >= 6 && (
                  <SingleSummary t={t} form={form} durH={singleDurH} lines={globalLines} totalAgents={totalGlobalAgents} />
                )}
              </>
            )}

            {/* ── MULTI ── */}
            {scheduleMode === 'MULTI' && (
              <>
                <View style={styles.hintBanner}>
                  <Layers size={13} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.hintBannerText}>{t('create.slot_mode_hint')}</Text>
                </View>

                <View style={styles.slotsSectionHeader}>
                  <Text style={styles.slotsSectionTitle}>{t('create.slots_section_title')}</Text>
                  <Text style={styles.slotsCount}>{slots.length}</Text>
                </View>

                {errors.slots_global && (
                  <View style={styles.errorBanner}><Text style={styles.errorBannerText}>{errors.slots_global}</Text></View>
                )}

                {slots.map((slot, idx) => {
                  const slotDurH  = durationHours(slot.startAt, slot.endAt);
                  const startErr  = errors[`slot_${slot.key}_startAt`];
                  const endErr    = errors[`slot_${slot.key}_endAt`];
                  const linesErr  = errors[`slot_${slot.key}_lines`];
                  const prevEnd   = idx > 0 && slots[idx - 1].endAt ? new Date(slots[idx - 1].endAt) : null;
                  const slotMin   = prevEnd && prevEnd > minDate ? prevEnd : minDate;
                  const slotMinEnd = slot.startAt ? new Date(new Date(slot.startAt).getTime() + 6 * 3_600_000) : slotMin;
                  const slotAgents = totalSlotAgents(slot.bookingLines);
                  const isCustom  = JSON.stringify(slot.bookingLines.map(l => ({ id: l.serviceTypeId, n: l.agentCount }))) !==
                                    JSON.stringify(globalLines.map(l => ({ id: l.serviceTypeId, n: l.agentCount })));

                  return (
                    <View key={slot.key} style={styles.slotCard}>
                      {/* Slot header */}
                      <View style={styles.slotCardHeader}>
                        <View style={styles.slotIndexBadge}>
                          <Text style={styles.slotIndexText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.slotCardTitle}>{t('create.slot_label', { n: idx + 1 })}</Text>
                        {slotDurH >= 6 && !endErr && !startErr && (
                          <View style={styles.slotDurationPill}>
                            <Clock size={9} color={colors.primary} strokeWidth={2.5} />
                            <Text style={styles.slotDurationPillText}>
                              {t('create.slot_duration_badge', { hours: slotDurH.toFixed(1) })}
                            </Text>
                          </View>
                        )}
                        {slots.length > 1 && (
                          <TouchableOpacity onPress={() => removeSlot(slot.key)}
                            style={styles.slotRemoveBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel={t('create.slot_remove')}>
                            <X size={14} color={colors.danger} strokeWidth={2} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Date pickers */}
                      <View style={styles.slotPickersWrap}>
                        <DateTimePicker label={t('create.start_label')} value={slot.startAt}
                          onChange={v => updateSlot(slot.key, { startAt: v, endAt: '' })}
                          minDate={slotMin} error={startErr}
                          hint={idx === 0 ? t('create.start_hint') : undefined} />
                        <DateTimePicker label={t('create.end_label')} value={slot.endAt}
                          onChange={v => updateSlot(slot.key, { endAt: v })}
                          minDate={slotMinEnd} error={endErr} hint={t('create.end_hint')} />
                      </View>

                      {/* Slot notes */}
                      <Input value={slot.notes}
                        onChangeText={v => updateSlot(slot.key, { notes: v })}
                        placeholder={t('create.slot_notes_placeholder')}
                        leftIcon={<FileText size={14} color={colors.textMuted} strokeWidth={1.8} />}
                        maxLength={200} />

                      {/* Per-slot booking lines accordion */}
                      <TouchableOpacity
                        style={[styles.slotLinesToggle, isCustom && styles.slotLinesToggleCustom]}
                        onPress={() => toggleSlotLines(slot.key)}
                        activeOpacity={0.8}
                      >
                        <Users size={13} color={isCustom ? colors.primary : colors.textMuted} strokeWidth={2} />
                        <Text style={[styles.slotLinesToggleText, isCustom && { color: colors.primary }]}>
                          {isCustom
                            ? t('create.slot_lines_custom', { count: slotAgents })
                            : t('create.slot_lines_default', { count: slotAgents })}
                        </Text>
                        {slot.linesExpanded
                          ? <ChevronUp size={14} color={isCustom ? colors.primary : colors.textMuted} strokeWidth={2} />
                          : <ChevronDown size={14} color={isCustom ? colors.primary : colors.textMuted} strokeWidth={2} />}
                      </TouchableOpacity>

                      {linesErr && (
                        <View style={styles.errorBanner}><Text style={styles.errorBannerText}>{linesErr}</Text></View>
                      )}

                      {slot.linesExpanded && (
                        <View style={styles.slotLinesPanel}>
                          {/* Reset to global defaults */}
                          {isCustom && (
                            <TouchableOpacity style={styles.resetLinesBtn} onPress={() => resetSlotLines(slot.key)}>
                              <Text style={styles.resetLinesBtnText}>{t('create.slot_lines_reset')}</Text>
                            </TouchableOpacity>
                          )}

                          {slot.bookingLines.map(line => (
                            <LineCard
                              key={line.serviceTypeId}
                              line={line}
                              compact
                              onChangeCount={delta => changeSlotLineCount(slot.key, line.serviceTypeId, delta)}
                              onChangeUniform={(agentIdx, u) => changeSlotAgentUniform(slot.key, line.serviceTypeId, agentIdx, u)}
                              onRemove={slot.bookingLines.length > 1 ? () => removeSlotLine(slot.key, line.serviceTypeId) : undefined}
                              t={t}
                            />
                          ))}

                          <View style={styles.slotLinesTotalRow}>
                            <Users size={12} color={colors.textMuted} strokeWidth={1.8} />
                            <Text style={styles.slotLinesTotalText}>
                              {t('create.total_agents', { count: slotAgents, lines: slot.bookingLines.length })}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                {slots.length < 30 && (
                  <TouchableOpacity style={styles.addMoreBtn} onPress={addSlot} activeOpacity={0.75}>
                    <Plus size={14} color={colors.primary} strokeWidth={2.5} />
                    <Text style={styles.addMoreText}>{t('create.slot_add_btn')}</Text>
                  </TouchableOpacity>
                )}

                {multiTotalH >= 6 && (
                  <DurationBadge t={t} hours={multiTotalH}
                    urgent={slots.some(s => isToday(s.startAt))}
                    label={t('create.slots_total_duration', { hours: multiTotalH.toFixed(1), count: slots.length })} />
                )}

                {multiTotalH >= 6 && slots.every(s => durationHours(s.startAt, s.endAt) >= 6) && (
                  <MultiSummary t={t} form={form} slots={slots} totalH={multiTotalH} />
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={step < 3 ? t('create.next_btn') : t('create.create_btn')}
          onPress={handleNext} loading={loading} fullWidth size="lg" />
      </View>
    </KeyboardAvoidingView>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

type LucideIcon = React.FC<{ size: number; color: string; strokeWidth: number }>;

const StepHero: React.FC<{ Icon: LucideIcon; title: string; color: string }> = ({ Icon, title, color }) => (
  <View style={heroS.wrap}>
    <View style={[heroS.box, { backgroundColor: color + '1A', borderColor: color + '44' }]}>
      <Icon size={22} color={color} strokeWidth={1.8} />
    </View>
    <Text style={heroS.title}>{title}</Text>
  </View>
);

const ModeBtn: React.FC<{ label: string; icon: React.ReactNode; active: boolean; onPress: () => void }> = ({ label, icon, active, onPress }) => (
  <TouchableOpacity style={[modeS.btn, active && modeS.btnActive]} onPress={onPress} activeOpacity={0.8}>
    {icon}
    <Text style={[modeS.label, active && modeS.labelActive]}>{label}</Text>
  </TouchableOpacity>
);

/**
 * Reusable booking line card — used in Step 1 (global) and per-slot panel.
 * `compact` reduces padding for the nested slot context.
 */
const LineCard: React.FC<{
  line:            BookingLineLocal;
  compact?:        boolean;
  onChangeCount:   (delta: number) => void;
  onChangeUniform: (agentIdx: number, uniform: string) => void;
  onRemove?:       () => void;
  t:               MissionsT;
}> = ({ line, compact, onChangeCount, onChangeUniform, onRemove, t }) => (
  <View style={[styles.lineCard, { borderColor: line.accent + '60' }, compact && styles.lineCardCompact]}>
    <View style={styles.lineHeader}>
      <View style={[styles.lineDot, { backgroundColor: line.accent }]} />
      <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={[styles.stepBtn, line.agentCount <= 1 && styles.stepBtnDim]}
          onPress={() => onChangeCount(-1)} disabled={line.agentCount <= 1}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Minus size={12} color={line.agentCount <= 1 ? colors.textMuted : line.accent} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.stepCountText, { color: line.accent }]}>{line.agentCount}</Text>
        <TouchableOpacity style={[styles.stepBtn, line.agentCount >= 20 && styles.stepBtnDim]}
          onPress={() => onChangeCount(+1)} disabled={line.agentCount >= 20}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Plus size={12} color={line.agentCount >= 20 ? colors.textMuted : line.accent} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>

    <View style={styles.agentsBlock}>
      <Text style={[styles.agentsBlockTitle, { color: line.accent }]}>{t('create.uniform_per_agent')}</Text>
      {line.agentUniforms.map((uniform, agentIdx) => (
        <View key={agentIdx} style={styles.agentRow}>
          <View style={[styles.agentBadge, { backgroundColor: line.accent + '20', borderColor: line.accent + '50' }]}>
            <Text style={[styles.agentBadgeNum, { color: line.accent }]}>{agentIdx + 1}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.uniformChips}>
            {UNIFORM_OPTIONS.map(opt => {
              const active = uniform === opt.value;
              return (
                <TouchableOpacity key={opt.value}
                  style={[styles.uniformChip, active && { backgroundColor: line.accent + '20', borderColor: line.accent }]}
                  onPress={() => onChangeUniform(agentIdx, opt.value)}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                  <Text style={styles.uniformChipEmoji}>{opt.emoji}</Text>
                  <View>
                    <Text style={[styles.uniformChipLabel, active && { color: line.accent }]}>{opt.label}</Text>
                    {active && <Text style={[styles.uniformChipDesc, { color: line.accent }]} numberOfLines={1}>{opt.desc}</Text>}
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

    <View style={styles.uniformSummary}>
      <Users size={12} color={colors.textMuted} strokeWidth={1.8} />
      <Text style={styles.uniformSummaryText}>
        {line.agentUniforms.map((u, i) =>
          `Agent ${i + 1}: ${u ? (UNIFORM_EMOJI[u] + ' ' + (UNIFORM_OPTIONS.find(o => o.value === u)?.label ?? u)) : '—'}`
        ).join('  ·  ')}
      </Text>
    </View>
  </View>
);

const DurationBadge: React.FC<{
  t:       MissionsT;
  hours:   number;
  urgent:  boolean;
  label?:  string;
}> = ({ t, hours, urgent, label }) => (
  <View style={styles.durationBadge}>
    <Clock size={16} color={colors.primary} strokeWidth={2} />
    <View style={styles.durationInfo}>
      <Text style={styles.durationText}>
        {label ?? t('create.duration_hours', { hours: hours.toFixed(1) })}
      </Text>
      {urgent && (
        <View style={styles.urgencyRow}>
          <Zap size={12} color={colors.primaryLight} strokeWidth={2} />
          <Text style={styles.urgencyNote}>{t('create.urgency_note')}</Text>
        </View>
      )}
    </View>
  </View>
);

const SummaryRow: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <View style={sumS.row}>
    <Text style={sumS.label}>{label}</Text>
    <Text style={[sumS.value, accent && sumS.valueAccent]} numberOfLines={2}>{value}</Text>
  </View>
);

const RecapLines: React.FC<{ t: MissionsT; lines: BookingLineLocal[]; totalAgents: number }> = ({ t, lines, totalAgents }) => (
  <View style={styles.recapLinesWrap}>
    <Text style={styles.recapLinesTitle}>{t('create.recap_section')}</Text>
    {lines.map(l => (
      <View key={l.serviceTypeId} style={styles.recapLine}>
        <View style={[styles.recapDot, { backgroundColor: l.accent }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.recapLineName}>{l.name}</Text>
          <Text style={styles.recapLineDetail}>
            {l.agentUniforms.map((u, i) =>
              `${u ? UNIFORM_EMOJI[u] : '—'} ${t('create.agent_label', { n: i + 1 })}`
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
);

const SingleSummary: React.FC<{
  t: MissionsT; form: FormData; durH: number;
  lines: BookingLineLocal[]; totalAgents: number;
}> = ({ t, form, durH, lines, totalAgents }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryTitle}>{t('create.summary_title')}</Text>
    <SummaryRow label={t('create.summary_location')} value={`${form.address}, ${form.city}`} />
    <SummaryRow label={t('create.summary_start')} value={new Date(form.startAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} />
    <SummaryRow label={t('create.summary_end')} value={new Date(form.endAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} />
    <SummaryRow label={t('create.summary_duration')} value={t('create.duration_hours', { hours: durH.toFixed(1) })} accent />
    <RecapLines t={t} lines={lines} totalAgents={totalAgents} />
  </View>
);

const MultiSummary: React.FC<{
  t: MissionsT; form: FormData; slots: SlotDraft[]; totalH: number;
}> = ({ t, form, slots, totalH }) => {
  const sorted = [...slots].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const count  = sorted.length;
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{t('create.summary_title')}</Text>
      <SummaryRow label={t('create.summary_location')} value={`${form.address}, ${form.city}`} />
      <SummaryRow label={t('create.summary_slots')} value={count === 1 ? t('create.summary_slots_one', { count }) : t('create.summary_slots_other', { count })} />
      <SummaryRow label={t('create.summary_duration')} value={t('create.duration_hours', { hours: totalH.toFixed(1) })} accent />

      <View style={styles.recapLinesWrap}>
        <Text style={styles.recapLinesTitle}>{t('create.slots_section_title')}</Text>
        {sorted.map((s, i) => {
          const slotAgents = totalSlotAgents(s.bookingLines);
          const durH       = durationHours(s.startAt, s.endAt);
          return (
            <View key={s.key} style={styles.recapLine}>
              <View style={[styles.recapDot, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.recapLineName}>{t('create.slot_label', { n: i + 1 })}</Text>
                <Text style={styles.recapLineDetail}>
                  {s.startAt
                    ? new Date(s.startAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : '—'}{' → '}
                  {s.endAt
                    ? new Date(s.endAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </Text>
                {/* Per-slot service summary */}
                {s.bookingLines.map(l => (
                  <Text key={l.serviceTypeId} style={styles.recapLineDetail}>
                    {`  ${l.agentCount}× ${l.name} — ${l.agentUniforms.map(u => u ? UNIFORM_EMOJI[u] : '—').join(' ')}`}
                  </Text>
                ))}
                {s.notes ? <Text style={styles.recapLineNotes}>{s.notes}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.recapLineCount, { color: colors.primary }]}>{durH > 0 ? `${durH.toFixed(1)}h` : ''}</Text>
                <Text style={styles.recapLineDetail}>{slotAgents} ag.</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const heroS = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] },
  box:   { width: 44, height: 44, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: -0.4, flex: 1 },
});

const modeS = StyleSheet.create({
  btn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1] + 2, paddingVertical: spacing[2] + 2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  btnActive:  { backgroundColor: colors.primarySurface, borderColor: colors.borderPrimary },
  label:      { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted },
  labelActive:{ color: colors.primary },
});

const sumS = StyleSheet.create({
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border },
  label:       { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  value:       { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textPrimary, flex: 2, textAlign: 'right' },
  valueAccent: { fontFamily: fontFamily.display, color: colors.primary, fontSize: fontSize.base },
});

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

  lineCard:        { backgroundColor: colors.backgroundElevated, borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  lineCardCompact: { borderRadius: radius.lg },
  lineHeader:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[3] },
  lineDot:         { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  lineName:        { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  stepper:         { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  stepBtn:         { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnDim:      { opacity: 0.35 },
  stepCountText:   { fontFamily: fontFamily.display, fontSize: fontSize.base, minWidth: 22, textAlign: 'center' },
  removeText:      { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.danger, opacity: 0.7, paddingHorizontal: spacing[1] },

  agentsBlock:      { paddingHorizontal: spacing[4], paddingBottom: spacing[3], gap: spacing[2], borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing[3] },
  agentsBlockTitle: { fontFamily: fontFamily.bodyMedium, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase' },
  agentRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  agentBadge:       { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  agentBadgeNum:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs },
  uniformChips:     { gap: spacing[2], alignItems: 'center' },
  uniformChip:      { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2, paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, position: 'relative' },
  uniformChipEmoji: { fontSize: 15 },
  uniformChipLabel: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.textSecondary },
  uniformChipDesc:  { fontFamily: fontFamily.body, fontSize: 9, lineHeight: 12, maxWidth: 80 },
  uniformActiveCheck: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.background },

  uniformSummary:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], paddingHorizontal: spacing[4], paddingVertical: spacing[2], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  uniformSummaryText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: fontSize.xs * 1.6 },

  totalRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  totalText:   { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  addMoreBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed' as any, borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface },
  addMoreText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.primary },

  errorBanner:     { backgroundColor: 'rgba(225,29,72,0.12)', borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.danger },
  errorBannerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger },

  durationBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], backgroundColor: colors.primarySurface, borderRadius: radius.xl, padding: spacing[4], borderWidth: 1, borderColor: colors.borderPrimary },
  durationInfo:  { flex: 1, gap: spacing[1] },
  durationText:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.base, color: colors.primary },
  urgencyRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  urgencyNote:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primaryLight },

  modeToggleRow: { flexDirection: 'row', gap: spacing[2] },
  hintBanner:    { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], backgroundColor: colors.primarySurface, borderRadius: radius.lg, padding: spacing[3], borderWidth: 1, borderColor: colors.borderPrimary },
  hintBannerText:{ flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primary, lineHeight: 16 },

  slotsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotsSectionTitle:  { fontFamily: fontFamily.bodyMedium, fontSize: 10, letterSpacing: 1.0, textTransform: 'uppercase', color: colors.textMuted },
  slotsCount:         { fontFamily: fontFamily.display, fontSize: fontSize.sm, color: colors.primary, backgroundColor: colors.primarySurface, borderRadius: 10, paddingHorizontal: spacing[2], paddingVertical: 2, overflow: 'hidden' },

  slotCard:           { backgroundColor: colors.backgroundElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing[4], gap: spacing[3] },
  slotCardHeader:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  slotIndexBadge:     { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  slotIndexText:      { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary },
  slotCardTitle:      { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  slotDurationPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primarySurface, borderRadius: radius.lg, paddingHorizontal: spacing[2], paddingVertical: 2, borderWidth: 1, borderColor: colors.borderPrimary },
  slotDurationPillText:{ fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.primary },
  slotRemoveBtn:      { padding: spacing[1] },
  slotPickersWrap:    { gap: spacing[2] },

  // Per-slot booking lines
  slotLinesToggle:       { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[2], paddingHorizontal: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  slotLinesToggleCustom: { borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface },
  slotLinesToggleText:   { flex: 1, fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted },
  slotLinesPanel:        { gap: spacing[2], paddingTop: spacing[1] },
  slotLinesTotalRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  slotLinesTotalText:    { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted },
  resetLinesBtn:         { alignSelf: 'flex-end', paddingVertical: spacing[1], paddingHorizontal: spacing[3] },
  resetLinesBtnText:     { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textDecorationLine: 'underline' },

  summaryCard:    { backgroundColor: colors.backgroundElevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing[4], marginTop: spacing[2] },
  summaryTitle:   { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 1.2, marginBottom: spacing[2] },
  recapLinesWrap: { marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border, gap: spacing[2] },
  recapLinesTitle:{ fontFamily: fontFamily.bodyMedium, fontSize: 9, color: colors.textMuted, letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: spacing[1] },
  recapLine:      { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  recapDot:       { width: 6, height: 6, borderRadius: 3, flexShrink: 0, marginTop: 4 },
  recapLineName:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  recapLineDetail:{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16, marginTop: 2 },
  recapLineNotes: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic', marginTop: 1 },
  recapLineCount: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, flexShrink: 0 },
  recapTotal:     { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing[1] },
  recapTotalLabel:{ fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textMuted },
  recapTotalValue:{ fontFamily: fontFamily.display, fontSize: fontSize.base, color: colors.primary },

  footer: { paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
