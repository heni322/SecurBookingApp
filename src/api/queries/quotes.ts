/**
 * useQuotesQueries — React Query hooks for the quotes domain.
 *
 * The quote is the first step of the marketplace funding loop:
 *   calculate -> (show breakdown) -> accept -> pay.
 *
 * Conventions match the rest of the app:
 *   - queryFn unwraps the { success, data } interceptor envelope.
 *   - Mutations invalidate the mission's quote + the mission detail so the
 *     funding banner refreshes everywhere it's shown.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import { quotesApi } from '@api/endpoints/quotes';
import { qk } from '@api/queryKeys';
import type { ApiResponse, Quote, CreateQuotePayload } from '@models/index';

function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return ((res.data as unknown as { data?: T })?.data ?? (res.data as unknown as T));
}

// -- Queries ----------------------------------------------------------------

/**
 * The quote attached to a mission. `enabled` guards against an empty id.
 * Returns null-ish when no quote exists yet (backend 404 -> React Query error;
 * callers should treat a failed query as "no quote yet").
 */
export function useMissionQuote(missionId: string | undefined) {
  return useQuery<Quote>({
    queryKey: qk.quotes.byMission(missionId ?? ''),
    queryFn:  async () => unwrap(await quotesApi.getByMission(missionId!)),
    enabled:  Boolean(missionId),
    retry:    false, // a missing quote is an expected 404, don't hammer it
  });
}

// -- Mutations --------------------------------------------------------------

/** Calculate (and persist) a quote for a mission. */
export function useCalculateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['quotes', 'calculate'],
    mutationFn: (payload: CreateQuotePayload) => quotesApi.calculate(payload),
    onSuccess: (_data, payload) => {
      qc.invalidateQueries({ queryKey: qk.quotes.byMission(payload.missionId) });
      qc.invalidateQueries({ queryKey: qk.missions.detail(payload.missionId) });
    },
  });
}

/**
 * Accept a quote (mandatory before payment). Invalidates the mission's quote
 * and the payment state so the funding flow can advance.
 */
export function useAcceptQuote(missionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['quotes', 'accept'],
    mutationFn: (quoteId: string) => quotesApi.accept(quoteId),
    onSuccess: () => {
      if (missionId) {
        qc.invalidateQueries({ queryKey: qk.quotes.byMission(missionId) });
        qc.invalidateQueries({ queryKey: qk.payments.byMission(missionId) });
        qc.invalidateQueries({ queryKey: qk.missions.detail(missionId) });
      } else {
        qc.invalidateQueries({ queryKey: qk.quotes.all });
      }
    },
  });
}
