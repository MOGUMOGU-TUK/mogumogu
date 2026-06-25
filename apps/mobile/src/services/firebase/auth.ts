import {
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  type User as FirebaseUser
} from "firebase/auth";

import { getFirebaseServices } from "./client";

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

/** 익명 로그인. Firebase 미설정 시 throw. */
export async function signInAnonymously(): Promise<void> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error("Firebase가 설정되지 않았습니다. apps/mobile/.env 를 확인하세요.");
  }

  await firebaseSignInAnonymously(services.auth);
}

/** Firebase Auth 에러를 사용자용 한국어 메시지로 변환. */
export function mapAuthError(error: unknown): string {
  const code = (error as { code?: string }).code;
  switch (code) {
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "콘솔에서 익명 로그인이 아직 켜져 있지 않습니다. Authentication → Sign-in method → 익명 사용 설정 후 다시 시도하세요.";
    case "auth/network-request-failed":
      return "네트워크 오류로 로그인에 실패했습니다. 연결 상태를 확인하세요.";
    default:
      return (error as { message?: string }).message ?? "익명 로그인에 실패했습니다.";
  }
}
