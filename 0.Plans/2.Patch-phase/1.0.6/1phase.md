# 1.0.6 Phase 1 — 계약·실패 사례·담당 경계

- 상태: **완료** (`complete`, 2026-09-11)
- 단계 목적: Extend 작업 메모·송폼 삽입 메뉴의 계약·실패 사례·담당 경계을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

Extend 표식은 원문에 남기면서 Suno 전체 복사에서 제외하고, 현재 커서에 기본 송폼을 안전하게 삽입한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.0.5 P5](../1.0.5/5phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
- 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임·필수 물리 기기 확보.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/EDITOR-COPY.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-026`, `NF-REQ-027`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

다른 패치의 기능·사용자가 선택하지 않은 Future 아이디어·승인 없는 기술 교체·운영 변경은 제외한다.

## 수정 책임 경로와 인터페이스

- `packages/domain/src`
- `packages/editor/src`
- `apps/web/src/components`
- `apps/web/src/lib`
- `tests/e2e`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.0.6-P1-01` 정확한 Extend 표식의 토큰/행 제거 범위를 정했다. base label이 대소문자까지 정확히 `Extend`인 정식 full-line marker만 Suno 전체 copy에서 marker와 소속 LF 하나를 제외하며 뒤 가사는 삭제하지 않는다.
- [x] `LC-NF-1.0.6-P1-02` `[Extend: 3:00:24]` 시간 문자열은 불투명 사용자 메모로 원문·revision·recovery export에 그대로 보존하고 임의 시간 단위 변환을 하지 않는다.
- [x] `LC-NF-1.0.6-P1-03` 우클릭은 브라우저 기본 context를 막지 않는 보조 수단으로 고정했다. 키보드 메뉴키/`Shift+F10`과 모바일 보이는 삽입 버튼이 같은 명령을 사용한다.
- [x] `LC-NF-1.0.6-P1-04` `copy.ts`·`songform.ts`·`cursor-insertion.ts`·CodeMirror wrapper·lyric editor와 기존 CRDT/IME E2E를 읽고 정상·오류·권한·복구 입력표를 [P1 인수 기록](../../../docs/runbooks/1.0.6-phase1-extend-insert-contract.md)에 고정했다.
- [x] `LC-NF-1.0.6-P1-05` 저장 schema/API/권한은 바꾸지 않고 Suno 전체 copy builder와 editor 삽입 명령만 확장한다. 상대 위치 해석 실패·조합 중에는 무변경으로 종료하며 UI와 builder rollback이 저장 원문을 건드리지 않는다고 결정 문서에 기록했다.
- [x] `LC-NF-1.0.6-P1-06` 담당 경로와 출발 source SHA `4411bc1eb74c90a6a1c47f7e3315de2d5ff39edb`를 인수 기록에 연결했고 다른 patch 기능을 섞지 않았다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.0.6-01` | [Extend: 3:00:24] 뒤 두 줄 가사 전체 복사 | 표식만 제외되고 가사 두 줄은 남는다. |
| `AC-1.0.6-02` | 원문 export·revision 복원 | Extend 표식과 시간 문자열이 그대로 남는다. |
| `AC-1.0.6-03` | 우클릭 후 다른 탭이 앞부분 수정 | 안전한 상대 위치에 한 번만 삽입되거나 보존 안내가 나온다. |
| `AC-1.0.6-04` | IME 조합 중 메뉴·Escape·undo | 조합 원문이 보존되고 한 번 undo로 삽입만 취소된다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

## 완료 조건

- [x] 작업 ID마다 설계·검토 증거·출발 SHA가 연결되어 있다.
- [x] 원문·권한·복구·오류 처리 기대가 정상 흐름과 함께 입력표로 고정됐다. 실제 runtime 검증은 P2~P4 책임으로 명시했다.
- [x] 미실행 runtime/브라우저/실제 IME 검증과 남은 구현을 숨김없이 기록했다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [x] 설계-only Phase는 2026-09-11 사용자의 전체 실행 승인과 범위 확정 증거를 갖췄다.
- [x] P1에서 main·Release·운영을 변경하지 않았다.

## 산출물

- 1.0.6 P1의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.0.6 P2](2phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.

P2는 [인수 기록](../../../docs/runbooks/1.0.6-phase1-extend-insert-contract.md)의 marker fixture·단일 source 메뉴·상대 caret/무변경 실패 계약을 소비한다. P1 문서 자체에는 runtime PASS를 기록하지 않는다.
