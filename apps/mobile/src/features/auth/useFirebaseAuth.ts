import { useEffect, useState } from "react";

import {
  mapAuthError,
  signInAnonymously,
  signInWithGoogle,
  subscribeAuth,
  toAuthUser,
  type AuthUser
} from "../../services/firebase/auth";
import { getFirebaseServices } from "../../services/firebase/client";

export type { AuthUser };

export type AuthStatus = "disabled" | "loading" | "signed_out" | "signed_in" | "error";

export type FirebaseAuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
};

export type UseFirebaseAuth = FirebaseAuthState & {
  /** 익명 로그인 (데이터 읽기용 배경 세션). */
  signIn: () => Promise<void>;
  /** Google 로그인 (웹 팝업). */
  signInGoogle: () => Promise<void>;
};

const DISABLED: FirebaseAuthState = { status: "disabled", user: null, error: null };

/**
 * Firebase 인증 훅 (mock → Firebase 전환 1단계).
 *
 * - `.env` 미설정 → status `"disabled"` (호출부는 mock/게스트로 폴백)
 * - 영구 저장된 세션(웹 localStorage / 네이티브 AsyncStorage)이 있으면 마운트 시 자동 복원
 * - 로그인 실패 시: 기존 세션이 있으면 그대로 두고 error 만, 없으면 status `"error"`
 */
export function useFirebaseAuth(): UseFirebaseAuth {
  const [state, setState] = useState<FirebaseAuthState>(() =>
    getFirebaseServices() ? { status: "loading", user: null, error: null } : DISABLED
  );

  useEffect(() => {
    if (!getFirebaseServices()) {
      setState(DISABLED);
      return;
    }

    return subscribeAuth((user) =>
      setState({
        status: user ? "signed_in" : "signed_out",
        user: user ? toAuthUser(user) : null,
        error: null
      })
    );
  }, []);

  async function run(action: () => Promise<void>) {
    if (!getFirebaseServices()) {
      return;
    }

    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      await action();
      // 성공 시 위 구독이 signed_in 으로 갱신
    } catch (error) {
      setState((prev) => ({
        // 기존 로그인 세션이 있으면 유지하고 에러만 표시
        status: prev.user ? "signed_in" : "error",
        user: prev.user,
        error: mapAuthError(error)
      }));
    }
  }

  return {
    ...state,
    signIn: () => run(signInAnonymously),
    signInGoogle: () => run(signInWithGoogle)
  };
}
