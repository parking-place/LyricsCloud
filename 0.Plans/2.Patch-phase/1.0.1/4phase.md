# 1.0.1 Phase 4 — 코드와 메일 가입·검증된 Google identity 등록

상태: **완료**. P3 HMAC bootstrap과 `0900` 가입 상태를 소비해 검증된 Google identity의 원자 가입 경로를 구현하고 개발 HTTPS 실제 Google 신규 가입까지 확인했다.

## 목표와 경계

signup→코드+메일→Google login→검증 성공→원자 소비와 앱 grant 순서를 개발 HTTPS에서 새 계정으로 확인한다. 로그인 시도·취소·wrong account·email_verified=false는 소모/등록하지 않는다.

담당 경로: signup UI·OIDC callback·auth/DB grant. 정확한 파일·명령은 착수 당시 소스로 확정한다. 다른 Phase 기능·후속 선택 아이디어·승인 없는 운영 변경은 포함하지 않는다.

## 선행조건·입출력

- [P3](3phase.md)의 산출물·해당 구현 인수, 소비할 ADR/PROD/OPS와 파일 소유권을 확인한다.
- 입력은 정확한 SHA·계약·합성 fixture·실제 환경과 잔여 결함이다. 출력은 아래 작업의 산출물과 수용 증거·실패 복구·다음 담당자의 경계다.
- [베타 계약](../contracts/BETA-ACCESS.md), [버전 정책](../VERSIONING.md), [릴리스 정책](../RELEASE-POLICY.md), [품질 게이트](../QUALITY-GATES.md)를 소비한다.
- P2는 P1의 승인된 코드/운영 계약을 즉시 소비한다. P3/P4 전에는 신규 가입을 열지 않으며 CLI 인수를 UI·로고 최종 승인까지 기다리게 하지 않는다.

## 작업 체크리스트

- [x] `LC-NF-1.0.1-P4-01` Sign up에서 베타코드·이메일을 받는 화면과 기존 사용자 Google 로그인을 분리한다. 인증 전 메일은 사용자 주장일 뿐이며 유효한 계정 권한으로 취급하지 않는다.
- [x] `LC-NF-1.0.1-P4-02` OIDC state·nonce·PKCE·서명/issuer/audience/만료·email_verified 및 입력 메일 일치를 확인한 callback에서만 grant와 코드 소비를 원자 처리한다.
- [x] `LC-NF-1.0.1-P4-03` OAuth 취소·다른 Google 계정 선택·코드 선사용·refresh·네트워크 재전송·서버 응답 유실에 대해 원문/상태를 보존하는 안내와 멱등 복귀를 만든다.
- [x] `LC-NF-1.0.1-P4-04` 가입·수정 UI의 정상/빈/오류/권한 없음/로딩 상태와 a11y를 완료하고 README의 실제 화면 이미지를 합성 자료로 준비한다.
- [x] `LC-NF-1.0.1-P4-05` 새 코드 인가와 기존 세션·탈퇴·계정 정지·새로고침·허용 목록 키 회전을 함께 검증한다. unsigned token·replay·wrong audience·CSRF·cross-environment code를 차단한다.

## 구체적 수용 기준

1. signup→코드+메일→Google login→검증 성공→원자 소비와 앱 grant 순서를 개발 HTTPS에서 새 계정으로 확인한다. 로그인 시도·취소·wrong account·email_verified=false는 소모/등록하지 않는다.
2. 같은 코드의 두 계정 동시 callback에서 승자는 한 명이다. grant와 receipt 실패는 함께 rollback하고 응답 유실 뒤 재로그인은 기존 grant를 복구한다.
3. Google Cloud Console Audience 테스트 사용자와 앱 허용 등록을 별도로 확인한다. 앱이 Console 설정을 자동 변경한다고 안내하지 않는다.

## 검증과 완료 조건

- [x] 영향받은 실제 트리거와 결과를 기존 검사 중심으로 검증하고 명령·환경·SHA·미실행을 기록했다. 동일 입력/환경의 성공 증거를 재사용한다.
- [x] 원문·권한·기존 사용자·복구 불변조건과 위 수용 기준에 실제 증거가 있다.
- [x] 구현 Phase의 동일 SHA 개발 배포·공개 smoke와 상태 기록을 인수했다. 중간 Phase 원격 CI는 저장소 정책대로 `[skip ci]`로 구분했고 P10 최종 통합에서 수행한다.
- [x] [FUTURE-INTAKE](../FUTURE-INTAKE.md)에 따라 저장소 전역 Future 변경을 push 전 및 Phase 완료 때 한 번 대조하고 동일 변경은 재처리하지 않았다.
- [x] 실제 Google 신규 가입과 Console 경계를 확인했으며 main/release 서버는 변경하지 않았다. 사용자가 보류한 외부 백업 구축은 P4 범위가 아니다.

## 다음 Phase 인계

[P5](5phase.md)에 변경 파일·migration·계약·수용 증거·잔여 항목을 넘긴다. 전체 10 Phase 인수 뒤에만 Private Beta release를 판단한다. 기존 task 재배정은 [변경 이력](../../../docs/planning/plan-revision-2026-09-09.md)에 남긴다.
