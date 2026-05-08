/**
 * confirmDialogStore.ts — Headless modal-confirmation state (Zustand).
 *
 * Why a store instead of Context:
 *  ● Same pattern as toastStore / authStore (codebase consistency).
 *  ● Imperatively callable from outside React (e.g. service-layer "are you sure?"
 *    prompts before destructive HTTP calls).
 *  ● Zero re-render cost when no dialog is open.
 *
 * Behaviour:
 *  ● Single dialog at a time — opening a new one auto-resolves the previous as
 *    cancel. This matches Alert.alert semantics and prevents stacking.
 *  ● Hardware back button on Android → cancel (handled by the host).
 *  ● Tapping the scrim → cancel (handled by the host).
 *  ● `confirm()` returns a Promise<boolean> — true if user confirmed, false on cancel.
 */
import { create } from 'zustand';

export type ConfirmStyle = 'default' | 'destructive';

export interface ConfirmDialogOptions {
  /** Bold heading line. */
  title:           string;
  /** Body text. Required — describes what the user is about to do. */
  message:         string;
  /** Confirm button label. Default: "Confirmer". */
  confirmLabel?:   string;
  /** Cancel button label. Default: "Annuler". */
  cancelLabel?:    string;
  /**
   * `default` (gold/primary) for benign actions, `destructive` (red) for
   * irreversible ones (delete, logout, cancel mission, disable 2FA, …).
   */
  confirmStyle?:   ConfirmStyle;
}

export interface ConfirmDialogState {
  /** Currently-open dialog options, or null if none. */
  current: (ConfirmDialogOptions & { id: string }) | null;
  /**
   * Open a confirmation dialog. Returns a Promise resolved with `true` if the
   * user pressed the confirm button, `false` otherwise (cancel / scrim / back).
   */
  confirm:  (opts: ConfirmDialogOptions) => Promise<boolean>;
  /** Internal — called by the host when the user makes a decision. */
  resolve:  (ok: boolean) => void;
}

let counter = 0;
const genId = (): string =>
  `c_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/** Module-private resolver of the currently-open dialog. */
let activeResolver: ((ok: boolean) => void) | null = null;

export const useConfirmDialogStore = create<ConfirmDialogState>((set) => ({
  current: null,

  confirm: (opts) => {
    // If a dialog is already open, auto-cancel it before showing the new one.
    if (activeResolver) {
      activeResolver(false);
      activeResolver = null;
    }
    return new Promise<boolean>((resolve) => {
      activeResolver = resolve;
      set({ current: { ...opts, id: genId() } });
    });
  },

  resolve: (ok) => {
    const r = activeResolver;
    activeResolver = null;
    set({ current: null });
    r?.(ok);
  },
}));

/**
 * Imperative API — usable outside React (services, axios interceptors, etc).
 * Inside components, prefer `useConfirmDialog()` for a memoized handle.
 */
export const confirm = (opts: ConfirmDialogOptions): Promise<boolean> =>
  useConfirmDialogStore.getState().confirm(opts);
