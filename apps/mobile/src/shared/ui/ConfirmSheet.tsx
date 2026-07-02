import { Pressable, Text, View } from "react-native";

import { t } from "../theme/theme";
import { styles } from "../../shell/appStyles";

export type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};

export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.sheetGrabber} />
        <Text style={{ fontSize: 19, fontWeight: "800", color: t.ink }}>
          {title}
        </Text>
        <Text
          style={{ fontSize: 14, color: t.muted, marginTop: 8, lineHeight: 20 }}
        >
          {message}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          <Pressable
            style={[styles.pillButton, styles.confirmCancel]}
            onPress={onClose}
          >
            <Text style={[styles.pillButtonText, { color: t.ink }]}>취소</Text>
          </Pressable>
          <Pressable
            style={[
              styles.pillButton,
              { flex: 1, backgroundColor: danger ? t.rose : t.pink },
            ]}
            onPress={onConfirm}
          >
            <Text style={[styles.pillButtonText, { color: "#fff" }]}>
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}
