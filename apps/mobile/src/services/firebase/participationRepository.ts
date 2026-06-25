import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  writeBatch
} from "firebase/firestore";

import type { Gonggu, Participation, Review, Settlement, User } from "../../types/domain";
import { getFirebaseServices } from "./client";

const GONGGUS = "gonggus";
const PARTICIPATIONS = "participations";
const SETTLEMENTS = "settlements";
const REVIEWS = "reviews";

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

/** 공구 참여: 참여 문서 생성 + 공구 인원/상태 갱신. (제2항 흐름의 단순 계산) */
export async function joinGongguDoc(gongguId: string, user: User): Promise<void> {
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

  const nextCount = Math.min(gonggu.currentParticipants + 1, gonggu.targetParticipants);
  const participation: Participation = {
    gongguId,
    userId: user.id,
    status: "payment_confirmed",
    paymentStatus: "confirmed",
    pickupConfirmationStatus: "pending",
    reviewStatus: "required",
    joinedAt: new Date().toISOString()
  };

  const batch = writeBatch(db);
  batch.set(partRef, participation);
  batch.update(gongguRef, {
    currentParticipants: nextCount,
    status: nextCount >= gonggu.targetParticipants ? "recruited" : gonggu.status
  });
  await batch.commit();
}

/** 참여 취소: 참여 문서 삭제 + 공구 인원 감소. */
export async function cancelParticipationDoc(gongguId: string, userId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  const partRef = doc(db, PARTICIPATIONS, participationId(gongguId, userId));
  const partSnap = await getDoc(partRef);
  if (!partSnap.exists() || (partSnap.data() as Participation).status !== "payment_confirmed") {
    return;
  }

  const batch = writeBatch(db);
  batch.delete(partRef);

  const gongguRef = doc(db, GONGGUS, gongguId);
  const gongguSnap = await getDoc(gongguRef);
  if (gongguSnap.exists()) {
    const gonggu = gongguSnap.data() as Gonggu;
    batch.update(gongguRef, {
      currentParticipants: Math.max(0, gonggu.currentParticipants - 1),
      status: "recruiting"
    });
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
