import { Pressable, ScrollView, Text, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { styles } from "../../../shared/ui/appStyles";
import type { Deal } from "../../gonggu/types";
import { fmt, qtyStr, unitPrice } from "../../gonggu/utils";

export function LikedDealsScreen({
  deals,
  onBack,
  onOpen,
}: {
  deals: Deal[];
  onBack: () => void;
  onOpen: (deal: Deal) => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.simpleHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.simpleHeaderTitle}>찜한 공구</Text>
      </View>

      {deals.length === 0 ? (
        <EmptyState
          emoji="♥"
          emojiColor={t.rose}
          title="찜한 공구가 없어요"
          desc="마음에 드는 공구에 하트를 눌러보세요"
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {deals.map((deal) => (
            <Pressable
              key={deal.id}
              style={styles.dealCard}
              onPress={() => onOpen(deal)}
            >
              <View style={[styles.dealThumb, { backgroundColor: deal.tint }]}>
                <View style={styles.thumbTag}>
                  <Text style={styles.thumbTagText}>{deal.cat}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: t.rose }}>
                  모집중
                </Text>
                <Text style={styles.dealTitle} numberOfLines={1}>
                  {deal.title}
                </Text>
                <Text style={styles.dealStore} numberOfLines={1}>
                  {deal.store} · {deal.spot}
                </Text>
                <View style={[styles.rowBetween, { marginTop: 6 }]}>
                  <Text style={styles.dealPrice}>
                    1{deal.qtyUnit}당 {fmt(unitPrice(deal))}
                  </Text>
                  <Text style={styles.dealMeta}>{qtyStr(deal)}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
