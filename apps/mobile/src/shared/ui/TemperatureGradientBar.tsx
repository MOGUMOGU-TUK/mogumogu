import { View } from "react-native";

import { styles } from "./appStyles";
import { TEMP_STOPS, gradientColor } from "../utils/color";

export function TemperatureGradientBar({
  ratio,
  knobColor,
}: {
  ratio: number;
  knobColor: string;
}) {
  const segments = 40;
  return (
    <View style={styles.gradientWrap}>
      <View style={styles.gradientTrack}>
        {Array.from({ length: segments }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: gradientColor(TEMP_STOPS, i / (segments - 1)),
            }}
          />
        ))}
      </View>
      <View
        style={[
          styles.gradientKnob,
          { left: `${ratio * 100}%`, borderColor: knobColor },
        ]}
      />
    </View>
  );
}
