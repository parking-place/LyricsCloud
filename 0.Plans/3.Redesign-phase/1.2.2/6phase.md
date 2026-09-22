# 1.2.2 Phase 6 — 호환 문서·최종 인수·후속 연결

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

CRDT 변경을 되돌리거나 이어받을 수 있는 근거를 남긴다.

진입 조건: [P5](5phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-122-P6-01` 부분 연산·IME 기준점·태그 수렴·변환 계약과 구 client 호환/복구 절차를 관련 개발 문서에 반영한다.
- [ ] `LC-RD-122-P6-02` 각 수용 사례에 실제 source SHA·server schema·browser/OS·전달 순서·실패→수정 결과를 연결하고 M-08 회귀 소유권을 기록한다.
- [ ] `LC-RD-122-P6-03` 원문이 있는 상태의 application rollback과 필요 migration의 반복/복구를 검증한다. 사용자 원문을 로그로 출력하지 않는다.
- [ ] `LC-RD-122-P6-04` 최종 필수 CI·signed image·동일 SHA 개발 배포·공개 공동 편집/재접속 smoke를 완료한 근거로만 인수한다.
- [ ] `LC-RD-122-P6-05` 실행 STATUS·Future 인수·문서를 갱신하고 1.2.3에는 변경된 권한/오류 경계, 1.2.8에는 고정된 동시성 fixture를 전달한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **ES-01, ES-02, ES-03, ES-04, UI-02; UX-08/10/11; M-08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-122-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

CRDT 원본·snapshot·기존 outbox와 구 클라이언트 update 호환을 먼저 고정한다. 포맷 변경 시 순방향 migration/호환 reader와 application rollback을 검증하고 불가역 변환은 별도 결정 전 실행하지 않는다. 서버 validator를 완화하거나 remote update를 버려 되돌리지 않는다.

다음 버전의 실제 착수는 [전체 로드맵](../ROADMAP.md)의 선행 gate 충족 후 판단한다. 정식 tag·main 병합·릴리스 서버 반영은 별도 릴리스 절차와 현재 사용자 지시를 따른다.
