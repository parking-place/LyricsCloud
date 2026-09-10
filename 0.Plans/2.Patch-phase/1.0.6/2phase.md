# 1.0.6 Phase 2 — 핵심 기반·저장과 서버

- 상태: **완료** (`complete`, 2026-09-11)
- 단계 목적: Extend 작업 메모·송폼 삽입 메뉴의 핵심 기반·저장과 서버을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

Extend 표식은 원문에 남기면서 Suno 전체 복사에서 제외하고, 현재 커서에 기본 송폼을 안전하게 삽입한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.0.6 P1](1phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
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

- [x] `LC-NF-1.0.6-P2-01` 실제 unit runner에 포함되는 `packages/editor/src/{copy,songform-insertion}.test.ts`를 먼저 추가해 기존 copy 2건과 누락 module 1 suite 실패를 확인했다.
- [x] `LC-NF-1.0.6-P2-02` 전체 Suno copy에서 exact-case Extend 정식 marker 줄과 소속 LF 하나만 제외했다. 저장/revision/export 경로는 건드리지 않았다.
- [x] `LC-NF-1.0.6-P2-03` `copySongFormSections`는 별도 LF serializer를 사용해 Extend 원문을 보존하고 전체 Suno copy filter와 분리했다.
- [x] `LC-NF-1.0.6-P2-04` 기존 BrowserLyricSync의 Yjs 상대 selection capture/resolve를 재사용하고 단일 source marker·독립 줄 change builder를 추가했다. composition guard의 UI 소비는 P3로 인계한다.
- [x] `LC-NF-1.0.6-P2-05` remote prefix 뒤 상대 caret 해석·한 Yjs transaction 삽입·한 undo 복구와 invalid position/marker 무변경을 단위 검증했다.
- [x] `LC-NF-1.0.6-P2-06` schema/API/권한 변경이 없음을 확인했다. 기존 schema `1000_prompt_modes.sql`로 동일 SHA 개발 migrate·기동을 통과했고 실패 fixture와 전체 unit·check·build를 다시 실행했다.

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

- [x] 작업 ID마다 코드·실행·검토 증거와 후보 SHA `7f87b8af1a5118c2d5eda3a07948e89c1696a215`가 연결되어 있다.
- [x] 현재 patch의 원문·오류·복구 경계를 unit과 기존 전체 회귀로 검증했다. UI 권한·복구 교차 검증은 P3/P4에 명시했다.
- [x] 실제 UI/지원 브라우저/물리 IME 미실행과 후속 책임을 숨김없이 기록했다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [x] 구현 Phase는 원격 PR #45와 동일 SHA 개발 인수를 갖췄다. 정책상 최종 필수 CI는 P5 후보에서 수행하며 생략을 PASS로 기록하지 않았다.
- [x] main·Release·릴리스 서버는 변경하지 않고 개발 서버만 승인 범위에서 갱신했다.

## 산출물

- 1.0.6 P2의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.0.6 P3](3phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.
