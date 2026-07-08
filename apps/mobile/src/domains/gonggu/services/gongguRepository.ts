import { collection, doc, onSnapshot, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes, type FirebaseStorage } from "firebase/storage";

import type { Gonggu, Settlement, User } from "../../../types/domain";
import { getFirebaseServices } from "../../../services/firebase/client";

const GONGGUS = "gonggus";
const SETTLEMENTS = "settlements";
const CHATS = "chats";
const MESSAGES = "messages";

async function uploadGongguImages(
  storage: FirebaseStorage,
  gongguId: string,
  imageUris: string[]
): Promise<string[]> {
  return Promise.all(
    imageUris.map(async (uri, index) => {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileRef = storageRef(storage, `gonggus/${gongguId}/${index}.jpg`);
      await uploadBytes(fileRef, blob);
      return getDownloadURL(fileRef);
    })
  );
}

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
    return () => { };
  }

  return onSnapshot(
    collection(services.db, GONGGUS),
    (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<Gonggu, "id">), id: d.id }))),
    (error) => onError?.(error)
  );
}

export type CreateGongguInput = {
  title: string;
  category: string;
  totalPrice: number;
  totalQuantity: number;
  pickupPlaceName: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupNeighborhood?: string;
  pickupExpectedTime: string;
  splitMethod: string;
  recruitmentDeadline: string;
  imageUris?: string[];
};

/**
 * 새 공구 + 정산 문서를 함께 생성하고 공구 문서 id 를 돌려준다.
 * 단가 = ceil(총액 / 총 수량) (단순 계산). 확보 수량은 0에서 시작한다.
 */
export async function createGongguDoc(input: CreateGongguInput, host: User): Promise<string> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db, storage } = services;

  const gongguRef = doc(collection(db, GONGGUS));
  const settlementId = `settlement_${gongguRef.id}`;
  const totalQuantity = Math.max(1, input.totalQuantity);
  const unitPrice = Math.ceil(input.totalPrice / totalQuantity);
  const imageUrls = input.imageUris?.length
    ? await uploadGongguImages(storage, gongguRef.id, input.imageUris)
    : [];

  const gonggu: Omit<Gonggu, "id"> = {
    title: input.title,
    description: "참여자와 픽업 시간을 조율하세요.",
    category: input.category,
    hostUserId: host.id,
    hostNickname: host.nickname,
    hostTrustScore: host.trustScore,
    purchaseStore: "",
    totalPrice: input.totalPrice,
    totalQuantity,
    claimedQuantity: 0,
    currentParticipants: 0,
    splitMethod: input.splitMethod,
    pickupPlaceName: input.pickupPlaceName,
    pickupDistanceMeters: 300,
    ...(typeof input.pickupLatitude === "number" && typeof input.pickupLongitude === "number"
      ? {
        pickupLatitude: input.pickupLatitude,
        pickupLongitude: input.pickupLongitude,
        pickupNeighborhood: input.pickupNeighborhood ?? host.neighborhood
      }
      : {}),
    pickupExpectedTime: input.pickupExpectedTime,
    recruitmentDeadline: input.recruitmentDeadline,
    status: "recruiting",
    imageUrls,
    receiptVerified: false,
    settlementId
  };

  const settlement: Omit<Settlement, "id"> = {
    gongguId: gongguRef.id,
    hostUserId: host.id,
    totalAmount: input.totalPrice,
    unitPrice,
    totalQuantity,
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

export type UpdateGongguInput = {
  title: string;
  category: string;
  totalPrice: number;
  totalQuantity: number;
  pickupPlaceName: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupExpectedTime: string;
  splitMethod: string;
  recruitmentDeadline: string;
  imageUris: string[];
};

/**
 * 공구 내용 수정 (방장만 호출). 사진은 기존 업로드 URL과 새로 고른 로컬 사진을 섞어 받아서,
 * 로컬 사진만 Storage에 새로 업로드하고 기존 URL은 그대로 둔다.
 */
export async function updateGongguDoc(gongguId: string, input: UpdateGongguInput): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db, storage } = services;

  const existingUrls = input.imageUris.filter((uri) => uri.startsWith("http"));
  const newLocalUris = input.imageUris.filter((uri) => !uri.startsWith("http"));
  const uploadedUrls = newLocalUris.length
    ? await uploadGongguImages(storage, gongguId, newLocalUris)
    : [];

  await updateDoc(doc(db, GONGGUS, gongguId), {
    title: input.title,
    category: input.category,
    totalPrice: input.totalPrice,
    totalQuantity: Math.max(1, input.totalQuantity),
    pickupPlaceName: input.pickupPlaceName,
    pickupExpectedTime: input.pickupExpectedTime,
    splitMethod: input.splitMethod,
    recruitmentDeadline: input.recruitmentDeadline,
    imageUrls: [...existingUrls, ...uploadedUrls]
  });
}

/**
 * 공구 삭제(방장만 호출). 문서는 지우지 않고 상태만 canceled 로 바꿔서
 * 목록 노출은 멈추되 참여자와의 채팅 기록은 그대로 남기고, 종료 안내 메시지를 남긴다.
 */
export async function cancelGongguDoc(gongguId: string, options?: { hideForHost?: boolean }): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  const batch = writeBatch(db);
  batch.update(doc(db, GONGGUS, gongguId), {
    status: "canceled",
    ...(options?.hideForHost ? { hostHidden: true } : {})
  });
  batch.set(doc(collection(db, CHATS, gongguId, MESSAGES)), {
    gongguId,
    senderId: "system",
    senderName: "mogumogu",
    text: "종료된 공구입니다.",
    messageType: "system",
    createdAt: new Date().toISOString()
  });
  await batch.commit();
}

/**
 * 방장이 거래완료 버튼을 누른 경우: 공구 상태를 후기 대기로 전환하고 채팅에 안내 메시지를 남긴다.
 * 참여자와 동일하게, 방장도 직접 나가기 전까지는 채팅 목록에 계속 보인다.
 */
export async function completeGongguDoc(gongguId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  const batch = writeBatch(db);
  batch.update(doc(db, GONGGUS, gongguId), {
    status: "review_required",
  });
  batch.set(doc(collection(db, CHATS, gongguId, MESSAGES)), {
    gongguId,
    senderId: "system",
    senderName: "mogumogu",
    text: "거래가 완료됐어요. 후기를 남겨주세요!",
    messageType: "system",
    createdAt: new Date().toISOString(),
  });
  await batch.commit();
}

/**
 * 방장이 이미 종료된(후기대기/완료/취소) 공구의 채팅방에서 "나가기"를 누른 경우: 본인 채팅 목록에서만 숨긴다.
 */
export async function hideGongguChatDoc(gongguId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다.");
  }
  const { db } = services;

  await updateDoc(doc(db, GONGGUS, gongguId), { hostHidden: true });
}
