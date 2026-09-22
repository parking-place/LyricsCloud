# 1.2.3 Phase 3 — 공개 링크 재시도·Unicode·오류 응답

**상태: 계획 / 구현 미착수 (`planned`)**. [버전 범위](README.md) · [수용 기준](ACCEPTANCE.md) · [공통 gate](../QUALITY-GATES.md).

## 목표·진입

생성/재시도/삭제의 논리 입력 의미를 일관되게 만든다.

진입 조건: [P2](2phase.md)의 실제 인수 산출물. 현재 source SHA/담당/미커밋 경계를 실행 STATUS에 등록한다. 리뷰의 과거 재현과 현재 후보의 상태를 구별하고 이미 해소된 항목은 근거를 재사용한다.

## 작업

- [ ] `LC-RD-123-P3-01` 상대 expiry를 매 재시도 hash에 섞지 않고 최초 receipt의 절대 expiry를 사용한다. 응답 유실/동시 동일 ID는 같은 결과를 인수한다.
- [ ] `LC-RD-123-P3-02` 기존 receipt와 회수/만료 replay, 명시 token rotation을 검사한다. 원래 URL 복원 불가 시 null/안내를 제공하고 token 원문 저장을 금지한다.
- [ ] `LC-RD-123-P3-03` 생성과 완전삭제 확인의 길이 단위를 맞춘다. trim/NFC로 정확한 문자열 비교 의미를 임의로 변경하지 않는다.
- [ ] `LC-RD-123-P3-04` API별 missing/expired/forged/authz/DB 오류를 검사하고 실제 누락이 확인된 mapper만 공통 code 계약으로 보정한다.
- [ ] `LC-RD-123-P3-05` CSRF/origin·owner/RLS·비캐시/referrer 정책과 사용자 원문을 제외한 오류 관측을 회귀에 포함한다.

## 산출물·검증

위 5개 작업 각각의 변경 파일·계약·합성 fixture·수용 근거를 남긴다. 범위는 **BE-01, BE-02, BE-03, BE-04; UX-01/17/23; 코드 리뷰 §5.2 오류 분류 후보** 중 이 Phase의 작업에 한정한다. 예상 책임 경로는 버전 README에서 인수하고 실제 파일별 작성자 한 명을 지정한다.

[수용표](ACCEPTANCE.md)의 `AC-RD-123-*` 중 변경 경계를 소비하는 항목을 이 Phase에서 확인한다. 실패 원인을 수정한 같은 입력으로 확인하며 기존 성공 근거는 source SHA와 변경 영향이 유효할 때 재사용한다. 문서만 바꿨다면 문서/계약 검사로 기록하고 제품 동작 테스트를 했다고 쓰지 않는다.

## 완료·중단·인계

[공통 품질 게이트](../QUALITY-GATES.md)의 **각 Phase 완료 절차 전체**를 적용한다. 로컬 수용·Future 검수·commit/push·필수 CI·같은 SHA 개발 배포·공개 smoke와 상태 기록 전에는 제품 Phase 완료로 표시하지 않는다. docs/intermediate의 `[skip ci]`는 필수 CI PASS를 대신하지 않는다.

기존 receipt/hash·세션/쿠키 형식의 읽기 호환을 유지한다. replay를 위해 token 원문을 저장하거나 자동 회전하지 않는다. 캐시 무효화를 되돌릴 때 실패 고착을 재도입하지 않으며 세션 연장 경로가 사라지는 후보는 배포하지 않는다.

다음 입력: [P4](4phase.md). 현재 실패·환경 미실행·계약 미정과 다음 파일 소유자를 함께 전달한다.
