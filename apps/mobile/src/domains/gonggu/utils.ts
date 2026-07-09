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

/** 모집 마감·픽업 일정 미입력 시 카드/상세에 쓰는 기본 라벨 */
export const DEFAULT_RECRUITMENT_DEADLINE_LABEL = "픽업 일정 조율";

export function formatRecruitmentDeadline(deadline: string): string {
  const trimmed = deadline.trim();
  if (!trimmed || trimmed === "미정") {
    return DEFAULT_RECRUITMENT_DEADLINE_LABEL;
  }
  return deadline;
}

const COMPLETED_GONGGU_STATUSES = new Set<Gonggu["status"]>([
  "review_required",
  "completed",
]);

export function gongguToUi(
  g: Gonggu,
  reviews: Review[],
  gonggus: Gonggu[] = [g],
  hostNoshowCount = 0,
): Deal {
  const hostReviews = reviews.filter((r) => r.revieweeId === g.hostUserId);
  const hostCompletedGonggus = gonggus.filter(
    (item) =>
      item.hostUserId === g.hostUserId && COMPLETED_GONGGU_STATUSES.has(item.status),
  );
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
    qtyUnit: g.qtyUnit ?? "개",
    members: g.currentParticipants,
    dist: g.pickupDistanceMeters > 0 ? `${g.pickupDistanceMeters}m` : "근처",
    pickupLatitude: g.pickupLatitude,
    pickupLongitude: g.pickupLongitude,
    pickupNeighborhood: g.pickupNeighborhood,
    deadline: formatRecruitmentDeadline(g.recruitmentDeadline),
    urgent: /[12]시간|30분|마감/.test(g.recruitmentDeadline),
    spot: g.pickupPlaceName,
    pickup: g.pickupExpectedTime,
    leader: g.hostNickname,
    mannerScore: Math.min(
      100,
      hostReviews.reduce((sum, review) => sum + review.rating, 0),
    ),
    deals: hostCompletedGonggus.length,
    reviews: hostReviews.length,
    noshow: hostNoshowCount,
    tint: CATEGORY_TINTS[g.category] ?? "#EEE0E5",
    method: g.splitMethod,
    desc: g.description,
  };
}

export const fmt = (n: number) => `${Number(n).toLocaleString("ko-KR")}원`;

export function formatPickupTime(d: Date): string {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours < 12 ? "오전" : "오후";
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, "0");
  return `${month}월 ${day}일 ${ampm} ${h}시 ${m}분`;
}

/** 1개당 가격 = ceil(총가격 / 총수량) */
export const unitPrice = (d: Deal) => Math.ceil(d.total / Math.max(1, d.max));

/** 수량 진행 표시 (확보/총) */
export const qtyStr = (d: Deal) => `${d.cur}/${d.max}${d.qtyUnit}`;

export const memberStr = (d: Deal) => `참여 ${d.members}명`;
export const barPct = (d: Deal) => Math.round((d.cur / Math.max(1, d.max)) * 100);
export const remain = (d: Deal) => `앞으로 ${Math.max(0, d.max - d.cur)}${d.qtyUnit}`;
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
