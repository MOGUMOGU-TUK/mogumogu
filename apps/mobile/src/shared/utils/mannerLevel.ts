import type { ImageSourcePropType } from "react-native";

export type MannerLevel = {
  min: number;
  nextAt: number | null;
  name: string;
  image: ImageSourcePropType;
};

export const MANNER_LEVELS: MannerLevel[] = [
  {
    min: 0,
    nextAt: 15,
    name: "복숭아 씨앗",
    image: require("../assets/manner/peach-seed.png"),
  },
  {
    min: 15,
    nextAt: 30,
    name: "복숭아 새싹",
    image: require("../assets/manner/peach-sprout.png"),
  },
  {
    min: 30,
    nextAt: 45,
    name: "복숭아 나무",
    image: require("../assets/manner/peach-tree.png"),
  },
  {
    min: 45,
    nextAt: 80,
    name: "잘 익은 복숭아",
    image: require("../assets/manner/peach.png"),
  },
  {
    min: 80,
    nextAt: null,
    name: "황금 복숭아",
    image: require("../assets/manner/golden-peach.png"),
  },
];

export function getMannerLevel(score: number) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const level =
    MANNER_LEVELS.find((item) =>
      item.nextAt == null ? clampedScore >= item.min : clampedScore < item.nextAt,
    ) ?? MANNER_LEVELS[MANNER_LEVELS.length - 1]!;
  const progress =
    level.nextAt == null
      ? 100
      : ((clampedScore - level.min) / (level.nextAt - level.min)) * 100;
  const remaining = level.nextAt == null ? 0 : level.nextAt - clampedScore;

  return {
    level,
    progress,
    remaining,
  };
}
