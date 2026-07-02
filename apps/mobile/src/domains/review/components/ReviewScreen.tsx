import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shell/appStyles";
import type { Deal } from "../../gonggu/types";
import type { ReviewKey } from "../types";

const REVIEW_QUESTIONS: Array<{ key: ReviewKey; label: string }> = [
  { key: "time", label: "시간 약속을 잘 지켰나요?" },
  { key: "fair", label: "소분이 공정했나요?" },
  { key: "manner", label: "소통이 매너있었나요?" },
  { key: "desc", label: "상품 설명과 일치했나요?" },
];

export function ReviewScreen({
  deal,
  ratings,
  onRate,
  onBack,
  onSubmit,
}: {
  deal: Deal;
  ratings: Record<ReviewKey, number>;
  onRate: (key: ReviewKey, value: number) => void;
  onBack: () => void;
  onSubmit: (comment: string) => void | Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const done = REVIEW_QUESTIONS.every((q) => ratings[q.key] > 0);

  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.simpleHeaderTitle}>후기 작성</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 10 }}>
        <View
          style={{
            alignItems: "center",
            paddingVertical: 14,
            paddingBottom: 20,
          }}
        >
          <View style={[styles.reviewAvatar, { backgroundColor: deal.tint }]}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: "rgba(0,0,0,0.4)",
              }}
            >
              {deal.leader.charAt(0)}
            </Text>
          </View>
          <Text style={styles.reviewHeadline}>
            {deal.leader}님과의 거래는{"\n"}어떠셨나요?
          </Text>
          <Text style={{ fontSize: 13, color: t.muted, marginTop: 6 }}>
            {deal.title}
          </Text>
        </View>

        <View style={{ gap: 18 }}>
          {REVIEW_QUESTIONS.map((q) => (
            <View key={q.key}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: t.ink,
                  marginBottom: 10,
                }}
              >
                {q.label}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => onRate(q.key, v)}
                    style={{ padding: 2 }}
                  >
                    <Text
                      style={{
                        fontSize: 32,
                        color: v <= ratings[q.key] ? t.rose : t.trackOff,
                      }}
                    >
                      {v <= ratings[q.key] ? "★" : "☆"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.fieldLabel}>한 줄 후기 (선택)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="거래 경험을 짧게 남겨주세요"
            placeholderTextColor={t.dim}
            style={[styles.createInput, { marginTop: 8 }]}
          />
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Pressable
          disabled={!done}
          style={[
            styles.footerButton,
            { backgroundColor: done ? t.pink : "#EDEAE3" },
          ]}
          onPress={() => void onSubmit(comment)}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: done ? "#fff" : t.dim,
            }}
          >
            후기 제출하기
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
