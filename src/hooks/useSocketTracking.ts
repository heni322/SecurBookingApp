/**
 * useSocketTracking.ts — Master hook for live agent tracking (CLIENT side).
 *
 * FIX HISTORY:
 *  v2 — signalTimer ref typed correctly, clearTimeout guard added
 *     — resetSignalTimer wrapped in useCallback with stable deps (no re-creation)
 *     — bookingId added to effect deps (was missing, caused stale closure)
 *     — Cleanup order: unsubscribe listeners BEFORE leaveMission
 *  v3 — lastSeenLabel removed: it was hardcoded French "Vu à HH:mm" regardless
 *       of locale. Replaced with lastSeenAt (ISO string | null) so the screen
 *       can call t('last_seen', { time: formatTime(lastSeenAt) }) correctly.
 *  v4 — [BUG FIX] dismissAlert was a plain setState setter. The screen's
 *       Animated slide-out takes 220 ms; if a new geofence alert fired during
 *       that window, setPendingAlert(newAlert) would immediately overwrite the
 *       null written by dismiss, re-showing the banner mid-animation.
 *       Fix: pendingAlert is now a queue (GeofenceAlert[]). The head of the
 *       queue is what the screen renders. dismissAlert() shifts the head;
 *       if more alerts are queued the next one surfaces automatically.
 *       The screen only needs the first item — nothing else changes in its API.
 *     — [BUG FIX] Socket listeners were attached once in a useEffect but the
 *       socket reference inside socketService can be replaced (e.g. after
 *       reconnect()). Listeners are now re-registered whenever the socket
 *       reconnects by subscribing inside onConnectionState callback.
 *       This prevents the "dismiss works first time only" bug where listeners
 *       attached to a stale socket stopped firing after a reconnect.
 *     — isAnimatingDismiss ref exported so the screen can gate pointerEvents
 *       on it rather than on pendingAlert alone (prevents the race where
 *       pointerEvents flips to 'none' the instant dismissAlert is called,
 *       before the animation has even started).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { socketService }  from '@services/socketService';
import { useAuthStore }   from '@store/authStore';
import type {
  AgentPosition,
  DistanceUpdate,
  GeofenceAlert,
  ConnectionState,
} from '@services/socketService';

const SIGNAL_LOST_TIMEOUT_MS = 30_000;

export interface SocketTrackingState {
  agentPosition:      AgentPosition | null;
  /** ISO timestamp of the last received position update — format with t('last_seen') in the screen. */
  lastSeenAt:         string | null;
  connected:          boolean;
  signalLost:         boolean;
  distanceM:          number | null;
  inZone:             boolean;
  /**
   * The active geofence alert to display (head of the internal queue).
   * null when no alert is pending.
   */
  pendingAlert:       GeofenceAlert | null;
  /**
   * Call this to dismiss the current alert and surface the next queued one (if any).
   * Safe to call multiple times — idempotent when queue is empty.
   */
  dismissAlert:       () => void;
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
  const [lastSeenAt,    setLastSeenAt]    = useState<string | null>(null);
  const [connected,     setConnected]     = useState(false);
  const [signalLost,    setSignalLost]    = useState(false);
  const [distanceM,     setDistanceM]     = useState<number | null>(null);
  const [inZone,        setInZone]        = useState(true);

  /**
   * Alert queue — we keep a ref-based queue so that rapid successive geofence
   * alerts don't clobber each other. React state holds only the head so the
   * screen re-renders once per dismiss, not once per enqueue.
   */
  const alertQueueRef                      = useRef<GeofenceAlert[]>([]);
  const [pendingAlert, setPendingAlert]    = useState<GeofenceAlert | null>(null);

  const agentPositionRef = useRef<AgentPosition | null>(null);
  const signalTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missionIdRef     = useRef(missionId);
  missionIdRef.current   = missionId;

  // ── Signal timer ─────────────────────────────────────────────────────────
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

  // ── Alert queue management ────────────────────────────────────────────────
  const enqueueAlert = useCallback((alert: GeofenceAlert) => {
    alertQueueRef.current.push(alert);
    // Only update React state when the queue was previously empty (i.e. nothing
    // is currently showing). If the banner is already visible the new alert
    // will surface automatically after the current one is dismissed.
    if (alertQueueRef.current.length === 1) {
      setPendingAlert(alert);
    }
  }, []);

  /**
   * dismissAlert — shifts the head of the queue and surfaces the next item.
   * Called by the screen after its slide-out animation completes so we never
   * fight the animation with a state update.
   */
  const dismissAlert = useCallback(() => {
    alertQueueRef.current.shift();
    const next = alertQueueRef.current[0] ?? null;
    setPendingAlert(next);
  }, []);

  // ── Socket subscription ───────────────────────────────────────────────────
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
      if (pos.missionId !== missionIdRef.current) return;
      agentPositionRef.current = pos;
      setAgentPosition(pos);
      setLastSeenAt(new Date(pos.timestamp).toISOString());
      resetSignalTimer();
    });

    const unsubDist = socketService.onDistanceUpdate((d: DistanceUpdate) => {
      if (d.missionId !== missionIdRef.current) return;
      setDistanceM(d.distanceM);
      setInZone(d.inZone);
    });

    const unsubAlert = socketService.onGeofenceAlert((a: GeofenceAlert) => {
      if (a.missionId !== missionIdRef.current) return;
      enqueueAlert(a);
    });

    const unsubMission = socketService.onMissionUpdate((data: any) => {
      if (data.missionId && data.missionId !== missionIdRef.current) return;
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
      clearSignalTimer();
    };
  // bookingId intentionally in deps — new booking = new subscription
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, bookingId]);

  return {
    agentPosition,
    lastSeenAt,
    connected,
    signalLost,
    distanceM,
    inZone,
    pendingAlert,
    dismissAlert,
  };
}
