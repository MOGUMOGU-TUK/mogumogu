import type { Gonggu, Review } from "../../../types/domain";
import type { Deal } from "../types";
import { barPct, formatRecruitmentDeadline, gongguToUi, remain, statusOf, unitPrice } from "../utils";

function deal(overrides: Partial<Deal>): Deal {
  return {
    id: "g1",
    hostId: "u1",
    status: "recruiting",
    hostHidden: false,
    cat: "식품",
    title: "테스트 공구",
    store: "코스트코",
    total: 30_000,
    cur: 0,
    max: 10,
    qtyUnit: "개",
    members: 0,
    dist: "근처",
    deadline: "내일",
    urgent: false,
    spot: "정문",
    pickup: "저녁",
    leader: "이웃",
    mannerScore: 0,
    deals: 0,
    reviews: 0,
    noshow: 0,
    tint: "#EEE0E5",
    method: "수량 기준 비례 분담",
    desc: "설명",
    ...overrides,
  };
}

describe("unitPrice", () => {
  it("총가격 / 총수량을 올림한다", () => {
    expect(unitPrice(deal({ total: 30_000, max: 10 }))).toBe(3_000);
    expect(unitPrice(deal({ total: 10_000, max: 3 }))).toBe(3_334);
  });

  it("총수량 0이어도 나누기 방어(최소 1)", () => {
    expect(unitPrice(deal({ total: 5_000, max: 0 }))).toBe(5_000);
  });
});

describe("remain", () => {
  it("남은 수량 문구를 만든다", () => {
    expect(remain(deal({ cur: 4, max: 10 }))).toBe("앞으로 6개");
  });

  it("초과 확보돼도 음수로 내려가지 않는다", () => {
    expect(remain(deal({ cur: 12, max: 10 }))).toBe("앞으로 0개");
  });

  it("단위가 개가 아니면 해당 단위로 표시한다", () => {
    expect(remain(deal({ cur: 200, max: 500, qtyUnit: "g" }))).toBe("앞으로 300g");
  });
});

describe("barPct", () => {
  it("진행률(%)을 반올림한다", () => {
    expect(barPct(deal({ cur: 1, max: 3 }))).toBe(33);
    expect(barPct(deal({ cur: 10, max: 10 }))).toBe(100);
  });
});

describe("statusOf", () => {
  it("확보수량이 총수량 미만이면 모집중", () => {
    expect(statusOf(deal({ cur: 9, max: 10 }))).toBe("모집중");
  });

  it("확보수량이 총수량 이상이면 모집완료", () => {
    expect(statusOf(deal({ cur: 10, max: 10 }))).toBe("모집완료");
  });
});

describe("gongguToUi", () => {
  function gonggu(overrides: Partial<Gonggu>): Gonggu {
    return {
      id: "g1",
      title: "감귤 공구",
      description: "제주 감귤",
      category: "식품",
      hostUserId: "host1",
      hostNickname: "감귤러",
      hostTrustScore: 38.2,
      purchaseStore: "이마트",
      totalPrice: 24_000,
      totalQuantity: 8,
      claimedQuantity: 3,
      currentParticipants: 2,
      splitMethod: "수량 기준 비례 분담",
      pickupPlaceName: "정문",
      pickupDistanceMeters: 250,
      pickupExpectedTime: "저녁 7시",
      recruitmentDeadline: "내일",
      status: "recruiting",
      imageUrls: [],
      receiptVerified: false,
      settlementId: "",
      ...overrides,
    };
  }

  it("도메인 Gonggu 필드를 Deal로 매핑한다", () => {
    const ui = gongguToUi(gonggu({}), []);
    expect(ui).toMatchObject({
      id: "g1",
      hostId: "host1",
      cat: "식품",
      total: 24_000,
      cur: 3,
      max: 8,
      members: 2,
      leader: "감귤러",
      mannerScore: 0,
      store: "이마트",
      dist: "250m",
    });
  });

  it("공구장 기준 받은 후기와 완료 거래 수를 센다", () => {
    const reviews = [
      { gongguId: "g1", revieweeId: "host1", rating: 4 },
      { gongguId: "other", revieweeId: "host1", rating: 5 },
      { gongguId: "g1", revieweeId: "other-host", rating: 5 },
    ] as Review[];
    const gonggus = [
      gonggu({ id: "g1", hostUserId: "host1", status: "recruiting" }),
      gonggu({ id: "g2", hostUserId: "host1", status: "review_required" }),
      gonggu({ id: "g3", hostUserId: "host1", status: "completed" }),
      gonggu({ id: "g4", hostUserId: "other-host", status: "completed" }),
    ];

    expect(gongguToUi(gonggus[0]!, reviews, gonggus)).toMatchObject({
      deals: 2,
      reviews: 2,
      mannerScore: 9,
    });
  });

  it("공구장 노쇼 수를 Deal에 반영한다", () => {
    expect(gongguToUi(gonggu({}), [], undefined, 3)).toMatchObject({
      noshow: 3,
    });
  });

  it("거리 0이면 '근처'로 표시한다", () => {
    expect(gongguToUi(gonggu({ pickupDistanceMeters: 0 }), []).dist).toBe("근처");
  });

  it("마감 임박 문구면 urgent=true", () => {
    expect(gongguToUi(gonggu({ recruitmentDeadline: "2시간 남음" }), []).urgent).toBe(true);
    expect(gongguToUi(gonggu({ recruitmentDeadline: "내일" }), []).urgent).toBe(false);
  });

  it("미정·빈 마감은 픽업 일정 조율로 표시한다", () => {
    expect(gongguToUi(gonggu({ recruitmentDeadline: "미정" }), []).deadline).toBe(
      "픽업 일정 조율",
    );
    expect(gongguToUi(gonggu({ recruitmentDeadline: "" }), []).deadline).toBe("픽업 일정 조율");
    expect(formatRecruitmentDeadline("내일")).toBe("내일");
  });
});
