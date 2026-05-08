/**
 * toastStore.ts — Headless toast state (Zustand).
 *
 * Why a store instead of Context:
 *  ● Same pattern as useAuthStore / useNotificationsStore (consistency).
 *  ● Imperatively callable from outside React (axios interceptors, services).
 *  ● Zero re-render cost when no toasts are visible.
 *
 * Behaviour:
 *  ● Each toast has a stable `id` (caller can dismiss programmatically).
 *  ● Auto-dismiss timer is owned by the host component, not the store —
 *    keeps the store pure (no setTimeout side-effects in actions).
 *  ● Default cap: 3 simultaneously visible toasts; older ones drop off.
 */
import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  /** Visible button label (e.g. "Retry", "Undo"). */
  label:   string;
  /** Invoked when the user taps the action button. */
  onPress: () => void;
}

export interface ToastItem {
  id:        string;
  variant:   ToastVariant;
  /** Bold heading line. Optional. */
  title?:    string;
  /** Body text — the main message. Required. */
  message:   string;
  /** ms before auto-dismiss. 0 disables auto-dismiss. Default: 4000. */
  duration:  number;
  /** Optional action button rendered on the right. */
  action?:   ToastAction;
  /** Monotonic creation timestamp — for ordering. */
  createdAt: number;
}

export interface ToastShowOptions {
  variant?:  ToastVariant;
  title?:    string;
  message:   string;
  duration?: number;
  action?:   ToastAction;
}

/** Maximum toasts visible at once — older ones drop off. */
const MAX_VISIBLE = 3;

interface ToastState {
  toasts:      ToastItem[];
  show:        (opts: ToastShowOptions) => string;
  dismiss:     (id: string) => void;
  dismissAll:  () => void;
}

let counter = 0;
const genId = (): string =>
  `t_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (opts) => {
    const id = genId();
    const item: ToastItem = {
      id,
      variant:   opts.variant ?? 'info',
      title:     opts.title,
      message:   opts.message,
      duration:  opts.duration ?? 4000,
      action:    opts.action,
      createdAt: Date.now(),
    };
    set((s) => {
      const next = [...s.toasts, item];
      // Drop oldest if we exceed the cap (FIFO, not LIFO).
      return { toasts: next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next };
    });
    return id;
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  dismissAll: () => {
    set({ toasts: [] });
  },
}));

/**
 * Imperative API — usable outside React (e.g. axios interceptors, services).
 * Inside components, prefer the `useToast()` hook for memoized handlers.
 */
export const toast = {
  show:    (opts: ToastShowOptions) => useToastStore.getState().show(opts),
  success: (message: string, opts: Omit<ToastShowOptions, 'message' | 'variant'> = {}) =>
    useToastStore.getState().show({ ...opts, message, variant: 'success' }),
  error:   (message: string, opts: Omit<ToastShowOptions, 'message' | 'variant'> = {}) =>
    useToastStore.getState().show({ ...opts, message, variant: 'error' }),
  warning: (message: string, opts: Omit<ToastShowOptions, 'message' | 'variant'> = {}) =>
    useToastStore.getState().show({ ...opts, message, variant: 'warning' }),
  info:    (message: string, opts: Omit<ToastShowOptions, 'message' | 'variant'> = {}) =>
    useToastStore.getState().show({ ...opts, message, variant: 'info' }),
  dismiss:    (id: string) => useToastStore.getState().dismiss(id),
  dismissAll: () => useToastStore.getState().dismissAll(),
};
