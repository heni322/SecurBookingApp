import apiClient from '../client';
import type { ApiResponse, TaskCatalogEntry } from '@models/index';

/**
 * Catalogue des tâches par service (GET /service-tasks).
 *
 * La mission = service + tâches cochées ; les observations sont informatives.
 * Aucune liste de tâches n'est codée en dur dans l'app : tout vient d'ici.
 */
export const serviceTasksApi = {
  /** Tâches et exclusions des services demandés (vide = tous les services actifs). */
  catalog: (serviceTypeIds?: string[]) =>
    apiClient.get<ApiResponse<TaskCatalogEntry[]>>('/service-tasks', {
      params: serviceTypeIds?.length ? { serviceTypeIds: serviceTypeIds.join(',') } : undefined,
    }),
};
