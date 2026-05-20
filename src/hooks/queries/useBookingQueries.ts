/**
 * useBookingQueries — TanStack Query v5 hooks for bookings domain.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { bookingsApi }            from '@api/endpoints/bookings';
import { queryClient, queryKeys } from '@lib/queryClient';
import { STALE_TIME }             from '@constants/config';
import type { IncidentReportPayload } from '@models/index';

// ─── List: bookings for a mission ─────────────────────────────────────────

export function useMissionBookings(missionId: string) {
  return useQuery({
    queryKey:  queryKeys.bookings(missionId),
    queryFn:   async () => {
      const res = await bookingsApi.getByMission(missionId);
      return res.data.data ?? [];
    },
    staleTime: STALE_TIME.MEDIUM,
    enabled:   !!missionId,
    select:    (data) => data ?? [],
  });
}

// ─── Detail: single booking ────────────────────────────────────────────────

export function useBookingDetail(bookingId: string) {
  return useQuery({
    queryKey:  queryKeys.bookingDetail(bookingId),
    queryFn:   async () => {
      const res = await bookingsApi.getById(bookingId);
      return res.data.data;
    },
    staleTime: STALE_TIME.MEDIUM,
    enabled:   !!bookingId,
  });
}

// ─── Mutation: report incident ────────────────────────────────────────────

export function useReportIncident(bookingId: string) {
  return useMutation({
    mutationFn: (payload: IncidentReportPayload) =>
      bookingsApi.reportIncident(bookingId, payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookingDetail(bookingId) });
    },
  });
}
