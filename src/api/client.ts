import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axios from 'axios';
import { config } from '@config';
import { tokenStorage }  from '@services/tokenStorage';
import { useAuthStore }  from '@store/authStore';
import { socketService } from '@services/socketService';
import { resetToRoot }   from '@services/navigationRef';
import { appVersionHeaders, reportUpdateRequired } from '@services/appVersion';
import { captureHandledError } from '@services/sentry';

const API_BASE_URL = config.api.baseUrl;
const DEBUG = config.features.debugLogging;

// ─── Dev Logger ───────────────────────────────────────────────────────────────
const TAG = '[API]';
const log = {
  request: (cfg: InternalAxiosRequestConfig) => {
    if (!DEBUG) return;
    const method = cfg.method?.toUpperCase() ?? 'GET';
    const url    = `${cfg.baseURL ?? ''}${cfg.url ?? ''}`;
    const hasAuth = !!cfg.headers?.Authorization;
    console.log(`\n${TAG} ➤ ${method} ${url}`);
    console.log(`${TAG}   auth   : ${hasAuth ? '✅ Bearer token present' : '❌ no token'}`);
    if (cfg.params)  console.log(`${TAG}   params : ${JSON.stringify(cfg.params)}`);
    if (cfg.data)    console.log(`${TAG}   body   : ${JSON.stringify(cfg.data)}`);
  },
  response: (res: AxiosResponse) => {
    if (!DEBUG) return;
    const method = res.config.method?.toUpperCase() ?? 'GET';
    const url    = `${res.config.baseURL ?? ''}${res.config.url ?? ''}`;
    console.log(`\n${TAG} ✅ ${res.status} ${method} ${url}`);
    console.log(`${TAG}   data   : ${JSON.stringify(res.data)}`);
  },
  error: (err: AxiosError) => {
    if (!DEBUG) return;
    const method  = err.config?.method?.toUpperCase() ?? 'GET';
    const url     = `${err.config?.baseURL ?? ''}${err.config?.url ?? ''}`;
    const status  = err.response?.status ?? 'NO_RESPONSE';
    const message = (err.response?.data as any)?.message ?? err.message;
    console.error(`\n${TAG} ❌ ${status} ${method} ${url}`);
    console.error(`${TAG}   message: ${message}`);
    console.error(`${TAG}   data   : ${JSON.stringify(err.response?.data ?? null)}`);
    if (!err.response) {
      console.error(`${TAG}   ⚠  No response — check network, IP, or server is running`);
      console.error(`${TAG}   baseURL: ${err.config?.baseURL}`);
    }
  },
};

// ─── Axios Instance ────────────────────────────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: config.api.timeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
});

// ─── Request interceptor — inject Bearer token + log ─────────────────────────
apiClient.interceptors.request.use(
  (cfg: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    // App identity: the API refuses builds below APP_MIN_VERSION_CLIENT (H9).
    for (const [name, value] of Object.entries(appVersionHeaders())) {
      cfg.headers[name] = value;
    }
    log.request(cfg);
    return cfg;
  },
  (err) => {
    console.error(`${TAG} ❌ Request setup error:`, err);
    return Promise.reject(err);
  },
);

// ─── Response interceptor — log + automatic token refresh on 401 ─────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject:  (err: unknown)  => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token!);
  });
  failedQueue = [];
};

// ─── Single-flight refresh ───────────────────────────────────────────────────
// FIX (audit 2026-08, P1-4). There used to be TWO independent refresh paths:
// the interceptor below (guarded by `isRefreshing`) and the exported
// `refreshAccessToken()` used by uploadService, which bypasses interceptors
// because it streams multipart uploads over raw XHR. The old comment conceded
// "single-flight is provided by the calling site" — but each site only
// serialised itself, so the two paths could refresh CONCURRENTLY.
//
// The backend rotates refresh tokens, so that races destructively: whichever
// call lands second presents a refresh token the first has already invalidated,
// its refresh fails, and the user is logged out mid-session. The window is
// narrow, but a document upload running alongside normal API traffic is exactly
// the common case.
//
// Both paths now await the SAME in-flight promise, so at most one refresh
// request exists at a time regardless of who asks.
let refreshInFlight: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const { data } = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { Authorization: `Bearer ${refreshToken}` } },
  );
  const payload =
    (data as { data?: { accessToken: string; refreshToken: string } }).data ??
    (data as { accessToken: string; refreshToken: string });
  const { accessToken, refreshToken: newRT } = payload;

  // Awaited (P1-3): the old refresh token is dead the moment this succeeds, so
  // losing this write means a forced logout on the next cold start.
  await tokenStorage.setTokens({ accessToken, refreshToken: newRT });
  useAuthStore.setState({ accessToken });

  return accessToken;
}

/** Refresh once, sharing the in-flight request with any concurrent caller. */
function refreshOnce(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// ─── Endpoints where a 401 is a DOMAIN error, not an expired session ─────────
// For these, a 401 means "bad credentials / invalid or absent token" (login,
// register, refresh, password reset, 2FA verify, availability checks) — NOT an
// expired access token to silently recover from. Running the refresh→logout
// cascade here would turn a simple wrong password into a forced logout.
const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/2fa/verify',
  '/auth/check-phone',
  '/auth/check-email',
  '/auth/resend-verification',
];

const isNoRefreshPath = (url?: string): boolean =>
  !!url && NO_REFRESH_PATHS.some((path) => url.includes(path));

apiClient.interceptors.response.use(
  (res: AxiosResponse) => {
    log.response(res);
    return res;
  },
  async (error: AxiosError) => {
    log.error(error);
    // 426 APP_UPDATE_REQUIRED: App swaps the navigator for the update screen.
    reportUpdateRequired(error.response?.status, error.response?.data);
    // Server errors the user sees are worth aggregating (H4).
    if ((error.response?.status ?? 0) >= 500) {
      captureHandledError(error, { url: error.config?.url, status: error.response?.status });
    }
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isNoRefreshPath(original.url) &&   // bad-credentials/token errors are surfaced, not refreshed
      tokenStorage.getRefreshToken()      // nothing to refresh if we were never authenticated
    ) {
      if (isRefreshing) {
        // Queue concurrent requests that arrived while refresh is in flight
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          // Mark the queued retry too: if it 401s again it must surface rather
          // than start a second refresh cycle.
          original._retry = true;
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;
      if (DEBUG) console.log(`${TAG} ðŸ”„ Access token expired — attempting refresh...`);

      try {
        // Shared with uploadService's refreshAccessToken() via refreshOnce(),
        // so the two paths can never rotate the refresh token concurrently.
        const accessToken = await refreshOnce();

        // Drain the queue of concurrent 401 requests
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;

        // 4. Reconnect WebSocket with the fresh token.
        //    The socket connected during rehydrate() with the expired token
        //    → the gateway's JwtService.verify() failed → `io server disconnect`.
        //    Now we transparently reconnect with a valid JWT.
        if (DEBUG) console.log(`${TAG} ðŸ”Œ Reconnecting WebSocket with fresh token...`);
        socketService.reconnect(accessToken);

        if (DEBUG) console.log(`${TAG} ✅ Token refreshed — retrying original request`);
        return apiClient(original);
      } catch (refreshErr) {
        console.error(`${TAG} ❌ Token refresh failed — logging out`, refreshErr);
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        resetToRoot('Auth');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;


// =============================================================================
// EXPORTED REFRESH HELPER  (added during enterprise migration)
// =============================================================================
// The axios interceptor above handles 401 refresh transparently for `apiClient`
// requests. The uploadService, however, uses raw XHR for streaming multipart
// uploads — it bypasses the interceptor and needs to refresh tokens directly
// when an upload returns 401. This thin helper does *just* the HTTP call and
// token-persistence dance — no queue draining, no socket reconnect — and lets
// the uploader retry the request itself.
//
// Single-flight is now GLOBAL, not per-call-site: both this helper and the
// interceptor above await the same `refreshOnce()` promise. Previously each
// serialised only itself, so an upload refresh and a normal-request refresh
// could run concurrently and, because the backend rotates refresh tokens,
// invalidate each other (audit 2026-08, P1-4).

export function refreshAccessToken(): Promise<string> {
  return refreshOnce();
}
