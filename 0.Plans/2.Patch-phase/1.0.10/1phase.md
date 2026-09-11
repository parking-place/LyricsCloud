# 1.0.10 Phase 1 — 계약·실패 사례·담당 경계

- 상태: **완료** (`complete`, 2026-09-11)
- 단계 목적: Suno 모델명·복수 작업 링크의 계약·실패 사례·담당 경계을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

곡에 Suno 모델명을 선택·기록하고 여러 작업용 곡 링크를 저장·새 탭으로 열 수 있게 한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.0.9 P5](../1.0.9/5phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
- 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임·필수 물리 기기 확보.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/LIBRARY-SUNO.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-030`, `NF-REQ-031`, `NF-REQ-033`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

다른 패치의 기능·사용자가 선택하지 않은 Future 아이디어·승인 없는 기술 교체·운영 변경은 제외한다.

## 수정 책임 경로와 인터페이스

- `packages/domain/src`
- `packages/database/src`
- `packages/database/migrations`
- `apps/web/src/components`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.0.10-P1-01` 사용자 예시 여덟 값을 초기 후보로만 고정했다. 2026-09-11 공식 릴리스 노트의 v6 계열과도 다르므로 현행 공식 전체 목록이라고 주장하지 않고 unknown/custom 값을 보존한다.
- [x] `LC-NF-1.0.10-P1-02` nullable `modelLabel`의 NFC/trim/64 code point/제어문자 경계와 LyricsCloud 작업 metadata 의미를 확정했다. Suno API·오디오 생성 설정은 변경하지 않는다.
- [x] `LC-NF-1.0.10-P1-03` active 곡당 수동 링크 최대 20개, URL·제목·메모·순서와 수동 우선권을 확정했다. 자동 제목/시간/thumbnail은 1.0.11 provider 승인 뒤 별도 파생 필드다.
- [x] `LC-NF-1.0.10-P1-04` 기존 song contract/store·대시보드·내부 연결 route·lifecycle·export 경로를 읽고 정상·오류·권한·복구 입력표를 [P1 인수 기록](../../../docs/runbooks/1.0.10-phase1-suno-manual-contract.md)에 고정했다.
- [x] `LC-NF-1.0.10-P1-05` aggregate GET/command API, 1003 additive schema, owner+active parent·CAS/idempotency, URL allowlist, soft delete/restore/export와 application-first rollback을 `PROD-NF-004`로 승인했다.
- [x] `LC-NF-1.0.10-P1-06` P2/P3 담당 파일과 실제 출발 source SHA `07efeb075ff420d5b835e345584c8023a9c1ba66`를 연결하고 자동 metadata·공유·사전·폰트를 섞지 않았다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.0.10-01` | 한 곡에 서로 다른 3개 Suno 링크 | 각 링크가 독립적으로 저장·재접속·새 탭 열기 된다. |
| `AC-1.0.10-02` | 다른 계정의 곡 ID에 링크 추가 | 거부하며 링크/모델 정보가 노출되지 않는다. |
| `AC-1.0.10-03` | 링크 제거/곡 휴지통/복원 | 외부 원곡은 건드리지 않고 내부 데이터 계약대로 복원된다. |
| `AC-1.0.10-04` | 알 수 없는 모델명·잘못된 URL | 문법/길이 정책대로 처리하고 원문과 다른 링크는 유지한다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

## 완료 조건

- [x] 작업 ID마다 설계·검토 증거·정확한 출발 SHA가 연결되어 있다.
- [x] owner/parent·CAS/idempotency·URL/길이·삭제/복원/export·새 탭 오류 기대를 입력표로 고정했다. runtime 검증은 P2~P4 책임이다.
- [x] DB/API/browser/실기기와 1.0.11 자동 provider가 아직 미실행·미승인임을 기록했다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [x] 설계-only Phase는 2026-09-11 사용자의 전체 실행 승인과 `PROD-NF-004` 승인 기록을 갖췄다.
- [x] P1 변경은 v1.0.9 artifact나 릴리스 서버를 변경하지 않는다.

## 산출물

- 1.0.10 P1의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.0.10 P2](2phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.

P2는 [인수 기록](../../../docs/runbooks/1.0.10-phase1-suno-manual-contract.md)의 `1003_song_suno_workspaces.sql`, aggregate GET/command API, owner+active parent·CAS/idempotency·URL allowlist·soft delete/restore/export 계약과 실패 우선 fixture를 소비한다.
