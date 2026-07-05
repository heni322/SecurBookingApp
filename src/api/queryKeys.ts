/**
 * queryKeys — Centralized React Query keys.
 *
 * Each domain owns a namespace. Use the helper functions so keys stay
 * consistent across queries and invalidations.
 *
 *   queryClient.invalidateQueries({ queryKey: qk.missions.all })  ? invalidate everything missions-related
 *   queryClient.invalidateQueries({ queryKey: qk.missions.nearby() }) ? just the nearby list
 *
 * Convention:
 *   • `all`         — namespace root, invalidates every query in the domain
 *   • `<list>()`    — a list endpoint (zero or more params)
 *   • `<detail>(id)` — a single-resource endpoint
 *
 * Why centralize? Stringly-typed keys spread across screens are an
 * invalidation nightmare. A misspelled key in one mutation = stale data on
 * a screen you forgot about. Keep them here.
 */

export const qk = {
  agentProfiles: {
    all:  ['agentProfiles'] as const,
    me:   () => ['agentProfiles', 'me'] as const,
    detail: (id: string) => ['agentProfiles', 'detail', id] as const,
  },

  agentDocuments: {
    all:        ['agentDocuments'] as const,
    mine:       () => ['agentDocuments', 'mine'] as const,
    compliance: () => ['agentDocuments', 'compliance'] as const,
  },

  missions: {
    all:    ['missions'] as const,
    nearby: () => ['missions', 'nearby'] as const,
    detail: (id: string) => ['missions', 'detail', id] as const,
    mine:   (scope?: string) => ['missions', 'mine', scope ?? 'all'] as const,
  },

  bookings: {
    all:    ['bookings'] as const,
    mine:   (scope?: string) => ['bookings', 'mine', scope ?? 'all'] as const,
    detail: (id: string) => ['bookings', 'detail', id] as const,
  },

  payouts: {
    all:  ['payouts'] as const,
    mine: () => ['payouts', 'mine'] as const,
  },

  notifications: {
    all:        ['notifications'] as const,
    list:       () => ['notifications', 'list'] as const,
    unread:     () => ['notifications', 'unread'] as const,
  },

  quotes: {
    all:       ['quotes'] as const,
    byMission: (missionId: string) => ['quotes', 'mission', missionId] as const,
  },

  payments: {
    all:       ['payments'] as const,
    mine:      () => ['payments', 'mine'] as const,
    byMission: (missionId: string) => ['payments', 'mission', missionId] as const,
    methods:   () => ['payments', 'methods'] as const,
  },

  // -- Employment (Phase 2 — IDCC 1351) ------------------------------------
  // Strict namespacing so a payslip generation doesn't blow away unrelated
  // contract lists. `byBooking` / `byContract` mirror the backend's lookup
  // routes (POST routes themselves don't get keys — only their reads).
  contracts: {
    all:        ['contracts'] as const,
    list:       (filter?: Record<string, unknown>) =>
                  ['contracts', 'list', filter ?? {}] as const,
    detail:     (id: string) => ['contracts', 'detail', id] as const,
    byBooking:  (bookingId: string) => ['contracts', 'by-booking', bookingId] as const,
    /** Pure read-only — server doesn't persist this, but we still cache so
     *  the preview survives quick back-and-forth on the create screen. */
    salaryPreview: (id: string) => ['contracts', 'salary-preview', id] as const,
  },

  timesheets: {
    all:        ['timesheets'] as const,
    detail:     (id: string) => ['timesheets', 'detail', id] as const,
    byContract: (contractId: string) => ['timesheets', 'by-contract', contractId] as const,
    salary:     (id: string) => ['timesheets', 'salary', id] as const,
  },

  payslips: {
    all:        ['payslips'] as const,
    detail:     (id: string) => ['payslips', 'detail', id] as const,
    /** Agent's own history — optional companyId narrows multi-employer agents. */
    forAgent:   (agentProfileId: string, companyId?: string) => ['payslips', 'agent', agentProfileId, companyId ?? 'all'] as const,
    forCompany: (companyId: string, from?: string, to?: string) => ['payslips', 'company', companyId, from ?? '', to ?? ''] as const,
  },

  disputes: {
    all:    ['disputes'] as const,
    mine:   ['disputes', 'mine'] as const,
    detail: (id: string) => ['disputes', 'detail', id] as const,
  },

  dpae: {
    all:        ['dpae'] as const,
    byContract: (contractId: string) => ['dpae', 'by-contract', contractId] as const,
    pending:    () => ['dpae', 'pending'] as const,
  },

} as const;
