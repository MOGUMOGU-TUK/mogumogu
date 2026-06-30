import { useEffect, useState } from "react";

import {
  mapAuthError,
  signInAnonymously,
  subscribeAuth,
  toAuthUser,
  type AuthUser
} from "../../services/firebase/auth";
import { getFirebaseServices } from "../../services/firebase/client";
import { useGoogleSignIn } from "./useGoogleSignIn";

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
  /** Google 로그인 (웹: 팝업 / 네이티브: expo-auth-session). */
  signInGoogle: () => void;
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

  function setError(error: unknown) {
    setState((prev) => ({
      status: prev.user ? "signed_in" : "error",
      user: prev.user,
      error: mapAuthError(error)
    }));
  }

  async function run(action: () => Promise<void>) {
    if (!getFirebaseServices()) return;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      await action();
    } catch (error) {
      setError(error);
    }
  }

  function resetLoading() {
    setState((prev) => (prev.status === "loading" ? { ...prev, status: prev.user ? "signed_in" : "signed_out" } : prev));
  }

  const googleSignIn = useGoogleSignIn(setError, resetLoading);

  function signInGoogle() {
    if (!getFirebaseServices()) return;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    googleSignIn.promptAsync();
  }

  return {
    ...state,
    signIn: () => run(signInAnonymously),
    signInGoogle
  };
}
