import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  writeBatch
} from "firebase/firestore";

import type { Gonggu, Participation, Review, Settlement, User } from "../../../types/domain";
import { getFirebaseServices } from "../../../services/firebase/client";

const GONGGUS = "gonggus";
const PARTICIPATIONS = "participations";
const SETTLEMENTS = "settlements";
const REVIEWS = "reviews";
const CHATS = "chats";
const MESSAGES = "messages";

/** 참여 문서 id (공구 + 사용자 1:1). */
const participationId = (gongguId: string, userId: string) => `${gongguId}__${userId}`;

// ─── 구독 (mock → Firebase 전환 3단계) ───────────────────────────────

export function subscribeParticipations(onChange: (items: Participation[]) => void): () => void {
  const services = getFirebaseServices();
  if (!services) {
    return () => {};
  }
  return onSnapshot(collection(services.db, PARTICIPATIONS), (snap) =>
    onChange(snap.docs.map((d) => d.data() as Participation))
  );
}

export function subscribeSettlements(onChange: (items: Settlement[]) => void): () => void {
  const services = getFirebaseServices();
  if (!services) {
    return () => {};
  }
  return onSnapshot(collection(services.db, SETTLEMENTS), (snap) =>
    onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<Settlement, "id">), id: d.id })))
  );
}

export function subscribeReviews(onChange: (items: Review[]) => void): () => void {
  const services = getFirebaseServices();
  if (!services) {
    return () => {};
  }
  return onSnapshot(collection(services.db, REVIEWS), (snap) =>
    onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<Review, "id">), id: d.id })))
  );
}

// ─── 쓰기 (규칙 완화로 클라이언트가 직접 수행) ──────────────────────

/** 공구 참여: 참여 문서 생성 + 확보 수량/인원/상태 갱신 + 채팅방 입장 안내 메시지. */
export async function joinGongguDoc(gongguId: string, user: User, quantity: number): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  const gongguRef = doc(db, GONGGUS, gongguId);
  const gongguSnap = await getDoc(gongguRef);
  if (!gongguSnap.exists()) {
    return;
  }
  const gonggu = gongguSnap.data() as Gonggu;

  const partRef = doc(db, PARTICIPATIONS, participationId(gongguId, user.id));
  if ((await getDoc(partRef)).exists()) {
    return; // 이미 참여함
  }

  const qty = Math.max(1, Math.floor(quantity));
  const remaining = gonggu.totalQuantity - gonggu.claimedQuantity;
  if (remaining <= 0) {
    throw new Error("모집이 완료된 공구예요.");
  }
  if (qty > remaining) {
    throw new Error("남은 수량을 초과했어요.");
  }

  const unitPrice = Math.ceil(gonggu.totalPrice / Math.max(1, gonggu.totalQuantity));
  const nextClaimed = gonggu.claimedQuantity + qty;
  const participation: Participation = {
    gongguId,
    userId: user.id,
    status: "payment_confirmed",
    paymentStatus: "confirmed",
    pickupConfirmationStatus: "pending",
    reviewStatus: "required",
    quantity: qty,
    amount: unitPrice * qty,
    joinedAt: new Date().toISOString()
  };

  const batch = writeBatch(db);
  batch.set(partRef, participation);
  batch.update(gongguRef, {
    claimedQuantity: nextClaimed,
    currentParticipants: gonggu.currentParticipants + 1,
    status: nextClaimed >= gonggu.totalQuantity ? "recruited" : gonggu.status
  });
  batch.set(doc(collection(db, CHATS, gongguId, MESSAGES)), {
    gongguId,
    senderId: "system",
    senderName: "mogumogu",
    text: `${user.nickname}님이 ${qty}개 참여했습니다.`,
    messageType: "system",
    createdAt: new Date().toISOString()
  });
  await batch.commit();
}

/**
 * 공구방 나가기: 참여 문서를 삭제하고 채팅방에 퇴장 안내 메시지를 남긴다.
 * 모집중/모집완료 상태였다면 모집 인원도 함께 줄인다 (이미 픽업이 진행된 공구는 인원을 건드리지 않는다).
 */
export async function cancelParticipationDoc(gongguId: string, user: User): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  const partRef = doc(db, PARTICIPATIONS, participationId(gongguId, user.id));
  const partSnap = await getDoc(partRef);
  if (!partSnap.exists()) {
    return;
  }
  const leaving = partSnap.data() as Participation;

  const batch = writeBatch(db);
  batch.delete(partRef);
  batch.set(doc(collection(db, CHATS, gongguId, MESSAGES)), {
    gongguId,
    senderId: "system",
    senderName: "mogumogu",
    text: `${user.nickname}님이 나갔습니다.`,
    messageType: "system",
    createdAt: new Date().toISOString()
  });

  const gongguRef = doc(db, GONGGUS, gongguId);
  const gongguSnap = await getDoc(gongguRef);
  if (gongguSnap.exists()) {
    const gonggu = gongguSnap.data() as Gonggu;
    if (gonggu.status === "recruiting" || gonggu.status === "recruited") {
      batch.update(gongguRef, {
        claimedQuantity: Math.max(0, gonggu.claimedQuantity - leaving.quantity),
        currentParticipants: Math.max(0, gonggu.currentParticipants - 1),
        status: "recruiting"
      });
    }
  }
  await batch.commit();
}

/** 픽업 완료: 참여 상태 전환 + 공구 상태를 후기 대기로. */
export async function confirmPickupDoc(gongguId: string, userId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  const batch = writeBatch(db);
  batch.update(doc(db, PARTICIPATIONS, participationId(gongguId, userId)), {
    status: "pickup_confirmed",
    pickupConfirmationStatus: "confirmed"
  });
  batch.update(doc(db, GONGGUS, gongguId), { status: "review_required" });
  await batch.commit();
}

/** 후기 제출: 후기 생성 + 참여 상태 전환 + 정산 지급가능 + 공구 완료. */
export async function submitReviewDoc(
  gonggu: Gonggu,
  reviewer: User,
  rating: number,
  comment: string
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  const batch = writeBatch(db);

  const reviewRef = doc(collection(db, REVIEWS));
  const review: Omit<Review, "id"> = {
    gongguId: gonggu.id,
    reviewerId: reviewer.id,
    revieweeId: gonggu.hostUserId,
    rating,
    tags: ["시간 약속", "소통 매너"],
    comment,
    createdAt: new Date().toISOString()
  };
  batch.set(reviewRef, review);

  batch.update(doc(db, PARTICIPATIONS, participationId(gonggu.id, reviewer.id)), {
    status: "reviewed",
    reviewStatus: "completed"
  });

  if (gonggu.settlementId) {
    batch.update(doc(db, SETTLEMENTS, gonggu.settlementId), { status: "releasable" });
  }

  batch.update(doc(db, GONGGUS, gonggu.id), { status: "completed" });
  await batch.commit();
}
