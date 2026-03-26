import apiClient from '@api/client';
import type {
  ApiResponse,
  ServiceType,
} from '@types/index';

export const serviceTypesApi = {
  // GET /service-types?all=false (active only by default)
  findAll: (includeInactive = false) =>
    apiClient.get<ApiResponse<ServiceType[]>>('/service-types', {
      params: { all: includeInactive },
    }),

  // GET /service-types/:id
  findOne: (id: string) =>
    apiClient.get<ApiResponse<ServiceType>>(`/service-types/${id}`),

  // POST /service-types  [ADMIN]
  create: (payload: Partial<ServiceType>) =>
    apiClient.post<ApiResponse<ServiceType>>('/service-types', payload),

  // PATCH /service-types/:id  [ADMIN]
  update: (id: string, payload: Partial<ServiceType>) =>
    apiClient.patch<ApiResponse<ServiceType>>(`/service-types/${id}`, payload),

  // DELETE /service-types/:id  [ADMIN]
  remove: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/service-types/${id}`),
};
