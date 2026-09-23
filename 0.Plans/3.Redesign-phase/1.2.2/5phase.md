# 1.2.2 Phase 5 — 동시성·실제 입력·호환 종합 인수

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

실패 재현을 브라우저·서버·실기기 경계로 확장한다.

진입 조건: [P4](4phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-122-P5-01` ES-01~04와 UI-02별 실패 전 입력을 그대로 사용해 수정 후 원문·raw·projection·ACK 기대값을 대조한다.
- [ ] `LC-RD-122-P5-02` Windows Chrome/Edge, iOS/Android 실제 지원 입력 환경에서 Hangul IME·키보드 전환·조합 중 remote를 검사하고 Linux 합성과 구분한다.
- [ ] `LC-RD-122-P5-03` 큰 문서·짧은 연속 입력·두 탭·offline/reconnect·권한 회수·서버 재시작을 교차해 중복/누락·undo 회귀를 검사한다.
- [ ] `LC-RD-122-P5-04` 기존 snapshot·outbox를 가진 구 client와 변경 client의 혼용 및 application rollback을 실제 데이터 fixture로 검사한다.
- [ ] `LC-RD-122-P5-05` 미해결 손실·서버 거절·검증 환경 미확인을 ID별로 기록한다. 물리 입력 gate가 남으면 필요한 인수 상태를 review로 유지한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **ES-01, ES-02, ES-03, ES-04, UI-02; UX-08/10/11; M-08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-122-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

CRDT 원본·snapshot·기존 outbox와 구 클라이언트 update 호환을 먼저 고정한다. 포맷 변경 시 순방향 migration/호환 reader와 application rollback을 검증하고 불가역 변환은 별도 결정 전 실행하지 않는다. 서버 validator를 완화하거나 remote update를 버려 되돌리지 않는다.

다음 입력: [P6](6phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
