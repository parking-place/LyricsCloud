# 1.1.5 Phase 1 — 계약·실패 사례·담당 경계

- 상태: **완료** (`complete`, 구현 전 계약)
- 단계 목적: 승인 디자인 적용·탐색 셸의 계약·실패 사례·담당 경계을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

별도 UX 설계 승인안을 공통 셸·내비게이션·목록부터 점진적으로 적용한다. 마이너는 1.1을 유지한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.1.4 P5](../1.1.4/5phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
- 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임·필수 물리 기기 확보.
- [UX 설계 P5](../design/UX/5phase.md)의 사용자 승인.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/DESIGN-NATIVE.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-037`, `NF-REQ-039`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

다른 패치의 기능·사용자가 선택하지 않은 Future 아이디어·승인 없는 기술 교체·운영 변경은 제외한다.

## 수정 책임 경로와 인터페이스

- `apps/web/src/components`
- `packages/ui/src`
- `apps/web/src/app`
- `tests/e2e`
- `0.Plans/2.Patch-phase/new_Mock-up`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.1.5-P1-01` design/UX의 다섯 단계와 사용자 승인을 확인한 뒤 구현 계약을 시작했다.
- [x] `LC-NF-1.1.5-P1-02` 색상·간격·아이콘·내비 변경이 API·DB·자료 권한을 바꾸지 않는 경계를 고정했다.
- [x] `LC-NF-1.1.5-P1-03` editor를 재마운트하지 않는 셸 이행과 classic/B-1 복귀 범위를 정의했다.
- [x] `LC-NF-1.1.5-P1-04` 관련 구현·테스트 경로와 정상·오류·권한·복구 입력표·증거 수준을 고정했다.
- [x] `LC-NF-1.1.5-P1-05` 저장 형식·API·순서·copy·권한은 변경 0이며 UI variant/호환/rollback만 승인했다.
- [x] `LC-NF-1.1.5-P1-06` P2~P5 파일 담당과 source/승인 artifact/tree SHA를 기록했다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.1.5-01` | 저장 중 가사에서 sidebar/내비 전환 | editor·IME·초안이 재생성되거나 지워지지 않는다. |
| `AC-1.1.5-02` | 이전 deep link·필터 URL·최근 작업 | 같은 자료와 문맥으로 들어간다. |
| `AC-1.1.5-03` | 양 테마의 접힌 sidebar·모바일 More | 아이콘·툴팁·포커스·동작이 일치한다. |
| `AC-1.1.5-04` | 새 디자인 승인 없음 | 연구 문서만 유지하고 runtime VERSION을 올리지 않는다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

- main `107ec24237cb2633f0e3d0d4ea6e78dd5265e8bd`, VERSION 1.1.4와 UX P5 승인 artifact/tree를 대조하고 [P1 셸 계약](../../../docs/runbooks/1.1.5-phase1-ui-shell-contract.md)에 실제 경로·실패 입력·담당·rollback을 고정했다.
- `WorkspaceShell`이 collapsed rail, 중복 workspace tabs, mobile More focus trap, logout/draft guard, theme fetch, global IME-safe shortcut, PWA를 함께 소유함을 확인했다. child/editor key를 바꾸지 않고 server-rendered `LC_UI_VARIANT=classic|b1` root attribute와 같은 store를 쓰는 점진 전환을 승인했다.
- song/rhyme/prompt 목록의 request sequence·optimistic rollback·view/order 설정, route의 returnTo/filter, responsive-shell/navigation-release/ui-audit/lyric durability 회귀를 P2~P4 입력으로 연결했다. API/DB/migration/capability 변경은 0으로 고정했다.
- 문서 validator·링크/결정/범위·Future inventory/hash·old Mock-up 보존을 검증했다. P1은 앱 test/DB/browser/서버를 실행한 구현 PASS가 아닌 문서-only 계약 인수다.

## 완료 조건

- [x] 작업 ID마다 계약·경로·실패 입력·정확한 기준 SHA가 연결되어 있다.
- [x] 원문·권한·복구·오류 계약을 UI 전환 중 불변으로 승인했다.
- [x] 실제 앱/DB/browser/서버 검증은 P2~P5 미실행임을 기록했다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 문서-only 수행과 일치한다.
- [x] 설계 승인과 구현 전 P1 계약 증거를 갖췄다.
- [x] main·Release·운영·runtime/DB 변경을 수행하지 않았다.

## 산출물

- 1.1.5 P1의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.1.5 P2](2phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.
