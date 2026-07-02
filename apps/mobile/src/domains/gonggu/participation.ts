import type { Gonggu } from "../../types/domain";

/**
 * 공구 참여 수량·금액 계산의 순수 로직.
 *
 * Firestore 트랜잭션(`participationRepository.joinGongguDoc`)과 단위 테스트가
 * 함께 쓰는 부분. 여기엔 부수효과 없는 계산·검증만 둔다.
 */

type QuantityState = Pick<Gonggu, "totalQuantity" | "claimedQuantity">;
type PriceState = Pick<Gonggu, "totalPrice" | "totalQuantity">;

/** 남은 수량 = 총수량 − 확보수량. (마감 판단은 `<= 0`로) */
export function remainingQuantity(g: QuantityState): number {
  return g.totalQuantity - g.claimedQuantity;
}

/** 모집 완료 여부 = 확보수량이 총수량 이상. */
export function isRecruited(g: QuantityState): boolean {
  return g.claimedQuantity >= g.totalQuantity;
}

/** 1개당 가격 = ceil(총가격 / 총수량). 총수량 0 방어. */
export function unitPriceOf(g: PriceState): number {
  return Math.ceil(g.totalPrice / Math.max(1, g.totalQuantity));
}

/** 요청 수량을 1 이상의 정수로 정규화. */
export function normalizeQuantity(quantity: number): number {
  return Math.max(1, Math.floor(quantity));
}

/**
 * 참여 가능 여부 검증. 마감이거나 남은 수량을 초과하면 사용자용 한국어 에러를 던진다.
 * `qty`는 이미 `normalizeQuantity`를 거친 값이라고 가정.
 */
export function assertJoinable(g: QuantityState, qty: number): void {
  const remaining = remainingQuantity(g);
  if (remaining <= 0) {
    throw new Error("모집이 완료된 공구예요.");
  }
  if (qty > remaining) {
    throw new Error("남은 수량을 초과했어요.");
  }
}
