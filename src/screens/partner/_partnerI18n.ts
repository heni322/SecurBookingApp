/**
 * _partnerI18n.ts — Internal helper for partner screens.
 *
 * The partner module spans the 'partner' + 'common' namespaces. `usePartnerT`
 * returns a t() typed loosely (string → string) so partner screens that do
 * cross-namespace lookups (`common:errors.title`, `common:actions.back`…)
 * or pass t() into sub-components with relaxed Tfn signatures still
 * type-check. All `partner:funding.*` keys are now fully translated; the
 * remaining reason to keep the loose typing is the cross-NS pattern above.
 *
 * Strictly-typed call sites in non-partner code continue to use
 * `useTranslation` from '@i18n'.
 */
import { useTranslation } from 'react-i18next';
import type { TOptions } from 'i18next';

export type LooseT = (key: string, opts?: TOptions | Record<string, unknown>) => string;

export function usePartnerT(): { t: LooseT; i18n: ReturnType<typeof useTranslation>['i18n'] } {
  const { t, i18n } = useTranslation(['partner', 'common']);
  return {
    t: t as unknown as LooseT,
    i18n,
  };
}
