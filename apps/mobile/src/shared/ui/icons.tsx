import { View } from "react-native";

import { t } from "../theme/theme";

export function BasketIcon({
  size = 44,
  color = "#fff",
}: {
  size?: number;
  color?: string;
}) {
  const bw = Math.max(2.5, size * 0.065);
  const bodyTint = color === "#fff" ? t.pink : "#fff";
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Arc handle */}
      <View
        style={{
          width: size * 0.46,
          height: size * 0.22,
          borderTopWidth: bw,
          borderLeftWidth: bw,
          borderRightWidth: bw,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.23,
          borderTopRightRadius: size * 0.23,
        }}
      />
      {/* Body */}
      <View
        style={{
          width: size * 0.8,
          height: size * 0.47,
          backgroundColor: color,
          borderRadius: size * 0.06,
          borderBottomLeftRadius: size * 0.11,
          borderBottomRightRadius: size * 0.11,
          marginTop: 1,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: "72%",
            height: bw * 0.75,
            backgroundColor: bodyTint,
            opacity: 0.3,
            marginBottom: size * 0.08,
          }}
        />
        <View
          style={{
            width: "72%",
            height: bw * 0.75,
            backgroundColor: bodyTint,
            opacity: 0.3,
          }}
        />
      </View>
    </View>
  );
}

export function KakaoIcon({ size = 22 }: { size?: number }) {
  const bColor = "#3C1E1E";
  const eyeS = size * 0.165;
  return (
    <View style={{ width: size, height: size * 0.88, marginRight: 8 }}>
      {/* Bubble body */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: size * 0.76,
          backgroundColor: bColor,
          borderRadius: size * 0.22,
        }}
      />
      {/* Tail */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: size * 0.22,
          width: size * 0.24,
          height: size * 0.19,
          backgroundColor: bColor,
          borderBottomLeftRadius: size * 0.13,
        }}
      />
      {/* Left eye */}
      <View
        style={{
          position: "absolute",
          top: size * 0.255,
          left: size * 0.19,
          width: eyeS,
          height: eyeS,
          borderRadius: eyeS / 2,
          backgroundColor: "#FEE500",
        }}
      />
      {/* Right eye */}
      <View
        style={{
          position: "absolute",
          top: size * 0.255,
          right: size * 0.19,
          width: eyeS,
          height: eyeS,
          borderRadius: eyeS / 2,
          backgroundColor: "#FEE500",
        }}
      />
    </View>
  );
}

export function GoogleGIcon({ size = 22 }: { size?: number }) {
  const r = size / 2;
  const iR = size * 0.305;
  const barH = size * 0.205;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        overflow: "hidden",
        marginRight: 10,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: r,
          height: r,
          backgroundColor: "#4285F4",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: r,
          height: r,
          backgroundColor: "#EA4335",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: r,
          height: r,
          backgroundColor: "#FBBC05",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: r,
          height: r,
          backgroundColor: "#34A853",
        }}
      />
      {/* White donut cutout */}
      <View
        style={{
          position: "absolute",
          top: r - iR,
          left: r - iR,
          width: iR * 2,
          height: iR * 2,
          borderRadius: iR,
          backgroundColor: "#fff",
        }}
      />
      {/* White mask right half (G opening) */}
      <View
        style={{
          position: "absolute",
          top: r - barH / 2 - 0.5,
          left: r - 1,
          right: 0,
          height: barH + 1,
          backgroundColor: "#fff",
        }}
      />
      {/* Blue horizontal bar of G */}
      <View
        style={{
          position: "absolute",
          top: r - barH / 2,
          left: size * 0.39,
          right: size * 0.07,
          height: barH,
          backgroundColor: "#4285F4",
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Nav vector icons                                                    */
/* ------------------------------------------------------------------ */

export function HomeIcon({
  size = 22,
  color = t.dim,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      {/* 지붕 삼각형 */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: s * 0.5,
          borderRightWidth: s * 0.5,
          borderBottomWidth: s * 0.47,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
        }}
      />
      {/* 벽 */}
      <View
        style={{
          width: s * 0.64,
          height: s * 0.42,
          backgroundColor: color,
          marginTop: -s * 0.03,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />
    </View>
  );
}

export function MapPinIcon({
  size = 22,
  color = t.dim,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  const d = s * 0.58;
  return (
    <View
      style={{
        width: s,
        height: s,
        alignItems: "center",
        paddingTop: s * 0.02,
      }}
    >
      {/* 원형 상단 */}
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 가운데 흰 점 */}
        <View
          style={{
            width: d * 0.36,
            height: d * 0.36,
            borderRadius: d * 0.18,
            backgroundColor: "rgba(255,255,255,0.9)",
          }}
        />
      </View>
      {/* 뾰족한 아래쪽 */}
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -s * 0.05,
          borderLeftWidth: s * 0.2,
          borderRightWidth: s * 0.2,
          borderTopWidth: s * 0.34,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: color,
        }}
      />
    </View>
  );
}

export function ChatBubbleIcon({
  size = 22,
  color = t.dim,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  return (
    <View style={{ width: s, height: s }}>
      {/* 말풍선 몸체 */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: s * 0.76,
          backgroundColor: color,
          borderRadius: s * 0.18,
        }}
      />
      {/* 꼬리 (삼각형) */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: s * 0.14,
          width: 0,
          height: 0,
          borderRightWidth: s * 0.18,
          borderTopWidth: s * 0.28,
          borderRightColor: "transparent",
          borderTopColor: color,
        }}
      />
    </View>
  );
}

export function PersonIcon({
  size = 22,
  color = t.dim,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  const headD = s * 0.44;
  const bodyW = s * 0.74;
  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      {/* 머리 */}
      <View
        style={{
          width: headD,
          height: headD,
          borderRadius: headD / 2,
          backgroundColor: color,
          marginBottom: s * 0.04,
        }}
      />
      {/* 어깨/몸 반원 */}
      <View
        style={{
          width: bodyW,
          height: s * 0.38,
          backgroundColor: color,
          borderTopLeftRadius: bodyW / 2,
          borderTopRightRadius: bodyW / 2,
        }}
      />
    </View>
  );
}

export function SearchIcon({
  size = 20,
  color = t.ink,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  const bw = Math.max(1.5, s * 0.1);
  // 렌즈를 크게, 세로 중앙 정렬을 위해 살짝 아래 오프셋
  const offset = s * 0.06;
  const lD = s * 0.7;
  const lR = lD / 2;
  const lCx = offset + lR;
  const lCy = offset + lR;
  // 렌즈 외곽 45° edge
  const ex = lCx + lR * 0.707;
  const ey = lCy + lR * 0.707;
  // 손잡이: 짧게 끊음
  const endPt = s * 0.92;
  const hCx = (ex + endPt) / 2;
  const hCy = (ey + endPt) / 2;
  const hLen = (endPt - ex) * Math.SQRT2;
  return (
    <View style={{ width: s, height: s }}>
      <View
        style={{
          position: "absolute",
          top: offset,
          left: offset,
          width: lD,
          height: lD,
          borderRadius: lR,
          borderWidth: bw,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: hCy - hLen / 2,
          left: hCx - bw / 2,
          width: bw,
          height: hLen,
          backgroundColor: color,
          borderRadius: bw / 2,
          transform: [{ rotate: "135deg" }],
        }}
      />
    </View>
  );
}

export function BellIcon({
  size = 20,
  color = t.ink,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  const bw = s * 0.74;
  return (
    <View style={{ width: s, height: s, alignItems: "center" }}>
      {/* 상단 고리 */}
      <View
        style={{
          width: s * 0.1,
          height: s * 0.14,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      {/* 벨 몸체 */}
      <View
        style={{
          width: bw,
          height: s * 0.54,
          backgroundColor: color,
          borderTopLeftRadius: bw / 2,
          borderTopRightRadius: bw / 2,
        }}
      />
      {/* 벨 하단 테두리 */}
      <View
        style={{
          width: s * 0.88,
          height: s * 0.13,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      {/* 추 */}
      <View
        style={{
          width: s * 0.2,
          height: s * 0.2,
          borderRadius: s * 0.1,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function SendArrowIcon({
  size = 16,
  color = "#fff",
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
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: s * 0.5,
          borderBottomWidth: s * 0.5,
          borderLeftWidth: s * 0.88,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: color,
        }}
      />
    </View>
  );
}

export function MapCenterPin() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: t.rose, borderWidth: 3, borderColor: "#fff",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
      }} />
      <View style={{ width: 2, height: 14, backgroundColor: t.rose, marginTop: -1 }} />
      <View style={{ width: 8, height: 4, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.15)" }} />
    </View>
  );
}

export function LocationIcon({
  size = 22,
  color = t.ink,
}: {
  size?: number;
  color?: string;
}) {
  const s = size;
  const c = s / 2;          // 중심
  const r = s * 0.46;       // 원 반지름 (크게)
  const bw = Math.max(1, Math.round(s * 0.06));
  const innerR = r - bw;
  const armLen = innerR * 0.35; // 선 길이 (짧게)

  return (
    <View style={{ width: s, height: s }}>
      {/* 원 테두리 */}
      <View style={{
        position: "absolute",
        left: c - r,
        top: c - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        borderWidth: bw,
        borderColor: color,
      }} />
      {/* 중심 점 */}
      <View style={{
        position: "absolute",
        left: c - bw,
        top: c - bw,
        width: bw * 2,
        height: bw * 2,
        borderRadius: bw,
        backgroundColor: color,
      }} />
      {/* 상단 선 */}
      <View style={{ position: "absolute", left: c - bw / 2, top: c - innerR, width: bw, height: armLen, backgroundColor: color }} />
      {/* 하단 선 */}
      <View style={{ position: "absolute", left: c - bw / 2, top: c + innerR - armLen, width: bw, height: armLen, backgroundColor: color }} />
      {/* 좌측 선 */}
      <View style={{ position: "absolute", top: c - bw / 2, left: c - innerR, width: armLen, height: bw, backgroundColor: color }} />
      {/* 우측 선 */}
      <View style={{ position: "absolute", top: c - bw / 2, left: c + innerR - armLen, width: armLen, height: bw, backgroundColor: color }} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
