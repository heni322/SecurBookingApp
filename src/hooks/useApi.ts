/**
 * useApi — wrapper générique pour les appels API.
 * Extrait automatiquement `response.data.data` (enveloppe ApiResponse).
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ApiResponse } from '@models/index';
import type { AxiosResponse } from 'axios';

interface ApiState<T> {
  data:    T | null;
  loading: boolean;
  error:   string | null;
}

type ApiFunction<TArgs extends unknown[], TData> = (
  ...args: TArgs
) => Promise<AxiosResponse<ApiResponse<TData>>>;

export function useApi<TArgs extends unknown[], TData>(
  apiFunc: ApiFunction<TArgs, TData>,
) {
  const [state, setState] = useState<ApiState<TData>>({
    data:    null,
    loading: false,
    error:   null,
  });

  // Empêche les mises à jour sur un composant démonté
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(
    async (...args: TArgs): Promise<TData | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await apiFunc(...args);
        // L'API retourne toujours { success, message, data: TData }
        // On extrait uniquement le champ `data` typé TData
        const payload: TData = response.data.data;
        if (mountedRef.current) {
          setState({ data: payload, loading: false, error: null });
        }
        return payload;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })
            ?.response?.data?.message ??
          (err instanceof Error ? err.message : 'Une erreur est survenue');
        if (mountedRef.current) {
          setState((prev) => ({ ...prev, loading: false, error: message }));
        }
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFunc],
  );

  return { ...state, execute };
}
