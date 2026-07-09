import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { SendArrowIcon } from "../../../shared/ui/icons";
import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shared/ui/appStyles";
import type { Deal } from "../../gonggu/types";
import { memberStr, statusOf } from "../../gonggu/utils";
import type { ChatMsg } from "../types";

export function ChatScreen({
  deal,
  messages,
  isHost,
  onBack,
  onSend,
  onLeave,
  onComplete,
  onOpenDetail,
  onReport,
}: {
  deal: Deal;
  messages: ChatMsg[];
  isHost: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
  onLeave: () => void;
  onComplete: () => void;
  onOpenDetail: () => void;
  onReport: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  function submit() {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  }

  return (
    <View style={styles.flex}>
      <View style={styles.chatHeader}>
        <Pressable onPress={onBack} style={{ padding: 4 }}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Pressable
          onPress={onOpenDetail}
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 11 }}
        >
          <View
            style={[styles.chatHeaderThumb, { backgroundColor: deal.tint }]}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: t.ink }}
              numberOfLines={1}
            >
              {deal.title}
            </Text>
            <Text style={{ fontSize: 12, color: t.muted }}>
              {memberStr(deal)} · {statusOf(deal)}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={onReport} style={{ padding: 4 }}>
          <Text style={{ fontSize: 12, color: t.muted }}>신고</Text>
        </Pressable>
        {isHost && !["review_required", "completed", "canceled"].includes(deal.status) ? (
          <Pressable style={styles.chatLeaveBtn} onPress={onComplete}>
            <Text style={[styles.chatLeaveText, { color: t.rose, fontWeight: "700" }]}>거래완료</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.chatLeaveBtn} onPress={onLeave}>
            <Text style={styles.chatLeaveText}>나가기</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatBody}
        contentContainerStyle={{ padding: 14, gap: 10 }}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: false })
        }
      >
        {messages.map((m, i) => {
          if (m.type === "system") {
            return (
              <View key={i} style={{ alignItems: "center" }}>
                <Text style={styles.systemMsg}>{m.text}</Text>
              </View>
            );
          }
          const isMe = m.type === "me";
          return (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: isMe ? "flex-end" : "flex-start",
              }}
            >
              <View style={{ maxWidth: "74%" }}>
                {!isMe && <Text style={styles.msgName}>{m.name}</Text>}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 4,
                  }}
                >
                  {isMe && !!m.time && (
                    <Text style={styles.msgTime}>{m.time}</Text>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isMe ? styles.bubbleMe : styles.bubbleOther,
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        color: isMe ? "#fff" : t.ink,
                      }}
                    >
                      {m.text}
                    </Text>
                  </View>
                  {!isMe && !!m.time && (
                    <Text style={styles.msgTime}>{m.time}</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.composer}>
        <View style={styles.composerInputWrap}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="메시지 보내기"
            placeholderTextColor={t.dim}
            style={styles.composerInput}
            onSubmitEditing={submit}
            returnKeyType="send"
          />
        </View>
        <Pressable style={styles.sendButton} onPress={submit}>
          <SendArrowIcon size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
