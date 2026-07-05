import apiClient from '@api/client';
import type {
  ApiResponse,
  EmploymentContract,
  CreateEmploymentContractPayload,
  SignContractPayload,
  ContractFilter,
  SalaryPreview,
  Timesheet,
  CreateTimesheetPayload,
  UpdateTimesheetStatusPayload,
  ActualSalary,
  Payslip,
  GeneratePayslipPayload,
  PayslipStatus,
  Dpae,
} from '@models/index';

/**
 * Employment API — paths MUST mirror the NestJS controllers at
 * provalk-api/src/modules/employment/controllers/*.controller.ts.
 *
 * The Phase 2 employment module is the legal keystone:
 *   Booking.ASSIGNED → EmploymentContract (DRAFT)
 *                    → both parties sign (DRAFT → SIGNED, auto-DPAE)
 *                    → checkout creates Timesheet (OPEN)
 *                    → agent submits, partner approves
 *                    → partner generates Payslip
 *                    → admin validates → marks paid.
 *
 * Routes use a mix of `verb` and `verb/:id` shapes — keep in lock-step with
 * the controllers; mismatches surface as 404. Money fields arrive as Prisma
 * Decimal → JSON strings; format via toNumber().
 *
 * Auth: all routes require JWT. RBAC enforced server-side (PARTNER, AGENT,
 * ADMIN as appropriate).
 */

// -- Contracts -----------------------------------------------------------------
export const contractsApi = {
  /**
   * POST /employment/contracts — PARTNER + ADMIN.
   * Creates a DRAFT contract for an ASSIGNED booking. The hourly rate is
   * bounded by the SNEPS floor of the supplied classification.
   */
  create: (payload: CreateEmploymentContractPayload) =>
    apiClient.post<ApiResponse<EmploymentContract>>('/employment/contracts', payload),

  /** GET /employment/contracts — paginated list (filters). PARTNER + ADMIN. */
  list: (filter?: ContractFilter) =>
    apiClient.get<ApiResponse<{ items: EmploymentContract[]; total: number; page: number; limit: number }>>(
      '/employment/contracts',
      { params: filter },
    ),

  /** GET /employment/contracts/:id — detail. PARTNER, AGENT, ADMIN. */
  findOne: (id: string) =>
    apiClient.get<ApiResponse<EmploymentContract>>(`/employment/contracts/${id}`),

  /**
   * GET /employment/contracts/by-booking/:bookingId — contract linked to a booking.
   * Used by both the partner (manage screen) and agent (sign screen).
   */
  findByBooking: (bookingId: string) =>
    apiClient.get<ApiResponse<EmploymentContract>>(`/employment/contracts/by-booking/${bookingId}`),

  /**
   * PATCH /employment/contracts/:id/sign — sign as PARTNER or AGENT.
   * When both sides have signed the backend transitions the contract to
   * SIGNED and auto-creates a DPAE.
   */
  sign: (id: string, payload: SignContractPayload) =>
    apiClient.patch<ApiResponse<EmploymentContract>>(`/employment/contracts/${id}/sign`, payload),

  /** PATCH /employment/contracts/:id/cancel — DRAFT / SENT_FOR_SIGNATURE only. */
  cancel: (id: string, reason: string) =>
    apiClient.patch<ApiResponse<EmploymentContract>>(`/employment/contracts/${id}/cancel`, { reason }),

  /**
   * GET /employment/contracts/:id/salary-preview — read-only legal salary
   * computation on the contract's planned hours + frozen classification.
   * No DB write; safe to call repeatedly.
   */
  salaryPreview: (id: string) =>
    apiClient.get<ApiResponse<SalaryPreview>>(`/employment/contracts/${id}/salary-preview`),

  /** POST /employment/contracts/:id/generate-pdf — generate and return a pre-signed download URL. */
  generatePdfUrl: (id: string) =>
    apiClient.post<ApiResponse<{ url: string; objectName: string }>>(`/employment/contracts/${id}/generate-pdf`),
};

// -- Timesheets ----------------------------------------------------------------
export const timesheetsApi = {
  /**
   * POST /employment/timesheets — PARTNER + ADMIN manual correction.
   * In normal flow the timesheet is auto-created at checkout.
   */
  create: (payload: CreateTimesheetPayload) =>
    apiClient.post<ApiResponse<Timesheet>>('/employment/timesheets', payload),

  /** GET /employment/timesheets/:id — detail. PARTNER, AGENT, ADMIN. */
  findOne: (id: string) =>
    apiClient.get<ApiResponse<Timesheet>>(`/employment/timesheets/${id}`),

  /** GET /employment/timesheets/by-contract/:contractId — timesheet linked to a contract. */
  findByContract: (contractId: string) =>
    apiClient.get<ApiResponse<Timesheet>>(`/employment/timesheets/by-contract/${contractId}`),

  /**
   * PATCH /employment/timesheets/:id/status — advance the workflow.
   * OPEN → AGENT_SUBMITTED (agent) → PARTNER_APPROVED (partner) → LOCKED (admin).
   * PARTNER_APPROVED freezes hoursBreakdown and triggers actual-salary recompute.
   */
  updateStatus: (id: string, payload: UpdateTimesheetStatusPayload) =>
    apiClient.patch<ApiResponse<Timesheet>>(`/employment/timesheets/${id}/status`, payload),

  /**
   * GET /employment/timesheets/:id/salary — actual-hours salary computation.
   * PARTNER + ADMIN. Read-only — used by the payslip generator.
   */
  actualSalary: (id: string) =>
    apiClient.get<ApiResponse<ActualSalary>>(`/employment/timesheets/${id}/salary`),
};

// -- Payslips ------------------------------------------------------------------
export const payslipsApi = {
  /**
   * POST /employment/payslips/generate — PARTNER + ADMIN.
   * Aggregates every PARTNER_APPROVED non-billed timesheet of the agent over
   * the period into a DRAFT payslip with IDCC 1351 lines. Included timesheets
   * transition to LOCKED as a side effect.
   */
  generate: (payload: GeneratePayslipPayload) =>
    apiClient.post<ApiResponse<Payslip>>('/employment/payslips/generate', payload),

  /** GET /employment/payslips/:id — detail with lines. PARTNER, AGENT, ADMIN. */
  findOne: (id: string) =>
    apiClient.get<ApiResponse<Payslip>>(`/employment/payslips/${id}`),

  /**
   * GET /employment/payslips/agent/:agentProfileId — agent's payslip history.
   * Optional companyId narrows multi-employer agents.
   */
  findForAgent: (agentProfileId: string, companyId?: string) =>
    apiClient.get<ApiResponse<Payslip[]>>(`/employment/payslips/agent/${agentProfileId}`, {
      params: companyId ? { companyId } : undefined,
    }),

  /** GET /employment/payslips/company/:companyId — company payslips over period. */
  findForCompany: (companyId: string, from?: string, to?: string) =>
    apiClient.get<ApiResponse<Payslip[]>>(`/employment/payslips/company/${companyId}`, {
      params: { from, to },
    }),

  /** PATCH /employment/payslips/:id/status — ADMIN: DRAFT → VALIDATED → PAID. */
  updateStatus: (id: string, status: PayslipStatus) =>
    apiClient.patch<ApiResponse<Payslip>>(`/employment/payslips/${id}/status`, { status }),
};

// -- DPAE (URSSAF) -------------------------------------------------------------
// Mostly admin territory, but partners need a read on the per-contract DPAE
// to display submission status. The agent never sees DPAE directly.
export const dpaeApi = {
  /** GET /employment/dpae/pending — ADMIN. */
  findPending: () =>
    apiClient.get<ApiResponse<Dpae[]>>('/employment/dpae/pending'),

  /** GET /employment/dpae/by-contract/:contractId — PARTNER + ADMIN read. */
  findByContract: (contractId: string) =>
    apiClient.get<ApiResponse<Dpae>>(`/employment/dpae/by-contract/${contractId}`),

  /** POST /employment/dpae/:id/submit — ADMIN manual URSSAF submission. */
  submit: (id: string) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/employment/dpae/${id}/submit`),

  /** POST /employment/dpae/retry-failed — ADMIN bulk retry FAILED DPAEs. */
  retryFailed: () =>
    apiClient.post<ApiResponse<{ message: string }>>('/employment/dpae/retry-failed'),
};

/**
 * Convenience aggregate — import the whole employment surface in one line:
 *   `import { employmentApi } from '@api/endpoints/employment';`
 */
export const employmentApi = {
  contracts:  contractsApi,
  timesheets: timesheetsApi,
  payslips:   payslipsApi,
  dpae:       dpaeApi,
};
