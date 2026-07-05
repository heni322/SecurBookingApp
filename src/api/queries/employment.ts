/**
 * useEmploymentQueries — React Query hooks for the employment domain.
 *
 * The Phase 2 employment module is a tight state machine:
 *   contract create → both-sided signature → DPAE → checkout/timesheet
 *     → agent-submit → partner-approve → payslip generate → admin validate/pay.
 *
 * Invalidation strategy
 * ─────────────────────
 * Every mutation invalidates BOTH the source entity AND the entities that
 * embed/depend on it, so screens deeper in the flow stay fresh:
 *   - contract.create / contract.sign  → contracts.* + bookings.detail
 *   - timesheet.updateStatus           → timesheets.* + contracts.byBooking
 *   - payslip.generate                 → payslips.* + timesheets.byContract
 *
 * Conventions match the rest of the app: queryFn unwraps the
 * `{ success, data }` envelope produced by the backend interceptor.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import {
  contractsApi,
  timesheetsApi,
  payslipsApi,
  dpaeApi,
} from '@api/endpoints/employment';
import { qk } from '@api/queryKeys';
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

function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  // Standard envelope is { success, data, timestamp }. Be tolerant of a rare
  // double-wrap ({ data: { success, data } }) so a malformed envelope never
  // leaks the wrapper object to a screen that expects the bare entity.
  const lvl1 = (res.data as unknown as { data?: unknown })?.data ?? res.data;
  if (
    lvl1 &&
    typeof lvl1 === "object" &&
    "success" in (lvl1 as Record<string, unknown>) &&
    "data" in (lvl1 as Record<string, unknown>)
  ) {
    return (lvl1 as { data: T }).data;
  }
  return lvl1 as T;
}

// ─── Contracts ──────────────────────────────────────────────────────────────

/** Paginated contracts list — partner dashboard. */
export function useContracts(filter?: ContractFilter) {
  return useQuery<{ items: EmploymentContract[]; total: number; page: number; limit: number }>({
    queryKey: qk.contracts.list(filter as Record<string, unknown> | undefined),
    queryFn:  async () => unwrap(await contractsApi.list(filter)),
  });
}

/** Single contract by id. */
export function useContract(id: string | undefined) {
  return useQuery<EmploymentContract>({
    queryKey: qk.contracts.detail(id ?? ''),
    queryFn:  async () => unwrap(await contractsApi.findOne(id!)),
    enabled:  Boolean(id),
  });
}

/**
 * Contract linked to a booking. The detail screens (agent + partner) both
 * resolve via this hook so they get cache hits across navigations.
 * `retry: false` because a missing contract is an expected 404 (DRAFT not
 * created yet) — we don't want to hammer the API.
 */
export function useContractByBooking(bookingId: string | undefined) {
  return useQuery<EmploymentContract>({
    queryKey: qk.contracts.byBooking(bookingId ?? ''),
    queryFn:  async () => unwrap(await contractsApi.findByBooking(bookingId!)),
    enabled:  Boolean(bookingId),
    retry:    false,
  });
}

/** Read-only legal salary preview for a contract. */
export function useContractSalaryPreview(contractId: string | undefined) {
  return useQuery<SalaryPreview>({
    queryKey: qk.contracts.salaryPreview(contractId ?? ''),
    queryFn:  async () => unwrap(await contractsApi.salaryPreview(contractId!)),
    enabled:  Boolean(contractId),
  });
}

/**
 * Create a DRAFT contract (PARTNER). Invalidates everything that might show
 * the contract: list, by-booking lookup, and the underlying booking detail.
 */
export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['contracts', 'create'],
    mutationFn: (payload: CreateEmploymentContractPayload) => contractsApi.create(payload),
    onSuccess: (_res, payload) => {
      qc.invalidateQueries({ queryKey: qk.contracts.all });
      qc.invalidateQueries({ queryKey: qk.contracts.byBooking(payload.bookingId) });
      qc.invalidateQueries({ queryKey: qk.bookings.detail(payload.bookingId) });
    },
  });
}

/**
 * Sign a contract (PARTNER or AGENT). Pass `bookingId` to also invalidate the
 * booking detail so the action buttons re-render with the new contract state.
 */
export function useSignContract(bookingId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['contracts', 'sign'],
    mutationFn: (vars: { id: string; payload: SignContractPayload }) =>
      contractsApi.sign(vars.id, vars.payload),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: qk.contracts.detail(vars.id) });
      qc.invalidateQueries({ queryKey: qk.contracts.all });
      if (bookingId) {
        qc.invalidateQueries({ queryKey: qk.contracts.byBooking(bookingId) });
        qc.invalidateQueries({ queryKey: qk.bookings.detail(bookingId) });
      }
      // DPAE is auto-created on full signature — refresh that too.
      qc.invalidateQueries({ queryKey: qk.dpae.all });
    },
  });
}

/** Cancel a DRAFT/SENT contract. */
export function useCancelContract(bookingId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['contracts', 'cancel'],
    mutationFn: (vars: { id: string; reason: string }) =>
      contractsApi.cancel(vars.id, vars.reason),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: qk.contracts.detail(vars.id) });
      qc.invalidateQueries({ queryKey: qk.contracts.all });
      if (bookingId) {
        qc.invalidateQueries({ queryKey: qk.contracts.byBooking(bookingId) });
        qc.invalidateQueries({ queryKey: qk.bookings.detail(bookingId) });
      }
    },
  });
}

// ─── Timesheets ─────────────────────────────────────────────────────────────

export function useTimesheet(id: string | undefined) {
  return useQuery<Timesheet>({
    queryKey: qk.timesheets.detail(id ?? ''),
    queryFn:  async () => unwrap(await timesheetsApi.findOne(id!)),
    enabled:  Boolean(id),
  });
}

/**
 * Timesheet attached to a contract. The agent-submit and partner-approve
 * screens both resolve via this hook; `retry: false` because a missing
 * timesheet means "checkout not done yet" (expected 404).
 */
export function useTimesheetByContract(contractId: string | undefined) {
  return useQuery<Timesheet>({
    queryKey: qk.timesheets.byContract(contractId ?? ''),
    queryFn:  async () => unwrap(await timesheetsApi.findByContract(contractId!)),
    enabled:  Boolean(contractId),
    retry:    false,
  });
}

/** Actual-hours salary computation for an approved timesheet. */
export function useTimesheetActualSalary(timesheetId: string | undefined, enabled = true) {
  return useQuery<ActualSalary>({
    queryKey: qk.timesheets.salary(timesheetId ?? ''),
    queryFn:  async () => unwrap(await timesheetsApi.actualSalary(timesheetId!)),
    enabled:  Boolean(timesheetId) && enabled,
  });
}

/** Manual timesheet creation/correction (partner + admin). */
export function useCreateTimesheet(contractId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['timesheets', 'create'],
    mutationFn: (payload: CreateTimesheetPayload) => timesheetsApi.create(payload),
    onSuccess: (_res, payload) => {
      qc.invalidateQueries({ queryKey: qk.timesheets.all });
      qc.invalidateQueries({ queryKey: qk.timesheets.byContract(payload.contractId) });
      if (contractId && contractId !== payload.contractId) {
        qc.invalidateQueries({ queryKey: qk.timesheets.byContract(contractId) });
      }
    },
  });
}

/**
 * Advance a timesheet's status. Used by:
 *   - agent → AGENT_SUBMITTED
 *   - partner → PARTNER_APPROVED
 *   - admin → LOCKED (typically done via payslip generation)
 * Pass `contractId` so the by-contract cache also refreshes.
 */
export function useUpdateTimesheetStatus(contractId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['timesheets', 'update-status'],
    mutationFn: (vars: { id: string; payload: UpdateTimesheetStatusPayload }) =>
      timesheetsApi.updateStatus(vars.id, vars.payload),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: qk.timesheets.detail(vars.id) });
      qc.invalidateQueries({ queryKey: qk.timesheets.all });
      if (contractId) {
        qc.invalidateQueries({ queryKey: qk.timesheets.byContract(contractId) });
      }
      // The salary recompute changes on PARTNER_APPROVED — drop the cache.
      qc.invalidateQueries({ queryKey: qk.timesheets.salary(vars.id) });
    },
  });
}

// ─── Payslips ───────────────────────────────────────────────────────────────

export function usePayslip(id: string | undefined) {
  return useQuery<Payslip>({
    queryKey: qk.payslips.detail(id ?? ''),
    queryFn:  async () => unwrap(await payslipsApi.findOne(id!)),
    enabled:  Boolean(id),
  });
}

/** Agent's payslip history. */
export function usePayslipsForAgent(agentProfileId: string | undefined, companyId?: string) {
  return useQuery<Payslip[]>({
    queryKey: qk.payslips.forAgent(agentProfileId ?? '', companyId),
    queryFn:  async () => unwrap(await payslipsApi.findForAgent(agentProfileId!, companyId)),
    enabled:  Boolean(agentProfileId),
  });
}

/** Partner: payslips for the whole company over a period. */
export function usePayslipsForCompany(companyId: string | undefined, from?: string, to?: string) {
  return useQuery<Payslip[]>({
    queryKey: qk.payslips.forCompany(companyId ?? '', from, to),
    queryFn:  async () => unwrap(await payslipsApi.findForCompany(companyId!, from, to)),
    enabled:  Boolean(companyId),
  });
}

/**
 * Generate a payslip (partner). Refreshes the agent's history, the company
 * payslip list, and every per-contract timesheet cache (they transition to
 * LOCKED as a side effect of generation).
 */
export function useGeneratePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['payslips', 'generate'],
    mutationFn: (payload: GeneratePayslipPayload) => payslipsApi.generate(payload),
    onSuccess: (_res, payload) => {
      qc.invalidateQueries({ queryKey: qk.payslips.all });
      qc.invalidateQueries({ queryKey: qk.payslips.forAgent(payload.agentProfileId) });
      qc.invalidateQueries({ queryKey: qk.payslips.forCompany(payload.companyId) });
      // Timesheets folded into this payslip move to LOCKED — clear them.
      qc.invalidateQueries({ queryKey: qk.timesheets.all });
    },
  });
}

/** Admin payslip status transitions (DRAFT → VALIDATED → PAID). */
export function useUpdatePayslipStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['payslips', 'update-status'],
    mutationFn: (vars: { id: string; status: PayslipStatus }) =>
      payslipsApi.updateStatus(vars.id, vars.status),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: qk.payslips.detail(vars.id) });
      qc.invalidateQueries({ queryKey: qk.payslips.all });
    },
  });
}

// ─── DPAE ───────────────────────────────────────────────────────────────────

/** DPAE attached to a contract (partner read view). 404 if not generated yet. */
export function useDpaeByContract(contractId: string | undefined) {
  return useQuery<Dpae>({
    queryKey: qk.dpae.byContract(contractId ?? ''),
    queryFn:  async () => unwrap(await dpaeApi.findByContract(contractId!)),
    enabled:  Boolean(contractId),
    retry:    false,
  });
}

/** Admin: pending DPAE list. */
export function usePendingDpae() {
  return useQuery<Dpae[]>({
    queryKey: qk.dpae.pending(),
    queryFn:  async () => unwrap(await dpaeApi.findPending()),
  });
}

/** Admin manual DPAE submission. */
export function useSubmitDpae() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['dpae', 'submit'],
    mutationFn: (id: string) => dpaeApi.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.dpae.all });
    },
  });
}

/** Admin bulk retry of FAILED DPAEs. */
export function useRetryFailedDpae() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['dpae', 'retry-failed'],
    mutationFn: () => dpaeApi.retryFailed(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.dpae.all });
    },
  });
}
