# 1.2.5 Phase 5 — 공통 패턴·최종 인수·작성 UX 인계

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

재사용 계약과 실제 예외를 다음 화면 작업에 전달한다.

진입 조건: [P4](4phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-125-P5-01` generation/cursor/abort·mutation feedback·search order/return anchor 계약과 화면별 예외를 문서화한다.
- [ ] `LC-RD-125-P5-02` UI-03~06/M-09의 재현→수정 증거를 수용표에 연결하고 성능 측정 후보의 채택/보류 이유를 남긴다.
- [ ] `LC-RD-125-P5-03` helper 점진 rollback과 캐시 계정 격리를 검증하고 기존 list/grid·favorite/pin/manual order 기능을 인수한다.
- [ ] `LC-RD-125-P5-04` 최종 필수 CI·signed image·동일 SHA 개발 배포·공개 검색/복제/더 보기/복귀 smoke를 인수한다.
- [ ] `LC-RD-125-P5-05` 실행 STATUS·Future를 갱신하고 1.2.6에 검색 복귀·연결 관리·template selection 상태와 사용자 과제 fixture를 전달한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **UI-03, UI-04, UI-05, UI-06, M-09; UX-11/12/13/24; D-05/06/07/08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-125-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

공통 요청 helper는 소비 화면별로 점진 적용한다. rollback에서도 generation/cursor 보호를 제거하지 않으며 query cache로 다른 계정 자료를 보여주지 않는다. 새 index/keyset/preview API는 실제 측정과 별도 호환 근거가 있을 때만 추가한다.

다음 버전의 실제 착수는 [전체 로드맵](../ROADMAP.md)의 선행 gate 충족 후 판단한다. 정식 tag·main 병합·릴리스 서버 반영은 별도 릴리스 절차와 현재 사용자 지시를 따른다.
