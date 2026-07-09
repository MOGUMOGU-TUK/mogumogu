import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { t } from "../../../shared/theme/theme";

type Props = {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DateTimePickerModal({ visible, value, onConfirm, onCancel }: Props) {
  const [inputValue, setInputValue] = useState(() => toInputValue(value));

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.line }}>
            <Pressable onPress={onCancel} style={{ padding: 4 }}>
              <Text style={{ fontSize: 15, color: t.muted }}>취소</Text>
            </Pressable>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>날짜 및 시간 선택</Text>
            <Pressable
              onPress={() => {
                const parsed = new Date(inputValue);
                if (!isNaN(parsed.getTime())) onConfirm(parsed);
              }}
              style={{ padding: 4 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.rose }}>확인</Text>
            </Pressable>
          </View>
          <View style={{ padding: 24, alignItems: "center" }}>
            {/* @ts-ignore — HTML input is valid in web-only file */}
            <input
              type="datetime-local"
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
              style={{
                fontSize: 16,
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
