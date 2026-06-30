import { collection, doc, onSnapshot, Timestamp, writeBatch } from "firebase/firestore";

import type { Gonggu, Settlement, User } from "../../types/domain";
import { getFirebaseServices } from "./client";

const GONGGUS = "gonggus";
const SETTLEMENTS = "settlements";

/**
 * gonggus 컬렉션 실시간 구독 (mock → Firebase 전환 2단계).
 * Firebase 미설정 시 no-op 해제 함수를 돌려준다.
 */
export function subscribeGonggus(
  onChange: (gonggus: Gonggu[]) => void,
  onError?: (error: Error) => void
): () => void {
  const services = getFirebaseServices();
  if (!services) {
    return () => {};
  }

  return onSnapshot(
    collection(services.db, GONGGUS),
    (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<Gonggu, "id">), id: d.id }))),
    (error) => onError?.(error)
  );
}

export type CreateGongguInput = {
  title: string;
  totalPrice: number;
  targetParticipants: number;
  pickupPlaceName: string;
  pickupExpectedTime: string;
};

/**
 * 새 공구 + 정산 문서를 함께 생성하고 공구 문서 id 를 돌려준다.
 * 정산 1인 금액 = ceil(총액 / 목표 인원) (단순 계산).
 */
export async function createGongguDoc(input: CreateGongguInput, host: User): Promise<string> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  const gongguRef = doc(collection(db, GONGGUS));
  const settlementId = `settlement_${gongguRef.id}`;
  const pricePerPerson = Math.ceil(input.totalPrice / input.targetParticipants);

  const gonggu: Omit<Gonggu, "id"> = {
    title: input.title,
    description: "참여자와 픽업 시간을 조율하세요.",
    category: "기타",
    hostUserId: host.id,
    hostNickname: host.nickname,
    hostTrustScore: host.trustScore,
    purchaseStore: "직접 입력",
    totalPrice: input.totalPrice,
    targetParticipants: input.targetParticipants,
    currentParticipants: 1,
    splitMethod: "참여 인원 기준 1/N 소분",
    pickupPlaceName: input.pickupPlaceName,
    pickupDistanceMeters: 300,
    pickupExpectedTime: input.pickupExpectedTime,
    recruitmentDeadline: "오늘 23:59",
    status: "recruiting",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e",
    receiptVerified: false,
    settlementId
  };

  const settlement: Omit<Settlement, "id"> = {
    gongguId: gongguRef.id,
    hostUserId: host.id,
    totalAmount: input.totalPrice,
    pricePerPerson,
    participantCount: input.targetParticipants,
    mode: "mock",
    status: "pending",
    releaseCondition: "all_pickup_confirmed_and_reviews_completed"
  };

  const midnightTonight = new Date();
  midnightTonight.setHours(23, 59, 0, 0);

  const batch = writeBatch(db);
  batch.set(gongguRef, { ...gonggu, deadlineAt: Timestamp.fromDate(midnightTonight) });
  batch.set(doc(db, SETTLEMENTS, settlementId), settlement);
  await batch.commit();

  return gongguRef.id;
}
