# 1.2.0 Phase 5 — 문서·최종 통합·개발 인수

상태: **진행 중** (`in_progress`). [P4](4phase.md)의 최종 기능 SHA `c380a598ad4bd5ccd38b6aa3f3ceb77040cf1986`와 전수 요구 인수표를 인계했다. `RD-REQ-006`, `AC-RD-120-11`의 책임 Phase다. 실제 기기·OS IME·AT는 사용자 지시로 후속 미실행이다.

## 작업

- [x] `LC-RD-120-P5-01` 기능·화면·수용 ID 대응표와 사용자 안내·지원/자가호스팅 문서·디자인 토큰/목업을 최종 구현에 맞춘다. 시연만 있는 기능과 실제 구현된 기능을 구분하고 이전 자료/완료 이력을 보존한다.
- [x] `LC-RD-120-P5-02` `VERSION`, 관련 package version, runtime phase/channel/version/SHA, 실행 STATUS, `3.Redesign-phase`를 참조하는 도구·manifest·릴리스 설명이 실제 최종 후보와 일치하는지 확인한다. 계획 폴더만 추가한 이번 작업을 버전 승격 근거로 재사용하지 않는다.
- [ ] `LC-RD-120-P5-03` 실제 최종 후보의 필요한 전체 회귀·보안·라이선스·성능·production build·최종 필수 원격 CI와 image 발행/서명 정책을 통과한다. 문서-only 중간 push의 `[skip ci]`와 필수 통합 CI를 구분한다.
- [ ] `LC-RD-120-P5-04` 원격 Phase branch와 commit을 확인하고 정확히 같은 SHA의 개발 서버 배포·health·공개 HTTPS·핵심 작성/자료/설정/공유/복구 smoke와 기존 데이터 보존을 인수한다. 다른 SHA나 시연 목업의 통과를 대신 쓰지 않는다.
- [x] `LC-RD-120-P5-05` 되돌림 경로·지원 브라우저/실기기 실제 증거·미실행/잔여 위험·운영 인수 조건을 릴리스 인계에 기록한다. 별도 개발선의 미완료 Windows 산출물이 정식 후보에 섞이지 않았는지 확인한다.
- [x] `LC-RD-120-P5-06` 각 Phase/요구 완료와 Future 검수·상태·변경 기록을 연결한다. [1.2.1 이후 로드맵](../ROADMAP.md)으로 선해결 SHA·회귀 소유권·남은 범위를 인계한다. 보류된 1.1.8~1.1.14를 자동 재개하거나 완료로 바꾸지 않는다.

## 2026-09-25 P5 로컬 문서·계약 후보 — 원격 인수 전

P4 문서 SHA `e1c0cd7275fabc2e5e526774eb5f1601a99698c9`에서 분기했다. [최종 추적](../../../docs/architecture/1.2.0-FINAL-TRACEABILITY.md), [1.2.0 릴리스 노트](../../../docs/releases/1.2.0.md), 정식 미승인 [경로](../../../docs/runbooks/1.2.0-release.md)·[체크리스트](../../../docs/runbooks/1.2.0-release-checklist.md)를 추가하고 README·사용자·지원·셀프호스팅 설명을 현재 운영/개발 경계로 정렬했다. 207 ID는 구조 대응이지 동작 전수 PASS가 아니며 이전 B-1·classic와 CodeMirror/Yjs·DB 1152 계약을 보존한다. `apps/windows`와 보류 native 산출물·정식 tag는 이 후보에 포함하지 않는다.

로컬 `validate-1001-final-gate`, `validate-1002-release-artifacts`, `validate-1004-documentation`, `validate-1005-final-release`, `validate-101-environment`, `validate-120-feature-map` PASS. `VERSION`·11 package version·31 migration·4 digest-only image 계약과 lockfile/migration/environment/license manifest의 sha256 일치를 확인했다. CI의 `APP_PHASE`와 `.env.example`을 현재 p5로 정렬했다. 이 결과는 P5 필수 전체 CI·네 signed image·동일 SHA 개발 공개 인수 전 완료 증거가 아니다. 실제 물리 기기·OS IME·AT는 사용자 지시로 후속 미실행, 첫 화면 성능 소표본 위험과 `OPS-100-001`은 유지한다.

첫 최종 후보 `539733fa1ef94bec1c730fe66c94a9d350732d28`의 push/PR 실행은 수용 ID 설명을 명확히 하기 위한 후속 push로 취소되어 PASS가 아니다. 다음 후보 `5b281201be61def42dde0ca3079e7b70bdd829bb`의 [push Actions 36069343350](https://github.com/parking-place/LyricsCloud/actions/runs/36069343350)은 정적 검사·마이그레이션·의존성/secret 감사 뒤 Unit **510 PASS/1 FAIL/8 조건부 skip**으로 중단됐다. `export-safety.integration.test.ts`의 합성 pending projection을 다른 파일의 전역 retry 시험이 같은 임시 DB에서 병렬 소비해 `rhyme_notes`→`resources` trigger와 복구 transaction 사이 PostgreSQL 교착이 발생했다. 제품·DB schema 변경이 아니라 DB 공유 시험의 파일 간 격리 문제로, `AUTH_DATABASE_INTEGRATION=true`일 때 Vitest 파일 실행만 순차화했다. 테스트 assertion·수·자료·실제 동시성 시험 내부는 변경하지 않았다. 격리 `lyricscloud_test`의 Node 24 전체 Vitest 재검증 **511 PASS/8 조건부 skip/0 FAIL**(114파일, 65.32초), 실패 사례 자체도 PASS했다. 첫 CI 실패를 새 후보 PASS로 소급하지 않으며 새 SHA에서 전체 필수 CI·서명·개발 인수를 다시 기다린다.

## 완료와 배포 경계

[Agent.md](../../../Agent.md)의 `로컬 인수 → commit → 원격 push/SHA 확인 → 필수 CI → 같은 SHA 개발 배포 → 공개 smoke → 상태 기록`을 따른다. 필요한 검증·실기기·배포가 미완료면 원인과 다음 행동을 기록하고 완료로 표시하지 않는다.

P5는 실제 1.2.0 후보 인수다. 정식 main/릴리스 branch 통합·tag·Release/latest 이미지·릴리스 서버 변경은 그때의 승인 및 [릴리스 정책](../../2.Patch-phase/RELEASE-POLICY.md)을 적용한다. 이번 1.2.0 **계획 배정 요청**을 운영 변경 승인으로 확대하지 않는다.

## 인계에 남길 항목

실제 최종 SHA/branch·CI run·개발 smoke·version/phase/schema, 기능 대응표, 변경 API/schema 유무, 데이터/설정 호환·rollback, 브라우저 대리와 실제 기기 결과, 남은 위험, 정식 릴리스 승인 상태를 하나의 기록으로 연결한다. 1.1.7a 이전 이력과 보류 플랫폼 계획은 원래 위치에 남긴다.
