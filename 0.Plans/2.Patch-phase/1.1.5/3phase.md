# 1.1.5 Phase 3 — PC·모바일 사용자 흐름

- 상태: **검토** (`review`, 로컬 인수 완료·CI/개발 배포 대기)
- 단계 목적: 승인 디자인 적용·탐색 셸의 PC·모바일 사용자 흐름을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

별도 UX 설계 승인안을 공통 셸·내비게이션·목록부터 점진적으로 적용한다. 마이너는 1.1을 유지한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.1.5 P2](2phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
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

- [x] `LC-NF-1.1.5-P3-01` 공통 헤더·접힌 sidebar·모바일 내비를 승인 목업대로 구현한다. — 중복 desktop tab을 B-1에서 context header로 바꾸고 rail tooltip·active 표시와 모바일 5개 주 내비+More를 구현했다.
- [x] `LC-NF-1.1.5-P3-02` 곡·라임·프롬프트·검색·최근·즐겨찾기 목록의 시각 계층을 맞춘다. — B-1 flat panel/card·heading·focus 계층을 공통 selector로 적용하고 곡 workspace의 2-column/모바일 stack을 유지했다.
- [x] `LC-NF-1.1.5-P3-03` list/grid 밀도·사용자 순서·focus·필터를 디자인 전환 중 유지한다. — 기존 library view class·order control·URL filter·route child를 수정하지 않고 시각 cascade만 한정했다.
- [x] `LC-NF-1.1.5-P3-04` 양 테마·320px·200%확대·키보드·스크린리더를 화면별로 검증한다. — dark/light·320px·720px CSS reflow·keyboard/focus·15화면 Axe serious/critical 0을 통과했다. 실제 OS screen reader와 물리 200% zoom은 P4 실행 입력으로 남겼다.
- [x] `LC-NF-1.1.5-P3-05` `tests/e2e/new-feature-1.1.5.spec.ts`에 실제 기능 경로를 등록하고 정상·빈 상태·실패·권한 없음·로딩을 PC와 모바일에서 검사한다. — 두 viewport에서 shell·empty song·search loading/error·protected redirect를 실제 route로 검증했다.
- [x] `LC-NF-1.1.5-P3-06` 입력·선택·IME·undo·로컬 초안·서버 저장 상태의 연속성을 확인한다. — rail/More 조작 전후 동일 CodeMirror DOM, 한글 입력·undo·저장 상태를 PC/mobile에서 검증했다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.1.5-01` | 저장 중 가사에서 sidebar/내비 전환 | editor·IME·초안이 재생성되거나 지워지지 않는다. |
| `AC-1.1.5-02` | 이전 deep link·필터 URL·최근 작업 | 같은 자료와 문맥으로 들어간다. |
| `AC-1.1.5-03` | 양 테마의 접힌 sidebar·모바일 More | 아이콘·툴팁·포커스·동작이 일치한다. |
| `AC-1.1.5-04` | 새 디자인 승인 없음 | 연구 문서만 유지하고 runtime VERSION을 올리지 않는다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

- 실패 재현: 구현 전 P3 E2E 2 PASS·4 FAIL — desktop 중복 tab/context header 미구현, mobile 주 내비 6개 노출을 고정했다. editor continuity 2건은 기존 계약으로 이미 PASS했다.
- Node 24 `pnpm check`·web production build: PASS.
- Playwright P3 PC/mobile: 6 PASS — context header/rail tooltip, mobile 5개 주 내비+More/focus 복귀, 동일 editor DOM·한글 입력·undo, 빈 상태·loading·failure·protected redirect, light·320/720 reflow·overflow 0.
- 관련 회귀 40건: 초기 B-1 light 상태 badge/prompt token 대비 2 FAIL을 확인하고 수정. 그 외 30 PASS·8 조건부 skip. 수정 후 15화면×dark/light Axe serious/critical PC/mobile 2 PASS.
- 최초 후보 Actions `34806946625`: 신규 P3 검사는 전부 PASS했고 전체 E2E 359 PASS·41 skip·flaky retry 1 PASS였으나, 기존 responsive shell이 B-1에서 숨긴 호환용 즐겨찾기 링크까지 터치 대상으로 계산해 320px에서 0px 높이 1건 FAIL. 제품 결함이 아닌 검증 대상 선택 오류로 판정해 보이는 5개 링크·버튼만 44px 기준을 적용하고, 5개 주 내비+More 구성은 신규 P3 검사로도 계속 고정한다.
- API·DB·migration·route/store/editor 수정 0. 실제 OS IME·screen reader·물리 줌은 실행하지 않았으며 P4 교차 검증 입력으로 유지한다.
- 남은 게이트: 후보 SHA push·필수 CI·네 dev image·동일 SHA 개발 배포·공개 스모크. 완료 전 PASS로 승격하지 않는다.

## 완료 조건

- [ ] 작업 ID마다 코드/설계·실행/검토 증거·정확한 SHA가 연결되어 있다.
- [ ] 현재 패치의 원문·권한·복구·오류 처리가 정상 동작과 함께 검증되었다.
- [ ] 미실행·남은 결함·외부 차단·보류한 기술 결정이 숨김없이 기록되었다.
- [ ] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [ ] 구현 Phase는 CI·동일 SHA 개발 인수를, 설계-only는 승인 증거를 갖췄다.
- [ ] main·Release·운영 변경은 별도 현재 승인 없이 수행하지 않았다.

## 산출물

- 1.1.5 P3의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.1.5 P4](4phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.
