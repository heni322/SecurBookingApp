
// ─────────────────────────────────────────────────────────────────────────────
// DISPUTE
// ─────────────────────────────────────────────────────────────────────────────
export interface Dispute {
  id:          string;
  missionId:   string;
  bookingId?:  string;
  reason:      string;
  description: string;
  status:      'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolution?: string;
  createdAt:   string;
  resolvedAt?: string;
}

export interface CreateDisputePayload {
  missionId:   string;
  bookingId?:  string;
  reason:      string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION (extended)
// ─────────────────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login:    undefined;
  Register: undefined;
  TwoFa:    { tempToken: string };
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
  RateAgent:      {
    bookingId:    string;
    agentName:    string;
    agentId:      string;
    missionTitle: string;
  };
  LiveTracking:   {
    missionId:      string;
    bookingId:      string;
    agentName:      string;
    missionAddress: string;
    siteLat:        number;
    siteLng:        number;
  };
  Dispute:        {
    missionId:    string;
    bookingId?:   string;
    missionTitle: string;
  };
};
