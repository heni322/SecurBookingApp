import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@constants/config';
import { tokenStorage }  from '@services/tokenStorage';
import { useAuthStore }  from '@store/authStore';
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
        // POST /auth/refresh — uses JwtRefreshGuard (sends refresh token in body)
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { Authorization: `Bearer ${refreshToken}` } },
        );
        const { accessToken, refreshToken: newRT } = data.data ?? data;
        tokenStorage.setTokens({ accessToken, refreshToken: newRT });
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        console.log(`${TAG} ✅ Token refreshed — retrying original request`);
        return apiClient(original);
      } catch (refreshErr) {
        console.error(`${TAG} ❌ Token refresh failed — logging out`, refreshErr);
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        // Navigation impérative vers Auth (depuis un service, pas un composant)
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
