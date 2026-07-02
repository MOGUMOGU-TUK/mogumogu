# 리팩토링 로드맵 TODO (MVP)

큰 단일 파일(`apps/mobile/src/shell/GongguMateApp.tsx`, ~3,400줄)을 도메인 폴더로 점진 분리하고 테스트 안전망을 까는 작업의 남은 할 일.

**원칙:** 한 번에 대규모 재작성 금지. 작은 단위로 이동 → import·타입 정리 → `npm run typecheck` → 커밋. 기존 기능·UI 유지.

**데이터 모델 기준(확정):** 수량 기반. `Gonggu.totalQuantity/claimedQuantity/currentParticipants`, `Settlement.unitPrice/totalQuantity`, `Participation.quantity/amount`. 참여는 top-level `participations`(id `${gongguId}__${userId}`). 상세는 [architecture.md](./architecture.md) 참고.

---

## 6단계: 도메인별 폴더 재구성

### 목표 구조
```text
apps/mobile/src/
  app/            AppShell.tsx, navigationTypes.ts
  domains/
    gonggu/       components/ hooks/ services/ types.ts utils.ts
    chat/         components/ hooks/ services/
    map/          components/ utils.ts
    auth/         components/ hooks/ services/
    location/     components/ services/
    review/       components/ services/
    notifications/ components/ services/ types.ts
    mypage/       components/
    settlement/   utils.ts types.ts
  shared/         theme/ ui/ utils/
  types/          domain.ts
```

### 분리 순서 (각 단계 후 typecheck + 커밋)
- [ ] **6-0 유틸 먼저 추출**(7단계와 함께): `unitPrice`/`qtyStr`/`barPct`/`remain`/`statusOf` → `domains/settlement/utils.ts` 또는 `domains/gonggu/utils.ts`. `fmt`/색상·테마 유틸 → `shared/utils`, `shared/theme`. `gongguToUi` → `domains/gonggu/utils.ts`. 모두 `export` 후 `GongguMateApp.tsx`에서 import.
- [ ] **6-1 gonggu**: `Deal` 타입, `DealCard`, `HomeScreen`, `DetailScreen`, `CreateScreen`, `JoinSheet`
- [ ] **6-2 chat**: `ChatListScreen`, `ChatScreen`, `chatMsgFromDomain`, `useChatMessages`, `chatRepository`
- [ ] **6-3 notifications**: `NotifScreen`, `notificationService`, 알림 설정 타입/상수
- [ ] **6-4 location**: `VerifyScreen`, `verifyNeighborhood`, 위치 에러 매핑
- [ ] **6-5 auth**: `LoginScreen`, `useFirebaseAuth`, `useGoogleSignIn`, auth service
- [ ] **6-6 map**: `MapScreen`, `mapPos`, 마커/지도 표현
- [ ] **6-7 review**: `ReviewScreen`, 후기 질문 상수, 후기 제출 로직/타입
- [ ] **6-8 mypage**: `MyPageScreen`, 설정 토글/통계 UI
- [ ] **6-9 app/AppShell.tsx**: 화면 전환 상태·선택 공구·공통 modal/toast만 남기고 도메인 UI를 import해 조립. `GongguMateApp.tsx`는 얇은 wrapper로.

**분리 원칙:** `shared`에는 도메인 의미 없는 UI/포맷터/테마만. 각 도메인 폴더엔 그 도메인의 화면·훅·서비스·유틸·타입.

---

## 7단계: 최소 테스트 (순수 로직부터)

- [ ] `jest`가 TS/RN 테스트를 돌리도록 설정 (`jest-expo` preset 또는 `ts-jest` — **이 단계 유일한 변수**, 첫 1개 돌리는 데 설정 시간 소요 가능)
- [ ] 단가 계산: `ceil(totalPrice / totalQuantity)`
- [ ] 남은 수량 계산
- [ ] 모집 완료 상태 계산 (`claimedQuantity >= totalQuantity`)
- [ ] 참여 수량이 남은 수량을 초과할 때 막는 가드
- [ ] `gongguToUi` 변환 결과 (필드 매핑)
- [ ] 완료 조건: `npm --prefix apps/mobile run test`가 **실제 테스트를 실행·통과**. `--passWithNoTests` 의존 탈출.

---

## 8단계: 문서 정리 (구조 확정 후)

- [ ] `README.md`, `docs/local-setup.md`, `firebase/setup.md`, `docs/qa/test-plan.md` 갱신
- [ ] 포함: 실제 실행 경로 `apps/mobile`, 루트 명령(`npm run web/ios/typecheck`), 데이터 모델 기준, MVP에서 mock/POC vs 실연동 구분, 다음 단계 TODO
- [ ] 구경로 잔재 정리 (`04_app_react_native/app` 등)

## 9단계: 최종 검증

- [ ] `npm run typecheck`
- [ ] `npm run functions:build`
- [ ] `npm --prefix apps/mobile run test`
- [ ] `npm run web` 실행 확인

## 남은 MVP 리스크 (추적)

- [ ] `firestore.rules`의 죽은 `gonggus/{id}/participants` 서브컬렉션 블록 제거 + POC 완화 규칙 강화 계획
- [ ] Phase 2: 콜러블(`joinGonggu`/`confirmPickup`/`submitReview`)을 authoritative mutation으로 실제 연동
