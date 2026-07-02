import { View } from "react-native";

import { styles } from "../../../shell/appStyles";

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.min(100, Math.max(0, pct))}%` },
        ]}
      />
    </View>
  );
}
