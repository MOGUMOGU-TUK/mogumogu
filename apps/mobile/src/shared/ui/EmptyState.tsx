import { Text, View } from "react-native";

import { styles } from "./appStyles";

export function EmptyState({
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
