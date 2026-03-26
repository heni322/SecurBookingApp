import apiClient from '@api/client';
import type {
  ApiResponse,
  AgentDocument,
  CreateAgentDocumentPayload,
} from '@types/index';

export const agentDocumentsApi = {
  // GET /agent-documents/me  [AGENT]
  getMyDocuments: () =>
    apiClient.get<ApiResponse<AgentDocument[]>>('/agent-documents/me'),

  // POST /agent-documents/me  [AGENT]
  addDocument: (payload: CreateAgentDocumentPayload) =>
    apiClient.post<ApiResponse<AgentDocument>>('/agent-documents/me', payload),

  // GET /agent-documents/pending  [ADMIN]
  getAllPending: () =>
    apiClient.get<ApiResponse<AgentDocument[]>>('/agent-documents/pending'),

  // GET /agent-documents/agent/:agentId  [ADMIN | PARTNER]
  getByAgent: (agentId: string) =>
    apiClient.get<ApiResponse<AgentDocument[]>>(`/agent-documents/agent/${agentId}`),

  // PATCH /agent-documents/:id/review  [ADMIN]
  review: (id: string, payload: { status: string; rejectedReason?: string }) =>
    apiClient.patch<ApiResponse<AgentDocument>>(`/agent-documents/${id}/review`, payload),
};
