import { Pressable, Text, TextInput, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { MapPinIcon } from "../../../shared/ui/icons";
import { styles } from "../../../shared/ui/appStyles";

export function VerifyScreen({
  step,
  nickname,
  locating,
  locateError,
  neighborhood,
  onNick,
  onNext,
  onLocate,
  onStart,
}: {
  step: number;
  nickname: string;
  locating: boolean;
  locateError: string | null;
  neighborhood: string;
  onNick: (v: string) => void;
  onNext: () => void;
  onLocate: () => void;
  onStart: () => void;
}) {
  const nickReady = nickname.trim().length > 0;

  return (
    <View style={styles.verifyWrap}>
      <View style={styles.stepRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.stepBar,
              { backgroundColor: step >= i ? t.rose : t.border },
            ]}
          />
        ))}
      </View>

      {step === 0 && (
        <>
          <View style={styles.flex}>
            <Text style={styles.verifyTitle}>
              동네에서 쓸{"\n"}닉네임을 정해주세요
            </Text>
            <Text style={styles.verifyDesc}>
              이웃에게 보여지는 이름이에요. 언제든 바꿀 수 있어요.
            </Text>
            <View
              style={[
                styles.nickField,
                { borderBottomColor: nickname.length ? t.rose : t.border },
              ]}
            >
              <TextInput
                value={nickname}
                onChangeText={(v) => onNick(v.slice(0, 12))}
                placeholder="예) 크루아상러버"
                placeholderTextColor={t.dim}
                style={styles.nickInput}
              />
              <Text style={{ fontSize: 13, color: t.dim }}>
                {nickname.length}/12
              </Text>
            </View>
          </View>
          <Pressable
            disabled={!nickReady}
            onPress={onNext}
            style={[
              styles.pillButton,
              { backgroundColor: nickReady ? t.pink : "#EDEAE3" },
            ]}
          >
            <Text
              style={[
                styles.pillButtonText,
                { color: nickReady ? "#fff" : t.dim },
              ]}
            >
              다음
            </Text>
          </Pressable>
        </>
      )}

      {step === 1 && (
        <>
          <View style={styles.verifyCenter}>
            <View style={styles.locateCircle}>
              {locating ? (
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: t.muted }}
                >
                  위치 확인 중…
                </Text>
              ) : (
                <MapPinIcon size={44} color={t.rose} />
              )}
            </View>
            <Text
              style={[
                styles.verifyTitle,
                { textAlign: "center", marginTop: 18 },
              ]}
            >
              {locating ? "위치 확인 중…" : "동네를 인증해주세요"}
            </Text>
            <Text
              style={[
                styles.verifyDesc,
                { textAlign: "center", maxWidth: 240 },
              ]}
            >
              {locating
                ? "현재 위치를 기반으로 동네를 확인하고 있어요"
                : "GPS로 현재 위치를 확인해 우리 동네 이웃임을 인증해요. 정확한 위치는 공개되지 않아요."}
            </Text>
            {!!locateError && (
              <Text
                style={{
                  fontSize: 12,
                  color: t.rose,
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                {locateError}
              </Text>
            )}
          </View>
          <Pressable
            disabled={locating}
            onPress={onLocate}
            style={[
              styles.pillButton,
              { backgroundColor: t.pink, opacity: locating ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.pillButtonText, { color: "#fff" }]}>
              현재 위치로 동네 인증
            </Text>
          </Pressable>
        </>
      )}

      {step === 2 && (
        <>
          <View style={styles.verifyCenter}>
            <View style={styles.doneCircle}>
              <Text style={{ fontSize: 40, color: "#fff" }}>✓</Text>
            </View>
            <Text
              style={[
                styles.verifyTitle,
                { textAlign: "center", marginTop: 20 },
              ]}
            >
              {neighborhood} 인증 완료!
            </Text>
            <Text style={[styles.verifyDesc, { textAlign: "center" }]}>
              이제 {neighborhood} 반경 1km 안의{"\n"}공구를 보고 참여할 수
              있어요
            </Text>
            <Pressable style={styles.eduBadge}>
              <Text style={{ fontSize: 13, color: t.chipInk }}>
                🎓 학교 이메일 인증하고 배지 받기{" "}
                <Text style={{ color: t.dim }}>(나중에)</Text>
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={onStart}
            style={[styles.pillButton, { backgroundColor: t.pink }]}
          >
            <Text style={[styles.pillButtonText, { color: "#fff" }]}>
              모구모구 시작하기
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
