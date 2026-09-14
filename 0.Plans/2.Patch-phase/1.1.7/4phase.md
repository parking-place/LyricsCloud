# 1.1.7 Phase 4 — 사용성·접근성 재검토

상태: **완료** (`complete`). 후보 `66f2f79967828ca40237a0d7a241d6da54094d37`의 두 필수 CI, 네 signed dev image와 동일 SHA 개발 공개 인수·서비스 재시작까지 완료했다.

## 선행조건과 담당 경계

[P3](3phase.md)의 실제 산출물과 [결정 권한](../Decision-Ownership.md)을 인수한다. [세부 계약](../contracts/DESIGN-NATIVE.md)을 따른다. 정확한 파일·SDK·명령은 착수 때 기존 구조 안에서 확정한다. 입력은 승인 범위·source SHA·fixture·실제 환경, 출력은 아래 산출물·수용 증거·미실행과 다음 단계 조건이다. 공통 파일은 한 작성자만 맡는다.

## 작업 체크리스트

- [x] `LC-NF-1.1.7-P4-01` 동일 과제의 전후 결과를 비교하고 실제 사용성 개선 여부를 확인한다. exact 목록 복귀·가사 원문·공유 focus 복귀를 같은 입력으로 재실행했다.
- [x] `LC-NF-1.1.7-P4-02` reduced motion/transparency·고대비·200% 확대·저사양 모바일에서 기능 동등성을 확인한다. reduced transparency·contrast/forced-colors CSS fallback을 추가하고 720px reflow·4x CPU Chromium mobile 대리를 통과했다.
- [x] `LC-NF-1.1.7-P4-03` 협업 presence/cursor·사전·폰트·IME가 새 탐색에서 충돌하지 않는지 영향 범위만 검증한다. 기존 선택 공유/회수·sharing recovery·10,000줄 editor/IME·폰트 회귀 14 PASS로 확인했고 외부 사전 no-go를 유지했다.

## 수용 기준

`AC-1.1.7-04`: 관찰 문제의 해결과 남은 한계를 비교 근거로 설명할 수 있다.

## 착수 검증 경계

- 기존 UX P4의 B-1 정적 목업 결과를 제품 PASS로 재사용하지 않고, 실제 제품의 P3 수직 과제를 같은 입력으로 다시 실행해 URL·focus·원문·권한 결과를 비교한다.
- Chromium/Firefox/WebKit의 reduced motion, forced colors/contrast 대리, 720 CSS px reflow(1440px 200% 확대 대리), 390px·CPU throttle 대리에서 기능 동등성과 overflow를 확인한다.
- 협업은 owner/reader presence와 회수, 가사는 composition event·selection·undo와 Noto Sans KR 적용/차단 fallback을 영향 범위로 검증한다. 외부 사전은 1.0.13 no-go를 유지하며 요청을 새로 만들지 않는다.
- 실제 OS 200% zoom, 저사양 물리 기기/GPU·배터리, NVDA/VoiceOver/TalkBack, OS IME는 별도 미실행으로 기록한다.
- 상세 fixture·환경·중단 조건은 [P4 인수 문서](../../../docs/runbooks/1.1.7-phase4-usability-accessibility.md)에 누적한다.

## 로컬 후보 증거

- 계약 6/6, 구조 경계, typecheck, production build를 통과했다.
- 실제 격리 PostgreSQL 전체 Vitest 380/380, Chromium desktop/mobile 전체 E2E 379 PASS·43 조건부 skip·0 FAIL을 통과했다.
- P4 집중 5-browser 행렬은 8 PASS·7 환경별 의도 skip, 영향 파일 회귀는 14 PASS·2 환경별 의도 skip을 기록했다.
- 실제 OS/물리 기기·AT·OS zoom·OS IME는 browser 대리 결과와 분리해 미실행으로 유지한다.

## 완료 증거

- Actions push `34894853203`, PR `34894869965`가 동일 후보 SHA에서 성공했고 push run의 web/collaboration/worker/migrate 개발 image 게시·keyless 서명이 성공했다.
- SHA tag와 `dev-1.1.7-p4`의 digest가 서비스별로 일치했다: web `sha256:9de0a8f3…ead1`, collaboration `sha256:76e7ce74…5c33`, worker `sha256:a3f24b61…784b`, migrate `sha256:9d19b950…4e11`.
- 동일 SHA 개발 공개 환경에서 reduced motion·720px reflow·forced colors·dialog/focus·4x CPU mobile 입력 영속을 통과했다. 저장 직후/3초 후 API와 CRDT 원문을 확인했고 web/collaboration/worker 재시작 뒤에도 exact 원문·목록 복귀·build/schema가 유지됐다.
- 최초 공개 시도는 editor 준비 전 locator만 확인해 입력 판정이 유효하지 않았으므로 제품 실패로 세지 않았다. 최종 판정은 `contenteditable=true`와 `방금 저장됨`을 선행조건으로 고정했다.

## 검증·완료·인계

- [x] 위 작업과 수용 기준에 실제 증거·환경·SHA를 연결하고 실패/미실행을 기록했다.
- [x] 원문·인가·복구·기존 사용자 계약을 유지하고 [품질 게이트](../QUALITY-GATES.md)의 영향 검사만 수행했다. 같은 성공 결과를 반복하지 않았다.
- [x] 구현 단계의 필수 CI·동일 SHA 개발 공개 smoke를 인수했고 실제 플랫폼 앱/AT/기기 증거는 미실행으로 분리했다.
- [x] [Future 검수](../FUTURE-INTAKE.md)를 push 전/Phase 완료 시 대조하고 같은 변경은 이전 기록을 참조했다.
- [x] SDK/외부 제공·실제 OS/기기·서명/스토어·release gate의 상태를 숨기지 않았다.

[P5](5phase.md)에 산출물·지원 범위·계약·남은 gate를 전달한다. 모든 배정 Phase 인수 뒤에도 main/release 서버 변경은 [릴리스 정책](../RELEASE-POLICY.md)의 별도 현재 승인을 따른다.
