import {
  UserRole, UserStatus, MissionStatus, BookingStatus,
  ApplicationStatus, DocumentStatus, DocumentType,
  PaymentStatus, PayoutStatus, PricingValueType, ClientType,
} from '@constants/enums';

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC API WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total:    number;
    page:     number;
    perPage:  number;
    lastPage: number;
  };
}

export interface ApiError {
  message:    string;
  statusCode: number;
  errors?:    Record<string, string[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
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
  email:      string;
  password:   string;
  fullName:   string;
  phone?:     string;
  role?:      UserRole;
  clientType?: ClientType;
}

export interface TwoFaSetupResponse {
  secret:     string;
  otpauthUrl: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
export interface User {
  id:        string;
  email:     string;
  fullName:  string;
  phone?:    string;
  avatarUrl?: string;
  role:      UserRole;
  status:    UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  phone?:    string;
  avatarUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface ServiceType {
  id:          string;
  name:        string;
  description: string;
  baseRate:    number;   // €/h HT
  isActive:    boolean;
  createdAt:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export interface AgentProfile {
  id:             string;
  userId:         string;
  user:           User;
  bio?:           string;
  latitude?:      number;
  longitude?:     number;
  radiusKm:       number;
  isValidated:    boolean;
  avgRating:      number;
  completedCount: number;
  serviceTypes:   ServiceType[];
  createdAt:      string;
}

export interface AgentSearchParams {
  latitude?:      number;
  longitude?:     number;
  radiusKm?:      number;
  serviceTypeId?: string;
  minRating?:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT DOCUMENTS
// ─────────────────────────────────────────────────────────────────────────────
export interface AgentDocument {
  id:         string;
  agentId:    string;
  type:       DocumentType;
  fileUrl:    string;
  status:     DocumentStatus;
  expiresAt?: string;
  reviewedAt?: string;
  rejectedReason?: string;
  createdAt:  string;
}

export interface CreateAgentDocumentPayload {
  type:       DocumentType;
  fileUrl:    string;
  expiresAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT AVAILABILITIES
// ─────────────────────────────────────────────────────────────────────────────
export interface AgentAvailability {
  id:        string;
  agentId:   string;
  startAt:   string;   // ISO 8601
  endAt:     string;
  createdAt: string;
}

export interface CreateAvailabilityPayload {
  startAt: string;
  endAt:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING RULES
// ─────────────────────────────────────────────────────────────────────────────
export interface PricingRule {
  id:          string;
  name:        string;
  description?: string;
  type:        string;   // e.g. 'NIGHT', 'WEEKEND', 'URGENCY'
  valueType:   PricingValueType;
  value:       number;
  isActive:    boolean;
  createdAt:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTES
// ─────────────────────────────────────────────────────────────────────────────
export interface QuoteBreakdown {
  baseAmount:       number;
  nightSurcharge:   number;
  weekendSurcharge: number;
  urgencySurcharge: number;
  subtotalHT:       number;
  commission:       number;
  vatAmount:        number;
  totalTTC:         number;
  agentSalary:      number;
}

export interface Quote {
  id:         string;
  missionId:  string;
  breakdown:  QuoteBreakdown;
  status:     'PENDING' | 'ACCEPTED' | 'REJECTED';
  expiresAt:  string;
  createdAt:  string;
}

export interface CreateQuotePayload {
  missionId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIONS
// ─────────────────────────────────────────────────────────────────────────────
export interface MissionLocation {
  address:   string;
  city:      string;
  latitude:  number;
  longitude: number;
}

export interface Mission {
  id:            string;
  clientId:      string;
  client?:       User;
  serviceTypeId: string;
  serviceType?:  ServiceType;
  title:         string;
  description?:  string;
  status:        MissionStatus;
  location:      MissionLocation;
  startAt:       string;
  endAt:         string;
  agentCount:    number;
  radiusKm:      number;
  quote?:        Quote;
  bookings?:     Booking[];
  createdAt:     string;
  updatedAt:     string;
}

export interface CreateMissionPayload {
  serviceTypeId: string;
  title:         string;
  description?:  string;
  location:      MissionLocation;
  startAt:       string;
  endAt:         string;
  agentCount:    number;
  radiusKm?:     number;
}

export interface UpdateMissionPayload extends Partial<CreateMissionPayload> {}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────────────────────────────────────
export interface GpsCoords {
  latitude:  number;
  longitude: number;
}

export interface Booking {
  id:           string;
  missionId:    string;
  mission?:     Mission;
  agentId?:     string;
  agent?:       AgentProfile;
  status:       BookingStatus;
  checkinAt?:   string;
  checkoutAt?:  string;
  durationMin?: number;
  incidents?:   Incident[];
  createdAt:    string;
  updatedAt:    string;
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

export interface CheckinPayload  extends GpsCoords {}
export interface CheckoutPayload extends GpsCoords {}

export interface SelectAgentPayload {
  applicationId: string;
}

export interface IncidentReportPayload {
  description: string;
  latitude?:   number;
  longitude?:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────
export interface Payment {
  id:            string;
  missionId:     string;
  stripeId:      string;
  amountCents:   number;
  currency:      string;
  status:        PaymentStatus;
  clientSecret?: string;
  createdAt:     string;
}

export interface CreatePaymentIntentPayload {
  missionId: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  breakdown:    QuoteBreakdown;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONS
// ─────────────────────────────────────────────────────────────────────────────
export interface Message {
  id:         string;
  senderId:   string;
  sender?:    User;
  content:    string;
  createdAt:  string;
}

export interface Conversation {
  id:           string;
  missionId:    string;
  messages:     Message[];
  unreadCount:  number;
  createdAt:    string;
}

export interface SendMessagePayload {
  content: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// RATINGS
// ─────────────────────────────────────────────────────────────────────────────
export interface Rating {
  id:        string;
  authorId:  string;
  author?:   User;
  targetId:  string;
  bookingId: string;
  score:     number;   // 1–5
  comment?:  string;
  createdAt: string;
}

export interface CreateRatingPayload {
  targetId:  string;
  bookingId: string;
  score:     number;
  comment?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalUsers:          number;
  activeAgents:        number;
  missionsThisMonth:   number;
  revenueThisMonth:    number;
  pendingDocuments:    number;
  openDisputes:        number;
}

export interface Dispute {
  id:          string;
  missionId:   string;
  reporterId:  string;
  description: string;
  status:      'OPEN' | 'RESOLVED' | 'REJECTED';
  resolution?: string;
  createdAt:   string;
}

export interface Payout {
  id:          string;
  agentId:     string;
  agent?:      User;
  bookingId:   string;
  amountCents: number;
  currency:    string;
  status:      PayoutStatus;
  scheduledAt: string;
  paidAt?:     string;
}

export interface CreditNote {
  id:          string;
  missionId:   string;
  amountCents: number;
  reason:      string;
  status:      'PENDING' | 'APPLIED';
  createdAt:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION PARAMS
// ─────────────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login:          undefined;
  Register:       undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home:          undefined;
  Missions:      undefined;
  Bookings:      undefined;
  Notifications: undefined;
  Profile:       undefined;
};

export type MissionStackParamList = {
  ServiceTypeList:  undefined;
  MissionCreate:    { serviceTypeId: string };
  MissionDetail:    { missionId: string };
  QuoteDetail:      { missionId: string };
  BookingDetail:    { bookingId: string };
  SelectSlot:       { missionId: string };
  PaymentScreen:    { missionId: string; clientSecret: string };
  MissionSuccess:   { missionId: string };
  Conversation:     { missionId: string };
};

export type AgentStackParamList = {
  NearbyMissions:   undefined;
  MissionDetail:    { missionId: string };
  BookingDetail:    { bookingId: string };
  Checkin:          { bookingId: string };
  Checkout:         { bookingId: string };
  AgentProfile:     undefined;
  Documents:        undefined;
  Availabilities:   undefined;
};
