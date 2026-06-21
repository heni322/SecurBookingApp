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
      /** Don't refetch when the component re-mounts (cache is enough). */
      refetchOnMount:       true,
    },
    mutations: {
      /** Mutations don't retry by default — side effects must be idempotent. */
      retry: 0,
    },
  },
});

// ─── Query key factory ────────────────────────────────────────────────────────
// Centralised key factory prevents typos and enables targeted invalidation.

export const queryKeys = {
  // Missions
  missions:      ()          => ['missions']                        as const,
  missionDetail: (id: string)=> ['missions', id]                   as const,

  // Bookings
  bookings:      (missionId: string) => ['bookings', missionId]    as const,
  bookingDetail: (id: string)        => ['bookings', 'detail', id] as const,

  // Notifications
  notifications:   ()        => ['notifications']                  as const,
  unreadCount:     ()        => ['notifications', 'unread']        as const,

  // Service types (static, long cache)
  serviceTypes:    ()        => ['serviceTypes']                   as const,

  // User profile
  profile:         ()        => ['profile']                        as const,

  // Quotes
  quotes:          (missionId: string) => ['quotes', missionId]    as const,

  // Payments
  paymentHistory:  ()        => ['payments', 'history']            as const,
  paymentMethods:  ()        => ['payments', 'methods']            as const,

  // Ratings
  ratings:         (missionId: string) => ['ratings', missionId]   as const,
} as const;
