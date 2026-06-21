import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axios from 'axios';
import { config } from '@config';
import { tokenStorage }  from '@services/tokenStorage';
import { useAuthStore }  from '@store/authStore';
import { socketService } from '@services/socketService';
import { resetToRoot }   from '@services/navigationRef';

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
      console.error(`${TAG}   ⚠️  No response — check network, IP, or server is running`);
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
      if (DEBUG) console.log(`${TAG} 🔄 Access token expired — attempting refresh...`);

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
        //    → the gateway's JwtService.verify() failed → `io server disconnect`.
        //    Now we transparently reconnect with a valid JWT.
        if (DEBUG) console.log(`${TAG} 🔌 Reconnecting WebSocket with fresh token...`);
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
