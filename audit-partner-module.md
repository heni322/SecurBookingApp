# Enterprise Audit — Partner Module
**Projects:** `D:\SecurBookingApp` (React Native) · `D:\securbook-api` (backend)
**Date:** 2026-07-04
**Scope & method:** Evidence-based audit of the Partner module. Files actually read end-to-end: `partner.controller.ts`, `partner.service.ts`, `partner.dto.ts`, `partner-pricing.controller.ts`, `partner-documents.controller.ts`, `partner-documents.service.ts`, `prisma/schema.prisma` (Company, AgentProfile, Booking, AgentPayout, PartnerDocument-adjacent models), `main.ts`, `prisma.service.ts`, `math.util.ts`, and frontend `partner.ts` (API bindings), `PartnerMissionsScreen.tsx`, `PartnerBillingScreen.tsx`, `PartnerCompanyEditScreen.tsx`. Every issue below is tied to a file/line-region. Areas **not** read line-by-line (auth module internals, upload/MinIO service, tariff service, remaining 10 partner screens, migrations, tests) are marked ⚠️ *to verify* where relevant.

---

## ⚠️ Correction to the audit brief

The brief assumes a **Laravel** backend. The actual backend is **NestJS 10+ (TypeScript) with Prisma ORM on PostgreSQL**, structured as controllers → services → (occasionally repositories) → Prisma. All Laravel-specific checklist items (Eloquent, Sanctum, Policies, Observers, Blade) are inapplicable and were mapped to their NestJS equivalents (guards, DTOs + class-validator, interceptors, `@Cron` jobs, Prisma schema).

---

## 1. Executive Summary

| Dimension | Score | Notes |
|---|---|---|
| **Overall** | **68/100** | Solid architecture, one critical financial-correctness bug, several broken FE/BE contracts |
| Backend | 74/100 | Clean module structure, strong schema, guards everywhere; Decimal math bug, missing state guards |
| Frontend | 62/100 | Polished UI, good empty/loading states; silent error swallowing, contract mismatches, no pagination |
| Security | 78/100 | Ownership checks, helmet, CSRF defense-in-depth, sanitize pipe; 7-day access tokens, CSP `unsafe-inline` |
| UX | 70/100 | Consistent design system; misleading "SIRET valide" badge, confusing icons, no initial data load on Billing |
| France compliance | 72/100 | CNAPS/URSSAF/Kbis document pipeline, RGPD retention, CCN 1351 fields — genuinely strong. Gaps: APE/NAF, legal rep, sequential invoice numbering |
| Enterprise readiness | 55/100 | No bulk actions, export, tags, saved filters, partner lifecycle (deactivate/archive), or audit-trail UI |

**Headline:** the Partner module is far more mature than a typical CRUD app — soft deletes, status-history tables, RGPD retention crons, CNAPS-aware document compliance, Decimal money columns. But **partner financial totals are very likely corrupted at runtime** (Issue C1), and **the invoice-PDF feature is broken end-to-end by a key-name mismatch** (Issue C2). Fix those two before anything else.

---

## 2. Critical Issues

| # | Issue | Severity | Location | Recommendation |
|---|---|---|---|---|
| **C1** | **Decimal arithmetic on payout amounts produces corrupt totals.** `AgentPayout.amount` is `Decimal @db.Decimal(12,2)` (schema.prisma, AgentPayout). Prisma returns Decimal.js objects, whose `valueOf()` yields a **string**. `partner.service.ts` does `payouts.reduce((s, p) => s + p.amount, 0)` in `getFinancials()` and `_buildBillingBreakdown()` → with ≥2 payouts this string-concatenates, then `round2()` (a `number`-only helper, math.util.ts) yields `NaN`. These totals feed the partner dashboard, the billing breakdown, **and the generated invoice PDF**. The team's own comment in `prisma.service.ts` ("latent Prisma Decimal vs number type mismatches… tracked separately") corroborates. | 🔴 Critical | `partner.service.ts` → `getFinancials()` (~L330), `_buildBillingBreakdown()` (~L360–430); `common/utils/math.util.ts` | Convert at the boundary: `p.amount.toNumber()` or better use the existing `Money` value object (`shared-kernel/money`) referenced in math.util.ts. Add a unit test with ≥2 Decimal payouts. Audit every `reduce`/`+` on Decimal fields repo-wide. |
| **C2** | **Invoice PDF link never reaches the user.** Backend `generatePartnerInvoice()` returns `{ url }` (`partner.service.ts` ~L470). Frontend expects `pdfUrl`: typed `ApiResponse<{ pdfUrl: string }>` in `api/endpoints/partner.ts` and read as `data?.pdfUrl ?? pdfUrl` in `PartnerBillingScreen.tsx` → `handleGenerate()`. `url` is always undefined → app shows the generic "generated" alert and the PDF is unreachable. | 🔴 Critical (feature broken) | FE: `PartnerBillingScreen.tsx` `handleGenerate()` (~L95); BE: `partner.service.ts` `generatePartnerInvoice()` | Align on one key (`url`), fix the FE type, and add a contract test (or generate the FE client from the Swagger spec so this class of bug is impossible). |
| **C3** | **Document review has no state guard and no transaction.** `PartnerDocumentsService.review()` re-reviews docs in any state (re-approving an APPROVED doc re-fires the "fully compliant" notification storm); the review write, compliance recomputation and notifications are not atomic. | 🔴 High | `partner-documents.service.ts` → `review()` (~L300–370) | Reject non-PENDING docs (`409`), wrap review+compliance-check in `prisma.safeTransaction()` (already exists), move notifications post-commit. |

---

## 3. Medium Issues

| # | Issue | Location | Recommendation |
|---|---|---|---|
| M1 | **Missions/payouts pagination contract ignored by FE.** Backend returns `{ data, meta }` paginated (default 20, max 100); `partnerApi.getMissions()`/`getPayouts()` pass no `page`/`limit` and are typed `ApiResponse<any[]>`. Any consumer silently truncates at 20 with no paging UI. Note `PartnerMissionsScreen` actually calls `missionsApi.getPosted()` instead — `partnerApi.getMissions` may be dead code (⚠️ verify usages). | `api/endpoints/partner.ts`; `partner.service.ts` `getMissions()/getPayouts()` | Add typed `PaginatedResponse<T>` on FE, wire infinite scroll, or delete the dead bindings. |
| M2 | **SIRET Luhn validated client-side only.** Backend accepts any `\d{14}` (`Matches(/^\d{14}$/)` in `partner.dto.ts` — Update/Invite/CreateDirect). Admin-created partners can carry checksum-invalid SIRETs. | `partner.dto.ts` (3 DTOs) | Add a `@Validate(SiretLuhn)` custom validator server-side (mind the La Poste exception). Ideally verify against INSEE Sirene API on create. |
| M3 | **Misleading "SIRET valide" badge.** The green badge shows whenever `siret.length === 14 && !errors.siret`, but Luhn only runs on save — an invalid 14-digit SIRET displays "SIRET valide" until submit. | `PartnerCompanyEditScreen.tsx` (~L200) | Run `isValidSiret()` live in the render condition. |
| M4 | **Partner can silently change its own SIRET** via `PATCH /partner/company` with no re-verification workflow; a change of legal identity should re-trigger document/compliance review. Also, updating to an existing SIRET hits the `@unique` constraint → Prisma P2002 (⚠️ verify the exception filter maps it to 409, not 500). | `partner.controller.ts` `updateCompany`; `partner.service.ts` `updateCompany()` | Either make SIRET admin-only after creation, or flag the company `PENDING_REVERIFICATION` on change. Handle P2002 explicitly. |
| M5 | **Document ownership tied to uploader's personal namespace.** `addDocument()` requires `objectName` to start with `agents/{userId}/` — (a) partner files live under an `agents/` prefix (acknowledged smell), (b) in a company with several PARTNER users, user B can't submit a file uploaded by user A, and re-submission after the uploader leaves the company breaks. | `partner-documents.service.ts` `addDocument()` (~L215) | Introduce a `companies/{companyId}/` namespace in the upload service and validate ownership at company level. |
| M6 | **N+1 and sequential awaits in crons/notifications.** `sendPartnerExpiryWarnings()` and `checkExpiredPartnerDocuments()` query PARTNER users per document in a loop; `review()` awaits `notifyOne` per user sequentially. Fine at 50 partners, painful at 5,000. | `partner-documents.service.ts` crons + `review()` | Batch: one `findMany` grouped by `companyId`, `Promise.allSettled` for notifications. |
| M7 | **Company data over-fetched via dashboard.** `PartnerCompanyEditScreen` calls `getDashboard()` (KPIs + agents + aggregates) just to prefill 5 company fields; there is no `GET /partner/company`. | `PartnerCompanyEditScreen.tsx` `useEffect`; `partner.controller.ts` | Add `GET /partner/company` returning the company snapshot. |
| M8 | **Unfinished company-edit UI.** `UpdateCompanyDto` supports `billingAddress/billingCity/billingZipCode/vatNumber/logoUrl`, but the edit screen exposes none of them — partners cannot maintain their own billing identity, which then prints on the invoice PDF (`generatePartnerInvoice` reads `company.billingAddress`, `vatNumber`). | `PartnerCompanyEditScreen.tsx` vs `partner.dto.ts` | Add a "Facturation" section (billing address, TVA) + logo upload. |
| M9 | **7-day access tokens.** Swagger docs state access 7d / refresh 30d — long for an enterprise security product handling CNAPS data. | `main.ts` Swagger description (⚠️ verify auth module config) | 15–60 min access tokens + rotation on refresh. |
| M10 | **`ScrollView` + `.map()` instead of `FlatList`** for mission lists (all items mounted; no windowing, no `onEndReached` pagination). | `PartnerMissionsScreen.tsx` | Migrate to `FlatList` with `keyExtractor`, pull-to-refresh preserved, paged loading. |
| M11 | **Errors swallowed into empty states.** `load()` does `catch { setMissions([]) }` — a network failure renders as "no missions", inviting wrong business conclusions; company-edit prefill catch is fully silent. | `PartnerMissionsScreen.tsx` `load()`; `PartnerCompanyEditScreen.tsx` `useEffect` | Distinct error state with retry button (the codebase already has an `errorBanner` pattern in PartnerBillingScreen — reuse it). |
| M12 | **Non-REST route shapes** — `GET /partner/list/agents`, `GET /partner/get/:id`, acknowledged in FE comments as "NOT plain REST. Mismatches surface as 404." Inconsistent with the rest of the API and Swagger-unfriendly. | `partner.controller.ts` routes | Alias to `GET /partner/agents`, `GET /partners/:id`; deprecate verb paths. |

---

## 4. Minor Issues

| # | Issue | Location |
|---|---|---|
| m1 | Hardcoded French strings bypass the 28 KB fr i18n catalog: `'SIRET invalide — 14 chiffres requis'`, `'SIRET valide'`, `'Code postal invalide (5 chiffres)'`. | `PartnerCompanyEditScreen.tsx` `validate()` |
| m2 | `X` (close) icon on the period selector button whose action is *open picker* — icon semantics inverted. | `PartnerBillingScreen.tsx` period button |
| m3 | Billing preview never loads on mount — despite `from/to` defaulting to the current year, `loadPreview` only fires from `applyPreset`, so first render shows the empty card. | `PartnerBillingScreen.tsx` |
| m4 | `where: any` in `searchPartners` defeats Prisma typing; search response embeds **all** users of every company (heavy payload, PII fan-out to the admin list view). | `partner.service.ts` `searchPartners()` |
| m5 | `searchPartners` has no `sort` parameter (fixed `createdAt desc`) and no compliance-status filter. | same |
| m6 | Duplicate endpoints: `PATCH :id/approve`, `:id/reject`, and `:id/review` all resolve to the same service path — fine transitionally, but the deprecation is only stated in a Swagger description. | `partner-documents.controller.ts` |
| m7 | `POST /partner/pricing/me` and `PUT /partner/pricing/me` both call `upsertMyPrice` — POST documented as "create" but performs upsert (409-on-duplicate never happens). | `partner-pricing.controller.ts` |
| m8 | Mojibake in cron notification title: `'â›" Document partenaire expiré'` — file/emoji encoding corruption, will render garbage in push notifications. | `partner-documents.service.ts` `checkExpiredPartnerDocuments()` |
| m9 | CSP allows `script-src 'unsafe-inline'` (presumably for Swagger UI) — scope it to the docs route only. | `main.ts` helmet config |
| m10 | `getMyDocumentFileUrl` legacy fallback parses the bucket out of `fileUrl` with a regex `replace(/^\/[^/]+\//,'')` — brittle if bucket layout changes. | `partner-documents.service.ts` |
| m11 | Temporary password returned in the HTTP response of `POST /partner/create` "in case email fails" — pragmatic but it lands in logs/BFF traces (⚠️ verify response logging redaction). | `partner.controller.ts` `createPartnerDirect` |

---

## 5. Missing Enterprise Features (prioritized)

**High**
- **Partner lifecycle:** no deactivate / suspend / archive / restore / delete endpoints for partners. `Company.deletedAt` exists in schema but no controller route uses it for partners — an admin cannot offboard a partner today.
- **Audit trail exposure:** `GdprAuditLog`, `BookingEvent` etc. exist, but there is no per-partner activity timeline endpoint or screen.
- **Export:** no CSV/Excel/PDF export on the admin partner search or the team payouts.
- **Advanced search:** admin search covers only name/SIRET/city; no filters on compliance status, document expiry, activity, creation date; no saved filters.

**Medium**
- Bulk actions (bulk document approval, bulk reminders).
- Duplicate detection on create (same email ≠ same company; SIRET unique constraint is the only guard).
- Tags / notes / custom fields on Company.
- Webhooks exist (`WebhookSubscription` relation on Company) — ⚠️ verify partner-facing management UI exists.
- Partner scoring / health KPIs beyond the four dashboard counters.

**Low**
- Approval workflow with multiple reviewer roles; document versioning (currently one PENDING/APPROVED per type, old versions deleted); calendar integration; onboarding checklist UI for partners themselves.

---

## 6. France Compliance Gaps

**Already strong (confirmed in code):** SIRET (unique), TVA intracommunautaire, RCS city/number, forme juridique, capital social, N° autorisation CNAPS, caisse retraite / prévoyance / mutuelle (CCN 1351 art. 13), Kbis + agréments CNAPS société/dirigeant + attestations URSSAF/fiscale/RC pro pipeline with expiry reminders (J-30/J-7) and RGPD retention purge (5–10 yrs, Code de commerce L.123-22 cited), RGPD notice with DPO/CNIL references, fr-FR date formatting, French postal-code validation (FE).

**Gaps:**
1. **No APE/NAF code** field on Company.
2. **No SIREN** stored separately (derivable from SIRET, but reporting/légal headers usually show both).
3. **No trade name (nom commercial)** distinct from raison sociale.
4. **No legal representative** (nom/qualité du dirigeant) on Company — required on contracts and factures; the CNAPS dirigeant agrément document exists but the identity fields don't.
5. **No structured IBAN/BIC** — RIB exists only as an uploaded document; SEPA automation impossible.
6. **No insurance metadata** (assureur, n° police, date d'échéance RC pro) — only the attestation file with a generic `expiresAt`.
7. **Invoice numbering non-compliant if these PDFs are ever treated as factures:** `PTN-{companyId[0:6]}-{Date.now()}` is neither sequential nor gapless (CGI art. 242 nonies A). The UI calls it a "récapitulatif" — keep that wording, or implement a real sequential invoice series with mentions obligatoires.
8. **SIRET checksum not enforced server-side** (M2).
9. **No French phone validation** on `phone` in `CreatePartnerDirectDto` (free string; E.164 only suggested in the description).
10. **Contract expiration/renewal:** `CONTRAT_CADRE` is a document type only; no structured contract dates driving renewal reminders.

---

## 7. Recommended Improvements

1. **Fix C1 (Decimal math) — Priority P0, complexity M.** Why: partner-facing financial figures and PDFs are the core value of the module; corrupt totals destroy trust instantly in a B2B sale. Adopt the existing `Money` value object at every payout aggregation site; add regression tests with multi-payout fixtures.
2. **Contract-generate the mobile API client — P0, complexity M.** C2 and M1 are both drift bugs. You already maintain excellent Swagger annotations; generate the TS client (openapi-typescript / orval) in CI and delete hand-written `api/endpoints/*` types.
3. **Partner lifecycle endpoints — P1, complexity M.** `PATCH /partners/:id/deactivate|reactivate`, soft-delete with cascade rules (what happens to agents, missions, payouts), plus FE admin actions. Enterprise buyers will ask in the first demo.
4. **Server-side SIRET/Luhn + INSEE Sirene lookup — P1, complexity S/M.** Auto-fill raison sociale, APE/NAF, address from the SIRET; closes gaps 1–3 of §6 at once.
5. **Company-level document namespace — P1, complexity S.** Fixes M5 and makes multi-user partner accounts actually work.
6. **Error/retry states + FlatList on partner screens — P2, complexity S.** Reuse the `errorBanner` pattern; standard `useQuery`-style hook would eliminate the copy-pasted load/refresh/error state machine across the 14 partner screens.
7. **Structured billing identity (IBAN/BIC, insurance metadata, legal rep) — P2, complexity M.** Prisma migration + DTO + the missing "Facturation" section (M8).
8. **Token lifetime hardening — P2, complexity S.** 15–60 min access tokens; verify refresh rotation.

---

## 8. What was *not* verified (be honest before the sales pitch)

A brief of this breadth (11 parts × 2 full repos) exceeds what one interactive session can inspect file-by-file. Not yet audited: the auth module internals (invite token expiry/hashing), MinIO/upload service (file-type sniffing, AV — `clamd.conf` at repo root suggests ClamAV exists), `partner-tariff` and `partner-pricing` services, the remaining 10 partner screens, DB migrations vs schema drift (`check_drift.js` exists), tests coverage, and the admin web BFF. Each of these deserves the same treatment before an enterprise sale.
