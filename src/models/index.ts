import type {
  UserRole, UserStatus, MissionStatus, BookingStatus, PaymentStatus, ClientType,
  DocumentType, DocumentStatus, AgentProfileType, PartnerDocumentType,
  PayoutStatus, ApplicationStatus,
} from '@constants/enums';
// AgentCategory is re-exported as a *value* (not just type) so screens that
// instantiate it (e.g. PartnerContractCreateScreen mapping over categories)
// can use the const enum object at runtime.
import { AgentCategory } from '@constants/enums';
export { AgentCategory };
export type { AgentCategory as AgentCategoryType };
import type { NavigatorScreenParams } from '@react-navigation/native';

// -----------------------------------------------------------------------------
// GENERIC API WRAPPERS
// -----------------------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data:    T;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  message:    string;
  statusCode: number;
  errors?:    Record<string, string[]>;
  /**
   * [FIX] Stable, locale-independent error identifier the backend sends
   * alongside the already-localised `message` (e.g.
   * 'auth.errors.email_not_verified'). Branch on this, not on `message` text,
   * when the client needs to react differently to a specific error condition
   * (e.g. offering to resend a verification email) rather than just display it.
   */
  key?:       string;
  args?:      Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// AUTH
// -----------------------------------------------------------------------------
export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
}

export interface LoginPayload {
  email:      string;
  password:   string;
  twoFaCode?: string;
  /** FCM token of the current device - lets the backend exclude this device from concurrent-session logout notices. */
  deviceToken?: string;
}

export interface RegisterPayload {
  email:           string;
  password:        string;
  /** FCM token of the current device (optional) - excludes this device from concurrent-session logout notices. */
  deviceToken?:    string;
  firstName:       string;
  lastName:        string;
  phone?:          string;
  role?:           UserRole;
  clientType?:     ClientType;
  /** RGPD/CGU consent Ã¢â‚¬â€ must be true for the backend to accept the request. */
  acceptTerms:     boolean;
  /** Required when role === PARTNER (and no companyId) OR clientType === COMPANY. */
  companyName?:    string;
  /** 14-digit SIRET Ã¢â‚¬â€ required for COMPANY clients and new partner companies. */
  siret?:          string;
  /** Optional billing fields for COMPANY clients. */
  billingAddress?: string;
  billingCity?:    string;
  billingZipCode?: string;
  vatNumber?:      string;
}

export interface VerifyPhonePayload {
  code: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface TwoFaSetupResponse {
  secret:     string;
  otpauthUrl: string;
}

// -----------------------------------------------------------------------------
// USER
// -----------------------------------------------------------------------------
export interface User {
  id:             string;
  email:          string;
  fullName:       string;
  phone?:         string;
  avatarUrl?:     string;
  role:           UserRole;
  status:         UserStatus;
  /** Company FK — non-null when role is PARTNER (resolves to the partner's
   *  société). Used by partner screens to gate company-owned resources. */
  companyId?:     string | null;
  twoFaEnabled?:  boolean;
  /** ISO timestamp of email verification; null/undefined = not yet verified. */
  emailVerifiedAt?: string | null;
  /** ISO timestamp of phone (SMS) verification; null/undefined = not yet verified. */
  phoneVerifiedAt?: string | null;
  createdAt:      string;
  updatedAt:      string;
}

export interface UpdateUserPayload {
  fullName?:  string;
  phone?:     string;
  avatarUrl?: string;
}

export interface DeleteAccountPayload {
  password:        string;
  confirmPhrase:   string;
}

// -----------------------------------------------------------------------------
// SERVICE TYPES
// -----------------------------------------------------------------------------
export interface MatchingUniform {
  value:     string;
  isDefault: boolean;
}

export interface ServiceType {
  id:              string;
  name:            string;
  description?:    string;
  category:        string;
  baseRatePerHour: number;
  isActive:        boolean;
  createdAt:       string;
  /** Tenues matching this service category (from the API; default flagged). */
  matchingUniforms?: MatchingUniform[];
  /** Most appropriate tenue for this service (from the API). */
  defaultUniform?:   string;
}

// -----------------------------------------------------------------------------
// QUOTE
// -----------------------------------------------------------------------------
export interface Quote {
  id:               string;
  missionId:        string;
  status:           'PENDING' | 'ACCEPTED' | 'REJECTED';
  expiresAt:        string;
  createdAt:        string;
  totalClientPrice: number;
  totalWithVat:     number;
  totalAgentSalary: number;
  platformMargin:   number;
  fixedCharges:     number;
  /** VAT rate applied to this quote (e.g. 20 for 20%). Defaults to 20 server-side. */
  vatRate?:         number;
  /**
   * VAT amount in euros â€” derived backend field (totalWithVat - totalClientPrice).
   * Optional because legacy DB rows or older API versions may omit it; consumers
   * MUST fall back to `(totalWithVat - totalClientPrice)` when undefined.
   */
  vatAmount?:       number;
  nightSurcharge:   number;
  weekendSurcharge: number;
  urgencySurcharge: number;
  /** Enterprise-tier surcharges — set when applicable, otherwise undefined.
   *  Money fields arrive as Prisma Decimal → JSON strings; pass through
   *  `toNumber()` from @utils/formatters before maths/formatting. */
  holidaySurcharge?:  number | string;
  luxurySurcharge?:   number | string;
  seasonalSurcharge?: number | string;
  locationSurcharge?: number | string;
}

/**
 * One booking line â€” one service type, N agents, optional per-agent uniforms.
 * Used in both the quote payload and embedded in MissionSlot.
 */
export interface BookingLine {
  serviceTypeId:   string;
  agentCount:      number;
  /** One uniform value per agent. Nulls are stripped to 'STANDARD' before sending. */
  agentUniforms?:  string[];
}

/**
 * Payload for POST /quotes/calculate.
 *
 * Single-slot missions: use `bookingLines`.
 * Multi-slot missions: use `slotLines` (per-slot service types + agents).
 * When both are provided, `slotLines` takes priority (backend behaviour).
 */
export interface CreateQuotePayload {
  missionId:    string;
  /** For single-slot missions (legacy). */
  bookingLines?: BookingLine[];
  /**
   * For multi-slot missions â€” per-slot staffing requirements.
   * Each entry references a slotId from the created MissionSlot records
   * (returned by POST /missions in the `slots` array).
   */
  slotLines?: Array<{
    slotId:       string;
    bookingLines: BookingLine[];
  }>;
}

// -----------------------------------------------------------------------------
// SLOT BOOKING LINE â€” local draft, carries display metadata not sent to API
// -----------------------------------------------------------------------------
/**
 * Local representation of one service-type need within a slot draft.
 * `name` and `accent` are UI-only and stripped before building the API payload.
 */
export interface SlotBookingLine {
  serviceTypeId: string;
  agentCount:    number;
  name:          string;
  accent:        string;
  agentUniforms: (string | null)[];
}

// -----------------------------------------------------------------------------
// MISSION SLOT â€” mirrors backend MissionSlotDto (with per-slot bookingLines)
// -----------------------------------------------------------------------------
/**
 * One time window within a multi-day / variable-hours mission.
 *
 * `bookingLines` enables per-slot staffing:
 *   Day 08-18h   â†’ 3x SECURITE STANDARD
 *   Night 22-06h â†’ 1x SSIAP + 1x CYNOPHILE
 *
 * If `bookingLines` is omitted the backend uses the mission-level
 * `bookingLines` (if any) or leaves bookings for a later /quotes/calculate.
 */
export interface MissionSlot {
  startAt:       string;
  endAt:         string;
  durationHours: number;
  notes?:        string;
  bookingLines?: Array<{
    serviceTypeId:  string;
    agentCount:     number;
    agentUniforms?: string[];
  }>;
}

/** A created slot as returned by the API â€” has a server-assigned `id`. */
export interface MissionSlotRecord extends Omit<MissionSlot, 'bookingLines'> {
  id:        string;
  slotIndex: number;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// MISSION
// -----------------------------------------------------------------------------
export interface Mission {
  id:            string;
  clientId:      string;
  status:        MissionStatus;
  address:       string;
  city:          string;
  zipCode?:      string;
  latitude:      number;
  longitude:     number;
  startAt:       string;
  endAt:         string;
  durationHours: number;
  title?:        string;
  notes?:        string;
  isUrgent:      boolean;
  slots?:        MissionSlotRecord[];
  quote?:        Quote;
  payment?:      Payment;
  bookings?:     Booking[];
  createdAt:     string;
  updatedAt:     string;
}

/**
 * Payload for POST /missions â€” mirrors backend CreateMissionDto.
 *
 * Single-slot (legacy):
 *   { startAt, endAt, durationHours, bookingLines?, ...location }
 *
 * Multi-slot (per-slot agents):
 *   { slots: MissionSlot[], ...location }
 *   Every mission uses the slots[] format (1 slot = single-day mission).
 *   Each slot carries its own bookingLines.
 */
export interface CreateMissionPayload {
  address:   string;
  city:      string;
  zipCode?:  string;
  latitude:  number;
  longitude: number;

  /** Always required â€” a single-slot mission is slots with 1 entry. */
  slots: MissionSlot[];

  title?:    string;
  notes?:    string;
  isUrgent?: boolean;
}

export type UpdateMissionPayload = Partial<CreateMissionPayload>;

// -----------------------------------------------------------------------------
// BOOKING
// -----------------------------------------------------------------------------
export interface AgentSummary {
  id:             string;
  fullName:       string;
  avatarUrl?:     string;
  avgRating:      number;
  completedCount: number;
  isValidated:    boolean;
}

export interface Booking {
  id:                string;
  missionId:         string;
  mission?:          Mission;
  agentId?:          string;
  agent?:            AgentSummary;
  serviceTypeId?:    string;
  serviceType?:      ServiceType;
  status:            BookingStatus;
  uniform?:          string;
  checkinAt?:        string;
  checkoutAt?:       string;
  checkinLat?:       number;
  checkinLng?:       number;
  checkoutLat?:      number;
  checkoutLng?:      number;
  checkinPhotoUrl?:  string;
  checkinPhotoUrl2?: string;
  checkoutPhotoUrl?: string;
  checkoutPhotoUrl2?:string;
  durationMin?:      number;
  rating?:           Rating;
  incidents?:        Incident[];
  applications?:     Application[];
  createdAt:         string;
  updatedAt:         string;
}

export interface Application {
  id:        string;
  bookingId: string;
  agentId:   string;
  agent?:    AgentSummary;
  status:    'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
}




/**
 * Mirrors backend AgentAvailability â€” declared free windows.
 */
export interface AgentAvailability {
  id:        string;
  agentId:   string;
  /** ISO date of the day (UTC midnight). */
  date:      string;
  /** "HH:MM" 24h format. */
  startTime: string;
  /** "HH:MM" 24h format. */
  endTime:   string;
  createdAt: string;
}

export interface IncidentReportPayload {
  description: string;
  latitude?:   number;
  longitude?:  number;
}

export interface Incident {
  id:          string;
  bookingId:   string;
  reporterId:  string;
  description: string;
  latitude?:   number;
  longitude?:  number;
  createdAt:   string;
}

// -----------------------------------------------------------------------------
// DISPUTE
// -----------------------------------------------------------------------------
export interface Dispute {
  id:          string;
  missionId:   string;
  bookingId?:  string;
  reason:      string;
  description: string;
  status:      'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolution?: string;
  createdAt:   string;
}

export interface CreateDisputePayload {
  missionId:   string;
  bookingId?:  string;
  reason:      string;
  description: string;
}

// -----------------------------------------------------------------------------
// PAYMENT METHOD (Stripe saved card / SEPA)
// -----------------------------------------------------------------------------
export interface PaymentMethod {
  id:       string;
  type:     'card' | 'sepa_debit';
  card?: {
    brand:    string;
    last4:    string;
    expMonth: number;
    expYear:  number;
  };
  sepa?: {
    last4:   string;
    country: string;
  };
  created:  number;
}

// PAYMENT
// -----------------------------------------------------------------------------
export interface Payment {
  id:              string;
  missionId:       string;
  mission?:        Pick<Mission, 'id' | 'title' | 'city' | 'startAt'>;
  stripeIntentId:  string;
  amount:          number;
  method:          'CARD' | 'SEPA' | 'VIREMENT' | 'CHEQUE';
  status:          PaymentStatus;
  invoiceNumber:   string;
  invoicePdfUrl?:  string;
  paidAt?:         string;
  createdAt:       string;
}

export interface CreatePaymentIntentPayload {
  missionId: string;
  method:    'CARD' | 'SEPA';
}

export interface PaymentIntentResponse {
  clientSecret:  string;
  type?:          'payment_intent' | 'setup_intent';
  paymentId:     string;
  invoiceNumber: string;
  breakdown: {
    totalTTC:       number;
    totalHT:        number;
    agentShare:     number;
    platformMargin: number;
    fixedCharges:   number;
    vat:            number;
  };
}

// -----------------------------------------------------------------------------
// OFFLINE PAYMENT (Virement / Cheque)
// -----------------------------------------------------------------------------
export interface DeclareOfflinePayload {
  missionId:  string;
  method:     'VIREMENT' | 'CHEQUE';
  reference?: string;
}

export interface OfflinePaymentInstructions {
  type:         'VIREMENT' | 'CHEQUE';
  iban?:        string;
  bic?:         string;
  reference?:   string;
  beneficiary?: string;
  payable?:     string;
  address?:     string;
  message:      string;
}

/**
 * @deprecated Back-compat alias from the enterprise migration. Prefer
 * `OfflinePaymentResponse` in new code — they are structurally identical.
 */
export type DeclareOfflinePaymentResult = OfflinePaymentResponse;

export interface OfflinePaymentResponse {
  paymentId:     string;
  invoiceNumber: string;
  amount:        number;
  method:        'VIREMENT' | 'CHEQUE';
  status:        string;
  instructions:  OfflinePaymentInstructions;
}

// -----------------------------------------------------------------------------
// NOTIFICATION
// -----------------------------------------------------------------------------
export interface AppNotification {
  id:        string;
  userId:    string;
  title:     string;
  body:      string;
  type:      string;
  isRead:    boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// CONVERSATION
// -----------------------------------------------------------------------------
export interface Message {
  id:        string;
  senderId:  string;
  sender?:   User;
  content:   string;
  createdAt: string;
}

export interface Conversation {
  id:          string;
  missionId:   string;
  messages:    Message[];
  unreadCount: number;
  createdAt:   string;
}

export interface SendMessagePayload {
  content: string;
}

// -----------------------------------------------------------------------------
// RATING
// -----------------------------------------------------------------------------
export interface Rating {
  id:        string;
  raterId:   string;
  rater?:    User;
  ratedId:   string;
  bookingId: string;
  score:     number;
  comment?:  string;
  direction: 'CLIENT_TO_AGENT' | 'AGENT_TO_CLIENT';
  createdAt: string;
}

export interface CreateRatingPayload {
  ratedId?:  string;
  bookingId: string;
  direction: 'CLIENT_TO_AGENT' | 'AGENT_TO_CLIENT';
  score:     number;
  comment?:  string;
  npsScore?:  number;
}

// -----------------------------------------------------------------------------
// SOS
// -----------------------------------------------------------------------------
export interface SosPayload {
  missionId?: string;
  latitude?:  number;
  longitude?: number;
  message?:   string;
}

// -----------------------------------------------------------------------------
// NAVIGATION
// -----------------------------------------------------------------------------
export type RootStackParamList = {
  Onboarding: undefined;
  Auth:       undefined;
  Main:       undefined;
};

export type AuthStackParamList = {
  Login:    undefined;
  Register: undefined;
  TwoFa:    { tempToken: string };
  ForgotPassword: undefined;
  // `token` is populated when arriving via the email deep-link
  // (securbook://auth/reset-password?token=â€¦). Undefined when the user
  // opens the screen manually and pastes the token by hand.
  ResetPassword:  { token?: string } | undefined;
};

export type MainTabParamList = {
  Home:          undefined;
  Missions:      undefined;
  Notifications: undefined;
  Profile:       undefined;
};

export type ProfileStackParamList = {
  ProfileMain:    undefined;
  ProfileEdit:    undefined;
  PaymentHistory: undefined;
  Analytics:      undefined;
  TwoFaSetup:     undefined;
  DeleteAccount:      undefined;
  PaymentMethods:        undefined;
  AddPaymentMethod:      undefined;
};

export type MissionStackParamList = {
  MissionList:    undefined;
  /** All params optional - flow starts here now (ServicePicker removed). */
  MissionCreate:  {
    bookingLines?: Array<{
      serviceTypeId: string;
      agentCount:    number;
      name:          string;
      accent:        string;
      agentUniforms: (string | null)[];
    }>;
    /** When set, the screen runs in EDIT mode for this draft (brouillon) mission. */
    editMissionId?: string;
  } | undefined;
  ServicePicker:  {
    existingLines?: Array<{
      serviceTypeId: string;
      agentCount:    number;
      name:          string;
      accent:        string;
      agentUniforms: (string | null)[];
    }>;
  };
  MissionDetail:  { missionId: string };
  QuoteDetail:    { missionId: string };
  BookingDetail:  { bookingId: string };
  PaymentScreen:  {
    missionId:     string;
    clientSecret:  string;
    totalTTC:      number;
    paymentMethod?: 'CARD' | 'SEPA';
    intentType?:   'payment_intent' | 'setup_intent';
  };
  MissionSuccess: { missionId: string };
  Conversation:   { missionId: string };
  RateAgent:      { bookingId: string; agentId: string; agentName: string; missionTitle: string };
  LiveTracking:   {
    missionId:      string;
    bookingId:      string;
    agentName:      string;
    missionAddress: string;
    siteLat:        number;
    siteLng:        number;
  };
  OfflinePayment: { missionId: string; totalTTC: number };
  Dispute:        {
    missionId:    string;
    bookingId?:   string;
    missionTitle: string;
  };
};


// =============================================================================
// PARTNER / COMPLIANCE / EMPLOYMENT
// =============================================================================
// Added in the enterprise migration: this app now hosts the partner experience
// (sécurité-société) in addition to the client one. Types below mirror the
// backend Prisma models the partner controllers serve. Money fields arrive as
// Prisma Decimal → JSON strings; always run through toNumber() before maths
// (see @utils/formatters). Routes assume a partner-role JWT.
// =============================================================================

// ─── Back-compat alias ────────────────────────────────────────────────────────
// Partner screens were written against `BookingLinePayload`. The client app
// already exports an equivalent `BookingLine` shape — alias to keep the
// partner code compiling without a rename.
export type BookingLinePayload = BookingLine;

// ─── Compliance (CNAPS + RGPD) ────────────────────────────────────────────────

export type DocumentStatusExtended = 'MISSING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface ComplianceDocItem {
  type:           string;
  isMandatory:    boolean;
  isBiometric:    boolean;
  status:         DocumentStatusExtended;
  documentId:     string | null;
  expiresAt:      string | null;
  retentionDate:  string | null;
  rejectedReason: string | null;
  rejectionNote?: string | null;
  fileUrl:        string | null;
  rgpdConsent:    boolean;
  consentedAt:    string | null;
  retentionYears: number;
  legalBasis:     string;
  retentionNote?: string;
}

export interface ComplianceStatus {
  /** Profil métier (xlsx). Présent depuis la migration profile-documents. */
  profileType?:      AgentProfileType;
  profileTypeLabel?: string;
  isValidated:       boolean;
  canApply:          boolean;
  isFullyCompliant:  boolean;
  progress: {
    approved: number;
    pending:  number;
    rejected: number;
    missing:  number;
    total:    number;
  };
  mandatory: ComplianceDocItem[];
  /** Documents facultatifs (xlsx). */
  optional?:  ComplianceDocItem[];
  rgpdNotice: {
    controller:      string;
    dpo:             string;
    legalBasis:      string;
    biometricBasis:  string;
    retentionPolicy: string;
    rights:          string;
    transfers:       string;
    supervisory:     string;
    complaintRight:  string;
  };
}

/** Alias for back-compat with agent-side imports. */
export type AgentComplianceStatus = ComplianceStatus;

// ─── Agent profile (read by partner team management) ─────────────────────────
// Partner screens display agent profiles, Stripe payout status, and documents.
// These types mirror the backend AgentProfile and AgentDocument models.

export type AgentStripeStatus = 'pending' | 'active' | 'rejected';

export interface AgentProfile {
  id:                    string;
  userId:                string;
  user?:                 User;
  bio?:                  string;
  latitude?:             number;
  longitude?:            number;
  radiusKm:              number;
  isValidated:           boolean;
  avgRating:             number;
  completedCount:        number;
  serviceTypes:          ServiceType[];
  /** Profil métier — détermine quels documents sont obligatoires (xlsx). */
  profileType?:          AgentProfileType;
  /** Stripe Connect (Express) account id for agent payouts. Null until onboarding starts. */
  stripeAccountId?:      string | null;
  /** Advanced to 'active'/'rejected' by the account.updated webhook. */
  stripeAccountStatus?:  AgentStripeStatus | null;
  createdAt:             string;
}

export interface CreateAgentProfilePayload {
  bio?:                  string;
  latitude?:             number;
  longitude?:            number;
  interventionRadiusKm?: number;
  serviceTypeIds:        string[];
  profileType?:          AgentProfileType;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- branded for forward-compat
export interface UpdateAgentProfilePayload extends Partial<CreateAgentProfilePayload> {}

export interface AgentDocument {
  id:              string;
  agentId:         string;
  type:            DocumentType;
  /** Legacy signed URL (24h). Use getFileUrl() to refresh. */
  fileUrl:         string;
  /** MinIO object key — stable across signed-URL expirations. */
  objectName?:     string | null;
  /** SHA-256 hex digest (audit trail). */
  sha256?:         string | null;
  status:          DocumentStatus;
  expiresAt?:      string | null;
  retentionDate?:  string | null;
  reviewedAt?:     string | null;
  rejectionNote?:  string | null;
  /** @deprecated use rejectionNote */
  rejectedReason?: string | null;
  rgpdConsent:     boolean;
  consentedAt?:    string | null;
  createdAt:       string;
}

export interface CreateAgentDocumentPayload {
  type:            string;
  /** Legacy field — pre-signed URL from /upload/document. */
  fileUrl:         string;
  /** MinIO object key from /upload/document — recommended. */
  objectName?:     string;
  /** SHA-256 hex from /upload/document — audit trail. */
  sha256?:         string;
  expiresAt?:      string;
  /** Document reference number (CNAPS card number, permit ID, ...). */
  documentNumber?: string;
  /** Consentement RGPD art.9 — obligatoire pour documents biométriques. */
  rgpdConsent?:    boolean;
}

// ─── Partner documents ────────────────────────────────────────────────────────
// Documents détenus par la société partenaire (Kbis, CNAPS, URSSAF, …).
// Source : PROFIL-DOCUMENTS.xlsx, onglet "Partenaire".

export interface PartnerDocument {
  id:             string;
  companyId:      string;
  type:           DocumentType;
  fileUrl:        string;
  status:         DocumentStatus;
  expiresAt?:     string | null;
  retentionDate?: string | null;
  reviewedAt?:    string | null;
  reviewedBy?:    string | null;
  rejectionNote?: string | null;
  uploadedBy?:    string | null;
  createdAt:      string;
  updatedAt:      string;
}

export interface CreatePartnerDocumentPayload {
  type:         PartnerDocumentType;
  fileUrl:      string;
  /** MinIO object key from /upload/document. */
  objectName?:  string;
  /** SHA-256 hex from /upload/document. */
  sha256?:      string;
  expiresAt?:   string;
  /** When true, the backend auto-suspends the partner if this doc is later rejected/expired. */
  autoSuspend?: boolean;
}

export interface PartnerComplianceStatus {
  companyId:        string;
  companyName:      string;
  siret:            string;
  isFullyCompliant: boolean;
  progress: {
    approved: number;
    pending:  number;
    rejected: number;
    missing:  number;
    total:    number;
  };
  mandatory: ComplianceDocItem[];
  optional:  ComplianceDocItem[];
  rgpdNotice: Record<string, string>;
}

// ─── Partner core ─────────────────────────────────────────────────────────────

export interface Company {
  id:          string;
  companyName: string;
  siret:       string;
  address?:    string | null;
  city?:       string | null;
  zipCode?:    string | null;
  logoUrl?:    string | null;
  billingAddress?: string | null;
  billingCity?:    string | null;
  billingZipCode?: string | null;
  vatNumber?:      string | null;
  createdAt:   string;
}

export interface PartnerDashboard {
  company:   Company | null;
  teamSize:  number;
  validated: number;
  missions:  { active: number; completed: number };
  payouts:   { scheduledAmount: number; totalPaid: number };
}

export interface PartnerAgent {
  id:       string;
  email:    string;
  fullName: string;
  phone?:   string | null;
  status:   string;
  agentProfile?: {
    id:                   string;
    firstName?:           string | null;
    lastName?:            string | null;
    isValidated:          boolean;
    averageRating?:       number | null;
    totalMissions?:       number;
    city?:                string | null;
    stripeAccountId?:     string | null;
    stripeAccountStatus?: string | null;
    documents?: { type: string; status: string; expiresAt?: string | null }[];
  };
}

export interface PartnerOnboarding {
  agentId:     string;
  fullName:    string;
  email:       string;
  status:      string;
  isValidated: boolean;
  onboarding: {
    progress:         number;
    approvedDocs:     number;
    pendingDocs:      number;
    rejectedDocs:     number;
    missingMandatory: string[];
    canTakeMissions:  boolean;
  };
  documents: { type: string; status: string; expiresAt?: string | null; rejectionNote?: string | null }[];
}

export interface PartnerBillingBreakdown {
  period:  { from: string; to: string };
  agents:  {
    agentId:      string;
    fullName:     string;
    email:        string;
    missions:     number;
    totalEarned:  number;
    totalPending: number;
    payouts:   {
      id:           string;
      amount:       number;
      status:       string;
      scheduledFor: string;
      paidAt?:      string | null;
      mission?:     { title: string; city: string; startAt: string } | null;
    }[];
  }[];
  totals: { totalEarned: number; totalPending: number; totalMissions: number };
}

// ─── Partner navigation ───────────────────────────────────────────────────────
// PartnerNavigator hosts four bottom tabs; each tab is a nested stack. The
// per-stack types below keep each navigator honest — every Tab.Screen wires
// `screen={…}` against exactly the ParamList it registers. The union
// `PartnerStackParamList` at the bottom is kept as an alias for screens
// (e.g. PartnerProfileScreen) that legitimately span stacks.

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- RN-Nav 7 requires ParamListBase-compatible types
export type PartnerTabParamList = {
  PartnerHome:    NavigatorScreenParams<PartnerHomeStackParamList>    | undefined;
  PartnerTeam:    NavigatorScreenParams<PartnerTeamStackParamList>    | undefined;
  PartnerFinance: NavigatorScreenParams<PartnerFinanceStackParamList> | undefined;
  PartnerProfile: NavigatorScreenParams<PartnerProfileStackParamList> | undefined;
};

// PartnerHome tab — dashboard + self-service mission posting + contract create.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PartnerHomeStackParamList = {
  PartnerHomeDashboard:  undefined;
  PartnerCreateMission:  undefined;
  PartnerMissions:       undefined;
  PartnerMissionFunding: { missionId: string; bookingLines: BookingLinePayload[] };
  // Employment (Phase 2 / IDCC 1351) — partner signs first, agent counter-signs.
  PartnerContractCreate: { bookingId: string; agentName?: string };
  PartnerContractDetail: { contractId: string; bookingId: string };
};

// PartnerTeam tab — team roster + agent detail.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PartnerTeamStackParamList = {
  PartnerTeamList:    undefined;
  PartnerAgentDetail: { agentId: string; agentName: string };
};

// PartnerFinance tab — financials + billing.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PartnerFinanceStackParamList = {
  PartnerFinancials: undefined;
  PartnerBilling:    undefined;
};

// PartnerProfile tab — the route name "PartnerDashboard" is kept for back-compat
// with notification deep links; the screen rendered there is PartnerProfileScreen.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PartnerProfileStackParamList = {
  PartnerDashboard:   undefined;      // entry — renders PartnerProfileScreen
  PartnerCompanyEdit: undefined;
  PartnerDocuments:   undefined;
  PartnerCompliance:  undefined;
  PartnerAddDocument: { preselectedType?: PartnerDocumentType } | undefined;
};

// Union of all four partner stacks — kept for screens that legitimately
// span stacks (e.g. PartnerProfileScreen's cross-tab hops).
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PartnerStackParamList =
  & PartnerHomeStackParamList
  & PartnerTeamStackParamList
  & PartnerFinanceStackParamList
  & PartnerProfileStackParamList;

// ─── Employment (Phase 2 — IDCC 1351 / French labour law) ────────────────────
// Mirrors backend Prisma models EmploymentContract, Timesheet, Payslip,
// PayslipLine, Dpae. Money fields arrive as Decimal → JSON strings; always
// run through toNumber() before maths/formatting.
//
// Lifecycle (happy path):
//   1. Booking.status = ASSIGNED
//      → PARTNER POST /employment/contracts                  (DRAFT)
//   2. Both parties PATCH /employment/contracts/:id/sign     (DRAFT → SIGNED)
//      → backend auto-creates DPAE, transmits to URSSAF
//   3. Booking checkout                                       (auto Timesheet OPEN)
//   4. AGENT PATCH /employment/timesheets/:id/status         (OPEN → AGENT_SUBMITTED)
//   5. PARTNER PATCH /employment/timesheets/:id/status       (AGENT_SUBMITTED → PARTNER_APPROVED)
//   6. PARTNER POST /employment/payslips/generate            (aggregates approved timesheets → Payslip DRAFT)
//   7. ADMIN PATCH /employment/payslips/:id/status           (DRAFT → VALIDATED → PAID)

export type CddMotif =
  | 'CDDU'
  | 'ACCROISSEMENT'
  | 'REMPLACEMENT'
  | 'SAISONNIER';

export type EmploymentContractStatus =
  | 'DRAFT'
  | 'SENT_FOR_SIGNATURE'
  | 'SIGNED'
  | 'CANCELLED';

export type TimesheetStatus =
  | 'OPEN'
  | 'AGENT_SUBMITTED'
  | 'PARTNER_APPROVED'
  | 'LOCKED';

export type DpaeStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'FAILED';

export type PayslipStatus = 'DRAFT' | 'VALIDATED' | 'PAID';

/** Signer side for the dual-signature contract workflow. */
export type ContractSignerRole = 'PARTNER' | 'AGENT';

// -- EmploymentContract --------------------------------------------------------
export interface EmploymentContract {
  id:                      string;
  bookingId:               string;
  employerId:              string;
  agentId:                 string;
  motif:                   CddMotif;
  motifLegalCode:          string;
  justification:           string;
  snepsCategory:           AgentCategory;
  snepsNiveau:             number;
  snepsEchelon:            number;
  snepsCoefficient:        number;
  snepsGridDate:           string;
  hourlyBrut:              number | string;
  startAt:                 string;
  endAt:                   string;
  plannedHours:            number | string;
  indemniteFinContratRate: number | string;
  status:                  EmploymentContractStatus;
  partnerSignedAt?:        string | null;
  agentSignedAt?:          string | null;
  // Enterprise signature audit metadata
  partnerSignatureUrl?:    string | null;
  partnerSignerName?:      string | null;
  partnerSignerIp?:        string | null;
  partnerSignerDevice?:    string | null;
  agentSignatureUrl?:      string | null;
  agentSignerName?:        string | null;
  agentSignerIp?:          string | null;
  agentSignerDevice?:      string | null;
  pdfObjectName?:          string | null;
  pdfSha256?:              string | null;
  tariffId?:               string | null;
  createdAt:               string;
  updatedAt:               string;
  deletedAt?:              string | null;
  booking?:                Booking;
  employer?:               Company;
  agent?:                  AgentProfile;
  dpae?:                   Dpae | null;
  timesheet?:              Timesheet | null;
}

export interface CreateEmploymentContractPayload {
  bookingId:        string;
  motif:            CddMotif;
  motifLegalCode:   string;
  justification:    string;
  snepsCategory:    AgentCategory;
  snepsNiveau:      number;
  snepsEchelon:     number;
  snepsCoefficient: number;
  hourlyBrut?:      number;
  tariffId?:        string;
  /** Seniority bonus (0..0.15). 0 if not applicable. */
  seniorityRate:    number;
  isCynophile?:     boolean;
}

export interface SignContractPayload {
  signerRole:            ContractSignerRole;
  signatureImageBase64?: string;
  signerName?:           string;
  signerIp?:             string;
  signerDevice?:         string;
  pdfObjectName?:        string;
  pdfSha256?:            string;
}

export interface ContractFilter {
  status?:    EmploymentContractStatus;
  agentId?:   string;
  companyId?: string;
  page?:      number;
  limit?:     number;
}

export interface SalaryPreview {
  contractId:          string;
  hourlyBrut:          number | string;
  plannedHours:        number | string;
  base:                number | string;
  nightSurcharge:      number | string;
  sundaySurcharge:     number | string;
  holidaySurcharge:    number | string;
  seniorityPremium:    number | string;
  panier:              number | string;
  cynophilePremium:    number | string;
  indemniteFinContrat: number | string;
  totalBrut:           number | string;
  employerCharges:     number | string;
  totalEmployerCost:   number | string;
  detail?:             { code: string; amount: number | string; label?: string }[];
}

// -- Timesheet -----------------------------------------------------------------
export interface Timesheet {
  id:              string;
  bookingId:       string;
  contractId:      string;
  checkinAt:       string;
  checkoutAt:      string;
  paidMinutes:     number;
  breakMinutes:    number;
  hoursBreakdown?: {
    day?:      number;
    night?:    number;
    sunday?:   number;
    holiday?:  number;
    mayFirst?: number;
  } | null;
  status:          TimesheetStatus;
  approvedAt?:     string | null;
  approvedBy?:     string | null;
  createdAt:       string;
  updatedAt:       string;
  booking?:        Booking;
  contract?:       EmploymentContract;
}

export interface CreateTimesheetPayload {
  bookingId:     string;
  contractId:    string;
  checkinAt:     string;
  checkoutAt:    string;
  breakMinutes?: number;
}

export interface UpdateTimesheetStatusPayload {
  status: TimesheetStatus;
}

export interface ActualSalary {
  timesheetId:       string;
  hoursBreakdown: {
    day?:      number;
    night?:    number;
    sunday?:   number;
    holiday?:  number;
    mayFirst?: number;
  };
  base:              number | string;
  nightSurcharge:    number | string;
  sundaySurcharge:   number | string;
  holidaySurcharge:  number | string;
  seniorityPremium:  number | string;
  panier:            number | string;
  cynophilePremium:  number | string;
  totalBrut:         number | string;
  employerCharges:   number | string;
  totalEmployerCost: number | string;
  detail?:           { code: string; amount: number | string; label?: string }[];
}

// -- Payslip -------------------------------------------------------------------
export interface PayslipLine {
  id:           string;
  payslipId:    string;
  contractId?:  string | null;
  timesheetId?: string | null;
  /** Stable accounting code (BASE_BRUT, NIGHT_SURCHARGE, …). */
  code:         string;
  amount:       number | string;
  detail?:      string | null;
  createdAt:    string;
}

export interface Payslip {
  id:              string;
  agentId:         string;
  companyId:       string;
  periodFrom:      string;
  periodTo:        string;
  brut:            number | string;
  employeeCharges: number | string;
  net:             number | string;
  netImposable:    number | string;
  netAfterTax:     number | string;
  pasRate:         number | string;
  pasRateSource:   string;
  status:          PayslipStatus;
  pdfObjectName?:  string | null;
  createdAt:       string;
  updatedAt:       string;
  lines?:          PayslipLine[];
  company?:        Company;
}

export interface GeneratePayslipPayload {
  agentProfileId: string;
  companyId:      string;
  periodFrom:     string;
  periodTo:       string;
  pasRate?:       number;
}

// -- DPAE (URSSAF declaration) -------------------------------------------------
export interface Dpae {
  id:                 string;
  contractId:         string;
  submittedAt?:       string | null;
  urssafReceiptId?:   string | null;
  receiptObjectName?: string | null;
  ediResponseId?:     string | null;
  status:             DpaeStatus;
  lastError?:         string | null;
  createdAt:          string;
  updatedAt:          string;
}
