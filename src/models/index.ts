import {
  UserRole, UserStatus, MissionStatus, BookingStatus,
  DocumentStatus, PaymentStatus, ClientType,
} from '@constants/enums';

// -----------------------------------------------------------------------------
// GENERIC API WRAPPERS
// -----------------------------------------------------------------------------
export interface ApiResponse<T> {
  data:    T;
  message: string;
  success: boolean;
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
}

export interface RegisterPayload {
  email:       string;
  password:    string;
  fullName:    string;
  phone?:      string;
  role?:       UserRole;
  clientType?: ClientType;
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
export interface ServiceType {
  id:              string;
  name:            string;
  description?:    string;
  category:        string;
  baseRatePerHour: number;
  isActive:        boolean;
  createdAt:       string;
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
  vatAmount:        number;
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
  radiusKm:      number;
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
 *   Each slot carries its own bookingLines.  Falls back to root bookingLines
 *   when a slot has none.
 */
export interface CreateMissionPayload {
  address:   string;
  city:      string;
  zipCode?:  string;
  latitude:  number;
  longitude: number;

  // Single-slot fields
  startAt?:       string;
  endAt?:         string;
  durationHours?: number;

  // Multi-slot fields
  slots?: MissionSlot[];

  // Global booking lines (single-slot or per-slot fallback)
  bookingLines?: BookingLine[];

  title?:    string;
  notes?:    string;
  isUrgent?: boolean;
  radiusKm?: number;
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

export interface SelectAgentPayload {
  applicationId: string;
}

/**
 * Payload for POST /bookings/:id/assign-agent — CLIENT direct-pick flow.
 * Lets the client assign an agent without waiting for an application.
 */
export interface AssignAgentPayload {
  agentId: string;
}

/**
 * Returned by GET /bookings/:id/eligible-agents.
 * Combines AgentSummary + per-booking annotations (distance, R1-R4, availability).
 */
export interface EligibleAgent {
  id:                       string;
  fullName:                 string;
  avatarUrl?:               string;
  avgRating:                number;
  completedCount:           number;
  isValidated:              boolean;
  city?:                    string;
  bio?:                     string;
  profileType:              string;
  hourlyRateConvention:     number;
  /** Distance from agent's home to mission site, in km — undefined if no GPS. */
  distanceKm?:              number;
  /** Agent in the current client's favorites list. */
  isFavorite:               boolean;
  /** At least one declared AgentAvailability covers the slot window. */
  hasDeclaredAvailability:  boolean;
  /** R1-R4 conflict messages — empty if assignable. */
  schedulingConflicts:      string[];
  /** True iff schedulingConflicts is empty. UI greys others out. */
  canBeAssigned:            boolean;
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
  MissionCreate:  {
    bookingLines: Array<{
      serviceTypeId: string;
      agentCount:    number;
      name:          string;
      accent:        string;
      agentUniforms: (string | null)[];
    }>;
  };
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
  SelectCreneau:  { missionId: string };
  SelectAgent:    { bookingId: string };
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
