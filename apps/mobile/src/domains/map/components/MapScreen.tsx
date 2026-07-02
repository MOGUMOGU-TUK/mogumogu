import { Pressable, Text, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shell/appStyles";
import type { Deal } from "../../gonggu/types";
import { fmt, qtyStr, unitPrice } from "../../gonggu/utils";
import { mapPos } from "../utils";

export function MapScreen({
  deals,
  locationLabel,
  mapSel,
  pick,
  onPickMarker,
  onList,
  onOpen,
}: {
  deals: Deal[];
  locationLabel: string;
  mapSel: string;
  pick: Deal | null;
  onPickMarker: (id: string) => void;
  onList: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={styles.mapWrap}>
      {/* faux roads / blocks */}
      <View
        style={[
          styles.mapRoad,
          { top: "18%", transform: [{ rotate: "-14deg" }] },
        ]}
      />
      <View
        style={[
          styles.mapRoad,
          { top: "62%", height: 38, transform: [{ rotate: "8deg" }] },
        ]}
      />
      <View style={styles.mapBlockA} />
      <View style={styles.mapBlockB} />

      {/* you marker */}
      <View style={styles.youOuter}>
        <View style={styles.youDot} />
      </View>

      {deals.map((d) => {
        const on = d.id === mapSel;
        const pos = mapPos(d.id);
        return (
          <Pressable
            key={d.id}
            onPress={() => onPickMarker(d.id)}
            style={[
              styles.mapMarker,
              {
                left: pos.left as any,
                top: pos.top as any,
                backgroundColor: on ? t.pink : "#fff",
              },
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: on ? "#fff" : t.ink,
              }}
            >
              {fmt(unitPrice(d))}
            </Text>
          </Pressable>
        );
      })}

      {/* top bar */}
      <View style={styles.mapTopBar}>
        <View style={styles.mapPill}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }}>{locationLabel} · 반경 1km</Text>
        </View>
        <Pressable style={styles.mapPill} onPress={onList}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.rose }}>
            ☰ 리스트
          </Text>
        </Pressable>
      </View>

      {/* bottom sheet */}
      {pick && (
        <View style={styles.mapSheet}>
          <Pressable style={{ flexDirection: "row", gap: 12 }} onPress={onOpen}>
            <View
              style={[styles.mapSheetThumb, { backgroundColor: pick.tint }]}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: pick.urgent ? t.urgentInk : t.chipInk,
                }}
              >
                {pick.deadline}
              </Text>
              <Text style={styles.mapSheetTitle} numberOfLines={1}>
                {pick.title}
              </Text>
              <Text style={styles.dealStore}>
                {pick.spot} · {qtyStr(pick)}
              </Text>
              <Text style={[styles.dealPrice, { marginTop: 3 }]}>
                1개당 {fmt(unitPrice(pick))}
              </Text>
            </View>
          </Pressable>
          <Pressable style={styles.mapSheetButton} onPress={onOpen}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
              자세히 보기
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
