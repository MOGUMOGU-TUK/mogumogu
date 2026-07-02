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
    pickupLatitude: g.pickupLatitude,
    pickupLongitude: g.pickupLongitude,
    pickupNeighborhood: g.pickupNeighborhood,
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

type Coordinates = {
  latitude: number;
  longitude: number;
};

const DEFAULT_FEED_RADIUS_METERS = 1000;

export function distanceMeters(a: Coordinates, b: Coordinates) {
  const earthRadiusMeters = 6371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function isDealNearLocation(
  deal: Deal,
  location: Coordinates | null | undefined,
  radiusMeters = DEFAULT_FEED_RADIUS_METERS
) {
  if (!location) return true;
  if (typeof deal.pickupLatitude !== "number" || typeof deal.pickupLongitude !== "number") {
    return true;
  }

  return (
    distanceMeters(location, {
      latitude: deal.pickupLatitude,
      longitude: deal.pickupLongitude
    }) <= radiusMeters
  );
}

export function tempColor(n: number) {
  if (n >= 40) return t.urgentInk;
  if (n >= 38) return t.rose;
  if (n >= 37) return "#F0A23C";
  return "#5B9BD5";
}

export function tempRatio(n: number) {
  return Math.max(0, Math.min(1, (n - 33) / (45 - 33)));
}
