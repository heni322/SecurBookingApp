/**
 * i18n/types.ts
 *
 * Augments the i18next module so that `t()` is fully type-safe:
 *   • Autocomplete on every key path  (e.g. 'auth:login.title')
 *   • Compile-time error on unknown namespace / key
 *   • Values typed as `string` — no literal-type clash between locales
 *
 * Pattern: CustomTypeOptions.resources maps to the LocaleResources interface
 * (defined in locales/types.ts). Both EN and FR implement that interface,
 * so i18next only sees the shape — never the literal values.
 */
import 'i18next';
import type { LocaleResources } from './locales/types';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS:  'common';
    resources:  LocaleResources;
    returnNull: false;
  }
}
