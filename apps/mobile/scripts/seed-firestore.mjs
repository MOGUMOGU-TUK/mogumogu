// Firestore 시드 스크립트. gonggus 컬렉션을 1회 채운다.
//   cd apps/mobile && npm run seed   (또는 루트에서 npm run firebase:seed)
//
// 익명 로그인 후 gonggus/{id} 문서를 생성한다. 이미 있으면 건너뛴다
// (rules 상 gonggus update 는 막혀 있어 덮어쓰기 불가).
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const app = initializeApp({
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID
});

// settlementId 는 앱의 로컬 seed 정산(settlement_1/2)과 맞춰 둔다.
const gonggus = [
  {
    id: "gonggu_1",
    title: "코스트코 베이글 12개 나눠요",
    description: "플레인/어니언 반반 구성입니다. 오늘 저녁 픽업 가능해요.",
    category: "식품",
    hostUserId: "host_1",
    hostNickname: "소분장인",
    hostTrustScore: 39.1,
    purchaseStore: "코스트코 양재",
    totalPrice: 12900,
    targetParticipants: 3,
    currentParticipants: 2,
    splitMethod: "1인 4개씩 지퍼백 소분",
    pickupPlaceName: "신촌역 2번 출구",
    pickupDistanceMeters: 420,
    pickupExpectedTime: "오늘 19:30",
    recruitmentDeadline: "오늘 18:30",
    status: "recruiting",
    imageUrl: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df",
    receiptVerified: true,
    settlementId: "settlement_1"
  },
  {
    id: "gonggu_2",
    title: "트레이더스 생수 2L 묶음 공구",
    description: "차량으로 가져오고 학교 정문에서 나눕니다. 무거우니 장바구니 챙겨주세요.",
    category: "생필품",
    hostUserId: "host_2",
    hostNickname: "마트원정대",
    hostTrustScore: 37.4,
    purchaseStore: "이마트 트레이더스",
    totalPrice: 9800,
    targetParticipants: 4,
    currentParticipants: 1,
    splitMethod: "1인 3병씩",
    pickupPlaceName: "서강대 정문",
    pickupDistanceMeters: 980,
    pickupExpectedTime: "내일 12:20",
    recruitmentDeadline: "오늘 23:00",
    status: "recruiting",
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43",
    receiptVerified: false,
    settlementId: "settlement_2"
  }
];

// 정산 문서 (앱의 로컬 seed 정산과 동일한 숫자).
const settlements = [
  {
    id: "settlement_1",
    gongguId: "gonggu_1",
    hostUserId: "host_1",
    totalAmount: 12900,
    pricePerPerson: 4300,
    participantCount: 3,
    mode: "mock",
    status: "pending",
    releaseCondition: "all_pickup_confirmed_and_reviews_completed"
  },
  {
    id: "settlement_2",
    gongguId: "gonggu_2",
    hostUserId: "host_2",
    totalAmount: 9800,
    pricePerPerson: 2450,
    participantCount: 4,
    mode: "mock",
    status: "pending",
    releaseCondition: "all_pickup_confirmed_and_reviews_completed"
  }
];

await signInAnonymously(getAuth(app));
const db = getFirestore(app);

async function seedDocs(collectionName, items) {
  for (const { id, ...data } of items) {
    const ref = doc(db, collectionName, id);
    if ((await getDoc(ref)).exists()) {
      console.log(`skip  ${collectionName}/${id} (이미 존재)`);
      continue;
    }
    await setDoc(ref, data);
    console.log(`seed  ${collectionName}/${id}`);
  }
}

await seedDocs("gonggus", gonggus);
await seedDocs("settlements", settlements);

console.log("done");
process.exit(0);
