# 1.2.8 Phase 4 — 경계 테스트·실기기·운영 공백

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

자동 검사로 대신할 수 없는 환경을 분리해 인수한다.

진입 조건: [P3](3phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-128-P4-01` M-08의 다섯 실패 경로와 UI pagination을 실제 UI→CRDT→server/raw/store까지 연결하고 기존 회귀의 중복/누락만 보정한다. **[WC-12](../BRANCH-COMPARISON-118-P4.md)**의 기존 수정·회귀를 먼저 선별 인수한다: 1.2.0 P1/P4에서 먼저 보존 gate로 인수한다. 구 탭 lazy chunk·unknown client/worker restart·탭별 승인·offline activation·private/no-store/Set-Cookie 배제·중복 fetch를 검사한다. 1.2.1 guard가 reload를 소비한다.
- [ ] `LC-RD-128-P4-02` 실제 OS IME·모바일 키보드·AT·브라우저 조합을 현행 지원표대로 검사한다. unavailable은 미실행으로 남기고 필수 gate를 우회하지 않는다.
- [ ] `LC-RD-128-P4-03` 긴 네트워크 분할·다중 replica·worker backlog/락·health 비용을 격리 부하에서 측정하고 기존 예산/복구 목표와 비교한다.
- [ ] `LC-RD-128-P4-04` 실제 암호화 복원·populated schema migration/반복/rollback·RLS 재사용·프로필 decoder 경계를 선행 성공 SHA와 필요한 변경 범위에 맞춰 확인한다.
- [ ] `LC-RD-128-P4-05` 최종 후보의 production dependency/secret/image·전체 현재 E2E 검사를 수행하고 성공한 같은 SHA의 근거를 재사용한다. 과거 validator를 무조건 전체 실행하지 않는다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **M-01, M-02, M-03 잔여, M-06, M-07, M-08 잔여, M-10; coverage-map/verification 미실행 경계; D-14 후속** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-128-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

파일 분리와 도구 변경을 독립 commit으로 되돌릴 수 있게 한다. lint/CI 통과를 위해 기존 검사를 제거·완화하거나 필수 job을 skip하지 않는다. 새로운 pool·ORM·CRDT·관측 서비스 교체를 리팩터링 명목으로 포함하지 않으며 metadata rollback은 현재 발행 이력을 보존한다.

다음 입력: [P5](5phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
