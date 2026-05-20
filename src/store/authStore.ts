/**
 * authStore — Zustand v5 with persist middleware.
 *
 * Architecture
 * ─────────────
 * • Tokens NEVER go into Zustand state — they live in tokenStorage (Keychain).
 * • Only the `user` object is persisted via Zustand persist middleware so the
 *   UI can render the user's name/avatar on startup before rehydrate() completes.
 * • isLoggedIn / isLoading are ephemeral session flags — NOT persisted.
 * • rehydrate() is the single source of truth for session validity.
 *
 * Middleware stack (inner → outer):
 *   create → (set, get) => slice
 *           → persist (storage = custom Keychain-aware adapter)
 *
 * Why not persist tokens in Zustand?
 * ────────────────────────────────────
 * Zustand persist serialises state to JSON. JSON stored in AsyncStorage is
 * readable by any process on a rooted/jailbroken device. Tokens in Keychain
 * are encrypted at rest by the OS secure enclave. The split keeps sensitive
 * data in the right place while still giving fast cold-start UX.
 */

import { create }                    from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios                          from 'axios';
import { tokenStorage }               from '@services/tokenStorage';
import { fcmService }                 from '@services/fcmService';
import { socketService }              from '@services/socketService';
import { API_BASE_URL }               from '@constants/config';
import { queryClient }                from '@lib/queryClient';
import type { User, AuthTokens }      from '@models/index';

// ── Lazy AsyncStorage (user-object persistence only — NOT tokens) ─────────────
let AsyncStorage: any = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}

// ── Raw axios (bypasses the 401 interceptor to avoid infinite loops) ──────────
const rawHttp = axios.create({ baseURL: API_BASE_URL, timeout: 10_000 });

// ─── State shape ──────────────────────────────────────────────────────────────

interface AuthState {
  // ── Persisted ──────────────────────────────────────────────────────────
  /** Cached user — restored by Zustand persist on next cold start. */
  user: User | null;

  // ── Ephemeral (not persisted) ───────────────────────────────────────────
  /** In-memory mirror of tokenStorage.getAccessToken() for hooks. */
  accessToken: string | null;
  /** True when user has a valid session (token verified). */
  isLoggedIn:  boolean;
  /** True while rehydrate() is in flight. */
  isLoading:   boolean;

  // ── Actions ────────────────────────────────────────────────────────────
  setUser:    (user: User)                 => void;
  setLoading: (v: boolean)                 => void;
  /** Called after successful login — hydrates session and connects services. */
  hydrate:    (user: User, tokens: AuthTokens) => void;
  /** Called at app startup — validates stored tokens and restores session. */
  rehydrate:  ()                           => Promise<void>;
  /** Clears session and disconnects all services. */
  logout:     ()                           => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── Initial state ──────────────────────────────────────────────────
      user:        null,
      accessToken: null,
      isLoggedIn:  false,
      isLoading:   true,

      // ── Simple setters ─────────────────────────────────────────────────
      setUser:    (user)    => set({ user }),
      setLoading: (v)       => set({ isLoading: v }),

      // ── Post-login hydration ───────────────────────────────────────────
      hydrate: (user, tokens) => {
        tokenStorage.setTokens(tokens);
        set({
          user,
          accessToken: tokens.accessToken,
          isLoggedIn:  true,
          isLoading:   false,
        });
        socketService.connect(tokens.accessToken);
        fcmService.registerToken().catch(() => {});
      },

      // ── App startup: validate + refresh if needed ──────────────────────
      rehydrate: async () => {
        set({ isLoading: true });

        try {
          let accessToken = tokenStorage.getAccessToken();

          // 1. No token → show login screen
          if (!accessToken) {
            set({ user: null, isLoggedIn: false, isLoading: false });
            return;
          }

          // 2. Validate token via /users/me
          try {
            const { data } = await rawHttp.get('/users/me', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const user: User = data.data ?? data;
            set({ user, accessToken, isLoggedIn: true, isLoading: false });
            socketService.connect(accessToken);
            fcmService.registerToken().catch(() => {});
            return; // ✅ Valid session
          } catch (verifyErr: any) {

            // 3a. Network error → optimistic with cached user
            if (!verifyErr?.response) {
              const cached = get().user;
              if (cached) {
                set({ accessToken, isLoggedIn: true, isLoading: false });
                socketService.connect(accessToken);
              } else {
                set({ user: null, isLoggedIn: false, isLoading: false });
              }
              return;
            }

            // 3b. 401 → try refresh
            if (verifyErr.response?.status === 401) {
              try {
                const refreshToken = tokenStorage.getRefreshToken();
                if (!refreshToken) throw new Error('No refresh token');

                const { data: rData } = await rawHttp.post(
                  '/auth/refresh',
                  { refreshToken },
                  { headers: { Authorization: `Bearer ${refreshToken}` } },
                );
                const { accessToken: newAt, refreshToken: newRt } = rData.data ?? rData;

                tokenStorage.setTokens({ accessToken: newAt, refreshToken: newRt });
                accessToken = newAt;

                const { data: uData } = await rawHttp.get('/users/me', {
                  headers: { Authorization: `Bearer ${newAt}` },
                });
                const user: User = uData.data ?? uData;
                set({ user, accessToken: newAt, isLoggedIn: true, isLoading: false });
                socketService.connect(newAt);
                fcmService.registerToken().catch(() => {});
                return; // ✅ Session refreshed
              } catch {
                // Both tokens invalid → force logout
                tokenStorage.clearTokens();
                set({ user: null, accessToken: null, isLoggedIn: false, isLoading: false });
                return;
              }
            }

            // 3c. 5xx or other error → optimistic
            const cached = get().user;
            set({ accessToken, isLoggedIn: !!cached, isLoading: false });
            if (cached) socketService.connect(accessToken);
          }
        } catch {
          set({ isLoading: false });
        }
      },

      // ── Logout ────────────────────────────────────────────────────────
      logout: () => {
        // Best-effort: clear any in-flight mission draft for this user.
        try {
          const uid = get().user?.id;
          if (uid) {
            const { missionDraftStorage } = require('@services/missionDraftStorage');
            missionDraftStorage.clear(uid);
          }
        } catch { /* best-effort */ }

        // Wipe all TanStack Query cache on logout — prevents data leakage
        // between users on shared devices.
        queryClient.clear();

        socketService.disconnect();
        fcmService.unregisterToken().catch(() => {});
        tokenStorage.clearTokens();
        set({ user: null, accessToken: null, isLoggedIn: false, isLoading: false });
      },
    }),
    {
      name: '@securbook:client:auth',

      // ── Custom storage adapter ─────────────────────────────────────────
      // We use AsyncStorage ONLY for the `user` object (non-sensitive UX cache).
      // Tokens are stored in Keychain via tokenStorage — this adapter never
      // touches them.
      storage: createJSONStorage(() => AsyncStorage ?? {
        // Noop storage if AsyncStorage is unavailable (unit tests, etc.)
        getItem:    () => Promise.resolve(null),
        setItem:    () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      }),

      // ── Partial state: persist user object only ────────────────────────
      partialize: (state): Pick<AuthState, 'user'> => ({ user: state.user }),

      // ── After rehydration ──────────────────────────────────────────────
      // Zustand persist restores `user` from AsyncStorage.
      // We do NOT set isLoggedIn here — rehydrate() handles that after
      // tokenStorage.hydrate() validates the tokens in Keychain.
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          if (__DEV__) console.warn('[authStore] persist rehydration failed:', error);
          return;
        }
        if (__DEV__ && state?.user) {
          console.log('[authStore] ✅ Cached user restored:', state.user.id);
        }
        // isLoading stays true until rehydrate() resolves — intentional.
      },

      version: 1,

      // ── Migration: v0 → v1 ───────────────────────────────────────────
      // Add future schema migrations here. Each migration receives the old
      // persisted state and must return the new shape.
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // v0 had `accessToken` in persisted state — remove it.
          const { accessToken: _dropped, refreshToken: _dropped2, ...rest } = persistedState;
          return rest;
        }
        return persistedState;
      },
    },
  ),
);
