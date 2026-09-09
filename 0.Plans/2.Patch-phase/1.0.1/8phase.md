# 1.0.1 Phase 8 — README·현재 문서·버전 및 릴리스 도구 대응

상태: **계획 검토 / 구현 미착수**. 문서 작업만으로 실행 STATUS·runtime version을 바꾸지 않는다.

## 목표와 경계

현재 문서의 실제 평문 test-user 동작을 P3 인수 전 해시 지원으로 선전하지 않는다. README의 베타/CLI/로고/스크린샷/배지는 실제 증거에 맞춘다.

담당 경로: README/docs·release-phase-state·발행/버전 검증 도구. 정확한 파일·명령은 착수 당시 소스로 확정한다. 다른 Phase 기능·후속 선택 아이디어·승인 없는 운영 변경은 포함하지 않는다.

## 선행조건·입출력

- [P7](7phase.md)의 산출물·해당 구현 인수, 소비할 ADR/PROD/OPS와 파일 소유권을 확인한다.
- 입력은 정확한 SHA·계약·합성 fixture·실제 환경과 잔여 결함이다. 출력은 아래 작업의 산출물과 수용 증거·실패 복구·다음 담당자의 경계다.
- [베타 계약](../contracts/BETA-ACCESS.md), [버전 정책](../VERSIONING.md), [릴리스 정책](../RELEASE-POLICY.md), [품질 게이트](../QUALITY-GATES.md)를 소비한다.
- P2는 P1의 승인된 코드/운영 계약을 즉시 소비한다. P3/P4 전에는 신규 가입을 열지 않으며 CLI 인수를 UI·로고 최종 승인까지 기다리게 하지 않는다.

## 작업 체크리스트

- [ ] `LC-NF-1.0.1-P8-01` README·Agent·AGENTS·계획 색인·ADR/PROD/OPS·환경 예제·테스트계정·OAuth·배포·복원·보안·지원·변경이력을 전수 분류해 현재 내용만 최신화한다.
- [ ] `LC-NF-1.0.1-P8-02` 정식 태그가 dev push로 이동하지 않는지 자동 시험하고 Release·latest·Release-latest가 승인 릴리스에서만 같은 digest를 가리키는지 모의 검증한다.
- [ ] `LC-NF-1.0.1-P8-03` GitHub README를 승인 로고·합성 스크린샷·기능표·빠른 설치·베타 참여·CLI·보안/백업 제한·문서 목차·실제 CI 배지로 완성한다. 없는 성능·테스트 성과를 꾸미지 않는다.
- [ ] `LC-NF-1.0.1-P8-04` release-phase-state.mjs와 연결된 버전/발행 검증기를 1.0.1의 10 Phase 및 가변 Phase·2.Patch-phase·multi-digit(1.12.91 등)에 대응시킨다. 현행 1.0.0 P5/P6 기준 및 기존 release evidence는 보존한다.

## 구체적 수용 기준

1. 현재 문서의 실제 평문 test-user 동작을 P3 인수 전 해시 지원으로 선전하지 않는다. README의 베타/CLI/로고/스크린샷/배지는 실제 증거에 맞춘다.
2. scripts/release-phase-state.mjs의 현재 1.0.0 P5/P6 기준을 1.0.1 P1~P10·추가 Phase·새 경로·다자리 minor/patch로 확장하는 구현을 수행한다. 1.12.91은 parser 예제이며 발행 번호 예약이 아니다.
3. 기존 발행 이력을 보존한 채 dev가 정식 tag를 움직이지 않고 Release/latest/Release-latest가 승인된 release에만 같은 서비스 digest를 가리키도록 관련 도구/문서의 실제 지원을 검사한다.

## 검증과 완료 조건

- [ ] 영향받은 실제 트리거와 결과를 기존 검사 중심으로 검증하고 명령·환경·SHA·미실행을 기록했다. 동일 입력/환경의 성공 증거를 재사용한다.
- [ ] 원문·권한·기존 사용자·복구 불변조건과 위 수용 기준에 실제 증거가 있다.
- [ ] 구현 Phase의 필수 CI·동일 SHA 개발 배포·공개 smoke와 상태 기록을 인수했다. 문서-only 변경은 링크·범위·결정 검토로 구분했다.
- [ ] [FUTURE-INTAKE](../FUTURE-INTAKE.md)에 따라 저장소 전역 Future 변경을 push 전 및 Phase 완료 때 한 번 대조하고 동일 변경은 재처리하지 않았다.
- [ ] 실제 OS/기기·Google 설정·백업·외부 승인 잔여를 숨기지 않았으며 main/release 서버 변경을 별도 현재 승인 없이 실행하지 않았다.

## 다음 Phase 인계

[P9](9phase.md)에 변경 파일·migration·계약·수용 증거·잔여 항목을 넘긴다. 전체 10 Phase 인수 뒤에만 Private Beta release를 판단한다. 기존 task 재배정은 [변경 이력](../../../docs/planning/plan-revision-2026-09-09.md)에 남긴다.
