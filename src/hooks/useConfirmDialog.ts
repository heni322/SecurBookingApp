/**
 * useConfirmDialog — Ergonomic hook for opening modal confirmations.
 *
 * Returns a stable callback so consumers can put it in deps without triggering
 * re-renders or stale-closure bugs.
 *
 * Usage inside a component:
 *   const confirm = useConfirmDialog();
 *
 *   const handleDelete = async () => {
 *     const ok = await confirm({
 *       title: 'Supprimer ce compte ?',
 *       message: 'Cette action est irréversible.',
 *       confirmLabel: 'Supprimer',
 *       confirmStyle: 'destructive',
 *     });
 *     if (!ok) return;
 *     await api.deleteAccount();
 *   };
 *
 * Outside components (services, axios interceptors, …), use the imperative
 * `confirm` export from `@store/confirmDialogStore` instead.
 */
import { useCallback } from 'react';
import {
  useConfirmDialogStore,
  type ConfirmDialogOptions,
} from '@store/confirmDialogStore';

export const useConfirmDialog = (): ((opts: ConfirmDialogOptions) => Promise<boolean>) => {
  const confirm = useConfirmDialogStore((s) => s.confirm);
  // Wrap in useCallback so the identity is stable for useEffect deps.
  return useCallback(
    (opts: ConfirmDialogOptions) => confirm(opts),
    [confirm],
  );
};
