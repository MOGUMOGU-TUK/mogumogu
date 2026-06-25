import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAuth,
  initializeAuth,
  // getReactNativePersistence 는 firebase/auth 의 React Native 빌드에만 타입이 있다.
  // Metro 는 런타임에 RN 빌드를 쓰지만 tsc 는 web 타입을 보므로 여기서만 보정한다.
  // @ts-expect-error -- RN 전용 export (web 타입 정의에는 없음)
  getReactNativePersistence,
  type Auth
} from "firebase/auth";
import { getFunctions, type Functions } from "firebase/functions";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
};

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  );
}

export function getFirebaseServices(): FirebaseServices | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  const auth = getInitializedAuth(app);

  return {
    app,
    auth,
    db: getFirestore(app),
    storage: getStorage(app),
    functions: getFunctions(app, "asia-northeast3")
  };
}

function getInitializedAuth(app: FirebaseApp): Auth {
  // 웹은 기본 브라우저 persistence 를 쓰는 getAuth 로 충분하다.
  if (Platform.OS === "web") {
    return getAuth(app);
  }

  // 네이티브(iOS/Android)는 AsyncStorage 로 익명 세션을 영구 저장한다.
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch {
    // 이미 initializeAuth 가 호출된 경우(핫리로드 등) getAuth 로 폴백
    return getAuth(app);
  }
}
