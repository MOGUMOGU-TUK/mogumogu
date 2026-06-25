# React Native Local Setup

## Requirements

- VSCode
- Node.js
- npm
- Expo Go app on a physical phone, or Expo web preview

Android Studio is not required for the first POC. Native features such as FCM, Kakao Login, and Naver Map can move to Expo development build or EAS Build later.

## Run

```bash
cd gonggu-mate/04_app_react_native/app
npm install
npm run start
```

For web preview:

```bash
npm run web
```

## POC Mode

The app currently runs with an in-memory mock repository:

- login is mocked
- location verification is mocked
- push notifications are represented as state/UI flow
- payment/escrow is represented as settlement state only

## Firebase Transition

Replace `src/services/mock` with Firebase-backed services in this order:

1. Firebase Auth
2. Firestore gonggu list/detail
3. Cloud Functions join/cancel/confirm pickup
4. Firestore chat subscription
5. Storage image upload
6. FCM/development build notifications

