# 1.2.5 Phase 3 — 템플릿 mutation·검색 키보드·복귀

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

작업 결과와 사용자의 현재 위치를 안정적으로 전달한다.

진입 조건: [P2](2phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-125-P3-01` 내 템플릿 복제 성공 시 같은 source에서도 목록에 반영하고 request identity와 selection/focus를 일치시킨다.
- [ ] `LC-RD-125-P3-02` 복제/즐겨찾기/삭제의 reject/non2xx를 처리해 draft와 기존 항목을 보존한다. 권한 변경·대상 소멸·성공 후 reload 실패를 구별한다.
- [ ] `LC-RD-125-P3-03` 통합 검색의 표시 그룹과 keyboard index를 동일한 flatten 순서로 만들고 현재의 실제 링크 focus 방식으로 Arrow/Tab의 이동 대상이 표시 순서와 일치하게 한다. aria-activedescendant를 사용하는 새 복합 widget을 이 수정에 도입하지 않는다.
- [ ] `LC-RD-125-P3-04` 상세에서 검색으로 돌아올 때 pages/anchor를 회복하고 삭제/회수된 anchor는 가까운 유효 위치와 안내로 대체한다.
- [ ] `LC-RD-125-P3-05` 목록 preview bytes·row 수·p95·EXPLAIN baseline을 수집한다. 측정 없이 새 index나 keyset을 필수 구현으로 추가하지 않는다. **[WC-08](../BRANCH-COMPARISON-118-P4.md)**의 기존 수정·회귀를 먼저 선별 인수한다: 서로 다른 필드/항목의 성공을 실패 rollback이 덮지 않고 빠른 반전·동시 삭제/clear·오래된 move 실패를 처리한다. 비manual view anchor와 duplicate의 lock 순서/replay를 실제 DB로 검사한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **UI-03, UI-04, UI-05, UI-06, M-09; UX-11/12/13/24; D-05/06/07/08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-125-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

공통 요청 helper는 소비 화면별로 점진 적용한다. rollback에서도 generation/cursor 보호를 제거하지 않으며 query cache로 다른 계정 자료를 보여주지 않는다. 새 index/keyset/preview API는 실제 측정과 별도 호환 근거가 있을 때만 추가한다.

다음 입력: [P4](4phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
