import { Pressable, Text, useWindowDimensions, View } from "react-native";

import type { UseFirebaseAuth } from "../../../features/auth/useFirebaseAuth";
import { t } from "../../../shared/theme/theme";
import { BasketIcon, GoogleGIcon, KakaoIcon } from "../../../shared/ui/icons";
import { styles } from "../../../shell/appStyles";

export function LoginScreen({
  auth,
  onVerify,
  onFirebaseRequired,
  onGoogleLogin,
  onPeek,
}: {
  auth: UseFirebaseAuth;
  onVerify: () => void;
  onFirebaseRequired: () => void;
  onGoogleLogin: () => void;
  onPeek: () => void;
}) {
  const { height } = useWindowDimensions();
  const isSmall = height < 700;
  const loading = auth.status === "loading";

  function handleKakao() {
    /* Kakao OAuth 미구현 — 익명 세션 후 닉네임 설정으로 진입 */
    void auth.signIn();
    onVerify();
  }

  function handleGoogle() {
    if (auth.status === "disabled") {
      onFirebaseRequired();
      return;
    }

    onGoogleLogin();
    void auth.signInGoogle();
    /* 로그인 성공 시 useEffect에서 verify 화면으로 이동 */
  }

  return (
    <View style={styles.loginWrap}>
      <View style={[styles.loginHero, isSmall && { gap: 14 }]}>
        <View
          style={[
            styles.logoCircle,
            isSmall && { width: 72, height: 72, borderRadius: 36 },
          ]}
        >
          <BasketIcon size={isSmall ? 34 : 42} color="#fff" />
        </View>
        <View style={{ alignItems: "center", gap: isSmall ? 4 : 8 }}>
          <Text style={[styles.loginTitle, isSmall && { fontSize: 26 }]}>
            모구모구
          </Text>
          <Text style={styles.loginSubtitle}>
            우리 동네 대학생끼리{"\n"}나눠 사고, 같이 픽업해요
          </Text>
        </View>
      </View>

      {!!auth.error && (
        <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
          <Text style={{ fontSize: 12, color: t.rose, textAlign: "center" }}>
            {auth.error}
          </Text>
        </View>
      )}

      <View style={{ gap: 11, paddingBottom: isSmall ? 20 : 26 }}>
        {/* 카카오 공식 버튼 */}
        <Pressable
          style={[
            styles.authButton,
            { backgroundColor: t.kakao, opacity: loading ? 0.6 : 1 },
          ]}
          onPress={handleKakao}
          disabled={loading}
        >
          <KakaoIcon size={22} />
          <Text style={[styles.authButtonText, { color: t.kakaoInk }]}>
            카카오로 시작하기
          </Text>
        </Pressable>
        {/* Google 공식 버튼 */}
        <Pressable
          style={[
            styles.authButton,
            {
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#DADCE0",
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handleGoogle}
          disabled={loading}
        >
          <GoogleGIcon size={22} />
          <Text style={[styles.authButtonText, { color: "#3C4043" }]}>
            {loading ? "로그인 중…" : "Google로 시작하기"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onPeek}
          style={{ paddingVertical: 6, alignItems: "center" }}
        >
          <Text style={{ color: t.dim, fontSize: 13 }}>먼저 둘러볼게요</Text>
        </Pressable>
      </View>
    </View>
  );
}
