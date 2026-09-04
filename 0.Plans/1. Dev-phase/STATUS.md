# LyricsCloud 개발 상태

이 파일은 현재 버전·Phase·담당 작업의 단일 상태 원본입니다. 계획 문서는 범위를 정의하고 이 파일은 실제 진행 상황을 기록합니다.

```yaml
current_version: "0.2.0"
current_phase: "1phase.md"
state: "complete"
owner: "none"
started_at: "2026-09-05 08:20 KST"
updated_at: "2026-09-05"
next_action: "사용자 지시 후 0.2.0 Phase 2 곡 CRUD 명령과 목록 조회 시작"
```

상태 값은 `ready`, `in_progress`, `blocked`, `review`, `complete` 중 하나를 사용합니다.

## 기준선 판정

- `Sketch.md`: 71개 1.0 요구사항과 5개 사용자 흐름으로 Phase 1 기준선 승인 완료
- `Mock-up`: 15개 README와 PC·모바일 30개 정적 화면을 화면 추적·20개 차이 항목에 연결, 원본은 수정하지 않음
- `Implementation-Stack.md`: 13개 DEC에서 각각 하나 선택, `FINAL-APPROVAL` 선택 확인
- `Implementation-Stack.md`의 문장형 상태는 아직 `사용자 선택 전`이지만 체크박스와 최종 승인을 현재 선택의 원본으로 판정함
- `DEC-10` 선택 메모: 서버·DB를 먼저 로컬 Docker에서 개발하고 이후 홈랩으로 이관하며 개인 셀프호스팅이 가능해야 함
- `CHECK-03`은 미선택이며 DEC-10 외 선택 메모가 없으므로 그 밖의 예외·우선순위는 기록되지 않은 것으로 판정함
- `DEC-02-A`와 `DEC-06-C`의 결합은 Accepted `ADR-0004`에 따라 “같은 사용자의 기기·탭 자동 병합, 다른 사용자 공유 제외”로 확정
- 기술·제품·운영 결정의 소유권과 확정 Phase는 [`Decision-Ownership.md`](./Decision-Ownership.md)를 따르며, 색인에 있는 `Proposed` 항목을 승인된 결정으로 간주하지 않음
- 실행 가능한 중립 애플리케이션·Docker·PostgreSQL·migration·검사: 빈 작업 사본과 빈 volume을 포함해 구현·검증 완료
- Docker Desktop의 Windows 예약 포트 `3000–3299`를 피해 기본 host web 포트를 `8080`으로 확정, liveness/readiness 200 확인
- 로컬 Git 저장소와 `origin/main`: 연결 확인, branch protection·secret scanning·required checks는 권한 보유자 체크리스트로 인계
- 버전별 실행 계획, 요구사항 추적표와 프로젝트 디렉터리: 0.0.0 전 Phase 검토·승인 완료

## 버전 진행표

| 버전 | 상태 | 현재/완료 Phase | 진입 조건 |
|---|---|---|---|
| 0.0.0 | complete | Phase 1~5 완료, 원격 Phase 브랜치 확인 | 충족 |
| 0.1.0 | complete | Phase 1~5 완료 | 0.0.0 완료 |
| 0.2.0 | in_progress | Phase 1 완료 | 0.1.0 완료 |
| 0.3.0 | planned | 없음 | 0.2.0 완료 |
| 0.3.1 | planned | 없음 | 0.3.0 완료 |
| 0.4.0 | planned | 없음 | 0.3.1 완료 |
| 0.5.0 | planned | 없음 | 0.4.0 완료 |
| 0.6.0 | planned | 없음 | 0.5.0 완료 |
| 0.7.0 | planned | 없음 | 0.6.0 완료 |
| 0.8.0 | planned | 없음 | 0.7.0 완료 |
| 0.9.0 | planned | 없음 | 0.8.0 완료 |
| 0.9.1 | planned | 없음 | 0.9.0 완료 |
| 1.0.0 | planned | 없음 | 0.9.1 release gate 통과 |

## 활성 작업

작업 시작 전 한 행을 추가하고 완료·인계 후 제거하거나 완료 기록으로 이동합니다.

| 담당자 | 버전/Phase | 작업 ID | 수정 경로 | 의존성 | 시작 시각 | 상태 |
|---|---|---|---|---|---|---|
| 없음 | - | - | - | - | - | - |

## 0.0.0에서 닫아야 할 기술 게이트

- [x] `ADR-0001` — 웹·협업·worker 프로세스 및 workspace 토폴로지
- [x] `ADR-0002` — Google OIDC, 세션, 비공개·초대 허용 목록
- [x] `ADR-0003` — PostgreSQL 접근 계층, migration, 소유권·RLS 전달
- [x] `ADR-0004` — 자동 병합의 사용자 범위와 CRDT 문서 의미
- [x] `ADR-0005` — CRDT transport, WebSocket, 영속화, 평문 검색 투영, snapshot
- [x] `ADR-0006` — 자체 운영 프록시, TLS, WebSocket 전달, 배포 지역
- [x] `ADR-0007` — 온라인 우선 PWA, 계정별 로컬 저장, 업데이트
- [x] `ADR-0008` — 매일 논리 백업의 저장소, 암호화, 키, 보존, 복원
- [x] `ADR-0009` — 창작물 본문을 제거하는 오류·성능 관측

## 기획상 발견 사항

아래 항목은 구현 중 조용히 가정하지 않고 담당 Phase의 계약 작업에서 명시적으로 닫습니다.

| 항목 | 결정 ID | 처리 버전 | 초기 해석 |
|---|---|---|---|
| CRDT 자동 병합 범위 | `ADR-0004` | 0.0.0, 0.3.1 | 같은 소유자의 기기·탭만 포함, 사용자 공유 제외 |
| 모바일 네 번째 내비 항목 | `PROD-0001` | 0.1.0 | 고정 `더보기` 진입점과 하위 메뉴를 수용 기준으로 비교 |
| 빠른 아이디어의 자료 종류 | `PROD-0005` | 0.6.0 | 분류 전 임시 inbox를 새로 만들지 말고 곡·가사 메모 또는 라임 생성 흐름으로 연결 |
| 라임·프롬프트와 곡 관계 | `PROD-0002` | 0.2.0, 0.6.0 | N:M, owner가 같은 연결 쌍은 하나, 연결 해제는 독립 원본을 보존하는 것으로 Accepted |
| 라임 독립 화면의 가사 삽입 | `PROD-0006` | 0.4.0, 0.6.0 | 살아 있는 편집 대상이 확인될 때만 삽입, 아니면 복사 제공 |
| 가사 버전과 revision | `PROD-0004` | 0.3.0, 0.3.1 | 이름 있는 가사는 독립 resource, revision은 복구 snapshot |
| 최근 작업 의미 | `PROD-0007` | 0.7.0 | 수정 시각과 열람 시각을 분리하고 마지막 커서·송폼 위치 저장 |
| 곡 삭제와 연결 자료 | `PROD-0010` | 0.2.0, 0.8.0 | 당시 활성 소속 가사만 함께 숨기고 같은 삭제 작업분만 복원, 독립 연결 자료·관계는 보존으로 Accepted |
| 목업 전용 보완 기능 | 관련 `PROD-*` 또는 담당 Phase 계약 | 담당 버전 | 버전 비교, 상세 필터, 저장 상태, 비드래그 이동 수단은 1.0 범위에 포함 |

## 다음 작업

1. 사용자 지시를 받은 뒤 [`0.2.0 Phase 2`](./0.2.0/2phase.md)의 범위와 선행조건을 확인합니다.
2. resource·song 생성 transaction과 owner context에 idempotency key를 결합합니다.
3. CRUD, 부분 검색, 상태 필터, 다섯 정렬과 cursor 계약을 구현합니다.
4. 가사 본문 검색·연결 자료·휴지통·revision·CRDT는 담당 후속 Phase로 남깁니다.

## 완료 기록

| 완료일 | 버전/Phase | 담당자 | 결과 | 검증 증거 | 다음 인계 |
|---|---|---|---|---|---|
| 2026-09-05 | 0.2.0 / Phase 1 | Codex | 공통 resource·song 1:1 schema, 상태·색상·길이·DB 시각 계약, owner RLS, soft delete, 제품 삭제·연결 의미 확정 | clean migration 2회, 합성 fixture 3쌍, down·재적용, 12 files/49 tests, index EXPLAIN, check·build·E2E·secret scan, 개발 서비스 readiness 200, GitHub Actions 33930137076 통과, [`검증 기록`](../../docs/runbooks/0.2.0-phase1-validation.md) | Phase 2 생성 transaction·idempotency·CRUD·목록 query |
| 2026-09-05 | 0.1.0 / Phase 5 | Codex | 로컬 OIDC 로그인·세션 복원·갱신·로그아웃, A/B 소유권 공격, PC·모바일 시각·보안 회귀를 CI에 연결하고 0.1.0 완료 | migration 2회, check, 41 tests, production build, desktop/mobile E2E 26개, secret scan 0건, Docker restart readiness 200, [`검증 보고서`](../../docs/runbooks/0.1.0-phase5-validation.md) | [`0.2.0 owner context 인계`](../../docs/architecture/0.2.0-OWNER-CONTEXT-HANDOFF.md)와 합성 A/B fixture |
| 2026-09-05 | 0.1.0 / 운영 보완 | Codex | 개발·릴리스 Debian 13 서버에 Docker Engine·Compose·Buildx·Git·기본 운영 도구 설치 | 양쪽 Docker 29.8.0·Compose 5.5.1·Buildx 0.37.0·Git 2.47.3, Compose hello-world, overlayfs·systemd cgroup, daemon enabled/active, TCP API 비공개, GitHub read, Tunnel active | 환경별 deploy key·배포 경로·운영 Compose와 secret 배치 |
| 2026-09-05 | 0.1.0 / 운영 보완 | Codex | 신규 릴리스 서버에 릴리스 전용 Cloudflare Tunnel·DNS·HTTPS 경로를 구성하고 오접속 기록·인벤토리 정정 | 실제 대상 SSH 확인, cloudflared 2026.8.3, ingress 유효, systemd enabled/active, DNS CNAME·TLS hostname 검증, 개발·릴리스 machine/Tunnel ID 분리, 예상 502 | 릴리스 앱 배포 시 Google OAuth client·환경 값·실제 로그인 검증 |
| 2026-09-05 | 0.1.0 / 운영 보완 | Codex | 개발 Tunnel 공개 주소를 `devlyrics.parkingp.kr`로 변경하고 기존 DNS 제거, 로컬 공개·비공개 문서 동기화 | Tunnel ingress 검증, systemd enabled/active, 공개 DNS 신규 CNAME·기존 NXDOMAIN, Universal SSL SAN 일치, 예상 502 확인 | Google Cloud Console의 홈랩 개발 OAuth origin·redirect 수동 변경 후 앱 배포 |
| 2026-09-04 | 0.1.0 / Phase 4 | Codex | Google 로그인 PC·모바일 상태 화면, 실제 정책 route, no-store 경계와 보호된 반응형 workspace shell 완성 | check, 31 unit, production build, 320·390·1440px E2E 12개, 시각 캡처 4개, GitHub Actions 33883741006 통과 | 인증 fixture·locator·브라우저 행렬 통합 검증 |
| 2026-09-04 | 0.1.0 / Phase 3 | Codex | profile owner 규약·transaction-local 내부 user context·non-superuser 강제 RLS·계정별 cache 계약 완성 | 36 tests, A/B CRUD 차단, 기본 거부·pool 격리·blocked session 차단, migration 2회, build | 로그인 화면과 보호 route UI |
| 2026-09-04 | 0.1.0 / Phase 2 | Codex | Google OIDC·PKCE·허용 목록·opaque session 경계와 실계정 로그인 완성 | 28 tests, 격리 DB migration 2회, 실계정 로그인 후 내부 user·identity·active session 각 1건 및 중복 0건, GitHub Actions 통과 | 내부 user ID 기반 profile·소유권 schema |
| 2026-09-04 | 0.1.0 / Phase 1 | Codex | 실행·config·오류·health·격리 test DB·CI 기반 완성 | 12 unit tests, build, PC/mobile E2E, DB 장애·인증 분류, GitHub Actions 33870853702 통과 | Google OIDC·서버 session 경계 |
| 2026-09-04 | 0.0.0 / Phase 5 | Codex | 요구사항·ADR·Docker·Git·보안 기준선 통합 검증, 0.1.0 진입 승인 | 계획 검증 통과, 빈 작업 사본·빈 volume readiness 200, DB 장애 503·회복 200, secret scan 0건, PC·모바일 smoke, 원격 Phase branch SHA 일치 | 0.1.0 / Phase 1 |
| 2026-09-04 | 0.0.0 / Phase 2 | Codex | ADR-0001~0009 작성 및 사용자 승인으로 Accepted | ADR 색인·개별 문서 상태 일치, 각 대안·보안·철회 경로 기록 | 아키텍처 중립 골격 |
| 2026-09-04 | 0.0.0 / Phase 3 | Codex | workspace, 15 route, 중립 타입, config·health, 반응형 token과 경계 검사 구현 | Node 24.20.0 임시 도구로 `pnpm check` 통과 | Docker 개발환경 |
| 2026-09-04 | 0.0.0 / Phase 4 | Codex | Compose 5개 서비스, PostgreSQL 18.6, migration·health·volume·host 8080 개발환경 검증 | 로컬·container check/test/build, DB 지속·초기화, 정상/실패 health, Playwright PC·모바일 통과 | 0.0.0 통합 게이트 |
| 2026-09-04 | 0.0.0 / Phase 1 | Codex | 71개 요구사항, 15개 화면, 5개 흐름, 20개 목업 차이, 복구 계층·제외 범위 기준선 확정 | 고유 REQ 71개(AUTH 5, SONG 11, LYRIC 17, RHYME 10, PROMPT 14, COMMON 14), 고유 작업 ID 576개 확인 | ADR-0001~0009 승인 게이트 |
| 2026-09-04 | 계획 초안 준비 | Codex | 전체 로드맵, Phase 문서, 프로젝트 후보 구조 생성 | `scripts/validate-plans.ps1` 통과: 13개 버전·65개 Phase·576개 작업 ID·71개 §49 요구사항; Phase 수용 검토는 미실행 | 0.0.0/1phase 시작 |

## 인계 기록 형식

```text
완료한 작업 ID:
변경한 파일과 migration:
실행한 검증 및 결과:
실행하지 못한 검증:
남은 결함·위험:
다음 Agent가 먼저 읽을 문서·산출물:
```
