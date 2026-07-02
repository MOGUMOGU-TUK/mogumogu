import type { Gonggu } from "../../../types/domain";
import {
  assertJoinable,
  isRecruited,
  normalizeQuantity,
  remainingQuantity,
  unitPriceOf,
} from "../participation";

/** 테스트에 필요한 수량·가격 필드만 채운 Gonggu 부분값. */
function gonggu(overrides: Partial<Gonggu>): Gonggu {
  return {
    totalQuantity: 10,
    claimedQuantity: 0,
    totalPrice: 30_000,
    ...overrides,
  } as Gonggu;
}

describe("remainingQuantity", () => {
  it("총수량 − 확보수량을 돌려준다", () => {
    expect(remainingQuantity(gonggu({ totalQuantity: 10, claimedQuantity: 3 }))).toBe(7);
  });

  it("가득 차면 0", () => {
    expect(remainingQuantity(gonggu({ totalQuantity: 10, claimedQuantity: 10 }))).toBe(0);
  });
});

describe("isRecruited", () => {
  it("확보수량이 총수량 미만이면 false", () => {
    expect(isRecruited(gonggu({ totalQuantity: 10, claimedQuantity: 9 }))).toBe(false);
  });

  it("확보수량이 총수량 이상이면 true", () => {
    expect(isRecruited(gonggu({ totalQuantity: 10, claimedQuantity: 10 }))).toBe(true);
    expect(isRecruited(gonggu({ totalQuantity: 10, claimedQuantity: 11 }))).toBe(true);
  });
});

describe("unitPriceOf", () => {
  it("나누어떨어지면 그대로", () => {
    expect(unitPriceOf(gonggu({ totalPrice: 30_000, totalQuantity: 10 }))).toBe(3_000);
  });

  it("나누어떨어지지 않으면 올림", () => {
    expect(unitPriceOf(gonggu({ totalPrice: 10_000, totalQuantity: 3 }))).toBe(3_334);
  });

  it("총수량 0이어도 1로 나눠 방어한다", () => {
    expect(unitPriceOf(gonggu({ totalPrice: 5_000, totalQuantity: 0 }))).toBe(5_000);
  });
});

describe("normalizeQuantity", () => {
  it("소수는 내림, 최소 1을 보장한다", () => {
    expect(normalizeQuantity(2.9)).toBe(2);
    expect(normalizeQuantity(0)).toBe(1);
    expect(normalizeQuantity(-5)).toBe(1);
  });
});

describe("assertJoinable", () => {
  it("남은 수량 이내면 통과한다", () => {
    expect(() => assertJoinable(gonggu({ totalQuantity: 10, claimedQuantity: 4 }), 6)).not.toThrow();
  });

  it("남은 수량을 초과하면 막는다", () => {
    expect(() => assertJoinable(gonggu({ totalQuantity: 10, claimedQuantity: 4 }), 7)).toThrow(
      "남은 수량을 초과했어요.",
    );
  });

  it("이미 마감된 공구는 막는다", () => {
    expect(() => assertJoinable(gonggu({ totalQuantity: 10, claimedQuantity: 10 }), 1)).toThrow(
      "모집이 완료된 공구예요.",
    );
  });
});
