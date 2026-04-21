/**
 * useSocketTracking.ts — Master hook for live agent tracking (CLIENT side).
 *
 * FIX HISTORY:
 *  v2 — signalTimer ref typed correctly, clearTimeout guard added
 *     — resetSignalTimer wrapped in useCallback with stable deps (no re-creation)
 *     — bookingId added to effect deps (was missing, caused stale closure)
 *     — Cleanup order: unsubscribe listeners BEFORE leaveMission
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService }  from '@services/socketService';
import { useAuthStore }   from '@store/authStore';
import { formatTime }     from '@utils/formatters';
import type {
  AgentPosition,
  DistanceUpdate,
  GeofenceAlert,
  ConnectionState,
} from '@services/socketService';

const SIGNAL_LOST_TIMEOUT_MS = 30_000;

export interface SocketTrackingState {
  agentPosition:  AgentPosition | null;
  lastSeenLabel:  string | null;
  connected:      boolean;
  signalLost:     boolean;
  distanceM:      number | null;
  inZone:         boolean;
  pendingAlert:   GeofenceAlert | null;
  dismissAlert:   () => void;
}

interface UseSocketTrackingParams {
  missionId:     string;
  bookingId:     string;
  onMissionEnd?: () => void;
}

export function useSocketTracking({
  missionId,
  bookingId,
  onMissionEnd,
}: UseSocketTrackingParams): SocketTrackingState {

  const [agentPosition, setAgentPosition] = useState<AgentPosition | null>(null);
  const [lastSeenLabel, setLastSeenLabel] = useState<string | null>(null);
  const [connected,     setConnected]     = useState(false);
  const [signalLost,    setSignalLost]    = useState(false);
  const [distanceM,     setDistanceM]     = useState<number | null>(null);
  const [inZone,        setInZone]        = useState(true);
  const [pendingAlert,  setPendingAlert]  = useState<GeofenceAlert | null>(null);

  // Ref for agentPosition to avoid stale closures in callbacks
  const agentPositionRef = useRef<AgentPosition | null>(null);
  // Typed correctly — NodeJS.Timeout on RN, number in browser
  const signalTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSignalTimer = useCallback(() => {
    if (signalTimer.current !== null) {
      clearTimeout(signalTimer.current);
      signalTimer.current = null;
    }
  }, []);

  const resetSignalTimer = useCallback(() => {
    clearSignalTimer();
    setSignalLost(false);
    signalTimer.current = setTimeout(() => setSignalLost(true), SIGNAL_LOST_TIMEOUT_MS);
  }, [clearSignalTimer]);

  const dismissAlert = useCallback(() => setPendingAlert(null), []);

  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (token) socketService.connect(token);

    socketService.joinMission(missionId);

    const unsubConn = socketService.onConnectionState((state: ConnectionState) => {
      const isConn = state === 'connected';
      setConnected(isConn);
      if (isConn && agentPositionRef.current) resetSignalTimer();
    });

    const unsubPos = socketService.onAgentPosition((pos: AgentPosition) => {
      if (pos.missionId !== missionId) return;
      agentPositionRef.current = pos;
      setAgentPosition(pos);
      setLastSeenLabel(`Vu à ${formatTime(new Date(pos.timestamp).toISOString())}`);
      resetSignalTimer();
    });

    const unsubDist = socketService.onDistanceUpdate((d: DistanceUpdate) => {
      if (d.missionId !== missionId) return;
      setDistanceM(d.distanceM);
      setInZone(d.inZone);
    });

    const unsubAlert = socketService.onGeofenceAlert((a: GeofenceAlert) => {
      if (a.missionId !== missionId) return;
      setPendingAlert(a);
    });

    const unsubMission = socketService.onMissionUpdate((data: any) => {
      if (data.missionId && data.missionId !== missionId) return;
      if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        onMissionEnd?.();
      }
    });

    return () => {
      // 1. Unsubscribe all listeners first
      unsubConn();
      unsubPos();
      unsubDist();
      unsubAlert();
      unsubMission();
      // 2. Tell server to remove client from room
      socketService.leaveMission(missionId);
      // 3. Clear signal timer
      clearSignalTimer();
    };
  // bookingId intentionally in deps — new booking = new subscription
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, bookingId]);

  return {
    agentPosition,
    lastSeenLabel,
    connected,
    signalLost,
    distanceM,
    inZone,
    pendingAlert,
    dismissAlert,
  };
}
