/**
 * MissionCreateScreen — Enterprise 3-step mission creation.
 *
 * Flow:
 *   ServicePicker → MissionCreate (3 steps) → QuoteDetail
 *
 *     Step 1 · WHERE    Address with auto-fill + map confirmation
 *     Step 2 · WHEN     Quick presets + custom; multi-slot revealed on demand
 *                       Each slot can override services/uniforms (opt-in)
 *     Step 3 · REVIEW   Full summary + price estimate + optional title/notes
 *
 * Enterprise UX features (May 2026):
 *   ─ Draft autosave (per-user, 7-day TTL) + restore banner on mount
 *   ─ Smart footer: Back · Continue/Create with step-preview labels
 *   ─ Cross-slot validation summary banner with jump-to-offending-slot
 *   ─ Multi-slot escape hatch (back to single, with confirm)
 *   ─ Indicative price estimate on Review (base rate × hours × agents)
 *   ─ Structured submit-error banner with "Modifier" jump-back per field
 *   ─ Preset selection feedback (active preset highlighted, tap to clear)
 *
 * Backend payload — unchanged:
 *   ─ SINGLE  → { ...base, startAt, endAt, durationHours, bookingLines }
 *   ─ MULTI   → { ...base, slots: [{ startAt, endAt, durationHours, bookingLines }] }
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, TouchableOpacity,
} from 'react-native';
import type { TFunction } from 'i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  MapPin, CalendarClock, FileText, Pencil, Clock, Zap, Users, Plus, Minus, X,
  Sparkles, Sunrise, Moon, PartyPopper, Calendar, ChevronRight, ChevronLeft, Check,
  ClipboardList, Settings2, RotateCcw, Copy, AlertTriangle, Save, ArrowLeftRight,
  Receipt,
} from 'lucide-react-native';
import { useTranslation }    from '@i18n';
import { useToast }          from '@hooks/useToast';
import { useConfirmDialog }  from '@hooks/useConfirmDialog';
import { useAuthStore }      from '@store/authStore';
import { missionsApi }       from '@api/endpoints/missions';
import { quotesApi }         from '@api/endpoints/quotes';
import { missionDraftStorage, isDraftMeaningful } from '@services/missionDraftStorage';
import type { MissionDraftPayload } from '@services/missionDraftStorage';
import { Button }            from '@components/ui/Button';
import { Input }             from '@components/ui/Input';
import { ScreenHeader }      from '@components/ui/ScreenHeader';
import { AddressSearch }     from '@components/ui/AddressSearch';
import { MapLocationPicker } from '@components/ui/MapLocationPicker';
import { DateTimePicker }    from '@components/ui/DateTimePicker';
import type { NominatimResult } from '@components/ui/AddressSearch';
import { UNIFORM_OPTIONS }   from './ServicePickerScreen';
import type { UniformValue } from './ServicePickerScreen';
import { formatEuros }       from '@utils/formatters';
import { colors }            from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList, MissionSlotRecord } from '@models/index';

type MissionsT = TFunction<'missions'>;
type Props     = NativeStackScreenProps<MissionStackParamList, 'MissionCreate'>;
type Step      = 1 | 2 | 3;

// ──────────────────────────────────────────────────────────────────────────────
// Local types
// ──────────────────────────────────────────────────────────────────────────────

interface BookingLineLocal {
  serviceTypeId: string;
  agentCount:    number;
  name:          string;
  accent:        string;
  agentUniforms: (string | null)[];
  /** Indicative rate from ServicePicker. NOT sent to the API — used for the price estimate only. */
  ratePerHour?:  number;
}

interface SlotLineOverride {
  serviceTypeId: string;
  /** 0 means this service is excluded from this slot. */
  agentCount:    number;
  slotUniform:   UniformValue;
}

interface SlotDraft {
  key:        string;
  startAt:    string;
  endAt:      string;
  customized: boolean;
  overrides:  SlotLineOverride[];
  editorOpen: boolean;
}

interface FormData {
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

interface SubmitError {
  /** Banner heading. */
  title:   string;
  /** Detail lines (e.g. validation errors from the API). */
  details: string[];
  /** Step to jump to when the user taps "Modifier". null = no jump-back. */
  jumpTo:  Step | null;
}

const INITIAL_FORM: FormData = {
  title: '', notes: '', address: '', city: '', zipCode: '',
  latitude: null, longitude: null, startAt: '', endAt: '',
};

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const MIN_FUTURE_HOURS = 1;
const MIN_DURATION_H   = 6;
const MAX_DURATION_H   = 240;
const DEFAULT_UNIFORM: UniformValue = 'STANDARD';

const UNIFORM_EMOJI: Record<string, string> = {
  STANDARD: '🦺', CIVIL: '👔', EVENEMENTIEL: '🎩', SSIAP: '🚒', CYNOPHILE: '🐕',
};

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

function totalSlotHours(drafts: SlotDraft[]): number {
  return drafts.reduce((sum, s) => sum + durationHours(s.startAt, s.endAt), 0);
}

function totalAgentsInLines(lines: BookingLineLocal[]): number {
  return lines.reduce((n, l) => n + l.agentCount, 0);
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
  if (diffMin < 1)    return 'à l\'instant';
  if (diffMin < 60)   return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)     return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD} j`;
}

function buildDefaultOverrides(globalLines: BookingLineLocal[]): SlotLineOverride[] {
  return globalLines.map(l => ({
    serviceTypeId: l.serviceTypeId,
    agentCount:    l.agentCount,
    slotUniform:   (l.agentUniforms[0] as UniformValue) ?? DEFAULT_UNIFORM,
  }));
}

function buildEffectiveSlotLines(slot: SlotDraft, globalLines: BookingLineLocal[]): BookingLineLocal[] {
  if (!slot.customized) {
    return globalLines.map(l => ({ ...l, agentUniforms: [...l.agentUniforms] }));
  }
  const result: BookingLineLocal[] = [];
  for (const g of globalLines) {
    const o = slot.overrides.find(x => x.serviceTypeId === g.serviceTypeId);
    if (!o || o.agentCount === 0) continue;
    result.push({
      ...g,
      agentCount:    o.agentCount,
      agentUniforms: Array(o.agentCount).fill(o.slotUniform),
    });
  }
  return result;
}

function totalAgentsForSlot(slot: SlotDraft, globalLines: BookingLineLocal[]): number {
  return totalAgentsInLines(buildEffectiveSlotLines(slot, globalLines));
}

// ──────────────────────────────────────────────────────────────────────────────
// Schedule presets
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

/** Detect which preset (if any) is currently active by comparing dates. */
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
  const { t }     = useTranslation('missions');
  const toast     = useToast();
  const confirm   = useConfirmDialog();
  const userId    = useAuthStore(s => s.user?.id ?? null);

  const initialLines: BookingLineLocal[] = useMemo(
    () => (route.params.bookingLines ?? []).map((l: any) => ({
      serviceTypeId: l.serviceTypeId,
      agentCount:    l.agentCount,
      name:          l.name,
      accent:        l.accent,
      agentUniforms: l.agentUniforms ?? Array(l.agentCount).fill('STANDARD'),
      ratePerHour:   typeof l.ratePerHour === 'number' ? l.ratePerHour : undefined,
    })),
    [route.params.bookingLines],
  );

  const [step,    setStep]    = useState<Step>(1);
  const [form,    setForm]    = useState<FormData>(INITIAL_FORM);
  const [lines]               = useState<BookingLineLocal[]>(initialLines);
  const [slots,   setSlots]   = useState<SlotDraft[]>([]);
  const [errors,  setErrors]  = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [mapScrollLocked, setMapScrollLocked] = useState(false);

  // ── Submit error state — surfaced as a banner above the scroll content ───
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  // ── Draft restore — null = not checked yet ──────────────────────────────
  const [draftCandidate, setDraftCandidate] = useState<{
    payload: MissionDraftPayload; savedAt: number;
  } | null>(null);
  /**
   * Lock autosave during the brief restore window. Without this, the first
   * render with INITIAL_FORM overwrites the persisted draft before the
   * restore handler has a chance to run.
   */
  const autosaveReady = useRef(false);

  const isMultiSlot = slots.length > 0;
  const setField = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(p => ({ ...p, [k]: v })), []);

  const agentsTotal = useMemo(() => totalAgentsInLines(lines), [lines]);

  // ── Active preset (for visual feedback in StepWhen) ─────────────────────
  const activePreset = useMemo(
    () => isMultiSlot ? null : detectActivePreset(form.startAt, form.endAt),
    [isMultiSlot, form.startAt, form.endAt],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Draft autosave / restore
  // ──────────────────────────────────────────────────────────────────────────

  // On mount: attempt to load a draft. We do NOT auto-restore — the user must
  // accept via the banner so they always know their state has been replaced.
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      autosaveReady.current = true;
      return;
    }
    (async () => {
      const payload = await missionDraftStorage.load(userId);
      if (cancelled) return;
      if (payload && isDraftMeaningful(payload)) {
        // We persist savedAt in the envelope but load() returns just payload.
        // Read it once more to grab savedAt for the relative-time label.
        // Cheaper than re-architecting the storage API for one field.
        const raw = await (async () => {
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const key = `@securbook:client:mission_draft:v1:${userId}`;
            const stored = await AsyncStorage.getItem(key);
            return stored ? JSON.parse(stored) : null;
          } catch { return null; }
        })();
        const savedAt: number = raw?.savedAt ?? Date.now();
        if (!cancelled) setDraftCandidate({ payload, savedAt });
      }
      // autosave only after we've decided whether to show the restore banner
      autosaveReady.current = true;
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Debounced autosave. Reads the latest form/slots/step at the moment the
  // timer fires — not when scheduled — so we never persist stale state.
  useEffect(() => {
    if (!userId || !autosaveReady.current) return;
    const handle = setTimeout(() => {
      const payload: MissionDraftPayload = {
        step,
        form,
        slots: slots.map(s => ({
          startAt:    s.startAt,
          endAt:      s.endAt,
          customized: s.customized,
          overrides:  s.overrides.map(o => ({
            serviceTypeId: o.serviceTypeId,
            agentCount:    o.agentCount,
            slotUniform:   o.slotUniform,
          })),
        })),
        bookingLines: lines.map(l => ({
          serviceTypeId: l.serviceTypeId,
          agentCount:    l.agentCount,
          name:          l.name,
          accent:        l.accent,
          agentUniforms: l.agentUniforms,
        })),
      };
      // No need to write empty drafts — they're indistinguishable from a fresh start.
      if (isDraftMeaningful(payload)) {
        missionDraftStorage.save(userId, payload);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [userId, step, form, slots, lines]);

  const handleRestoreDraft = useCallback(() => {
    if (!draftCandidate) return;
    const { payload } = draftCandidate;
    setStep(payload.step);
    setForm(payload.form);
    setSlots(payload.slots.map(s => ({
      key:        nextKey(),
      startAt:    s.startAt,
      endAt:      s.endAt,
      customized: s.customized,
      overrides:  s.overrides.map(o => ({
        serviceTypeId: o.serviceTypeId,
        agentCount:    o.agentCount,
        slotUniform:   o.slotUniform as UniformValue,
      })),
      editorOpen: false,
    })));
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
  // Schedule presets — with toggle-off (re-tap clears)
  // ──────────────────────────────────────────────────────────────────────────
  const applyPreset = useCallback((preset: SchedulePreset) => {
    const currentActive = detectActivePreset(form.startAt, form.endAt);
    if (currentActive === preset.key) {
      // Re-tap clears the preset — gives users a clear way to undo.
      setForm(p => ({ ...p, startAt: '', endAt: '' }));
      return;
    }
    const { startAt, endAt } = preset.build();
    setSlots([]);
    setForm(p => ({ ...p, startAt, endAt }));
    setErrors(e => ({ ...e, startAt: undefined, endAt: undefined }));
  }, [form.startAt, form.endAt]);

  // ──────────────────────────────────────────────────────────────────────────
  // Multi-slot
  // ──────────────────────────────────────────────────────────────────────────
  const makeSlot = useCallback((startAt = '', endAt = ''): SlotDraft => ({
    key: nextKey(), startAt, endAt, customized: false,
    overrides: buildDefaultOverrides(lines), editorOpen: false,
  }), [lines]);

  const enterMultiSlot = useCallback(() => {
    setSlots([
      makeSlot(form.startAt, form.endAt),
      makeSlot(),
    ]);
    setForm(p => ({ ...p, startAt: '', endAt: '' }));
  }, [form.startAt, form.endAt, makeSlot]);

  const exitMultiSlot = useCallback(async () => {
    if (slots.length === 0) return;
    // Find the slot that will become the single one: the first non-empty,
    // falling back to the first slot if nothing has dates yet. Less surprising
    // than dropping everything.
    const keeper = slots.find(s => s.startAt && s.endAt) ?? slots[0];
    const ok = await confirm({
      title:        t('create.exit_multi_slot_confirm_title'),
      message:      t('create.exit_multi_slot_confirm_message'),
      confirmLabel: t('create.exit_multi_slot_confirm_btn'),
    });
    if (!ok) return;
    setSlots([]);
    setForm(p => ({ ...p, startAt: keeper.startAt, endAt: keeper.endAt }));
  }, [slots, confirm, t]);

  const addSlot = useCallback(() => {
    setSlots(prev => [...prev, makeSlot()]);
  }, [makeSlot]);

  const removeSlot = useCallback((key: string) => {
    setSlots(prev => {
      const next = prev.filter(s => s.key !== key);
      if (next.length === 1) {
        setForm(p => ({ ...p, startAt: next[0].startAt, endAt: next[0].endAt }));
        return [];
      }
      return next;
    });
  }, []);

  const updateSlot = useCallback((key: string, patch: Partial<Omit<SlotDraft, 'key'>>) => {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s));
    setErrors(prev => {
      const next: typeof prev = { ...prev };
      Object.keys(next).filter(k => k.startsWith(`slot_${key}_`)).forEach(k => delete next[k]);
      return next;
    });
  }, []);

  const copySlotDates = useCallback((targetKey: string, sourceIdx: number) => {
    setSlots(prev => {
      const source = prev[sourceIdx];
      if (!source) return prev;
      return prev.map(s =>
        s.key !== targetKey ? s : { ...s, startAt: source.startAt, endAt: source.endAt },
      );
    });
    setErrors(prev => {
      const next = { ...prev };
      delete next[`slot_${targetKey}_startAt`];
      delete next[`slot_${targetKey}_endAt`];
      return next;
    });
  }, []);

  const customizeSlot = useCallback((key: string) => {
    setSlots(prev => prev.map(s =>
      s.key !== key ? s : {
        ...s, customized: true, editorOpen: true,
        overrides: s.overrides.length > 0 ? s.overrides : buildDefaultOverrides(lines),
      },
    ));
  }, [lines]);

  const resetSlotCustomization = useCallback((key: string) => {
    setSlots(prev => prev.map(s =>
      s.key !== key ? s : {
        ...s, customized: false, editorOpen: false,
        overrides: buildDefaultOverrides(lines),
      },
    ));
    setErrors(prev => {
      const next = { ...prev };
      delete next[`slot_${key}_lines`];
      return next;
    });
  }, [lines]);

  const toggleSlotEditor = useCallback((key: string) => {
    setSlots(prev => prev.map(s =>
      s.key !== key ? s : { ...s, editorOpen: !s.editorOpen },
    ));
  }, []);

  const changeSlotLineCount = useCallback((slotKey: string, serviceTypeId: string, delta: number) => {
    setSlots(prev => prev.map(s => {
      if (s.key !== slotKey) return s;
      return {
        ...s,
        overrides: s.overrides.map(o =>
          o.serviceTypeId !== serviceTypeId ? o
            : { ...o, agentCount: Math.max(0, Math.min(20, o.agentCount + delta)) },
        ),
      };
    }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[`slot_${slotKey}_lines`];
      return next;
    });
  }, []);

  const setSlotLineUniform = useCallback((slotKey: string, serviceTypeId: string, uniform: UniformValue) => {
    setSlots(prev => prev.map(s => {
      if (s.key !== slotKey) return s;
      return {
        ...s,
        overrides: s.overrides.map(o =>
          o.serviceTypeId !== serviceTypeId ? o : { ...o, slotUniform: uniform },
        ),
      };
    }));
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Cross-slot error aggregation — driven by the `errors` map.
  // ──────────────────────────────────────────────────────────────────────────
  const crossSlotErrorSlots = useMemo(() => {
    if (!isMultiSlot) return [];
    const offenders: Array<{ idx: number; key: string }> = [];
    slots.forEach((s, idx) => {
      const startErr = errors[`slot_${s.key}_startAt`];
      const endErr   = errors[`slot_${s.key}_endAt`];
      const linesErr = errors[`slot_${s.key}_lines`];
      if (startErr || endErr || linesErr) offenders.push({ idx, key: s.key });
    });
    return offenders;
  }, [isMultiSlot, slots, errors]);

  // ──────────────────────────────────────────────────────────────────────────
  // Validation
  // ──────────────────────────────────────────────────────────────────────────
  const validate = (target: Step): boolean => {
    const e: Record<string, string | undefined> = {};

    if (target >= 1) {
      if (lines.length === 0) {
        toast.warning(t('create.service_required_body'), { title: t('create.service_required_title') });
        return false;
      }
      if (!form.address.trim()) e.address  = t('create.address_required');
      if (!form.city.trim())    e.city     = t('create.city_required');
      if (form.latitude == null) e.latitude = t('create.map_position_required');
    }

    if (target >= 2) {
      const minStart = new Date(Date.now() + MIN_FUTURE_HOURS * 3_600_000);
      if (!isMultiSlot) {
        if (!form.startAt) e.startAt = t('create.start_required');
        if (!form.endAt)   e.endAt   = t('create.end_required');
        if (form.startAt && new Date(form.startAt) < minStart) e.startAt = t('create.start_min_future');
        if (form.startAt && form.endAt) {
          const d = durationHours(form.startAt, form.endAt);
          if (new Date(form.endAt) <= new Date(form.startAt)) e.endAt = t('create.end_before_start');
          else if (d < MIN_DURATION_H)   e.endAt = t('create.duration_min');
          else if (d > MAX_DURATION_H)   e.endAt = t('create.duration_max');
        }
      } else {
        const valid: Array<{ start: Date; end: Date; key: string }> = [];
        slots.forEach(s => {
          if (!s.startAt) { e[`slot_${s.key}_startAt`] = t('create.slot_start_required'); return; }
          if (!s.endAt)   { e[`slot_${s.key}_endAt`]   = t('create.slot_end_required');   return; }
          const start = new Date(s.startAt), end = new Date(s.endAt);
          if (end <= start) { e[`slot_${s.key}_endAt`] = t('create.slot_end_before_start'); return; }
          if (durationHours(s.startAt, s.endAt) < MIN_DURATION_H) {
            e[`slot_${s.key}_endAt`] = t('create.slot_duration_min'); return;
          }
          if (totalAgentsForSlot(s, lines) === 0) {
            e[`slot_${s.key}_lines`] = t('create.slot_lines_required'); return;
          }
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
    }

    setErrors(e);
    return Object.keys(e).filter(k => e[k]).length === 0;
  };

  const handleNext = () => {
    if (!validate(step)) return;
    if (step < 3) { setStep(s => (s + 1) as Step); return; }
    handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) { setStep(s => (s - 1) as Step); return; }
    navigation.goBack();
  };

  const handleEditServices = () => {
    navigation.navigate('ServicePicker', {
      existingLines: lines.map(l => ({
        serviceTypeId: l.serviceTypeId, agentCount: l.agentCount,
        name: l.name, accent: l.accent, agentUniforms: l.agentUniforms,
      })),
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError(null);
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
      };

      const globalLinesPayload = lines.map(l => ({
        serviceTypeId: l.serviceTypeId,
        agentCount:    l.agentCount,
        agentUniforms: l.agentUniforms.map(u => u ?? 'STANDARD'),
      }));

      let missionPayload: Parameters<typeof missionsApi.create>[0];

      if (!isMultiSlot) {
        missionPayload = {
          ...base,
          startAt:       new Date(form.startAt).toISOString(),
          endAt:         new Date(form.endAt).toISOString(),
          durationHours: clampDuration(durationHours(form.startAt, form.endAt)),
          isUrgent:      isToday(form.startAt),
          bookingLines:  globalLinesPayload,
        };
      } else {
        const sortedDrafts = [...slots].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        );
        missionPayload = {
          ...base,
          isUrgent: isToday(sortedDrafts[0]?.startAt ?? ''),
          slots: sortedDrafts.map(s => {
            const effective = buildEffectiveSlotLines(s, lines);
            return {
              startAt:       new Date(s.startAt).toISOString(),
              endAt:         new Date(s.endAt).toISOString(),
              durationHours: clampDuration(durationHours(s.startAt, s.endAt)),
              bookingLines:  effective.map(l => ({
                serviceTypeId: l.serviceTypeId,
                agentCount:    l.agentCount,
                agentUniforms: l.agentUniforms.map(u => u ?? 'STANDARD'),
              })),
            };
          }),
        };
      }

      const { data: mRes } = await missionsApi.create(missionPayload);
      let mission = (mRes as any).data;
      createdMissionId = mission.id;

      if (!isMultiSlot) {
        await quotesApi.calculate({
          missionId:    mission.id,
          bookingLines: globalLinesPayload,
        });
      } else {
        let createdSlots: MissionSlotRecord[] = (mission.slots ?? []).slice();
        if (createdSlots.length === 0) {
          const { data: refetch } = await missionsApi.getById(mission.id);
          mission = (refetch as any).data;
          createdSlots = (mission.slots ?? []).slice();
        }
        if (createdSlots.length === 0) {
          throw new Error('Mission créée mais créneaux non récupérés. Ouvrez la mission pour générer le devis.');
        }
        const sortedSlots  = [...createdSlots].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        const sortedDrafts = [...slots].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

        await quotesApi.calculate({
          missionId: mission.id,
          slotLines: sortedDrafts.map((draft, idx) => {
            const effective = buildEffectiveSlotLines(draft, lines);
            return {
              slotId:       sortedSlots[idx].id,
              bookingLines: effective.map(l => ({
                serviceTypeId: l.serviceTypeId,
                agentCount:    l.agentCount,
                agentUniforms: l.agentUniforms.map(u => u ?? 'STANDARD'),
              })),
            };
          }),
        });
      }

      // Submit succeeded — clear the autosaved draft.
      if (userId) missionDraftStorage.clear(userId);
      navigation.replace('QuoteDetail', { missionId: mission.id });
    } catch (err: unknown) {
      const status       = (err as any)?.response?.status;
      const apiMsg       = (err as any)?.response?.data?.message;
      const localMsg     = (err as any)?.message;
      const isNetworkErr = !status && typeof localMsg === 'string' && localMsg.includes('Network');
      const isServerErr  = (typeof status === 'number' && status >= 500) || isNetworkErr;

      if (createdMissionId && isServerErr) {
        missionsApi.cancel(createdMissionId).catch(() => {});
      }

      // Build a structured banner instead of a raw toast. The banner offers
      // a "Modifier" jump-back to the most relevant step based on the message.
      const details = Array.isArray(apiMsg)
        ? apiMsg.map(String)
        : apiMsg
          ? [String(apiMsg)]
          : isNetworkErr
            ? [t('create.submit_error_network')]
            : [localMsg ?? t('create.error_create')];

      // Heuristic: scan messages for words that hint at a step. Cheap and good
      // enough — backend validation errors usually reference field names.
      const joined = details.join(' ').toLowerCase();
      const jumpTo: Step | null =
        /(address|city|zipcode|latitude|longitude|adresse|ville)/.test(joined) ? 1
        : /(start|end|duration|slot|durée|creneau|heure)/.test(joined)         ? 2
        : null;

      setSubmitError({
        title:   t('create.submit_error_title'),
        details,
        jumpTo,
      });

      if (createdMissionId && !isServerErr) {
        // Mission exists but quote calc failed — offer a recovery path.
        toast.info(t('detail.cta_get_quote'), {
          action: {
            label:   t('detail.cta_get_quote'),
            onPress: () => navigation.replace('MissionDetail', { missionId: createdMissionId! }),
          },
          duration: 8000,
        });
      }
    } finally {
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
    1: t('create.step_where'),
    2: t('create.step_when'),
    3: t('create.step_review'),
  };

  /** Smart label for the primary CTA — gives the user a preview of where they're going. */
  const nextLabel =
    step === 1 ? t('create.next_to_when') :
    step === 2 ? t('create.next_to_review') :
                 t('create.create_btn');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={headerTitles[step]}
        onBack={handleBack}
      />

      <StepProgress current={step} t={t} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        scrollEnabled={!mapScrollLocked}
        nestedScrollEnabled
      >
        {/* ── Draft restore banner ───────────────────────────────────── */}
        {draftCandidate && (
          <DraftRestoreBanner
            savedAt={draftCandidate.savedAt}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
            t={t}
          />
        )}

        {/* ── Submit error banner ────────────────────────────────────── */}
        {submitError && (
          <SubmitErrorBanner
            error={submitError}
            onDismiss={dismissSubmitError}
            onJump={submitError.jumpTo != null ? jumpToSubmitErrorStep : undefined}
            t={t}
          />
        )}

        <ServiceSummary
          lines={lines}
          totalAgents={agentsTotal}
          onEdit={handleEditServices}
          t={t}
        />

        {/* ── Cross-slot error banner (only on step 2 in multi-slot mode) */}
        {step === 2 && crossSlotErrorSlots.length > 0 && (
          <CrossSlotErrorBanner
            offenders={crossSlotErrorSlots}
            onJump={(_idx) => { /* no-op — banner already visible alongside slots */ }}
            t={t}
          />
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
          <StepWhen
            form={form}
            slots={slots}
            errors={errors}
            isMultiSlot={isMultiSlot}
            activePreset={activePreset}
            globalLines={lines}
            onApplyPreset={applyPreset}
            onSetField={setField}
            onEnterMultiSlot={enterMultiSlot}
            onExitMultiSlot={exitMultiSlot}
            onAddSlot={addSlot}
            onRemoveSlot={removeSlot}
            onUpdateSlot={updateSlot}
            onCopySlotDates={copySlotDates}
            onCustomizeSlot={customizeSlot}
            onResetSlotCustomization={resetSlotCustomization}
            onToggleSlotEditor={toggleSlotEditor}
            onChangeSlotLineCount={changeSlotLineCount}
            onSetSlotLineUniform={setSlotLineUniform}
            t={t}
          />
        )}

        {step === 3 && (
          <StepReview
            form={form}
            slots={slots}
            lines={lines}
            agentsTotal={agentsTotal}
            isMultiSlot={isMultiSlot}
            onSetField={setField}
            onEditStep={(s) => setStep(s)}
            t={t}
          />
        )}
      </ScrollView>

      {/* ── Smart footer: Back + Continue/Create ────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.footerMeta}>
          <Text style={styles.footerMetaText}>
            {step < 3
              ? t('create.footer_step_progress', { current: step, total: 3 })
              : t('create.footer_ready')}
          </Text>
          {step >= 2 && !isMultiSlot && form.startAt && form.endAt && (
            <Text style={styles.footerMetaText}>
              {' · '}{t('create.duration_hours', { hours: durationHours(form.startAt, form.endAt).toFixed(1) })}
            </Text>
          )}
          {step >= 2 && isMultiSlot && totalSlotHours(slots) > 0 && (
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
              step < 3
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
      <Save size={16} color={colors.primary} strokeWidth={2} />
    </View>
    <View style={draftBannerS.body}>
      <Text style={draftBannerS.title}>{t('create.draft_restore_title')}</Text>
      <Text style={draftBannerS.subtitle}>
        {t('create.draft_restore_subtitle', { when: formatRelativeFromNow(savedAt) })}
      </Text>
      <View style={draftBannerS.actions}>
        <TouchableOpacity onPress={onRestore} style={draftBannerS.primaryBtn} activeOpacity={0.78}>
          <Text style={draftBannerS.primaryBtnText}>{t('create.draft_restore_btn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDiscard} style={draftBannerS.secondaryBtn} activeOpacity={0.78}>
          <Text style={draftBannerS.secondaryBtnText}>{t('create.draft_discard_btn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const draftBannerS = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               spacing[3],
    backgroundColor:   colors.primarySurface,
    borderWidth:       1,
    borderColor:       colors.borderPrimary,
    borderRadius:      radius.xl,
    paddingHorizontal: spacing[3] + 2,
    paddingVertical:   spacing[3] + 2,
    marginBottom:      spacing[3],
  },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  body:     { flex: 1, gap: spacing[1] + 2 },
  title:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
  actions:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[1] + 2 },
  primaryBtn: {
    paddingHorizontal: spacing[3] + 2, paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  primaryBtnText:   { fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.textInverse },
  secondaryBtn:     { paddingHorizontal: spacing[2], paddingVertical: spacing[2] },
  secondaryBtnText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 11,
    color: colors.textMuted, textDecorationLine: 'underline',
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// SubmitErrorBanner — structured failure surface with jump-back to step
// ──────────────────────────────────────────────────────────────────────────────

const SubmitErrorBanner: React.FC<{
  error:     SubmitError;
  onDismiss: () => void;
  onJump?:   () => void;
  t:         MissionsT;
}> = ({ error, onDismiss, onJump, t }) => (
  <View style={submitErrS.wrap}>
    <View style={submitErrS.iconBox}>
      <AlertTriangle size={16} color={colors.danger} strokeWidth={2} />
    </View>
    <View style={submitErrS.body}>
      <View style={submitErrS.header}>
        <Text style={submitErrS.title}>{error.title}</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={14} color={colors.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      {error.details.map((line, i) => (
        <Text key={i} style={submitErrS.detail} numberOfLines={3}>· {line}</Text>
      ))}
      {onJump && (
        <TouchableOpacity onPress={onJump} style={submitErrS.jumpBtn} activeOpacity={0.78}>
          <Pencil size={11} color={colors.danger} strokeWidth={2.2} />
          <Text style={submitErrS.jumpBtnText}>{t('create.submit_error_jump_to')}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const submitErrS = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               spacing[3],
    backgroundColor:   colors.dangerSurface,
    borderWidth:       1,
    borderColor:       colors.dangerBorder,
    borderRadius:      radius.xl,
    paddingHorizontal: spacing[3] + 2,
    paddingVertical:   spacing[3] + 2,
    marginBottom:      spacing[3],
  },
  iconBox: {
    width: 32, height: 32, borderRadius: radius.lg,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.dangerBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  body:    { flex: 1, gap: spacing[1] + 2 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:   { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.danger },
  detail:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.danger, lineHeight: fontSize.xs * 1.6 },
  jumpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: spacing[1] + 2,
    paddingHorizontal: spacing[2] + 2, paddingVertical: spacing[1] + 2,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.dangerBorder,
  },
  jumpBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.danger },
});

// ──────────────────────────────────────────────────────────────────────────────
// CrossSlotErrorBanner
// ──────────────────────────────────────────────────────────────────────────────

const CrossSlotErrorBanner: React.FC<{
  offenders: Array<{ idx: number; key: string }>;
  onJump:    (idx: number) => void;
  t:         MissionsT;
}> = ({ offenders, onJump, t }) => (
  <View style={crossSlotErrS.wrap}>
    <View style={crossSlotErrS.iconBox}>
      <AlertTriangle size={16} color={colors.warning} strokeWidth={2} />
    </View>
    <View style={crossSlotErrS.body}>
      <Text style={crossSlotErrS.title}>{t('create.cross_slot_error_title')}</Text>
      <Text style={crossSlotErrS.subtitle}>{t('create.cross_slot_error_subtitle')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={crossSlotErrS.chipsRow}
      >
        {offenders.map(o => (
          <TouchableOpacity
            key={o.key}
            onPress={() => onJump(o.idx)}
            style={crossSlotErrS.chip}
            activeOpacity={0.78}
          >
            <ChevronRight size={10} color={colors.warning} strokeWidth={2.4} />
            <Text style={crossSlotErrS.chipText}>
              {t('create.cross_slot_error_jump', { n: o.idx + 1 })}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  </View>
);

const crossSlotErrS = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               spacing[3],
    backgroundColor:   colors.warningSurface,
    borderWidth:       1,
    borderColor:       colors.warningBorder,
    borderRadius:      radius.xl,
    paddingHorizontal: spacing[3] + 2,
    paddingVertical:   spacing[3],
    marginBottom:      spacing[3],
  },
  iconBox: {
    width: 32, height: 32, borderRadius: radius.lg,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.warningBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  body:     { flex: 1, gap: spacing[1] + 2 },
  title:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.warning },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
  chipsRow: { gap: spacing[2], marginTop: spacing[1] + 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing[2] + 2, paddingVertical: spacing[1] + 2,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.warningBorder,
  },
  chipText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.warning },
});

// ──────────────────────────────────────────────────────────────────────────────
// StepProgress
// ──────────────────────────────────────────────────────────────────────────────

const StepProgress: React.FC<{ current: Step; t: MissionsT }> = ({ current, t }) => {
  const labels: Record<Step, string> = {
    1: t('create.progress_where'),
    2: t('create.progress_when'),
    3: t('create.progress_review'),
  };
  return (
    <View style={progressS.wrap}>
      {([1, 2, 3] as Step[]).map((s) => {
        const active = current === s;
        const done   = current > s;
        return (
          <View key={s} style={progressS.item}>
            <View style={[progressS.dot, active && progressS.dotActive, done && progressS.dotDone]}>
              {done
                ? <Check size={10} color={colors.textInverse} strokeWidth={3} />
                : <Text style={[progressS.dotText, active && progressS.dotTextActive]}>{s}</Text>}
            </View>
            <Text style={[progressS.label, (active || done) && progressS.labelActive]}>{labels[s]}</Text>
            {s < 3 && <View style={[progressS.line, done && progressS.lineDone]} />}
          </View>
        );
      })}
    </View>
  );
};

const progressS = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[3],
    gap:               spacing[1],
    backgroundColor:   colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
// ServiceSummary
// ──────────────────────────────────────────────────────────────────────────────

const ServiceSummary: React.FC<{
  lines:       BookingLineLocal[];
  totalAgents: number;
  onEdit:      () => void;
  t:           MissionsT;
}> = ({ lines, totalAgents, onEdit, t }) => (
  <TouchableOpacity style={summaryS.wrap} onPress={onEdit} activeOpacity={0.85}>
    <View style={summaryS.iconBox}>
      <ClipboardList size={16} color={colors.primary} strokeWidth={2} />
    </View>
    <View style={summaryS.body}>
      <Text style={summaryS.title}>
        {t('create.total_agents', { count: totalAgents, lines: lines.length })}
      </Text>
      <Text style={summaryS.subtitle} numberOfLines={1}>
        {lines.map(l => `${l.agentCount}× ${l.name.split(' ')[0]}`).join(' · ')}
      </Text>
    </View>
    <View style={summaryS.editPill}>
      <Pencil size={11} color={colors.primary} strokeWidth={2.2} />
      <Text style={summaryS.editText}>{t('create.edit_btn')}</Text>
    </View>
  </TouchableOpacity>
);

const summaryS = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing[3],
    backgroundColor:   colors.primarySurface,
    borderWidth:       1,
    borderColor:       colors.borderPrimary,
    borderRadius:      radius.xl,
    paddingHorizontal: spacing[3] + 2,
    paddingVertical:   spacing[3],
    marginBottom:      spacing[4],
  },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  body:     { flex: 1, gap: 2 },
  title:    { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing[2] + 2, paddingVertical: spacing[1] + 2,
    borderRadius: radius.full, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.borderPrimary,
  },
  editText: { fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.primary },
});

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
// StepWhen
// ──────────────────────────────────────────────────────────────────────────────

interface StepWhenProps {
  form:                     FormData;
  slots:                    SlotDraft[];
  errors:                   Record<string, string | undefined>;
  isMultiSlot:              boolean;
  activePreset:             PresetKey | null;
  globalLines:              BookingLineLocal[];
  onApplyPreset:            (p: SchedulePreset) => void;
  onSetField:               <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onEnterMultiSlot:         () => void;
  onExitMultiSlot:          () => void;
  onAddSlot:                () => void;
  onRemoveSlot:             (key: string) => void;
  onUpdateSlot:             (key: string, patch: Partial<Omit<SlotDraft, 'key'>>) => void;
  onCopySlotDates:          (targetKey: string, sourceIdx: number) => void;
  onCustomizeSlot:          (key: string) => void;
  onResetSlotCustomization: (key: string) => void;
  onToggleSlotEditor:       (key: string) => void;
  onChangeSlotLineCount:    (slotKey: string, serviceTypeId: string, delta: number) => void;
  onSetSlotLineUniform:     (slotKey: string, serviceTypeId: string, uniform: UniformValue) => void;
  t:                        MissionsT;
}

const StepWhen: React.FC<StepWhenProps> = ({
  form, slots, errors, isMultiSlot, activePreset, globalLines,
  onApplyPreset, onSetField, onEnterMultiSlot, onExitMultiSlot,
  onAddSlot, onRemoveSlot, onUpdateSlot,
  onCopySlotDates,
  onCustomizeSlot, onResetSlotCustomization, onToggleSlotEditor,
  onChangeSlotLineCount, onSetSlotLineUniform, t,
}) => {
  const minDate     = new Date(Date.now() + MIN_FUTURE_HOURS * 3_600_000);
  const singleDurH  = form.startAt && form.endAt ? durationHours(form.startAt, form.endAt) : 0;
  const multiTotalH = totalSlotHours(slots);

  return (
    <View style={styles.stepContent}>
      <StepHero Icon={CalendarClock} title={t('create.when_title')} subtitle={t('create.when_subtitle')} />

      {!isMultiSlot && (
        <>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Sparkles size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.sectionTitle}>{t('create.preset_section')}</Text>
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
                  >
                    {isActive && (
                      <View style={styles.presetActiveDot}>
                        <Check size={9} color={colors.textInverse} strokeWidth={3} />
                      </View>
                    )}
                    <Icon
                      size={16}
                      color={isActive ? colors.textInverse : colors.primary}
                      strokeWidth={2}
                    />
                    <Text style={[styles.presetLabel, isActive && styles.presetLabelActive]}>
                      {t(p.i18n as any)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Calendar size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.sectionTitle}>{t('create.custom_section')}</Text>
            </View>
            <DateTimePicker
              label={t('create.start_label')}
              value={form.startAt}
              onChange={v => onSetField('startAt', v)}
              minDate={minDate}
              error={errors.startAt}
              hint={t('create.start_hint')}
            />
            <DateTimePicker
              label={t('create.end_label')}
              value={form.endAt}
              onChange={v => onSetField('endAt', v)}
              minDate={form.startAt ? new Date(new Date(form.startAt).getTime() + MIN_DURATION_H * 3_600_000) : minDate}
              error={errors.endAt}
              hint={t('create.end_hint')}
            />
            {singleDurH >= MIN_DURATION_H && !errors.endAt && (
              <DurationBadge t={t} hours={singleDurH} urgent={isToday(form.startAt)} />
            )}

            <TouchableOpacity style={styles.addSlotBtn} onPress={onEnterMultiSlot} activeOpacity={0.78}>
              <Plus size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addSlotText}>{t('create.add_another_slot')}</Text>
            </TouchableOpacity>
            <Text style={styles.addSlotHint}>{t('create.add_another_slot_hint')}</Text>
          </View>
        </>
      )}

      {isMultiSlot && (
        <View style={styles.sectionBlock}>
          {/* Multi-slot mode header with escape hatch */}
          <View style={styles.multiHeader}>
            <View style={styles.sectionHeader}>
              <Calendar size={14} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.sectionTitle}>
                {t('create.slots_count', { n: slots.length })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onExitMultiSlot}
              style={styles.exitMultiBtn}
              activeOpacity={0.78}
            >
              <ArrowLeftRight size={11} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.exitMultiBtnText}>{t('create.exit_multi_slot')}</Text>
            </TouchableOpacity>
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
              globalLines={globalLines}
              canRemove={slots.length > 1}
              onUpdate={(patch) => onUpdateSlot(slot.key, patch)}
              onRemove={() => onRemoveSlot(slot.key)}
              onCopyDates={(sourceIdx) => onCopySlotDates(slot.key, sourceIdx)}
              onCustomize={() => onCustomizeSlot(slot.key)}
              onResetCustomization={() => onResetSlotCustomization(slot.key)}
              onToggleEditor={() => onToggleSlotEditor(slot.key)}
              onChangeLineCount={(svcId, d) => onChangeSlotLineCount(slot.key, svcId, d)}
              onSetLineUniform={(svcId, u) => onSetSlotLineUniform(slot.key, svcId, u)}
              t={t}
            />
          ))}

          {slots.length < 30 && (
            <TouchableOpacity style={styles.addSlotBtn} onPress={onAddSlot} activeOpacity={0.78}>
              <Plus size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.addSlotText}>{t('create.slot_add_btn')}</Text>
            </TouchableOpacity>
          )}

          {multiTotalH >= MIN_DURATION_H && (
            <DurationBadge
              t={t}
              hours={multiTotalH}
              urgent={slots.some(s => isToday(s.startAt))}
              label={t('create.slots_total_duration', { hours: multiTotalH.toFixed(1), count: slots.length })}
            />
          )}
        </View>
      )}
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// SlotCard
// ──────────────────────────────────────────────────────────────────────────────

interface SlotCardProps {
  slot:                 SlotDraft;
  idx:                  number;
  prevSlot:             SlotDraft | null;
  allSlots:             SlotDraft[];
  minDate:              Date;
  errors:               Record<string, string | undefined>;
  globalLines:          BookingLineLocal[];
  canRemove:            boolean;
  onUpdate:             (patch: Partial<Omit<SlotDraft, 'key'>>) => void;
  onRemove:             () => void;
  onCopyDates:          (sourceIdx: number) => void;
  onCustomize:          () => void;
  onResetCustomization: () => void;
  onToggleEditor:       () => void;
  onChangeLineCount:    (serviceTypeId: string, delta: number) => void;
  onSetLineUniform:     (serviceTypeId: string, uniform: UniformValue) => void;
  t:                    MissionsT;
}

const SlotCard: React.FC<SlotCardProps> = ({
  slot, idx, prevSlot, allSlots, minDate, errors, globalLines, canRemove,
  onUpdate, onRemove, onCopyDates, onCustomize, onResetCustomization, onToggleEditor,
  onChangeLineCount, onSetLineUniform, t,
}) => {
  const slotDurH  = durationHours(slot.startAt, slot.endAt);
  const startErr  = errors[`slot_${slot.key}_startAt`];
  const endErr    = errors[`slot_${slot.key}_endAt`];
  const linesErr  = errors[`slot_${slot.key}_lines`];
  const prevEnd   = prevSlot && prevSlot.endAt ? new Date(prevSlot.endAt) : null;
  const slotMin   = prevEnd && prevEnd > minDate ? prevEnd : minDate;
  const slotMinEnd = slot.startAt
    ? new Date(new Date(slot.startAt).getTime() + MIN_DURATION_H * 3_600_000)
    : slotMin;

  const effective = useMemo(
    () => buildEffectiveSlotLines(slot, globalLines),
    [slot, globalLines],
  );
  const slotAgents = totalAgentsInLines(effective);

  const copySourceSlots = useMemo(
    () => allSlots
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => i !== idx && s.startAt && s.endAt),
    [allSlots, idx],
  );

  const hasValidDates = slot.startAt && slot.endAt && !startErr && !endErr && slotDurH > 0;

  return (
    <View style={[styles.slotCard, slot.customized && styles.slotCardCustomized]}>
      <View style={styles.slotCardHeader}>
        <View style={styles.slotIdxBadge}>
          <Text style={styles.slotIdxText}>{idx + 1}</Text>
        </View>
        <View style={styles.slotCardTitleBlock}>
          <Text style={styles.slotCardTitle}>{t('create.slot_label', { n: idx + 1 })}</Text>
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
          <TouchableOpacity
            onPress={onRemove}
            style={styles.slotRemoveBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color={colors.danger} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {copySourceSlots.length > 0 && (!slot.startAt || !slot.endAt) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.copyChipsRow}
        >
          {copySourceSlots.map(({ s, i }) => (
            <TouchableOpacity
              key={s.key}
              style={styles.copyChip}
              onPress={() => onCopyDates(i)}
              activeOpacity={0.78}
            >
              <Copy size={10} color={colors.primary} strokeWidth={2.2} />
              <Text style={styles.copyChipText}>{t('create.slot_copy_from', { n: i + 1 })}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <DateTimePicker
        label={t('create.start_label')}
        value={slot.startAt}
        onChange={v => onUpdate({ startAt: v, endAt: '' })}
        minDate={slotMin}
        error={startErr}
      />
      <DateTimePicker
        label={t('create.end_label')}
        value={slot.endAt}
        onChange={v => onUpdate({ endAt: v })}
        minDate={slotMinEnd}
        error={endErr}
      />

      <View style={styles.slotServicesDivider} />

      {!slot.customized ? (
        <View style={styles.slotServicesDefault}>
          <View style={styles.slotServicesBadge}>
            <Users size={11} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.slotServicesBadgeText}>
              {t('create.slot_lines_default', { count: slotAgents })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCustomize}
            style={styles.customizeSlotBtn}
            activeOpacity={0.78}
          >
            <Settings2 size={12} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.customizeSlotBtnText}>{t('create.customize_for_slot')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.customizedWrap}>
          <TouchableOpacity
            style={styles.customizedHeader}
            onPress={onToggleEditor}
            activeOpacity={0.78}
          >
            <View style={styles.customizedHeaderLeft}>
              <View style={styles.customizedDot} />
              <Text style={styles.customizedTitle}>
                {t('create.slot_lines_custom', { count: slotAgents })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onResetCustomization}
              style={styles.resetCustomBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <RotateCcw size={11} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.resetCustomBtnText}>{t('create.slot_lines_reset')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {!slot.editorOpen && (
            <TouchableOpacity onPress={onToggleEditor} activeOpacity={0.8}>
              <View style={styles.customPreviewRow}>
                {effective.length === 0 ? (
                  <Text style={styles.customPreviewEmpty}>{t('create.slot_lines_required')}</Text>
                ) : (
                  effective.map(l => (
                    <View
                      key={l.serviceTypeId}
                      style={[styles.customPreviewChip, { borderColor: l.accent + '60', backgroundColor: l.accent + '14' }]}
                    >
                      <Text style={[styles.customPreviewChipText, { color: l.accent }]}>
                        {l.agentCount}× {l.name.split(' ')[0]}
                        {' '}{UNIFORM_EMOJI[l.agentUniforms[0] ?? 'STANDARD']}
                      </Text>
                    </View>
                  ))
                )}
                <Text style={styles.customPreviewExpand}>↓</Text>
              </View>
            </TouchableOpacity>
          )}

          {slot.editorOpen && (
            <View style={styles.editorList}>
              {globalLines.map(g => {
                const o = slot.overrides.find(x => x.serviceTypeId === g.serviceTypeId);
                if (!o) return null;
                const excluded = o.agentCount === 0;
                return (
                  <View
                    key={g.serviceTypeId}
                    style={[
                      styles.editorRow,
                      { borderColor: g.accent + (excluded ? '30' : '60') },
                      excluded && styles.editorRowExcluded,
                    ]}
                  >
                    <View style={styles.editorRowHeader}>
                      <View style={[styles.editorRowDot, { backgroundColor: g.accent }]} />
                      <Text style={[styles.editorRowName, excluded && styles.editorRowNameExcluded]} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <View style={styles.editorStepper}>
                        <TouchableOpacity
                          style={[styles.editorStepBtn, o.agentCount <= 0 && styles.editorStepBtnDisabled]}
                          onPress={() => onChangeLineCount(g.serviceTypeId, -1)}
                          disabled={o.agentCount <= 0}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Minus size={11} color={o.agentCount <= 0 ? colors.textMuted : g.accent} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={[styles.editorStepCount, { color: excluded ? colors.textMuted : g.accent }]}>
                          {o.agentCount}
                        </Text>
                        <TouchableOpacity
                          style={[styles.editorStepBtn, o.agentCount >= 20 && styles.editorStepBtnDisabled]}
                          onPress={() => onChangeLineCount(g.serviceTypeId, +1)}
                          disabled={o.agentCount >= 20}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Plus size={11} color={o.agentCount >= 20 ? colors.textMuted : g.accent} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {!excluded && (
                      <>
                        <Text style={styles.editorUniformLabel}>{t('create.slot_uniform_label')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.editorChipsRow}>
                          {UNIFORM_OPTIONS.map(opt => {
                            const active = o.slotUniform === opt.value;
                            return (
                              <TouchableOpacity
                                key={opt.value}
                                style={[
                                  styles.editorUniformChip,
                                  active && { backgroundColor: g.accent + '20', borderColor: g.accent },
                                ]}
                                onPress={() => onSetLineUniform(g.serviceTypeId, opt.value as UniformValue)}
                                hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                              >
                                <Text style={styles.editorUniformEmoji}>{opt.emoji}</Text>
                                <Text style={[styles.editorUniformText, active && { color: g.accent, fontFamily: fontFamily.bodySemiBold }]}>
                                  {opt.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </>
                    )}
                    {excluded && (
                      <Text style={styles.editorExcludedNote}>{t('create.slot_line_excluded_note')}</Text>
                    )}
                  </View>
                );
              })}

              <View style={styles.editorTotal}>
                <Users size={12} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.editorTotalText}>
                  {t('create.slot_total_agents', { count: slotAgents })}
                </Text>
              </View>
            </View>
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
// StepReview — with indicative price estimate
// ──────────────────────────────────────────────────────────────────────────────

interface StepReviewProps {
  form:        FormData;
  slots:       SlotDraft[];
  lines:       BookingLineLocal[];
  agentsTotal: number;
  isMultiSlot: boolean;
  onSetField:  <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onEditStep:  (step: Step) => void;
  t:           MissionsT;
}

const StepReview: React.FC<StepReviewProps> = ({
  form, slots, lines, agentsTotal, isMultiSlot, onSetField, onEditStep, t,
}) => {
  const singleDurH  = form.startAt && form.endAt ? durationHours(form.startAt, form.endAt) : 0;
  const multiTotalH = totalSlotHours(slots);

  // ── Agent-hours (operational metric, accurate) ──────────────────────────
  const estimatedAgentHours = useMemo(() => {
    if (!isMultiSlot) {
      return agentsTotal * singleDurH;
    }
    return slots.reduce((sum, s) => {
      const effective = buildEffectiveSlotLines(s, lines);
      return sum + totalAgentsInLines(effective) * durationHours(s.startAt, s.endAt);
    }, 0);
  }, [isMultiSlot, agentsTotal, singleDurH, slots, lines]);

  // ── Price estimate (indicative, not authoritative) ──────────────────────
  // Strategy: for each effective booking line we have a rate (from the picker)
  // and a count and an hours value. The real quote applies surcharges + VAT
  // — we deliberately don't try to match them here.
  const indicativePrice = useMemo(() => {
    const rateFor = (id: string): number => {
      const found = lines.find(l => l.serviceTypeId === id);
      return found?.ratePerHour ?? 0;
    };
    if (!isMultiSlot) {
      return lines.reduce(
        (sum, l) => sum + l.agentCount * singleDurH * (l.ratePerHour ?? 0),
        0,
      );
    }
    return slots.reduce((sum, s) => {
      const effective = buildEffectiveSlotLines(s, lines);
      const h = durationHours(s.startAt, s.endAt);
      return sum + effective.reduce(
        (lsum, l) => lsum + l.agentCount * h * rateFor(l.serviceTypeId),
        0,
      );
    }, 0);
  }, [isMultiSlot, lines, singleDurH, slots]);

  const showPriceEstimate = indicativePrice > 0 && lines.some(l => (l.ratePerHour ?? 0) > 0);

  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [slots],
  );
  const anyCustomized = slots.some(s => s.customized);

  return (
    <View style={styles.stepContent}>
      <StepHero Icon={Sparkles} title={t('create.review_title')} subtitle={t('create.review_subtitle')} />

      {/* Where recap */}
      <ReviewRow
        Icon={MapPin}
        label={t('create.summary_location')}
        value={`${form.address}, ${form.city}${form.zipCode ? ' · ' + form.zipCode : ''}`}
        onEdit={() => onEditStep(1)}
        t={t}
      />

      {/* When recap */}
      {!isMultiSlot ? (
        <ReviewRow
          Icon={CalendarClock}
          label={t('create.summary_when')}
          value={`${formatDateShort(form.startAt)} → ${formatDateShort(form.endAt)}`}
          meta={t('create.duration_hours', { hours: singleDurH.toFixed(1) })}
          onEdit={() => onEditStep(2)}
          t={t}
        />
      ) : (
        <View style={reviewS.multiWrap}>
          <View style={reviewS.headerRow}>
            <View style={reviewS.iconBox}>
              <CalendarClock size={16} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={reviewS.label}>{t('create.summary_slots')}</Text>
              <Text style={reviewS.meta}>{t('create.slots_total_duration', { hours: multiTotalH.toFixed(1), count: sortedSlots.length })}</Text>
            </View>
            <TouchableOpacity onPress={() => onEditStep(2)} style={reviewS.editBtn}>
              <Pencil size={12} color={colors.primary} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
          {sortedSlots.map((s, i) => {
            const effective = buildEffectiveSlotLines(s, lines);
            const slotAg    = totalAgentsInLines(effective);
            const slotDur   = durationHours(s.startAt, s.endAt);
            return (
              <View key={s.key} style={reviewS.slotBlock}>
                <View style={reviewS.slotLineHeader}>
                  <Text style={reviewS.slotIdx}>{i + 1}.</Text>
                  <Text style={reviewS.slotText}>
                    {formatDateShort(s.startAt)} → {formatDateShort(s.endAt)}
                  </Text>
                  <Text style={reviewS.slotDur}>{slotDur.toFixed(1)}h</Text>
                </View>
                <View style={reviewS.slotSummaryRow}>
                  {s.customized && (
                    <View style={reviewS.slotCustomBadge}>
                      <Settings2 size={9} color={colors.primary} strokeWidth={2.5} />
                      <Text style={reviewS.slotCustomBadgeText}>{t('create.custom_label')}</Text>
                    </View>
                  )}
                  <Text style={reviewS.slotAgents}>
                    {t('create.review_slot_summary', { agents: slotAg, hours: slotDur.toFixed(1) })}
                    {(s.customized || anyCustomized) && effective.length > 0
                      ? ' · ' + effective.map(l =>
                          `${l.agentCount}× ${l.name.split(' ')[0]} ${UNIFORM_EMOJI[l.agentUniforms[0] ?? 'STANDARD']}`
                        ).join(' · ')
                      : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Services recap */}
      <View style={reviewS.servicesWrap}>
        <View style={reviewS.headerRow}>
          <View style={reviewS.iconBox}>
            <Users size={16} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={reviewS.label}>
              {anyCustomized ? t('create.summary_services_default') : t('create.summary_services')}
            </Text>
            <Text style={reviewS.meta}>
              {t('create.total_agents', { count: agentsTotal, lines: lines.length })}
            </Text>
          </View>
          <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
        </View>
        {lines.map(l => (
          <View key={l.serviceTypeId} style={reviewS.serviceLine}>
            <View style={[reviewS.serviceDot, { backgroundColor: l.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={reviewS.serviceName}>{l.name}</Text>
              <Text style={reviewS.serviceMeta}>
                {l.agentUniforms.map(u => u ? UNIFORM_EMOJI[u] : '—').join(' ')}
              </Text>
            </View>
            <Text style={[reviewS.serviceCount, { color: l.accent }]}>×{l.agentCount}</Text>
          </View>
        ))}

        {estimatedAgentHours > 0 && (
          <View style={reviewS.agentHoursRow}>
            <Clock size={12} color={colors.primary} strokeWidth={2} />
            <Text style={reviewS.agentHoursText}>
              {t('create.review_agent_hours', { hours: estimatedAgentHours.toFixed(1) })}
            </Text>
          </View>
        )}
      </View>

      {/* ── Indicative price estimate ────────────────────────────────── */}
      {showPriceEstimate && (
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
          <Text style={priceS.note}>{t('create.review_estimate_note')}</Text>
        </View>
      )}

      {/* Optional title / notes */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <FileText size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.sectionTitle}>{t('create.optional_section')}</Text>
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
    gap:               spacing[2],
    backgroundColor:   colors.backgroundElevated,
    borderWidth:       1,
    borderColor:       colors.borderPrimary,
    borderRadius:      radius.xl,
    paddingHorizontal: spacing[3] + 2,
    paddingVertical:   spacing[3] + 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  label:   { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  amount:  { fontFamily: fontFamily.display, fontSize: fontSize.xl, color: colors.primary, letterSpacing: -0.4, marginTop: 2 },
  note: {
    fontFamily: fontFamily.body, fontSize: 11, color: colors.textSecondary,
    lineHeight: 16, fontStyle: 'italic',
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// Small bits
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
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[2],
  },
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

const ReviewRow: React.FC<{
  Icon:   React.FC<{ size: number; color: string; strokeWidth: number }>;
  label:  string;
  value:  string;
  meta?:  string;
  onEdit: () => void;
  t:      MissionsT;
}> = ({ Icon, label, value, meta, onEdit }) => (
  <View style={reviewS.row}>
    <View style={reviewS.iconBox}>
      <Icon size={16} color={colors.primary} strokeWidth={2} />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={reviewS.label}>{label}</Text>
      <Text style={reviewS.value} numberOfLines={2}>{value}</Text>
      {meta && <Text style={reviewS.meta}>{meta}</Text>}
    </View>
    <TouchableOpacity onPress={onEdit} style={reviewS.editBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Pencil size={12} color={colors.primary} strokeWidth={2.2} />
    </TouchableOpacity>
  </View>
);

const reviewS = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing[3] + 2,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  value: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  meta:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
  editBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  multiWrap: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing[3] + 2, gap: spacing[2],
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  slotBlock: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingVertical: spacing[2], paddingHorizontal: spacing[2] + 2,
    gap: spacing[1] + 2,
  },
  slotLineHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  slotIdx:  { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary, minWidth: 18 },
  slotText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary },
  slotDur:  { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary },
  slotSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  slotCustomBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing[2], paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
  },
  slotCustomBadgeText: { fontFamily: fontFamily.bodySemiBold, fontSize: 9, color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase' },
  slotAgents: { flex: 1, fontFamily: fontFamily.body, fontSize: 11, color: colors.textMuted, lineHeight: 16 },

  servicesWrap: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing[3] + 2, gap: spacing[2],
  },
  serviceLine: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2] + 2,
    paddingVertical: spacing[2], paddingHorizontal: spacing[2],
    backgroundColor: colors.surface, borderRadius: radius.md,
  },
  serviceDot:   { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  serviceName:  { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textPrimary },
  serviceMeta:  { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  serviceCount: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.base, flexShrink: 0 },
  agentHoursRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    paddingTop: spacing[2], marginTop: spacing[1],
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  agentHoursText: {
    fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs,
    color: colors.primary, letterSpacing: 0.2,
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// Shared styles
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: colors.background },
  scroll:      { paddingHorizontal: layout.screenPaddingH, paddingTop: spacing[4], paddingBottom: spacing[8] },
  stepContent: { gap: spacing[3] },
  row:         { flexDirection: 'row', gap: spacing[3] },
  half:        { flex: 1 },
  textArea:    { height: 90, textAlignVertical: 'top', paddingTop: spacing[3] },

  sectionBlock:  { gap: spacing[2], marginTop: spacing[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionTitle: {
    fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted,
    letterSpacing: 1.0, textTransform: 'uppercase',
  },

  // Multi-slot header (with exit affordance)
  multiHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            spacing[2],
  },
  exitMultiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing[2] + 2, paddingVertical: spacing[1] + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  exitMultiBtnText: {
    fontFamily: fontFamily.bodyMedium, fontSize: 10,
    color: colors.textMuted,
  },

  // Presets
  presetGrid: { flexDirection: 'row', gap: spacing[2] },
  presetCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[1] + 2,
    paddingVertical: spacing[4], paddingHorizontal: spacing[2],
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderPrimary,
    backgroundColor: colors.primarySurface,
    position: 'relative',
  },
  presetCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetActiveDot: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  presetLabel: {
    fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs,
    color: colors.primary, textAlign: 'center',
  },
  presetLabelActive: { color: colors.textInverse },

  // Slot card
  slotCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    padding: spacing[3] + 2, gap: spacing[2] + 2,
  },
  slotCardCustomized: { borderColor: colors.borderPrimary },
  slotCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  slotIdxBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.borderPrimary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  slotIdxText:        { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary },
  slotCardTitleBlock: { flex: 1, gap: 2, minWidth: 0 },
  slotCardTitle:      { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  slotCardDateSummary:{ fontFamily: fontFamily.body, fontSize: 10, color: colors.textSecondary },
  slotCardDatePending:{ fontFamily: fontFamily.body, fontSize: 10, color: colors.textMuted, fontStyle: 'italic' },
  slotDurPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primarySurface, borderRadius: radius.lg,
    paddingHorizontal: spacing[2], paddingVertical: 2,
    borderWidth: 1, borderColor: colors.borderPrimary,
  },
  slotDurPillText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10, color: colors.primary },
  slotRemoveBtn:   { padding: spacing[1] },

  // Copy-from chips
  copyChipsRow: { gap: spacing[2], paddingVertical: spacing[1] },
  copyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing[2] + 2, paddingVertical: spacing[1] + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    borderWidth: 1, borderColor: colors.borderPrimary,
  },
  copyChipText: { fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.primary },

  // Per-slot services
  slotServicesDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[1] },
  slotServicesDefault: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing[2],
  },
  slotServicesBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    paddingHorizontal: spacing[2] + 2, paddingVertical: spacing[1] + 2,
    borderRadius: radius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  slotServicesBadgeText: { fontFamily: fontFamily.bodyMedium, fontSize: 11, color: colors.textSecondary },
  customizeSlotBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1] + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    borderWidth: 1, borderColor: colors.borderPrimary,
  },
  customizeSlotBtnText: { fontFamily: fontFamily.bodySemiBold, fontSize: 11, color: colors.primary },

  // Customized
  customizedWrap: {
    gap: spacing[2],
    backgroundColor: colors.primarySurface + '40',
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderPrimary,
    padding: spacing[3],
  },
  customizedHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  customizedHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  customizedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  customizedTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
  resetCustomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing[2], paddingVertical: spacing[1],
  },
  resetCustomBtnText: { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textMuted, textDecorationLine: 'underline' },

  customPreviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    flexWrap: 'wrap',
  },
  customPreviewChip: {
    paddingHorizontal: spacing[2] + 2, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  customPreviewChipText: { fontFamily: fontFamily.bodySemiBold, fontSize: 10 },
  customPreviewEmpty: {
    fontFamily: fontFamily.body, fontSize: 11, color: colors.danger, fontStyle: 'italic',
  },
  customPreviewExpand: {
    fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.primary,
    marginLeft: 'auto',
  },

  // Per-line editor
  editorList: { gap: spacing[2], marginTop: spacing[1] },
  editorRow: {
    backgroundColor: colors.background,
    borderRadius: radius.lg, borderWidth: 1,
    padding: spacing[2] + 2, gap: spacing[2],
  },
  editorRowExcluded: { opacity: 0.55 },
  editorRowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  editorRowDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  editorRowName: { flex: 1, fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.textPrimary },
  editorRowNameExcluded: { textDecorationLine: 'line-through', color: colors.textMuted },
  editorStepper: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  editorStepBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  editorStepBtnDisabled: { opacity: 0.35 },
  editorStepCount: { fontFamily: fontFamily.display, fontSize: fontSize.base, minWidth: 18, textAlign: 'center' },
  editorUniformLabel: {
    fontFamily: fontFamily.bodyMedium, fontSize: 9,
    color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase',
  },
  editorChipsRow: { gap: spacing[1] + 2, alignItems: 'center' },
  editorUniformChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing[2] + 2, paddingVertical: spacing[1] + 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  editorUniformEmoji: { fontSize: 12 },
  editorUniformText:  { fontFamily: fontFamily.bodyMedium, fontSize: 10, color: colors.textSecondary },
  editorExcludedNote: {
    fontFamily: fontFamily.body, fontSize: 10, color: colors.textMuted,
    fontStyle: 'italic', textAlign: 'center',
  },
  editorTotal: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    paddingTop: spacing[2],
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  editorTotalText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.textSecondary },

  // Add slot
  addSlotBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing[2], paddingVertical: spacing[3],
    borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed' as any,
    borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface,
    marginTop: spacing[2],
  },
  addSlotText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
  addSlotHint: {
    fontFamily: fontFamily.body, fontSize: 11, color: colors.textMuted,
    textAlign: 'center', fontStyle: 'italic',
  },

  // Duration badge
  durationBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] + 2,
    backgroundColor: colors.primarySurface, borderRadius: radius.lg,
    padding: spacing[3], borderWidth: 1, borderColor: colors.borderPrimary,
    marginTop: spacing[2],
  },
  durationText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.primary },
  urgentRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  urgentText:   { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.primaryLight },

  // Errors
  errorBanner: {
    backgroundColor: 'rgba(225,29,72,0.12)',
    borderRadius: radius.lg, padding: spacing[3],
    borderWidth: 1, borderColor: colors.danger,
  },
  errorBannerText: { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.danger },

  // Footer — Back + Continue row
  footer: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop:        spacing[3],
    paddingBottom:     spacing[4],
    backgroundColor:   colors.background,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    gap:               spacing[2],
  },
  footerMeta: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing[1],
  },
  footerMetaText: {
    fontFamily:    fontFamily.bodyMedium,
    fontSize:      11,
    color:         colors.textMuted,
    letterSpacing: 0.3,
  },
  footerBtnRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing[2] + 2,
  },
  footerBackBtn: { flexShrink: 0, paddingHorizontal: spacing[4] },
  footerNextBtn: { flex: 1 },
});
