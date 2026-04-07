import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/config';

const WS_URL = API_BASE_URL.replace('/api', '');

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

class SocketService {
  private socket: Socket | null = null;

  connect(accessToken: string) {
    if (this.socket?.connected) return;
    this.socket = io(`${WS_URL}/events`, {
      auth:                 { token: accessToken },
      transports:           ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay:    2000,
    });
    this.socket.on('connect',       () => console.log('[WS] Connected'));
    this.socket.on('connect_error', (e: Error) => console.warn('[WS]', e.message));
    this.socket.on('disconnect',    (reason: string) => console.warn('[WS] Disconnected:', reason));
  }

  disconnect() { this.socket?.disconnect(); this.socket = null; }

  joinMission(missionId: string) {
    this.socket?.emit('join_mission', { missionId });
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  onAgentPosition(cb: (p: AgentPosition) => void) {
    this.socket?.on('agent_position', cb);
    return () => this.socket?.off('agent_position', cb);
  }

  /** Server-computed distance agent ↔ site, updated on each position */
  onDistanceUpdate(cb: (d: DistanceUpdate) => void) {
    this.socket?.on('agent_distance_update', cb);
    return () => this.socket?.off('agent_distance_update', cb);
  }

  /** Agent stepped outside the 30m geofence */
  onGeofenceAlert(cb: (a: GeofenceAlert) => void) {
    this.socket?.on('agent_out_of_zone', cb);
    return () => this.socket?.off('agent_out_of_zone', cb);
  }

  onNewMessage(cb: (m: any) => void) {
    this.socket?.on('new_message', cb);
    return () => this.socket?.off('new_message', cb);
  }

  onMissionUpdate(cb: (d: any) => void) {
    this.socket?.on('mission_update', cb);
    return () => this.socket?.off('mission_update', cb);
  }

  sendMessage(conversationId: string, missionId: string, content: string) {
    this.socket?.emit('send_message', { conversationId, missionId, content });
  }

  isConnected() { return this.socket?.connected ?? false; }
}

export const socketService = new SocketService();
