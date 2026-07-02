import { Pressable, ScrollView, Text, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shell/appStyles";
import type { Deal } from "../types";
import {
  barPct,
  fmt,
  memberStr,
  qtyStr,
  remain,
  tempColor,
  tempRatio,
  tempStr,
  unitPrice,
} from "../utils";
import { ProgressBar } from "./ProgressBar";
import { TemperatureGradientBar } from "./TemperatureGradientBar";

type DetailScreenProps = {
  deal: Deal;
  hearted: boolean;
  joined: boolean;
  isHost: boolean;
  onBack: () => void;
  onHeart: () => void;
  onDelete: () => void;
  onCta: () => void;
};

export function DetailScreen({
  deal,
  hearted,
  joined,
  isHost,
  onBack,
  onHeart,
  onDelete,
  onCta,
}: DetailScreenProps) {
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={{ paddingBottom: 12 }} stickyHeaderIndices={[]}>
        <View style={[styles.detailHero, { backgroundColor: deal.tint }]}>
          <Pressable style={styles.detailBack} onPress={onBack}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          {isHost && (
            <Pressable style={styles.detailDelete} onPress={onDelete}>
              <Text style={styles.detailDeleteText}>삭제</Text>
            </Pressable>
          )}
          <Text style={styles.detailHeroLabel}>[ 상품 사진 ]</Text>
        </View>

        <View style={styles.detailSheet}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.tagPill, { backgroundColor: t.roseSoft }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: t.rose }}>
                {deal.cat}
              </Text>
            </View>
            <View
              style={[
                styles.tagPill,
                { backgroundColor: deal.urgent ? t.urgentBg : t.calmBg },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: deal.urgent ? t.urgentInk : t.chipInk,
                }}
              >
                {deal.deadline}
              </Text>
            </View>
          </View>

          <Text style={styles.detailTitle}>{deal.title}</Text>
          <Text style={styles.dealStore}>
            {deal.store} · {deal.dist}
          </Text>

          <View style={styles.priceCard}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <View>
                <Text style={styles.fieldHint}>1개당 가격</Text>
                <Text style={styles.priceBig}>{fmt(unitPrice(deal))}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.fieldHint}>총 {fmt(deal.total)}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: t.ink,
                    marginTop: 2,
                  }}
                >
                  {qtyStr(deal)} 확보 · {memberStr(deal)}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 13 }}>
              <ProgressBar pct={barPct(deal)} />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: t.chipInk,
                marginTop: 7,
              }}
            >
              {remain(deal)} 남았어요!
            </Text>
          </View>

          <View style={styles.infoCard}>
            <InfoRow label="소분 방법" value={deal.method} divider />
            <InfoRow label="픽업 장소" value={deal.spot} divider />
            <InfoRow label="픽업 시간" value={deal.pickup} />
          </View>

          <Text style={styles.detailDesc}>{deal.desc}</Text>

          <View style={styles.trustCard}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: t.ink,
                marginBottom: 12,
              }}
            >
              공구장 신뢰도
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.leaderAvatar, { backgroundColor: deal.tint }]}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: "rgba(0,0,0,0.4)",
                  }}
                >
                  {deal.leader.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: t.ink }}>
                  {deal.leader}
                </Text>
                <Text style={{ fontSize: 12, color: t.muted, marginTop: 1 }}>
                  거래 {deal.deals}회 · 후기 {deal.reviews}개 · 노쇼 {deal.noshow}회
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "800",
                    color: tempColor(deal.temp),
                  }}
                >
                  {tempStr(deal.temp)}
                </Text>
                <Text style={{ fontSize: 11, color: t.muted }}>매너온도</Text>
              </View>
            </View>
            <View style={{ marginTop: 12 }}>
              <TemperatureGradientBar
                ratio={tempRatio(deal.temp)}
                knobColor={tempColor(deal.temp)}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <Pressable style={styles.heartButton} onPress={onHeart}>
          <Text style={{ fontSize: 22, color: hearted ? t.rose : t.muted }}>
            {hearted ? "♥" : "♡"}
          </Text>
        </Pressable>
        <Pressable style={styles.ctaButton} onPress={onCta}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
            {joined ? "채팅방 입장하기" : "참여하기"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.infoRow, divider && styles.infoRowDivider]}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  );
}
