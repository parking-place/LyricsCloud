# 1.0.1 Phase 10 — 전체 Phase 후보 인수·Private Beta 릴리스 인계

상태: **진행 중 — 2026-09-10**. P9의 전체 통합 회귀와 동일 SHA 개발 인수를 이어받아 최종 후보·원격 CI·Private Beta 릴리스를 수행한다.

## 목표와 경계

P1~P10 필수 요구의 코드/자동/실제 OS/개발 HTTPS 인수를 동일 후보 SHA에 연결하고 미해결 P0/P1이 없음을 증거로 확인한다. 이번 계획은 이 상태를 달성한 것이 아니다.

담당 경로: 요구추적·release manifest 준비·릴리스 인계. 정확한 파일·명령은 착수 당시 소스로 확정한다. 다른 Phase 기능·후속 선택 아이디어·승인 없는 운영 변경은 포함하지 않는다.

## 선행조건·입출력

- [P9](9phase.md)의 산출물·해당 구현 인수, 소비할 ADR/PROD/OPS와 파일 소유권을 확인한다.
- 입력은 정확한 SHA·계약·합성 fixture·실제 환경과 잔여 결함이다. 출력은 아래 작업의 산출물과 수용 증거·실패 복구·다음 담당자의 경계다.
- [베타 계약](../contracts/BETA-ACCESS.md), [버전 정책](../VERSIONING.md), [릴리스 정책](../RELEASE-POLICY.md), [품질 게이트](../QUALITY-GATES.md)를 소비한다.
- P2는 P1의 승인된 코드/운영 계약을 즉시 소비한다. P3/P4 전에는 신규 가입을 열지 않으며 CLI 인수를 UI·로고 최종 승인까지 기다리게 하지 않는다.

## 작업 체크리스트

- [ ] `LC-NF-1.0.1-P10-01` NF-REQ-001~021 및 인수한 P6 결함의 구현/자동/수동/운영 증거를 candidate SHA에 연결한다. 미해결 P0/P1은 0이어야 하며 범위 축소로 달성하지 않는다.
- [ ] `LC-NF-1.0.1-P10-02` 전체 CI와 동일 SHA dev.example.test smoke를 통과하고 Windows IME·beta 가입·CLI refresh·테마/아이콘·복사·export 증거를 동결한다.
- [ ] `LC-NF-1.0.1-P10-03` 릴리스 승인 이후에만 release PR을 main에 병합하고 최종 main SHA를 다시 검증하도록 release manifest를 준비한다. Phase 문서 완료만으로 지금 main을 변경하지 않는다.
- [ ] `LC-NF-1.0.1-P10-04` 정식 이미지 네 종류의 v1.0.1 내용은 immutable version/SHA/digest와 Release·latest·Release-latest로 추적한다. 테스트 전 moving alias 이동을 금지한다.
- [ ] `LC-NF-1.0.1-P10-05` app.example.test에 배포할 정확한 digest·migration 순서·허용 계정·OAuth redirect·모니터링·합성 smoke와 되돌림 절차를 인계한다. 실제 배포는 별도 현재 승인 후 실행한다.
- [ ] `LC-NF-1.0.1-P10-06` 완료 후 1.0.2 진입 여부와 아직 미승인인 공유·재설계·native 기술 결정을 기록한다. 1.0.1+ 새 기능이 필수 Beta 마감을 밀어내지 않게 한다.

## 구체적 수용 기준

1. P1~P10 필수 요구의 코드/자동/실제 OS/개발 HTTPS 인수를 동일 후보 SHA에 연결하고 미해결 P0/P1이 없음을 증거로 확인한다. 이번 계획은 이 상태를 달성한 것이 아니다.
2. 모든 Phase 인수 뒤 test-user 제한 Private Beta release go/no-go를 준비한다. main merge는 release 때만, release 서버 변경은 현재 요청의 별도 명시 승인 후다.
3. 후속 1.0.2는 사용 중 추가 보완이며 1.0.1 필수 요구나 출시 차단 결함을 미루는 수단이 아니다.

## 검증과 완료 조건

- [ ] 영향받은 실제 트리거와 결과를 기존 검사 중심으로 검증하고 명령·환경·SHA·미실행을 기록했다. 동일 입력/환경의 성공 증거를 재사용한다.
- [ ] 원문·권한·기존 사용자·복구 불변조건과 위 수용 기준에 실제 증거가 있다.
- [ ] 구현 Phase의 필수 CI·동일 SHA 개발 배포·공개 smoke와 상태 기록을 인수했다. 문서-only 변경은 링크·범위·결정 검토로 구분했다.
- [ ] [FUTURE-INTAKE](../FUTURE-INTAKE.md)에 따라 저장소 전역 Future 변경을 push 전 및 Phase 완료 때 한 번 대조하고 동일 변경은 재처리하지 않았다.
- [ ] 실제 OS/기기·Google 설정·백업·외부 승인 잔여를 숨기지 않았으며 main/release 서버 변경을 별도 현재 승인 없이 실행하지 않았다.

## 다음 Phase 인계

[1.0.2 P1](../1.0.2/1phase.md)에 변경 파일·migration·계약·수용 증거·잔여 항목을 넘긴다. 전체 10 Phase 인수 뒤에만 Private Beta release를 판단한다. 기존 task 재배정은 [변경 이력](../../../docs/planning/plan-revision-2026-09-09.md)에 남긴다.
