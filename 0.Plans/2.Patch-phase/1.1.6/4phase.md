# 1.1.6 Phase 4 — 실패·권한·복구 회귀

- 상태: **완료** (`complete`, 후보 `25d71022184c4873d97bd432d3f31a53e803bb60` 동일 SHA 개발 인수 완료)
- 단계 목적: 승인 디자인 적용·편집과 복구 화면의 실패·권한·복구 회귀을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

창작 편집기·자료 패널·가입/공유/복구 화면에 승인 디자인을 적용하고 전 기능을 다시 검증한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [x] [1.1.6 P3](3phase.md)의 산출물·검증/승인과 실제 최종 SHA `e6f9e8c266d3d61c7016aa51519ff4fc5703fdbe` 인수.
- [x] 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [x] [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 browser runner 확인. 실제 물리 기기·OS IME/AT/OS zoom은 조건부 미실행 gate로 분리한다.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/DESIGN-NATIVE.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-037`, `NF-REQ-039`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

다른 패치의 기능·사용자가 선택하지 않은 Future 아이디어·승인 없는 기술 교체·운영 변경은 제외한다.

## 수정 책임 경로와 인터페이스

- `apps/web/src/components`
- `packages/editor/src`
- `packages/ui/src`
- `tests/e2e`
- `docs/user`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.1.6-P4-01` `AC-1.1.6-01`: 10,000줄 편집 중 화면 폭/테마/패널 변경 상황을 재현하여 “현재 IME·selection·undo·초안이 유지된다.”를 검증한다. 자동/실제 DB/브라우저/실기기 증거를 구분한다.
- [x] `LC-NF-1.1.6-P4-02` `AC-1.1.6-02`: 서버 저장 실패/권한 회수/새로고침 경고 상황을 재현하여 “안내와 실제 저장/접근 상태가 일치한다.”를 검증한다. 자동/실제 DB/브라우저/실기기 증거를 구분한다.
- [x] `LC-NF-1.1.6-P4-03` `AC-1.1.6-03`: 동일 자료를 이전/새 UI에서 복사·내보내기 상황을 재현하여 “결과가 디자인과 무관하게 동일하다.”를 검증한다. 자동/실제 DB/브라우저/실기기 증거를 구분한다.
- [x] `LC-NF-1.1.6-P4-04` `AC-1.1.6-04`: 필수 화면의 키보드·mobile·확대 조작 상황을 재현하여 “우회 없는 버튼 불능과 겹침이 없다.”를 검증한다. 자동/실제 DB/브라우저/실기기 증거를 구분한다.
- [x] `LC-NF-1.1.6-P4-05` 직전 버전·다른 계정·오프라인·재접속·서버 재시작·지원 브라우저/기기 회귀를 수행하고 미실행/skip의 원인을 기록한다.
- [x] `LC-NF-1.1.6-P4-06` 발견된 원인을 최소 수정 후 같은 재현을 다시 실행한다. 성능 변경은 동일 입력·환경의 전후 값과 결과 동등성을 증명하고 테스트 삭제로 통과시키지 않는다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.1.6-01` | 10,000줄 편집 중 화면 폭/테마/패널 변경 | 현재 IME·selection·undo·초안이 유지된다. |
| `AC-1.1.6-02` | 서버 저장 실패/권한 회수/새로고침 경고 | 안내와 실제 저장/접근 상태가 일치한다. |
| `AC-1.1.6-03` | 동일 자료를 이전/새 UI에서 복사·내보내기 | 결과가 디자인과 무관하게 동일하다. |
| `AC-1.1.6-04` | 필수 화면의 키보드·mobile·확대 조작 | 우회 없는 버튼 불능과 겹침이 없다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

### 완료 증거

- 최종 제품·검증 후보는 `25d71022184c4873d97bd432d3f31a53e803bb60`이다. 제품 runtime 동작은 P3와 같고, `tests/e2e/new-feature-1.1.6.spec.ts`에 classic/B-1의 exact copy/export, 720px·390px sheet 경계, editor focus 복귀를 보강했다. collaboration presence 검사는 두 actor가 모두 들어온 실제 상태만 기다리도록 경합을 제거했고, undo 검사는 CodeMirror의 합법적인 transaction grouping 두 경우를 모두 수용하면서 첫 undo의 추가 문자 제거와 최종 server body 복원을 그대로 요구한다.
- Node 24 격리 환경에서 check/build와 migration 2회, 실제 PostgreSQL Vitest `369 passed, 4 skipped`를 통과했다. collaboration 실제 DB 검사를 10회 반복해 매회 `4 passed`, Chromium의 저장·undo 재현을 10회 반복해 모두 통과했다. 지원 5-browser release matrix는 `57 passed, 13 skipped`이며 skip은 project별 비대상/조건부 사례다.
- PR Actions `34857974913`은 전체 PASS: Vitest `369 passed, 4 skipped`, Chromium full E2E `370 passed, 42 skipped`, selected read `5 passed`, public read `9 passed, 4 skipped`, selected write `5 passed`, guest write 5 project PASS, sharing stability 5 project PASS, release candidate `10 passed`다.
- push Actions `34857969866`도 동일 SHA에서 전체 verify와 web/collaboration/worker/migrate 개발 image 발행·서명을 PASS했다. 첫 verify의 revision p95 `6.073ms`는 `160ms` 예산 안이었으나 round P95 CV가 runner 잡음으로 `121.538%`여서 failed verify job만 동일 SHA로 재실행했다. 재실행은 검사를 삭제·완화하지 않고 전체 gate를 통과했다.
- SHA·`dev-1.1.6-p4`·`Dev`·`Dev-latest`는 서비스별 동일 digest다: web `sha256:a7c4d24b31c5923f67c5bea0b3d7ac247e2168367dba1bdf82ffb51d777c234b`, collaboration `sha256:1e9bb0f665d9ed9f36483f1504247a74958cb7bc641888ae787808f18fe1dc35`, worker `sha256:8f50f8f374820b852c5a7ef03cb90305b27846901d84063573a1d522de51bab2`, migrate `sha256:5b23130b7938b8e2de6944eb6a9d7d5de51f41a847b38a31104ca83a64687de9`. 각 digest의 OCI 1.1 Sigstore referrer 1개도 독립 조회했다.
- 같은 SHA를 개발 서버에 배포해 `1.1.6/dev/p4`, schema `1140_sharing_stability.sql`, B-1 root와 네 지속 서비스 healthy를 확인했다. 공개 HTTPS에서 desktop/mobile×light/dark 생성·테마 전환 입력, `+ 새 가사`, 연결 관리 loading/empty/sheet/focus/overflow를 통과했고 server ACK→API 재진입 exact 한글 원문, 인증 editor deep link, web/collaboration/worker 실제 재시작 뒤 exact body·build·health를 확인했다. 합성 계정·자료는 모두 제거했고 DB volume·secret·allowlist·beta code를 보존했다.
- 실제 Windows/macOS 브라우저, iOS/Android 물리 기기, OS 한글 IME 조합 중간 상태, 실제 AT와 OS 200% 확대는 이번 자동 환경에서 실행하지 않았다. Chromium 합성 viewport/CSS 720px·390px와 keyboard/focus는 PASS이나 이를 실제 OS/기기 PASS로 대체하지 않는다.

## 완료 조건

- [x] 작업 ID마다 코드/설계·실행/검토 증거·정확한 SHA가 연결되어 있다.
- [x] 현재 패치의 원문·권한·복구·오류 처리가 정상 동작과 함께 검증되었다.
- [x] 미실행·남은 결함·외부 차단·보류한 기술 결정이 숨김없이 기록되었다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [x] 구현 Phase는 CI·동일 SHA 개발 인수를, 설계-only는 승인 증거를 갖췄다.
- [x] main·Release·운영 변경은 별도 현재 승인 없이 수행하지 않았다.

## 산출물

- 1.1.6 P4의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.1.6 P5](5phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.
