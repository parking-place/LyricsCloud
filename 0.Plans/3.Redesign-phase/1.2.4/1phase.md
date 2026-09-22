# 1.2.4 Phase 1 — 환경·조건부 위험·연결 예산 계약

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

실제로 배포할 토폴로지와 장애 판정 근거를 먼저 확인한다.

진입 조건: 선행 버전의 실제 인수와 이번 버전 [README](README.md)의 입력. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-124-P1-01` OPS-01 KILL 재현의 한계와 OPS-02/03 조건부 설정을 인수한다. 비밀 값 없이 실제 proxy chain·직접 접근 차단·업로드 경로 계약을 기록한다.
- [ ] `LC-RD-124-P1-02` 단일 호스트/공유 파일시스템별 잠금 보장을 확인하고 FD lock 또는 lease 선택과 의존 도구 가용성을 정한다.
- [ ] `LC-RD-124-P1-03` 정규화 client IP 전달 주체/헤더·주소 검증·CDN 신뢰 범위와 경로별 bytes 제한표를 정한다.
- [ ] `LC-RD-124-P1-04` worker success age/duration/failures/backlog age, query/lock timeout·drain 및 각 프로세스 pool 연결 예산의 baseline을 측정한다.
- [ ] `LC-RD-124-P1-05` OPS-100-001과 코드 결함을 구별하고 실제 백업/복원·외부 환경 인수에서 남은 gate와 승인된 변경 환경을 기록한다. **[WC-17](../BRANCH-COMPARISON-118-P4.md)**의 기존 수정·회귀를 먼저 선별 인수한다: 제공된 optional env의 안전 정수/공백·backup 값과 offset deadline의 ISO UTC 정규화를 인수한다. import-safe main guard/test를 함께 가져오며 실제 secret/keyring을 복사하거나 회전하지 않는다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **OPS-01, OPS-02, OPS-03, M-04, M-05; 코드 리뷰 §5.3/5.5 운영 제안** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-124-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

백업 잠금을 단순 시간 경과로 삭제하지 않는다. 잠금 구현과 파일시스템 보장을 검증하고 rollback 때 진행 중 백업의 소유권을 침범하지 않는다. 프록시 변경은 승인된 개발 환경에서 검증 후 적용하며 실패 시 직전 검증 설정으로 복구한다. 기존 archive·DB volume·외부 백업 예외는 그대로 보존한다.

다음 입력: [P2](2phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
