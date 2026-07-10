import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shared/ui/appStyles";
import type { Deal } from "../types";
import { fmt, unitPrice } from "../utils";

type JoinSheetProps = {
  deal: Deal;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
};

export function JoinSheet({ deal, onClose, onConfirm }: JoinSheetProps) {
  const insets = useSafeAreaInsets();
  const remaining = Math.max(0, deal.max - deal.cur);
  const [qty, setQty] = useState(remaining > 0 ? 1 : 0);
  const price = unitPrice(deal);
  const canJoin = remaining > 0 && qty > 0;

  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 26) }]} onPress={() => {}}>
        <View style={styles.sheetGrabber} />
        <Text style={{ fontSize: 19, fontWeight: "800", color: t.ink }}>
          이 공구에 참여할까요?
        </Text>
        <Text style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>
          {deal.title}
        </Text>

        <View style={styles.sheetSummary}>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 14, color: t.chipInk }}>
              총 가격 · 총 수량
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: t.ink }}>
              {fmt(deal.total)} · {deal.max}{deal.qtyUnit}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={{ fontSize: 14, color: t.chipInk }}>1{deal.qtyUnit}당 가격</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: t.ink }}>
              {fmt(price)}
            </Text>
          </View>

          <View style={styles.sheetDivider} />

          <View style={[styles.rowBetween, { alignItems: "center" }]}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>
                참여 수량
              </Text>
              <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                남은 수량 {remaining}{deal.qtyUnit}
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                disabled={!canJoin || qty <= 1}
              >
                <Text style={styles.stepperSign}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{qty}</Text>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => setQty((q) => Math.min(remaining, q + 1))}
                disabled={!canJoin || qty >= remaining}
              >
                <Text style={styles.stepperSign}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sheetDivider} />

          <View style={[styles.rowBetween, { alignItems: "center" }]}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>
              내 부담금
            </Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: t.rose }}>
              {fmt(price * qty)}
            </Text>
          </View>
        </View>

        <View style={styles.sheetNote}>
          <Text style={{ fontSize: 12, color: t.roseInk, lineHeight: 18 }}>
            📍 {deal.spot}에서 {deal.pickup}에 픽업해요. 참여 확정 후 채팅방에
            자동 입장합니다.
          </Text>
        </View>

        <Pressable
          style={[
            styles.pillButton,
            { backgroundColor: canJoin ? t.pink : t.trackOff, marginTop: 16 },
          ]}
          onPress={() => canJoin && onConfirm(qty)}
          disabled={!canJoin}
        >
          <Text style={[styles.pillButtonText, { color: "#fff" }]}>
            {canJoin ? `${qty}${deal.qtyUnit} 참여 확정하기` : "모집이 완료되었어요"}
          </Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}
