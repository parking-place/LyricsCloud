# 1.2.5 Phase 1 — 요청 수명·커서·화면 상태 계약

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

첫 페이지와 더 보기에 같은 query identity를 적용한다.

진입 조건: 선행 버전의 실제 인수와 이번 버전 [README](README.md)의 입력. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-125-P1-01` 곡·라임·프롬프트·검색·연결 목록·템플릿의 요청 수명과 UI-03~06 현재 재현을 대조한다. 공유 가능한 부분과 화면별 차이를 기록한다.
- [ ] `LC-RD-125-P1-02` query generation·abort·cursor commit·request identity·unmount의 상태 전이와 늦은 응답 폐기 규칙을 정의한다.
- [ ] `LC-RD-125-P1-03` 템플릿 mutation 성공과 목록 반영/갱신 실패를 구분하고 optimistic insert 또는 invalidate 선택 및 중복 제거 기준을 정한다.
- [ ] `LC-RD-125-P1-04` 검색 그룹의 시각/DOM/keyboard 순서를 한 자료 구조에서 생성하도록 계약을 정하고 mixed-type fixture를 만든다.
- [ ] `LC-RD-125-P1-05` back 복귀 시 query/filter/pages/anchor 보존 범위와 계정 변경·권한 회수·삭제 대안을 정의한다. 성능 변경은 baseline 측정 항목으로 남긴다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **UI-03, UI-04, UI-05, UI-06, M-09; UX-11/12/13/24; D-05/06/07/08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-125-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

공통 요청 helper는 소비 화면별로 점진 적용한다. rollback에서도 generation/cursor 보호를 제거하지 않으며 query cache로 다른 계정 자료를 보여주지 않는다. 새 index/keyset/preview API는 실제 측정과 별도 호환 근거가 있을 때만 추가한다.

다음 입력: [P2](2phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
