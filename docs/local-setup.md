# 로컬 실행 가이드

## 요구 사항

- Node.js + npm
- (선택) 실기기 테스트용 Expo Go, 또는 웹 프리뷰
- Android Studio는 첫 POC엔 불필요. FCM·카카오 로그인·네이티브 지도 등은 이후 Expo dev build / EAS Build 단계에서.

## 실행 (루트에서)

실제 앱 코드는 [apps/mobile](../apps/mobile)에 있고, 루트 `package.json`이 `--prefix apps/mobile`로 감싼 스크립트를 제공합니다. **루트에서 실행하세요.**

```bash
npm install            # 루트 + apps/mobile 의존성
npm run web            # 웹 프리뷰 (가장 빠름)
npm run ios            # iOS 시뮬레이터
npm run typecheck      # tsc --noEmit
npm test               # jest 단위 테스트
```

## 환경 변수

`.env`는 커밋하지 않습니다. [apps/mobile/.env.example](../apps/mobile/.env.example)을 `apps/mobile/.env`로 복사해 채우세요.

- **Firebase config** (`EXPO_PUBLIC_FIREBASE_*`): 없으면 앱이 **시드(mock) 모드**로 폴백해 둘러보기만 가능. 있으면 로그인·공구·채팅·참여가 **실연동**됩니다.
- **카카오 REST API 키** (`EXPO_PUBLIC_KAKAO_REST_API_KEY`): **동네 인증(GPS 좌표 → 동네 이름 역지오코딩)에 필수**. 없으면 인증 단계에서 "카카오 REST API 키가 없어요" 안내가 뜹니다. 카카오 개발자 콘솔에서 **REST API 키**를 받아 넣고(JavaScript/Native 키와는 별개), **로컬 API 사용 설정**을 켜세요.

> `EXPO_PUBLIC_*` 값은 **번들 타임에 주입**됩니다. `.env`를 바꾸면 캐시를 지우고 재시작하세요: `npx expo start -c`.
> 웹에서는 카카오 REST API가 브라우저 CORS로 막힐 수 있어, 동네 인증은 네이티브(iOS/Android)에서 확인하는 것을 권장합니다.

자세한 Firebase 설정: [firebase/setup.md](../firebase/setup.md).

## POC(시드) 모드 vs 실연동

| 영역 | `.env` 없음 (시드) | Firebase 설정됨 (실연동) |
|---|---|---|
| 로그인 | 게스트/둘러보기 | 익명·Google 실연동 |
| 공구 목록·생성·참여 | 시드 데이터 | Firestore 실시간 |
| 채팅 | 시드 메시지 | Firestore 실시간 |
| 동네 인증 | GPS+카카오(REST 키 필요) | 동일 |
| 결제/에스크로 | 정산 상태만 표현 | 정산 상태만 표현 (실결제는 이후) |

## 남은 실연동 (Phase 2)

콜러블 Functions(`joinGonggu`/`confirmPickup`/`submitReview`)를 authoritative mutation으로 연결하는 작업이 남아 있습니다. 현재 참여·후기는 POC 규칙 완화로 클라이언트가 직접 씁니다.
