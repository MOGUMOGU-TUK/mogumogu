# Firebase Setup

## 1. Firebase Console에서 앱 등록

현재 보고 있는 `SQL Connect` 페이지는 이 POC 연결에 필요한 메뉴가 아닙니다.

React Native/Expo POC는 Firebase JS SDK를 사용하므로 아래 경로로 이동합니다.

```text
Firebase Console
  -> 프로젝트 설정
  -> 일반
  -> 내 앱
  -> 앱 추가
  -> 웹 앱 </>
```

웹 앱 이름은 예를 들어 `mogumogu-expo`로 만들고, Firebase Hosting은 지금 체크하지 않아도 됩니다.

생성 후 나오는 config에서 아래 값을 복사합니다.

```ts
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};
```

## 2. 앱 환경변수 입력

```bash
cd apps/mobile
cp .env.example .env
```

`.env`에 Firebase config를 넣습니다.

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...

# 동네 인증(GPS 좌표 → 동네 이름)에 필요한 카카오 REST API 키.
# JavaScript/Native 키와 다른, "REST API 키"를 넣어야 합니다.
EXPO_PUBLIC_KAKAO_REST_API_KEY=...
```

Expo는 `EXPO_PUBLIC_` prefix가 붙은 값만 앱 번들에서 읽을 수 있습니다. **번들 타임에 주입**되므로 `.env` 변경 후에는 `npx expo start -c`로 캐시를 지우고 재시작하세요.

> 카카오 REST 키가 없으면 동네 인증 단계에서 안내 문구가 뜹니다. 카카오 개발자 콘솔에서 REST API 키 발급 + 로컬 API 사용 설정이 필요합니다. 웹은 CORS로 막힐 수 있어 네이티브에서 확인을 권장합니다.

## 3. Firebase 제품 활성화

POC 기준으로 아래 제품을 켭니다.

- Authentication
  - POC: Anonymous 또는 Email/Password
  - MVP: Google 로그인
- Firestore Database
  - Native mode
  - location은 asia-northeast3 또는 asia-northeast1 권장
- Storage
  - 상품/영수증 이미지 업로드용
- Functions
  - 참여, 픽업 완료, 후기 제출, 정산 상태 전환용
  - 실제 배포는 요금제/리전 제약 확인 필요

## 4. 로컬 실행

`.env` 수정 후 캐시를 지우고 재시작합니다. 루트에서:

```bash
npm run ios          # 또는 npm run web
```

## 5. 구현 현황 / 다음 순서

- ✅ Firebase Auth (익명 + Google) 실연동
- ✅ Firestore `gonggus`/`participations`/`chats`/`reviews` 실시간 구독·쓰기 (POC 규칙 완화)
- ✅ 채팅 메시지 Firestore subcollection
- 🔜 `joinGonggu`/`confirmPickup`/`submitReview`를 callable Functions로 교체 (현재는 클라이언트 직접 쓰기)
- 🔜 이미지 업로드를 Firebase Storage로 연결
- 🔜 POC 완화 규칙을 Functions 경유로 다시 조이기 (`firestore.rules` 상단 주석 참고)
