/** 온도 그라디언트 색 정지점 (차가움 → 따뜻함). */
export const TEMP_STOPS = ["#5B9BD5", "#FFC247", "#EC5578"];

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function lerpColor(c1: string, c2: string, ratio: number) {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const r = Math.round(a.r + (b.r - a.r) * ratio);
  const g = Math.round(a.g + (b.g - a.g) * ratio);
  const bl = Math.round(a.b + (b.b - a.b) * ratio);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** stops 배열을 ratio(0~1)로 보간한 색을 반환. */
export function gradientColor(stops: string[], ratio: number) {
  if (ratio <= 0) return stops[0]!;
  if (ratio >= 1) return stops[stops.length - 1]!;
  const scaled = ratio * (stops.length - 1);
  const idx = Math.floor(scaled);
  return lerpColor(stops[idx]!, stops[idx + 1]!, scaled - idx);
}
