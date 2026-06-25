export type GongguStatus =
  | "recruiting"
  | "recruited"
  | "pickup_pending"
  | "pickup_completed"
  | "review_required"
  | "completed"
  | "canceled"
  | "disputed";

export type ParticipationStatus =
  | "joined"
  | "payment_pending"
  | "payment_confirmed"
  | "pickup_confirmed"
  | "reviewed"
  | "completed"
  | "canceled";

export type SettlementStatus =
  | "not_required"
  | "pending"
  | "held"
  | "releasable"
  | "payout_requested"
  | "paid"
  | "disputed"
  | "refunded";

export type PaymentStatus = "not_required" | "pending" | "confirmed" | "failed" | "refunded";

export type User = {
  id: string;
  nickname: string;
  neighborhood: string;
  universityVerified: boolean;
  locationVerified: boolean;
  trustScore: number;
  completedGongguCount: number;
};

export type Gonggu = {
  id: string;
  title: string;
  description: string;
  category: string;
  hostUserId: string;
  hostNickname: string;
  hostTrustScore: number;
  purchaseStore: string;
  totalPrice: number;
  targetParticipants: number;
  currentParticipants: number;
  splitMethod: string;
  pickupPlaceName: string;
  pickupDistanceMeters: number;
  pickupExpectedTime: string;
  recruitmentDeadline: string;
  status: GongguStatus;
  imageUrl: string;
  receiptVerified: boolean;
  settlementId: string;
};

export type Participation = {
  gongguId: string;
  userId: string;
  status: ParticipationStatus;
  paymentStatus: PaymentStatus;
  pickupConfirmationStatus: "pending" | "confirmed";
  reviewStatus: "required" | "completed" | "not_required";
  joinedAt: string;
};

export type ChatMessage = {
  id: string;
  gongguId: string;
  senderId: string;
  senderName: string;
  text: string;
  messageType: "user" | "system";
  createdAt: string;
};

export type Settlement = {
  id: string;
  gongguId: string;
  hostUserId: string;
  totalAmount: number;
  pricePerPerson: number;
  participantCount: number;
  mode: "mock" | "manual" | "future_pg";
  status: SettlementStatus;
  releaseCondition: "all_pickup_confirmed_and_reviews_completed";
};

export type Review = {
  id: string;
  gongguId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  tags: string[];
  comment: string;
  createdAt: string;
};

export type AppSnapshot = {
  users: User[];
  gonggus: Gonggu[];
  participations: Participation[];
  messages: ChatMessage[];
  settlements: Settlement[];
  reviews: Review[];
};

