import { Text, View } from "react-native";

import { styles } from "./appStyles";

export function EmptyState({
  emoji,
  title,
  desc,
  emojiColor,
}: {
  emoji: string;
  title: string;
  desc?: string;
  emojiColor?: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={[styles.emptyEmoji, emojiColor ? { color: emojiColor } : undefined]}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!desc && <Text style={styles.emptyDesc}>{desc}</Text>}
    </View>
  );
}
