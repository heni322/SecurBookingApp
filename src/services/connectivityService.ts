/**
 * connectivityService.ts — single NetInfo wrapper for the whole app.
 *
 * Why this exists
 * ────────────────
 * Previously OfflineBanner imported NetInfo directly, but the package was not
 * installed, so the soft `require` returned null and the banner was permanently
 * dead — the app had NO offline awareness. This service:
 *   1. Owns the one NetInfo subscription (others subscribe to this).
 *   2. Caches the latest state so screens can read it synchronously.
 *   3. On every offline→online transition, refetches ACTIVE React Query queries.
 *
 * We deliberately keep queryClient.refetchOnReconnect = false (so inactive,
 * cached screens are not hammered on every blip) and instead do a targeted
 * refetch of only the queries currently mounted. That refreshes what the user
 * is looking at the moment connectivity returns — the correct behaviour for a
 * live security app — without the thundering-herd of a global reconnect refetch.
 */
import { queryClient } from '@lib/queryClient';

// Soft import so unit tests / misconfigured installs never crash at import time.
let NetInfo: any = null;
try { NetInfo = require('@react-native-community/netinfo').default; } catch { /* ok */ }

export type ConnectivityListener = (online: boolean) => void;

class ConnectivityService {
  /** Latest known state. Optimistic default (true) avoids a false "offline" flash. */
  private online = true;
  private started = false;
  private listeners = new Set<ConnectivityListener>();
  private unsubNetInfo: (() => void) | null = null;

  /** Begin listening. Idempotent — safe to call from App.tsx on every mount. */
  start(): void {
    if (this.started || !NetInfo) return;
    this.started = true;

    this.unsubNetInfo = NetInfo.addEventListener((state: any) => {
      // isInternetReachable is null while NetInfo is still probing — treat null
      // as "reachable" so we don't flicker offline during the initial probe.
      const next = !!(state.isConnected && state.isInternetReachable !== false);
      this.setOnline(next);
    });
  }

  private setOnline(next: boolean): void {
    if (next === this.online) return;
    const wasOffline = !this.online;
    this.online = next;

    // Notify UI subscribers (banner, etc.)
    this.listeners.forEach(cb => cb(next));

    // offline → online: refresh what the user currently has open.
    if (wasOffline && next) {
      queryClient.refetchQueries({ type: 'active' }).catch(() => { /* silent */ });
    }
  }

  /** Current connectivity, read synchronously. */
  isOnline(): boolean {
    return this.online;
  }

  /** Subscribe to connectivity changes. Immediately emits the current value. */
  subscribe(cb: ConnectivityListener): () => void {
    cb(this.online);
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Whether NetInfo is actually available (false in tests / if not installed). */
  isAvailable(): boolean {
    return !!NetInfo;
  }

  stop(): void {
    this.unsubNetInfo?.();
    this.unsubNetInfo = null;
    this.started = false;
    this.listeners.clear();
  }
}

export const connectivityService = new ConnectivityService();
