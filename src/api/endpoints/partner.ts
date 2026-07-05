import apiClient from '@api/client';
import type {
  ApiResponse,
  PartnerDashboard,
  PartnerAgent,
  PartnerOnboarding,
  PartnerBillingBreakdown,
  Company,
} from '@models/index';

/** Paginated payload shape returned by /partner/list/* endpoints. */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Partner API — paths MUST mirror the NestJS controller at
 * provalk-api/src/modules/partner/partner.controller.ts.
 *
 * Backend uses `verb/...` shape (`list/agents`, `get/agents/:agentId`,
 * `list/missions`, `list/payouts`) — NOT plain REST. Mismatches surface as 404.
 *
 * Authorization: every endpoint requires a PARTNER-role JWT. RootNavigator
 * gates the partner navigator on `user.role === 'PARTNER'`, so these calls
 * are only made from partner-mode UI.
 */
export const partnerApi = {
  /** GET /partner/dashboard — tableau de bord équipe. */
  getDashboard: () =>
    apiClient.get<ApiResponse<PartnerDashboard>>('/partner/dashboard'),

  /** GET /partner/list/agents — liste des agents de l'équipe. */
  getAgents: () =>
    apiClient.get<ApiResponse<PartnerAgent[]>>('/partner/list/agents'),

  /** GET /partner/get/agents/:agentId — profil complet d'un agent. */
  getAgent: (agentId: string) =>
    apiClient.get<ApiResponse<PartnerAgent>>(`/partner/get/agents/${agentId}`),

  /** GET /partner/get/agents/:agentId/onboarding — progression dossier CNAPS (spec §2.3). */
  getAgentOnboarding: (agentId: string) =>
    apiClient.get<ApiResponse<PartnerOnboarding>>(`/partner/get/agents/${agentId}/onboarding`),

  /** GET /partner/list/missions — missions de l'équipe. */
  getMissions: (page = 1, limit = 20) =>
    apiClient.get<ApiResponse<PaginatedResult<any>>>('/partner/list/missions', { params: { page, limit } }),

  /** GET /partner/list/payouts — virements agents. */
  getPayouts: (page = 1, limit = 20) =>
    apiClient.get<ApiResponse<PaginatedResult<any>>>('/partner/list/payouts', { params: { page, limit } }),

  /** GET /partner/financials — synthèse financière. */
  getFinancials: () =>
    apiClient.get<ApiResponse<any>>('/partner/financials'),

  /** GET /partner/billing/breakdown — ventilation salaires par agent (spec §2.3). */
  getBillingBreakdown: (from?: string, to?: string) =>
    apiClient.get<ApiResponse<PartnerBillingBreakdown>>('/partner/billing/breakdown', {
      params: { from, to },
    }),

  /** POST /partner/billing/invoice — générer PDF récapitulatif. */
  generateInvoice: (from: string, to: string) =>
    apiClient.post<ApiResponse<{ url: string }>>('/partner/billing/invoice', { from, to }),

  /** PATCH /partner/company — mettre à jour la société. */
  updateCompany: (dto: Partial<Company>) =>
    apiClient.patch<ApiResponse<Company>>('/partner/company', dto),

  /** GET /partner/company - snapshot societe (prefill des formulaires). */
  getCompany: () =>
    apiClient.get<ApiResponse<Company>>('/partner/company'),
};
