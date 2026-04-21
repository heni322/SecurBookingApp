/**
 * useMissions.ts — hook domain missions.
 * Encapsule le chargement, le filtrage et les actions sur les missions.
 */
import { useEffect, useCallback, useState } from 'react';
import { missionsApi } from '@api/endpoints/missions';
import { useApi }      from '@hooks/useApi';
import { isActiveMission } from '@utils/typeGuards';
import { MissionStatus } from '@constants/enums';
import type { Mission, CreateMissionPayload } from '@models/index';

export function useMissions() {
  const { data, loading, error, execute } = useApi(missionsApi.getMyMissions);

  const refresh = useCallback(() => execute(), [execute]);
  useEffect(() => { refresh(); }, [refresh]);

  const missions       = data ?? [];
  const active         = missions.filter(isActiveMission);
  const completed      = missions.filter((m) => m.status === MissionStatus.COMPLETED);
  const drafts         = missions.filter((m) => m.status === MissionStatus.CREATED);

  return {
    missions,
    active,
    completed,
    drafts,
    loading,
    error,
    refresh,
  };
}

export function useMissionDetail(missionId: string) {
  const { data: mission, loading, error, execute } = useApi(missionsApi.getById);

  const refresh = useCallback(() => execute(missionId), [execute, missionId]);
  useEffect(() => { refresh(); }, [refresh]);

  const cancel = useCallback(async () => {
    await missionsApi.cancel(missionId);
    refresh();
  }, [missionId, refresh]);

  return { mission, loading, error, refresh, cancel };
}
