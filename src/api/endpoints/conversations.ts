import apiClient from '@api/client';
import type {
  ApiResponse, Conversation, Message, SendMessagePayload,
} from '@models/index';

export const conversationsApi = {
  getByMission: (missionId: string) =>
    apiClient.get<ApiResponse<Conversation>>(`/conversations/mission/${missionId}`),

  sendMessage: (missionId: string, payload: SendMessagePayload) =>
    apiClient.post<ApiResponse<Message>>(
      `/conversations/mission/${missionId}/messages`,
      payload,
    ),

  markRead: (missionId: string) =>
    apiClient.patch<ApiResponse<null>>(`/conversations/mission/${missionId}/read`),
};
