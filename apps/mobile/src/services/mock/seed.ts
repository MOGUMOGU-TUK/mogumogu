import type { AppSnapshot } from "../../types/domain";

const now = new Date("2026-06-24T15:00:00+09:00").toISOString();

export const seedSnapshot: AppSnapshot = {
  users: [
    {
      id: "user_me",
      nickname: "민준",
      neighborhood: "신촌동",
      universityVerified: true,
      locationVerified: true,
      trustScore: 38.2,
      completedGongguCount: 7
    },
    {
      id: "host_1",
      nickname: "소분장인",
      neighborhood: "신촌동",
      universityVerified: true,
      locationVerified: true,
      trustScore: 39.1,
      completedGongguCount: 18
    },
    {
      id: "host_2",
      nickname: "마트원정대",
      neighborhood: "대흥동",
      universityVerified: false,
      locationVerified: true,
      trustScore: 37.4,
      completedGongguCount: 5
    }
  ],
  gonggus: [
    {
      id: "gonggu_1",
      title: "코스트코 베이글 12개 나눠요",
      description: "플레인/어니언 반반 구성입니다. 오늘 저녁 픽업 가능해요.",
      category: "식품",
      hostUserId: "host_1",
      hostNickname: "소분장인",
      hostTrustScore: 39.1,
      purchaseStore: "코스트코 양재",
      totalPrice: 12900,
      targetParticipants: 3,
      currentParticipants: 2,
      splitMethod: "1인 4개씩 지퍼백 소분",
      pickupPlaceName: "신촌역 2번 출구",
      pickupDistanceMeters: 420,
      pickupExpectedTime: "오늘 19:30",
      recruitmentDeadline: "오늘 18:30",
      status: "recruiting",
      imageUrl: "https://images.unsplash.com/photo-1586444248902-2f64eddc13df",
      receiptVerified: true,
      settlementId: "settlement_1"
    },
    {
      id: "gonggu_2",
      title: "트레이더스 생수 2L 묶음 공구",
      description: "차량으로 가져오고 학교 정문에서 나눕니다. 무거우니 장바구니 챙겨주세요.",
      category: "생필품",
      hostUserId: "host_2",
      hostNickname: "마트원정대",
      hostTrustScore: 37.4,
      purchaseStore: "이마트 트레이더스",
      totalPrice: 9800,
      targetParticipants: 4,
      currentParticipants: 1,
      splitMethod: "1인 3병씩",
      pickupPlaceName: "서강대 정문",
      pickupDistanceMeters: 980,
      pickupExpectedTime: "내일 12:20",
      recruitmentDeadline: "오늘 23:00",
      status: "recruiting",
      imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43",
      receiptVerified: false,
      settlementId: "settlement_2"
    }
  ],
  participations: [],
  messages: [
    {
      id: "msg_1",
      gongguId: "gonggu_1",
      senderId: "system",
      senderName: "mogumogu",
      text: "공구방이 열렸습니다. 픽업 시간과 소분 방식을 확인해주세요.",
      messageType: "system",
      createdAt: now
    },
    {
      id: "msg_2",
      gongguId: "gonggu_1",
      senderId: "host_1",
      senderName: "소분장인",
      text: "베이글은 위생장갑 끼고 4개씩 나눠둘게요.",
      messageType: "user",
      createdAt: now
    }
  ],
  settlements: [
    {
      id: "settlement_1",
      gongguId: "gonggu_1",
      hostUserId: "host_1",
      totalAmount: 12900,
      pricePerPerson: 4300,
      participantCount: 3,
      mode: "mock",
      status: "pending",
      releaseCondition: "all_pickup_confirmed_and_reviews_completed"
    },
    {
      id: "settlement_2",
      gongguId: "gonggu_2",
      hostUserId: "host_2",
      totalAmount: 9800,
      pricePerPerson: 2450,
      participantCount: 4,
      mode: "mock",
      status: "pending",
      releaseCondition: "all_pickup_confirmed_and_reviews_completed"
    }
  ],
  reviews: []
};
