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
- [x] **6-0 유틸 먼저 추출**: `fmt`/`unitPrice`/`qtyStr`/`barPct`/`remain`/`statusOf`/`gongguToUi` → `domains/gonggu/utils.ts`. 색 보간 유틸(`TEMP_STOPS`/`gradientColor`) → `shared/utils/color.ts`. `relativeTime` → `shared/utils/time.ts`. 공용 아이콘 → `shared/ui/icons.tsx`.
- [x] **6-1 gonggu**: `Deal` 타입, `DealCard`, `HomeScreen`, `DetailScreen`, `CreateScreen`, `JoinSheet`, `useFirestoreData`, `gongguRepository`, `participationRepository`
- [x] **6-2 chat**: `ChatListScreen`, `ChatScreen`, `ChatMsg`, `chatMsgFromDomain`, `SEED_MSGS`, `useChatMessages`, `chatRepository`
- [x] **6-3 notifications**: `NotifScreen`, `notificationService`, `NotifKey`/`NotifItem`/`NOTIF_ITEMS`/`TYPE_LABEL`
- [ ] **6-4 location**: `VerifyScreen`(완료) — **남음**: `verifyNeighborhood` 서비스를 `services/location` → `domains/location/services`로 이동
- [x] **6-5 auth**: `LoginScreen`, `useFirebaseAuth`, `useGoogleSignIn`, auth service
- [x] **6-6 map**: `MapScreen`, `mapPos`
- [x] **6-7 review**: `ReviewScreen`, `REVIEW_QUESTIONS`, `ReviewKey` (제출 로직 `submitReviewDoc`은 participationRepository 유지)
- [x] **6-8 mypage**: `MyPageScreen`(+`StatCard`/`ReviewTag`), `Toggle`(→shared/ui)
- [ ] **6-9 app/AppShell.tsx**: **남음** — 아래 "남은 작업" 참고. 현재 `BottomNav`/`ConfirmSheet`는 분리 완료, 루트 오케스트레이터(state·handler·effect)는 아직 `shell/GongguMateApp.tsx`(≈720줄)에 있고 `app/AppShell.tsx`는 이를 감싸는 wrapper.

**분리 원칙:** `shared`에는 도메인 의미 없는 UI/포맷터/테마만. 각 도메인 폴더엔 그 도메인의 화면·훅·서비스·유틸·타입.

---

## 진행 현황 (2026-07-02 기준, 브랜치 `refac/GongguMateApp`)

`GongguMateApp.tsx`는 3,362줄 → **약 720줄**(루트 오케스트레이터만 남음)로 축소됨. 매 단계 `npm run typecheck` 통과 후 커밋. 완료 커밋: 앱 셸 스캐폴딩 → chat → map → review → notifications → 공용 바/색 유틸 → mypage → BottomNav·ConfirmSheet → auth 이동 → gonggu 데이터 이동.

### 확정된 구조 결정
- `Deal` 타입은 `domains/gonggu/types.ts`. chat/map/review/notifications가 여기서 import (gonggu = 핵심 도메인).
- `services/firebase/client.ts`, `services/mock/seed.ts`는 **도메인 무관 인프라로 현 위치 유지**.
- `appStyles`는 아직 `shell/appStyles.ts`에 있고 모든 컴포넌트가 `shell/appStyles`로 import 중 → 6-9에서 `shared/ui/appStyles.ts`로 이동 예정.
- `ProgressBar`/`TemperatureGradientBar`/`Toggle`/`EmptyState`/`ConfirmSheet` → `shared/ui`. `BottomNav` → `app/components`.

### 남은 작업 (다음 세션에서 이어서)
1. **6-4 잔여**: `git mv services/location/verifyNeighborhood.ts → domains/location/services/`, 루트 import 경로(`../services/location/...` → `../domains/location/services/...`) 갱신. verifyNeighborhood를 쓰는 곳은 루트뿐.
2. **미사용 파일 제거**: `services/mock/mockRepository.ts` (import 하는 곳 없음). 제거 후 빈 `services/mock`은 seed.ts만 남음.
3. **6-9 AppShell 흡수 (핵심 마무리)**:
   - `shell/GongguMateApp.tsx`의 루트 컴포넌트(state·파생데이터·handler·effect·render 스위치)를 `app/AppShell.tsx`로 이동, `export function AppShell()`가 실제 조립자가 되도록. 모든 화면을 도메인에서 import (이미 대부분 import 형태라 본문 이동만 하면 됨).
   - `shell/appStyles.ts → shared/ui/appStyles.ts` 이동 + 전 파일 import 경로(`../../shell/appStyles`, `../../../shell/appStyles`, `./appStyles`) 일괄 갱신. **주의**: import 경로 대소문자 — Windows는 관대하나 번들러/CI는 엄격.
   - `shell/GongguMateApp.tsx` 삭제, `shell/` 폴더 제거 (App.tsx는 이미 `app/AppShell` 사용).
4. **버그 수정 (Bug1, 리팩토링과 독립)**: `domains/auth/hooks/useFirebaseAuth.ts`의 `signInGoogle()`이 Firebase 미설정 시 조용히 return → 안내 메시지 노출로 변경. 미설정 시 `setState({ status: "disabled", user: null, error: "Firebase 설정이 필요해요. apps/mobile/.env 설정 후 Google 로그인을 사용할 수 있어요." })`. LoginScreen이 이미 `auth.error`를 인라인 렌더하므로 UI 변경 불필요. `Alert.alert` 금지(웹 no-op). **Bug2(공구 생성 거짓 성공)는 커밋 `1f4f0ca`에서 이미 수정됨.**
5. **검증 게이트**: `npm run typecheck` + `npm run functions:build` + `npm --prefix apps/mobile run test` + `npm run export:web` + 시드 모드 런타임 스모크(로그인→둘러보기→홈/상세/지도/채팅/마이, Google 버튼 안내 표시).

### 정리한 부채
- `EmptyState` 중복 제거(HomeScreen 로컬 복사본 → shared/ui 통합) 완료.
- gonggu/utils에 섞여 있던 색 보간 유틸을 shared/utils/color로 분리 완료.
- **아직 남은 중복**: `HomeScreen.tsx`에 로컬 `SearchIcon`이 있음(shared/ui/icons의 것과 중복). gonggu 내부 정리 시 통합 검토.

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
