/**
 * useToast — Ergonomic hook for showing toasts inside React components.
 *
 * Returns memoized callbacks so consumers can pass them as deps without
 * triggering re-renders or stale-closure bugs.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.error("Email already in use", { title: "Registration failed" });
 *   toast.success("Profile saved");
 *
 * Outside components (axios interceptors, services), use the imperative
 * `toast` export from `@store/toastStore` instead.
 */
import { useMemo } from 'react';
import {
  useToastStore,
  type ToastShowOptions,
  type ToastVariant,
} from '@store/toastStore';

type VariantOpts = Omit<ToastShowOptions, 'message' | 'variant'>;

export interface UseToastApi {
  show:       (opts: ToastShowOptions) => string;
  success:    (message: string, opts?: VariantOpts) => string;
  error:      (message: string, opts?: VariantOpts) => string;
  warning:    (message: string, opts?: VariantOpts) => string;
  info:       (message: string, opts?: VariantOpts) => string;
  dismiss:    (id: string) => void;
  dismissAll: () => void;
}

export const useToast = (): UseToastApi => {
  // Subscribe to the actions only — they're stable refs, so this hook never
  // triggers a re-render unless Zustand recreates the store (it won't).
  const show       = useToastStore((s) => s.show);
  const dismiss    = useToastStore((s) => s.dismiss);
  const dismissAll = useToastStore((s) => s.dismissAll);

  return useMemo<UseToastApi>(() => {
    const variant =
      (v: ToastVariant) =>
      (message: string, opts: VariantOpts = {}): string =>
        show({ ...opts, message, variant: v });

    return {
      show,
      success: variant('success'),
      error:   variant('error'),
      warning: variant('warning'),
      info:    variant('info'),
      dismiss,
      dismissAll,
    };
  }, [show, dismiss, dismissAll]);
};
