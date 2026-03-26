import { useState, useCallback } from 'react';
import { authApi }      from '@api/endpoints/auth';
import { tokenStorage } from '@services/tokenStorage';
import { useAuthStore } from '@store/authStore';
import type { LoginPayload, RegisterPayload, AuthTokens, User } from '@models/index';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleError = (err: unknown): string =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (err instanceof Error ? err.message : 'Erreur inattendue');

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true); setError(null);
    try {
      const { data } = await authApi.login(payload);
      const { tokens } = data.data as { user: User; tokens: AuthTokens };
      tokenStorage.setTokens(tokens);
      return data.data;
    } catch (err) {
      setError(handleError(err));
      return null;
    } finally { setLoading(false); }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setLoading(true); setError(null);
    try {
      const { data } = await authApi.register(payload);
      const { tokens } = data.data as { user: User; tokens: AuthTokens };
      tokenStorage.setTokens(tokens);
      return data.data;
    } catch (err) {
      setError(handleError(err));
      return null;
    } finally { setLoading(false); }
  }, []);

  const logout = useCallback(() => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) authApi.logout(refreshToken).catch(() => {});
    useAuthStore.getState().logout();
  }, []);

  return { login, register, logout, loading, error };
}
