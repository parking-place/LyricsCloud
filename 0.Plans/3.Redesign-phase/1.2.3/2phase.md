# 1.2.3 Phase 2 — 로그인 자동 회복·세션 연장

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

같은 프로세스와 실제 응답 경로에서 인증 복구를 확인한다.

진입 조건: [P1](1phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-123-P2-01` 실패한 discovery Promise만 현재 cache와 동일할 때 해제하고 성공 cache·동시 요청을 보존한다.
- [ ] `LC-RD-123-P2-02` 503/timeout/연속 실패 후 복구와 오래된 실패가 새 성공을 지우지 않는 경쟁을 시험한다. unhandled rejection과 재시도 폭주를 차단한다.
- [ ] `LC-RD-123-P2-03` SSR에서 DB 연장만 소비되어 cookie 갱신을 놓치지 않도록 응답 경로를 정렬하고 browser Set-Cookie를 확인한다.
- [ ] `LC-RD-123-P2-04` 합성 clock으로 day24/절대 만료/동시 탭/revoke/logout을 시험하며 secure/nonsecure 이름과 기존 redirect 정책을 유지한다.
- [ ] `LC-RD-123-P2-05` 실제 Google 성공 로그인 점검과 합성 provider 장애 전환의 증거를 구분한다. 외부 provider에 의도적 장애나 부하를 가하지 않는다. **[WC-13](../BRANCH-COMPARISON-118-P4.md)**의 b에 통합된 수정·회귀를 먼저 인수하고 미인수 잔여에만 추가 적용한다: provider 왕복과 intent/code/identity lock 뒤 live clock을 확인해 만료 시 session/grant/code 소비가 남지 않는지 시험한다. 다른 kid와 동일 kid bytes 변경의 운영 제약·tombstone을 유지하고 BE-01/02와 구별한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **BE-01, BE-02, BE-03, BE-04; UX-01/17/23; 코드 리뷰 §5.2 오류 분류 후보** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-123-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

기존 receipt/hash·세션/쿠키 형식의 읽기 호환을 유지한다. replay를 위해 token 원문을 저장하거나 자동 회전하지 않는다. 캐시 무효화를 되돌릴 때 실패 고착을 재도입하지 않으며 세션 연장 경로가 사라지는 후보는 배포하지 않는다.

다음 입력: [P3](3phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
