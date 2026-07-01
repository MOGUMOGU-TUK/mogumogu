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
  /** 공구 총 수량(개). 단가 = totalPrice / totalQuantity. */
  totalQuantity: number;
  /** 참여자들이 지금까지 확보한 수량 합계. 진행률·모집완료의 기준. */
  claimedQuantity: number;
  /** 참여한 사람 수(참고용 표시). */
  currentParticipants: number;
  splitMethod: string;
  pickupPlaceName: string;
  pickupDistanceMeters: number;
  pickupExpectedTime: string;
  recruitmentDeadline: string;
  status: GongguStatus;
  imageUrls: string[];
  receiptVerified: boolean;
  settlementId: string;
  /** 방장이 종료된 공구의 채팅방에서 "나가기"를 눌러 본인 채팅 목록에서 숨긴 경우 true. */
  hostHidden?: boolean;
};

export type Participation = {
  gongguId: string;
  userId: string;
  status: ParticipationStatus;
  paymentStatus: PaymentStatus;
  pickupConfirmationStatus: "pending" | "confirmed";
  reviewStatus: "required" | "completed" | "not_required";
  /** 이 참여자가 고른 수량(개). */
  quantity: number;
  /** 부담 금액 = 단가 × quantity. */
  amount: number;
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
  /** 1개당 가격 = ceil(totalAmount / totalQuantity). */
  unitPrice: number;
  /** 공구 총 수량(개). */
  totalQuantity: number;
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

