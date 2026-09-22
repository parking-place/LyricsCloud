# 1.2.2 Phase 3 — 태그 이동 수렴·기존 거절 문서 복구

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

클라이언트가 만든 원본을 서버가 일관되게 받아들이도록 한다.

진입 조건: [P2](2phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-122-P3-01` 동일 태그의 동시 이동에 안정적인 identity/승자 규칙을 적용하고 move/remove·동일 목적지·교차 이동의 raw 결과를 수렴시킨다.
- [ ] `LC-RD-122-P3-02` projectPrompt의 화면 중복 제거와 서버 raw validator/store 계약을 맞춘다. projection만 정상인 상태를 저장 성공으로 인정하지 않는다.
- [ ] `LC-RD-122-P3-03` 중복 snapshot과 거절 outbox를 합성 fixture로 복구하고 항목의 내용·순서·삭제 의도를 보존한다. 복구 뒤 추가 수정 ACK까지 확인한다.
- [ ] `LC-RD-122-P3-04` 구 클라이언트 update의 허용/거부·재연결 안내·혼용 기간 정책을 구현 계약에 맞춰 검사하고 기존 작성물에 silent rewrite가 없는지 확인한다.
- [ ] `LC-RD-122-P3-05` 실제 두 브라우저→WS→DB→검색 projection에서 역순/중복/오프라인 전달을 검증하고 권한 epoch·owner/RLS 회귀를 유지한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **ES-01, ES-02, ES-03, ES-04, UI-02; UX-08/10/11; M-08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-122-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

CRDT 원본·snapshot·기존 outbox와 구 클라이언트 update 호환을 먼저 고정한다. 포맷 변경 시 순방향 migration/호환 reader와 application rollback을 검증하고 불가역 변환은 별도 결정 전 실행하지 않는다. 서버 validator를 완화하거나 remote update를 버려 되돌리지 않는다.

다음 입력: [P4](4phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
