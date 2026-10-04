/**
 * queryClient.ts — TanStack Query v5 singleton.
 *
 * Stale-time strategy (sourced from @config.cache):
 *   SHORT  2 min — availabilities, quotes
 *   MEDIUM 5 min — missions, bookings, profiles
 *   LONG  10 min — service types, pricing rules, static lists
 *
 * Error handling: errors bubble to the nearest <QueryErrorResetBoundary>.
 * Mutation errors are NOT thrown globally — each mutation handles its own UI.
 *
 * Reconnect behaviour: refetchOnReconnect is intentionally false here. Instead,
 * connectivityService refetches only the ACTIVE queries on an offline→online
 * transition (see services/connectivityService.ts), refreshing what the user is
 * looking at without a global refetch storm.
 */

import { QueryClient } from '@tanstack/react-query';
import { config }      from '@config';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Data is fresh for 5 min by default — screens override per-query. */
      staleTime:          config.cache.staleMediumMs,
      /** Keep inactive cache for 10 min before garbage-collection. */
      gcTime:             config.cache.staleLongMs,
      /** Retry failed requests up to 2 times with exponential back-off. */
      retry:              2,
      retryDelay:         (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      /** Refetch on window focus (user switches app → comes back). */
      refetchOnWindowFocus: true,
      /** Reconnect handled by connectivityService (active queries only). */
      refetchOnReconnect:   false,
      /**
       * Refetch on re-mount - but ONLY when the entry is already stale.
       * true is NOT 'always': inside staleTime a re-mount is a no-op.
       * Anything that WRITES must therefore invalidate explicitly; relying
       * on this flag to surface fresh data is how a just-created mission
       * stays invisible in the list for five minutes.
       */
      refetchOnMount:       true,
    },
    mutations: {
      /** Mutations don't retry by default — side effects must be idempotent. */
      retry: 0,
    },
  },
});

// Query keys live in ONE place: @api/queryKeys (the qk factory).
//
// There used to be a second factory here. The two disagreed on the same
// domain - missionDetail(id) was ['missions', id] while qk.missions.detail(id)
// was ['missions','detail',id] - so invalidations written against one factory
// silently matched nothing on the other. Prefix matching makes that failure
// invisible: the call succeeds, it just invalidates no query. Three call
// sites in api/queries were dead for exactly this reason.
//
// Do not add keys here. Add them to @api/queryKeys.
