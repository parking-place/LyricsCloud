# 1.2.4 Phase 4 — worker·health·연결 수와 장애 신호

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

정상 ping 뒤에 숨은 작업 실패를 드러내고 비용을 측정한다.

진입 조건: [P3](3phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-124-P4-01` purge 마지막 성공·연속 실패·실행 시간·backlog age를 제한된 enum/count/duration으로 노출하고 본문·계정 식별자 label을 배제한다.
- [ ] `LC-RD-124-P4-02` 장시간 query/lock·실패 재시도·중첩 방지·SIGTERM drain을 검사한다. worker health가 DB ping만으로 성공하지 않게 의미를 명시한다.
- [ ] `LC-RD-124-P4-03` health 호출의 pool 생성 비용과 총 연결 수를 측정하고 필요성이 입증된 경우에만 pool/cache를 조정한다. 장애·schema 탐지 지연 목표를 유지한다.
- [ ] `LC-RD-124-P4-04` 설정 변경과 shutdown의 pool 해제·RLS transaction-local context·A→B 연결 재사용을 검사하고 느린 query/idle transaction 처리 근거를 기록한다.
- [ ] `LC-RD-124-P4-05` 백업 KILL 회복·위조 헤더·프로필 413·purge 지연을 개발 환경 인수 시나리오로 연결하고 복구 시간/실패 흔적을 남긴다. **[WC-14](../BRANCH-COMPARISON-118-P4.md)**의 b에 통합된 수정·회귀를 먼저 인수하고 미인수 잔여에만 추가 적용한다: 지속 실패 20개 뒤 정상 문서가 굶지 않는 keyset/wrap·trash 제외·timer 재진입 방지·Y.Doc cleanup·timestamp/오류 marker 보존을 검사한다. worker purge M-04 완료와 구별한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **OPS-01, OPS-02, OPS-03, M-04, M-05; 코드 리뷰 §5.3/5.5 운영 제안** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-124-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

백업 잠금을 단순 시간 경과로 삭제하지 않는다. 잠금 구현과 파일시스템 보장을 검증하고 rollback 때 진행 중 백업의 소유권을 침범하지 않는다. 프록시 변경은 승인된 개발 환경에서 검증 후 적용하며 실패 시 직전 검증 설정으로 복구한다. 기존 archive·DB volume·외부 백업 예외는 그대로 보존한다.

다음 입력: [P5](5phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
