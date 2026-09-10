# LyricsCloud 개발 상태

```yaml
current_version: "1.0.7"
current_phase: "../2.Patch-phase/1.0.7/1phase.md"
state: "complete"
owner: "Codex"
started_at: "2026-09-11"
updated_at: "2026-09-11"
next_action: "1.0.7 P1 계약을 소비해 P2의 별도 보기 설정 저장소·API와 실패 우선 검증을 구현한다"
```

## 승인과 기준

2026-09-11 사용자가 1.0.14까지 모든 버전을 실행하고 각 버전을 개별 정식 릴리스하도록 명시적으로 승인했다. 현재 실행 범위는 1.0.6부터 1.0.14까지 각 버전의 계획된 Phase, Phase별 개발 서버 인수, 버전별 main 병합·annotated tag·정식 image·릴리스 서버 migrate/배포/공개 smoke다. 각 P1의 기존 권장안은 최초 소비 전에 범위·실패·복구 경계를 문서로 확정하며, 외부 제공 조건이 충족되지 않는 기능은 우회 구현하거나 완료로 가장하지 않는다. 기존 DB volume·secret과 사용자가 승인한 `OPS-100-001` 위험 예외를 보존한다.

1.0.5는 main/tag SHA `4411bc1eb74c90a6a1c47f7e3315de2d5ff39edb`, annotated tag `v1.0.5`, 정식 image와 릴리스 서버 동일 SHA 배포·공개 smoke까지 완료됐다.

2026-09-10 사용자가 선행 릴리스와 1.0.5 Phase 5까지의 실행 및 후속 정식 릴리스를 명시적으로 승인했다. 현재 선행 릴리스는 완료된 1.0.3 P1~P5를 main·annotated tag·정식 image·릴리스 서버에 반영하는 범위이며, 이후 1.0.5의 명시적 의존성인 1.0.4 P1~P5를 먼저 완료하고 1.0.5 P1~P5와 최종 릴리스를 수행한다. 기존 DB volume·secret과 `OPS-100-001` 위험 예외를 보존한다.

2026-09-10 사용자가 1.0.2 정식 릴리스 배포와 그 완료 뒤 1.0.3 P1~P5 실행을 명시적으로 승인했다. 1.0.2의 현재 승인 범위는 main 병합·annotated tag·정식 Docker image·릴리스 서버 migrate/배포/공개 smoke이며, 기존 DB volume·secret과 `OPS-100-001` 위험 예외를 보존한다.

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
| 1.0.3 P1 | complete | mode/raw 저장·구버전 capability·원자 projection·rollback·파일 담당 계약을 설계-only로 확정 |
| 1.0.3 P2 | complete | mode/raw schema·store·CRDT·복제/검색/내보내기·구버전 차단과 동일 SHA 개발 인수 완료 |
| 1.0.3 P3 | complete | PC·모바일 mode 선택·문장 raw·명시 변환/undo·revision v1/v2와 동일 SHA 개발 인수 완료 |
| 1.0.3 P4 | complete | 실제 PostgreSQL·Chromium/Firefox/WebKit·offline/두 탭/구버전/권한·collaboration 재시작과 동일 SHA 개발 인수 완료 |
| 1.0.3 P5 | complete | Actions 전체 verify·네 dev image 게시/서명·동일 SHA 개발 공개 인수와 후속 연결 완료 |
| 1.0.4 P1 | complete | U+002E lossless span·최종 payload code point·비차단 1,000자 경고·담당/rollback 계약을 설계-only로 확정 |
| 1.0.4 P2 | complete | lossless span parser·공통 final-payload code point/1,000자 안내 builder와 단위·장문 회귀 완료 |
| 1.0.4 P3 | complete | 목록·편집기·자료 패널의 lossless span·공통 길이/비차단 경고와 PC·모바일 Chromium 수용 흐름 완료 |
| 1.0.4 P4 | complete | 실제 PostgreSQL 263건·Chromium 279건·5-project 기능 10건과 권한·offline·재접속 회귀 완료 |
| 1.0.4 P5 | complete | Actions `34476629460` 전체 verify·네 dev image·동일 SHA 개발 공개 인수와 1.0.5 연결 완료 |
| 1.0.5 P1 | complete | 첫 콜론 주 이름·lossless suffix·최종 LF payload 3,000 code point 경고·호환/rollback 계약 확정 |
| 1.0.5 P2 | complete | 주 이름/suffix projection·반복 occurrence 안정성·최종 LF payload code point builder와 동일 SHA 개발 인수 완료 |
| 1.0.5 P3 | complete | 편집기/목차 suffix 저강조·전체 copy 3,000자 비차단 경고·PC/mobile와 동일 SHA 공개 개발 인수 완료 |
| 1.0.5 P4 | complete | PostgreSQL 270건·Chromium 284건·5-project 신규 기능 11건과 권한·offline·IME·재시작 동일 SHA 개발 인수 완료 |
| 1.0.5 P5 | complete | Actions `34487251707` 전체 verify·네 dev image·동일 SHA 개발 공개 기능·collaboration 재시작 인수 완료 |
| 1.0.6 P1 | complete | Extend 원문/전체 copy 분리·상대 위치 송폼 삽입·IME/undo·담당/rollback 계약 확정 |
| 1.0.6 P2 | complete | Extend Suno payload filter·부분 copy 원문·단일 source marker·CRDT 상대 위치 삽입 기반과 동일 SHA 개발 인수 완료 |
| 1.0.6 P3 | complete | 우클릭·키보드·모바일 삽입 메뉴·Extend 안내/원문 copy·IME/Escape/undo와 동일 SHA 공개 개발 인수 완료 |
| 1.0.6 P4 | complete | PostgreSQL 275건·Chromium 292건·5-project 신규 17건과 exact export/revision·권한·offline·재시작 동일 SHA 개발 인수 완료 |
| 1.0.6 P5 | complete | Actions `34511266182` 전체 verify·네 dev image·동일 SHA 공개 revision/export/restart 인수 완료 |
| 1.0.7 P1 | complete | owner+자료유형 별도 보기 설정·독립 CAS·필터/순서 불변·좁은 화면 접근성 계약 확정 |

## 활성 작업

| 담당자 | 버전/Phase | 작업 ID | 수정 경로 | 의존성 | 시작 시각 | 상태 |
|---|---|---|---|---|---|---|
| Codex | 1.0.7/P1 | LC-NF-1.0.7-P1-01~06 | 보기 설정 계약·실패 입력·domain/database/web 담당·호환/rollback 경계 | v1.0.6 release `f314768` | 2026-09-11T05:21:03+09:00 | complete |
| Codex | 1.0.6/P5 | LC-NF-1.0.6-P5-01~06 | 요구 추적·현재 문서·환경 schema·검증기·최종 CI·개발/정식 인수 | 1.0.6 P4 `0d19330` | 2026-09-11T02:43:00+09:00 | complete |
| Codex | 1.0.6/P4 | LC-NF-1.0.6-P4-01~06 | 실제 DB·권한·export/revision·offline/reconnect·지원 브라우저·restart 회귀 | 1.0.6 P3 `4ef7d7f` | 2026-09-11T02:05:00+09:00 | complete |
| Codex | 1.0.6/P3 | LC-NF-1.0.6-P3-01~06 | CodeMirror context/key hook·lyric editor PC/mobile 메뉴·안내·E2E | 1.0.6 P2 `7f87b8a` | 2026-09-11T01:00:00+09:00 | complete |
| Codex | 1.0.6/P2 | LC-NF-1.0.6-P2-01~06 | editor copy·marker source·CRDT 상대 삽입·단위 회귀 | 1.0.6 P1 / v1.0.5 `4411bc1` | 2026-09-11T00:15:00+09:00 | complete |
| Codex | 1.0.6/P1 | LC-NF-1.0.6-P1-01~06 | Extend/copy·송폼 삽입 계약·실패 입력·editor/UI/E2E 담당·호환/rollback 경계 | v1.0.5 release `4411bc1` | 2026-09-11T00:00:00+09:00 | complete |
| Codex | 1.0.5/P5 | LC-NF-1.0.5-P5-01~06 | 요구 추적·현재 문서·환경 schema·검증기·최종 CI·개발/정식 인수 | 1.0.5 P4 `d0ad04d` | 2026-09-10T23:10:00+09:00 | complete |
| Codex | 1.0.5/P4 | LC-NF-1.0.5-P4-01~06 | 실제 DB·권한·offline/재접속·IME·지원 브라우저·restart 회귀 | 1.0.5 P3 `c010d3f` | 2026-09-10T22:30:00+09:00 | complete |
| Codex | 1.0.5/P3 | LC-NF-1.0.5-P3-01~06 | CodeMirror decoration·lyric editor/list/copy feedback·PC/mobile E2E | 1.0.5 P2 `3b12d0a` | 2026-09-10T22:15:00+09:00 | complete |
| Codex | 1.0.5/P2 | LC-NF-1.0.5-P2-01~06 | editor parser/index·copy builder·단위 회귀·runtime metadata | 1.0.5 P1 `29180cf` | 2026-09-10T22:08:00+09:00 | complete |
| Codex | 1.0.5/P1 | LC-NF-1.0.5-P1-01~06 | songform/copy 계약·실패 입력·editor/UI/E2E 담당·호환/rollback 경계 | 1.0.4 P5 `508833e` | 2026-09-10T21:52:00+09:00 | complete |
| Codex | 1.0.4/P5 | LC-NF-1.0.4-P5-01~06 | 요구 추적·현재 문서·검증기·최종 CI·개발 인수·1.0.5 인계 | 1.0.4 P4 `3ed2770` | 2026-09-10T21:10:00+09:00 | complete |
| Codex | 1.0.4/P4 | LC-NF-1.0.4-P4-01~06 | 실제 DB·권한·offline/두 탭·지원 브라우저·restart 회귀 | 1.0.4 P3 `7136897` | 2026-09-10T20:50:00+09:00 | complete |
| Codex | 1.0.4/P3 | LC-NF-1.0.4-P3-01~06 | web prompt 목록·편집기·자료 패널·copy fallback·PC/mobile E2E | 1.0.4 P2 `c8b18f7` | 2026-09-10T20:35:00+09:00 | complete |
| Codex | 1.0.4/P2 | LC-NF-1.0.4-P2-01~06 | domain lossless span·prompt copy payload/count/warning·단위/장문 회귀 | 1.0.4 P1 `93a0704` | 2026-09-10T20:08:00+09:00 | complete |
| Codex | 1.0.4/P1 | LC-NF-1.0.4-P1-01~06 | prompt display/copy 계약·수용 입력·domain/UI/E2E 담당·호환/rollback 경계 | 1.0.3 P5 main `859c41e` | 2026-09-10T19:45:00+09:00 | complete |
| Codex | 1.0.3/P5 | LC-NF-1.0.3-P5-01~06 | 요구 추적·사용자/지원/보안/자가호스팅 문서·환경 schema·최종 CI·개발 인수 | 1.0.3 P4 동일 SHA 개발 인수 `611eab0` | 2026-09-10T18:15:00+09:00 | complete |
| Codex | 1.0.3/P4 | LC-NF-1.0.3-P4-01~06 | prompt mode 수용·권한·offline/reconnect·server restart·지원 브라우저 회귀 | 1.0.3 P3 동일 SHA 개발 인수 `30dfef7` | 2026-09-10T17:45:00+09:00 | complete |
| Codex | 1.0.3/P3 | LC-NF-1.0.3-P3-01~06 | prompt 신규·편집·목록·템플릿 UI, editor draft/CRDT, PC/mobile E2E | 1.0.3 P2 동일 SHA 개발 인수 `62e3d58` | 2026-09-10T17:10:00+09:00 | complete |
| Codex | 1.0.3/P2 | LC-NF-1.0.3-P2-01~06 | domain·database·editor·collaboration의 prompt mode/raw·migration·검증 | 1.0.3 P1 계약 `698e2d6` | 2026-09-10T17:00:00+09:00 | complete |
| Codex | 1.0.3/P1 | LC-NF-1.0.3-P1-01~06 | prompt mode/raw 계약·수용 입력·migration/API/CRDT/capability/rollback 경계 | v1.0.2 release `b4cfd665feb72612122253a26f336e5816bfb28c` | 2026-09-10T16:19:00+09:00 | complete |
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

1.0.3 P2 구현 후보 `5e6c7d0fcfec5ae20aaf17807fcf20e6213eadd7`은 전체 unit 176건 PASS(DB 필요 84건은 별도 실행), PostgreSQL 18 관련 28건, migration 빈 설치·반복·legacy upgrade·RLS·차단 rollback, typecheck와 production build를 통과했다. 개발 서버 원격 branch·checkout·환경 `BUILD_ID`가 일치했고 공개 `1.0.3`, `dev`, `p2`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. 합성 공개 smoke에서 문장 raw·mode 저장/복제/검색, 소유권, 구버전 capability 차단과 신규 연결이 PASS였고 합성 자료를 제거했다. P3는 일반 보기/입력에서 원문을 변환하지 않고 명시 변환에서만 preview/confirm/undo를 제공한다.

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

1.0.3 P4 구현 후보 `611eab02ccd3ba7279a1627e93d92436876657d7`은 실제 PostgreSQL unit/integration 261건, migration 1000, Chromium 전체 306건 중 274 PASS·의도적 31 skip과 발견 후 보정한 접근성 대비 1건의 재감사 PASS를 통과했다. 새 기능은 Chromium PC/mobile 8건, Firefox 4건, WebKit mobile 4건을 통과했다. 원격 PR #32와 개발 서버 checkout/build metadata가 같은 SHA였고 공개 `1.0.3`, channel `dev`, phase `p4`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다. 실제 collaboration container 재시작 전후 capability 연결·동일 document 재접속·문장 raw 조회/복제를 확인하고 합성 사용자를 제거했다. P5는 문서·환경 schema·최종 CI와 같은 SHA 개발 인수를 담당하며 1.0.3 main·정식 image·릴리스 서버는 변경하지 않는다.

1.0.3 P5 후보 `5092d12fc67c83b165bf83cf83210b49d62b4e4a`는 GitHub Actions run `34460759490`의 전체 verify와 web·collaboration·migrate·worker 개발 image 게시·서명을 통과했다. 원격 PR #33과 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.3`, channel `dev`, phase `p5`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. 실제 collaboration 재시작 전후 capability 연결·동일 document 재접속·연속 공백/구두점/줄바꿈 raw 조회·복제가 PASS했고 합성 사용자를 제거했다. P1~P5 후보 인수는 완료됐으며 1.0.3 main·tag·정식 image·릴리스 서버는 별도 release go/no-go 전까지 변경하지 않는다.

1.0.4 P3 구현 후보 `f8b5fb67cd3fefdabfb6e0b6874002b2db78976d`는 Node 24 전체 check·production build와 Chromium PC/mobile 4건을 통과했다. 목록·편집기·가사 자료 패널의 동일 최종 payload, lossless 문장 span, 1,001자 자동/수동 copy 경고를 확인했다. HTML textarea의 CRLF 표시 정규화와 달리 API·자동 clipboard payload는 원본 CRLF 그대로임을 별도로 검증했다. 권한·offline·collaboration restart·지원 브라우저 전체 교차 회귀는 P4에서 수행한다.

1.0.4 P4 후보 `dd638e70051acd74486b4056d66503caffe26311`은 깨끗한 격리 PostgreSQL 18에서 migration 반복과 unit/integration 263건을 통과했고 기존 별도 beta signup 4건만 의도적으로 skip했다. Chromium PC/mobile 전체 310건 중 279 PASS·환경 조건 31 skip, 새 기능 Chromium/Firefox/WebKit 5-project 10건을 통과했다. 첫 교차 실행에서 릴리스 모바일 프로젝트명을 기본 `mobile`로만 판별한 test harness 결함을 찾아 `*-mobile`로 보정했으며 제품 동작이나 assertion은 완화하지 않았다. 실제 물리 기기는 새로 수행하지 않았다.

1.0.4 P5 후보 `6c0aedca7d01270293d14e90dd6912cffe937cff`은 GitHub Actions run `34476629460`의 전체 verify와 네 dev image 게시·서명을 통과했다. 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.4`, channel `dev`, phase `p5`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. collaboration 재시작 전후 같은 문서 재접속과 CRLF·emoji raw 일치가 PASS했고 합성 자료를 제거했다. 최초 CI의 임시 DB 강제 삭제 정리 경쟁은 일반 drop 재시도로 수정해 로컬 3회와 최종 CI에서 닫았다. 1.0.4 P1~P5는 별도 정식 tag 없이 1.0.5의 선행 기준으로 인수한다.

1.0.5 P1은 출발 SHA `508833e5aee43ebcc9d7aecaae1592b655a5460a`에서 기존 line parser·incremental index·CodeMirror decoration·목차/resume·전체/구간 copy·feedback 경로를 조사했다. 첫 콜론 앞의 trimmed 주 이름, 콜론부터 닫는 대괄호 전까지 lossless suffix, 빈 주 이름의 기존 label 호환, occurrence와 resume의 주 이름 사용, LF 직렬화 뒤 최종 payload Unicode code point `> 3000` 비차단 경고를 승인했다. DB/API/CRDT/schema는 바꾸지 않으며 P2가 순수 parser/copy builder 실패 fixture와 구현을 담당한다.

1.0.5 P2 후보 `6dce2e363155ebd0da578a30c9c8185bf12564d5`는 첫 콜론 주 이름과 lossless suffix/range, 빈 주 이름의 기존 인식, suffix-only 편집의 occurrence/id 안정성, CRLF를 LF로 직렬화한 최종 payload의 Unicode code point 2999/3000/3001 경계를 구현했다. 관련 29건과 전체 unit 186건이 PASS했고 DB 필요 84건은 격리 PostgreSQL 검증으로 분리했다. check·production build·migration 2회가 PASS했으며 원격 PR #40, 개발 서버 checkout/build metadata가 같은 SHA였다. 공개 live/ready는 `1.0.5`, channel `dev`, phase `p2`, schema `1000_prompt_modes.sql`과 네 서비스 healthy를 반환했다. 실제 물리 기기·UI 교차 브라우저는 P3/P4에서 수행한다.

1.0.6 P2 후보 `7f87b8af1a5118c2d5eda3a07948e89c1696a215`는 exact-case Extend 정식 marker 줄만 Suno 전체 payload에서 제외하고 부분/송폼 copy·raw 저장 경로를 분리했다. 기본 송폼 단일 source와 독립 줄 change builder, remote prefix 뒤 Yjs 상대 caret·한 transaction/undo·invalid 무변경을 추가했다. 구현 전 copy 2건과 누락 module suite 실패를 확인한 뒤 관련 19건과 전체 unit 195건이 PASS했고 DB 필요 84건은 후속 실제 PostgreSQL 검증으로 분리했다. boundaries·typecheck·production build가 PASS했으며 원격 PR #45와 개발 서버 checkout/build metadata가 같은 SHA였다. 공개 live/ready는 `1.0.6`, channel `dev`, phase `p2`, schema `1000_prompt_modes.sql`과 네 서비스 healthy를 반환했다. UI·지원 브라우저·실제 IME는 P3/P4에서 수행한다.

1.0.6 P3 후보 `4ef7d7f48f43e6259705467bdafbaad68935d4d5`는 CodeMirror 우클릭·메뉴키/`Shift+F10` 요청과 lyric editor의 공통 상대 selection 삽입 명령, 모바일 보이는 버튼, 양 theme 메뉴, Suno/원문 copy 안내를 연결했다. typecheck·production build·Chromium PC/mobile 신규 흐름 7건이 PASS했고 조건별 3건은 의도적으로 skip됐다. 정상·빈 상태·10만 자 실패·비인증·로딩·remote prefix·IME·Escape·단일 undo·서버 reload를 확인했다. 원격 PR #46과 개발 서버 checkout/build metadata가 같은 SHA였고 공개 다크 PC·라이트 모바일 기능 smoke 뒤 합성 자료를 제거했다. 공개 live/ready는 `1.0.6`, `dev`, `p3`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다. 전체 DB/export/revision/offline/지원 엔진/restart는 P4에서 수행한다.

1.0.6 P4 후보 `0d19330f9c8ba800e89b275a22fedf1b9e955693`은 격리 PostgreSQL 18 migration 반복과 unit/integration 275건을 통과했고 별도 beta signup 4건만 조건상 skip했다. Chromium PC/mobile 전체 328건 중 292 PASS·조건부 36 skip, Chromium/Firefox/WebKit 5-project 신규 기능 17 PASS·조건부 13 skip, 접근성 재검증 3건을 통과했다. 이전 metadata 고정 기대값 4건과 dark disabled danger 대비를 최소 수정한 뒤 최종 전체 회귀를 다시 통과했으며 중단한 실행은 PASS로 기록하지 않았다. 원격 PR #47과 개발 서버 checkout/build metadata가 같은 SHA였고 공개 revision·ZIP export exact Extend 원문과 collaboration 재시작 전후 동일 document key·원문을 확인한 뒤 합성 자료를 제거했다. 공개 live/ready는 `1.0.6`, `dev`, `p4`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다. 실제 물리 기기는 새로 실행하지 않았고 최종 원격 CI·dev image는 P5에서 수행한다.

1.0.6 P5 후보 `a37a41dde72974fb37e025788ace768f9d5b6b04`는 GitHub Actions run `34511266182`의 전체 verify와 네 dev image 게시·서명을 통과했다. 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.6`, channel `dev`, phase `p5`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. 공개 revision·ZIP JSON/TXT의 exact Extend 원문과 collaboration 재시작 전후 같은 document key·원문 보존이 PASS했고 합성 자료를 제거했다. 신규 P0/P1·원문 유실·인증 우회·교차 owner 노출·무음 저장 실패는 0건이며, 실제 물리 기기 미실행과 `OPS-100-001` 예외를 유지한 채 승인된 정식 릴리스로 이동한다.

1.0.5 P3 후보 `3649d014163c91b8f74d5b30d0460757bc97ab1c`는 CodeMirror 콜론 이후 범위와 desktop/mobile 목차의 suffix를 저강조하고 주 이름의 접근 가능한 탐색·occurrence를 유지했다. 공통 lyric copy view가 최종 LF payload의 3,001자 안내를 자동·단축키·저장 복구·수동 dialog에 연결했다. 관련 unit 16건, check·production build, Chromium PC/mobile 4건이 PASS했고 suffix 편집/undo/reload, 구간·전체 exact copy, clipboard 거부와 비인증 권한 경계를 확인했다. 원격 PR #41과 개발 서버 checkout/build metadata가 같은 SHA였고 공개 합성 smoke에서 suffix 표시·주 이름 탐색·3,001자 exact copy/비차단 경고가 PASS한 뒤 자료를 제거했다. 공개 live/ready는 `1.0.5`, `dev`, `p3`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다.

1.0.5 P4 후보 `d0ad04d9e74e393809318b05134fe4ef0b54ad33`은 격리 PostgreSQL migration·unit/integration 270건, Chromium PC/mobile 전체 316건 중 284 PASS·조건부 32 skip, Chromium/Firefox/WebKit 신규 기능 11건을 통과했다. 최초 전체 실행에서 구 metadata 기대값·mobile copy 접근 이름·공유 IndexedDB test harness 결함 7건을 찾아 최소 수정했고 같은 전체 회귀를 다시 통과했다. 합성 IME 자동화는 실제 조합 상태가 유지되는 Chromium desktop에 한정했으며 실제 물리 기기는 새로 실행하지 않았다. 원격 PR #42와 개발 서버 checkout/build metadata가 같은 SHA였고 공개 suffix·주 이름 탐색·3,001자 exact copy와 collaboration 재시작 전후 document key·DB 원문 보존을 확인한 뒤 합성 자료를 제거했다. 공개 live/ready는 `1.0.5`, `dev`, `p4`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다.

1.0.5 P5 후보 `78b3f1bc4c240bbceaddcab33e56af1ae0048aae`는 GitHub Actions push run `34487251707`의 전체 verify와 네 dev image 게시·서명을 통과했다. 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.5`, channel `dev`, phase `p5`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. 공개 suffix·주 이름 탐색·3,001자 exact copy와 collaboration 재시작 전후 같은 document key·DB 원문 보존이 PASS했고 합성 자료를 제거했다. 신규 P0/P1·원문 유실·인증 우회·교차 owner 노출·무음 저장 실패는 0건이며, 실제 물리 기기 미실행과 `OPS-100-001` 예외를 유지한 채 승인된 정식 릴리스로 이동한다.
