import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../../shared/theme/theme";
import {
  ChatBubbleIcon,
  HomeIcon,
  MapPinIcon,
  PersonIcon,
} from "../../shared/ui/icons";
import { styles } from "../../shared/ui/appStyles";
import type { MainTab } from "../navigationTypes";

export function BottomNav({
  active,
  onHome,
  onMap,
  onCreate,
  onChat,
  onMy,
}: {
  active: MainTab;
  onHome: () => void;
  onMap: () => void;
  onCreate: () => void;
  onChat: () => void;
  onMy: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <NavItem
        iconNode={
          <HomeIcon size={22} color={active === "home" ? t.rose : t.dim} />
        }
        label="홈"
        active={active === "home"}
        onPress={onHome}
      />
      <NavItem
        iconNode={
          <MapPinIcon size={22} color={active === "map" ? t.rose : t.dim} />
        }
        label="지도"
        active={active === "map"}
        onPress={onMap}
      />
      <Pressable style={styles.navCenter} onPress={onCreate}>
        <View style={styles.fab}>
          <Text
            style={{
              fontSize: 28,
              color: "#fff",
              fontWeight: "300",
              lineHeight: 30,
            }}
          >
            +
          </Text>
        </View>
      </Pressable>
      <NavItem
        iconNode={
          <ChatBubbleIcon
            size={22}
            color={active === "chat" ? t.rose : t.dim}
          />
        }
        label="채팅"
        active={active === "chat"}
        onPress={onChat}
      />
      <NavItem
        iconNode={
          <PersonIcon size={22} color={active === "mypage" ? t.rose : t.dim} />
        }
        label="마이"
        active={active === "mypage"}
        onPress={onMy}
      />
    </View>
  );
}

function NavItem({
  iconNode,
  label,
  active,
  onPress,
}: {
  iconNode: ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      {iconNode}
      <Text
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: active ? t.rose : t.dim,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
