import type { Gonggu, Review } from "../../types/domain";
import { t } from "../../shared/theme/theme";
import type { Deal } from "./types";

const CATEGORY_TINTS: Record<string, string> = {
  식품: "#CFE2EC",
  생활: "#D8E0CC",
  패션: "#E8D5E5",
  반려동물: "#F3DEC4",
  "가구·인테리어": "#E4D9CE",
  스포츠: "#CDE7E0",
  기타: "#EEE0E5",
};

export const TEMP_STOPS = ["#5B9BD5", "#FFC247", "#EC5578"];

export function gongguToUi(g: Gonggu, reviews: Review[]): Deal {
  const gReviews = reviews.filter((r) => r.gongguId === g.id);
  return {
    id: g.id,
    hostId: g.hostUserId,
    status: g.status,
    hostHidden: !!g.hostHidden,
    cat: g.category || "기타",
    title: g.title,
    store: g.purchaseStore,
    total: g.totalPrice,
    cur: g.claimedQuantity,
    max: g.totalQuantity,
    members: g.currentParticipants,
    dist: g.pickupDistanceMeters > 0 ? `${g.pickupDistanceMeters}m` : "근처",
    deadline: g.recruitmentDeadline,
    urgent: /[12]시간|30분|마감/.test(g.recruitmentDeadline),
    spot: g.pickupPlaceName,
    pickup: g.pickupExpectedTime,
    leader: g.hostNickname,
    temp: g.hostTrustScore,
    deals: 0,
    reviews: gReviews.length,
    noshow: 0,
    tint: CATEGORY_TINTS[g.category] ?? "#EEE0E5",
    method: g.splitMethod,
    desc: g.description,
  };
}

export const fmt = (n: number) => `${Number(n).toLocaleString("ko-KR")}원`;

/** 1개당 가격 = ceil(총가격 / 총수량) */
export const unitPrice = (d: Deal) => Math.ceil(d.total / Math.max(1, d.max));

/** 수량 진행 표시 (확보/총) */
export const qtyStr = (d: Deal) => `${d.cur}/${d.max}개`;

export const memberStr = (d: Deal) => `참여 ${d.members}명`;
export const barPct = (d: Deal) => Math.round((d.cur / Math.max(1, d.max)) * 100);
export const remain = (d: Deal) => `앞으로 ${Math.max(0, d.max - d.cur)}개`;
export const statusOf = (d: Deal) => (d.cur >= d.max ? "모집완료" : "모집중");
export const tempStr = (n: number) => `${n.toFixed(1)}°C`;

export function tempColor(n: number) {
  if (n >= 40) return t.urgentInk;
  if (n >= 38) return t.rose;
  if (n >= 37) return "#F0A23C";
  return "#5B9BD5";
}

export function tempRatio(n: number) {
  return Math.max(0, Math.min(1, (n - 33) / (45 - 33)));
}

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

export function gradientColor(stops: string[], ratio: number) {
  if (ratio <= 0) return stops[0]!;
  if (ratio >= 1) return stops[stops.length - 1]!;
  const scaled = ratio * (stops.length - 1);
  const idx = Math.floor(scaled);
  return lerpColor(stops[idx]!, stops[idx + 1]!, scaled - idx);
}
