# mogumogu

`mogumogu`는 위치 인증된 이웃끼리 공동구매를 모집하고, 참여·채팅·정산·픽업·후기까지 한 흐름으로 처리하는 React Native 앱입니다. 현재 단계는 mock 데이터 기반 POC입니다.

## 프로젝트 구조

```
mogumogu/
├── apps/
│   └── mobile/          # React Native + Expo 앱
├── firebase/            # Firebase 백엔드 (Functions, Firestore/Storage rules, emulator)
│   └── functions/       # Cloud Functions (TypeScript)
├── docs/
│   ├── planning/        # 기획
│   ├── requirements/    # 요구사항
│   ├── design/          # 디자인 (UI/UX 산출물)
│   ├── api/             # API 명세 (openapi.yaml)
│   ├── qa/              # 테스트 계획
│   ├── launch/          # 출시 준비
│   ├── growth/          # 그로스/지표
│   ├── architecture.md  # 아키텍처 개요
│   └── local-setup.md   # 로컬 개발 환경 설정
└── package.json         # 루트 스크립트 (워크스페이스 위임)
```

## 현재 POC 범위

- React Native + Expo + TypeScript 앱 골격
- Mock 로그인 / 위치 인증 mock
- 주변 공구 리스트, 지도 placeholder, 공구 상세
- 참여 / 참여 취소, 공구 채팅
- 정산 상태 mock, 픽업 완료
- 필수 후기 작성 후 지급 가능 상태 전환
- Firebase Functions / API 문서 골격

## Quick Start

```bash
# 저장소 루트에서
npm run ios      # iOS Simulator 실행
npm run start    # Expo Go QR 스캔용 개발 서버
npm run web      # 웹 프리뷰
```

앱 패키지를 직접 다루려면 `apps/mobile`에서 실행해도 됩니다.

```bash
cd apps/mobile
npm run start
```

### 루트 스크립트

| 스크립트 | 설명 |
|----------|------|
| `npm run ios` / `start` / `web` | 앱 실행 |
| `npm run typecheck` | 앱 타입 체크 |
| `npm run test` | 앱 테스트 |
| `npm run functions:build` | Cloud Functions 빌드 |
| `npm run functions:serve` | Functions 에뮬레이터 |

## 환경 변수 (Firebase)

`.env`는 **커밋하지 않습니다.** `apps/mobile/.env.example`을 복사해 값을 채우세요.

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Firebase config 발급 순서는 [firebase/setup.md](./firebase/setup.md)를 확인하세요.

## Notes

- Android Studio 없이도 Expo 개발 서버로 POC 확인이 가능합니다.
- FCM, Kakao Login, Naver Map처럼 네이티브 설정이 필요한 기능은 Expo development build 또는 EAS Build 단계에서 붙입니다.
- 실제 결제/보관금/자동 지급은 MVP에서 제외하고 상태 모델과 mock 흐름만 구현합니다.

## 협업 규칙

- `main`은 보호 브랜치입니다. 직접 push하지 않고 PR로 머지합니다.
- 브랜치 네이밍: `feat/<요약>`, `fix/<요약>`, `docs/<요약>`, `chore/<요약>`
- 커밋 메시지: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` …)
