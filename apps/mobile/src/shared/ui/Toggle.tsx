import { Pressable, View } from "react-native";

import { t } from "../theme/theme";
import { styles } from "../../shell/appStyles";

export function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleTrack,
        { backgroundColor: on ? t.rose : t.trackOff },
      ]}
    >
      <View style={[styles.toggleKnob, { left: on ? 22 : 3 }]} />
    </Pressable>
  );
}
