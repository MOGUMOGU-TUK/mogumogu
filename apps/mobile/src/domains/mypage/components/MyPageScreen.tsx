import { Pressable, ScrollView, Text, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { TemperatureGradientBar as GradientBar } from "../../../shared/ui/TemperatureGradientBar";
import { Toggle } from "../../../shared/ui/Toggle";
import { styles } from "../../../shared/ui/appStyles";
import { tempRatio } from "../../gonggu/utils";
import { NOTIF_ITEMS, type NotifKey } from "../../notifications/types";

export function MyPageScreen({
  nickname,
  locationLabel,
  completedDealCount,
  receivedReviewCount,
  noshowCount,
  notif,
  onToggle,
  onEditProfile,
  onOpenCompletedDeals,
  onReviewDemo,
}: {
  nickname: string;
  locationLabel: string;
  completedDealCount: number;
  receivedReviewCount: number;
  noshowCount: number;
  notif: Record<NotifKey, boolean>;
  onToggle: (key: NotifKey) => void;
  onEditProfile: () => void;
  onOpenCompletedDeals: () => void;
  onReviewDemo: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.myBody}>
      <Text style={styles.myTitle}>마이페이지</Text>

      <View style={styles.profileCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={styles.profileAvatar}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: t.rose }}>
              {nickname.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "800", color: t.ink }}>
                {nickname}
              </Text>
              <View style={styles.eduChip}>
                <Text
                  style={{ fontSize: 10, fontWeight: "700", color: t.greenInk }}
                >
                  🎓 학교인증
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{locationLabel}</Text>
          </View>
          <Pressable style={styles.editButton} onPress={onEditProfile}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.chipInk }}>
              편집
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 18 }}>
          <View style={[styles.rowBetween, { marginBottom: 7 }]}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: t.ink }}>
              매너온도
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.rose }}>
              37.4°C
            </Text>
          </View>
          <GradientBar ratio={tempRatio(37.4)} knobColor={t.rose} />
          <Text style={{ fontSize: 11, color: t.muted, marginTop: 6 }}>
            첫 온도 36.5°C에서 0.9°C 올랐어요
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <StatCard
          value={String(completedDealCount)}
          label="거래 완료"
          onPress={onOpenCompletedDeals}
        />
        <StatCard value={String(receivedReviewCount)} label="받은 후기" />
        <StatCard value={String(noshowCount)} label="노쇼" valueColor={t.greenInk} />
      </View>

      <Text style={styles.mySection}>이웃이 남긴 후기</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <ReviewTag emoji="⏱️" text="시간 약속을 잘 지켜요" count={5} />
        <ReviewTag emoji="⚖️" text="소분이 공정해요" count={4} />
        <ReviewTag emoji="💬" text="친절하고 매너있어요" count={4} />
      </View>

      <Text style={styles.mySection}>알림 설정</Text>
      <View style={styles.notifCard}>
        {NOTIF_ITEMS.map((item, i) => (
          <View
            key={item.key}
            style={[
              styles.notifRow,
              i < NOTIF_ITEMS.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: t.line,
              },
            ]}
          >
            <Text style={{ fontSize: 14, color: t.ink }}>{item.label}</Text>
            <Toggle on={notif[item.key]} onPress={() => onToggle(item.key)} />
          </View>
        ))}
      </View>

      <Pressable style={styles.reviewDemoButton} onPress={onReviewDemo}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.chipInk }}>
          최근 거래 후기 작성하기 →
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function StatCard({
  value,
  label,
  valueColor,
  onPress,
}: {
  value: string;
  label: string;
  valueColor?: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.statCard} onPress={onPress}>
      <Text
        style={{ fontSize: 20, fontWeight: "800", color: valueColor ?? t.ink }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
        {label}
      </Text>
    </Wrapper>
  );
}

function ReviewTag({
  emoji,
  text,
  count,
}: {
  emoji: string;
  text: string;
  count: number;
}) {
  return (
    <View style={styles.reviewTag}>
      <Text style={{ fontSize: 13, color: t.inkSoft }}>
        {emoji} {text}{" "}
        <Text style={{ color: t.rose, fontWeight: "700" }}>{count}</Text>
      </Text>
    </View>
  );
}
