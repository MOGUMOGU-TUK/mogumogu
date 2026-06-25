import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithPopup,
  type User as FirebaseUser
} from "firebase/auth";
import { Platform } from "react-native";

import { getFirebaseServices } from "./client";

export type AuthUser = {
  uid: string;
  isAnonymous: boolean;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

/** Firebase User → 앱 내부 AuthUser 로 변환. */
export function toAuthUser(user: FirebaseUser): AuthUser {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL
  };
}

/**
 * 인증 상태 구독. (mock → Firebase 전환 1단계: 익명 로그인)
 * Firebase 미설정 시 null 을 한 번 전달하고 no-op 해제 함수를 돌려준다.
 */
export function subscribeAuth(onChange: (user: FirebaseUser | null) => void): () => void {
  const services = getFirebaseServices();
  if (!services) {
    onChange(null);
    return () => {};
  }

  return onAuthStateChanged(services.auth, onChange);
}

/** 익명 로그인 (데이터 읽기용 배경 세션). Firebase 미설정 시 throw. */
export async function signInAnonymously(): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다. apps/mobile/.env 를 확인하세요.");
  }

  await firebaseSignInAnonymously(services.auth);
}

/**
 * Google 로그인. 현재는 웹(팝업)만 지원한다.
 * 네이티브(iOS/Android)는 expo-auth-session + OAuth 클라이언트 설정이 추가로 필요하다.
 */
export async function signInWithGoogle(): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다. apps/mobile/.env 를 확인하세요.");
  }

  if (Platform.OS !== "web") {
    const error = new Error("native google sign-in not configured");
    (error as { code?: string }).code = "auth/native-google-unsupported";
    throw error;
  }

  await signInWithPopup(services.auth, new GoogleAuthProvider());
}

/** Firebase Auth 에러를 사용자용 한국어 메시지로 변환. */
export function mapAuthError(error: unknown): string {
  const code = (error as { code?: string }).code;
  switch (code) {
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "콘솔에서 해당 로그인 방식이 아직 켜져 있지 않습니다. Authentication → Sign-in method 에서 사용 설정 후 다시 시도하세요.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google 로그인 창이 닫혀 로그인이 취소되었습니다.";
    case "auth/popup-blocked":
      return "브라우저가 팝업을 차단했습니다. 팝업을 허용한 뒤 다시 시도하세요.";
    case "auth/native-google-unsupported":
      return "네이티브 앱의 Google 로그인은 추가 설정 후 지원됩니다. 지금은 웹에서 사용하세요.";
    case "auth/network-request-failed":
      return "네트워크 오류로 로그인에 실패했습니다. 연결 상태를 확인하세요.";
    default:
      return (error as { message?: string }).message ?? "로그인에 실패했습니다.";
  }
}
