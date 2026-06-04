/**
 * missionDraftStorage — Per-user AsyncStorage persistence for in-flight mission drafts.
 *
 * Why this exists
 * ──────────────
 * Enterprise users routinely lose 5+ minutes of input when the app is force-closed,
 * the network drops mid-submit, or they get a phone call and the OS evicts the JS
 * runtime. This module saves the create-mission form at every meaningful keystroke
 * (debounced) so it can be restored on next launch.
 *
 * Scope
 * ─────
 * Per-user (key embeds the userId). When a user logs out via authStore.logout(),
 * the next user opening the create flow gets a clean slate — no leaked addresses,
 * dates, or staffing levels across accounts.
 *
 * Schema versioning
 * ─────────────────
 * `version` is bumped any time MissionDraftPayload shape changes. On read, drafts
 * with the wrong version are deleted to avoid feeding the screen partial/stale
 * shapes. This is much safer than runtime migrations for a free-form draft.
 *
 *   v2 — Per-slot staffing. The mission-creation flow merged service/agent
 *        selection into each time slot, so a draft now carries `slots[].lines`
 *        (services + agent count + uniform, per slot) instead of a global
 *        `bookingLines` array + per-slot overrides. v1 drafts are discarded.
 *
 * TTL
 * ───
 * Drafts are valid for 7 days. Stale drafts are dropped silently on read — the
 * user starts fresh rather than restoring a week-old address they no longer
 * recognise. The window covers most "I'll come back to this" cases without
 * accumulating cruft.
 */

let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  /* native module absent — module degrades to no-op */
}

/** Bump when MissionDraftPayload shape changes. Old drafts are discarded. */
const DRAFT_VERSION = 2;
/** Drafts older than this are dropped on read. 7 days. */
const DRAFT_TTL_MS = 7 * 24 * 3_600_000;

const keyFor = (userId: string): string =>
  `@securbook:client:mission_draft:v${DRAFT_VERSION}:${userId}`;

/** One persisted service line within a slot draft. UI-only metadata included. */
export interface MissionDraftSlotLine {
  serviceTypeId: string;
  name:          string;
  accent:        string;
  ratePerHour:   number;
  agentCount:    number;
  uniform:       string;
}

/**
 * Shape of what we persist. Intentionally a subset of the screen's local state —
 * we do NOT save volatile UI bits like which slot's editor is currently open,
 * scroll positions, or transient validation errors. We save what the user typed.
 */
export interface MissionDraftPayload {
  step: 1 | 2;
  form: {
    title:     string;
    notes:     string;
    address:   string;
    city:      string;
    zipCode:   string;
    latitude:  number | null;
    longitude: number | null;
  };
  /** Always at least one slot. Each slot owns its own staffing (`lines`). */
  slots: Array<{
    startAt: string;
    endAt:   string;
    lines:   MissionDraftSlotLine[];
  }>;
}

interface StoredEnvelope {
  version: number;
  savedAt: number; // epoch ms
  payload: MissionDraftPayload;
}

/**
 * Returns true if `payload` carries any user-supplied content worth restoring.
 * Empty form + empty slots means the user opened the screen and closed it —
 * restoring would just nag them.
 */
export function isDraftMeaningful(payload: MissionDraftPayload | null): boolean {
  if (!payload) return false;
  const { form, slots } = payload;
  const hasFormContent =
    Boolean(form.address.trim() || form.city.trim() || form.title.trim() ||
            form.notes.trim()  || form.latitude != null);
  const hasSlots = slots.some(s => s.startAt || s.endAt || s.lines.length > 0);
  return hasFormContent || hasSlots;
}

export const missionDraftStorage = {
  /**
   * Save a draft for the given user. Fire-and-forget — failures are swallowed
   * because losing autosave is never worse than blocking the UI.
   */
  save: (userId: string, payload: MissionDraftPayload): void => {
    if (!AsyncStorage || !userId) return;
    const envelope: StoredEnvelope = {
      version: DRAFT_VERSION,
      savedAt: Date.now(),
      payload,
    };
    AsyncStorage.setItem(keyFor(userId), JSON.stringify(envelope)).catch(() => {});
  },

  /**
   * Load a draft for the given user. Returns null if absent, malformed, wrong
   * version, or stale (older than DRAFT_TTL_MS).
   */
  load: async (userId: string): Promise<MissionDraftPayload | null> => {
    if (!AsyncStorage || !userId) return null;
    try {
      const raw = await AsyncStorage.getItem(keyFor(userId));
      if (!raw) return null;
      const env = JSON.parse(raw) as StoredEnvelope;
      if (!env || env.version !== DRAFT_VERSION) {
        // Schema drift — silently delete and start fresh.
        AsyncStorage.removeItem(keyFor(userId)).catch(() => {});
        return null;
      }
      if (!env.savedAt || Date.now() - env.savedAt > DRAFT_TTL_MS) {
        AsyncStorage.removeItem(keyFor(userId)).catch(() => {});
        return null;
      }
      return env.payload ?? null;
    } catch {
      return null;
    }
  },

  /** Remove the draft for the given user. Called after successful submit / on explicit discard. */
  clear: (userId: string): void => {
    if (!AsyncStorage || !userId) return;
    AsyncStorage.removeItem(keyFor(userId)).catch(() => {});
  },
};
