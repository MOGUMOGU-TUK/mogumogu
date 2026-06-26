# 프론트엔드 핸드오프 — 디자인 개편 가이드

> 디자인을 새로 입히는 프론트 팀원이 **시작 전 숙지**할 문서. 핵심 원칙: **UI는 갈아엎고, 데이터 계층은 그대로 재사용한다.**

---

## 0. 한 줄 요약

화면(UI)은 전부 새로 그려도 되지만, **Firebase 연동 로직(훅·리포지토리·타입)은 이미 완성돼 있으니 `import` 해서 쓰기만 하면 된다.** 데이터를 직접 `firebase/firestore`에서 새로 부르지 말 것.

---

## 1. 무엇을 바꾸고, 무엇을 유지하나

### 🔴 갈아엎는 것 (UI)
- `apps/mobile/src/shell/GongguMateApp.tsx` — **현재 1368줄 단일 파일**에 모든 화면이 들어있음. 통째로 대체 대상.
- `apps/mobile/src/shared/theme/colors.ts` — 현재 그린 테마. 새 디자인(핑크 `#F7A1B5`)에 맞게 교체.
- 모든 화면 컴포넌트 / 스타일.

### 🟢 유지·재사용 (절대 다시 만들지 말 것)
| 경로 | 역할 |
|------|------|
| `services/firebase/client.ts` | Firebase 초기화 (`.env` 읽음) |
| `services/firebase/auth.ts` | 익명/Google 로그인 |
| `services/firebase/gongguRepository.ts` | 공구 구독/생성 |
| `services/firebase/participationRepository.ts` | 참여/취소/픽업/후기/정산 |
| `services/firebase/chatRepository.ts` | 채팅 구독/전송 |
| `features/auth/useFirebaseAuth.ts` | 인증 상태 훅 |
| `features/data/useFirestoreData.ts` | 공구+참여+정산+후기 통합 구독 훅 |
| `features/chat/useChatMessages.ts` | 채팅 구독 훅 |
| `types/domain.ts` | 도메인 타입(공구/참여/정산/후기/메시지/유저) |
| `services/mock/*` | Firebase 미설정 시 폴백 + 헬퍼 |

> 이 계층은 모두 `tuk-hp` Firebase 프로젝트에 **실연결·검증 완료** 상태다. UI만 새로 그리면 된다.

---

## 2. 데이터 연동 계약 (이 API에 맞춰 화면을 만든다)

### 인증 — `useFirebaseAuth()`
```ts
const auth = useFirebaseAuth();
// auth.status : "disabled" | "loading" | "signed_out" | "signed_in" | "error"
// auth.user   : { uid, isAnonymous, displayName, email, photoURL } | null
// auth.error  : string | null
// auth.signIn()       : 익명 로그인(배경 세션)
// auth.signInGoogle() : Google 로그인 (⚠️ 현재 웹 전용)
```

### 데이터 — `useFirestoreData()`
```ts
const data = useFirestoreData();
// data.gonggus        : Gonggu[]
// data.participations : Participation[]
// data.settlements    : Settlement[]
// data.reviews        : Review[]
// data.source         : "firestore" | "seed" | "loading"  (출처 표시용)
```
→ **실시간 구독**이라 다른 사용자가 바꾸면 자동 갱신된다.

### 채팅 — `useChatMessages(gongguId)`
```ts
const messages = useChatMessages(gonggu.id); // ChatMessage[] | null  (null = 미설정 폴백)
```

### 쓰기 함수 (services/firebase)
```ts
createGongguDoc(input, host): Promise<string>   // input: {title,totalPrice,targetParticipants,pickupPlaceName,pickupExpectedTime}
joinGongguDoc(gongguId, user): Promise<void>
cancelParticipationDoc(gongguId, userId): Promise<void>
confirmPickupDoc(gongguId, userId): Promise<void>
submitReviewDoc(gonggu, reviewer, rating, comment): Promise<void>
sendMessageDoc(gongguId, sender, text): Promise<void>
```
→ 전부 `Promise`. 실패 대비 `try/catch` 또는 `.catch()`로 사용자 알림 처리.

### 헬퍼 (services/mock/mockRepository.ts — 순수 함수)
```ts
getCurrentUser(snapshot): User
getPricePerPerson(gonggu): number      // 1인 금액 계산
findParticipation(snapshot, gongguId, userId)
```

---

## 3. 화면 ↔ 데이터 매핑 (재설계 시 참고)

| 화면 | 쓰는 훅/함수 |
|------|-------------|
| 로그인 | `useFirebaseAuth` → `signInGoogle()` / `signIn()`, `user`, `status` |
| 동네 인증 | (현재 mock 단계 — 위치 인증 로직 미구현) |
| 홈(공구 리스트) | `useFirestoreData().gonggus`, `.source` |
| 공구 생성 | `createGongguDoc(input, currentUser)` |
| 공구 상세 | `gonggus`에서 선택, `joinGongguDoc`/`cancelParticipationDoc`/`confirmPickupDoc`, `findParticipation` |
| 채팅 | `useChatMessages(gongguId)`, `sendMessageDoc` |
| 정산 | `useFirestoreData().settlements`, `.participations` |
| 후기 | `submitReviewDoc(gonggu, currentUser, rating, comment)` |
| 프로필 | `getCurrentUser(snapshot)` (⚠️ 아직 mock "민준") |

---

## 4. 도메인 타입 (`types/domain.ts` 참조)

`User`, `Gonggu`, `Participation`, `Settlement`, `Review`, `ChatMessage` 와 상태 enum
(`GongguStatus`, `ParticipationStatus`, `SettlementStatus`, `PaymentStatus`).
**새 컴포넌트는 이 타입을 import 해서 props로 받는다.** 타입을 새로 만들지 말 것.

---

## 5. 개발 환경 셋업

```bash
# 1. 클론 후 의존성
bun install            # (루트) 또는: cd apps/mobile && npm install

# 2. 환경 변수 (⚠️ .env 는 git에 없음 — 직접 만들어야 함)
cp apps/mobile/.env.example apps/mobile/.env
#   → Firebase 콘솔(프로젝트 tuk-hp) > 프로젝트 설정 > 웹 앱 config 값을 채우거나
#     팀 리더에게 .env 값을 안전하게 전달받는다. (Slack/DM 등, git 커밋 금지)

# 3. 실행 (루트에서)
npm run web      # 브라우저 (가장 빠름)
npm run ios      # iOS 시뮬레이터
npm run start    # Expo Go QR

# 4. (선택) Firestore 데모 데이터 시드 — 비어있을 때 1회
npm run firebase:seed
```

> `.env` 없이 실행하면 앱이 **자동으로 mock/seed 데이터로 폴백**되어 그냥 돌아간다. 실데이터를 보려면 `.env` 필수.

---

## 6. 프로젝트 구조

```
apps/mobile/src/
├── shell/      # 앱 진입/화면 조립 (← 재설계 핵심 대상)
├── features/   # 기능별 훅 (auth, data, chat) — 재사용
├── entities/   # (비어있음, 도메인 엔티티용)
├── shared/     # theme(colors), ui(format 등) — theme 교체
├── services/   # firebase/*, mock/* — 재사용
└── types/      # domain.ts — 재사용
```

---

## 7. ⚠️ 주의사항

- **`.env` 절대 커밋 금지** (`.gitignore`에 이미 포함). Firebase 키 노출 위험.
- **Google 로그인은 현재 웹 전용.** 네이티브(iOS/Android)는 OAuth 추가 설정 필요 → 미구현. 네이티브에선 "게스트로 둘러보기"로 진입.
- **Firestore 보안 규칙이 POC용으로 완화돼 있음** (`firebase/firestore.rules`). 클라이언트가 직접 쓰는 구조라 **보안을 신뢰하면 안 됨.** 출시 전 Cloud Functions로 재조정 예정.
- **`currentUser`는 아직 mock "민준".** Google 로그인해도 화면 프로필은 mock. 실제 프로필 연동은 미정 작업.
- 데이터 훅의 **반환 형태(계약)를 바꾸지 말 것.** UI에서 형태가 부족하면 훅을 확장(추가 필드)하되, 기존 필드는 유지.

---

## 8. 재설계 권장 방향 (제안)

- **화면을 파일별로 분리**한다 (현재는 1파일에 다 있음). 예: `features/<기능>/screens/` 또는 `app/` 라우팅.
- **네비게이션 도입 검토** — 현재는 `useState`로 화면을 수동 전환. `expo-router` 또는 `react-navigation` 도입 시 데이터 훅은 그대로 두고 화면만 라우팅에 얹는다.
- **디자인 토큰을 `shared/theme`로 일원화** — 색/간격/타이포를 시안(핑크 `#F7A1B5` 계열)에 맞게 정의하고 전 화면이 참조.
- **각 화면 컴포넌트는 데이터 훅을 import해서 props 없이도 자기 데이터를 가져온다** (또는 상위에서 받아 내려도 됨). 핵심은 데이터 출처를 위 훅/리포지토리로 통일하는 것.

---

## 9. 협업 규칙 (README와 동일)

- 브랜치: `feat/<요약>`, `fix/<요약>`, `docs/<요약>`, `chore/<요약>`
- 커밋: Conventional Commits (`feat:`, `fix:`, `docs:` …)
- `main`에 직접 push 대신 PR로 머지.
- 디자인 산출물(시안 이미지 등)은 `docs/design/`에 둔다. (22MB짜리 단일 HTML보다 **주요 화면을 PNG로 export**해 올리는 걸 권장)
