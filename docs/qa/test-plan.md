# 테스트 플랜

## 자동 단위 테스트 (`npm test`)

순수 도메인 로직은 jest로 검증합니다. RN/Expo 런타임이 필요 없는 계산·변환만 대상 (node 환경, babel-jest).

- ✅ 단가 계산 `ceil(총가격 / 총수량)` — `unitPrice`, `unitPriceOf`
- ✅ 남은 수량 계산 — `remain`, `remainingQuantity`
- ✅ 모집 완료 상태 `claimedQuantity >= totalQuantity` — `statusOf`, `isRecruited`
- ✅ 참여 수량이 남은 수량을 초과할 때 막는 가드 — `assertJoinable`
- ✅ `gongguToUi` 필드 매핑·후기 수·거리·마감 임박 판정

테스트 위치: [apps/mobile/src/domains/gonggu/__tests__](../../apps/mobile/src/domains/gonggu/__tests__)

### 추가 예정
- 픽업 확인 상태 전환
- 후기 제출 상태 전환
- 정산 지급 조건(`all_pickup_confirmed_and_reviews_completed`)

## 수동 스모크 테스트

시드 모드(또는 Firebase 설정) 기준:

1. 루트에서 `npm run web`(또는 `npm run ios`)로 앱 실행.
2. 로그인(익명/Google) 또는 둘러보기 진입.
3. 동네 인증 (네이티브 + 카카오 REST 키 설정 시). 키 미설정이면 안내 문구 표시 확인.
4. 목록에서 공구 열기 → 참여.
5. 채팅방 입장 → 메시지 전송.
6. 상세로 돌아가 픽업 확인.
7. 필수 후기 작성.
8. 마이페이지에서 알림 토글 등 확인.

> Firebase 미설정 시 공구 생성은 "Firebase 설정이 필요해요" 안내로 막히고, Google 로그인 버튼도 안내를 표시합니다(거짓 성공 없음).
