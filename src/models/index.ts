import {
  UserRole, UserStatus, MissionStatus, BookingStatus,
  DocumentStatus, PaymentStatus, ClientType,
} from '@constants/enums';

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC API WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────────────────────
export interface User {
  id:         string;
  email:      string;
  fullName:   string;
  phone?:     string;
  avatarUrl?: string;
  role:       UserRole;
  status:     UserStatus;
  createdAt:  string;
  updatedAt:  string;
}

export interface UpdateUserPayload {
  fullName?:  string;
  phone?:     string;
  avatarUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface ServiceType {
  id:          string;
  name:        string;
  description: string;
  baseRate:    number;
  isActive:    boolean;
  createdAt:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE
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
  id:        string;
  missionId: string;
  breakdown: QuoteBreakdown;
  status:    'PENDING' | 'ACCEPTED' | 'REJECTED';
  expiresAt: string;
  createdAt: string;
}

export interface CreateQuotePayload {
  missionId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSION
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

export type UpdateMissionPayload = Partial<CreateMissionPayload>;

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING
// ─────────────────────────────────────────────────────────────────────────────
export interface AgentSummary {
  id:             string;
  fullName:       string;
  avatarUrl?:     string;
  avgRating:      number;
  completedCount: number;
  isValidated:    boolean;
}

export interface Booking {
  id:           string;
  missionId:    string;
  mission?:     Mission;
  agentId?:     string;
  agent?:       AgentSummary;
  status:       BookingStatus;
  checkinAt?:   string;
  checkoutAt?:  string;
  durationMin?: number;
  incidents?:   Incident[];
  createdAt:    string;
  updatedAt:    string;
}

export interface SelectAgentPayload {
  applicationId: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT
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
// NOTIFICATION
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
// CONVERSATION
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// RATING
// ─────────────────────────────────────────────────────────────────────────────
export interface Rating {
  id:        string;
  authorId:  string;
  author?:   User;
  targetId:  string;
  bookingId: string;
  score:     number;
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
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login:    undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home:          undefined;
  Missions:      undefined;
  Notifications: undefined;
  Profile:       undefined;
};

export type MissionStackParamList = {
  MissionList:    undefined;
  MissionCreate:  { serviceTypeId: string };
  ServicePicker:  undefined;
  MissionDetail:  { missionId: string };
  QuoteDetail:    { missionId: string };
  BookingDetail:  { bookingId: string };
  SelectAgent:    { bookingId: string };
  PaymentScreen:  { missionId: string; clientSecret: string };
  MissionSuccess: { missionId: string };
  Conversation:   { missionId: string };
  RateAgent:      { bookingId: string; agentId: string };
};
