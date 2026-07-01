import type {
  AppSnapshot,
  ChatMessage,
  Gonggu,
  Participation,
  Review,
  Settlement,
  User
} from "../../types/domain";

export function getCurrentUser(snapshot: AppSnapshot): User {
  const currentUser = snapshot.users.find((user) => user.id === "user_me");
  if (!currentUser) {
    throw new Error("Current user seed is missing.");
  }

  return currentUser;
}

export function getUnitPrice(gonggu: Gonggu) {
  return Math.ceil(gonggu.totalPrice / Math.max(1, gonggu.totalQuantity));
}

export function findParticipation(snapshot: AppSnapshot, gongguId: string, userId: string) {
  return snapshot.participations.find(
    (participation) => participation.gongguId === gongguId && participation.userId === userId
  );
}

export function joinGonggu(
  snapshot: AppSnapshot,
  gongguId: string,
  userId: string,
  quantity: number
): AppSnapshot {
  if (findParticipation(snapshot, gongguId, userId)) {
    return snapshot;
  }

  const target = snapshot.gonggus.find((item) => item.id === gongguId);
  if (!target) {
    return snapshot;
  }
  const qty = Math.max(1, Math.floor(quantity));
  const remaining = target.totalQuantity - target.claimedQuantity;
  if (qty > remaining) {
    return snapshot;
  }
  const unitPrice = getUnitPrice(target);

  const now = new Date().toISOString();
  const nextGonggus = snapshot.gonggus.map((gonggu) => {
    if (gonggu.id !== gongguId) {
      return gonggu;
    }

    const nextClaimed = gonggu.claimedQuantity + qty;
    return {
      ...gonggu,
      claimedQuantity: nextClaimed,
      currentParticipants: gonggu.currentParticipants + 1,
      status: nextClaimed >= gonggu.totalQuantity ? "recruited" : gonggu.status
    } satisfies Gonggu;
  });

  const nextParticipation: Participation = {
    gongguId,
    userId,
    status: "payment_confirmed",
    paymentStatus: "confirmed",
    pickupConfirmationStatus: "pending",
    reviewStatus: "required",
    quantity: qty,
    amount: unitPrice * qty,
    joinedAt: now
  };

  const gonggu = snapshot.gonggus.find((item) => item.id === gongguId);
  const nextMessages: ChatMessage[] = gonggu
    ? [
        ...snapshot.messages,
        {
          id: `msg_${snapshot.messages.length + 1}`,
          gongguId,
          senderId: "system",
          senderName: "mogumogu",
          text: `${getCurrentUser(snapshot).nickname}님이 참여했습니다. 모집 현황을 확인해주세요.`,
          messageType: "system",
          createdAt: now
        }
      ]
    : snapshot.messages;

  return {
    ...snapshot,
    gonggus: nextGonggus,
    participations: [...snapshot.participations, nextParticipation],
    messages: nextMessages
  };
}

export function cancelParticipation(snapshot: AppSnapshot, gongguId: string, userId: string): AppSnapshot {
  const participation = findParticipation(snapshot, gongguId, userId);
  if (!participation || participation.status !== "payment_confirmed") {
    return snapshot;
  }

  return {
    ...snapshot,
    gonggus: snapshot.gonggus.map((gonggu) => {
      if (gonggu.id !== gongguId) {
        return gonggu;
      }

      return {
        ...gonggu,
        claimedQuantity: Math.max(0, gonggu.claimedQuantity - participation.quantity),
        currentParticipants: Math.max(0, gonggu.currentParticipants - 1),
        status: "recruiting"
      };
    }),
    participations: snapshot.participations.filter(
      (item) => !(item.gongguId === gongguId && item.userId === userId)
    )
  };
}

export function sendMessage(
  snapshot: AppSnapshot,
  gongguId: string,
  sender: User,
  text: string
): AppSnapshot {
  const trimmed = text.trim();
  if (!trimmed) {
    return snapshot;
  }

  const nextMessage: ChatMessage = {
    id: `msg_${snapshot.messages.length + 1}`,
    gongguId,
    senderId: sender.id,
    senderName: sender.nickname,
    text: trimmed,
    messageType: "user",
    createdAt: new Date().toISOString()
  };

  return {
    ...snapshot,
    messages: [...snapshot.messages, nextMessage]
  };
}

export function confirmPickup(snapshot: AppSnapshot, gongguId: string, userId: string): AppSnapshot {
  const nextParticipations = snapshot.participations.map((participation) => {
    if (participation.gongguId !== gongguId || participation.userId !== userId) {
      return participation;
    }

    return {
      ...participation,
      status: "pickup_confirmed",
      pickupConfirmationStatus: "confirmed"
    } satisfies Participation;
  });

  return {
    ...snapshot,
    gonggus: snapshot.gonggus.map((gonggu) => {
      if (gonggu.id !== gongguId) {
        return gonggu;
      }

      return {
        ...gonggu,
        status: "review_required"
      } satisfies Gonggu;
    }),
    participations: nextParticipations
  };
}

export function submitReview(
  snapshot: AppSnapshot,
  gongguId: string,
  reviewerId: string,
  rating: number,
  comment: string
): AppSnapshot {
  const gonggu = snapshot.gonggus.find((item) => item.id === gongguId);
  if (!gonggu) {
    return snapshot;
  }

  const review: Review = {
    id: `review_${snapshot.reviews.length + 1}`,
    gongguId,
    reviewerId,
    revieweeId: gonggu.hostUserId,
    rating,
    tags: ["시간 약속", "소통 매너"],
    comment,
    createdAt: new Date().toISOString()
  };

  const nextParticipations = snapshot.participations.map((participation) => {
    if (participation.gongguId !== gongguId || participation.userId !== reviewerId) {
      return participation;
    }

    return {
      ...participation,
      status: "reviewed",
      reviewStatus: "completed"
    } satisfies Participation;
  });

  const settlement = snapshot.settlements.find((item) => item.id === gonggu.settlementId);
  const nextSettlements = settlement
    ? snapshot.settlements.map((item) => {
        if (item.id !== settlement.id) {
          return item;
        }

        return {
          ...item,
          status: "releasable"
        } satisfies Settlement;
      })
    : snapshot.settlements;

  return {
    ...snapshot,
    gonggus: snapshot.gonggus.map((item) =>
      item.id === gongguId ? ({ ...item, status: "completed" } satisfies Gonggu) : item
    ),
    participations: nextParticipations,
    settlements: nextSettlements,
    reviews: [...snapshot.reviews, review]
  };
}

export function createGonggu(
  snapshot: AppSnapshot,
  input: {
    title: string;
    totalPrice: number;
    totalQuantity: number;
    pickupPlaceName: string;
    pickupExpectedTime: string;
  }
): AppSnapshot {
  const currentUser = getCurrentUser(snapshot);
  const id = `gonggu_${snapshot.gonggus.length + 1}`;
  const settlementId = `settlement_${snapshot.settlements.length + 1}`;
  const totalQuantity = Math.max(1, input.totalQuantity);
  const unitPrice = Math.ceil(input.totalPrice / totalQuantity);
  const now = new Date().toISOString();

  const gonggu: Gonggu = {
    id,
    title: input.title,
    description: "POC에서 생성한 공구입니다. Firebase 연동 전 mock 데이터로 저장됩니다.",
    category: "기타",
    hostUserId: currentUser.id,
    hostNickname: currentUser.nickname,
    hostTrustScore: currentUser.trustScore,
    purchaseStore: "",
    totalPrice: input.totalPrice,
    totalQuantity,
    claimedQuantity: 0,
    currentParticipants: 0,
    splitMethod: "수량 기준 비례 분담",
    pickupPlaceName: input.pickupPlaceName,
    pickupDistanceMeters: 300,
    pickupExpectedTime: input.pickupExpectedTime,
    recruitmentDeadline: "오늘 23:59",
    status: "recruiting",
    imageUrls: ["https://images.unsplash.com/photo-1542838132-92c53300491e"],
    receiptVerified: false,
    settlementId
  };

  const settlement: Settlement = {
    id: settlementId,
    gongguId: id,
    hostUserId: currentUser.id,
    totalAmount: input.totalPrice,
    unitPrice,
    totalQuantity,
    mode: "mock",
    status: "pending",
    releaseCondition: "all_pickup_confirmed_and_reviews_completed"
  };

  const message: ChatMessage = {
    id: `msg_${snapshot.messages.length + 1}`,
    gongguId: id,
    senderId: "system",
    senderName: "mogumogu",
    text: "새 공구가 생성되었습니다. 참여자가 모이면 채팅과 정산 상태가 자동으로 연결됩니다.",
    messageType: "system",
    createdAt: now
  };

  return {
    ...snapshot,
    gonggus: [gonggu, ...snapshot.gonggus],
    settlements: [settlement, ...snapshot.settlements],
    messages: [...snapshot.messages, message]
  };
}
