# 1.1.7.a P1 — 기준 화면·프로필/이동 계약

상태: **P1 검토 중 (`review`)**. 계약과 한 번짜리 버전 경계는 작성·로컬 검증했지만 원격 필수 CI·같은 SHA 개발 서버 인수가 남았다. [목표](README.md)·[버전 규칙](../VERSIONING.md)·[결정 권한](../Decision-Ownership.md)을 따른다.

## 작업

- [x] `LC-PLAN-117A-P1-01`: `v1.1.7` source `edb8b4a`, main `b995ffe`, 각 경로를 [P1 계약](../../../docs/runbooks/1.1.7a-phase1-profile-home-contract.md)에 기록했다. 현행 데스크톱 우측 topbar에는 Brand가 없어 **새 홈 mark**, 모바일 우측에는 장식 avatar가 있어 **홈 icon**을 승인 대상 후보로 정했고, rail/헤더 Brand도 `/workspace` 링크로 일치시킨다. 실제 화면 스크린샷·hit target 수용은 P3 E2E에서 증명한다. 인증 장식 Brand/설정/로그아웃은 제외한다.
- [x] `LC-PLAN-117A-P1-02`: 공백 trim/빈 값 거부·120자 상한·IME 완료 뒤 저장, provider 기본값/사용자 override/명시 복귀와 identity 불변을 P1 계약에 고정했다.
- [x] `LC-PLAN-117A-P1-03`: 파일 PNG/JPEG/WebP·2 MiB/16 MP 입력, 서버 `sharp` decode/256px WebP 재인코드·200 KiB 출력, PostgreSQL owner/RLS bytea·인증된 private 제공/탈퇴 삭제와 Google fallback을 P1 계약에 고정했다. 실제 처리/보안 회귀는 P2/P4에서 확인한다.
- [x] `LC-PLAN-117A-P1-04`: 신규 공유 조회에는 변경 성공 뒤 이름을 반영하되 기존 감사 기록은 소급 변경하지 않고, owner 이름 비노출 설정/사진 비공개를 P1 계약에 기록했다.
- [x] `LC-PLAN-117A-P1-05`: `/workspace`, “창작 홈으로 이동” 접근성 이름/키보드·터치와 기존 이탈 guard/returnTo·IME/오프라인/저장 실패 취소를 P1 계약에 고정했다. 실제 P3/P4 browser 검증은 별도다.
- [x] `LC-PLAN-117A-P1-06`: `1.1.7a` 단일 버전·경로·tag 검증과 기존 1.1.8/후속 gate 보존을 P1 계약/버전 정책에 기록했다. 사용자는 별도 `release/1.1.7a` branch/PR/CI/tag 예외를 승인했고 base는 `v1.1.7` SHA로 생성·push했다. main 이력은 변경하지 않았다.

## 수용·인계

`AC-117A-01~05`별 정상/실패/권한/복구 입력표, 확정 클릭 대상, 사진 저장·공개·삭제 결정, OAuth override 우선순위, 기준 `v1.1.7` source SHA, `1.1.7a` 단일 예외와 별도 릴리스 선행조건이 한 문서로 연결돼야 한다. 임시 URL-only UI나 OAuth 덮어쓰기 유지안을 승인된 설계로 간주하지 않는다. P1 설계 검토는 앱 테스트/배포 PASS가 아니며 [P2](2phase.md)는 확정 계약 뒤에만 시작한다.

2026-09-16 로컬 근거: Node 24.20.0 Docker에서 frozen install·`pnpm check`·production web build PASS, 설정 Vitest 18 PASS, one-off version 테스트 3 PASS, 역사 P6 version/publication 30 PASS, 전체 Vitest **265 PASS / DB 환경 없는 조건부 115 skip**, `validate-101-environment` 6 service PASS, shell syntax·diff check PASS. 첫 host Node 20 `pnpm install`은 실패했고 Node 24로 재실행했다. 처음 설정 test 1건의 기대값 `1.1.7` 잔존은 수정 후 18 PASS다. 중간 커밋 `85dfa5d`는 `[skip ci]`이므로 CI PASS가 아니다. **필수 원격 CI·같은 SHA 개발 서버/공개 smoke·P1 통합 PR 검증 전 P1 완료와 P2 전환을 하지 않는다.**

첫 원격 Actions `35014698215`는 `b603185`에서 DB·단위·정적 검사·production image·backup/rollback/security 단계까지 진행했으나 Playwright production fixture의 `APP_VERSION=1.1.7` 잔존으로 webServer 설정이 `CONFIG_INVALID(APP_VERSION)`을 반환해 E2E **FAIL**, 네 image publish **skipped**였다. fixture·health 기대값을 `1.1.7a`로 보정하고 regression 테스트 4 PASS, Node 24 `pnpm check` PASS, 로컬 production web `/api/health/live`에서 `1.1.7a/dev/p1` PASS를 확인했다. 이는 전체 E2E/CI PASS를 대신하지 않으며 새 후보 SHA로 재실행해야 한다.

두 번째 Actions `35016348844`는 1110 rollback/RLS 본문 OK 직후 해당 임시 DB의 `DROP ... FORCE`가 닫히는 PostgreSQL pool에 `57P01`을 보내 **FAIL**, publish skipped였다. 1110 verifier만 공용 비강제 UUID-scope cleanup으로 바꿨다. 별도 disposable PostgreSQL 18.3에서 실제 1110 fresh/repeat·RLS·rollback/recovery PASS, cleanup 계약 7 PASS. 기존 두 CI를 PASS로 재분류하지 않는다.

세 번째 Actions `35016930875`의 전체 E2E는 377 PASS / desktop·mobile baseline 2 FAIL / 43 skip이었다. 실패 두 건은 health version의 숫자-only regex가 정확한 승인 버전 `1.1.7a`를 거부했다. 기대값을 `APP_VERSION`/현재 one-off 기본값으로 정렬하고 별도 disposable PostgreSQL + 실제 Chromium desktop/mobile baseline 2 PASS, 앞선 browser health/owner 2 PASS, one-off source regression을 확인했다. 제품 배포·전체 CI/이미지 발행은 여전히 미완료다.
