# LyricsCloud 개발 상태

이 파일은 현재 버전·Phase·담당 작업의 단일 상태 원본입니다. 계획 문서는 범위를 정의하고 이 파일은 실제 진행 상황을 기록합니다.

```yaml
current_version: "0.5.0"
current_phase: "1phase.md"
state: "review"
owner: "Codex"
started_at: "2026-09-07 KST"
updated_at: "2026-09-07"
next_action: "Phase 1 구현 commit을 push하고 필수 CI·네 개발 image 발행·동일 SHA 로컬/개발 배포·공개 smoke를 확인"
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
| 0.2.0 | complete | Phase 1~5 완료 | 0.1.0 완료 |
| 0.3.0 | complete | Phase 1~5 완료 | 0.2.0 완료 |
| 0.3.1 | complete | Phase 1~5 완료, 자동 장애 회귀·실제 기기·원격 CI·image·동일 SHA 개발 배포 검증 | 0.3.0 완료 |
| 0.4.0 | complete | Phase 1~5 완료 | 0.3.1 완료 |
| 0.5.0 | in_progress | Phase 1 진행 중 | 0.4.0 완료 |
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
| Codex | 0.5.0 / Phase 1 | LC-050-P1-01~08 | `packages/domain`, `packages/editor`, `packages/database`, migration·검증 문서 | 0.4.0 완료, ADR-0005 | 2026-09-07 KST | 원격 인수 대기 |

2026-09-06: 사용자의 “기능 개발은 … 계속 … 내 계정으로 로컬 테스트 환경으로 OAuth” 지시에 따라 다음 순서인 Phase 4의 로컬 구현을 진행한다. Phase 3을 원격 배포 완료로 승격하지 않는다. 이 예외는 로컬 개발에만 적용하며 GitHub push에 연결된 Docker Hub 발행과 개발 서버 배포는 별도 승인·검증 대상이다.

2026-09-06: 사용자의 Phase 5 Goal 진행과 worker 활용 지시에 따라 로컬 통합 검증을 계속한다. 원격 Phase 완료를 선행 완료로 가정하지 않으며, 실제 기기·원격 CI·image 발행·개발 서버 배포는 별도 증거가 필요한 인수 항목으로 남긴다. 현재 Goal은 로컬 구현·검증·커밋과 검토 가능한 인계 준비까지다.

문서·브라우저 worker의 담당 파일은 인계받았다. 부모가 실행 검증과 필요한 코드를 수정했고 GLM 5.3 Flash는 로그아웃 변경 경계의 읽기 전용 검토를 맡았다. 결과는 [Phase 5 로컬 검증 기록](../../docs/runbooks/0.3.1-phase5-local-validation.md)에 모았다.

2026-09-06 GitHub 반영: Phase 3 보완 [PR #2](https://github.com/parking-place/LyricsCloud/pull/2) → Phase 4 [PR #3](https://github.com/parking-place/LyricsCloud/pull/3) → `phase/0.3.1-p5-resilience` 순서의 초안 PR로 인계한다. 원격 CI에서 확인한 초기화 대기 누락은 본문 입력 시험에 반영했고 편집기 PC·모바일 20개를 국소 재검증했다. 앱 코드는 기존 로컬 검증본과 같다. 각 push의 verify·네 개발 이미지 발행과 tag digest 일치를 확인한 뒤 다음 Phase 브랜치를 올린다. main·release 변경이나 개발 서버 배포는 이 GitHub 반영에 포함하지 않는다.

2026-09-06 원격·개발 인수: Phase 5 기능 head `7734bf23713b8b405b3a63bc86af36d7036fec20`에서 로컬 check와 30 files/104 tests를 통과했다. push CI `34026897897`과 PR CI `34026900854`는 migration 복구, production image 복구, 전체 E2E와 secret scan을 통과했다. 네 Docker Hub repository의 `0.3.1`·전체 SHA·`Dev`·`Dev-latest` tag는 서비스별 같은 digest를 가리킨다. 로컬과 개발 서버 live/ready는 같은 SHA·0.3.1·`0311_lyric_revisions.sql`을 반환했고 공개 PC/모바일 가사 작성·저장·복제·다중 탭 로그아웃 smoke를 통과한 뒤 합성 자료를 제거했다.

2026-09-06 실제 기기 인수: 사용자는 안내된 실제 Android/iOS·OS 한글 IME·LTE/5G의 동일 owner 동기화, 브라우저 종료·재접속 복구와 실제 Google 로그인·로그아웃 체크리스트가 통과했다고 보고했다. 제공되지 않은 기종·OS·브라우저 세부사항은 추정하지 않는다.

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

## 결정과 구현 대조

- ADR-0002의 동일 계정 전체 세션 로그아웃은 Phase 5에서 구현하고 다른 계정·폐기된 예전 토큰 경계를 검증했다.
- ADR-0005에 명시된 binding·awareness와 현재 transaction adapter·presence 미구현의 차이를 해당 ADR의 구현 대조와 [어댑터 인계](../../docs/architecture/0.3.1-SYNC-ADAPTER-HANDOFF.md)에 기록했다. 기존 adapter를 유지하며 재설계나 공유 편집을 추가하지 않았다.

## 다음 작업

0.5.0 Phase 1 프롬프트 계약과 데이터 모델은 로컬 수용을 통과했고 원격 CI·image·동일 SHA 배포 인수 대기 중이다. 개인 앱은 `http://localhost:8080`의 `lyricscloud` Compose project이며 OAuth·DB volume을 보존한다. 과거 완료 기록은 당시 검증 범위를 기록한 이력이다.

## 완료 기록

| 완료일 | 버전/Phase | 담당자 | 결과 | 검증 증거 | 다음 인계 |
|---|---|---|---|---|---|
| 2026-09-07 | 0.4.0 / Phase 5 | Codex | Phase 1~4 고유 ID를 증적과 연결하고 라임 전체 흐름·owner 격리·다중 탭/오프라인 복구·접근성을 통합 검증, 느린 메타데이터 응답 경쟁 조건을 수정 | 33 files/122 tests, migration 복구·production build·4 image 복구, PC/mobile E2E 138 통과·2 skip, CI `34042009944`·`34042030495`, 네 image tag/digest, `cf5ba57` 동일 SHA 로컬·개발 배포와 공개 smoke; [검증 기록](../../docs/runbooks/0.4.0-phase5-validation.md) | 0.5.0 Phase 1은 [라임 인계](../../docs/architecture/0.4.0-RHYME-HANDOFF.md)의 owner/resource·목록·명령 queue 패턴을 프롬프트에 재사용 |
| 2026-09-06 | 0.4.0 / Phase 4 | Codex | 태그 필터 이동, owner 곡 후보 검색·멱등 연결·선택 해제, 전체/선택 복사·빈 선택·수동 복사와 0.6.0용 Yjs 상대 위치 삽입 계약을 구현 | 20 files/122 tests, production build·4 image 복구, PC/mobile E2E 134 통과·2 skip, CI `34039901090`·`34039912586`, 네 image tag/digest, `3a2b2f3` 동일 SHA 로컬·개발 배포와 공개 연결 smoke; [검증 기록](../../docs/runbooks/0.4.0-phase4-validation.md) | Phase 5가 06~07번 전체 흐름·격리·동기화·접근성을 통합 검증 |
| 2026-09-06 | 0.4.0 / Phase 3 | Codex | 오프라인 신규 초안, 제목 메타데이터와 CRDT 본문 동시 저장, 태그·핀·즐겨찾기·색상, 수정 기록 비교·비파괴 복원, 정확한 전체 복사와 이름 확인 soft delete를 PC·모바일에 구현 | 32 files/119 tests, production build·4 image 복구, PC/mobile E2E 132 통과·2 skip, CI `34037598862`·`34037609584`, 네 image tag/digest, `d75fa34` 동일 SHA 로컬·개발 배포와 공개 라임 CRUD smoke; [검증 기록](../../docs/runbooks/0.4.0-phase3-validation.md) | Phase 4가 곡 연결·선택 복사와 0.6.0 cursor 삽입 계약을 완성 |
| 2026-09-06 | 0.4.0 / Phase 2 | Codex | owner 범위 라임 노트 목록에 문자 그대로 검색·태그/곡 조합 필터·다섯 정렬·pagination과 PC 2열/모바일 1열 카드, URL 상태, 메타데이터·정확한 본문 복사 및 실패 대안을 구현 | 32 files/118 tests, production build·4 image 복구, PC/mobile E2E 124 통과·2 skip, CI `34034902221`·`34034904785`, 네 image tag/digest, `d441a9b` 동일 SHA 개발 배포·공개 health; [검증 기록](../../docs/runbooks/0.4.0-phase2-validation.md) | Phase 3이 `/rhymes/new`·`/rhymes/:id`에 CRDT 생성·편집·수정 기록·삭제를 연결 |
| 2026-09-06 | 0.4.0 / Phase 1 | Codex | 라임 노트·owner 태그·곡 연결과 공통 표시 속성, 멱등 생성·복제·soft delete, 가사 CRDT·평문·revision 재사용 기반 구현 | 32 files/116 tests, 0200~0400 migration 복구, production build·4 image 복구 smoke, PC/mobile E2E 120 통과·2 skip, CI `34032838270`·`34032860376`, 네 image tag/digest, `fb83f00` 동일 SHA 개발 배포·공개 health; [검증 기록](../../docs/runbooks/0.4.0-phase1-validation.md) | Phase 2가 owner/삭제 경계를 유지하며 목록 query·URL 상태·복사를 구현 |
| 2026-09-06 | 0.3.1 / Phase 5 | Codex | 다중 탭·기기 자동 병합, 장애 복구, 저장 상태, 수정 기록·복원과 계정 격리를 통합 검증하고 실제 기기 인수를 완료 | 30 files/104 tests, 전체 production 복구·E2E, CI `34026897897`·`34026900854`, 네 image tag/digest, `7734bf2` 동일 SHA 개발 배포·공개 Chromium smoke, 사용자 보고 실제 기기·OS IME·다른 물리 네트워크·Google 로그아웃 인수; [검증 기록](../../docs/runbooks/0.3.1-phase5-local-validation.md) | 0.4.0 Phase 1이 owner 전용 동기화·revision 계약을 라임 노트에 재사용 |
| 2026-09-06 | 0.3.1 / Phase 4 | Codex | 5분·중요 작업 전 revision, 180일/200개 정리, PC·모바일 비교와 비파괴 복원을 구현 | DB 정책·원자 복원·재시도·offline 병합, PC/mobile 비교·복원, Phase 5 통합 검증; [검증 기록](../../docs/runbooks/0.3.1-phase4-local-validation.md) | Phase 5 통합 장애 회귀와 실제 기기 인수 |
| 2026-09-05 | 0.3.1 / Phase 3 | Codex | 인증 WebSocket, 멱등 update ACK, snapshot·raw update·receipt 영속화, 평문 projection·재처리·압축과 내용 없는 지표를 구현 | 0310 migration 복구, check, 93 tests, production build/images, PC/mobile E2E 76개, CI 33953374325, 네 image tag/digest 일치, `e2d7a27` 개발 배포; [검증 기록](../../docs/runbooks/0.3.1-phase3-validation.md) | Phase 4가 durable CRDT snapshot과 projector를 자동 revision·비파괴 복원에 사용 |
| 2026-09-05 | 0.3.1 / Phase 2 | Codex | IndexedDB Yjs 초안, BroadcastChannel 탭 병합, offline 복구·계정별 삭제와 저장 상태를 편집기에 연결 | check, 90 tests, production build, PC/mobile E2E 76개; [검증 기록](../../docs/runbooks/0.3.1-phase2-validation.md) | Phase 3이 local update를 인증 collaboration 서버에 ACK·projection transaction으로 연결 |
| 2026-09-05 | 0.3.1 / Phase 1 | Codex | 동일 owner Yjs 본문, opaque document/update ID, fail-closed 접근, 중복·역순·snapshot과 관계형 제목+CRDT 본문 projection 계약을 구현 | check, 24 files/90 tests, production build, secret scan, PC/mobile baseline 재검증; [검증 기록](../../docs/runbooks/0.3.1-phase1-validation.md) | Phase 2가 owner+document key IndexedDB와 BroadcastChannel 병합·저장 상태를 구현 |
| 2026-09-05 | 0.3.0 / Phase 5 | Codex | 곡 대시보드와 PC·모바일 editor에 실제 가사 카드·생성·전환·복제·삭제·metadata를 연결하고 owner 범위 활성 가사 검색과 CRDT transaction 인계를 완성 | migration·복구, check, 86 tests, production build, PC/mobile E2E 74개, CI 33950119025, 네 image tag/digest 일치, `b8fdec7` 개발 배포·공개 전체 흐름 smoke 통과; [검증 기록](../../docs/runbooks/0.3.0-phase5-validation.md) | 0.3.1 Phase 1이 현재 text와 transaction port를 최초 Yjs 문서와 update schema에 연결 |
| 2026-09-05 | 0.3.0 / Phase 4 | Codex | 현재 CodeMirror 문서의 전체·단일·복수 송폼 복사, 문서 순서·빈 줄 보존, Clipboard 실패 수동 대안, 키보드 선택과 PC·모바일 집중 모드를 구현 | migration·복구, check, 84 tests, production build, PC/mobile E2E 70개, CI 33948308267, 네 image tag/digest 일치, `8a685c6` 개발 배포·공개 복사/집중 smoke 통과; [검증 기록](../../docs/runbooks/0.3.0-phase4-validation.md) | Phase 5가 현재 editor copy command·selection·focus 상태 계약을 유지하며 가사 대시보드 전체 흐름을 연결 |
| 2026-09-05 | 0.3.0 / Phase 3 | Codex | 증분 송폼 parser·CodeMirror line decoration, 반복 구간 고유 ID, cursor·viewport active 추적, PC 목차·모바일 시트 탐색을 구현 | check, 80 unit/DB tests, production build, PC/mobile E2E 64개, CI 33947031270, 네 image tag/digest 일치, `1a80f99` 개발 배포·공개 탐색 smoke 통과; [검증 기록](../../docs/runbooks/0.3.0-phase3-validation.md) | Phase 4가 current editor text와 tag 포함 section 범위·문서 순서 선택을 사용 |
| 2026-09-05 | 0.3.0 / Phase 2 | Codex | CodeMirror 순수 텍스트 편집, IME 안전 직렬 자동 저장, 정확한 저장 상태·재시도, PC·모바일 레이아웃과 10만 자 입력을 구현 | check, 75 unit/DB tests, production build, PC/mobile E2E 60개, secret scan, CI 33945630864, 네 image tag/digest 일치, `cef1d0c` 개발 배포·공개 편집 smoke 통과; [검증 기록](../../docs/runbooks/0.3.0-phase2-validation.md) | Phase 3 parser가 editor DOM을 수정하지 않고 transaction·visible range·selection port를 사용 |
| 2026-09-05 | 0.3.0 / Phase 1 | Codex | 가사 1:1 subtype·동일 owner 부모·순수 텍스트 CRUD·CAS·멱등 복제·삭제 batch·실제 가사 수 구현 | 70 unit/DB tests, migration 0200/0201/0300 복구, production build/image, PC/mobile E2E 52개, CI 33943267049, 네 image tag/digest 일치, 299a683 개발 배포·공개 API smoke 통과; [검증 기록](../../docs/runbooks/0.3.0-phase1-validation.md) | 사용자 지시에 따라 여기서 중지, Phase 2 미시작 |
| 2026-09-05 | 0.2.0 / 운영 보완 | Codex | 네 service image를 독립 Docker Hub repository로 분리하고 개발은 version·전체 SHA·`Dev`·`Dev-latest`, 승인된 릴리스는 `Release`·`latest`까지 같은 digest로 발행하도록 자동화·협업 문서를 갱신 | actionlint 1.7.12, Compose·shell·tag/ref 차단 계약, check, 59 tests, GitHub Actions publish와 네 repository의 tag·digest 일치 확인 | 릴리스는 사용자의 명시적 지시와 정확한 `v<VERSION>` Git tag에서만 수동 실행하고 릴리스 서버는 별도 지시 전까지 변경하지 않음 |
| 2026-09-05 | 0.2.0 / 운영 보완 | Codex | 기존 필수 version+SHA tag를 유지하면서 네 service에 `beta-latest-<service>` 다중 tag를 추가하고, 충돌 없는 기본 `beta-latest`를 web에만 연결 | actionlint 1.7.12, Compose·shell·tag 계약, check, 59 tests, GitHub Actions publish와 Docker Hub alias·digest 일치 확인 | 정식 전환 지시 전까지 `beta-latest*`는 beta image만 가리키며 `latest`는 생성하지 않음 |
| 2026-09-05 | 0.2.0 / 운영 보완 | Codex | CI 검증 뒤 web·collaboration·worker·migrate image를 `parkingplace/lyricscloud`에 필수 version·beta·commit·service 고정 tag와 버전별 이동식 beta tag로 자동 발행하고, 명시적 승인 전 정식·latest tag를 차단 | migration·복구, check, 59 tests, production build, E2E 42개, 네 production image runtime smoke, GitHub Actions 33940168228, Docker Hub 8개 tag·service별 digest 일치 | 이후 `main`·`phase/**` push마다 beta 자동 발행을 필수 확인하고, 사용자가 명시적으로 요청할 때만 정식 tag 정책 추가 |
| 2026-09-05 | 0.2.0 / 운영 보완 | Codex | 로컬·개발·릴리스 Docker 작업 뒤 LyricsCloud 중지 컨테이너·미사용 image·network와 builder cache를 정리하고 volume·실행 중 자산은 보존하는 공통 스크립트와 운영 원칙을 추가 | shell·옵션·Compose 검사, check, 59 tests, dry-run, 로컬 실제 정리 약 10.5GB 회수 및 실행 중 컨테이너·전체 volume 전후 일치, [`정리 runbook`](../../docs/runbooks/docker-cleanup.md) | 개발 배포 성공 경로에서 자동 실행, 별도 test project도 명시 정리, 릴리스는 명시적으로 승인된 배포 smoke 성공 뒤 실행 |
| 2026-09-05 | 0.2.0 / Phase 5 | Codex | 실제 곡 대시보드, 미지원 0 집계, 가사·연결 자료 빈 상태, 작업 메모, pin·favorite rollback, 제목·영향 기반 soft delete 확인과 목록 query 복귀를 완성하고 공개 개발 web을 production standalone asset으로 보정해 0.2.0 종료 | check, 59 tests, production build, production Docker image CSS 일치, desktop/mobile 전체 E2E 42개, A/B 상세·삭제 차단, orphan 0건, secret scan, [`검증 보고서`](../../docs/runbooks/0.2.0-phase5-validation.md) | [`0.3.0 가사 영역 인계`](../../docs/architecture/0.3.0-LYRICS-HANDOFF.md) |
| 2026-09-05 | 0.2.0 / Phase 4 | Codex | 새 곡·곡 수정 공통 폼에 domain 길이 계약, 7개 상태·5개 색상, pin·favorite, 저장 오류·진행 상태, 이탈 확인과 owner 범위 서버 로드를 구현 | check, 58 tests, production build, 기본값·validation·중복 제출·전체 필드 생성/수정·320px·교차 계정 desktop/mobile E2E, [`검증 기록`](../../docs/runbooks/0.2.0-phase4-validation.md) | Phase 5 곡 대시보드, soft delete와 전체 곡 흐름 |
| 2026-09-05 | 0.2.0 / Phase 3 | Codex | owner 범위 곡 목록을 PC 2열·모바일 1열 카드로 구현하고 지연 검색, URL 상태, 상태·다섯 정렬, cursor 추가 로드, pin·favorite 낙관적 갱신과 구분된 빈·오류 상태 완성 | check, 57 tests, production build, 0·30곡 desktop/mobile E2E 및 320px·큰 글자·focus 검증, [`검증 기록`](../../docs/runbooks/0.2.0-phase3-validation.md) | Phase 4 새 곡·곡 수정 공통 폼과 대시보드 이동 |
| 2026-09-05 | 0.2.0 / Phase 2 | Codex | owner 범위 곡 CRUD·명시적 메타데이터 명령, owner별 생성 멱등성, 문자 그대로 부분 검색, 상태 필터, 핀 우선 다섯 keyset 정렬과 미지원 집계 capability 완성 | 0200·0201 migration 재적용/rollback/recovery, 14 files/57 tests, production build, desktop/mobile E2E 30개, secret scan, [`검증 기록`](../../docs/runbooks/0.2.0-phase2-validation.md) | Phase 3 곡 목록 URL 상태·카드·cursor UI |
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
