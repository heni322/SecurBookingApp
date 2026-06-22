import type {
  UserRole, UserStatus, MissionStatus, BookingStatus, PaymentStatus, ClientType} from '@constants/enums';

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
  /** RGPD/CGU consent â€” must be true for the backend to accept the request. */
  acceptTerms:     boolean;
  /** Required when role === PARTNER (and no companyId) OR clientType === COMPANY. */
  companyName?:    string;
  /** 14-digit SIRET â€” required for COMPANY clients and new partner companies. */
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
   * VAT amount in euros — derived backend field (totalWithVat - totalClientPrice).
   * Optional because legacy DB rows or older API versions may omit it; consumers
   * MUST fall back to `(totalWithVat - totalClientPrice)` when undefined.
   */
  vatAmount?:       number;
  nightSurcharge:   number;
  weekendSurcharge: number;
  urgencySurcharge: number;
}

/**
 * One booking line — one service type, N agents, optional per-agent uniforms.
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
   * For multi-slot missions — per-slot staffing requirements.
   * Each entry references a slotId from the created MissionSlot records
   * (returned by POST /missions in the `slots` array).
   */
  slotLines?: Array<{
    slotId:       string;
    bookingLines: BookingLine[];
  }>;
}

// -----------------------------------------------------------------------------
// SLOT BOOKING LINE — local draft, carries display metadata not sent to API
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
// MISSION SLOT — mirrors backend MissionSlotDto (with per-slot bookingLines)
// -----------------------------------------------------------------------------
/**
 * One time window within a multi-day / variable-hours mission.
 *
 * `bookingLines` enables per-slot staffing:
 *   Day 08-18h   → 3x SECURITE STANDARD
 *   Night 22-06h → 1x SSIAP + 1x CYNOPHILE
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

/** A created slot as returned by the API — has a server-assigned `id`. */
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
 * Payload for POST /missions — mirrors backend CreateMissionDto.
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

  /** Always required — a single-slot mission is slots with 1 entry. */
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
 * Mirrors backend AgentAvailability — declared free windows.
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
  // (securbook://auth/reset-password?token=…). Undefined when the user
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
