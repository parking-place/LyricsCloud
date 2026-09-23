# 1.2.3 Phase 5 — API 문서·최종 인수·UX 인계

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

재시도 가능성과 복구 행동을 호출자와 UI에 전달한다.

진입 조건: [P4](4phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-123-P5-01` requestId/hash/expiry/replay/error code와 session cookie 계약을 API 문서에 반영하고 기존 호환 예시를 남긴다.
- [ ] `LC-RD-123-P5-02` BE-01~04 수용 근거와 오류 mapper 후보의 확인/기각/미확인을 기록한다. 복구 횟수 등 enum/count 관측만 허용한다.
- [ ] `LC-RD-123-P5-03` 운영자가 process 재시작을 임시 해결로 오해하지 않게 discovery 회복·세션 진단 runbook과 rollback 조건을 기록한다.
- [ ] `LC-RD-123-P5-04` 최종 필수 CI·signed image·동일 SHA 개발 배포·공개 로그인/세션/공유 smoke를 인수하고 실제 provider 미실행은 명시한다.
- [ ] `LC-RD-123-P5-05` 실행 STATUS·Future 인수를 갱신하고 1.2.7에 replay URL 없음·명시 회전·만료/회수·Unicode 확인의 UI 계약을 전달한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **BE-01, BE-02, BE-03, BE-04; UX-01/17/23; 코드 리뷰 §5.2 오류 분류 후보** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-123-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

기존 receipt/hash·세션/쿠키 형식의 읽기 호환을 유지한다. replay를 위해 token 원문을 저장하거나 자동 회전하지 않는다. 캐시 무효화를 되돌릴 때 실패 고착을 재도입하지 않으며 세션 연장 경로가 사라지는 후보는 배포하지 않는다.

다음 버전의 실제 착수는 [전체 로드맵](../ROADMAP.md)의 선행 gate 충족 후 판단한다. 정식 tag·main 병합·릴리스 서버 반영은 별도 릴리스 절차와 현재 사용자 지시를 따른다.
