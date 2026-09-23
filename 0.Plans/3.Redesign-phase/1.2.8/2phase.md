# 1.2.8 Phase 2 — 편집·스타일 책임 분리

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

기존 실패 회귀를 유지한 작은 단위로 구조를 개선한다.

진입 조건: [P1](1phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-128-P2-01` 고정된 ES fixture를 유지하며 transport와 공통 도메인 연산, 내구성 상태 전이를 분리한다. 전체 sync 엔진을 한 번에 교체하지 않는다.
- [ ] `LC-RD-128-P2-02` owner/selected/guest/prompt의 namespace·권한 epoch·거절 복구 전략은 명시적 어댑터로 유지하고 과도한 공통 추상화를 피한다.
- [ ] `LC-RD-128-P2-03` lyric/editor UI의 lifecycle·selection·IME·복사 경계를 분리하고 재렌더/cleanup·메모리 누수·undo 보존을 검사한다.
- [ ] `LC-RD-128-P2-04` 남은 global CSS를 shell/editor/list/overlay/form 책임과 semantic 상태/크기 토큰으로 나누고 이전 UI rollback 경계를 유지한다.
- [ ] `LC-RD-128-P2-05` 각 분리 단계에서 기존 입력/저장/권한 회귀와 시각 비교를 실행해 행동 보존을 확인하고 효과 없는 구조 변경은 채택하지 않는다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **M-01, M-02, M-03 잔여, M-06, M-07, M-08 잔여, M-10; coverage-map/verification 미실행 경계; D-14 후속** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-128-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

파일 분리와 도구 변경을 독립 commit으로 되돌릴 수 있게 한다. lint/CI 통과를 위해 기존 검사를 제거·완화하거나 필수 job을 skip하지 않는다. 새로운 pool·ORM·CRDT·관측 서비스 교체를 리팩터링 명목으로 포함하지 않으며 metadata rollback은 현재 발행 이력을 보존한다.

다음 입력: [P3](3phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
