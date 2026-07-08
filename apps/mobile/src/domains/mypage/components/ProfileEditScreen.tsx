import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shared/ui/appStyles";

export function ProfileEditScreen({
  nickname,
  locationLabel,
  canChangeNickname,
  nextNicknameChangeDate,
  locationLoading,
  locationError,
  onBack,
  onSave,
  onFindNeighborhood,
}: {
  nickname: string;
  locationLabel: string;
  canChangeNickname: boolean;
  nextNicknameChangeDate: string | null;
  locationLoading: boolean;
  locationError: string | null;
  onBack: () => void;
  onSave: (nickname: string) => void;
  onFindNeighborhood: () => void;
}) {
  const [draftNickname, setDraftNickname] = useState(nickname);
  const nicknameChanged = draftNickname.trim() !== nickname.trim();
  const canSave =
    draftNickname.trim().length > 0 && (!nicknameChanged || canChangeNickname);

  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.simpleHeaderTitle}>프로필 편집</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View>
          <Text style={styles.fieldLabel}>닉네임</Text>
          <TextInput
            value={draftNickname}
            onChangeText={setDraftNickname}
            placeholder="닉네임"
            placeholderTextColor={t.dim}
            maxLength={12}
            style={styles.createInput}
          />
          <Text style={{ fontSize: 12, color: t.muted, marginTop: 7 }}>
            {canChangeNickname
              ? "닉네임은 변경 후 30일 동안 다시 바꿀 수 없어요."
              : `${nextNicknameChangeDate ?? "다음 변경 가능일"}부터 닉네임을 다시 바꿀 수 있어요.`}
          </Text>
        </View>

        <View>
          <Text style={styles.fieldLabel}>동네</Text>
          <View style={[styles.profileCard, { marginTop: 8 }]}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: t.ink }}>
              {locationLabel || "동네 인증 전"}
            </Text>
            {!!locationError && (
              <Text style={{ fontSize: 12, color: t.rose, marginTop: 8 }}>
                {locationError}
              </Text>
            )}
            <Pressable
              disabled={locationLoading}
              onPress={onFindNeighborhood}
              style={[
                styles.reviewDemoButton,
                { marginTop: 14, opacity: locationLoading ? 0.6 : 1 },
              ]}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "700", color: t.chipInk }}
              >
                {locationLoading ? "동네 찾는 중..." : "동네 다시 찾기"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Pressable
          disabled={!canSave}
          style={[
            styles.footerButton,
            { backgroundColor: canSave ? t.pink : "#EDEAE3" },
          ]}
          onPress={() => onSave(draftNickname.trim())}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: canSave ? "#fff" : t.dim,
            }}
          >
            저장하기
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
