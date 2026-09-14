# PROD-NF-006 — 디자인 승인·점진 적용

- 상태: **Accepted for B-1 incremental implementation**
- 작성일: 2026-09-09
- 결정 Phase: UX P5, 1.1.5~1.1.6 소비
- 승인: 2026-09-14 사용자가 `B-1` 확인 질문에 `1.1.14까지 달렷`이라고 답해 통합 workspace+Flat-depth 선택과 UX P3~P5·계획된 후속 실행을 승인했다. P4 수정은 mobile layout 세부 조정뿐이며 선택안 의미와 기능 범위를 바꾸지 않아 UX P5에서 최종 구현 인수로 확정했다.

## 해결할 질문

전면 디자인을 기존 편집 생명주기·자료 계약을 깨지 않고 어떻게 적용할 것인가?

## 검토한 대안

1. 현재 자료 계약을 재사용하되 새 동작의 경계를 명시한다.
2. 모든 상태/권한/형식을 일괄 교체한다. 영향·이행 비용이 크므로 사전 검증 없이 선택하지 않는다.
3. 외부 의존 또는 구현 가능성이 확인되지 않으면 범위를 숨기지 않고 사용자에게 대안·차단 이유를 제시한다.

## 권장 선택과 이유

사용자가 선택한 `B-1`을 기능 삭제 없이 상태 행렬과 new_Mock-up으로 먼저 만들고 셸/목록 다음 편집/복구 화면 순서로 적용한다. viewport별 primary navigation은 하나로 수렴하고 mobile editor 고정 도구는 핵심 4개 이하로 제한한다. 외형/OS 변화만으로 새 minor를 발행하지 않는다.

## 승인 조건

- 18화면의 기능·정상/오류/권한/복구 상태를 삭제하지 않는다.
- URL/API/DB, CodeMirror/Yjs, IME/selection/undo, 계정별 초안/outbox, owner/actor/capability 계약을 유지한다.
- 1.1.5는 token·shell·목록/workspace, 1.1.6은 editor/상세 화면으로 분리하며 feature flag를 rollback 경계로만 사용한다.
- P4 자동 검증은 실제 OS/IME/AT/물리 기기 PASS를 뜻하지 않는다.
- 각 제품 버전은 자체 Phase·CI·동일 SHA 개발 인수와 별도 release gate를 통과한다.

[승인 manifest](../ux/ux-p5-approved-design-manifest.md)와 [1.1.5 인계](../ux/ux-p5-to-1.1.5-handoff.md)가 이 결정의 구현 입력이다.

## 영향과 검증

양 테마·한글 IME·selection/undo/초안·320px/확대·핵심 동선·원문/copy 동등성. 실제 source SHA·변경 파일·schema·자동/수동 증거를 해당 Phase 인수표에 기록한다. 새 문서가 있다는 사실만으로 기존 Accepted 결정을 폐기하지 않는다.

## 되돌림·비용

새 기능을 중단해도 기존 원문·owner 데이터·정식 버전 기록을 유지한다. 형식/권한을 되돌릴 때 추가 쓰기·미전송 자료·구버전 client의 호환을 확인하고 destructive rollback은 별도 승인한다.

## 범위 밖

미선택 Future 아이디어·원문 외부 전송·운영 배포·메이저 증가의 자동 승인은 포함하지 않는다.

[상세 계약](../../0.Plans/2.Patch-phase/contracts/DESIGN-NATIVE.md) · [결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md) · [버전별 작업 계획](../../0.Plans/2.Patch-phase/ROADMAP.md)
