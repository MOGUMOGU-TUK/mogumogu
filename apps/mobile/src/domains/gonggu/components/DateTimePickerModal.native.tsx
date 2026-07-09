import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { t } from "../../../shared/theme/theme";

type Props = {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

export function DateTimePickerModal({ visible, value, onConfirm, onCancel }: Props) {
  const [tempDate, setTempDate] = useState(value);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === "dismissed" || !selected) { onCancel(); return; }
    if (pickerMode === "date") {
      setTempDate(selected);
      setPickerMode("time");
    } else {
      const combined = new Date(tempDate);
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setPickerMode("date");
      onConfirm(combined);
    }
  }

  if (!visible) return null;

  if (Platform.OS === "android") {
    return (
      <DateTimePicker
        value={pickerMode === "date" ? value : tempDate}
        mode={pickerMode}
        display="default"
        onChange={handleAndroidChange}
        locale="ko-KR"
      />
    );
  }

  // iOS
  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.line }}>
            <Pressable onPress={onCancel} style={{ padding: 4 }}>
              <Text style={{ fontSize: 15, color: t.muted }}>취소</Text>
            </Pressable>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>날짜 및 시간 선택</Text>
            <Pressable onPress={() => onConfirm(tempDate)} style={{ padding: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.rose }}>확인</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={tempDate}
            mode="datetime"
            display="spinner"
            onChange={(_, d) => { if (d) setTempDate(d); }}
            locale="ko-KR"
            style={{ height: 200 }}
          />
        </View>
      </View>
    </Modal>
  );
}
