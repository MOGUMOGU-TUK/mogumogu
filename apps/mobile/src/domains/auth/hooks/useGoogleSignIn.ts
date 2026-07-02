import {
  GoogleSignin,
  statusCodes
} from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { Platform } from "react-native";

import { getFirebaseServices } from "../../../services/firebase/client";

const WEB_CLIENT_ID =
  "1081542232878-55rg64hqcomi6dbmt5qcp3q5jr2lptl3.apps.googleusercontent.com";

GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });

export function useGoogleSignIn(
  onError: (error: unknown) => void,
  onSettled: () => void
) {
  async function promptAsync() {
    const services = getFirebaseServices();
    if (!services) return;

    try {
      if (Platform.OS === "web") {
        await signInWithPopup(services.auth, new GoogleAuthProvider());
        return;
      }

      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) throw new Error("ID 토큰을 받지 못했어요.");

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(services.auth, credential);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (
        code !== statusCodes.SIGN_IN_CANCELLED &&
        code !== "auth/popup-closed-by-user" &&
        code !== "auth/cancelled-popup-request"
      ) {
        onError(error);
      }
    } finally {
      // 성공/실패/취소 모두 loading 상태 해제
      onSettled();
    }
  }

  return { promptAsync: () => void promptAsync() };
}
