# 전 버전 공통 품질·실행 게이트

이 문서는 계획의 수용 기준이다. 테스트를 지금 실행했다는 보고가 아니다. [기준 소스](SOURCES.md)의 `package.json` 명령을 출발점으로 하되 로컬 Codex의 최종 인수 SHA에서 다시 확인한다.

## 공통 안전성

원문 유실·교차 사용자 노출·인증 우회·복원 불가·전체 서비스 불능은 기존 프로젝트 정의의 P0 후보로 등록한다. 우회 없는 핵심 흐름 실패·무음 저장 충돌·주요 모바일 불능·삭제/내보내기 오류는 P1으로 다룬다. 사용자 보고/정적 의심/격리 재현/실제 DB/실기기 재현을 구별한다. 실패 테스트 삭제·assertion 완화·임의 skip·과거 PASS의 재인용으로 완료하지 않는다.

## 구현 Phase의 실행 순서

각 작업 ID는 실패 fixture/회귀를 먼저 정의→관련 테스트 실패 확인→최소 구현→같은 회귀 성공→기존 영향 범위 검사→작은 검토 가능한 commit의 순서다. 문서-only 작업은 요구 누락/링크/승인/범위 검사로 대신한다. 런타임 변경이 없는데 앱 테스트를 실행한 것처럼 기록하지 않는다.

## 검증 선택과 재사용

기존 성공 결과는 같은 입력·환경·변경에서 재사용한다. 새 동작/버그는 실제 트리거와 결과의 영향 검사부터 수행하고 필요할 때만 기존 회귀를 보강한다. 문구·스타일·문서는 새 앱 테스트를 만들지 않는다. 아래는 명령 참고 목록이며 모든 Phase마다 전부 실행하는 체크리스트가 아니다. full suite는 같은 변경에 로컬 또는 CI 한 곳만 수행하되 필수 CI 게이트는 따른다. 무관한 실패 수정·assertion 완화·새 근거 없는 반복 검사·작은 변경용 테스트 인프라를 만들지 않는다.

이번 문서 정비는 기존 `node scripts/validate-1004-documentation.mjs` 한 번, `git diff --check`, 필요한 링크/Phase/task ID/선택 보존만 확인한다. 앱 full suite는 실행하지 않는다.

## 기존 명령 참고

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
node --test scripts/tests/p6-*.mjs
node scripts/audit-p6-codebase.mjs
```

참고 SHA의 Node 24.x / pnpm 11.x 지원 범위를 baseline으로 삼되, 착수 시 로컬 Codex가 확정한 manifest/lockfile과 지원 범위를 다시 확인한다. 설치 중 lockfile을 임의 재생성하지 않는다. 참고 SHA에서 `pnpm check`의 lint는 boundaries 검사이며 React Hooks/전체 ESLint가 아니다. 1.0.1 품질 작업에서 누락 검사를 보강하되 기존 기준을 약화하지 않는다.

`git ls-files` 기반 문법 감사는 tracked 파일만 검사한다. 새 파일은 검토 후 해당 경로를 명시적으로 stage하고 전체 목록과 비교해야 한다. 소스 ZIP만 있는 임시 폴더의 빈 git index를 전체 감사로 보고하지 않는다.

## 실제 DB·브라우저

다음 명령은 **격리된 로컬 테스트 DB와 앱 설정을 구성한 뒤에만** 실행한다. 운영/개발 사용자 DB URL을 대입하지 않는다. 이 문서에는 접속 비밀번호를 넣지 않는다.

```bash
# DATABASE_URL이 전용 lyricscloud_test임을 먼저 검사하고 테스트 migration을 적용한다.
pnpm migrate
pnpm migrate
AUTH_DATABASE_INTEGRATION=true pnpm test
# E2E_DATABASE_URL도 같은 격리 테스트 DB만 가리키도록 한다.
pnpm test:e2e
pnpm test:e2e:release:0905
```

브라우저 설치·환경 값·test origin은 현재 repo의 Playwright config/기존 runbook을 따른다. 새 회귀 파일을 만들 때 `pnpm exec vitest run <해당 경로>` 또는 Playwright 선택 실행을 개발자가 계획에 구체 경로로 기록하고 실제 run에서 사용한다. 이 괄호 표시는 실행 명령이 아니라 작업별 test 경로를 붙이는 규칙이다.

## IME 필수 행렬

Windows 실제 Microsoft 한국어 IME의 Chrome/Edge, 추가 Firefox 확인. Android 실제 Gboard/Samsung Keyboard, iOS 실제 Safari/키보드. 환경에 없는 조합을 PASS하지 않는다. 라임·가사·prompt·metadata·검색/태그·template 입력마다 새/기존·단일/다중 탭·online/offline·blur·저장 실패·remote echo를 조합한다.

`바라봐`, `마냥`, `마땅한` 외 받침/겹받침·쌍자음·모음 조합·Backspace·undo/redo·빠른 입력·붙여넣기·Enter·pointer 전환을 사용한다. 최종 화면·local draft·서버 durable 원본·평문 투영·새로고침·다른 탭·clipboard를 대조한다. Playwright.fill 또는 synthetic composition event는 이벤트 로직 검사일 뿐 OS IME 인수를 대신하지 않는다. 내용 로그는 합성 fixture에서만 한정하며 실제 본문은 기록하지 않는다.

## UI·권한·운영

PC, 320/360/390px, tablet, 200% 확대, dark/light, keyboard/focus, overlay·PWA·cached asset 혼합을 검사한다. 클릭 불능과 theme 누락은 독립 결함이다. 공유 이전에는 owner A/B 차단, 공유 이후에는 A/B/C/guest read/write matrix를 적용한다. OAuth 기존 allowed user·새 invitation user·정지/탈퇴·키 회전·callback 실패를 확인한다.

migration fresh/repeat/upgrade/recovery, 실제 backup/restore, image runtime/readiness·정적 자산·secret canary, 원격 CI와 정확한 SHA 개발 smoke는 앱 Phase 완료 조건이다. 배포 환경을 변경할 권한은 별도 runbook/승인에서 확인한다.

## 성능 및 최신화

측정 fixture·환경·warm-up·반복·중앙값/p95·오류율·메모리 peak/전후를 구분한다. 미세 함수 benchmark를 앱 전체 개선으로 확대하지 않는다. 저장/검색/복사 결과 동등성을 먼저 확인한다. 실제 일정 시간의 브라우저 soak와 변경 횟수 가속 simulation을 구분한다. 의존성/컨테이너는 실행 시점 공식 보안·호환 문서를 확인하고 업데이트/유지/보류 이유를 기록한다. 제품 major 고정과 도구 major 업데이트 승인은 별개다.

## 보고 형식

작업 ID / 기준 및 수정 SHA / 명령 / 환경 / 결과와 실패 수 / 신규 skip와 사유 / 원본 보존 증거 / 변경 migration / 수행하지 못한 검증 / 남은 위험 / 다음 담당자. 재현 가능한 증거 없이 '전수 검증 완료', '전부 최신', '운영 안전'이라고 쓰지 않는다.
