import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@constants/config';
import { tokenStorage }  from '@services/tokenStorage';
import { useAuthStore }  from '@store/authStore';
import { socketService } from '@services/socketService';
import { resetToRoot }   from '@services/navigationRef';

// ─── Dev Logger ───────────────────────────────────────────────────────────────
const TAG = '[API]';
const log = {
  request: (config: InternalAxiosRequestConfig) => {
    if (!__DEV__) return;
    const method = config.method?.toUpperCase() ?? 'GET';
    const url    = `${config.baseURL ?? ''}${config.url ?? ''}`;
    const hasAuth = !!config.headers?.Authorization;
    console.log(`\n${TAG} ➤ ${method} ${url}`);
    console.log(`${TAG}   auth   : ${hasAuth ? '✅ Bearer token present' : '❌ no token'}`);
    if (config.params)  console.log(`${TAG}   params : ${JSON.stringify(config.params)}`);
    if (config.data)    console.log(`${TAG}   body   : ${JSON.stringify(config.data)}`);
  },
  response: (res: AxiosResponse) => {
    if (!__DEV__) return;
    const method = res.config.method?.toUpperCase() ?? 'GET';
    const url    = `${res.config.baseURL ?? ''}${res.config.url ?? ''}`;
    console.log(`\n${TAG} ✅ ${res.status} ${method} ${url}`);
    console.log(`${TAG}   data   : ${JSON.stringify(res.data)}`);
  },
  error: (err: AxiosError) => {
    if (!__DEV__) return;
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
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
});

// ─── Request interceptor — inject Bearer token + log ─────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    log.request(config);
    return config;
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

apiClient.interceptors.response.use(
  (res: AxiosResponse) => {
    log.response(res);
    return res;
  },
  async (error: AxiosError) => {
    log.error(error);
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
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
      console.log(`${TAG} 🔄 Access token expired — attempting refresh...`);

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
        console.log(`${TAG} 🔌 Reconnecting WebSocket with fresh token...`);
        socketService.reconnect(accessToken);

        console.log(`${TAG} ✅ Token refreshed — retrying original request`);
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
