import type { AppSnapshot } from "../../types/domain";

/**
 * 목/시드 데이터. 현재는 비어 있음(데이터 초기화).
 * Firebase 미설정이거나 Firestore 가 비어 있을 때 이 값이 fallback 으로 쓰인다.
 */
export const seedSnapshot: AppSnapshot = {
  users: [],
  gonggus: [],
  participations: [],
  messages: [],
  settlements: [],
  reviews: []
};
