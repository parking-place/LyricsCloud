# 1.2.1 Phase 2 — 실패 원문 보관·공유 편집 준비

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

입력이 실제 수용되기 전 준비 상태를 제공하고 실패 입력을 복구 가능하게 유지한다.

진입 조건: [P1](1phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-121-P2-01` selected writer의 persist 실패를 latch하고 실패 입력을 bounded 복구 큐로 보관한다. 후속 성공 snapshot만으로 과거 실패를 닫지 않는다. **[WC-01](../BRANCH-COMPARISON-118-P4.md)**의 기존 수정·회귀를 먼저 선별 인수한다: owner/kind/document/revision별 보관, offline 닫기→재진입·명시 복원·quota·계정 전환·다른 탭 revision/새 입력을 늦은 ACK가 지우지 않는지 확인한다.
- [ ] `LC-RD-121-P2-02` guest 경로에 같은 불변식을 적용하되 namespace·link/session 수명과 authoredText 복구 경계를 별도로 유지한다.
- [ ] `LC-RD-121-P2-03` snapshot 적용과 callback/handle 설치를 마친 시점에만 acceptsLocalEdits를 연다. 캐시 기반 offline 준비와 최초 빈 bootstrap을 구별한다.
- [ ] `LC-RD-121-P2-04` 재시도 시 권한 epoch 재확인→durable 기록→pump→ACK 순서를 지킨다. 논리 변경 중복 적용과 회수 후 무조건 재전송을 차단한다.
- [ ] `LC-RD-121-P2-05` 저장 실패→추가 입력→재연결→서버 재조회까지 관통하는 회귀를 추가하고, 원문 복사/다운로드의 byte 또는 문자열 일치를 확인한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **ES-05, ES-06, ES-07, UI-01, UI-07; UX-03/07/18/19/20/21; M-08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-121-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

화면 어댑터는 단계적으로 되돌릴 수 있게 하되 오류를 무시하던 저장 판정으로 복귀하지 않는다. 저장소 포맷을 바꾸면 구버전 읽기·재처리 조건을 먼저 정하고 outbox·거절 초안을 삭제하지 않는다. 원문 유실이나 거짓 saved가 재현되면 출시를 중단하고 읽기/복사 복구를 우선한다.

다음 입력: [P3](3phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
