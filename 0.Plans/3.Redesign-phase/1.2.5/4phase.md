# 1.2.5 Phase 4 — 경쟁 요청·실패 복구·탐색 인수

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

비동기 완료 순서를 제어해 사용자 결과를 검증한다.

진입 조건: [P3](3phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-125-P4-01` 여러 query/load-more 응답을 역순으로 완료하고 최신 결과·cursor·loading·error의 불변식을 검증한다.
- [ ] `LC-RD-125-P4-02` 템플릿 source=user 복제→재진입·network failure→retry·권한 회수·삭제 충돌을 검사하고 UI-02 원문 보존 회귀를 함께 유지한다.
- [ ] `LC-RD-125-P4-03` 혼합 검색 결과에서 방향키·Enter·Escape·Tab·focus 복귀를 확인하고 실제 AT 읽기 결과는 자동 DOM 검사와 구분한다.
- [ ] `LC-RD-125-P4-04` 0/1/50/200건·긴 제목/태그·양 테마·320/390px·확대에서 시각 순서/더 보기·오류 복구를 확인한다.
- [ ] `LC-RD-125-P4-05` 두 계정 전환·offline·back/forward·페이지 재로드·상세 삭제 시 복귀 대안을 확인하고 성능 baseline과 비교한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **UI-03, UI-04, UI-05, UI-06, M-09; UX-11/12/13/24; D-05/06/07/08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-125-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

공통 요청 helper는 소비 화면별로 점진 적용한다. rollback에서도 generation/cursor 보호를 제거하지 않으며 query cache로 다른 계정 자료를 보여주지 않는다. 새 index/keyset/preview API는 실제 측정과 별도 호환 근거가 있을 때만 추가한다.

다음 입력: [P5](5phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
