# 1.0.1 Phase 10 — 전체 Phase 후보 인수·Private Beta 릴리스 인계

상태: **완료 — 2026-09-10**. P9의 전체 통합 회귀를 이어받아 P10 후보의 원격 CI·네 dev image·동일 SHA 개발 공개 인수를 완료했고, 승인된 Private Beta 릴리스 실행 gate를 열었다.

## 목표와 경계

P1~P10 필수 요구의 코드/자동/실제 OS/개발 HTTPS 인수를 동일 후보 SHA에 연결하고 미해결 P0/P1이 없음을 증거로 확인했다. 정식 main·tag·digest·릴리스 서버 결과는 후보 완료 뒤 불변 실행 순서에 따라 별도 실행 기록으로 동결한다.

담당 경로: 요구추적·release manifest 준비·릴리스 인계. 정확한 파일·명령은 착수 당시 소스로 확정한다. 다른 Phase 기능·후속 선택 아이디어·승인 없는 운영 변경은 포함하지 않는다.

## 선행조건·입출력

- [P9](9phase.md)의 산출물·해당 구현 인수, 소비할 ADR/PROD/OPS와 파일 소유권을 확인한다.
- 입력은 정확한 SHA·계약·합성 fixture·실제 환경과 잔여 결함이다. 출력은 아래 작업의 산출물과 수용 증거·실패 복구·다음 담당자의 경계다.
- [베타 계약](../contracts/BETA-ACCESS.md), [버전 정책](../VERSIONING.md), [릴리스 정책](../RELEASE-POLICY.md), [품질 게이트](../QUALITY-GATES.md)를 소비한다.
- P2는 P1의 승인된 코드/운영 계약을 즉시 소비한다. P3/P4 전에는 신규 가입을 열지 않으며 CLI 인수를 UI·로고 최종 승인까지 기다리게 하지 않는다.

## 작업 체크리스트

- [x] `LC-NF-1.0.1-P10-01` NF-REQ-001~021 및 인수한 P6 결함의 구현/자동/수동/운영 증거를 candidate SHA에 연결한다. 미해결 P0/P1은 0이어야 하며 범위 축소로 달성하지 않는다.
- [x] `LC-NF-1.0.1-P10-02` 전체 CI와 동일 SHA dev.example.test smoke를 통과하고 Windows IME·beta 가입·CLI refresh·테마/아이콘·복사·export 증거를 동결한다.
- [x] `LC-NF-1.0.1-P10-03` 릴리스 승인 이후에만 release PR을 main에 병합하고 최종 main SHA를 다시 검증하도록 release manifest를 준비한다. Phase 완료 commit 뒤 승인된 release 실행으로만 병합한다.
- [x] `LC-NF-1.0.1-P10-04` 정식 이미지 네 종류의 immutable version/SHA/digest와 Release·latest·Release-latest 추적 계약을 검증했다. moving alias는 최종 tag CI 전까지 이동하지 않았다.
- [x] `LC-NF-1.0.1-P10-05` app.example.test에 배포할 exact digest·migration 순서·허용 계정·OAuth redirect·모니터링·합성 smoke와 application-first rollback 절차를 인계했다. 사용자가 현재 릴리스 실행을 승인했다.
- [x] `LC-NF-1.0.1-P10-06` 완료 후 1.0.2 진입 여부와 아직 미승인인 공유·재설계·native 기술 결정을 기록했다. 1.0.1+ 새 기능은 Beta 마감에 포함하지 않았다.

## 구체적 수용 기준

1. P1~P10 필수 요구의 코드/자동/실제 OS/개발 HTTPS 인수를 동일 후보 SHA에 연결했고 미해결 P0/P1 0건을 확인했다.
2. 모든 Phase 인수 뒤 test-user 제한 Private Beta release go/no-go를 준비한다. main merge는 release 때만, release 서버 변경은 현재 요청의 별도 명시 승인 후다.
3. 후속 1.0.2는 사용 중 추가 보완이며 1.0.1 필수 요구나 출시 차단 결함을 미루는 수단이 아니다.

## 검증과 완료 조건

- [x] 영향받은 실제 트리거와 결과를 기존 검사 중심으로 검증하고 명령·환경·SHA·미실행을 기록했다. 동일 입력/환경의 성공 증거를 재사용했다.
- [x] 원문·권한·기존 사용자·복구 불변조건과 위 수용 기준에 실제 증거가 있다.
- [x] 구현 Phase의 필수 CI·동일 SHA 개발 배포·공개 smoke와 상태 기록을 인수했다. 문서-only 변경은 링크·범위·결정 검토로 구분했다.
- [x] [FUTURE-INTAKE](../FUTURE-INTAKE.md)에 따라 저장소 전역 Future 변경을 push 전 및 Phase 완료 때 대조했고 동일 변경은 재처리하지 않았다.
- [x] 실제 OS/기기·Google 설정·백업·외부 승인 잔여를 숨기지 않았으며 main/release 서버 변경은 사용자의 현재 승인에만 연결했다.

## 완료 증거

- 후보 `869e32b8a15c2e1e7524a75ab4d8b4428a925c79`, PR #22, CI run `34394222604`: 전체 verify와 web·collaboration·worker·migrate dev image 발행 PASS.
- 같은 후보의 개발 서버 checkout/build metadata가 일치했고 `1.0.1`, `dev`, `p10`, `0901_beta_signup.sql`, 네 서비스 healthy와 공개 live/ready/auth를 확인했다.
- 공개 합성 smoke는 가사·라임·프롬프트의 즉시 이탈·재진입 영구 저장, light/dark의 `＋ 새 가사`·`연결 관리`, 테마 저장, 키보드/focus, 320/390px 모바일, CSP·CSS·service worker를 통과했다. 합성 사용자는 삭제했다.
- 실제 환경은 사용자 확인 `P4 Google signup PASS`, `P5 Windows Chrome PASS, Edge PASS`, `iOS update PASS, Android update PASS`를 자동 결과와 구분해 동결했다.
- `OPS-100-001` 외부 backup은 사용자의 명시적 예외로 계속 열려 있다. 다음 작업은 승인된 main 통합·최종 SHA CI/dev 재검증·annotated tag·정식 digest 발행·릴리스 서버 배포다.

## 다음 Phase 인계

[1.0.2 P1](../1.0.2/1phase.md)에 변경 파일·migration·계약·수용 증거·잔여 항목을 넘긴다. 전체 10 Phase 인수 뒤에만 Private Beta release를 판단한다. 기존 task 재배정은 [변경 이력](../../../docs/planning/plan-revision-2026-09-09.md)에 남긴다.
