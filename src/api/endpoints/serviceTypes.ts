import apiClient from '@api/client';
import type { ApiResponse, ServiceType } from '@models/index';

export const serviceTypesApi = {
  findAll: (includeInactive = false) =>
    apiClient.get<ApiResponse<ServiceType[]>>('/service-types', {
      params: { all: includeInactive },
    }),

  findOne: (id: string) =>
    apiClient.get<ApiResponse<ServiceType>>(`/service-types/${id}`),
};
