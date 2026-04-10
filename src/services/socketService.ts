/**
 * socketService.ts — Bulletproof WebSocket client (CLIENT app).
 *
 * Improvements over v1:
 *  ● Observable ConnectionState — any component can subscribe
 *  ● reconnectionAttempts: Infinity + exponential jitter backoff
 *  ● Auto-rejoin tracked mission rooms on reconnect
 *  ● All subscriptions return typed () => void unsubscribe functions
 *  ● Guards against null socket (never throws if connect() not yet called)
 */

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/config';

const WS_URL = API_BASE_URL.replace('/api/v1', '');

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AgentPosition {
  agentId:   string;
  bookingId: string;
  missionId: string;
  latitude:  number;
  longitude: number;
  heading?:  number;
  accuracy?: number;
  speed?:    number;
  timestamp: number;
}

export interface DistanceUpdate {
  bookingId:  string;
  missionId:  string;
  distanceM:  number;
  inZone:     boolean;
  timestamp:  number;
}

export interface GeofenceAlert {
  bookingId:   string;
  missionId:   string;
  agentName:   string;
  distanceM:   number;
  distanceStr: string;
  latitude:    number;
  longitude:   number;
  timestamp:   number;
}

export type ConnectionState = 'connected' | 'disconnected' | 'connecting';
type ConnectionListener = (state: ConnectionState) => void;

// ── SocketService ─────────────────────────────────────────────────────────────
class SocketService {
  private socket:           Socket | null = null;
  private connectionState:  ConnectionState = 'disconnected';
  private connectionListeners = new Set<ConnectionListener>();

  /** Mission rooms to rejoin on reconnect */
  private joinedRooms = new Set<string>();

  // ── Connection state ──────────────────────────────────────────────────────
  private setState(s: ConnectionState) {
    if (this.connectionState === s) return;
    this.connectionState = s;
    this.connectionListeners.forEach(cb => cb(s));
  }

  /**
   * Subscribe to connection state changes.
   * Callback is fired immediately with current state, then on each change.
   * Returns an unsubscribe function.
   */
  onConnectionState(cb: ConnectionListener): () => void {
    cb(this.connectionState);
    this.connectionListeners.add(cb);
    return () => this.connectionListeners.delete(cb);
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  // ── Connect / Disconnect ──────────────────────────────────────────────────
  connect(accessToken: string) {
    if (this.socket?.connected) return;

    this.setState('connecting');

    this.socket = io(`${WS_URL}/events`, {
      auth:                 { token: accessToken },
      transports:           ['websocket'],
      reconnectionAttempts: Infinity,
      reconnectionDelay:    1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor:  0.5,
    });

    this.socket.on('connect', () => {
      console.log('[WS-Client] Connected');
      this.setState('connected');
      // Rejoin all tracked mission rooms after reconnect
      this.joinedRooms.forEach(mid => {
        this.socket?.emit('join_mission', { missionId: mid });
        console.log(`[WS-Client] Rejoined mission:${mid}`);
      });
    });

    this.socket.on('connect_error', (e: Error) => {
      console.warn('[WS-Client] connect_error:', e.message);
      this.setState('disconnected');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.warn('[WS-Client] Disconnected:', reason);
      this.setState('disconnected');
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.joinedRooms.clear();
    this.setState('disconnected');
  }

  // ── Rooms ─────────────────────────────────────────────────────────────────
  joinMission(missionId: string) {
    this.joinedRooms.add(missionId);
    this.socket?.emit('join_mission', { missionId });
  }

  leaveMission(missionId: string) {
    this.joinedRooms.delete(missionId);
    // Socket.io auto-removes on disconnect; explicit leave not needed by server
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────
  onAgentPosition(cb: (p: AgentPosition) => void): () => void {
    this.socket?.on('agent_position', cb);
    return () => this.socket?.off('agent_position', cb);
  }

  onDistanceUpdate(cb: (d: DistanceUpdate) => void): () => void {
    this.socket?.on('agent_distance_update', cb);
    return () => this.socket?.off('agent_distance_update', cb);
  }

  onGeofenceAlert(cb: (a: GeofenceAlert) => void): () => void {
    this.socket?.on('agent_out_of_zone', cb);
    return () => this.socket?.off('agent_out_of_zone', cb);
  }

  onNewMessage(cb: (m: any) => void): () => void {
    this.socket?.on('new_message', cb);
    return () => this.socket?.off('new_message', cb);
  }

  onMissionUpdate(cb: (d: any) => void): () => void {
    this.socket?.on('mission_update', cb);
    return () => this.socket?.off('mission_update', cb);
  }

  sendMessage(conversationId: string, missionId: string, content: string) {
    this.socket?.emit('send_message', { conversationId, missionId, content });
  }
}

export const socketService = new SocketService();
