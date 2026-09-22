# 1.2.2 Phase 2 — 문장·제목 부분 연산과 IME

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

일반 타이핑을 기준점에 연결한 변경 연산으로 처리한다.

진입 조건: [P1](1phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-122-P2-01` 문장형 프롬프트의 전체 문자열 재설정을 부분 연산으로 바꾸고 명시 전체 교체 경로를 분리한다. 원격 변경과 다른 위치의 입력을 함께 보존한다. **[WC-06](../BRANCH-COMPARISON-118-P4.md)**의 기존 수정·회귀를 먼저 선별 인수한다: 이 Phase에서는 ES-02 부분 입력과 ES-03 IME 후보만 소비하며 제목·치환 구간 내부 remote·복수 update·실제 OS IME를 인수한다. ES-04 checkpoint/변환 후보는 P4-01로 넘긴다.
- [ ] `LC-RD-122-P2-02` 제목 편집에 같은 기준점 계약을 적용하되 라임·곡 metadata 저장과 CRDT 저장을 혼동하지 않는다. 해당 필드의 서버 계약을 확인한다.
- [ ] `LC-RD-122-P2-03` composition 중간값의 확정 전송을 막고 확정 delta를 queued remote와 병합한다. 단순 호출 순서 교체만으로 닫지 않는다.
- [ ] `LC-RD-122-P2-04` 조합 취소·blur·필드 이동·붙여넣기·emoji·undo/redo를 원문 비교로 검증하고 CodeMirror 인스턴스·selection 생명주기를 보존한다.
- [ ] `LC-RD-122-P2-05` 서로 다른 위치와 겹치는 위치를 편집한 두 replica의 전달 순서를 바꿔 결정된 정책과 실제 서버 재조회까지 확인한다. **[WC-02](../BRANCH-COMPARISON-118-P4.md)**의 기존 수정·회귀를 먼저 선별 인수한다: 조합 중 timer/flush/retry/dispose가 preedit를 확정 저장하지 않고 remote 내부 삽입·local undo가 보존되는지 확인한다. prompt 제목 잔존 문제와 별도 경로로 인수한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **ES-01, ES-02, ES-03, ES-04, UI-02; UX-08/10/11; M-08 일부** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-122-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

CRDT 원본·snapshot·기존 outbox와 구 클라이언트 update 호환을 먼저 고정한다. 포맷 변경 시 순방향 migration/호환 reader와 application rollback을 검증하고 불가역 변환은 별도 결정 전 실행하지 않는다. 서버 validator를 완화하거나 remote update를 버려 되돌리지 않는다.

다음 입력: [P3](3phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
