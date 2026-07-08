import { Pressable, ScrollView, Text, View } from "react-native";

import { EmptyState } from "../../../shared/ui/EmptyState";
import { styles } from "../../../shared/ui/appStyles";
import type { Deal } from "../../gonggu/types";
import { qtyStr } from "../../gonggu/utils";

export function ChatListScreen({
  rooms,
  meId,
  onOpen,
  onLeave,
}: {
  rooms: Deal[];
  meId: string;
  onOpen: (id: string) => void;
  onLeave: (deal: Deal) => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>채팅</Text>
      </View>
      {rooms.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="참여 중인 채팅이 없어요"
          desc={
            "공구에 참여하면 채팅방이 열려요.\n홈에서 마음에 드는 공구를 찾아보세요!"
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.roomList}>
          {rooms.map((room) => {
            const ended = ["review_required", "completed", "canceled"].includes(
              room.status,
            );
            const isHost = room.hostId === meId;
            return (
              <View key={room.id} style={styles.roomRow}>
                <Pressable
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                  onPress={() => onOpen(room.id)}
                >
                  <View
                    style={[styles.roomThumb, { backgroundColor: room.tint }]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomTitle} numberOfLines={1}>
                      {room.title}
                    </Text>
                    <Text style={styles.roomMeta} numberOfLines={1}>
                      {isHost ? "내 공구" : "참여 중"} ·{" "}
                      {ended ? "종료됨" : qtyStr(room)}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={styles.roomLeaveBtn}
                  onPress={() => onLeave(room)}
                >
                  <Text style={styles.roomLeaveText}>나가기</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
