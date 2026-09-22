# 1.2.2 Phase 4 — 안전한 형식 전환·템플릿 초안

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

미리보기와 실제 변환 사이에 원문이 바뀌면 재확인을 요구한다.

진입 조건: [P3](3phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-122-P4-01` checkpoint await 이후 mode/raw/hash/version을 재검사하고 검증→적용 사이 추가 await를 제거하거나 조건부 명령으로 보호한다. **[WC-06](../BRANCH-COMPARISON-118-P4.md)** 중 ES-04의 기존 checkpoint 후 재검사·회귀를 선별하고 변환 권한/연타/unmount/undo 잔여를 이 Phase에서 인수한다.
- [ ] `LC-RD-122-P4-02` stale preview는 최신 원문을 유지한 채 다시 만들도록 안내한다. 확인 연타·권한 종료·unmount에서 오래된 변환을 적용하지 않는다.
- [ ] `LC-RD-122-P4-03` 템플릿 형식 radio와 대상 변경의 무조건적인 내용 초기화를 제거한다. 기존 지원 형식별 초안 보관 또는 명시 변환 계약을 따른다. **[WC-09](../BRANCH-COMPARISON-118-P4.md)**의 기존 수정·회귀를 먼저 선별 인수한다: 형식 왕복 원문과 locked fieldset을 인수하되 type/target/selection 전환 보호·UI-04/05는 별도로 구현한다.
- [ ] `LC-RD-122-P4-04` 변환 전후 preview·취소·undo와 long text 비용을 검사하고 문장/태그 copy payload 계약이 바뀌지 않음을 확인한다.
- [ ] `LC-RD-122-P4-05` replica 간 동시 전체 변환의 한계를 별도로 시험한다. 단일 탭 재검사로 분산 원자성을 보장했다고 기록하지 않는다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **ES-01, ES-02, ES-03, ES-04, UI-02; UX-08/10/11; M-08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-122-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

CRDT 원본·snapshot·기존 outbox와 구 클라이언트 update 호환을 먼저 고정한다. 포맷 변경 시 순방향 migration/호환 reader와 application rollback을 검증하고 불가역 변환은 별도 결정 전 실행하지 않는다. 서버 validator를 완화하거나 remote update를 버려 되돌리지 않는다.

다음 입력: [P5](5phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
