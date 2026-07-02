import { Pressable, ScrollView, Text, View } from "react-native";

import { BellIcon } from "../../../shared/ui/icons";
import { t } from "../../../shared/theme/theme";
import { relativeTime } from "../../../shared/utils/time";
import { styles } from "../../../shell/appStyles";
import type { Deal } from "../../gonggu/types";
import { TYPE_LABEL, type NotifItem } from "../types";

export function NotifScreen({
  items,
  deals,
  onBack,
  onOpen,
  onClear,
}: {
  items: NotifItem[];
  deals: Deal[];
  onBack: () => void;
  onOpen: (gongguId: string, notifId: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.homeHeader}>
        <Pressable onPress={onBack} style={{ padding: 4, marginLeft: -4 }}>
          <Text style={{ fontSize: 20, color: t.ink, fontWeight: "300" }}>
            ‹
          </Text>
        </Pressable>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "800",
            color: t.ink,
            flex: 1,
            textAlign: "center",
          }}
        >
          알림
        </Text>
        {items.length > 0 ? (
          <Pressable onPress={onClear}>
            <Text style={{ fontSize: 13, color: t.muted }}>모두 지우기</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {items.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <BellIcon size={40} color={t.dim} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.dim }}>
            알림이 없어요
          </Text>
          <Text style={{ fontSize: 13, color: t.muted }}>
            공구 참여·채팅 알림이 여기에 표시돼요
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 32,
            gap: 8,
          }}
        >
          {items.map((item) => {
            const deal = item.gongguId
              ? deals.find((d) => d.id === item.gongguId)
              : null;
            const typeLabel = item.type ? (TYPE_LABEL[item.type] ?? "") : "";
            return (
              <Pressable
                key={item.id}
                onPress={() => item.gongguId && onOpen(item.gongguId, item.id)}
                style={[
                  styles.notifItemCard,
                  !item.read && { borderWidth: 2, borderColor: t.pink },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <View style={styles.notifIconWrap}>
                    <BellIcon size={16} color={t.rose} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      {!!typeLabel && (
                        <View style={styles.notifTypeBadge}>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: t.rose,
                            }}
                          >
                            {typeLabel}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 11, color: t.muted }}>
                        {relativeTime(item.receivedAt)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: t.ink,
                        marginBottom: 2,
                      }}
                    >
                      {item.title}
                    </Text>
                    {!!item.body && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: t.inkSoft,
                          lineHeight: 18,
                        }}
                        numberOfLines={2}
                      >
                        {item.body}
                      </Text>
                    )}
                    {deal && (
                      <Text
                        style={{ fontSize: 12, color: t.muted, marginTop: 4 }}
                      >
                        {deal.title} · {deal.spot}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
