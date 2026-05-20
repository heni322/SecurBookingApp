/**
 * useMissionQueries — TanStack Query v5 hooks for missions domain.
 *
 * Migration path
 * ──────────────
 * Old: const { data, loading, error, execute } = useApi(missionsApi.getMyMissions);
 * New: const { data, isLoading, error, refetch } = useMyMissions();
 *
 * Differences worth noting
 * ─────────────────────────
 * • `data` is now `Mission[]` (never null — returns [] on empty).
 * • `isLoading` is true ONLY on the very first fetch (no cached data yet).
 *   Use `isFetching` to show a spinner on background refreshes.
 * • `isPending` === first load with no data yet.
 * • Mutations return a TanStack mutation object; call `.mutate()` or
 *   `.mutateAsync()` and handle `onSuccess` / `onError` there or in `useMutation`.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { missionsApi }           from '@api/endpoints/missions';
import { queryClient, queryKeys } from '@lib/queryClient';
import { STALE_TIME }             from '@constants/config';
import type { CreateMissionPayload, UpdateMissionPayload } from '@models/index';

// ─── List: all my missions ─────────────────────────────────────────────────

export function useMyMissions() {
  return useQuery({
    queryKey:  queryKeys.missions(),
    queryFn:   async () => {
      const res = await missionsApi.getMyMissions();
      return res.data.data ?? [];
    },
    staleTime: STALE_TIME.MEDIUM,
    select:    (data) => data ?? [],
  });
}

// ─── Detail: single mission ────────────────────────────────────────────────

export function useMissionDetail(missionId: string) {
  return useQuery({
    queryKey:  queryKeys.missionDetail(missionId),
    queryFn:   async () => {
      const res = await missionsApi.getById(missionId);
      return res.data.data;
    },
    staleTime: STALE_TIME.MEDIUM,
    enabled:   !!missionId,
  });
}

// ─── Mutation: create ─────────────────────────────────────────────────────

export function useCreateMission() {
  return useMutation({
    mutationFn: (payload: CreateMissionPayload) =>
      missionsApi.create(payload).then((r) => r.data.data),
    onSuccess: () => {
      // Invalidate the list so the next read fetches fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.missions() });
    },
  });
}

// ─── Mutation: update ─────────────────────────────────────────────────────

export function useUpdateMission(missionId: string) {
  return useMutation({
    mutationFn: (payload: UpdateMissionPayload) =>
      missionsApi.update(missionId, payload).then((r) => r.data.data),
    onSuccess: (updated) => {
      // Optimistically update the detail cache
      queryClient.setQueryData(queryKeys.missionDetail(missionId), updated);
      // Invalidate the list to reflect status changes
      queryClient.invalidateQueries({ queryKey: queryKeys.missions() });
    },
  });
}

// ─── Mutation: cancel ────────────────────────────────────────────────────

export function useCancelMission() {
  return useMutation({
    mutationFn: (missionId: string) =>
      missionsApi.cancel(missionId).then((r) => r.data.data),
    onSuccess: (_updated, missionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missionDetail(missionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.missions() });
    },
  });
}
