# 1.2.5 Phase 2 — 세 목록·연결 목록 요청 제어

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

이전 응답이 최신 목록 상태를 바꾸지 못하게 한다.

진입 조건: [P1](1phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-125-P2-01` 첫 조회와 load-more에 동일 generation 검사를 적용하고 abort만으로 안전하다고 가정하지 않는다. **[WC-07](../BRANCH-COMPARISON-118-P4.md)**의 기존 수정·회귀를 먼저 선별 인수한다: 4화면 후보와 회귀를 선별한다. song-link-manager까지 확대하고 items/count/cursor/filterOptions/orderVersion/loading/error가 최신 query 소유인지 확인한다.
- [ ] `LC-RD-125-P2-02` cursor는 성공해 현재 query에 합류한 응답에서만 전진시킨다. 실패 재시도·중복 클릭·중복 응답을 결정적으로 처리한다.
- [ ] `LC-RD-125-P2-03` 곡·라임·프롬프트와 연결 자료 목록을 화면별로 이행하고 type/owner/정렬·pin/manual order 의미를 유지한다.
- [ ] `LC-RD-125-P2-04` 기존 결과/전체 로딩/추가 로딩/오류/진짜 빈 상태를 분리하고 stale 응답이 spinner/error를 바꾸지 않게 한다.
- [ ] `LC-RD-125-P2-05` 느린 A 다음 페이지·빠른 B 첫 페이지·세 번 필터 변경·unmount fixture로 실제 사용 경로를 검사한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **UI-03, UI-04, UI-05, UI-06, M-09; UX-11/12/13/24; D-05/06/07/08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-125-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

공통 요청 helper는 소비 화면별로 점진 적용한다. rollback에서도 generation/cursor 보호를 제거하지 않으며 query cache로 다른 계정 자료를 보여주지 않는다. 새 index/keyset/preview API는 실제 측정과 별도 호환 근거가 있을 때만 추가한다.

다음 입력: [P3](3phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
