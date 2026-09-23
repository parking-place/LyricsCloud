# 1.2.7 Phase 1 — 역할·복구·설정 상태 인수

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

역할별 실제 권한과 사용자 안내가 가리키는 사실을 맞춘다.

진입 조건: 선행 버전의 실제 인수와 이번 버전 [README](README.md)의 입력. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-127-P1-01` UX-01/07/16~23과 D-03/04/10/11을 인수하고 기존 1.2.0 화면/1.2.1·1.2.3 선해결 범위를 분리한다.
- [ ] `LC-RD-127-P1-02` owner/selected read/write/guest의 projection·readiness·epoch·회수/만료별 안내/행동 표를 작성한다.
- [ ] `LC-RD-127-P1-03` local draft·authoredText·revision·trash·infra backup의 수명/권한/복구 대상을 표로 고정한다. 복구 가능성을 UI 편의로 확대하지 않는다.
- [ ] `LC-RD-127-P1-04` 프로필 partial success/conflict/reset와 표시 설정 preview/apply/save/cancel, 가입/로그인 returnTo의 상태 문구를 실제 API에 대응시킨다.
- [ ] `LC-RD-127-P1-05` 공유·복구·탈퇴의 실제 사용자 과제와 파괴 작업 확인·rollback/재시도 의미를 정한다. 본문/검색/token 수집 없는 관찰 계획을 세운다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **UX-01/07/16/17/18/19/20/21/22/23; D-03/04/10/11; UI-01 후속** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-127-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

UI rollback이 권한 epoch·공개 projection·복구 namespace·프로필 provider/override를 바꾸지 않게 한다. 이미 성공한 restore/delete를 목록 갱신 실패로 다시 실행하지 않는다. 삭제·탈퇴·token 회전 같은 비가역 행동은 기존 명시 확인을 유지한다.

다음 입력: [P2](2phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
