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
cd gonggu-mate/04_app_react_native/app
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
```

Expo는 `EXPO_PUBLIC_` prefix가 붙은 값만 앱 번들에서 읽을 수 있습니다.

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

`.env` 수정 후 Metro를 재시작합니다.

```bash
cd gonggu-mate
npm run ios
```

## 5. 다음 구현 순서

1. `mock login`을 Firebase Auth anonymous login으로 교체
2. `seedSnapshot` 대신 Firestore `gonggus` 구독
3. `joinGonggu`, `confirmPickup`, `submitReview`를 callable Functions로 교체
4. 채팅 메시지를 Firestore subcollection으로 교체
5. 이미지 업로드를 Firebase Storage로 연결
