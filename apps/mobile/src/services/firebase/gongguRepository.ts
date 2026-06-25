import { addDoc, collection, onSnapshot } from "firebase/firestore";

import type { Gonggu, User } from "../../types/domain";
import { getFirebaseServices } from "./client";

const GONGGUS = "gonggus";

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
 * 새 공구를 Firestore 에 생성하고 문서 id 를 돌려준다.
 * Firestore rules: gonggus create = 로그인 사용자 허용 (참여/정산/후기는 서버 함수 전용).
 */
export async function createGongguDoc(input: CreateGongguInput, host: User): Promise<string> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }

  const data: Omit<Gonggu, "id"> = {
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
    settlementId: ""
  };

  const ref = await addDoc(collection(services.db, GONGGUS), data);
  return ref.id;
}
