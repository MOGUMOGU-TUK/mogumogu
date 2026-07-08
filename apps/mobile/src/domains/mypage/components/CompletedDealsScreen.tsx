import { Pressable, ScrollView, Text, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { styles } from "../../../shared/ui/appStyles";
import type { Deal } from "../../gonggu/types";
import { fmt, qtyStr, unitPrice } from "../../gonggu/utils";

export function CompletedDealsScreen({
  deals,
  meId,
  title = "완료된 거래",
  emptyTitle = "완료된 거래가 없어요",
  emptyDesc = "거래가 완료되면 이곳에서 다시 확인할 수 있어요.",
  onBack,
  onSelect,
}: {
  deals: Deal[];
  meId: string;
  title?: string;
  emptyTitle?: string;
  emptyDesc?: string;
  onBack: () => void;
  onSelect?: (deal: Deal) => void;
}) {
  const visibleDeals = onSelect
    ? deals.filter((deal) => deal.hostId !== meId)
    : deals;

  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.simpleHeaderTitle}>{title}</Text>
      </View>

      {visibleDeals.length === 0 ? (
        <EmptyState
          emoji="✓"
          title={emptyTitle}
          desc={emptyDesc}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {visibleDeals.map((deal) => {
            const isHost = deal.hostId === meId;
            const Wrapper = onSelect ? Pressable : View;
            return (
              <Wrapper
                key={deal.id}
                style={styles.dealCard}
                onPress={onSelect ? () => onSelect(deal) : undefined}
              >
                <View style={[styles.dealThumb, { backgroundColor: deal.tint }]}>
                  <View style={styles.thumbTag}>
                    <Text style={styles.thumbTagText}>{deal.cat}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: t.greenInk,
                      }}
                    >
                      거래 완료
                    </Text>
                    <Text style={{ fontSize: 11, color: t.dim }}>
                      {isHost ? "공구장" : "참여자"}
                    </Text>
                  </View>
                  <Text style={styles.dealTitle} numberOfLines={1}>
                    {deal.title}
                  </Text>
                  <Text style={styles.dealStore} numberOfLines={1}>
                    {deal.store} · {deal.spot}
                  </Text>
                  <View style={[styles.rowBetween, { marginTop: 6 }]}>
                    <Text style={styles.dealPrice}>
                      1개당 {fmt(unitPrice(deal))}
                    </Text>
                    <Text style={styles.dealMeta}>
                      {onSelect ? "후기 작성하기" : qtyStr(deal)}
                    </Text>
                  </View>
                </View>
              </Wrapper>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
