import apiClient from '@api/client';
import type { ApiResponse, AgentAvailability } from '@models/index';

/**
 * Public/client view of an agent's declared availability windows.
 * Used by the SelectAgentScreen to indicate which agents have explicitly
 * declared themselves available for the booking's time slot.
 */
export const agentAvailabilitiesApi = {
  /** Declared free windows for a given agent profile (CLIENT / ADMIN view). */
  getByAgent: (agentId: string) =>
    apiClient.get<ApiResponse<AgentAvailability[]>>(
      `/agent-availabilities/agent/${agentId}`,
    ),
};
