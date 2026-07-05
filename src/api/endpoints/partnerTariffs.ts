import apiClient from '@api/client';
import type { ApiResponse } from '@models/index';

/**
 * Partner Tariff API — paths mirror the NestJS controller at
 * provalk-api/src/modules/partner/controllers/partner-tariff.controller.ts.
 *
 * The backend has full PartnerTariff CRUD (versioned per effectiveFrom)
 * for partners to manage their pricing grid.
 *
 * Authorization: PARTNER role required for most endpoints; some delete
 * operations are ADMIN-only.
 */

export interface PartnerTariff {
  id:                        string;
  companyId:                 string;
  serviceTypeId:             string;
  effectiveFrom:             string;
  effectiveTo?:              string | null;
  clientRateDayHT:           number | string;
  clientNightUplift:         number | string;
  clientSundayUplift:        number | string;
  clientHolidayUplift:       number | string;
  employerChargesRate:       number | string;
  structuralOverheadPerHour: number | string;
  vatRate:                   number | string;
  panierAmount:              number | string;
  panierMinHours:            number | string;
  targetMarginPercent?:      number | string | null;
  isActive:                  boolean;
  createdAt:                 string;
  updatedAt:                 string;
}

export interface CreatePartnerTariffPayload {
  companyId:                 string;
  serviceTypeId:             string;
  effectiveFrom:             string;
  clientRateDayHT:           number;
  clientNightUplift?:        number;
  clientSundayUplift?:       number;
  clientHolidayUplift?:      number;
  employerChargesRate?:      number;
  structuralOverheadPerHour?:number;
  vatRate?:                  number;
  panierAmount?:             number;
  panierMinHours?:           number;
  targetMarginPercent?:      number;
}

export const partnerTariffApi = {
  /** POST /partner/tariffs — create a new tariff version (PARTNER + ADMIN). */
  create: (payload: CreatePartnerTariffPayload) =>
    apiClient.post<ApiResponse<PartnerTariff>>('/partner/tariffs', payload),

  /** GET /partner/tariffs/company/:companyId — all tariffs for a company. */
  listByCompany: (companyId: string) =>
    apiClient.get<ApiResponse<PartnerTariff[]>>(`/partner/tariffs/company/${companyId}`),

  /** GET /partner/tariffs/resolve — resolve the active tariff for a company + serviceType + date. */
  resolve: (companyId: string, serviceTypeId: string, date?: string) =>
    apiClient.get<ApiResponse<PartnerTariff>>('/partner/tariffs/resolve', {
      params: { companyId, serviceTypeId, ...(date ? { date } : {}) },
    }),

  /** GET /partner/tariffs/:id — single tariff detail. */
  findOne: (id: string) =>
    apiClient.get<ApiResponse<PartnerTariff>>(`/partner/tariffs/${id}`),

  /** DELETE /partner/tariffs/:id/deactivate — soft-deactivate. */
  deactivate: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/partner/tariffs/${id}/deactivate`),

  /** DELETE /partner/tariffs/:id — hard delete (admin only). */
  remove: (id: string) =>
    apiClient.delete<ApiResponse<{ success: boolean }>>(`/partner/tariffs/${id}`),
};
