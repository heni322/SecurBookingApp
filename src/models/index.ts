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
  confirmPhrase:   string;   // must equal "SUPPRIMER MON COMPTE"
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

export interface BookingLine {
  serviceTypeId: string;
  agentCount:    number;
}

export interface CreateQuotePayload {
  missionId:    string;
  bookingLines: BookingLine[];
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
  quote?:        Quote;
  payment?:      Payment;
  bookings?:     Booking[];
  createdAt:     string;
  updatedAt:     string;
}

export interface CreateMissionPayload {
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
  isUrgent?:     boolean;
  radiusKm?:     number;
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
  /** 'payment_intent' for CARD, 'setup_intent' for SEPA */
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