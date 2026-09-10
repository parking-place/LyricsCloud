# LyricsCloud 개발 상태

```yaml
current_version: "1.0.2"
current_phase: "../2.Patch-phase/1.0.2/5phase.md"
state: "review"
owner: "Codex"
started_at: "2026-09-09"
updated_at: "2026-09-10"
next_action: "1.0.2 P1~P5 후보 인수 완료. 별도 현재 release go/no-go 승인 전까지 main·정식 image·릴리스 서버를 변경하지 않는다"
```

## 승인과 기준

2026-09-10 사용자가 다음 버전의 마지막 Phase까지 실행하도록 지시했다. 현재 범위는 1.0.2 P1~P5와 Phase별 개발 서버 인수이며, 계획에 명시된 별도 gate에 따라 main 병합·정식 Release 별칭·릴리스 서버 변경은 포함하지 않는다.

2026-09-09 사용자가 1.0.1 계획의 모든 Phase 실행과 전체 완료 후 릴리스 서버 배포를 승인했다. `ADR-NF-001`, `PROD-NF-001`, `OPS-NF-001`의 권장 대안을 Accepted로 확정했다. 릴리스 서버 변경 권한은 P1~P10 완료와 최종 후보 검증 뒤에만 소비하며, 그 전에는 Phase별 개발 서버 인수만 수행한다.

사용자가 1.0.1 이전의 1.0.0 P6 안정화와 GitHub 반영을 승인했다. 착수 기준 SHA는 `9e362f60f183b6adedfe358554b077334645ed0c`, 당시 전용 브랜치는 `phase/1.0.0-p6-stabilization`이다. 2026-09-09 사용자가 PR #11을 P5에 병합하고 원격 P6 브랜치를 삭제했다. 현재 병합 기준 `7c3930b5bc2be4f25f8f7586b7ce3f02b039af99`는 후보 `405e535`와 동일 tree다. 후보 CI 통과와 별개로 병합 CI의 performance round CV 실패는 조사 중이며, [인수 출발점](../2.Patch-phase/CODEX-HANDOFF.md)에 증거를 연결했다. 운영 배포·정식 태그 재발행·다른 개발자의 작업 덮어쓰기는 승인에 포함하지 않는다.

## 기존 기록 보존

P5 당시 STATUS 전체는 [STATUS-1.0.0-P5.md](./STATUS-1.0.0-P5.md)에 **원본 blob `5492cb6eececa27ac9202eedb5aeb0a108f00286` 그대로** 보존했다. 모든 버전 진행표·승인·활성 작업 이력·완료 기록을 삭제하지 않고 같은 디렉터리로 옮겨 상대 링크를 유지한다. 현재 상태와 과거 증거를 분리하기 위한 변경이며 P1~P5 완료 기록을 소급 변경하지 않는다.

## 진행표

| 범위 | 상태 | 근거 |
|---|---|---|
| 0.0.0~1.0.0 P5 | 당시 완료 기록 보존 | 위 원본 STATUS와 기존 Phase 문서 |
| 1.0.0 P6 | review | 일부 코드 후보·격리 회귀, 전체 인수 미완료 |
| 1.0.1 P1 | 완료 | 사용자 재현·최초 손실 경계·베타/가입/릴리스 계약 확정 |
| 1.0.1 P2 | complete | `0900`·CLI·관리 컨테이너와 동일 SHA 개발 인수 완료 |
| 1.0.1 P3 | complete | 환경별 HMAC 이행·암호화 rollback·key rotation과 동일 SHA 개발 인수 완료 |
| 1.0.1 P4 | complete | 실제 Google 신규 가입·원자 code 소비·grant와 동일 SHA 개발 인수 완료 |
| 1.0.1 P5 | complete | Windows Chrome·Edge 실제 IME와 동일 SHA 개발 저장 무손실 인수 완료 |
| 1.0.1 P6 | complete | 동일 SHA 공개 light/dark·새 가사·연결 관리·모바일/rail 인수 완료 |
| 1.0.1 P7 | complete | 주 로고·아이콘 자산군과 runtime/health 공통 build metadata 공개 인수 완료 |
| 1.0.1 P8 | complete | README·현재 문서·1.0.1 runtime·가변 Phase와 dev/release tag 격리의 동일 SHA 개발 인수 완료 |
| 1.0.1 P9 | complete | 전체 브라우저·DB 경쟁·production image·복원·rollback·성능과 동일 SHA 개발 인수 완료 |
| 1.0.1 P10 | complete | 최종 후보 전체 CI·네 dev image·동일 SHA 개발 공개 인수 완료, 승인된 release 실행 gate 개방 |
| 1.0.2 P1 | complete | v1.0.1 source 조사·수용 입력표·호환/rollback·파일 담당 경계를 설계-only로 고정 |
| 1.0.2 P2 | complete | 가입 응답 유실 멱등·volatile 저장 이탈 guard·build별 PWA 경계와 동일 SHA 개발 인수 완료 |
| 1.0.2 P3 | complete | 저장 실패 exact-copy·가입 로그인/재시도/취소·PC/mobile 50건과 동일 SHA 개발 인수 완료 |
| 1.0.2 P4 | complete | 네 수용 사례·실제 PostgreSQL·267건 전체 E2E·5-browser·production restart·동일 SHA 개발 인수 완료 |
| 1.0.2 P5 | complete | Actions 전체 verify·네 dev image·동일 SHA 개발 공개 인수와 후속 연결 완료 |

## 활성 작업

| 담당자 | 버전/Phase | 작업 ID | 수정 경로 | 의존성 | 시작 시각 | 상태 |
|---|---|---|---|---|---|---|
| Codex | 1.0.2/P5 | LC-NF-1.0.2-P5-01~06 | 요구 추적·현재 문서·최종 CI·동일 SHA 개발 인수·후속 연결 | P4 동일 SHA 개발 인수 | 2026-09-10T13:07:30+09:00 | complete |
| Codex | 1.0.2/P4 | LC-NF-1.0.2-P4-01~06 | 가입 응답 유실·저장/PWA·계정·재접속·서버 재시작 교차 회귀 | P3 동일 SHA 개발 인수 | 2026-09-10T12:42:00+09:00 | complete |
| Codex | 1.0.2/P3 | LC-NF-1.0.2-P3-01~06 | 저장·가입 안내·복구 경로·작은 화면·PC/mobile 회귀 | P2 동일 SHA 개발 인수 | 2026-09-10T12:23:38+09:00 | complete |
| Codex | 1.0.2/P2 | LC-NF-1.0.2-P2-01~06 | 실패 fixture·가입 멱등·저장 guard·build별 PWA·CLI/schema 회귀 | P1 설계-only 계약 | 2026-09-10T12:03:37+09:00 | complete |
| Codex | 1.0.2/P1 | LC-NF-1.0.2-P1-01~06 | 안정화 계약·관련 구현/테스트 조사·담당 경계·인수 문서 | v1.0.1 main/release `194dc4217e5a45e9e55c82c43e30afffcb5e1984` | 2026-09-10T11:57:03+09:00 | complete |
| Codex | 1.0.1/P10 | LC-NF-1.0.1-P10-01~06 | 요구 추적·최종 CI·release manifest·main/image/운영 배포 | P9 동일 SHA 개발 인수 | 2026-09-10 | complete |
| Codex | 1.0.1/P9 | LC-NF-1.0.1-P9-01~05 | 통합 회귀·DB 경쟁·image/secret·backup/restore·성능 | P8 동일 SHA 개발 인수 | 2026-09-10 | complete |
| Codex | 1.0.1/P8 | LC-NF-1.0.1-P8-01~04 | README·현재 문서·version·release tooling | P7 공개 brand/build metadata 인수 | 2026-09-10 | complete |
| Codex | 1.0.1/P7 | LC-NF-1.0.1-P7-01~03 | public logo/icon 자산·navigation·build metadata | P6 공개 양 테마 UI 인수 | 2026-09-10 | complete |
| Codex | 1.0.1/P6 | LC-NF-1.0.1-P6-01~03 | web components·공통 UI·스타일·portal | P5 Windows 실제 IME·공개 개발 HTTPS | 2026-09-10 | complete |
| Codex | 1.0.1/P5 | LC-NF-1.0.1-P5-01~05 | lyric editor IME·저장 drain·재진입 복구 | P4 실제 Google 가입·기존 P6 회귀 | 2026-09-09 | complete |
| Codex | 1.0.1/P4 | LC-NF-1.0.1-P4-01~05 | signup UI·OIDC callback·auth/DB grant | P3 HMAC bootstrap·0900 상태 | 2026-09-09 | complete |
| Codex | 1.0.1/P3 | LC-NF-1.0.1-P3-01~03 | test-user reader/import·config·키 운영 runbook | P2 환경·키 계약 | 2026-09-09 | complete |
| Codex | 1.0.1/P2 | LC-NF-1.0.1-P2-01~05 | 관리 CLI·auth/DB 코드 상태·설치 경로 | P1 Accepted 계약·PostgreSQL | 2026-09-09 | complete |
| Codex | 1.0.1/P1 | LC-NF-1.0.1-P1-01~08 | 계약·인수 문서, editor/auth/UI 원인 경로 | P6 회귀·실제 Windows IME·공개 개발 HTTPS | 2026-09-09T17:55:11+09:00 | complete |
| ChatGPT | 1.0.0/P6 | LC-100-P6-01, LC-100-P6-04, LC-100-P6-05, LC-100-P6-06 | CI·scripts·backup·observability·export·settings·P6 문서 | 별도 DB/브라우저 및 원격 CI 검증 | 2026-09-09 | review |
| Codex | 1.0.0/P6 | LC-100-P6-01, LC-100-P6-03, LC-100-P6-04, LC-100-P6-08 | CI·Compose·기동 검증·탈퇴 E2E·초안/PWA·P6 인계 문서 | Chromium/DB 회귀 및 로컬 5개 서비스 확인, 원격 CI·실제 환경 인수 | 2026-09-09 | review |
| Astra (astra_worker, 문서 단일 작성자) | 1.0.0/P6 인계·1.0.1 P1 준비 | LC-100-P6-08 | 0.Plans/2.Patch-phase·docs/adr/product/operations/planning·문서 색인·Agent/AGENTS | 문서 인계: 29버전·제품150 Phase+UX5·846 task·요구48, 원래730 task와 후보129 체크/설명/예시 보존. 문서 validator PASS(686 MD/15화면), 범위 링크/ID 검사 이상 없음. 원본 193파일/ZIP SHA256 일치는 부모 확인, 재승인 삭제도 자동 검토 blocked by policy로 거부되어 원본/백업 보존·commit 제외. 구현/원격 작업은 부모 인수 | 2026-09-09 | review |

## 인계

1.0.1 P1의 자동 P6 감사 100건과 개발 서버·공개 live/ready/auth 기준은 [P1 인수 기록](../../docs/runbooks/1.0.1-phase1-intake.md)에 연결했다. 사용자 PC의 기존 Compose는 healthy지만 앱 `0.7.0`·schema `0701_recent_searches.sql`로 오래되어 현재 결함 판정에서 제외했고, source 갱신 전 DB custom archive와 목록 판독을 확인했다. 사용자가 실제 Windows 입력·재진입 손실과 `+ 새 가사`·`연결 관리` 테마 오류 화면을 제출했다. 최초 손실 경계는 이탈 시 취소되는 지연 composition commit, 테마 원인은 정의되지 않은 `primary-button` selector로 판정했다. P5 후보 `fa06b0ba1c74c314345dbe4eb2fb873ca1d7cb00`의 공개 서버 영구 저장 smoke와 Windows Chrome·Edge 실제 입력이 PASS였다. 양 테마·버튼은 P6에서 같은 후보 SHA로 닫는다.

[현재 Phase](./1.0.0/6phase.md), [검증 수준과 잔여 사항](../../docs/runbooks/1.0.0-phase6-stabilization.md)을 따른다. REVIEW-01~05·07·10의 초안·재시도·취소·템플릿·PWA 경로를 수정했으며 Chromium PC/모바일 회귀와 기존 복구 흐름을 확인했다. 전체 의미 기반 품질/성능/의존성 감사와 실제 기기 인수는 미완료다. 미해결 P0/P1을 0으로 선언하지 않는다.

사용자 요청에 따라 GitHub P6를 사용자 PC로 가져왔다. `.change`의 30개 경로/blob이 원격 후보와 일치함을 확인한 뒤 허가된 폴더만 삭제했다. 로컬 Docker 갱신은 기존 PostgreSQL 볼륨과 비공개 설정을 보존하며 DB 백업 후 진행한다. 공용 개발/운영 서버와 향후 버전 계획은 이번 PC 작업 대상이 아니다.

로컬은 `lyricscloud-local` 한 그룹의 postgres·web·collaboration·worker가 healthy이고 migrate가 exit 0이다. 임시 컨테이너는 제거했으며 live/ready·인증 화면·정적 asset·Google OAuth 시작을 확인했다. PC도 production 웹 빌드를 사용하며, 기존 HTTP OAuth 주소는 명시적인 loopback 전용 opt-in으로 유지한다. 공용/LAN origin은 여전히 HTTPS가 필수다. 실제 로그인 완료는 사용자가 기존 브라우저에서 확인한다.

P6 push 자동 발행은 차단하며 수동 candidate도 공용 tag를 변경하지 않는다. 기존 `v1.0.0`, release manifest, migration, lockfile은 보존한다. `OPS-100-001` 운영 외부 백업 미구축은 별도 승인·실제 복원 인수까지 계속 열려 있다.

P8 구현 후보 `17aa226abe48acee9642d6c539809b915362a28e`은 원격 PR #20과 개발 서버 checkout·build metadata가 일치한다. 공개 ready는 `1.0.1`, channel `dev`, phase `p8`, schema `0901_beta_signup.sql`을 반환했고 postgres·web·collaboration·worker가 모두 healthy였다. dev 발행에서 숫자·Release 계열을 제외하고 승인 tag release에서만 `Release`·`latest`·`Release-latest`를 같은 서비스 build에 묶는 30개 경계 검사를 통과했다. 필수 원격 통합 CI는 저장소 정책대로 P10 후보에서 실행한다.

P9 구현 후보 `565ed50335197855b7d3c14f3ea9e5519e1f838f`는 unit·실제 PostgreSQL integration 250건, 순차 브라우저 회귀 263건과 의도적 제외 31건, release browser matrix, production image·암호화 복원·upgrade/rollback·secret·취약점·관측·성능 예산을 통과했다. 인수 기록을 포함한 `3b05a34468874877043b3c36abdacf216a092565`는 원격 PR #21·개발 서버 checkout·공개 build metadata와 일치하며 channel `dev`, phase `p9`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. `OPS-100-001`은 사용자의 현재 위험 승인 예외로 계속 열어 둔다.

P10 후보 `869e32b8a15c2e1e7524a75ab4d8b4428a925c79`는 원격 CI run `34394222604`의 전체 verify와 네 dev image 발행을 통과했다. 개발 서버 checkout/build metadata가 같은 SHA였고 `1.0.1`, channel `dev`, phase `p10`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. 공개 합성 smoke에서 가사·라임·프롬프트 즉시 이탈·재진입 저장, light/dark의 `＋ 새 가사`·`연결 관리`, 테마 저장, 키보드/focus, 320/390px 모바일, CSP·CSS·service worker가 PASS였고 합성 자료를 제거했다. 사용자 확인 `P4 Google signup PASS`, `P5 Windows Chrome PASS, Edge PASS`, `iOS update PASS, Android update PASS`를 실제 환경 증거로 동결했다. P10은 완료됐으며 사용자가 승인한 main·정식 image·릴리스 서버 실행으로 이동한다. `OPS-100-001`은 명시적 예외로 계속 열려 있다.

1.0.2 P2 구현 후보 `4a8dd97562fe0d1ac400b1799aacbced3285eabf`는 Node 24 unit/typecheck/build, PostgreSQL 18 가입 멱등·관리 CLI·fresh/repeat migration, desktop/mobile Chromium 38건을 통과했다. 원격 PR #24와 개발 서버 checkout/build metadata가 일치했고 공개 live·ready·auth HTTP 200, version `1.0.2`, channel `dev`, phase `p2`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. 완료 문서 자체를 포함한 최종 commit은 동일 절차로 재배포하고 정확한 SHA를 비공개 서버 인벤토리에 남긴다. 중간 원격 CI는 정책대로 생략했으며 필수 전체 CI는 P5 최종 후보에서 실행한다.

1.0.2 P3 후보 `8d01441b6043898ef83745b307fc7f4e814c2a72`는 Node 24 check·production build와 desktop/mobile Chromium의 새 수용 4건·인증/가사/라임 46건을 통과했다. 원격 PR #25와 개발 서버 checkout/build metadata가 일치했고 공개 live·ready·auth·정적 경로, version `1.0.2`, channel `dev`, phase `p3`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. 공개 가입 오류 복귀 동선도 합성 query로 확인했으며 실제 사용자 자료는 사용하지 않았다.

1.0.2 P4 후보 `f67cc3a22168a3f7adfd774604b7c877c03a85c3`는 PostgreSQL 18 migration 2회·unit/integration 248건·beta 4건·관리 CLI, Chromium desktop/mobile 전체 267건과 의도적 31 skip, Chromium/Firefox/WebKit 5-project 10건을 통과했다. 네 production image에서 DB·collaboration 재시작과 durable pending projection·중복 ACK·복원·owner-only logout이 PASS였다. 원격 PR #26과 개발 서버 checkout/build metadata가 일치했고 공개 version `1.0.2`, channel `dev`, phase `p4`, schema `0901_beta_signup.sql`, 네 서비스 healthy였다.

1.0.2 P5 후보 `8d55ddc2a5b2383bc7388a248bb7d66f13a5bd0b`는 GitHub Actions run `34436900678`의 전체 verify와 web·collaboration·migrate·worker 개발 image 게시를 통과했다. 원격 PR #27과 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.2`, channel `dev`, phase `p5`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. `/auth`, production 정적 asset, CSP·private no-store·nosniff가 PASS했고 Docker 정리 뒤 volume과 실행 서비스를 보존했다. P1~P5 후보 인수는 완료됐으며 `main`·`v1.0.2`·정식 image 별칭·릴리스 서버는 별도 현재 go/no-go까지 변경하지 않는다.
