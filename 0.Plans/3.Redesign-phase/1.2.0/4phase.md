# 1.2.0 Phase 4 — 교차 회귀·접근성·성능 인수

상태: **진행 중** (`in_progress`). [P3](3phase.md)의 기능 SHA `a315c07599be0aa3f4c9a58ab8757c9363e1e351`와 P1 기능 대응표를 인수한다. `RD-REQ-001~005`의 통합 보존 책임을 가진다.

## 작업

- [ ] `LC-RD-120-P4-01` [화면 범위](ACCEPTANCE.md)의 207개 기능 대응 및 홈/목록/가사/라임/프롬프트/설정/공유/복구를 두 테마·320/390/768/1024/1440px에서 확인한다. 정상·빈·로딩·실패·권한 없음 상태를 실제 해당 조건으로 점검한다.
- [ ] `LC-RD-120-P4-02` 한글 IME·selection/undo·외부/원격 update·자료/테마/집중 전환·offline/reconnect·여러 탭·ACK 유실·재시작·PWA 갱신에서 원문/미전송 입력/문서 키 보존을 확인한다.
- [ ] `LC-RD-120-P4-03` owner/writer/reader/guest·공유 회수/만료·삭제/복원·계정 전환·profile override/사진·export와 로컬 복구 격리를 검증한다. 기존 인가·W⊆R·복원 후 오래된 권한 비부활 계약을 유지한다.
- [ ] `LC-RD-120-P4-04` 실제 합성 표면의 글자 대비·focus·키보드·접근 가능한 이름/상태 안내·시트/모달·큰 글꼴·forced-colors·동작/투명도 감소를 확인한다. Chromium/Firefox/WebKit 대리와 실제 OS/IME/AT/물리 기기를 분리해 기록한다.
- [ ] `LC-RD-120-P4-05` 입력/스크롤/화면 전환·큰 문서·자료 목록에서 기존 성능 예산과 P1 효과 예산을 검증한다. blur/GSAP/SVG 비용·listener 정리·재진입 누수·저성능 fallback을 확인한다.
- [ ] `LC-RD-120-P4-06` 이전 UI 복귀와 데이터/설정 호환, 발견 결함의 같은 입력 재검증, 실제 영향받은 전체 회귀를 완료한다. 실패·skip·미실행·남은 실제 기기 gate를 인수표에 연결한다.

## 실행 방법과 증거

[기존 품질 게이트](../../2.Patch-phase/QUALITY-GATES.md)의 Node/DB/Docker/브라우저 환경을 사용한다. 실제 구현 변경 후 관련 테스트 → check/production build → 필요한 DB/지원 브라우저 통합을 실행한다. 실패를 없애기 위해 assertion·성능 예산·접근성 기준을 낮추지 않는다. 시각 기준 변경은 의도와 실제 화면을 확인한 뒤 별도 리뷰한다.

기록 단위는 수용 ID·source SHA·환경·명령·결과·실행/미실행 이유다. 미실행 실기기 항목을 자동화 PASS에 포함하지 않는다. 실제 사용자 자료를 fixture/log/screenshot에 사용하지 않는다.

## 2026-09-25 로컬 통합 후보 — 원격/개발 인수 전

기준 tree는 P3 문서 SHA `5269d79c7b2894f78208eedf6a17eda128663c58`에서 분기한 미커밋 P4 후보이며, 최종 기능 SHA는 push 후 기입한다. 이 절은 **로컬 증거**이지 Phase 완료 기록이 아니다. `FEATURE-MAP.md`의 207개 ID/대상 존재 검사는 PASS이나 207개 동작을 각각 자동화했다는 뜻은 아니다. 합성 자료만 쓰는 격리 `lyricscloud_test`, Linux Playwright 컨테이너와 Node 24 production build를 사용했다.

| 수용 ID / 작업 | 로컬 실행·결과 | 한계·처리 |
|---|---|---|
| AC-01/02/08/09, P4-01/04 | `chroma-120-p4.spec.ts`: Chromium/Firefox/WebKit × light/dark × 320/390/768/1024/1440px에서 홈/곡/가사/설정/휴지통 실제 route·본문·넘침·pageerror 검사 PASS. 모바일 320px forced-colors/reduced-motion/200% 글꼴·더보기 초점 복귀 및 설정/휴지통 axe PASS. `accessibility-states.spec.ts` 15화면×양 테마 axe/랜드마크·키보드/실패/오프라인 3 PASS. | 전체 207개 ID의 개별 동작 PASS나 실제 OS 확대/AT를 뜻하지 않는다. Windows/iOS/Android 실기기는 사용자 보류/미실행. |
| AC-03~05, P4-02 | Chroma 작성/자료·공통 편집/동기화/내구성/기록/PWA를 묶은 desktop 45건 첫 실행 **42 PASS/3 FAIL**. 실패 원인은 접근성 fixture 정리 누락으로 빈 홈 전제 오염 1, B1 전용 색상/variant 고정 시험 2. 동일 입력 수정 후 관련 12 PASS. 선택/undo/한글 합성 이벤트·두 탭·오프라인 재연결·ACK 유실·PWA 업데이트 1.2.0 tree 대리 회귀 PASS. | 합성 composition은 실제 OS IME 결과가 아니다. 기존 `pwa.spec.ts`의 로컬 standalone SW 경로 부재와 hydration 전 시험 이벤트 첫 재실행은 실패였고, 로컬/standalone 파일 선택·SW 등록 대기 후 2 PASS. |
| AC-06/07, P4-03 | 인증/소유권 7 PASS, profile/사진·계정 전환과 공유 reader/writer/revoke/guest 분리 실행. 선택·공개 읽기/쓰기 묶음 desktop 7 PASS/2 조건부 skip, 별도 `PUBLIC_GUEST_WRITER_E2E=true` guest 1 PASS. | public offline 테스트는 이 local project 이름 조건으로 skip, 최종 CI의 별도 브라우저 matrix 대상. skip을 PASS에 포함하지 않는다. |
| AC-10, P4-06 | 같은 격리 DB의 Chroma → B1 → Chroma에서 원문/설정 보존·동일 API 조회·B1 설정 화면·Chroma 재조회 및 합성 자료 영구 삭제 1 PASS. | 이중 origin 시험 harness의 B1 편집 WebSocket은 P3 협업 포트에 결합되어 B1 편집 가능 자체는 이 시험으로 판정하지 않았다. 기존 B1 편집 E2E와 최종 CI가 별도로 담당한다. |
| AC-09, P4-05 | 같은 Linux runner·동일 200행 가사/곡/1440px의 B1/Chroma 각 5회, 첫 회 cold 포함·warm-up 없음. B1→Chroma p95: 입력 `25.08→26.51ms`(+5.7%), 집중 전환 `56.48→53.36ms`(-5.5%), 스크롤 두 frame `33.7→32.3ms`, long task 0→0. `side-nav`/모바일 dock blur를 정적 배경으로 낮춘 뒤 재측정. 장문 10,000행 editor 인스턴스/메모리 기존 예산 1 PASS. | 첫 화면 p95 `430.89→476.58ms`(+10.6%), 중앙값 `196.78→217.40ms`(+10.5%)는 개선 아님. 표본 5회와 첫 cold 혼합의 관찰 위험으로 P5에 전달한다. Playwright 동작 시간은 실제 기기 INP/scroll 성능이 아니다. |

별도 Chroma 모바일 묶음 12 PASS/2 조건부 skip, `pnpm` 의존성 저장소 불일치 때문에 로컬 `pnpm check`는 시험 시작 전 중단됐으나 직접 아키텍처 검사·웹 TypeScript·production build PASS, 격리 DB Vitest **511 PASS/8 조건부 skip**, 207 대응표 검사 PASS다. production CSS의 강제 색상 버튼 대비와 light 상태 badge/prompt token 실제 axe 결함을 고쳤다. 증거 이미지 생성 시험이 덮어쓴 과거 문서 PNG는 제품 변경에 포함하지 않는다. 최초 실패·skip은 최종 PASS로 소급하지 않는다.

남은 gate: P4 후보 commit/원격 SHA·필수 CI와 네 signed dev image, 같은 SHA 개발 서버·공개 기능 smoke, Future 계획 재검수·완료 문서. 이 gate 전에는 P4 체크박스와 상태를 완료로 바꾸지 않는다.

첫 원격 후보 `8762d58753087649ddba4a6dbabba4b90227dd5a`의 CI 설정을 점검해 기존 Chroma 전용 단계가 P2 시험만 선택하는 것을 확인했다. 로컬 P3/P4 증거를 원격 필수 단계에서도 실행하도록 세 시험 파일로 범위를 확장한 후 새 SHA를 재발행한다. 첫 SHA의 진행 중 검증/이미지는 최종 SHA의 PASS로 소급하지 않는다.

## 완료 조건

원문 유실·인가 우회·무음 저장 실패 등 출시 차단 결함이 없고, [AC-RD-120-01~10](ACCEPTANCE.md)의 근거가 연결되어야 한다. 필수 CI·같은 SHA 개발 인수와 잔여 위험을 기록하고 [P5](5phase.md)에 최종 후보·범위·기기 한계를 전달한다. 실제 gate가 남으면 `review`로 남기고 완료로 표시하지 않는다.

## 0922·원격 웹 안정화 교차 인수

[공통 gate](../QUALITY-GATES.md)의 1.2.0 차단 목록을 각 ID로 재판정한다. [비교](../BRANCH-COMPARISON-118-P4.md)의 해결 후보는 현재 후보에 포팅한 SHA의 동일 입력/브라우저/서버 근거로만 닫는다. 원격 C3의 CI·PC 인수는 새 tree의 개발 공개 인수를 대신하지 않는다. ES-03 제목·ES-06/07·profile/PWA·연결 목록·UI-04/05/07/08 등 잔여 경계와 구 탭 서비스워커 자산 수명을 명시적으로 확인한다. 미해결 P1을 1.2.1 이후에 배정했다는 이유로 P4/P5를 닫지 않는다.

2026-09-23 순서 개정: 위 전환 검사는 먼저 인수된 b의 원문/저장/권한/서비스워커 동작을 보존하는 회귀다. 원격 WC를 다시 처음부터 포팅하는 Phase가 아니다. b에서 미해결인 필수 차단을 1.2.0 착수로 건너뛰지 않는다.
