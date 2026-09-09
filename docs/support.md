# LyricsCloud 1.0.1 지원 정책

## 지원 환경

| 대상 | 최소 지원 |
|---|---|
| Chrome / Edge desktop | Chromium 계열 111+, Windows 11 또는 지원 중인 macOS |
| Firefox desktop | Firefox 111+, Windows 11 또는 지원 중인 macOS |
| Safari desktop | Safari 16.4+, 지원 중인 macOS |
| iPhone / iPad | iOS/iPadOS 16.4+ Safari, 브라우저 탭 또는 홈 화면 설치본 |
| Android | Android 12+ Chrome 111+, 브라우저 탭 또는 설치본 |

자동 Chromium·Firefox·WebKit 검사는 엔진 회귀 기준이며 실제 Safari 자체를 대신하지 않는다. 실제 iOS/Android 설치·한글 IME·offline·update·logout은 사용자 인수에서 PASS했지만 기종·OS·브라우저 세부 버전은 제공되지 않았다.

## 알려진 제한

| ID | 등급 | 현재 경계 | 후속 |
|---|---|---|---|
| `RC-091-001` | 해소 | 1.0.1 P9에서 Yjs 13.6.32 직접 소비를 단일화했고 production build 경고가 사라짐 | 장문·동기화·offline·restore 회귀를 계속 유지 |
| `RC-100-001` | P2 운영 제한 | 인증·검색·export rate limiter는 단일 web replica 메모리 경계 | scale-out 전에 공용 limiter 도입 |
| `RC-091-002` | P3 증거 품질 | 실제 iOS/Android 결과는 PASS지만 상세 기기 정보가 없음 | 다음 실제 기기 인수 때 버전 기록 |
| `OPS-100-001` | 운영 위험 | 공식 릴리스 서버의 외부 암호화 backup·24시간 RPO·복원 훈련은 사용자의 현재 승인 예외로 미구축이며 호스트 손실 복구 지점을 보장하지 않음 | 후속 운영 작업에서 구축·훈련; 그 전 각 릴리스 기록에 위험 재기재 |

1.0.1 P4 실제 Google 신규 가입, P5 Windows Chrome·Edge 한글 IME 저장·재진입, P6 light/dark 핵심 action, P7 로고·runtime metadata 인수는 완료됐다. 자동 브라우저와 사용자 실기기 결과는 서로 구분해 보존한다.

미해결 P0/P1은 0건이다. 저장 수렴 실패, 다른 사용자의 자료 노출, 인증 우회, 핵심 모바일 불능, 복구 불가능 증거가 생기면 즉시 P0/P1으로 재분류하고 배포를 중단한다.

## 문제 보고

일반 사용 문제는 GitHub Issue에 버전, build SHA, 브라우저·OS, 재현 단계, 화면에 표시된 익명 error code와 `requestId`만 적는다. 실제 제목·가사·라임·프롬프트·검색어·이메일·cookie·OAuth code·token·DB URL·내보내기/backup 파일은 첨부하지 않는다.

보안 취약점과 교차 사용자 노출 의심은 공개 Issue를 만들지 말고 [보안 정책](../SECURITY.md)의 비공개 경로로 보고한다. 서비스 장애 대응은 [관측 경보 runbook](./runbooks/observability-alerts.md), 배포 복구는 [upgrade·rollback runbook](./runbooks/backup-restore-upgrade.md)을 따른다.
