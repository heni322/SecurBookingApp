import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axios from 'axios';
import { config } from '@config';
import { tokenStorage }  from '@services/tokenStorage';
import { useAuthStore }  from '@store/authStore';
import { socketService } from '@services/socketService';
import { resetToRoot }   from '@services/navigationRef';

const API_BASE_URL = config.api.baseUrl;
const DEBUG = config.features.debugLogging;

// â”€â”€â”€ Dev Logger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TAG = '[API]';
const log = {
  request: (cfg: InternalAxiosRequestConfig) => {
    if (!DEBUG) return;
    const method = cfg.method?.toUpperCase() ?? 'GET';
    const url    = `${cfg.baseURL ?? ''}${cfg.url ?? ''}`;
    const hasAuth = !!cfg.headers?.Authorization;
    console.log(`\n${TAG} âž¤ ${method} ${url}`);
    console.log(`${TAG}   auth   : ${hasAuth ? 'âœ… Bearer token present' : 'âŒ no token'}`);
    if (cfg.params)  console.log(`${TAG}   params : ${JSON.stringify(cfg.params)}`);
    if (cfg.data)    console.log(`${TAG}   body   : ${JSON.stringify(cfg.data)}`);
  },
  response: (res: AxiosResponse) => {
    if (!DEBUG) return;
    const method = res.config.method?.toUpperCase() ?? 'GET';
    const url    = `${res.config.baseURL ?? ''}${res.config.url ?? ''}`;
    console.log(`\n${TAG} âœ… ${res.status} ${method} ${url}`);
    console.log(`${TAG}   data   : ${JSON.stringify(res.data)}`);
  },
  error: (err: AxiosError) => {
    if (!DEBUG) return;
    const method  = err.config?.method?.toUpperCase() ?? 'GET';
    const url     = `${err.config?.baseURL ?? ''}${err.config?.url ?? ''}`;
    const status  = err.response?.status ?? 'NO_RESPONSE';
    const message = (err.response?.data as any)?.message ?? err.message;
    console.error(`\n${TAG} âŒ ${status} ${method} ${url}`);
    console.error(`${TAG}   message: ${message}`);
    console.error(`${TAG}   data   : ${JSON.stringify(err.response?.data ?? null)}`);
    if (!err.response) {
      console.error(`${TAG}   âš ï¸  No response â€” check network, IP, or server is running`);
      console.error(`${TAG}   baseURL: ${err.config?.baseURL}`);
    }
  },
};

// â”€â”€â”€ Axios Instance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: config.api.timeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
});

// â”€â”€â”€ Request interceptor â€” inject Bearer token + log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
apiClient.interceptors.request.use(
  (cfg: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    log.request(cfg);
    return cfg;
  },
  (err) => {
    console.error(`${TAG} âŒ Request setup error:`, err);
    return Promise.reject(err);
  },
);

// â”€â”€â”€ Response interceptor â€” log + automatic token refresh on 401 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Endpoints where a 401 is a DOMAIN error, not an expired session â”€â”€â”€â”€â”€â”€â”€â”€â”€
// For these, a 401 means "bad credentials / invalid or absent token" (login,
// register, refresh, password reset, 2FA verify, availability checks) â€” NOT an
// expired access token to silently recover from. Running the refreshâ†’logout
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
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;
      if (DEBUG) console.log(`${TAG} ðŸ”„ Access token expired â€” attempting refresh...`);

      try {
        const refreshToken = tokenStorage.getRefreshToken();
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { Authorization: `Bearer ${refreshToken}` } },
        );
        const { accessToken, refreshToken: newRT } = data.data ?? data;

        // 1. Persist fresh tokens in storage + in-memory cache
        tokenStorage.setTokens({ accessToken, refreshToken: newRT });

        // 2. Sync the Zustand store so any hook reading
        //    useAuthStore.getState().accessToken gets the fresh value.
        //    (e.g. useSocketTracking reads it to reconnect the socket)
        useAuthStore.setState({ accessToken });

        // 3. Drain the queue of concurrent 401 requests
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;

        // 4. Reconnect WebSocket with the fresh token.
        //    The socket connected during rehydrate() with the expired token
        //    â†’ the gateway's JwtService.verify() failed â†’ `io server disconnect`.
        //    Now we transparently reconnect with a valid JWT.
        if (DEBUG) console.log(`${TAG} ðŸ”Œ Reconnecting WebSocket with fresh token...`);
        socketService.reconnect(accessToken);

        if (DEBUG) console.log(`${TAG} âœ… Token refreshed â€” retrying original request`);
        return apiClient(original);
      } catch (refreshErr) {
        console.error(`${TAG} âŒ Token refresh failed â€” logging out`, refreshErr);
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
// uploads â€” it bypasses the interceptor and needs to refresh tokens directly
// when an upload returns 401. This thin helper does *just* the HTTP call and
// token-persistence dance â€” no queue draining, no socket reconnect â€” and lets
// the uploader retry the request itself.
//
// Single-flight is provided by the calling site (uploadService keeps a
// `didAuthRetry` flag); concurrent normal-request refreshes are still
// serialised by the interceptor's `isRefreshing` gate.

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  const { data } = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { Authorization: `Bearer ${refreshToken}` } },
  );
  const payload = (data as { data?: { accessToken: string; refreshToken: string } }).data
                ?? (data as { accessToken: string; refreshToken: string });
  const { accessToken, refreshToken: newRT } = payload;
  tokenStorage.setTokens({ accessToken, refreshToken: newRT });
  useAuthStore.setState({ accessToken });
  return accessToken;
}
