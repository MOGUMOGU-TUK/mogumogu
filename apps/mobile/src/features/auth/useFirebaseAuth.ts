import { useEffect, useState } from "react";

import { mapAuthError, signInAnonymously, subscribeAuth } from "../../services/firebase/auth";
import { getFirebaseServices } from "../../services/firebase/client";

export type AuthStatus = "disabled" | "loading" | "signed_out" | "signed_in" | "error";

export type FirebaseAuthState = {
  status: AuthStatus;
  uid: string | null;
  error: string | null;
};

export type UseFirebaseAuth = FirebaseAuthState & {
  /** 익명 로그인 시도. 성공 시 onAuthStateChanged 가 signed_in 으로 갱신한다. */
  signIn: () => Promise<void>;
};

const DISABLED: FirebaseAuthState = { status: "disabled", uid: null, error: null };

/**
 * Firebase 익명 인증 훅 (mock → Firebase 전환 1단계).
 *
 * - `.env` 미설정 → status `"disabled"` (호출부는 mock 로그인으로 폴백)
 * - AsyncStorage 에 영구 저장된 세션이 있으면 마운트 시 자동으로 `"signed_in"` 복원
 * - 콘솔에서 익명 로그인이 꺼져 있으면 `signIn()` 이 실패하며 status `"error"`
 */
export function useFirebaseAuth(): UseFirebaseAuth {
  const [state, setState] = useState<FirebaseAuthState>(() =>
    getFirebaseServices() ? { status: "loading", uid: null, error: null } : DISABLED
  );

  useEffect(() => {
    if (!getFirebaseServices()) {
      setState(DISABLED);
      return;
    }

    return subscribeAuth((user) => {
      setState({
        status: user ? "signed_in" : "signed_out",
        uid: user?.uid ?? null,
        error: null
      });
    });
  }, []);

  async function signIn() {
    if (!getFirebaseServices()) {
      return;
    }

    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      await signInAnonymously();
      // 성공 시 위 구독이 signed_in 으로 갱신
    } catch (error) {
      setState((prev) => ({ ...prev, status: "error", error: mapAuthError(error) }));
    }
  }

  return { ...state, signIn };
}
