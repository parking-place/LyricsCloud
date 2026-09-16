# 1.1.7.a P5 — 문서·최종 검증·릴리스 인계

상태: **진행 중**. [P4](4phase.md)의 전체 수용/권한·복구 결과가 선행한다. P4 PR #149 merge `8d3ed3fdade28902957e7c5253c341edf8ded5c4`에서 P5 전용 브랜치를 시작했다. 최종 CI·같은 SHA 개발 인수 전에는 P5 완료가 아니며 정식 tag/image·릴리스 서버를 바꾸지 않는다.

로컬 후보 증거: frozen pnpm lockfile/production license **65개 실제 package group 일치**, Node 24 계열 check·production web build PASS, 1151 populated 1140→1151·반복·RLS·application-first rollback PASS, 역사적/final release·문서·환경 gate 1001/1002/1004/1005/101 PASS. 격리 PostgreSQL profile/photo 14 PASS, Linux Chromium/Firefox/WebKit desktop·Chromium/WebKit mobile P4 영향 15 PASS, 한 번짜리 버전 경계 4 PASS. 첫 격리 migration/E2E 컨테이너는 `APP_CHANNEL` 미설정으로 시험용 `APP_PHASE`와 release 기본값이 충돌해 시작 실패했으며 동일 입력에 `dev` 채널을 명시한 재실행이 PASS했다. Docker의 별도 Git worktree 메타데이터 미마운트 때문에 oneoff shell guard 1건이 실패했고, 로컬 Git 환경의 동일 4건은 PASS했다. 실패 시도를 PASS로 재분류하지 않는다. P4 제품 코드는 변경하지 않았으며 전체 393건 로컬 회귀·CI는 P4 SHA의 통과 증거와 P5 최종 CI로 구분한다.

## 작업

- [x] `LC-PLAN-117A-P5-01`: 사용자 안내에 닉네임·사진 선택/제거, Google 기본값과 사용자 지정값의 우선순위, 사진/공유 표시명 공개 범위, 로고 홈 이동과 미저장 입력 안내를 반영한다. 계정 export·탈퇴·백업/사진 orphan 정리 runbook을 실제 구현과 맞춘다.
- [x] `LC-PLAN-117A-P5-02`: 이번 한 번 확정한 **`1.1.7a` 제품 버전**의 요구 추적·변경 파일/DB migration·rollback·지원 플랫폼/브라우저·실기기 미실행 목록을 봉인한다. 폴더 이름 `1.1.7.a`와 실제 태그 `v1.1.7a`를 구별한다. 1.1.8 P4와 후속 의존성은 그대로 보류한다.
- [ ] `LC-PLAN-117A-P5-03`: 해당 patch의 로컬 수용·격리 DB·production build·필수 최종 CI, Phase 브랜치 원격 SHA와 같은 SHA 개발 서버 배포/공개 HTTPS smoke를 [Agent 지침](../../../Agent.md)과 [품질 게이트](../QUALITY-GATES.md)대로 확인한다. 문서-only push의 skip CI는 최종 필수 CI PASS가 아니다.
- [ ] `LC-PLAN-117A-P5-04`: 모든 push 전 [Future 검수](../FUTURE-INTAKE.md)를 수행하고 현행/이전 blob·변경 범위·중복/배정 기록을 남긴다. 사용자/운영 데이터, 비공개 환경값, 사진 원본을 커밋하지 않는다.
- [ ] `LC-PLAN-117A-P5-05`: 실제 릴리스는 `1.1.7a` P1~P5·최종 CI·동일 SHA 개발 인수 뒤 **승인된 별도 `release/1.1.7a` PR/branch/tag 경로**로 [릴리스 정책](../RELEASE-POLICY.md)의 digest·운영 인수를 따른다. `main`과 미완료 1.1.8은 건드리지 않으며 P5 gate 전 정식 tag/image·릴리스 서버를 변경하지 않는다.

## 인수 조건

사용자 관점 `AC-117A-01~05`, migration/보안·접근성·기기별 실제 결과, SHA, 롤백, 남은 위험과 출시 승인자를 한 기록에서 추적할 수 있어야 한다. 계획 문서가 완성됐다는 사실만으로 Phase 또는 제품 릴리스 완료를 표시하지 않는다.
