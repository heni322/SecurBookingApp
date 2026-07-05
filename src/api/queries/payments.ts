/**
 * usePaymentsQueries — React Query hooks for the payments domain.
 *
 * Second half of the funding loop (after an ACCEPTED quote):
 *   - Stripe online  -> useCreatePaymentIntent (hand client secret to SDK)
 *   - Offline manual -> useDeclareOfflinePayment (returns bank instructions)
 *
 * Conventions match the rest of the app: queryFn unwraps the { success, data }
 * envelope; mutations invalidate the mission's payment + detail so the funding
 * banner refreshes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import { paymentsApi } from '@api/endpoints/payments';
import { qk } from '@api/queryKeys';
import type {
  ApiResponse,
  Payment,
  CreatePaymentIntentPayload,
  DeclareOfflinePayload,
  PaymentMethod,
} from '@models/index';

function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return ((res.data as unknown as { data?: T })?.data ?? (res.data as unknown as T));
}

// -- Queries ----------------------------------------------------------------

/** The payment attached to a mission (any method). 404 = not funded yet. */
export function useMissionPayment(missionId: string | undefined) {
  return useQuery<Payment>({
    queryKey: qk.payments.byMission(missionId ?? ''),
    queryFn:  async () => unwrap(await paymentsApi.getByMission(missionId!)),
    enabled:  Boolean(missionId),
    retry:    false,
  });
}

/** The current client's payment history (Stripe + offline). */
export function useMyPayments() {
  return useQuery<Payment[]>({
    queryKey: qk.payments.mine(),
    queryFn:  async () => unwrap(await paymentsApi.getMyPayments()),
  });
}

/** Saved cards / SEPA mandates for the current client. */
export function usePaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: qk.payments.methods(),
    queryFn:  async () => unwrap(await paymentsApi.getMyMethods()),
  });
}

// -- Mutations --------------------------------------------------------------

/**
 * Start a Stripe payment. Returns the client secret payload — the screen then
 * confirms it with the Stripe SDK and waits for the webhook to flip the
 * mission to PUBLISHED.
 */
export function useCreatePaymentIntent(missionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['payments', 'create-intent'],
    mutationFn: (payload: CreatePaymentIntentPayload) => paymentsApi.createIntent(payload),
    onSuccess: () => {
      if (missionId) {
        qc.invalidateQueries({ queryKey: qk.payments.byMission(missionId) });
      }
    },
  });
}

/**
 * Declare an offline payment (VIREMENT / CHEQUE). Returns bank instructions
 * for the client to act on. Status stays PENDING until an admin confirms.
 */
export function useDeclareOfflinePayment(missionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['payments', 'declare-offline'],
    mutationFn: (payload: DeclareOfflinePayload) => paymentsApi.declareOffline(payload),
    onSuccess: () => {
      if (missionId) {
        qc.invalidateQueries({ queryKey: qk.payments.byMission(missionId) });
        qc.invalidateQueries({ queryKey: qk.missions.detail(missionId) });
      }
      qc.invalidateQueries({ queryKey: qk.payments.mine() });
    },
  });
}

/** Detach a saved payment method, then refresh the list. */
export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['payments', 'delete-method'],
    mutationFn: (paymentMethodId: string) => paymentsApi.detachMethod(paymentMethodId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.payments.methods() });
    },
  });
}
