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
const DRAFT_VERSION = 1;
/** Drafts older than this are dropped on read. 7 days. */
const DRAFT_TTL_MS = 7 * 24 * 3_600_000;

const keyFor = (userId: string): string =>
  `@securbook:client:mission_draft:v${DRAFT_VERSION}:${userId}`;

/**
 * Shape of what we persist. Intentionally a subset of the screen's local state —
 * we do NOT save volatile UI bits like which slot's editor is currently open,
 * scroll positions, or transient validation errors. We save what the user typed.
 */
export interface MissionDraftPayload {
  step:        1 | 2 | 3;
  form: {
    title:     string;
    notes:     string;
    address:   string;
    city:      string;
    zipCode:   string;
    latitude:  number | null;
    longitude: number | null;
    startAt:   string;
    endAt:     string;
  };
  /** Empty array means single-slot mode. */
  slots: Array<{
    startAt:    string;
    endAt:      string;
    customized: boolean;
    overrides:  Array<{
      serviceTypeId: string;
      agentCount:    number;
      slotUniform:   string;
    }>;
  }>;
  /** Persisted so we can show "Reprendre" only when services still match. */
  bookingLines: Array<{
    serviceTypeId: string;
    agentCount:    number;
    name:          string;
    accent:        string;
    agentUniforms: (string | null)[];
  }>;
}

interface StoredEnvelope {
  version:   number;
  savedAt:   number; // epoch ms
  payload:   MissionDraftPayload;
}

/**
 * Returns true if `payload` carries any user-supplied content worth restoring.
 * Empty form + no slots + step 1 means the user opened the screen and closed it
 * — restoring would just nag them.
 */
export function isDraftMeaningful(payload: MissionDraftPayload | null): boolean {
  if (!payload) return false;
  const { form, slots } = payload;
  const hasFormContent =
    Boolean(form.address.trim() || form.city.trim() || form.title.trim() ||
            form.notes.trim()  || form.startAt || form.endAt ||
            form.latitude != null);
  const hasSlots = slots.length > 0 && slots.some(s => s.startAt || s.endAt);
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
