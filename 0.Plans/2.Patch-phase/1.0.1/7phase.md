# 1.0.1 Phase 7 — 메인 로고·아이콘·버전과 Phase 표시

상태: **완료**. 기존 제품 mark를 정식 자산군으로 채택하고 runtime/health 공통 build metadata와 동일 SHA 개발 공개 인수를 통과했다.

## 목표와 경계

승인된 주 로고/아이콘은 light/dark·단색·favicon·PWA/maskable·작은 화면에서 판독 가능하고 자산 출처/사용권이 기록된다.

담당 경로: public logo/icon 자산·navigation·build metadata 소비. 정확한 파일·명령은 착수 당시 소스로 확정한다. 다른 Phase 기능·후속 선택 아이디어·승인 없는 운영 변경은 포함하지 않는다.

## 선행조건·입출력

- [P6](6phase.md)의 산출물·해당 구현 인수, 소비할 ADR/PROD/OPS와 파일 소유권을 확인한다.
- 입력은 정확한 SHA·계약·합성 fixture·실제 환경과 잔여 결함이다. 출력은 아래 작업의 산출물과 수용 증거·실패 복구·다음 담당자의 경계다.
- [베타 계약](../contracts/BETA-ACCESS.md), [버전 정책](../VERSIONING.md), [릴리스 정책](../RELEASE-POLICY.md), [품질 게이트](../QUALITY-GATES.md)를 소비한다.
- P2는 P1의 승인된 코드/운영 계약을 즉시 소비한다. P3/P4 전에는 신규 가입을 열지 않으며 CLI 인수를 UI·로고 최종 승인까지 기다리게 하지 않는다.

## 작업 체크리스트

- [x] `LC-NF-1.0.1-P7-01` LyricsCloud 주 로고 후보와 메인 아이콘을 제작·검토하고 승인된 light/dark·단색·favicon·PWA/maskable 자산을 반영한다. 기존 목업 원본과 라이선스 기록은 보존한다.
- [x] `LC-NF-1.0.1-P7-02` 우상단 로고 옆에 신뢰 가능한 build metadata로 v1.0.1 Release 또는 v1.1.12-p3 dev를 표시한다. 라임노트·프롬프트 버튼 옆 버전 문구는 제거한다.
- [x] `LC-NF-1.0.1-P7-03` 로고 후보의 선택 기록·자산 원본·사용권·접근성 이름을 준비하며 전면 morphism 시안은 후속 UX 단계로 분리한다.

## 구체적 수용 기준

1. 승인된 주 로고/아이콘은 light/dark·단색·favicon·PWA/maskable·작은 화면에서 판독 가능하고 자산 출처/사용권이 기록된다.
2. 로고 부근에 v1.0.1 Release 또는 v1.1.12-p3 dev를 build metadata로 표시한다. 라임노트/프롬프트 옆의 중복 버전은 제거한다. 디자인 승인과 구현·배포를 별도로 기록한다.

## 검증과 완료 조건

- [x] 영향받은 실제 트리거와 결과를 기존 검사 중심으로 검증하고 명령·환경·SHA·미실행을 [P7 인수 기록](../../../docs/runbooks/1.0.1-phase7-brand-metadata.md)에 기록했다. 동일 입력/환경의 성공 증거를 재사용한다.
- [x] 원문·권한·기존 사용자·복구 불변조건과 위 수용 기준에 실제 증거가 있다.
- [x] 구현 Phase의 동일 SHA 개발 배포·공개 smoke와 상태 기록을 인수했다. 중간 Phase 원격 CI는 저장소 정책대로 `[skip ci]`로 구분했고 P10 최종 통합에서 수행한다.
- [x] [FUTURE-INTAKE](../FUTURE-INTAKE.md)에 따라 저장소 전역 Future 변경을 push 전 및 Phase 완료 때 대조하고 동일 변경은 재처리하지 않았다.
- [x] 공개 light/dark·접근성 이름·favicon/PWA/maskable·runtime/health 일치를 확인했다. main/release 서버는 변경하지 않았고 외부 백업 구축은 사용자 승인에 따라 보류를 유지한다.

## 다음 Phase 인계

[P8](8phase.md)에 변경 파일·migration·계약·수용 증거·잔여 항목을 넘긴다. 전체 10 Phase 인수 뒤에만 Private Beta release를 판단한다. 기존 task 재배정은 [변경 이력](../../../docs/planning/plan-revision-2026-09-09.md)에 남긴다.
