# 1.0.1 Phase 3 — 해시 test-user 이행·정규화·키 회전

상태: **진행 중**. P2의 `0900` schema·환경 경계·관리자 키 분리와 동일 SHA 개발 인수를 소비한다.

## 목표와 경계

SHA256(email)만으로 역추정 방어를 주장하지 않는다. 환경/purpose/normalizationVersion/kid가 결합된 HMAC 레코드와 별도 secret을 검증한다.

담당 경로: test-user reader/import·config·키 운영 runbook. 정확한 파일·명령은 착수 당시 소스로 확정한다. 다른 Phase 기능·후속 선택 아이디어·승인 없는 운영 변경은 포함하지 않는다.

## 선행조건·입출력

- [P2](2phase.md)의 산출물·해당 구현 인수, 소비할 ADR/PROD/OPS와 파일 소유권을 확인한다.
- 입력은 정확한 SHA·계약·합성 fixture·실제 환경과 잔여 결함이다. 출력은 아래 작업의 산출물과 수용 증거·실패 복구·다음 담당자의 경계다.
- [베타 계약](../contracts/BETA-ACCESS.md), [버전 정책](../VERSIONING.md), [릴리스 정책](../RELEASE-POLICY.md), [품질 게이트](../QUALITY-GATES.md)를 소비한다.
- P2는 P1의 승인된 코드/운영 계약을 즉시 소비한다. P3/P4 전에는 신규 가입을 열지 않으며 CLI 인수를 UI·로고 최종 승인까지 기다리게 하지 않는다.

## 작업 체크리스트

- [ ] `LC-NF-1.0.1-P3-01` 기존 .test_users를 환경별 HMAC-SHA-256 식별 레코드로 변환하는 일회성 도구를 구현한다. 기존 이메일 정규화 의미를 유지하고 dry-run·원자 쓰기·검증 후 암호화 백업을 제공한다.
- [ ] `LC-NF-1.0.1-P3-02` 정규화 버전·kid·환경 경계를 정의하고 key rotation의 old/new 검증 기간, 미가입 legacy 재입력/검증 로그인 이행과 실패 시 복구를 구현·문서화한다.
- [ ] `LC-NF-1.0.1-P3-03` 해시를 익명화로 설명하지 않고 파일 역추정 위험·필요한 identity 보관·암호화 rollback 백업의 삭제 시점을 운영자에게 인계한다.

## 구체적 수용 기준

1. SHA256(email)만으로 역추정 방어를 주장하지 않는다. 환경/purpose/normalizationVersion/kid가 결합된 HMAC 레코드와 별도 secret을 검증한다.
2. 정규화는 기존 의미를 보존한다. Gmail dot/plus 제거로 계정을 합치지 않는다. 키 누락·회전 중·중복·오류 입력·원자 쓰기 실패에서 허용 우회가 없다.
3. 기존 허용 계정 로그인과 철회 tombstone 보존, 암호화 백업 복원, 검증 후 평문 제거를 인수한다. old hash를 새 키로 재해시해서 새 email hash로 취급하지 않는다.

## 검증과 완료 조건

- [ ] 영향받은 실제 트리거와 결과를 기존 검사 중심으로 검증하고 명령·환경·SHA·미실행을 기록했다. 동일 입력/환경의 성공 증거를 재사용한다.
- [ ] 원문·권한·기존 사용자·복구 불변조건과 위 수용 기준에 실제 증거가 있다.
- [ ] 구현 Phase의 필수 CI·동일 SHA 개발 배포·공개 smoke와 상태 기록을 인수했다. 문서-only 변경은 링크·범위·결정 검토로 구분했다.
- [ ] [FUTURE-INTAKE](../FUTURE-INTAKE.md)에 따라 저장소 전역 Future 변경을 push 전 및 Phase 완료 때 한 번 대조하고 동일 변경은 재처리하지 않았다.
- [ ] 실제 OS/기기·Google 설정·백업·외부 승인 잔여를 숨기지 않았으며 main/release 서버 변경을 별도 현재 승인 없이 실행하지 않았다.

## 다음 Phase 인계

[P4](4phase.md)에 변경 파일·migration·계약·수용 증거·잔여 항목을 넘긴다. 전체 10 Phase 인수 뒤에만 Private Beta release를 판단한다. 기존 task 재배정은 [변경 이력](../../../docs/planning/plan-revision-2026-09-09.md)에 남긴다.
