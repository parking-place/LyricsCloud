# 1.2.1 Phase 1 — 상태 계약·실패 재현·담당 인수

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

입력 수락, 기기 보관, 전송, 서버 ACK를 서로 다른 사실로 정의한다.

진입 조건: 선행 버전의 실제 인수와 이번 버전 [README](README.md)의 입력. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-121-P1-01` 1.2.0 인수 SHA에서 ES-05/06/07·UI-01/07의 재현/해결/미확인을 분류하고 선해결 SHA와 회귀를 인수한다. 각 컴포넌트와 editor 상태의 작성자를 정한다.
- [ ] `LC-RD-121-P1-02` dirty·composing·volatileError·durableLocal·pendingAck·permissionEpoch 상태와 saved 불변식을 표로 고정한다. 로컬 보관과 서버 저장의 표시 문구를 각각 연결한다.
- [ ] `LC-RD-121-P1-03` owner/selected/guest/prompt별 입력 수락→IDB→전송→ACK 전이를 그리고 quota·open·abort·연속 실패 fixture를 합성 자료로 고정한다.
- [ ] `LC-RD-121-P1-04` 새 상태를 기존 selector에 연결할 어댑터와 중앙 이탈 registry의 등록/해제 계약을 정한다. 화면이 빠져 보호가 해제되는 경우를 실패로 정의한다.
- [ ] `LC-RD-121-P1-05` 계정·문서·guest session/link 수명, 실패 메모리의 한도·해제 조건, exact copy/download와 application rollback 경계를 문서화한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **ES-05, ES-06, ES-07, UI-01, UI-07; UX-03/07/18/19/20/21; M-08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-121-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

화면 어댑터는 단계적으로 되돌릴 수 있게 하되 오류를 무시하던 저장 판정으로 복귀하지 않는다. 저장소 포맷을 바꾸면 구버전 읽기·재처리 조건을 먼저 정하고 outbox·거절 초안을 삭제하지 않는다. 원문 유실이나 거짓 saved가 재현되면 출시를 중단하고 읽기/복사 복구를 우선한다.

다음 입력: [P2](2phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
