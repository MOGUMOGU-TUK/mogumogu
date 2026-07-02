import type { GongguStatus } from "../../types/domain";

export type Deal = {
  id: string;
  /** 공구 소유자(방장) 유저 id */
  hostId: string;
  /** 공구 상태 (canceled 필터·라벨용) */
  status: GongguStatus;
  /** 방장이 채팅 목록에서 숨겼는지 */
  hostHidden: boolean;
  cat: string;
  title: string;
  store: string;
  total: number;
  /** 확보된 수량 (진행률 기준) */
  cur: number;
  /** 총 수량 */
  max: number;
  /** 참여한 사람 수 (참고용) */
  members: number;
  dist: string;
  deadline: string;
  urgent: boolean;
  spot: string;
  pickup: string;
  leader: string;
  temp: number;
  deals: number;
  reviews: number;
  noshow: number;
  tint: string;
  method: string;
  desc: string;
  pickupLat?: number;
  pickupLng?: number;
};

export const HOME_FILTERS = ["전체", "식품", "생활", "패션", "반려동물", "가구·인테리어", "스포츠"];
export const CREATE_CATS = ["식품", "생활", "패션", "반려동물", "가구·인테리어", "스포츠"];
