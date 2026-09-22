# 1.2.8 Phase 3 — 의미 검사·CI·버전 metadata

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

검사의 이름과 실제 보장 범위를 맞춘다.

진입 조건: [P2](2phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-128-P3-01` boundaries 전용 검사와 실제 lint를 구별하고 Promise/hook/a11y/import 규칙을 필요한 범위부터 추가한다. 도구 추가는 기존 stack/ADR에 맞춰 결정한다.
- [ ] `LC-RD-128-P3-02` 합성 위반/정상 fixture로 규칙의 오탐·누락을 확인하고 기존 코드 전역 포맷 변경 없이 실제 문제만 보정한다.
- [ ] `LC-RD-128-P3-03` 빠른 계약/단위/정적 검사와 최종 CI 결과의 출처 SHA를 연결한다. docs/intermediate skip 정책과 mandatory job의 차이를 유지한다. **[WC-18](../BRANCH-COMPARISON-118-P4.md)**의 기존 수정·회귀를 먼저 선별 인수한다: annotated release gate와 fileURLToPath 의도를 검토하되 windows-native needs/assertion·1.1.8 build ID와 분리한다. native 재개 없이 같은 정책 의미를 유지하고 1.2.0 P1 metadata/6 Phase 지원을 재사용한다.
- [ ] `LC-RD-128-P3-04` action 참조를 승인된 SHA/digest 정책에 맞추고 갱신 근거·권한·출처·호환 검사를 자동 갱신 PR에 연결한다. 특정 취약점이 있다고 단정하지 않는다.
- [ ] `LC-RD-128-P3-05` release metadata 생성/검증의 중복을 줄이되 1.1.7a 예외·새 계획 경로·가변 phase·다자리 숫자·잘못된 경로 거부를 유지한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **M-01, M-02, M-03 잔여, M-06, M-07, M-08 잔여, M-10; coverage-map/verification 미실행 경계; D-14 후속** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-128-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

파일 분리와 도구 변경을 독립 commit으로 되돌릴 수 있게 한다. lint/CI 통과를 위해 기존 검사를 제거·완화하거나 필수 job을 skip하지 않는다. 새로운 pool·ORM·CRDT·관측 서비스 교체를 리팩터링 명목으로 포함하지 않으며 metadata rollback은 현재 발행 이력을 보존한다.

다음 입력: [P4](4phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
