# 1.2.1 Phase 3 — 공통 탐색·설정·PWA 보호

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

모든 이탈 행동이 동일한 보관 사실을 소비하게 한다.

진입 조건: [P2](2phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-121-P3-01` 라임 metadata PATCH와 프롬프트 메모리 입력을 공통 상태에 등록한다. durable offline 초안을 영원히 미저장으로 묶지 않는다. **[WC-05](../BRANCH-COMPARISON-118-P4.md)**의 b에 통합된 수정·회귀를 먼저 인수하고 미인수 잔여에만 추가 적용한다: owner namespace·legacy key 정리·동기 in-flight lock·응답 뒤 계속 입력 보존·ACK된 생성의 edit 전환을 한 묶음으로 검사한다. 자동 metadata 수집은 포함하지 않는다.
- [ ] `LC-RD-121-P3-02` 프로필 닉네임/사진·표시 설정의 독립 저장 상태를 등록하고 부분 성공 시 남은 dirty 필드를 정확히 유지한다. **[WC-04](../BRANCH-COMPARISON-118-P4.md)**의 b에 통합된 수정·회귀를 먼저 인수하고 미인수 잔여에만 추가 적용한다: 제출 snapshot만 ACK하고 대기 중 새 draft/default/theme preview를 유지한다. reset conflict retry는 DELETE 의미와 최신 rowVersion을 보존한다.
- [ ] `LC-RD-121-P3-03` 로고·rail·탭·모바일 메뉴·back·앱 내부 이동과 logout을 같은 의사결정에 연결한다. 취소 시 focus/selection과 파일 미리보기를 복구한다. **[WC-03](../BRANCH-COMPARISON-118-P4.md)**의 b에 통합된 수정·회귀를 먼저 인수하고 미인수 잔여에만 추가 적용한다: 동일 URL no-op·modified click·editor veto를 유지하며 await 뒤 pending 상태를 재확인한다. profile/PWA·back/reload와 page-local 링크까지 누락 경계를 마무리한다.
- [ ] `LC-RD-121-P3-04` beforeunload·PWA controllerchange의 플랫폼 제약을 명시하고 volatile 입력이 있으면 자동 reload를 보류한다. 강제 종료 시 메모리 보존을 약속하지 않는다.
- [ ] `LC-RD-121-P3-05` 빠른 추가 오류/복구 행동을 focus trap 안에 배치하고 aria 연결·중복 제출 방지·성공 후 focus 복귀를 같은 상태 계약으로 적용한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **ES-05, ES-06, ES-07, UI-01, UI-07; UX-03/07/18/19/20/21; M-08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-121-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

화면 어댑터는 단계적으로 되돌릴 수 있게 하되 오류를 무시하던 저장 판정으로 복귀하지 않는다. 저장소 포맷을 바꾸면 구버전 읽기·재처리 조건을 먼저 정하고 outbox·거절 초안을 삭제하지 않는다. 원문 유실이나 거짓 saved가 재현되면 출시를 중단하고 읽기/복사 복구를 우선한다.

다음 입력: [P4](4phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
