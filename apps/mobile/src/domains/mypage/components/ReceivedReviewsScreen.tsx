import { Pressable, ScrollView, Text, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { styles } from "../../../shared/ui/appStyles";
import type { Review } from "../../../types/domain";
import type { Deal } from "../../gonggu/types";

export function ReceivedReviewsScreen({
  reviews,
  deals,
  onBack,
}: {
  reviews: Review[];
  deals: Deal[];
  onBack: () => void;
}) {
  const dealById = new Map(deals.map((deal) => [deal.id, deal]));

  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.simpleHeaderTitle}>받은 후기</Text>
      </View>

      {reviews.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="아직 받은 후기가 없어요"
          desc="거래가 끝나고 이웃이 후기를 남기면 이곳에서 볼 수 있어요."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {reviews.map((review) => {
            const deal = dealById.get(review.gongguId);
            return (
              <View
                key={review.id}
                style={styles.receivedReviewCard}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.receivedReviewStars}>
                    {"★".repeat(Math.max(0, Math.min(5, Math.round(review.rating))))}
                  </Text>
                  <Text style={{ fontSize: 11, color: t.dim }}>
                    {formatReviewDate(review.createdAt)}
                  </Text>
                </View>

                <Text style={styles.receivedReviewTitle} numberOfLines={1}>
                  {deal?.title ?? "공구 정보 없음"}
                </Text>

                {review.tags.length > 0 && (
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {review.tags.map((tag) => (
                      <View key={tag} style={styles.receivedReviewTag}>
                        <Text style={{ fontSize: 12, color: t.inkSoft }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {!!review.comment.trim() && (
                  <Text style={styles.receivedReviewComment}>
                    {review.comment.trim()}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function formatReviewDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}
