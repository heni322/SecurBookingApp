/**
 * MissionCreateScreen — Enterprise 2-step mission creation.
 *
 * Flow (redesigned):
 *   MissionList / Home → MissionCreate (2 steps) → QuoteDetail
 *
 *     Step 1 · WHERE        Address with auto-fill + map confirmation
 *     Step 2 · WHEN & WHO   Per-slot scheduling AND staffing, together.
 *                           Each créneau carries its OWN services / agent
 *                           counts / uniforms — fully independent per slot.
 *                           This is the last step: indicative price, optional
 *                           title/notes and the "Create" CTA are folded in.
 *
 * What changed vs. the old flow
 *   ─ The standalone ServicePicker screen is gone. Service/agent selection now
 *     lives inside each time slot on step 2 ("merge fully, per-slot").
 *   ─ Single-slot vs multi-slot is no longer a mode switch: there is always a
 *     list of >=1 slots, each with its own staffing. A 1-slot mission submits as
 *     SINGLE, a many-slot mission submits as MULTI — payloads unchanged.
 *
 * Enterprise UX features:
 *   ─ Draft autosave (per-user, 7-day TTL) + restore banner on mount
 *   ─ Smart footer: Back · Continue/Create with step-preview labels
 *   ─ Cross-slot validation summary banner (overlap / legal duration)
 *   ─ Per-slot "copy schedule + staffing from slot N" shortcut
 *   ─ Indicative price estimate folded into the final step
 *   ─ Structured submit-error banner with "Modifier" jump-back per field
 *
 * Backend payload (unified slots[]):
 *   ─ ALL missions     -> { ...base, slots: [{ startAt, endAt, durationHours, bookingLines }] }
 *   ─ Single-slot      -> same shape, 1 entry in slots array
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import type { TFunction } from 'i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MapPin, CalendarClock, FileText, Pencil, Clock, Zap, Users, Plus, Minus, X,
  Sparkles, Sunrise, Moon, PartyPopper, Calendar, ChevronRight, ChevronLeft, Check,
  RotateCcw, Copy, AlertTriangle, Receipt, UserPlus,
} from 'lucide-react-native';
import { useTranslation }    from '@i18n';
import i18n from '@i18n';
import { useToast }          from '@hooks/useToast';
import { useConfirmDialog }  from '@hooks/useConfirmDialog';
import { useApi }            from '@hooks/useApi';
import { useAuthStore }      from '@store/authStore';
import { missionsApi }       from '@api/endpoints/missions';
import { quotesApi }         from '@api/endpoints/quotes';
import { serviceTypesApi }   from '@api/endpoints/serviceTypes';
import { missionDraftStorage, isDraftMeaningful } from '@services/missionDraftStorage';
import type { MissionDraftPayload } from '@services/missionDraftStorage';
import { Button }            from '@components/ui/Button';
import { Input }             from '@components/ui/Input';
import { ScreenHeader }      from '@components/ui/ScreenHeader';
import { AddressSearch }     from '@components/ui/AddressSearch';
import { MapLocationPicker } from '@components/ui/MapLocationPicker';
import { DateTimePicker }    from '@components/ui/DateTimePicker';
import type { NominatimResult } from '@components/ui/AddressSearch';
import {
  UNIFORM_OPTIONS, DEFAULT_UNIFORM, UNIFORM_EMOJI, getServiceMeta,
  allowedUniformsForService, defaultUniformForService,
} from '@constants/serviceCatalog';
import type { UniformValue } from '@constants/serviceCatalog';
import { formatEuros }       from '@utils/formatters';
import { colors }            from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList, ServiceType } from '@models/index';

type MissionsT = TFunction<'missions'>;
type Props     = NativeStackScreenProps<MissionStackParamList, 'MissionCreate'>;
type Step      = 1 | 2;

const TOTAL_STEPS = 2;

// ──────────────────────────────────────────────────────────────────────────────
// Local types
// ──────────────────────────────────────────────────────────────────────────────

/** One service-type need within a single slot. Fully self-contained. */
interface SlotServiceLine {
  serviceTypeId: string;
  name:          string;
  accent:        string;
  /** Indicative rate from the catalog. NOT sent to the API — estimate only. */
  ratePerHour:   number;
  agentCount:    number;     // 1..20
  uniform:       UniformValue;
  /** Tenues that match this service's category (default first). */
  allowedUniforms: UniformValue[];
}

interface SlotDraft {
  key:        string;
  startAt:    string;
  endAt:      string;
  /** Per-slot staffing — each slot is independent. */
  lines:      SlotServiceLine[];
  /** Whether the "add a service" catalog is expanded for this slot. */
  pickerOpen: boolean;
}

interface FormData {
  title:     string;
  notes:     string;
  address:   string;
  city:      string;
  zipCode:   string;
  latitude:  number | null;
  longitude: number | null;
}

interface SubmitError {
  title:   string;
  details: string[];
  /** Step to jump to when the user taps "Modifier". null = no jump-back. */
  jumpTo:  Step | null;
}

const INITIAL_FORM: FormData = {
  title: '', notes: '', address: '', city: '', zipCode: '',
  latitude: null, longitude: null,
};

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const MIN_FUTURE_HOURS = 1;
const MIN_DURATION_H   = 6;
const MAX_DURATION_H   = 12;   // Must match backend SLOT_MAX_HOURS (legal R2: max 12h/slot)
const MAX_SLOTS        = 30;
const MAX_AGENTS       = 20;

/** Autosave debounce — we don't need keystroke-level persistence. */
const AUTOSAVE_DEBOUNCE_MS = 700;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

let _slotKey = 0;
const nextKey = () => `slot_${Date.now()}_${_slotKey++}`;

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
  return Math.max(MIN_DURATION_H, Math.round(h * 10) / 10);
}

function totalSlotHours(slots: SlotDraft[]): number {
  return slots.reduce((sum, s) => sum + durationHours(s.startAt, s.endAt), 0);
}

function slotAgents(slot: SlotDraft): number {
  return slot.lines.reduce((n, l) => n + l.agentCount, 0);
}

function allAgents(slots: SlotDraft[]): number {
  return slots.reduce((n, s) => n + slotAgents(s), 0);
}

function formatSlotDateShort(startIso: string, endIso: string): string {
  if (!startIso || !endIso) return '';
  const s = new Date(startIso), e = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
  return `${s.toLocaleString('fr-FR', opts)} → ${e.toLocaleString('fr-FR', opts)}`;
}

function formatDateShort(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/** Human-readable relative time for the draft restore banner. */
function formatRelativeFromNow(savedAt: number): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - savedAt) / 60_000));
  if (diffMin < 1)  return i18n.t('missions:create.relative_just_now');
  if (diffMin < 60) return i18n.t('missions:create.relative_min_ago', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return i18n.t('missions:create.relative_hours_ago', { count: diffH });
  const diffD = Math.floor(diffH / 24);
  return i18n.t('missions:create.relative_days_ago', { count: diffD });
}

/** API booking lines for one slot (drops excluded lines, fans uniform out per agent). */
function slotApiLines(slot: SlotDraft) {
  return slot.lines
    .filter(l => l.agentCount > 0)
    .map(l => ({
      serviceTypeId: l.serviceTypeId,
      agentCount:    l.agentCount,
      agentUniforms: Array(l.agentCount).fill(l.uniform ?? 'STANDARD'),
    }));
}

// ──────────────────────────────────────────────────────────────────────────────
// Schedule presets (applied to the first slot when there's a single slot)
// ──────────────────────────────────────────────────────────────────────────────

type PresetKey = 'tonight' | 'tomorrow' | 'weekend';

interface SchedulePreset {
  key:   PresetKey;
  i18n:  string;
  Icon:  React.FC<{ size: number; color: string; strokeWidth: number }>;
  build: () => { startAt: string; endAt: string };
}

function makeTonight() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(20);
  if (start.getTime() < Date.now() + MIN_FUTURE_HOURS * 3_600_000) {
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(start);
  end.setHours(start.getHours() + 6);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

function makeTomorrow() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(8, 0, 0, 0);
  const end = new Date(start);
  end.setHours(20, 0, 0, 0);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

function makeWeekend() {
  const start = new Date();
  const offset = (6 - start.getDay() + 7) % 7 || 7;
  start.setDate(start.getDate() + offset);
  start.setHours(20, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(2, 0, 0, 0);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

const SCHEDULE_PRESETS: SchedulePreset[] = [
  { key: 'tonight',  i18n: 'create.preset_tonight',  Icon: Moon,        build: makeTonight  },
  { key: 'tomorrow', i18n: 'create.preset_tomorrow', Icon: Sunrise,     build: makeTomorrow },
  { key: 'weekend',  i18n: 'create.preset_weekend',  Icon: PartyPopper, build: makeWeekend  },
];

function detectActivePreset(startAt: string, endAt: string): PresetKey | null {
  if (!startAt || !endAt) return null;
  for (const p of SCHEDULE_PRESETS) {
    const { startAt: ps, endAt: pe } = p.build();
    if (new Date(ps).getTime() === new Date(startAt).getTime() &&
        new Date(pe).getTime() === new Date(endAt).getTime()) {
      return p.key;
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────────────────────────────────────

export const MissionCreateScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t }   = useTranslation('missions');
  const toast   = useToast();
  const confirm = useConfirmDialog();
  const userId  = useAuthStore(s => s.user?.id ?? null);

  // Edit mode: when editMissionId is set, the screen edits an existing draft
  // (brouillon) instead of creating a new mission. Draft autosave/restore is
  // disabled so a half-finished *new* draft can't clobber the loaded mission.
  const editMissionId = (route.params as any)?.editMissionId as string | undefined;
  const isEditMode    = !!editMissionId;
  const [hydrating, setHydrating] = useState<boolean>(isEditMode);

  // Service catalog — fetched here now that ServicePicker is gone.
  const { data: services, loading: servicesLoading, execute: loadServices } =
    useApi(serviceTypesApi.findAll);
  const serviceTypes = (services as ServiceType[] | null) ?? [];

  useEffect(() => { loadServices(); }, [loadServices]);

  // Optional legacy seed: if something still navigates with bookingLines, fold
  // them into the first slot so nothing is lost.
  const seedLines = useMemo<SlotServiceLine[]>(() => {
    const seed = (route.params as any)?.bookingLines as Array<any> | undefined;
    if (!seed?.length) return [];
    return seed.map((l) => ({
      serviceTypeId: l.serviceTypeId,
      name:          l.name,
      accent:        l.accent ?? getServiceMeta(l.name ?? '').accent,
      ratePerHour:   typeof l.ratePerHour === 'number' ? l.ratePerHour : 0,
      agentCount:    Math.max(1, l.agentCount ?? 1),
      uniform:       (l.agentUniforms?.[0] as UniformValue) ?? DEFAULT_UNIFORM,
      allowedUniforms: [],
    }));
  }, [route.params]);

  // Hydration effect (edit mode): load the draft mission and map its slots +
  // bookings back into the screen's form/slots state. Bookings are grouped by
  // (slotId, serviceTypeId) -> agentCount, with the first booking's uniform used
  // for the line (the UI applies one uniform per line, fanned out per agent).
  useEffect(() => {
    if (!isEditMode || !editMissionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: res } = await missionsApi.getById(editMissionId);
        const mission = (res as any).data;
        if (cancelled || !mission) return;

        setForm({
          title:     mission.title ?? '',
          notes:     mission.notes ?? '',
          address:   mission.address ?? '',
          city:      mission.city ?? '',
          zipCode:   mission.zipCode ?? '',
          latitude:  typeof mission.latitude === 'number' ? mission.latitude : null,
          longitude: typeof mission.longitude === 'number' ? mission.longitude : null,
        });

        const apiSlots: any[] = (mission.slots ?? [])
          .slice()
          .sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        const bookings: any[] = mission.bookings ?? [];

        const hydratedSlots: SlotDraft[] = apiSlots.map((slot: any) => {
          // Group this slot's bookings by service type.
          const byService = new Map<string, { count: number; uniform: UniformValue; svc?: any }>();
          for (const b of bookings) {
            if (b.slotId !== slot.id) continue;
            const stId = b.serviceTypeId ?? b.serviceType?.id;
            if (!stId) continue;
            const cur = byService.get(stId);
            if (cur) {
              cur.count += 1;
            } else {
              byService.set(stId, {
                count: 1,
                uniform: (b.uniform as UniformValue) ?? DEFAULT_UNIFORM,
                svc: b.serviceType,
              });
            }
          }
          const lines: SlotServiceLine[] = Array.from(byService.entries()).map(([stId, v]) => {
            const svc = v.svc ?? serviceTypes.find(s => s.id === stId);
            const name = svc?.name ?? '';
            return {
              serviceTypeId:   stId,
              name,
              accent:          getServiceMeta(name).accent,
              ratePerHour:     typeof svc?.baseRatePerHour === 'number' ? svc.baseRatePerHour : 0,
              agentCount:      Math.max(1, v.count),
              uniform:         v.uniform ?? DEFAULT_UNIFORM,
              allowedUniforms: svc ? allowedUniformsForService(svc as any) : [],
            };
          });
          return {
            key:        nextKey(),
            startAt:    slot.startAt ? new Date(slot.startAt).toISOString() : '',
            endAt:      slot.endAt ? new Date(slot.endAt).toISOString() : '',
            lines,
            pickerOpen: lines.length === 0,
          };
        });

        if (!cancelled && hydratedSlots.length > 0) {
          setSlots(hydratedSlots);
        }
      } catch {
        if (!cancelled) {
          toast.error(t('detail.error_load'));
          navigation.goBack();
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  // serviceTypes intentionally included so names/rates resolve once the catalog loads.
  }, [isEditMode, editMissionId, serviceTypes]);

  const [step,    setStep]    = useState<Step>(1);
  const [form,    setForm]    = useState<FormData>(INITIAL_FORM);
  const [slots,   setSlots]   = useState<SlotDraft[]>(() => ([{
    key: nextKey(), startAt: '', endAt: '', lines: seedLines, pickerOpen: seedLines.length === 0,
  }]));
  const [errors,  setErrors]  = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [mapScrollLocked, setMapScrollLocked] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  const isMultiSlot = slots.length > 1;
  const agentsTotal = useMemo(() => allAgents(slots), [slots]);

  const setField = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(p => ({ ...p, [k]: v })), []);

  // Active preset only makes sense for a single slot.
  const activePreset = useMemo(
    () => slots.length === 1 ? detectActivePreset(slots[0].startAt, slots[0].endAt) : null,
    [slots],
  );

  // ── Draft restore — null = not checked yet ──────────────────────────────
  const [draftCandidate, setDraftCandidate] = useState<{
    payload: MissionDraftPayload; savedAt: number;
  } | null>(null);
  const autosaveReady = useRef(false);

  // ──────────────────────────────────────────────────────────────────────────
  // Draft autosave / restore
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (isEditMode) { autosaveReady.current = true; return; }
    if (!userId) { autosaveReady.current = true; return; }
    (async () => {
      const payload = await missionDraftStorage.load(userId);
      if (cancelled) return;
      if (payload && isDraftMeaningful(payload)) {
        const raw = await (async () => {
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const key = `@securbook:client:mission_draft:v2:${userId}`;
            const stored = await AsyncStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
          } catch { return null; }
        })();
        const savedAt: number = raw?.savedAt ?? Date.now();
        if (!cancelled) setDraftCandidate({ payload, savedAt });
      }
      autosaveReady.current = true;
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (isEditMode || !userId || !autosaveReady.current) return;
    const handle = setTimeout(() => {
      const payload: MissionDraftPayload = {
        step,
        form,
        slots: slots.map(s => ({
          startAt: s.startAt,
          endAt:   s.endAt,
          lines:   s.lines.map(l => ({
            serviceTypeId: l.serviceTypeId,
            name:          l.name,
            accent:        l.accent,
            ratePerHour:   l.ratePerHour,
            agentCount:    l.agentCount,
            uniform:       l.uniform,
          })),
        })),
      };
      if (isDraftMeaningful(payload)) missionDraftStorage.save(userId, payload);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [userId, step, form, slots]);

  const handleRestoreDraft = useCallback(() => {
    if (!draftCandidate) return;
    const { payload } = draftCandidate;
    setStep(payload.step);
    setForm(payload.form);
    setSlots(payload.slots.length > 0
      ? payload.slots.map(s => ({
          key:        nextKey(),
          startAt:    s.startAt,
          endAt:      s.endAt,
          lines:      s.lines.map(l => ({
            serviceTypeId: l.serviceTypeId,
            name:          l.name,
            accent:        l.accent,
            ratePerHour:   l.ratePerHour,
            agentCount:    l.agentCount,
            uniform:       l.uniform as UniformValue,
            allowedUniforms: [],
          })),
          pickerOpen: s.lines.length === 0,
        }))
      : [{ key: nextKey(), startAt: '', endAt: '', lines: [], pickerOpen: true }]);
    setDraftCandidate(null);
  }, [draftCandidate]);

  const handleDiscardDraft = useCallback(async () => {
    if (!draftCandidate || !userId) return;
    const ok = await confirm({
      title:        t('create.draft_discard_confirm_title'),
      message:      t('create.draft_discard_confirm_message'),
      confirmLabel: t('create.draft_discard_confirm_btn'),
      confirmStyle: 'destructive',
    });
    if (!ok) return;
    missionDraftStorage.clear(userId);
    setDraftCandidate(null);
  }, [draftCandidate, userId, confirm, t]);

  // ──────────────────────────────────────────────────────────────────────────
  // Address auto-fill
  // ──────────────────────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────────
  // Schedule presets (single slot only) — re-tap clears
  // ──────────────────────────────────────────────────────────────────────────
  const applyPreset = useCallback((preset: SchedulePreset) => {
    setSlots(prev => {
      if (prev.length !== 1) return prev;
      const cur = prev[0];
      const active = detectActivePreset(cur.startAt, cur.endAt);
      if (active === preset.key) {
        return [{ ...cur, startAt: '', endAt: '' }];
      }
      const { startAt, endAt } = preset.build();
      return [{ ...cur, startAt, endAt }];
    });
    setErrors(e => {
      const next = { ...e };
      Object.keys(next).forEach(k => { if (k.endsWith('_startAt') || k.endsWith('_endAt')) delete next[k]; });
      return next;
    });
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Slot mutations
  // ──────────────────────────────────────────────────────────────────────────
  const clearSlotErrors = useCallback((key: string) => {
    setErrors(prev => {
      const next = { ...prev };
      Object.keys(next).filter(k => k.startsWith(`slot_${key}_`)).forEach(k => delete next[k]);
      return next;
    });
  }, []);

  const updateSlotDates = useCallback((key: string, patch: { startAt?: string; endAt?: string }) => {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s));
    clearSlotErrors(key);
  }, [clearSlotErrors]);

  const addSlot = useCallback(() => {
    setSlots(prev => {
      if (prev.length >= MAX_SLOTS) return prev;
      // Seed the new slot's staffing from the last slot — saves re-entry while
      // staying fully editable (the core "flexible" win).
      const last = prev[prev.length - 1];
      const seeded = last.lines.map(l => ({ ...l }));
      return [...prev, { key: nextKey(), startAt: '', endAt: '', lines: seeded, pickerOpen: seeded.length === 0 }];
    });
  }, []);

  const removeSlot = useCallback((key: string) => {
    setSlots(prev => (prev.length <= 1 ? prev : prev.filter(s => s.key !== key)));
    clearSlotErrors(key);
  }, [clearSlotErrors]);

  const copyFromSlot = useCallback((targetKey: string, sourceIdx: number) => {
    setSlots(prev => {
      const source = prev[sourceIdx];
      if (!source) return prev;
      return prev.map(s => s.key !== targetKey ? s : {
        ...s,
        startAt: source.startAt,
        endAt:   source.endAt,
        lines:   source.lines.map(l => ({ ...l })),
      });
    });
    clearSlotErrors(targetKey);
  }, [clearSlotErrors]);

  const toggleSlotPicker = useCallback((key: string) => {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, pickerOpen: !s.pickerOpen } : s));
  }, []);

  const addLineToSlot = useCallback((key: string, svc: ServiceType) => {
    setSlots(prev => prev.map(s => {
      if (s.key !== key) return s;
      if (s.lines.some(l => l.serviceTypeId === svc.id)) return s;
      const { accent } = getServiceMeta(svc.name);
      const allowedUniforms = allowedUniformsForService(svc);
      return {
        ...s,
        lines: [...s.lines, {
          serviceTypeId: svc.id,
          name:          svc.name,
          accent,
          ratePerHour:   svc.baseRatePerHour,
          agentCount:    1,
          uniform:       defaultUniformForService(svc),
          allowedUniforms,
        }],
      };
    }));
    clearSlotErrors(key);
  }, [clearSlotErrors]);

  const removeLineFromSlot = useCallback((key: string, serviceTypeId: string) => {
    setSlots(prev => prev.map(s => s.key === key
      ? { ...s, lines: s.lines.filter(l => l.serviceTypeId !== serviceTypeId) }
      : s));
  }, []);

  const changeLineCount = useCallback((key: string, serviceTypeId: string, delta: number) => {
    setSlots(prev => prev.map(s => s.key === key
      ? {
          ...s,
          lines: s.lines.map(l => l.serviceTypeId === serviceTypeId
            ? { ...l, agentCount: Math.max(1, Math.min(MAX_AGENTS, l.agentCount + delta)) }
            : l),
        }
      : s));
    clearSlotErrors(key);
  }, [clearSlotErrors]);

  const setLineUniform = useCallback((key: string, serviceTypeId: string, uniform: UniformValue) => {
    setSlots(prev => prev.map(s => s.key === key
      ? { ...s, lines: s.lines.map(l => l.serviceTypeId === serviceTypeId ? { ...l, uniform } : l) }
      : s));
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Cross-slot error aggregation
  // ──────────────────────────────────────────────────────────────────────────
  const crossSlotErrorSlots = useMemo(() => {
    if (!isMultiSlot) return [];
    const offenders: Array<{ idx: number; key: string }> = [];
    slots.forEach((s, idx) => {
      if (errors[`slot_${s.key}_startAt`] || errors[`slot_${s.key}_endAt`] || errors[`slot_${s.key}_lines`]) {
        offenders.push({ idx, key: s.key });
      }
    });
    return offenders;
  }, [isMultiSlot, slots, errors]);

  // ──────────────────────────────────────────────────────────────────────────
  // Validation
  // ──────────────────────────────────────────────────────────────────────────
  const validate = (target: Step): boolean => {
    const e: Record<string, string | undefined> = {};

    if (target >= 1) {
      if (!form.address.trim()) e.address  = t('create.address_required');
      if (!form.city.trim())    e.city     = t('create.city_required');
      if (form.latitude == null) e.latitude = t('create.map_position_required');
    }

    if (target >= 2) {
      const minStart = new Date(Date.now() + MIN_FUTURE_HOURS * 3_600_000);
      const valid: Array<{ start: Date; end: Date; key: string }> = [];
      slots.forEach(s => {
        if (!s.startAt) { e[`slot_${s.key}_startAt`] = t('create.slot_start_required'); return; }
        if (!s.endAt)   { e[`slot_${s.key}_endAt`]   = t('create.slot_end_required');   return; }
        const start = new Date(s.startAt), end = new Date(s.endAt);
        if (end <= start) { e[`slot_${s.key}_endAt`] = t('create.slot_end_before_start'); return; }
        const d = durationHours(s.startAt, s.endAt);
        if (d < MIN_DURATION_H) { e[`slot_${s.key}_endAt`] = t('create.slot_duration_min'); return; }
        if (d > MAX_DURATION_H) { e[`slot_${s.key}_endAt`] = t('create.duration_max');      return; }
        if (slotAgents(s) === 0) { e[`slot_${s.key}_lines`] = t('create.slot_lines_required'); return; }
        valid.push({ start, end, key: s.key });
      });
      if (valid.length > 0) {
        const sorted = [...valid].sort((a, b) => a.start.getTime() - b.start.getTime());
        if (sorted[0].start < minStart) e[`slot_${sorted[0].key}_startAt`] = t('create.start_min_future');
        for (let i = 0; i < sorted.length - 1; i++) {
          if (sorted[i].end > sorted[i + 1].start)
            e[`slot_${sorted[i + 1].key}_startAt`] = t('create.slot_overlap');
        }
      }
    }

    setErrors(e);
    return Object.keys(e).filter(k => e[k]).length === 0;
  };

  const handleNext = () => {
    if (!validate(step)) return;
    if (step < TOTAL_STEPS) { setStep(s => (s + 1) as Step); return; }
    handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) { setStep(s => (s - 1) as Step); return; }
    navigation.goBack();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────────────
  const submittingRef = useRef(false);
  const handleSubmit = async () => {
    if (submittingRef.current) return; // guard double-tap
    submittingRef.current = true;
    setLoading(true);
    setSubmitError(null);
    let createdMissionId: string | null = null;
    try {
      const base = {
        address:   form.address.trim(),
        city:      form.city.trim(),
        zipCode:   form.zipCode.trim() || undefined,
        latitude:  form.latitude!,  // validated non-null in step 1
        longitude: form.longitude!, // validated non-null in step 1
        title:     form.title.trim() || undefined,
        notes:     form.notes.trim() || undefined,
      };

      const sortedSlots = [...slots].sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      );

      // ALWAYS send the slots[] format - the backend DTO only accepts slots[],
      // not flat startAt/endAt/bookingLines. Single-slot = slots with 1 entry.
      const missionPayload: Parameters<typeof missionsApi.create>[0] = {
        ...base,
        isUrgent: isToday(sortedSlots[0]?.startAt ?? ''),
        slots: sortedSlots.map(s => ({
          startAt:       new Date(s.startAt).toISOString(),
          endAt:         new Date(s.endAt).toISOString(),
          durationHours: durationHours(s.startAt, s.endAt),
          bookingLines:  slotApiLines(s),
        })),
      };

      // Both create and edit use the same unified slots[] payload.
      let mission;
      if (isEditMode && editMissionId) {
        const { data: mRes } = await missionsApi.update(editMissionId, missionPayload as any);
        mission = (mRes as any).data;
      } else {
        const { data: mRes } = await missionsApi.create(missionPayload);
        mission = (mRes as any).data;
        createdMissionId = mission.id;
      }

      // Backend derives quote lines from existing Booking rows (created in the
      // mission transaction above). Only missionId is needed.
      await quotesApi.calculate({ missionId: mission.id });

      if (!isEditMode && userId) missionDraftStorage.clear(userId);
      if (isEditMode) {
        toast.success(t('edit.saved_toast'));
        navigation.navigate('QuoteDetail', { missionId: mission.id });
      } else {
        navigation.replace('QuoteDetail', { missionId: mission.id });
      }
    } catch (err: unknown) {
      const status       = (err as any)?.response?.status;
      const apiMsg       = (err as any)?.response?.data?.message;
      const localMsg     = (err as any)?.message;
      const isNetworkErr = !status && typeof localMsg === 'string' && localMsg.includes('Network');

      // NOTE: Do NOT auto-cancel a created mission when the downstream quote
      // calculation fails. The mission is valid; destroying it on a transient
      // error loses user work. The recovery toast below handles this.

      const details = Array.isArray(apiMsg)
        ? apiMsg.map(String)
        : apiMsg ? [String(apiMsg)]
        : isNetworkErr ? [t('create.submit_error_network')]
        : [localMsg ?? t('create.error_create')];

      const joined = details.join(' ').toLowerCase();
      const jumpTo: Step | null =
        /(address|city|zipcode|latitude|longitude|adresse|ville)/.test(joined) ? 1
        : /(start|end|duration|slot|durée|creneau|créneau|heure|agent|service|tenue)/.test(joined) ? 2
        : null;

      setSubmitError({ title: t('create.submit_error_title'), details, jumpTo });

      if (createdMissionId) {
        toast.info(t('detail.cta_get_quote'), {
          action: {
            label:   t('detail.cta_get_quote'),
            onPress: () => navigation.replace('MissionDetail', { missionId: createdMissionId! }),
          },
          duration: 8000,
        });
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const dismissSubmitError = useCallback(() => setSubmitError(null), []);
  const jumpToSubmitErrorStep = useCallback(() => {
    if (!submitError?.jumpTo) return;
    setStep(submitError.jumpTo);
    setSubmitError(null);
  }, [submitError]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  const headerTitles: Record<Step, string> = {
    1: t('create.step_where_2'),
    2: t('create.step_staff_2'),
  };

  const nextLabel = step === 1
    ? t('create.next_to_staff')
    : isEditMode ? t('edit.save_btn') : t('create.create_btn');

  // While loading an existing draft in edit mode, show a centered spinner so we
  // never flash empty create-mode fields before hydration completes.
  if (hydrating) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title={t('edit.screen_title')} onBack={() => navigation.goBack()} />
        <View style={styles.hydratingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.hydratingText}>{t('edit.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={isEditMode ? t('edit.screen_title') : headerTitles[step]} onBack={handleBack} />

      <StepProgress current={step} t={t} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        scrollEnabled={!mapScrollLocked}
        nestedScrollEnabled
      >
        {draftCandidate && (
          <DraftRestoreBanner
            savedAt={draftCandidate.savedAt}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
            t={t}
          />
        )}

        {submitError && (
          <SubmitErrorBanner
            error={submitError}
            onDismiss={dismissSubmitError}
            onJump={submitError.jumpTo != null ? jumpToSubmitErrorStep : undefined}
            t={t}
          />
        )}

        {step === 2 && crossSlotErrorSlots.length > 0 && (
          <CrossSlotErrorBanner offenders={crossSlotErrorSlots} t={t} />
        )}

        {step === 1 && (
          <StepWhere
            form={form}
            errors={errors}
            onAddressSelect={handleAddressSelect}
            onMapSelect={handleMapSelect}
            onMapInteraction={setMapScrollLocked}
            onSetField={setField}
            t={t}
          />
        )}

        {step === 2 && (
          <StepWhenWho
            form={form}
            slots={slots}
            errors={errors}
            activePreset={activePreset}
            serviceTypes={serviceTypes}
            servicesLoading={servicesLoading}
            agentsTotal={agentsTotal}
            onApplyPreset={applyPreset}
            onSetField={setField}
            onAddSlot={addSlot}
            onRemoveSlot={removeSlot}
            onUpdateSlotDates={updateSlotDates}
            onCopyFromSlot={copyFromSlot}
            onTogglePicker={toggleSlotPicker}
            onAddLine={addLineToSlot}
            onRemoveLine={removeLineFromSlot}
            onChangeLineCount={changeLineCount}
            onSetLineUniform={setLineUniform}
            t={t}
          />
        )}
      </ScrollView>

      {/* ── Smart footer: Back + Continue/Create ────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.footerMeta}>
          <Text style={styles.footerMetaText}>
            {step < TOTAL_STEPS
              ? t('create.footer_step_progress', { current: step, total: TOTAL_STEPS })
              : t('create.footer_ready')}
          </Text>
          {step >= 2 && totalSlotHours(slots) > 0 && (
            <Text style={styles.footerMetaText}>
              {' · '}{t('create.slots_total_short', { count: slots.length, hours: totalSlotHours(slots).toFixed(1) })}
            </Text>
          )}
        </View>
        <View style={styles.footerBtnRow}>
          <Button
            label={t('create.footer_back')}
            onPress={handleBack}
            variant="ghost"
            size="lg"
            leftIcon={<ChevronLeft size={16} color={colors.textSecondary} strokeWidth={2.2} />}
            style={styles.footerBackBtn}
          />
          <Button
            label={nextLabel}
            onPress={handleNext}
            loading={loading}
            size="lg"
            style={styles.footerNextBtn}
            rightIcon={
              step < TOTAL_STEPS
                ? <ChevronRight size={16} color={colors.textInverse} strokeWidth={2.4} />
                : <Check size={16} color={colors.textInverse} strokeWidth={2.4} />
            }
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// DraftRestoreBanner
// ──────────────────────────────────────────────────────────────────────────────

const DraftRestoreBanner: React.FC<{
  savedAt:   number;
  onRestore: () => void;
  onDiscard: () => void;
  t:         MissionsT;
}> = ({ savedAt, onRestore, onDiscard, t }) => (
  <View style={draftBannerS.wrap}>
    <View style={draftBannerS.iconBox}>
      <FileText size={16} color={colors.primary} strokeWidth={2} />
    </View>
    <View style={draftBannerS.body}>
      <Text style={draftBannerS.title}>{t('create.draft_restore_title')}</Text>
      <Text style={draftBannerS.subtitle} numberOfLines={2}>
        {t('create.draft_restore_subtitle', { when: formatRelativeFromNow(savedAt) })}
      </Text>
      <View style={draftBannerS.actions}>
        <TouchableOpacity style={draftBannerS.restoreBtn} onPress={onRestore} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('create.draft_restore_btn')}>
          <RotateCcw size={12} color={colors.textInverse} strokeWidth={2.4} />
          <Text style={draftBannerS.restoreText}>{t('create.draft_restore_btn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={draftBannerS.discardBtn} onPress={onDiscard} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('create.draft_discard_btn')}>
          <Text style={draftBannerS.discardText}>{t('create.draft_discard_btn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const draftBannerS = StyleSheet.create({
  wrap: {
    flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start',
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    borderRadius: radius.xl, padding: spacing[3] + 2, marginBottom: spacing[4],
  },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  body:     { flex: 1, gap: spacing[1] + 2 },
  title:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.5 },
  actions:  { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[1] },
  restoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing[3] + 2, paddingVertical: spacing[2],
  },
  restoreText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.textInverse },
  discardBtn:  { paddingVertical: spacing[2], paddingHorizontal: spacing[1] },
  discardText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textMuted, textDecorationLine: 'underline' },
});

// ──────────────────────────────────────────────────────────────────────────────
// SubmitErrorBanner
// ──────────────────────────────────────────────────────────────────────────────

const SubmitErrorBanner: React.FC<{
  error:     SubmitError;
  onDismiss: () => void;
  onJump?:   () => void;
  t:         MissionsT;
}> = ({ error, onDismiss, onJump, t }) => (
  <View style={submitErrS.wrap}>
    <View style={submitErrS.headerRow}>
      <AlertTriangle size={16} color={colors.danger} strokeWidth={2.2} />
      <Text style={submitErrS.title}>{error.title}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={i18n.t('common:close')}>
        <X size={16} color={colors.textMuted} strokeWidth={2} />
      </TouchableOpacity>
    </View>
    {error.details.slice(0, 4).map((d, i) => (
      <Text key={i} style={submitErrS.detail}>• {d}</Text>
    ))}
    {onJump && (
      <TouchableOpacity style={submitErrS.jumpBtn} onPress={onJump} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('create.submit_error_jump_to')}>
        <Pencil size={12} color={colors.danger} strokeWidth={2.2} />
        <Text style={submitErrS.jumpText}>{t('create.submit_error_jump_to')}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const submitErrS = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(225,29,72,0.10)', borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.xl, padding: spacing[3] + 2, marginBottom: spacing[4], gap: spacing[1] + 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title:     { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.danger },
  detail:    { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.5 },
  jumpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    marginTop: spacing[1], paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.danger,
  },
  jumpText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.danger },
});

// ──────────────────────────────────────────────────────────────────────────────
// CrossSlotErrorBanner
// ──────────────────────────────────────────────────────────────────────────────

const CrossSlotErrorBanner: React.FC<{
  offenders: Array<{ idx: number; key: string }>;
  t:         MissionsT;
}> = ({ offenders, t }) => (
  <View style={crossSlotErrS.wrap}>
    <View style={crossSlotErrS.headerRow}>
      <AlertTriangle size={15} color={colors.danger} strokeWidth={2.2} />
      <Text style={crossSlotErrS.title}>{t('create.cross_slot_error_title')}</Text>
    </View>
    <Text style={crossSlotErrS.subtitle}>{t('create.cross_slot_error_subtitle')}</Text>
    <View style={crossSlotErrS.chipsRow}>
      {offenders.map(o => (
        <View key={o.key} style={crossSlotErrS.chip}>
          <Text style={crossSlotErrS.chipText}>{t('create.cross_slot_error_jump', { n: o.idx + 1 })}</Text>
        </View>
      ))}
    </View>
  </View>
);

const crossSlotErrS = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(225,29,72,0.08)', borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.lg, padding: spacing[3], marginBottom: spacing[3], gap: spacing[1] + 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title:     { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.danger },
  subtitle:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.5 },
  chipsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: 2 },
  chip: {
    paddingHorizontal: spacing[2] + 2, paddingVertical: 3, borderRadius: radius.full,
    backgroundColor: 'rgba(225,29,72,0.14)', borderWidth: 1, borderColor: colors.danger,
  },
  chipText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.danger },
});

// ──────────────────────────────────────────────────────────────────────────────
// StepProgress (2 steps)
// ──────────────────────────────────────────────────────────────────────────────

const StepProgress: React.FC<{ current: Step; t: MissionsT }> = ({ current, t }) => {
  const labels: Record<Step, string> = {
    1: t('create.progress_where'),
    2: t('create.progress_staff'),
  };
  return (
    <View
      style={progressS.wrap}
      accessibilityRole="header"
      accessibilityLabel={`${t('create.footer_step_progress', { current, total: TOTAL_STEPS })} : ${labels[current]}`}
    >
      {([1, 2] as Step[]).map((s) => {
        const active = current === s;
        const done   = current > s;
        return (
          <View key={s} style={progressS.item} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <View style={[progressS.dot, active && progressS.dotActive, done && progressS.dotDone]}>
              {done
                ? <Check size={10} color={colors.textInverse} strokeWidth={3} />
                : <Text style={[progressS.dotText, active && progressS.dotTextActive]}>{s}</Text>}
            </View>
            <Text style={[progressS.label, (active || done) && progressS.labelActive]}>{labels[s]}</Text>
            {s < TOTAL_STEPS && <View style={[progressS.line, done && progressS.lineDone]} />}
          </View>
        );
      })}
    </View>
  );
};

const progressS = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH, paddingVertical: spacing[3], gap: spacing[1],
    backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  item: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing[1] + 2 },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  dotDone:       { backgroundColor: colors.primary, borderColor: colors.primary },
  dotText:       { fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.textMuted },
  dotTextActive: { color: colors.textInverse },
  label:         { fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.textMuted, flexShrink: 1 },
  labelActive:   { color: colors.textPrimary },
  line:          { height: 1, flex: 1, backgroundColor: colors.border, marginLeft: spacing[1] },
  lineDone:      { backgroundColor: colors.primary },
});

// ──────────────────────────────────────────────────────────────────────────────
// StepHero / DurationBadge
// ──────────────────────────────────────────────────────────────────────────────

const StepHero: React.FC<{
  Icon:     React.FC<{ size: number; color: string; strokeWidth: number }>;
  title:    string;
  subtitle: string;
}> = ({ Icon, title, subtitle }) => (
  <View style={heroS.wrap}>
    <View style={heroS.iconBox}>
      <Icon size={20} color={colors.primary} strokeWidth={1.8} />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={heroS.title}>{title}</Text>
      <Text style={heroS.subtitle}>{subtitle}</Text>
    </View>
  </View>
);

const heroS = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[2] },
  iconBox: {
    width: 40, height: 40, borderRadius: radius.lg,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title:    { fontFamily: fontFamily.display, fontSize: fontSize.lg, color: colors.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.5 },
});

const DurationBadge: React.FC<{
  t: MissionsT; hours: number; urgent: boolean; label?: string;
}> = ({ t, hours, urgent, label }) => (
  <View style={styles.durationBadge}>
    <Clock size={14} color={colors.primary} strokeWidth={2} />
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={styles.durationText}>
        {label ?? t('create.duration_hours', { hours: hours.toFixed(1) })}
      </Text>
      {urgent && (
        <View style={styles.urgentRow}>
          <Zap size={11} color={colors.primaryLight} strokeWidth={2} />
          <Text style={styles.urgentText}>{t('create.urgency_note')}</Text>
        </View>
      )}
    </View>
  </View>
);

// ──────────────────────────────────────────────────────────────────────────────
// StepWhere
// ──────────────────────────────────────────────────────────────────────────────

interface StepWhereProps {
  form:             FormData;
  errors:           Record<string, string | undefined>;
  onAddressSelect:  (r: NominatimResult) => void;
  onMapSelect:      (c: { latitude: number; longitude: number }, addr?: string) => void;
  onMapInteraction: (locked: boolean) => void;
  onSetField:       <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  t:                MissionsT;
}

const StepWhere: React.FC<StepWhereProps> = ({
  form, errors, onAddressSelect, onMapSelect, onMapInteraction, onSetField, t,
}) => (
  <View style={styles.stepContent}>
    <StepHero Icon={MapPin} title={t('create.where_title')} subtitle={t('create.where_subtitle')} />
    <AddressSearch
      value={form.address}
      error={errors.address}
      onSelect={onAddressSelect}
      placeholder={t('create.address_placeholder')}
      countrycodes="fr"
    />
    <View style={styles.row}>
      <View style={styles.half}>
        <Input
          label={t('create.city_label')}
          value={form.city}
          onChangeText={v => onSetField('city', v)}
          placeholder={t('create.city_placeholder')}
          error={errors.city}
          leftIcon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />}
        />
      </View>
      <View style={styles.half}>
        <Input
          label={t('create.zip_label')}
          value={form.zipCode}
          onChangeText={v => onSetField('zipCode', v)}
          keyboardType="number-pad"
          placeholder={t('create.zip_placeholder')}
          leftIcon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />}
        />
      </View>
    </View>
    <MapLocationPicker
      latitude={form.latitude ?? undefined}
      longitude={form.longitude ?? undefined}
      onSelect={onMapSelect}
      onInteractionChange={onMapInteraction}
    />
    {errors.latitude && (
      <View style={styles.errorBanner}><Text style={styles.errorBannerText}>{errors.latitude}</Text></View>
    )}
  </View>
);

// ──────────────────────────────────────────────────────────────────────────────
// StepWhenWho — merged scheduling + staffing (the last step)
// ──────────────────────────────────────────────────────────────────────────────

interface StepWhenWhoProps {
  form:              FormData;
  slots:             SlotDraft[];
  errors:            Record<string, string | undefined>;
  activePreset:      PresetKey | null;
  serviceTypes:      ServiceType[];
  servicesLoading:   boolean;
  agentsTotal:       number;
  onApplyPreset:     (p: SchedulePreset) => void;
  onSetField:        <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onAddSlot:         () => void;
  onRemoveSlot:      (key: string) => void;
  onUpdateSlotDates: (key: string, patch: { startAt?: string; endAt?: string }) => void;
  onCopyFromSlot:    (targetKey: string, sourceIdx: number) => void;
  onTogglePicker:    (key: string) => void;
  onAddLine:         (key: string, svc: ServiceType) => void;
  onRemoveLine:      (key: string, serviceTypeId: string) => void;
  onChangeLineCount: (key: string, serviceTypeId: string, delta: number) => void;
  onSetLineUniform:  (key: string, serviceTypeId: string, uniform: UniformValue) => void;
  t:                 MissionsT;
}

const StepWhenWho: React.FC<StepWhenWhoProps> = ({
  form, slots, errors, activePreset, serviceTypes, servicesLoading, agentsTotal,
  onApplyPreset, onSetField, onAddSlot, onRemoveSlot, onUpdateSlotDates,
  onCopyFromSlot, onTogglePicker, onAddLine, onRemoveLine, onChangeLineCount, onSetLineUniform, t,
}) => {
  const minDate    = new Date(Date.now() + MIN_FUTURE_HOURS * 3_600_000);
  const totalH     = totalSlotHours(slots);
  const singleSlot = slots.length === 1;

  const indicativePrice = useMemo(() =>
    slots.reduce((sum, s) => {
      const h = durationHours(s.startAt, s.endAt);
      return sum + s.lines.reduce((ls, l) => ls + l.agentCount * h * (l.ratePerHour ?? 0), 0);
    }, 0),
  [slots]);

  const estimatedAgentHours = useMemo(() =>
    slots.reduce((sum, s) => sum + slotAgents(s) * durationHours(s.startAt, s.endAt), 0),
  [slots]);

  const showPrice = indicativePrice > 0 && slots.some(s => s.lines.some(l => (l.ratePerHour ?? 0) > 0));

  return (
    <View style={styles.stepContent}>
      <StepHero Icon={CalendarClock} title={t('create.when_staff_title')} subtitle={t('create.when_staff_subtitle')} />

      {singleSlot && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Sparkles size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.sectionTitle} accessibilityRole="header">{t('create.preset_section')}</Text>
          </View>
          <View style={styles.presetGrid}>
            {SCHEDULE_PRESETS.map(p => {
              const { Icon } = p;
              const isActive = activePreset === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.presetCard, isActive && styles.presetCardActive]}
                  onPress={() => onApplyPreset(p)}
                  activeOpacity={0.78}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={t(p.i18n as any)}
                >
                  {isActive && (
                    <View style={styles.presetActiveDot}>
                      <Check size={9} color={colors.textInverse} strokeWidth={3} />
                    </View>
                  )}
                  <Icon size={16} color={isActive ? colors.textInverse : colors.primary} strokeWidth={2} />
                  <Text style={[styles.presetLabel, isActive && styles.presetLabelActive]}>
                    {t(p.i18n as any)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Calendar size={14} color={colors.textMuted} strokeWidth={2} />
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {singleSlot ? t('create.custom_section') : t('create.slots_count', { n: slots.length })}
        </Text>
      </View>

      {slots.map((slot, idx) => (
        <SlotCard
          key={slot.key}
          slot={slot}
          idx={idx}
          prevSlot={idx > 0 ? slots[idx - 1] : null}
          allSlots={slots}
          minDate={minDate}
          errors={errors}
          serviceTypes={serviceTypes}
          servicesLoading={servicesLoading}
          canRemove={slots.length > 1}
          onUpdateDates={(patch) => onUpdateSlotDates(slot.key, patch)}
          onRemove={() => onRemoveSlot(slot.key)}
          onCopyFrom={(sourceIdx) => onCopyFromSlot(slot.key, sourceIdx)}
          onTogglePicker={() => onTogglePicker(slot.key)}
          onAddLine={(svc) => onAddLine(slot.key, svc)}
          onRemoveLine={(svcId) => onRemoveLine(slot.key, svcId)}
          onChangeLineCount={(svcId, d) => onChangeLineCount(slot.key, svcId, d)}
          onSetLineUniform={(svcId, u) => onSetLineUniform(slot.key, svcId, u)}
          t={t}
        />
      ))}

      {slots.length < MAX_SLOTS && (
        <TouchableOpacity style={styles.addSlotBtn} onPress={onAddSlot} activeOpacity={0.78} accessibilityRole="button" accessibilityLabel={t('create.add_another_creneau')}>
          <Plus size={14} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.addSlotText}>{t('create.add_another_creneau')}</Text>
        </TouchableOpacity>
      )}
      {singleSlot && <Text style={styles.addSlotHint}>{t('create.add_another_slot_hint')}</Text>}

      {totalH >= MIN_DURATION_H && (
        <DurationBadge
          t={t}
          hours={totalH}
          urgent={slots.some(s => isToday(s.startAt))}
          label={singleSlot
            ? t('create.duration_hours', { hours: totalH.toFixed(1) })
            : t('create.slots_total_duration', { hours: totalH.toFixed(1), count: slots.length })}
        />
      )}

      {showPrice && (
        <View style={priceS.wrap}>
          <View style={priceS.headerRow}>
            <View style={priceS.iconBox}>
              <Receipt size={16} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={priceS.label}>{t('create.review_estimate_label')}</Text>
              <Text style={priceS.amount}>
                {t('create.review_estimate_amount', { amount: formatEuros(indicativePrice) })}
              </Text>
            </View>
          </View>
          {estimatedAgentHours > 0 && (
            <View style={priceS.agentHoursRow}>
              <Clock size={12} color={colors.primary} strokeWidth={2} />
              <Text style={priceS.agentHoursText}>
                {t('create.review_agent_hours', { hours: estimatedAgentHours.toFixed(1) })}
                {'  ·  '}
                {t('create.total_agents', { count: agentsTotal, lines: slots.length })}
              </Text>
            </View>
          )}
          <Text style={priceS.note}>{t('create.review_estimate_note')}</Text>
        </View>
      )}

      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <FileText size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.sectionTitle} accessibilityRole="header">{t('create.optional_section')}</Text>
        </View>
        <Input
          label={t('create.title_label')}
          value={form.title}
          onChangeText={v => onSetField('title', v)}
          placeholder={t('create.title_placeholder')}
          leftIcon={<Pencil size={16} color={colors.textMuted} strokeWidth={1.8} />}
          maxLength={100}
        />
        <Input
          label={t('create.notes_label')}
          value={form.notes}
          onChangeText={v => onSetField('notes', v)}
          placeholder={t('create.instructions_placeholder')}
          multiline
          numberOfLines={3}
          style={styles.textArea}
          leftIcon={<FileText size={16} color={colors.textMuted} strokeWidth={1.8} />}
        />
      </View>
    </View>
  );
};

const priceS = StyleSheet.create({
  wrap: {
    gap: spacing[2], backgroundColor: colors.backgroundElevated,
    borderWidth: 1, borderColor: colors.borderPrimary, borderRadius: radius.xl,
    paddingHorizontal: spacing[3] + 2, paddingVertical: spacing[3] + 2, marginTop: spacing[2],
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  label:  { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  amount: { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.primary, letterSpacing: -0.4, marginTop: 2 },
  agentHoursRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border,
  },
  agentHoursText: { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 0.2 },
  note: { fontFamily: fontFamily.body, fontSize: 11, color: colors.textSecondary, lineHeight: 16, fontStyle: 'italic' },
});

// ──────────────────────────────────────────────────────────────────────────────
// SlotCard — one créneau: schedule + its own staffing
// ──────────────────────────────────────────────────────────────────────────────

interface SlotCardProps {
  slot:              SlotDraft;
  idx:               number;
  prevSlot:          SlotDraft | null;
  allSlots:          SlotDraft[];
  minDate:           Date;
  errors:            Record<string, string | undefined>;
  serviceTypes:      ServiceType[];
  servicesLoading:   boolean;
  canRemove:         boolean;
  onUpdateDates:     (patch: { startAt?: string; endAt?: string }) => void;
  onRemove:          () => void;
  onCopyFrom:        (sourceIdx: number) => void;
  onTogglePicker:    () => void;
  onAddLine:         (svc: ServiceType) => void;
  onRemoveLine:      (serviceTypeId: string) => void;
  onChangeLineCount: (serviceTypeId: string, delta: number) => void;
  onSetLineUniform:  (serviceTypeId: string, uniform: UniformValue) => void;
  t:                 MissionsT;
}

const SlotCard: React.FC<SlotCardProps> = ({
  slot, idx, prevSlot, allSlots, minDate, errors, serviceTypes, servicesLoading, canRemove,
  onUpdateDates, onRemove, onCopyFrom, onTogglePicker,
  onAddLine, onRemoveLine, onChangeLineCount, onSetLineUniform, t,
}) => {
  const slotDurH = durationHours(slot.startAt, slot.endAt);
  const startErr = errors[`slot_${slot.key}_startAt`];
  const endErr   = errors[`slot_${slot.key}_endAt`];
  const linesErr = errors[`slot_${slot.key}_lines`];
  const prevEnd  = prevSlot && prevSlot.endAt ? new Date(prevSlot.endAt) : null;
  const slotMin  = prevEnd && prevEnd > minDate ? prevEnd : minDate;
  const slotMinEnd = slot.startAt
    ? new Date(new Date(slot.startAt).getTime() + MIN_DURATION_H * 3_600_000)
    : slotMin;

  const agents = slotAgents(slot);
  const hasValidDates = slot.startAt && slot.endAt && !startErr && !endErr && slotDurH > 0;

  const copySources = useMemo(
    () => allSlots.map((s, i) => ({ s, i })).filter(({ s, i }) => i !== idx && s.startAt && s.endAt),
    [allSlots, idx],
  );

  const available = useMemo(
    () => serviceTypes.filter(st => !slot.lines.some(l => l.serviceTypeId === st.id)),
    [serviceTypes, slot.lines],
  );

  return (
    <View style={[styles.slotCard, agents > 0 && styles.slotCardStaffed]}>
      {/* Header */}
      <View style={styles.slotCardHeader}>
        <View style={styles.slotIdxBadge}><Text style={styles.slotIdxText}>{idx + 1}</Text></View>
        <View style={styles.slotCardTitleBlock}>
          <Text style={styles.slotCardTitle}>{t('create.creneau_label', { n: idx + 1 })}</Text>
          {hasValidDates ? (
            <Text style={styles.slotCardDateSummary} numberOfLines={1}>
              {formatSlotDateShort(slot.startAt, slot.endAt)}
            </Text>
          ) : (
            <Text style={styles.slotCardDatePending}>{t('create.slot_date_pending')}</Text>
          )}
        </View>
        {slotDurH >= MIN_DURATION_H && !endErr && !startErr && (
          <View style={styles.slotDurPill}>
            <Clock size={9} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.slotDurPillText}>{slotDurH.toFixed(1)} h</Text>
          </View>
        )}
        {canRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.slotRemoveBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('create.slot_remove')}>
            <X size={14} color={colors.danger} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {copySources.length > 0 && (!slot.startAt || !slot.endAt) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.copyChipsRow}>
          {copySources.map(({ s, i }) => (
            <TouchableOpacity key={s.key} style={styles.copyChip} onPress={() => onCopyFrom(i)} activeOpacity={0.78} accessibilityRole="button" accessibilityLabel={t('create.slot_copy_from', { n: i + 1 })}>
              <Copy size={10} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.copyChipText}>{t('create.slot_copy_from', { n: i + 1 })}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <DateTimePicker
        label={t('create.start_label')}
        value={slot.startAt}
        onChange={v => onUpdateDates({ startAt: v, endAt: '' })}
        minDate={slotMin}
        error={startErr}
      />
      <DateTimePicker
        label={t('create.end_label')}
        value={slot.endAt}
        onChange={v => onUpdateDates({ endAt: v })}
        minDate={slotMinEnd}
        error={endErr}
      />

      <View style={styles.slotServicesDivider} />

      {/* Staffing — this slot's own services / agents / uniforms */}
      <View style={styles.staffHeader}>
        <View style={styles.sectionHeader}>
          <Users size={13} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.sectionTitle} accessibilityRole="header">{t('create.staff_section')}</Text>
        </View>
        {agents > 0 && (
          <View style={styles.staffCountPill}>
            <Text style={styles.staffCountText}>{t('create.slot_total_agents', { count: agents })}</Text>
          </View>
        )}
      </View>

      {slot.lines.length === 0 && !slot.pickerOpen && (
        <View style={styles.staffEmpty}>
          <Text style={styles.staffEmptyTitle}>{t('create.staff_empty')}</Text>
          <Text style={styles.staffEmptyHint}>{t('create.staff_empty_hint')}</Text>
        </View>
      )}

      {slot.lines.map(line => (
        <View key={line.serviceTypeId} style={[styles.lineRow, { borderColor: line.accent + '55' }]}>
          <View style={styles.lineRowHeader}>
            <View style={[styles.lineDot, { backgroundColor: line.accent }]} />
            <Text style={styles.lineName} numberOfLines={1}>{line.name}</Text>
            <View style={styles.lineStepper}>
              <TouchableOpacity
                style={[styles.lineStepBtn, line.agentCount <= 1 && styles.lineStepBtnDisabled]}
                onPress={() => onChangeLineCount(line.serviceTypeId, -1)}
                disabled={line.agentCount <= 1}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Retirer un agent"
                accessibilityState={{ disabled: line.agentCount <= 1 }}
              >
                <Minus size={11} color={line.agentCount <= 1 ? colors.textMuted : line.accent} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={[styles.lineStepCount, { color: line.accent }]}>{line.agentCount}</Text>
              <TouchableOpacity
                style={[styles.lineStepBtn, line.agentCount >= MAX_AGENTS && styles.lineStepBtnDisabled]}
                onPress={() => onChangeLineCount(line.serviceTypeId, +1)}
                disabled={line.agentCount >= MAX_AGENTS}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={i18n.t('common:add_agent')}
                accessibilityState={{ disabled: line.agentCount >= MAX_AGENTS }}
              >
                <Plus size={11} color={line.agentCount >= MAX_AGENTS ? colors.textMuted : line.accent} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => onRemoveLine(line.serviceTypeId)} style={styles.lineRemoveBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} accessibilityRole="button" accessibilityLabel="Retirer ce service">
              <X size={13} color={colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <Text style={styles.lineUniformLabel}>{t('create.slot_uniform_label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineChipsRow}>
            {UNIFORM_OPTIONS.filter(opt => !line.allowedUniforms || line.allowedUniforms.length === 0 || line.allowedUniforms.includes(opt.value as UniformValue)).map(opt => {
              const active = line.uniform === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.lineUniformChip, active && { backgroundColor: line.accent + '20', borderColor: line.accent }]}
                  onPress={() => onSetLineUniform(line.serviceTypeId, opt.value as UniformValue)}
                  hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(`uniforms.${opt.value}.label`, { ns: 'services' })}
                >
                  <Text style={styles.lineUniformEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.lineUniformText, active && { color: line.accent, fontFamily: fontFamily.bodySemiBold }]}>
                    {t(`uniforms.${opt.value}.label`, { ns: 'services' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ))}

      {/* Add-a-service toggle + catalog picker */}
      <TouchableOpacity
        style={[styles.addServiceBtn, slot.pickerOpen && styles.addServiceBtnActive]}
        onPress={onTogglePicker}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityState={{ expanded: slot.pickerOpen }}
        accessibilityLabel={t('create.staff_add_service')}
      >
        <UserPlus size={13} color={colors.primary} strokeWidth={2.2} />
        <Text style={styles.addServiceText}>{t('create.staff_add_service')}</Text>
        <ChevronRight
          size={14}
          color={colors.primary}
          strokeWidth={2.2}
          style={{ transform: [{ rotate: slot.pickerOpen ? '90deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {slot.pickerOpen && (
        <View style={styles.pickerWrap}>
          {servicesLoading ? (
            <View style={styles.pickerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.pickerLoadingText}>{t('create.staff_loading')}</Text>
            </View>
          ) : available.length === 0 ? (
            <Text style={styles.pickerEmpty}>
              {serviceTypes.length === 0 ? t('create.staff_services_empty') : t('create.staff_all_added')}
            </Text>
          ) : (
            available.map(svc => {
              const { Icon, accent } = getServiceMeta(svc.name);
              return (
                <TouchableOpacity
                  key={svc.id}
                  style={styles.pickerRow}
                  onPress={() => onAddLine(svc)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={svc.name}
                >
                  <View style={[styles.pickerIconWrap, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
                    <Icon size={16} color={accent} strokeWidth={1.8} />
                  </View>
                  <View style={styles.pickerInfo}>
                    <Text style={styles.pickerName} numberOfLines={1}>{svc.name}</Text>
                    <Text style={[styles.pickerRate, { color: accent }]}>
                      {t('create.staff_rate_per_hour', { rate: formatEuros(svc.baseRatePerHour) })}
                    </Text>
                  </View>
                  <View style={[styles.pickerAddPill, { backgroundColor: accent + '15', borderColor: accent + '45' }]}>
                    <Plus size={12} color={accent} strokeWidth={2.6} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {linesErr && (
        <View style={styles.errorBanner}><Text style={styles.errorBannerText}>{linesErr}</Text></View>
      )}
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Shared styles
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: colors.background },
  hydratingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] },
  hydratingText: { fontFamily: fontFamily.bodyMedium, fontSize: 13, color: colors.textMuted },
  scroll:      { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[12] },
  stepContent: { gap: spacing[3] },
  row:         { flexDirection: 'row', gap: spacing[3] },
  half:        { flex: 1 },
  textArea:    { minHeight: 104, textAlignVertical: 'top', paddingTop: spacing[3], marginBottom: spacing[2] },

  sectionBlock:  { gap: spacing[2], marginTop: spacing[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted,
    letterSpacing: 1.0, textTransform: 'uppercase',
  },

  // Presets
  presetGrid: { flexDirection: 'row', gap: spacing[2] },
  presetCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[1] + 2,
    paddingVertical: spacing[4], paddingHorizontal: spacing[2],
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderPrimary,
    backgroundColor: colors.primarySurface, position: 'relative',
  },
  presetCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetActiveDot: {
    position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  presetLabel:       { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary, textAlign: 'center' },
  presetLabelActive: { color: colors.textInverse },

  // Slot card
  slotCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    padding: spacing[3] + 2, gap: spacing[2] + 2,
  },
  slotCardStaffed: { borderColor: colors.borderPrimary },
  slotCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  slotIdxBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  slotIdxText:         { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary },
  slotCardTitleBlock:  { flex: 1, gap: 2, minWidth: 0 },
  slotCardTitle:       { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  slotCardDateSummary: { fontFamily: fontFamily.body, fontSize: 10, color: colors.textSecondary },
  slotCardDatePending: { fontFamily: fontFamily.body, fontSize: 10, color: colors.textMuted, fontStyle: 'italic' },
  slotDurPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primarySurface, borderRadius: radius.lg,
    paddingHorizontal: spacing[2], paddingVertical: 2, borderWidth: 1, borderColor: colors.borderPrimary,
  },
  slotDurPillText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.primary },
  slotRemoveBtn:   { padding: spacing[1] },

  // Copy-from chips
  copyChipsRow: { gap: spacing[2], paddingVertical: spacing[1] },
  copyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing[2] + 2, paddingVertical: spacing[1] + 2,
    borderRadius: radius.full, backgroundColor: colors.primarySurface,
    borderWidth: 1, borderColor: colors.borderPrimary,
  },
  copyChipText: { fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.primary },

  // Staffing
  slotServicesDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[1] },
  staffHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  staffCountPill: {
    paddingHorizontal: spacing[2] + 2, paddingVertical: 3, borderRadius: radius.full,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
  },
  staffCountText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.primary },

  staffEmpty: {
    alignItems: 'center', gap: 2, paddingVertical: spacing[3],
    borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' as any, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  staffEmptyTitle: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, color: colors.textSecondary },
  staffEmptyHint:  { fontFamily: fontFamily.body, fontSize: 10, color: colors.textMuted, fontStyle: 'italic' },

  // Service line row
  lineRow: {
    backgroundColor: colors.background, borderRadius: radius.lg, borderWidth: 1,
    padding: spacing[2] + 2, gap: spacing[2],
  },
  lineRowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  lineDot:  { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  lineName: { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.textPrimary },
  lineStepper: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  lineStepBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  lineStepBtnDisabled: { opacity: 0.35 },
  lineStepCount: { fontFamily: fontFamily.display, fontSize: fontSize.base, minWidth: 18, textAlign: 'center' },
  lineRemoveBtn: { padding: 2, marginLeft: spacing[1] },
  lineUniformLabel: {
    fontFamily: fontFamily.bodyMedium, fontSize: 9, color: colors.textMuted,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  lineChipsRow: { gap: spacing[1] + 2, alignItems: 'center' },
  lineUniformChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing[2] + 2, paddingVertical: spacing[1] + 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  lineUniformEmoji: { fontSize: 12 },
  lineUniformText:  { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textSecondary },

  // Add service + picker
  addServiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingHorizontal: spacing[3], paddingVertical: spacing[2] + 2,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderPrimary,
    backgroundColor: colors.primarySurface,
  },
  addServiceBtnActive: { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  addServiceText: { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary },

  pickerWrap: { gap: spacing[2], marginTop: spacing[1] },
  pickerLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[3], justifyContent: 'center' },
  pickerLoadingText: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted },
  pickerEmpty: {
    fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted,
    fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing[3],
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    padding: spacing[2] + 2, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  pickerIconWrap: {
    width: 38, height: 38, borderRadius: radius.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  pickerInfo: { flex: 1, gap: 1 },
  pickerName: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  pickerRate: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs },
  pickerAddPill: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  // Add slot
  addSlotBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], paddingVertical: spacing[3],
    borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed' as any,
    borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface, marginTop: spacing[2],
  },
  addSlotText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
  addSlotHint: { fontFamily: fontFamily.body, fontSize: 11, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic' },

  // Duration badge
  durationBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] + 2,
    backgroundColor: colors.primarySurface, borderRadius: radius.lg,
    padding: spacing[3], borderWidth: 1, borderColor: colors.borderPrimary, marginTop: spacing[2],
  },
  durationText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
  urgentRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  urgentText:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primaryLight },

  // Errors
  errorBanner: {
    backgroundColor: 'rgba(225,29,72,0.12)', borderRadius: radius.lg, padding: spacing[3],
    borderWidth: 1, borderColor: colors.danger,
  },
  errorBannerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger },

  // Footer
  footer: {
    paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[3], paddingBottom: spacing[4],
    backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing[2],
  },
  footerMeta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[1] },
  footerMetaText: { fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.textMuted, letterSpacing: 0.3 },
  footerBtnRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing[2] + 2 },
  footerBackBtn:  { flexShrink: 0, paddingHorizontal: spacing[4] },
  footerNextBtn:  { flex: 1 },
});
