import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shared/ui/appStyles";
import type { ReportCategory, ReportTargetRole } from "../../../types/domain";

export type ReportableMember = {
  id: string;
  nickname: string;
  role: ReportTargetRole;
};

const CATEGORY_OPTIONS: { value: ReportCategory; label: string }[] = [
  { value: "noshow", label: "노쇼" },
  { value: "manner", label: "비매너/욕설" },
  { value: "fraud", label: "사기 의심" },
  { value: "other", label: "기타" },
];

export function ReportSheet({
  members,
  onClose,
  onSubmit,
}: {
  members: ReportableMember[];
  onClose: () => void;
  onSubmit: (payload: {
    targetUserId: string;
    targetRole: ReportTargetRole;
    category: ReportCategory;
    detail: string;
  }) => void;
}) {
  const insets = useSafeAreaInsets();
  const [targetUserId, setTargetUserId] = useState<string | null>(
    members.length === 1 ? members[0]!.id : null,
  );
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [detail, setDetail] = useState("");

  const targetMember = members.find((m) => m.id === targetUserId) ?? null;
  const canSubmit = !!targetMember && !!category && detail.trim().length > 0;

  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 26) }]}
        onPress={() => {}}
      >
        <View style={styles.sheetGrabber} />
        <Text style={{ fontSize: 19, fontWeight: "800", color: t.ink }}>
          신고하기
        </Text>
        <Text style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>
          신고 내용은 운영팀이 검토해요.
        </Text>

        <View style={{ marginTop: 18 }}>
          <Text style={styles.fieldLabel}>신고 대상</Text>
          {members.length === 0 ? (
            <Text style={{ fontSize: 13, color: t.muted, marginTop: 9 }}>
              신고할 수 있는 사람이 없어요.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginTop: 9 }}
            >
              {members.map((m) => {
                const active = m.id === targetUserId;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setTargetUserId(m.id)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? t.roseSoft : "#fff",
                        borderColor: active ? t.rose : t.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: active ? t.rose : t.chipInk,
                      }}
                    >
                      {m.nickname} · {m.role === "host" ? "방장" : "참여자"}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={styles.fieldLabel}>신고 사유</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
            {CATEGORY_OPTIONS.map((opt) => {
              const active = opt.value === category;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setCategory(opt.value)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? t.roseSoft : "#fff",
                      borderColor: active ? t.rose : t.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: active ? t.rose : t.chipInk,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={styles.fieldLabel}>상세 내용</Text>
          <TextInput
            value={detail}
            onChangeText={setDetail}
            placeholder="무슨 일이 있었는지 알려주세요"
            placeholderTextColor={t.dim}
            style={styles.reportTextarea}
            multiline
          />
        </View>

        <Pressable
          style={[
            styles.pillButton,
            { backgroundColor: canSubmit ? t.rose : t.trackOff, marginTop: 20 },
          ]}
          onPress={() =>
            canSubmit &&
            onSubmit({
              targetUserId: targetMember!.id,
              targetRole: targetMember!.role,
              category: category!,
              detail: detail.trim(),
            })
          }
          disabled={!canSubmit}
        >
          <Text style={[styles.pillButtonText, { color: "#fff" }]}>
            신고하기
          </Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}
