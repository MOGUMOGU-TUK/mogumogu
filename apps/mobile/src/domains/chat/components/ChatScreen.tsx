import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { SendArrowIcon } from "../../../shared/ui/icons";
import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shell/appStyles";
import type { Deal } from "../../gonggu/types";
import { memberStr, statusOf } from "../../gonggu/utils";
import type { ChatMsg } from "../types";

export function ChatScreen({
  deal,
  messages,
  onBack,
  onSend,
  onLeave,
}: {
  deal: Deal;
  messages: ChatMsg[];
  onBack: () => void;
  onSend: (text: string) => void;
  onLeave: () => void;
}) {
  const [input, setInput] = useState("");

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
        <Pressable style={styles.chatLeaveBtn} onPress={onLeave}>
          <Text style={styles.chatLeaveText}>나가기</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.chatBody}
        contentContainerStyle={{ padding: 14, gap: 10 }}
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
                    flexDirection: isMe ? "row" : "row-reverse",
                    alignItems: "flex-end",
                    gap: 6,
                  }}
                >
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
                  {!!m.time && <Text style={styles.msgTime}>{m.time}</Text>}
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
