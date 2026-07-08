import { Pressable, Text, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shared/ui/appStyles";
import type { Deal } from "../types";
import { barPct, fmt, qtyStr, remain, unitPrice } from "../utils";
import { ProgressBar } from "../../../shared/ui/ProgressBar";

export function DealCard({ deal, onPress }: { deal: Deal; onPress: () => void }) {
  return (
    <Pressable style={styles.dealCard} onPress={onPress}>
      <View style={[styles.dealThumb, { backgroundColor: deal.tint }]}>
        <View style={styles.thumbTag}>
          <Text style={styles.thumbTagText}>{deal.cat}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <View
          style={[
            styles.deadlinePill,
            { alignSelf: "flex-start", backgroundColor: deal.urgent ? t.urgentBg : t.calmBg },
          ]}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: deal.urgent ? t.urgentInk : t.chipInk,
            }}
          >
            {deal.deadline}
          </Text>
        </View>
        <Text style={styles.dealTitle} numberOfLines={1}>
          {deal.title}
        </Text>
        <Text style={styles.dealStore}>{deal.store}</Text>
        <View style={{ marginTop: 6 }}>
          <View style={[styles.rowBetween, { marginBottom: 5 }]}>
            <Text style={styles.dealPrice}>1개당 {fmt(unitPrice(deal))}</Text>
            <Text style={styles.dealMeta}>
              {qtyStr(deal)} · {remain(deal)}
            </Text>
          </View>
          <ProgressBar pct={barPct(deal)} />
        </View>
      </View>
    </Pressable>
  );
}
