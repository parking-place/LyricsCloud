# 1.1.4 Phase 4 — 실패·권한·복구 회귀

- 상태: **완료** (`complete`, 후보 `233afd2e75e03c388a4bac71635545c637087c53`)
- 단계 목적: 공유 안정성·복구 동선 정리의 실패·권한·복구 회귀을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

이미 제공한 읽기·쓰기 공유를 실제 장시간/다중 기기 상황에서 검증하고 경계 결함과 복구 동선을 보완한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.1.4 P3](3phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
- 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임·필수 물리 기기 확보.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/STABILIZATION.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-034`, `NF-REQ-035`, `NF-REQ-036`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

문서/검증만 발생하면 별도 소프트웨어 발행 없이 기록한다.

## 수정 책임 경로와 인터페이스

- `packages/editor/src`
- `apps/collaboration/src`
- `packages/database/src`
- `apps/web/src/components`
- `tests/e2e`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.1.4-P4-01` `AC-1.1.4-01`: 가속 network offline/online 4주기와 실제 web/collaboration/worker 재시작 뒤 원문·권한 수렴, browser outbox 64건 이하·재접속 후 0건을 검증했다. 실제 OS 절전은 미실행으로 분리했다.
- [x] `LC-NF-1.1.4-P4-02` `AC-1.1.4-02`: owner가 이전 revision을 복원하는 동안 selected writer가 offline에서 90회 넘게 편집한 뒤 재접속해 owner 승인 원문과 writer 원문을 모두 보존하고 복원 전 owner 중간 원문은 제거함을 검증했다.
- [x] `LC-NF-1.1.4-P4-03` `AC-1.1.4-03`: reader 회수와 writer에서 다음 계정으로 전환 뒤 이전 actor의 IndexedDB·본문·권한·메모가 노출되지 않음을 공개 개발 환경에서 검증했다.
- [x] `LC-NF-1.1.4-P4-04` `AC-1.1.4-04`: 가속 회귀를 S2/S3으로만 기록하고 실제 장시간·물리 기기·OS IME/절전을 S4/S5 PASS로 승격하지 않았다.
- [x] `LC-NF-1.1.4-P4-05` 직전 공유 버전, 다른 계정, offline/reconnect, 서비스 재시작과 Chromium/Firefox/WebKit PC·Chromium/WebKit mobile 회귀를 수행했다. 실제 물리 Windows/Linux/macOS/Android/iOS는 미실행이다.
- [x] `LC-NF-1.1.4-P4-06` 새 복구 회귀와 CI 5-browser matrix를 보강했고 제품 결함은 추가로 발견되지 않았다. assertion·기존 시험을 삭제하거나 완화하지 않았다.

- [x] `LC-NF-1.1.4-P4-07` 합성 owner/writer/reader 3계정과 desktop/mobile 두 viewport에서 presence·현재 작업·회수/재접속을 확인하고 same-owner 탭 회귀와 별도 공개 인수로 기록했다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.1.4-01` | 기기 절전·네트워크 전환·서버 재시작 반복 | 원문·권한·영수증이 수렴하고 대기 queue가 무한 증가하지 않는다. |
| `AC-1.1.4-02` | owner가 복원 중 offline writer 재접속 | 승인된 복원/병합 정책과 서로의 원문 보존을 확인한다. |
| `AC-1.1.4-03` | 권한 회수 후 다른 계정 로그인 | 이전 actor의 자료·초안이 다음 계정에 노출되지 않는다. |
| `AC-1.1.4-04` | 가속 소크만 실행한 경우 | 실제 장시간·실기기 검증을 통과했다고 기록하지 않는다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

- S0/S1 자동 증거: Node 24 `check`·production build PASS, 실제 PostgreSQL 93 files·364 PASS·외부 beta fixture 4 skip, 기본 Playwright 353 PASS·41 skip.
- S2 브라우저 증거: 1.1.4 전용 Chromium desktop 3 PASS, Firefox/WebKit desktop·Chromium/WebKit mobile 각 2 PASS와 desktop 전용 계정 전환 1건 조건부 skip. 공개 개발 환경의 3계정·2 viewport 복원/offline 병합·queue 상한/배출·reader 회수·계정 전환 격리 PASS.
- S3 서비스 증거: 후보 SHA 개발 서버의 web/collaboration/worker 실제 재시작 뒤 writer/read 지속성, 다음 계정 차단, 본문·메모 격리와 네 서비스 healthy PASS.
- GitHub Actions `34783619444`: 전체 verify와 네 dev image 발행·서명 PASS. digest는 web `sha256:7c0f490696786c6373641abfa5dcef186233d1f90167c37ff1508f18ce2b654f`, collaboration `sha256:3f730b38f93181c4257673785a71736af9d494cec021db92340ab87e87027792`, worker `sha256:49700c38de297407581eecb3f1268dcf73b41de01c53b8f15c52b917e0a4652c`, migrate `sha256:bc296e41c94082e0ec1e180fcdeb9b9fd1ccb96bb8d090acd159d21650c3e498`다.
- 동일 SHA 개발 인수: `1.1.4`·`dev`·`p4`, schema `1140_sharing_stability.sql`, postgres/web/collaboration/worker healthy. 합성 계정·자료는 인수 뒤 제거했다.
- S4/S5 미실행: 실제 장시간 wall-clock soak, 물리 Windows/Linux/macOS/Android/iOS, 실제 OS IME·절전/복귀는 수행하지 않았다. 자동 엔진·viewport·가속 반복을 해당 증거로 기록하지 않는다.

## 완료 조건

- [x] 작업 ID마다 코드/설계·실행/검토 증거·정확한 SHA가 연결되어 있다.
- [x] 현재 패치의 원문·권한·복구·오류 처리가 정상 동작과 함께 검증되었다.
- [x] 미실행·남은 결함·외부 차단·보류한 기술 결정이 숨김없이 기록되었다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [x] 구현 Phase는 CI·동일 SHA 개발 인수를 갖췄다.
- [x] main·Release·운영 변경은 수행하지 않았다.

## 산출물

- 1.1.4 P4의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.1.4 P5](5phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.
