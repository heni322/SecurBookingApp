import apiClient from '@api/client';
import type {
  ApiResponse,
  AgentProfile,
  AgentSearchParams,
} from '@types/index';

export const agentProfilesApi = {
  // GET /agent-profiles/search
  search: (params: AgentSearchParams) =>
    apiClient.get<ApiResponse<AgentProfile[]>>('/agent-profiles/search', { params }),

  // GET /agent-profiles/me  [AGENT]
  getMyProfile: () =>
    apiClient.get<ApiResponse<AgentProfile>>('/agent-profiles/me'),

  // GET /agent-profiles/:id
  getById: (id: string) =>
    apiClient.get<ApiResponse<AgentProfile>>(`/agent-profiles/${id}`),

  // POST /agent-profiles  [AGENT]
  create: (payload: Partial<AgentProfile>) =>
    apiClient.post<ApiResponse<AgentProfile>>('/agent-profiles', payload),

  // PATCH /agent-profiles/me  [AGENT]
  update: (payload: Partial<AgentProfile>) =>
    apiClient.patch<ApiResponse<AgentProfile>>('/agent-profiles/me', payload),

  // PATCH /agent-profiles/:id/validate  [ADMIN]
  validate: (id: string) =>
    apiClient.patch<ApiResponse<AgentProfile>>(`/agent-profiles/${id}/validate`),
};
