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
  id:              string;
  name:            string;
  description?:    string;
  category:        string;
  baseRatePerHour: number;   // €/h — convention collective
  isActive:        boolean;
  createdAt:       string;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE
// ─────────────────────────────────────────────────────────────────────────────
/** Quote retournée par le backend (champs à plat dans la table Prisma) */
export interface Quote {
  id:               string;
  missionId:        string;
  status:           'PENDING' | 'ACCEPTED' | 'REJECTED';
  expiresAt:        string;
  createdAt:        string;
  // Champs financiers à plat
  totalClientPrice: number;   // HT
  totalWithVat:     number;   // TTC — ce que paie le client
  totalAgentSalary: number;   // virement agent J+15
  platformMargin:   number;   // commission SecurBook
  fixedCharges:     number;   // charges patronales
  vatAmount:        number;   // TVA 20%
  nightSurcharge:   number;
  weekendSurcharge: number;
  urgencySurcharge: number;
}

export interface BookingLine {
  serviceTypeId: string;
  agentCount:    number;
}

export interface CreateQuotePayload {
  missionId:    string;
  bookingLines: BookingLine[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSION
// ─────────────────────────────────────────────────────────────────────────────
export interface Mission {
  id:            string;
  clientId:      string;
  status:        MissionStatus;
  // Champs plats (pas d'objet location imbriqué — modèle Prisma)
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
  quote?:        Quote;
  payment?:      Payment;
  bookings?:     Booking[];
  createdAt:     string;
  updatedAt:     string;
}

/** Payload aligné sur CreateMissionDto backend */
export interface CreateMissionPayload {
  address:       string;
  city:          string;
  zipCode?:      string;
  latitude:      number;
  longitude:     number;
  startAt:       string;
  endAt:         string;
  durationHours: number;   // calculé côté frontend (min 6)
  title?:        string;
  notes?:        string;
  isUrgent?:     boolean;
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
  serviceTypeId?: string;
  serviceType?: ServiceType;
  status:       BookingStatus;
  checkinAt?:   string;
  checkoutAt?:  string;
  durationMin?: number;
  incidents?:   Incident[];
  applications?: Application[];
  createdAt:    string;
  updatedAt:    string;
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
  id:             string;
  missionId:      string;
  stripeIntentId: string;
  amount:         number;   // €  TTC
  method:         'CARD' | 'SEPA' | 'TRANSFER';
  status:         PaymentStatus;
  invoiceNumber:  string;
  createdAt:      string;
}

export interface CreatePaymentIntentPayload {
  missionId: string;
  method:    'CARD' | 'SEPA' | 'TRANSFER';
}

export interface PaymentIntentResponse {
  clientSecret:  string;
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
  PaymentScreen:  { missionId: string; clientSecret: string; totalTTC: number };
  MissionSuccess: { missionId: string };
  Conversation:   { missionId: string };
  RateAgent:      { bookingId: string; agentId: string };
};
