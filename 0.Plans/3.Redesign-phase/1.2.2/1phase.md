# 1.2.2 Phase 1 — 연산·충돌·호환 계약

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

편집 기준점과 서버의 raw 수용 규칙을 먼저 확정한다.

진입 조건: 선행 버전의 실제 인수와 이번 버전 [README](README.md)의 입력. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-122-P1-01` ES-01~04/UI-02를 인수 SHA에서 재확인하고 1.2.0 선해결 여부를 기록한다. 원문·projection·서버 validator 각각의 기대값을 fixture로 고정한다.
- [ ] `LC-RD-122-P1-02` 일반 입력의 range/delta와 명시 전체 변환을 분리한다. UTF-16 index·code point·Yjs 상대 위치의 적용 경계와 overlapping edit 정책을 정한다.
- [ ] `LC-RD-122-P1-03` composition 시작 기준 문서/selection, queued remote update와 확정 delta의 매핑 순서를 정한다. 제목도 별도 계약에 포함한다.
- [ ] `LC-RD-122-P1-04` 태그 identity·occurrence 승자·삭제/이동 우선순위·중복 전달 수렴을 결정하고 기존 snapshot/outbox/구 client 호환표를 작성한다.
- [ ] `LC-RD-122-P1-05` 변환 preview version/hash·checkpoint 후 재검사·템플릿 대상 전환의 취소/확정 의미와 rollback·프로토콜 변경 필요성을 결정 기록에 남긴다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **ES-01, ES-02, ES-03, ES-04, UI-02; UX-08/10/11; M-08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-122-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

CRDT 원본·snapshot·기존 outbox와 구 클라이언트 update 호환을 먼저 고정한다. 포맷 변경 시 순방향 migration/호환 reader와 application rollback을 검증하고 불가역 변환은 별도 결정 전 실행하지 않는다. 서버 validator를 완화하거나 remote update를 버려 되돌리지 않는다.

다음 입력: [P2](2phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
