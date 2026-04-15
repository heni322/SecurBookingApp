/**
 * useSocketTracking.ts — Master hook for live agent tracking (CLIENT side).
 *
 * Responsibilities:
 *  • Connects to WebSocket + joins the mission room
 *  • Auto-reconnects and re-joins on disconnect (handled by socketService)
 *  • Subscribes to agent position, distance updates, geofence alerts, mission updates
 *  • Detects "signal lost" — no position for > SIGNAL_LOST_TIMEOUT_MS
 *  • Exposes clean, typed state to the screen — zero raw socket calls needed in UI
 *
 * Usage:
 *   const tracking = useSocketTracking({ missionId, bookingId });
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

// Signal is "lost" if no GPS update received in 30 seconds
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
  missionId:  string;
  bookingId:  string;
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

  // FIX — ref keeps agentPosition accessible inside event callbacks
  // without stale closure issues
  const agentPositionRef = useRef<AgentPosition | null>(null);
  const signalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetSignalTimer = useCallback(() => {
    if (signalTimer.current) clearTimeout(signalTimer.current);
    setSignalLost(false);
    signalTimer.current = setTimeout(() => setSignalLost(true), SIGNAL_LOST_TIMEOUT_MS);
  }, []);

  const dismissAlert = useCallback(() => setPendingAlert(null), []);

  // ── Connect + subscribe ─────────────────────────────────────────────────────
  useEffect(() => {
    // Token is kept in sync by client.ts after each refresh via
    // useAuthStore.setState({ accessToken })
    const token = useAuthStore.getState().accessToken;
    if (token) socketService.connect(token);

    // Join mission room (auto-rejoined on reconnect by socketService)
    socketService.joinMission(missionId);

    // Connection state → drives the `connected` indicator
    const unsubConn = socketService.onConnectionState((state: ConnectionState) => {
      const isConn = state === 'connected';
      setConnected(isConn);
      // FIX — read from ref to avoid stale closure (agentPosition state is stale
      // inside this callback because it was captured at mount time)
      if (isConn && agentPositionRef.current) resetSignalTimer();
    });

    // Agent GPS position
    const unsubPos = socketService.onAgentPosition((pos: AgentPosition) => {
      if (pos.missionId !== missionId) return;
      agentPositionRef.current = pos;
      setAgentPosition(pos);
      setLastSeenLabel(`Vu à ${formatTime(new Date(pos.timestamp).toISOString())}`);
      resetSignalTimer();
    });

    // Server distance update
    const unsubDist = socketService.onDistanceUpdate((d: DistanceUpdate) => {
      if (d.missionId !== missionId) return;
      setDistanceM(d.distanceM);
      setInZone(d.inZone);
    });

    // Geofence breach alert
    const unsubAlert = socketService.onGeofenceAlert((a: GeofenceAlert) => {
      if (a.missionId !== missionId) return;
      setPendingAlert(a);
    });

    // Mission lifecycle
    const unsubMission = socketService.onMissionUpdate((data: any) => {
      if (data.missionId && data.missionId !== missionId) return;
      if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        onMissionEnd?.();
      }
    });

    return () => {
      unsubConn();
      unsubPos();
      unsubDist();
      unsubAlert();
      unsubMission();
      socketService.leaveMission(missionId);
      if (signalTimer.current) clearTimeout(signalTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

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
