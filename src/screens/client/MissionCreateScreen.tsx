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
 *
 * Audit 2026-10-07 (Create Mission investigation) — location integrity:
 *   ─ Address, city, postcode and GPS are now updated TOGETHER from one source
 *     (a search result or the pin's reverse geocode). Picking an address used
 *     to keep the previous city when the result had none ("Paris" + 97615 +
 *     a Mayotte street), and moving the pin never touched city/postcode.
 *   ─ The location step checks city <-> GPS coherence (same official check the
 *     API now enforces) and offers a one-tap fix instead of failing at submit.
 *   ─ Postcode format validated; the address field mirrors the form state.
 *   ─ Edit mode hydrates ONCE: the effect depended on a fresh [] every render
 *     until the catalog loaded — re-fetching the mission on every render,
 *     looping forever if the catalog failed, and overwriting the user's edits
 *     if it arrived late. Catalog data is now merged into lines separately.
 *   ─ Single step indicator (stepper), no "Précédent" that silently exits on
 *     step 1, tab bar hidden for the flow (see MainNavigator).
 *   ─ Changing a slot's start keeps its duration instead of wiping the end.
 *
 * Audit 2026-10-07 — step 2 "Quand & agents":
 *   ─ PARTNERS could never finish: /quotes/calculate is CLIENT-only, so every
 *     partner order ended on "quote calculation failed" although the mission
 *     was saved. Partners no longer call it (who prices partner orders is an
 *     open business question — see the audit report).
 *   ─ Slot > 12 h showed "Durée maximum : 10 jours"; now the real rule.
 *   ─ Service catalog failure had no retry (order blocked) — retry added.
 *   ─ Validation scrolls to the first faulty slot; conflict chips jump to it.
 *   ─ Server errors are routed to the right step by their stable `key`, not
 *     by regex on translated text.
 *   ─ Presets show the actual day and hours they set ("Ce soir" after 19:00
 *     silently meant TOMORROW night).
 *   ─ New slots are pre-filled 24 h after the previous one (multi-night
 *     missions no longer need every date re-entered); end picker capped at
 *     start + 12 h with the 6–12 h rule shown up front.
 *   ─ Title / notes limits aligned with the API (120 / 1000).
 *   ─ "Urgent" computed on the Paris calendar, like the API and the web app.
 *
 * CEO decisions 2026-10-07:
 *   ─ Partner orders are B2B, priced by Provalk (ops alerted on creation);
 *     the partner is told the quote arrives within 1 business day.
 *   ─ Booking horizon: 12 months (picker + validation; API enforces too).
 *   ─ No price figure before the quote: the €/h is no longer shown in the
 *     service picker (same rationale as SHOW_INDICATIVE_ESTIMATE=false).
 *
 * Navigation audit 2026-10-07:
 *   ─ Success paths REPLACE the form (partner → missions list, edit → quote).
 *     They used navigate(), which stacked the destination on top: back then
 *     returned to the already-submitted form.
 *   ─ Android hardware back on step 2 returns to step 1 (it used to drop the
 *     whole flow, while the header/footer back went one step).
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView, Keyboard,
  Platform, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
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
import { queryClient }       from '@lib/queryClient';
import { qk }                from '@api/queryKeys';
import { quotesApi }         from '@api/endpoints/quotes';
import { serviceTypesApi }   from '@api/endpoints/serviceTypes';
import { geocodingApi }      from '@api/endpoints/geocoding';
import type { PickedPlace }  from '@components/ui/MapLocationPicker';
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
import { isTodayInParis, stepForApiKey } from '@utils/missionCreate';
import { moderationMessages, moderationOutcome } from '@utils/moderation';
import { ServiceTasksPicker, toServiceTasksPayload } from '@components/domain/ServiceTasksPicker';
// Mission times are entered and shown in Paris time (decision 2026-10-07).
import { parisParts, fromParis, inParis } from '@utils/parisTime';
import { colors }            from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { MissionStackParamList, ServiceType } from '@models/index';

type MissionsT = TFunction<'missions'>;
type Props     = NativeStackScreenProps<MissionStackParamList, 'MissionCreate'>;
type Step      = 1 | 2;

const TOTAL_STEPS = 2;

/**
 * Commercial gate (2026-09) - the indicative estimate is NOT surfaced during
 * creation. It renders a bare HT figure, stripped of night / week-end
 * surcharges and VAT, at the exact moment the client has not yet seen what
 * they get for it: the number reads as THE price and discourages the sale.
 * The definitive, fully-justified price lives on the quote screen, which is
 * built to present it.
 *
 * The computation below is deliberately KEPT rather than deleted, so the
 * block can be restored by flipping this single flag.
 */
const SHOW_INDICATIVE_ESTIMATE: boolean = false;

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
/** Booking horizon — mirrors the API's BOOKING_HORIZON_DAYS (CEO decision). */
const MAX_HORIZON_MS   = 365 * 24 * 3_600_000;

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

/** Same calendar day in Paris — the API's (priced) notion of an urgent mission. */
const isToday = (iso: string) => isTodayInParis(iso);

/** "ven. 20:00 → 02:00" — what a preset will actually set. */
function presetSummary(startIso: string, endIso: string): string {
  const s = new Date(startIso), e = new Date(endIso);
  const hm = (d: Date) => d.toLocaleTimeString(i18n.language, inParis({ hour: '2-digit', minute: '2-digit' }));
  return `${s.toLocaleDateString(i18n.language, inParis({ weekday: 'short', day: 'numeric' }))} · ${hm(s)}–${hm(e)}`;
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
  const opts: Intl.DateTimeFormatOptions = inParis({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `${s.toLocaleString(i18n.language, opts)} → ${e.toLocaleString(i18n.language, opts)}`;
}

/** French postcode, DOM included (5 digits). Mirrors the API DTO. */
const ZIP_RE = /^\d{5}$/;

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

// Presets are Paris wall-clock times: "Ce soir 20:00" is 20:00 in Paris on any
// phone (it was 20:00 in the phone's zone — 22:00 in Paris on a UTC phone).
const iso = (d: Date) => d.toISOString();

function makeTonight() {
  const p = parisParts(new Date());
  let day = p.day;
  if (fromParis(p.year, p.month, day, 20, 0).getTime() < Date.now() + MIN_FUTURE_HOURS * 3_600_000) day += 1;
  return { startAt: iso(fromParis(p.year, p.month, day, 20, 0)), endAt: iso(fromParis(p.year, p.month, day + 1, 2, 0)) };
}

function makeTomorrow() {
  const p = parisParts(new Date());
  return { startAt: iso(fromParis(p.year, p.month, p.day + 1, 8, 0)), endAt: iso(fromParis(p.year, p.month, p.day + 1, 20, 0)) };
}

function makeWeekend() {
  const p = parisParts(new Date());
  const offset = (6 - p.weekday + 7) % 7 || 7; // next Saturday (Paris calendar)
  return {
    startAt: iso(fromParis(p.year, p.month, p.day + offset, 20, 0)),
    endAt:   iso(fromParis(p.year, p.month, p.day + offset + 1, 2, 0)),
  };
}

/** Same Paris wall-clock time on the next calendar day (DST-safe, unlike +24 h). */
function nextParisDay(isoStr: string): string {
  const p = parisParts(new Date(isoStr));
  return fromParis(p.year, p.month, p.day + 1, p.hour, p.minute).toISOString();
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
  // Partner mode detection. SecurBookingApp now hosts both CLIENT and
  // PARTNER experiences. PARTNER users land here via PartnerNavigator's
  // PartnerCreateMission route and reuse this exact screen. Backend's
  // POST /missions/create auto-routes by JWT role, so no payload change
  // is needed; only the title and the success route differ.
  const isPartner = useAuthStore(s => s.user?.role === 'PARTNER');

  // Edit mode: when editMissionId is set, the screen edits an existing draft
  // (brouillon) instead of creating a new mission. Draft autosave/restore is
  // disabled so a half-finished *new* draft can't clobber the loaded mission.
  const editMissionId = (route.params as any)?.editMissionId as string | undefined;
  const isEditMode    = !!editMissionId;
  const [hydrating, setHydrating] = useState<boolean>(isEditMode);

  // Service catalog — fetched here now that ServicePicker is gone.
  const { data: services, loading: servicesLoading, error: servicesError, execute: loadServices } =
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
  // Hydrate ONCE per mission id (see header note: the old dependency on a
  // render-fresh serviceTypes array re-ran this on every render).
  const hydratedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isEditMode || !editMissionId) return;
    if (hydratedForRef.current === editMissionId) return;
    hydratedForRef.current = editMissionId;
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
        // Tasks already ordered, regrouped by service so they show ticked.
        if (!cancelled) {
          const grouped: Record<string, string[]> = {};
          for (const task of (mission.serviceTasks ?? []) as Array<{ serviceTypeId: string; code: string }>) {
            (grouped[task.serviceTypeId] ??= []).push(task.code);
          }
          setServiceTasks(grouped);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editMissionId]);

  const [step,    setStep]    = useState<Step>(1);
  const [form,    setForm]    = useState<FormData>(INITIAL_FORM);
  /** Tasks ticked per service (GET /service-tasks); the mission = service + these. */
  const [serviceTasks, setServiceTasks] = useState<Record<string, string[]>>({});
  const [slots,   setSlots]   = useState<SlotDraft[]>(() => ([{
    key: nextKey(), startAt: '', endAt: '', lines: seedLines, pickerOpen: seedLines.length === 0,
  }]));
  const [errors,  setErrors]  = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [mapScrollLocked, setMapScrollLocked] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  const isMultiSlot = slots.length > 1;
  const agentsTotal = useMemo(() => allAgents(slots), [slots]);

  // Fill catalog-derived fields (name, rate, allowed uniforms) on lines that
  // were hydrated / restored before the catalog arrived. Only patches empty
  // fields — never touches counts, uniforms or anything the user edited.
  useEffect(() => {
    if (serviceTypes.length === 0) return;
    setSlots(prev => {
      let changed = false;
      const next = prev.map(s => ({
        ...s,
        lines: s.lines.map(l => {
          if (l.name && l.allowedUniforms.length > 0) return l;
          const svc = serviceTypes.find(x => x.id === l.serviceTypeId);
          if (!svc) return l;
          changed = true;
          return {
            ...l,
            name:            l.name || svc.name,
            accent:          l.name ? l.accent : getServiceMeta(svc.name).accent,
            ratePerHour:     l.ratePerHour || svc.baseRatePerHour,
            allowedUniforms: l.allowedUniforms.length ? l.allowedUniforms : allowedUniformsForService(svc),
          };
        }),
      }));
      return changed ? next : prev;
    });
  // Re-runs after hydration / draft restore too; returns the same state when
  // nothing is missing, so it cannot loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, slots]);

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
  // A location issue found on step 1 (GPS point not in the declared city).
  const [locationIssue, setLocationIssue] = useState<{
    declared: string; resolvedCity: string; resolvedZip: string;
  } | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);

  /**
   * Search result → address, city, postcode and GPS replaced TOGETHER.
   * Never fall back to the previous city/postcode: a value from another
   * address is worse than an empty field the user is asked to fill.
   */
  const handleAddressSelect = useCallback((r: NominatimResult) => {
    // The keyboard stayed open over the map after a pick (seen on device).
    Keyboard.dismiss();
    const a = r.address;
    const road = a.road ?? '', num = a.house_number ?? '';
    setForm(p => ({
      ...p,
      address:   (num ? `${num} ${road}` : road) || r.display_name.split(',')[0],
      city:      a.city ?? a.town ?? a.village ?? '',
      zipCode:   a.postcode ?? '',
      latitude:  parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    }));
    setLocationIssue(null);
    setErrors(e => ({ ...e, address: undefined, city: undefined, zipCode: undefined, latitude: undefined }));
  }, []);

  /** Free typing in the address field keeps the form in sync with the screen. */
  const handleAddressChange = useCallback((text: string) => {
    setForm(p => ({ ...p, address: text }));
    setErrors(e => (e.address ? { ...e, address: undefined } : e));
  }, []);

  /**
   * Pin placed / moved. Coordinates are committed at once; when the reverse
   * geocode answers, street, city and postcode follow the pin so the four
   * fields always describe the same place.
   */
  const handleMapSelect = useCallback((coords: { latitude: number; longitude: number }, place?: PickedPlace) => {
    setForm(p => ({
      ...p,
      latitude:  coords.latitude,
      longitude: coords.longitude,
      ...(place ? {
        address: place.shortName || p.address,
        city:    place.city || p.city,
        zipCode: place.zipCode || p.zipCode,
      } : {}),
    }));
    setLocationIssue(null);
    setErrors(e => ({ ...e, latitude: undefined, ...(place ? { address: undefined, city: undefined, zipCode: undefined } : {}) }));
  }, []);

  const applyResolvedLocation = useCallback(() => {
    if (!locationIssue) return;
    setForm(p => ({ ...p, city: locationIssue.resolvedCity, zipCode: locationIssue.resolvedZip || p.zipCode }));
    setLocationIssue(null);
  }, [locationIssue]);

  const setFieldTracked = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm(p => ({ ...p, [k]: v }));
    if (k === 'city' || k === 'zipCode') {
      setLocationIssue(null);
      setErrors(e => (e[k] ? { ...e, [k]: undefined } : e));
    }
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
      // ...and its schedule as "same hours, next day": the common case for
      // multi-day guarding (5 nights = 4 taps instead of 8 date pickers).
      // Still fully editable; overlap rules are re-checked at validation.
      const ls = last.startAt ? new Date(last.startAt).getTime() : NaN;
      const le = last.endAt ? new Date(last.endAt).getTime() : NaN;
      const hasDates = !isNaN(ls) && !isNaN(le) && le > ls;
      return [...prev, {
        key:       nextKey(),
        startAt:   hasDates ? nextParisDay(last.startAt) : '',
        endAt:     hasDates ? nextParisDay(last.endAt) : '',
        lines:     seeded,
        pickerOpen: seeded.length === 0,
      }];
    });
  }, []);

  // ── Scroll-to-slot (validation errors, conflict chips) ───────────────────
  // Slot cards report their y inside the step container, which reports its
  // own y inside the scroll content; the sum is the scroll offset.
  const stepRootYRef = useRef(0);
  const slotYRef     = useRef<Record<string, number>>({});
  const scrollToSlot = useCallback((key: string) => {
    const y = stepRootYRef.current + (slotYRef.current[key] ?? 0);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing[3]), animated: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (form.zipCode.trim() && !ZIP_RE.test(form.zipCode.trim())) e.zipCode = t('create.zip_invalid');
      if (form.latitude == null || form.longitude == null ||
          (form.latitude === 0 && form.longitude === 0)) e.latitude = t('create.map_position_required');
    }

    if (target >= 2) {
      const minStart = new Date(Date.now() + MIN_FUTURE_HOURS * 3_600_000);
      const valid: Array<{ start: Date; end: Date; key: string }> = [];
      slots.forEach(s => {
        if (!s.startAt) { e[`slot_${s.key}_startAt`] = t('create.slot_start_required'); return; }
        if (!s.endAt)   { e[`slot_${s.key}_endAt`]   = t('create.slot_end_required');   return; }
        if (new Date(s.startAt).getTime() > Date.now() + MAX_HORIZON_MS) {
          e[`slot_${s.key}_startAt`] = t('create.beyond_horizon'); return;
        }
        const start = new Date(s.startAt), end = new Date(s.endAt);
        if (end <= start) { e[`slot_${s.key}_endAt`] = t('create.slot_end_before_start'); return; }
        const d = durationHours(s.startAt, s.endAt);
        if (d < MIN_DURATION_H) { e[`slot_${s.key}_endAt`] = t('create.slot_duration_min'); return; }
        if (d > MAX_DURATION_H) { e[`slot_${s.key}_endAt`] = t('create.slot_duration_max'); return; }
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
    const ok = Object.keys(e).filter(k => e[k]).length === 0;
    // Step 2 errors can be several screens down: bring the first one into view.
    if (!ok && target >= 2) {
      const first = slots.find(s => Object.keys(e).some(k => k.startsWith(`slot_${s.key}_`)));
      if (first) setTimeout(() => scrollToSlot(first.key), 50);
    }
    return ok;
  };

  /**
   * Step 1 → 2: check that the GPS point really is in the declared city,
   * using the same official check the API enforces at creation. Only a
   * positive mismatch (point reverse-geocoded to another commune) stops the
   * user; timeouts, outages and "unverifiable" let them through — the server
   * re-checks anyway.
   */
  const checkLocationCoherence = async (): Promise<boolean> => {
    if (form.latitude == null || form.longitude == null) return true;
    setCheckingLocation(true);
    try {
      const { data: res } = await geocodingApi.validateCoherence({
        city: form.city.trim(), latitude: form.latitude, longitude: form.longitude,
      });
      const v = (res as any)?.data ?? res;
      if (v?.verdict === 'incoherent' && v.resolved?.city) {
        setLocationIssue({
          declared:     v.declared?.name ?? form.city.trim(),
          resolvedCity: v.resolved.city,
          resolvedZip:  v.resolved.zipCode ?? '',
        });
        return false;
      }
      return true;
    } catch {
      return true;
    } finally {
      setCheckingLocation(false);
    }
  };

  const handleNext = async () => {
    if (checkingLocation) return;
    if (!validate(step)) return;
    if (step === 1 && !(await checkLocationCoherence())) return;
    if (step < TOTAL_STEPS) {
      setStep(s => (s + 1) as Step);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }
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

  // ── Android hardware back / swipe-back: step 2 → step 1 ───────────────────────
  // The header/footer back went one step, but the system back left the whole
  // flow. Intercept a BACK-type removal while on step 2; success navigations
  // set leavingRef so they are never blocked.
  const leavingRef = useRef(false);
  const stepRef    = useRef<Step>(1);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (leavingRef.current || stepRef.current === 1) return;
    const type = e.data.action.type;
    if (type !== 'GO_BACK' && type !== 'POP') return;
    e.preventDefault();
    setStep(1);
  }), [navigation]);
  /**
   * Id of the mission this screen has ALREADY created, if any.
   *
   * handleSubmit does two writes: create the mission, then ask the backend to
   * compute its quote. When the second one fails the first has already
   * committed - the comment in the catch block is explicit that we must NOT
   * roll it back. But the user is shown a creation-failure banner, so they
   * press the button again, and the old code went straight back into
   * missionsApi.create(): one extra mission in the database per retry.
   *
   * A ref, not state: it must survive re-renders without triggering one, and
   * it is read inside an async handler where a stale closure over state would
   * defeat the whole point.
   */
  const createdMissionIdRef = useRef<string | null>(null);
  /**
   * `maintain`: the client saw a moderation warning on its notes and keeps
   * them. They are then reviewed by Provalk before any officer sees them.
   */
  const handleSubmit = async (maintain = false) => {
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
      const orderedServiceIds = [
        ...new Set(sortedSlots.flatMap(s => slotApiLines(s).map(l => l.serviceTypeId))),
      ];
      const missionPayload: Parameters<typeof missionsApi.create>[0] = {
        ...base,
        serviceTasks: toServiceTasksPayload(serviceTasks, orderedServiceIds),
        moderationInteractive: true,
        ...(maintain ? { moderationMaintain: true } : {}),
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
      } else if (createdMissionIdRef.current) {
        // Retry after a failed quote calculation: the mission exists. Skip
        // creation entirely and fall through to quotesApi.calculate below.
        mission = { id: createdMissionIdRef.current };
        createdMissionId = createdMissionIdRef.current;
      } else {
        const { data: mRes } = await missionsApi.create(missionPayload);
        mission = (mRes as any).data;
        createdMissionId = mission.id;
        createdMissionIdRef.current = mission.id;
      }

      // The missions list is a TanStack query with a 5-minute staleTime, and
      // this screen writes through the raw API client rather than through
      // useCreateMission - so nothing ever told the cache the world changed.
      // Net effect for the client: they create a mission, land on the quote,
      // go back to Missions, and it is NOT THERE. refetchOnMount is true but
      // only refetches STALE data, so the list stays frozen for up to five
      // minutes until a pull-to-refresh. The mission looked like it had
      // vanished; it had simply never been fetched.
      //
      // Invalidation matches by PREFIX, so qk.missions.all = ['missions']
      // covers the list (mine()) and every detail entry (detail(id)) in one
      // call. Do not narrow this to mine() - a fresh mission also affects any
      // detail entry the user may already have cached.
      queryClient.invalidateQueries({ queryKey: qk.missions.all });

      // Backend derives quote lines from existing Booking rows (created in the
      // mission transaction above). Only missionId is needed.
      // Partners get their quote on the funding screen they land on next
      // (it calculates on open), so it is not computed twice here.
      if (!isPartner) {
        await quotesApi.calculate({ missionId: mission.id });
      }

      if (!isEditMode && userId) missionDraftStorage.clear(userId);
      leavingRef.current = true; // let the success navigation through
      if (isEditMode) {
        toast.success(t('edit.saved_toast'));
        navigation.replace('QuoteDetail', { missionId: mission.id });
      } else if (isPartner) {
        toast.success(t('create.partner_created_toast'));
        // Partner success path: REPLACE the form with the funding screen
        // (quote -> accept -> bank transfer), which publishes the mission once
        // paid. Same stack (PartnerHomeStack); typed for MissionStackParamList,
        // hosted there at runtime — cast to bridge.
        (navigation as unknown as {
          replace: (name: string, params: { missionId: string; bookingLines: [] }) => void;
        }).replace('PartnerMissionFunding', { missionId: mission.id, bookingLines: [] });
      } else {
        navigation.replace('QuoteDetail', { missionId: mission.id });
      }
    } catch (err: unknown) {
      // Moderation of the notes (docs/mission-tasks in the API). A refusal
      // must be edited; an out-of-scope note can be edited or kept.
      const moderation = moderationOutcome(err);
      if (moderation) {
        const lines = moderationMessages(moderation, i18n.language ?? 'fr');
        const tt = i18n.getFixedT(null, 'mission_tasks');
        if (moderation.kind === 'confirm') {
          Alert.alert(
            tt('moderation_confirm_title'),
            [...lines, tt('moderation_maintain_hint')].join('\n\n'),
            [
              { text: tt('moderation_fix'), style: 'cancel' },
              { text: tt('moderation_maintain'), onPress: () => { void handleSubmit(true); } },
            ],
          );
        } else {
          setSubmitError({ title: tt('moderation_blocked_title'), details: lines, jumpTo: 2 });
        }
        return;
      }
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

      // Prefer the API's stable error key (I18nExceptionFilter returns it);
      // fall back to the text for class-validator messages, which have none.
      const apiKey: string = (err as any)?.response?.data?.key ?? '';
      const joined = details.join(' ').toLowerCase();
      const jumpTo: Step | null = stepForApiKey(apiKey)
        ?? (/(address|city|zipcode|latitude|longitude|adresse|ville|postal|gps)/.test(joined) ? 1
        : /(start|end|duration|slot|durée|creneau|créneau|heure|agent|service|prestation|tenue)/.test(joined) ? 2
        : null);

      // When createdMissionId is set, the mission DID commit and only the
      // downstream quote calculation failed. Telling the user 'Unable to
      // create the mission' there is simply false, and it is exactly what
      // pushed people into pressing the button again - see the note on
      // createdMissionIdRef for the duplicate rows that used to produce.
      setSubmitError({
        title: createdMissionId
          ? t('create.submit_error_title_quote')
          : t('create.submit_error_title'),
        details,
        jumpTo,
      });

      if (createdMissionId) {
        // The message and the action label used to be the SAME i18n key, so
        // the toast body and its button both read 'Get a quote' and nothing
        // told the user their mission had actually been saved.
        toast.info(t('create.submit_quote_retry'), {
          action: {
            label:   t('create.submit_quote_open_mission'),
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
  const headerTitles: Record<Step, string> = isPartner
    ? {
        // Partner: single title — partner i18n does not split per-step.
        1: t('partner:createMission.title' as never),
        2: t('partner:createMission.title' as never),
      }
    : {
        // The stepper below already says "1 Lieu — 2 Quand & agents"; the
        // header names the task instead of repeating the step a third time.
        1: t('create.screen_title_new'),
        2: t('create.screen_title_new'),
      };

  const nextLabel = step === 1
    ? t('create.next_to_staff')
    : isEditMode ? t('edit.save_btn') : t('create.create_btn');

  // While loading an existing draft in edit mode, show a centered spinner so we
  // never flash empty create-mode fields before hydration completes.
  // -- Keyboard handling ---------------------------------------------------
  // AndroidManifest declares adjustResize, so the window shrinks when the
  // keyboard opens - but React Native does NOT scroll the focused TextInput
  // into the shortened viewport, and KeyboardAvoidingView is a no-op on
  // Android when no ehavior is set. The Notes / instructions field sits at
  // the very bottom of step 2, so it ended up UNDER the keyboard and the user
  // was typing blind. Two things fix it: scroll the tail of the form into
  // view on focus, and drop the footer (~110px of an already-shortened
  // viewport) for as long as the keyboard is up.
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  /**
   * Focus handler for the trailing free-text fields. The delay lets the
   * Android resize land first - scrolling before it does puts the viewport
   * straight back where it started.
   */
  const scrollToTail = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

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
        ref={scrollRef}
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
          <CrossSlotErrorBanner offenders={crossSlotErrorSlots} onJump={scrollToSlot} t={t} />
        )}

        {step === 1 && (
          <StepWhere
            form={form}
            errors={errors}
            locationIssue={locationIssue}
            onAddressSelect={handleAddressSelect}
            onAddressChange={handleAddressChange}
            onMapSelect={handleMapSelect}
            onMapInteraction={setMapScrollLocked}
            onSetField={setFieldTracked}
            onApplyResolved={applyResolvedLocation}
            onDismissIssue={() => setLocationIssue(null)}
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
            servicesError={!!servicesError && serviceTypes.length === 0}
            onRetryServices={loadServices}
            onRootLayout={y => { stepRootYRef.current = y; }}
            onSlotLayout={(key, y) => { slotYRef.current[key] = y; }}
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
            onFieldFocus={scrollToTail}
            serviceTasks={serviceTasks}
            onChangeServiceTasks={setServiceTasks}
            t={t}
          />
        )}
      </ScrollView>

      {/* ── Smart footer: Back + Continue/Create ────────────────────── */}
      {!keyboardOpen && (
      <View style={styles.footer}>
        {/* Step 2 only: a useful summary. On step 1 "Étape 1 sur 2" just
            repeated the stepper and the header. */}
        {step >= 2 && totalSlotHours(slots) > 0 && (
          <View style={styles.footerMeta}>
            <Text style={styles.footerMetaText}>
              {t('create.slots_total_short', { count: slots.length, hours: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(totalSlotHours(slots)) })}
            </Text>
          </View>
        )}
        <View style={styles.footerBtnRow}>
          {/* On step 1 "Précédent" silently left the whole flow; the header
              back arrow already does that, explicitly. */}
          {step > 1 && (
            <Button
              label={t('create.footer_back')}
              onPress={handleBack}
              variant="ghost"
              size="lg"
              leftIcon={<ChevronLeft size={16} color={colors.textSecondary} strokeWidth={2.2} />}
              style={styles.footerBackBtn}
            />
          )}
          <Button
            label={checkingLocation ? t('create.location_checking') : nextLabel}
            onPress={handleNext}
            loading={loading || checkingLocation}
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
      )}
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
  onJump:    (key: string) => void;
  t:         MissionsT;
}> = ({ offenders, onJump, t }) => (
  <View style={crossSlotErrS.wrap}>
    <View style={crossSlotErrS.headerRow}>
      <AlertTriangle size={15} color={colors.danger} strokeWidth={2.2} />
      <Text style={crossSlotErrS.title}>{t('create.cross_slot_error_title')}</Text>
    </View>
    <Text style={crossSlotErrS.subtitle}>{t('create.cross_slot_error_subtitle')}</Text>
    <View style={crossSlotErrS.chipsRow}>
      {offenders.map(o => (
        <TouchableOpacity
          key={o.key}
          style={crossSlotErrS.chip}
          onPress={() => onJump(o.key)}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={t('create.cross_slot_error_jump', { n: o.idx + 1 })}
        >
          <Text style={crossSlotErrS.chipText}>{t('create.cross_slot_error_jump', { n: o.idx + 1 })}</Text>
        </TouchableOpacity>
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
  locationIssue:    { declared: string; resolvedCity: string; resolvedZip: string } | null;
  onAddressSelect:  (r: NominatimResult) => void;
  onAddressChange:  (text: string) => void;
  onMapSelect:      (c: { latitude: number; longitude: number }, place?: PickedPlace) => void;
  onMapInteraction: (locked: boolean) => void;
  onSetField:       <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onApplyResolved:  () => void;
  onDismissIssue:   () => void;
  t:                MissionsT;
}

const StepWhere: React.FC<StepWhereProps> = ({
  form, errors, locationIssue, onAddressSelect, onAddressChange, onMapSelect,
  onMapInteraction, onSetField, onApplyResolved, onDismissIssue, t,
}) => (
  <View style={styles.stepContent}>
    <StepHero Icon={MapPin} title={t('create.where_title')} subtitle={t('create.where_subtitle')} />
    <AddressSearch
      value={form.address}
      error={errors.address}
      onSelect={onAddressSelect}
      onChangeText={onAddressChange}
      label={t('create.address_label')}
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
          onChangeText={v => onSetField('zipCode', v.replace(/\D/g, '').slice(0, 5))}
          keyboardType="number-pad"
          maxLength={5}
          placeholder={t('create.zip_placeholder')}
          error={errors.zipCode}
          leftIcon={<MapPin size={16} color={colors.textMuted} strokeWidth={1.8} />}
        />
      </View>
    </View>
    <MapLocationPicker
      latitude={form.latitude ?? undefined}
      longitude={form.longitude ?? undefined}
      onSelect={onMapSelect}
      onInteractionChange={onMapInteraction}
      focusQuery={[form.zipCode, form.city].map(s => s.trim()).filter(Boolean).join(' ')}
    />
    {errors.latitude && (
      <View style={styles.errorBanner}><Text style={styles.errorBannerText}>{errors.latitude}</Text></View>
    )}
    {locationIssue && (
      <View style={styles.issueBanner} accessibilityRole="alert">
        <View style={styles.issueHeader}>
          <AlertTriangle size={16} color={colors.warning} strokeWidth={2.2} />
          <Text style={styles.issueText}>
            {t('create.location_incoherent', {
              resolved: `${locationIssue.resolvedCity}${locationIssue.resolvedZip ? ` (${locationIssue.resolvedZip})` : ''}`,
              declared: locationIssue.declared,
            })}
          </Text>
        </View>
        <View style={styles.issueActions}>
          <TouchableOpacity style={styles.issuePrimary} onPress={onApplyResolved} activeOpacity={0.85} accessibilityRole="button">
            <Check size={14} color={colors.textInverse} strokeWidth={2.4} />
            <Text style={styles.issuePrimaryText}>
              {t('create.location_use_resolved', { resolved: locationIssue.resolvedCity })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.issueSecondary} onPress={onDismissIssue} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.issueSecondaryText}>{t('create.location_keep')}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  servicesError:     boolean;
  onRetryServices:   () => void;
  onRootLayout:      (y: number) => void;
  onSlotLayout:      (key: string, y: number) => void;
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
  /** Scrolls the form tail above the keyboard when a trailing field is focused. */
  onFieldFocus:      () => void;
  /** Tasks ticked per service (the mission = service + these tasks). */
  serviceTasks:          Record<string, string[]>;
  onChangeServiceTasks:  (next: Record<string, string[]>) => void;
  t:                 MissionsT;
}

const StepWhenWho: React.FC<StepWhenWhoProps> = ({
  form, slots, errors, activePreset, serviceTypes, servicesLoading, servicesError, onRetryServices,
  onRootLayout, onSlotLayout, agentsTotal,
  onApplyPreset, onSetField, onAddSlot, onRemoveSlot, onUpdateSlotDates,
  onCopyFromSlot, onTogglePicker, onAddLine, onRemoveLine, onChangeLineCount, onSetLineUniform,
  onFieldFocus, serviceTasks, onChangeServiceTasks, t,
}) => {
  const { t: tt } = useTranslation('mission_tasks');
  const orderedServiceIds = useMemo(
    () => [...new Set(slots.flatMap(s => s.lines.map(l => l.serviceTypeId)))].filter(Boolean),
    [slots],
  );
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

  const showPrice = SHOW_INDICATIVE_ESTIMATE
    && indicativePrice > 0
    && slots.some(s => s.lines.some(l => (l.ratePerHour ?? 0) > 0));

  return (
    <View style={styles.stepContent} onLayout={e => onRootLayout(e.nativeEvent.layout.y)}>
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
              const built = p.build();
              const summary = presetSummary(built.startAt, built.endAt);
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.presetCard, isActive && styles.presetCardActive]}
                  onPress={() => onApplyPreset(p)}
                  activeOpacity={0.78}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${t(p.i18n as any)}, ${summary}`}
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
                  {/* What it actually sets — "Ce soir" after 19:00 is tomorrow. */}
                  <Text style={[styles.presetSub, isActive && styles.presetSubActive]} numberOfLines={1}>
                    {summary}
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
          servicesError={servicesError}
          onRetryServices={onRetryServices}
          onLayoutY={y => onSlotLayout(slot.key, y)}
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
          <Check size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.sectionTitle} accessibilityRole="header">{tt('section_title')}</Text>
        </View>
        <Text style={styles.tasksHint}>{tt('section_hint')}</Text>
        <ServiceTasksPicker
          serviceTypeIds={orderedServiceIds}
          value={serviceTasks}
          onChange={onChangeServiceTasks}
        />
      </View>

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
          onFocus={onFieldFocus}
          leftIcon={<Pencil size={16} color={colors.textMuted} strokeWidth={1.8} />}
          maxLength={120}
        />
        <Input
          label={t('create.notes_label')}
          value={form.notes}
          onChangeText={v => onSetField('notes', v)}
          placeholder={t('create.instructions_placeholder')}
          onFocus={onFieldFocus}
          multiline
          numberOfLines={3}
          maxLength={1000}
          style={styles.textArea}
          leftIcon={<FileText size={16} color={colors.textMuted} strokeWidth={1.8} />}
        />
        <Text style={styles.tasksHint}>{tt('notes_hint')}</Text>
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
  servicesError:     boolean;
  onRetryServices:   () => void;
  onLayoutY:         (y: number) => void;
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
  slot, idx, prevSlot, allSlots, minDate, errors, serviceTypes, servicesLoading,
  servicesError, onRetryServices, onLayoutY, canRemove,
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
  // Legal ceiling (12 h) enforced in the picker itself, not only at Continue.
  const slotMaxEnd = slot.startAt
    ? new Date(new Date(slot.startAt).getTime() + MAX_DURATION_H * 3_600_000)
    : undefined;

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
    <View
      style={[styles.slotCard, agents > 0 && styles.slotCardStaffed, (startErr || endErr || linesErr) && styles.slotCardError]}
      onLayout={e => onLayoutY(e.nativeEvent.layout.y)}
    >
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
        maxDate={new Date(Date.now() + MAX_HORIZON_MS)}
        onChange={v => {
          // Moving the start keeps the slot's duration (it used to wipe the
          // end, forcing the user to re-enter it every time).
          const dur = slot.startAt && slot.endAt
            ? new Date(slot.endAt).getTime() - new Date(slot.startAt).getTime()
            : 0;
          const endAt = dur > 0 && v ? new Date(new Date(v).getTime() + dur).toISOString() : '';
          onUpdateDates({ startAt: v, endAt });
        }}
        minDate={slotMin}
        error={startErr}
      />
      <DateTimePicker
        label={t('create.end_label')}
        value={slot.endAt}
        onChange={v => onUpdateDates({ endAt: v })}
        minDate={slotMinEnd}
        maxDate={slotMaxEnd}
        error={endErr}
        hint={t('create.slot_duration_hint')}
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
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('create.remove_agent_a11y')}
                accessibilityState={{ disabled: line.agentCount <= 1 }}
              >
                <Minus size={11} color={line.agentCount <= 1 ? colors.textMuted : line.accent} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={[styles.lineStepCount, { color: line.accent }]}>{line.agentCount}</Text>
              <TouchableOpacity
                style={[styles.lineStepBtn, line.agentCount >= MAX_AGENTS && styles.lineStepBtnDisabled]}
                onPress={() => onChangeLineCount(line.serviceTypeId, +1)}
                disabled={line.agentCount >= MAX_AGENTS}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={i18n.t('common:add_agent')}
                accessibilityState={{ disabled: line.agentCount >= MAX_AGENTS }}
              >
                <Plus size={11} color={line.agentCount >= MAX_AGENTS ? colors.textMuted : line.accent} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => onRemoveLine(line.serviceTypeId)} style={styles.lineRemoveBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={t('create.remove_service_a11y')}>
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
          ) : servicesError ? (
            // Was a dead end ("Aucun service disponible", no way out).
            <View style={styles.pickerErrorWrap} accessibilityRole="alert">
              <Text style={styles.pickerEmpty}>{t('create.staff_load_error')}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={onRetryServices} activeOpacity={0.8} accessibilityRole="button">
                <RotateCcw size={13} color={colors.primary} strokeWidth={2.2} />
                <Text style={styles.retryText}>{i18n.t('common:retry')}</Text>
              </TouchableOpacity>
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
                    {/* No €/h here (CEO decision): a bare HT rate without night /
                        week-end surcharges or VAT reads as THE price. The quote
                        presents the real, justified price. */}
                    {svc.description ? (
                      <Text style={styles.pickerDesc} numberOfLines={2}>{svc.description}</Text>
                    ) : null}
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
  tasksHint:   { color: colors.textMuted, fontSize: fontSize.xs, marginBottom: spacing[2] },

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
  presetSub:         { fontFamily: fontFamily.body, fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  presetSubActive:   { color: colors.textInverse },
  slotCardError:     { borderColor: colors.danger },
  pickerErrorWrap:   { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[3] },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    paddingHorizontal: spacing[4], minHeight: 40, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.borderPrimary, backgroundColor: colors.primarySurface,
  },
  retryText: { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.xs, color: colors.primary },

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
  // 32dp + 8dp hitSlop each side = 48dp effective touch target.
  lineStepBtn: {
    width: 32, height: 32, borderRadius: 16,
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
  pickerDesc: { fontFamily: fontFamily.body, fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: fontSize.xs * 1.45 },
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

  // Location coherence issue (step 1)
  issueBanner: {
    backgroundColor: colors.warningSurface, borderRadius: radius.lg, padding: spacing[3],
    borderWidth: 1, borderColor: colors.warningBorder, gap: spacing[3],
  },
  issueHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  issueText:    { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: fontSize.sm * 1.45 },
  issueActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[3] },
  issuePrimary: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: spacing[4], minHeight: 40,
  },
  issuePrimaryText:   { fontFamily: fontFamily.bodySemiBold, fontSize: fontSize.sm, color: colors.textInverse },
  issueSecondary:     { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing[2] },
  issueSecondaryText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, color: colors.textSecondary, textDecorationLine: 'underline' },

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
