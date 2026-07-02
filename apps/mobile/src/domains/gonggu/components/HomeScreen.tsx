import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { t } from "../../../shared/theme/theme";
import { styles } from "../../../shell/appStyles";
import { HOME_FILTERS, type Deal } from "../types";
import { DealCard } from "./DealCard";

type HomeScreenProps = {
  deals: Deal[];
  locationLabel: string;
  isLocationVerified: boolean;
  filter: string;
  onFilter: (filter: string) => void;
  onOpen: (id: string) => void;
  hasUnread: boolean;
  onBell: () => void;
};

export function HomeScreen({
  deals,
  locationLabel,
  isLocationVerified,
  filter,
  onFilter,
  onOpen,
  hasUnread,
  onBell,
}: HomeScreenProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searching = searchOpen && q.length > 0;
  const visible = deals.filter(
    (deal) =>
      (filter === "전체" || deal.cat === filter) &&
      (q === "" || deal.title.toLowerCase().includes(q))
  );
  const headerLocation = isLocationVerified ? `📍 ${locationLabel}` : locationLabel;

  return (
    <View style={styles.flex}>
      <View style={styles.homeHeader}>
        <Pressable style={styles.locButton}>
          <Text style={styles.locText}>{headerLocation}</Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <Pressable
            onPress={() =>
              setSearchOpen((open) => {
                if (open) setQuery("");
                return !open;
              })
            }
          >
            <SearchIcon size={20} color={searchOpen ? t.rose : t.ink} />
          </Pressable>
          <View>
            <Pressable onPress={onBell}>
              <BellIcon size={20} color={t.ink} />
            </Pressable>
            {hasUnread && <View style={styles.bellDot} />}
          </View>
        </View>
      </View>

      {searchOpen && (
        <View style={styles.searchBar}>
          <SearchIcon size={16} color={t.dim} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="제목 검색"
            placeholderTextColor={t.dim}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Text style={styles.searchClear}>×</Text>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        {HOME_FILTERS.map((label) => {
          const active = label === filter;
          return (
            <Pressable
              key={label}
              onPress={() => onFilter(label)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? t.ink : "#fff",
                  borderColor: active ? t.ink : t.border,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: active ? "#fff" : t.chipInk,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {visible.length === 0 ? (
        searching ? (
          <EmptyState
            emoji="🔎"
            title={`'${query.trim()}' 검색 결과가 없어요`}
            desc="다른 키워드로 검색해보세요"
          />
        ) : (
          <EmptyState
            emoji="🧺"
            title={
              filter === "전체"
                ? "진행 중인 공구가 없어요"
                : `'${filter}' 공구가 없어요`
            }
            desc={
              filter === "전체"
                ? "우리 동네에 아직 열린 공구가 없어요.\n첫 공구를 만들어보세요!"
                : "다른 카테고리를 둘러보거나 새 공구를 열어보세요."
            }
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.dealList}>
          {visible.map((deal) => (
            <DealCard key={deal.id} deal={deal} onPress={() => onOpen(deal.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function EmptyState({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc?: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!desc && <Text style={styles.emptyDesc}>{desc}</Text>}
    </View>
  );
}

function SearchIcon({
  size = 20,
  color = t.ink,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  return (
    <View
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        borderWidth: 2,
        borderColor: color,
      }}
    >
      <View
        style={{
          position: "absolute",
          right: -s * 0.2,
          bottom: -s * 0.2,
          width: s * 0.42,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}

function BellIcon({
  size = 20,
  color = t.ink,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  return (
    <View style={{ width: s, height: s }}>
      <View
        style={{
          position: "absolute",
          top: s * 0.18,
          left: s * 0.22,
          width: s * 0.56,
          height: s * 0.58,
          borderWidth: 2,
          borderColor: color,
          borderTopLeftRadius: s * 0.28,
          borderTopRightRadius: s * 0.28,
          borderBottomWidth: 0,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: s * 0.14,
          bottom: s * 0.18,
          width: s * 0.72,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: s * 0.42,
          bottom: s * 0.04,
          width: s * 0.16,
          height: s * 0.16,
          borderRadius: s * 0.08,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
