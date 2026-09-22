# 1.1.8 P4 Web Stabilization 비교·선택 통합 계획

2026-09-22 추가 사용자 요청에 따라 최신 원격 브랜치를 가져와 **Git tree·소스·회귀 파일·인수 문서**를 비교했다. 현재 checkout을 바꾸거나 이 브랜치를 병합·제품 적용하지 않았다. [전체 로드맵](ROADMAP.md)과 아래 선택 후보를 각 Phase가 소비한다.

## 고정한 기준과 범위

| 항목 | 값·의미 |
|---|---|
| 현재 계획 branch/HEAD | `codex/1.2.0-redesign-plan` / `ddc818422a146a1641ba59d47b048772e9e35b42` (이번 문서 변경 전) |
| 현재 제품 기준·merge base | `v1.1.7a` / `fc2463cdb47d9fd7d0042779f602c6ddb7d734cf`. 현재 HEAD의 제품 경로는 이 기준과 동일 |
| 원격 비교 head | `phase/1.1.8-p4-web-stabilization` / `c230c024aeb0297b1c130e3f3e8b507a43a7e871`. 원격 heads 조회·fetch 후 재조회하여 일치 확인 |
| 최신 실제 기능 SHA | `0375825fe004fc74869250eefa14add267c4b3ae`. head와 차이는 상태·P4·Future·runbook 문서 4개 |
| 웹 안정화 직전 통합점 | `21f5863479230f92bd6452b24223ef6f7de08559`. 여기서 head까지 웹 수정/검증/기록 5 commit·97파일 순변경 |
| 두 head의 전체 차이 | 285파일 순변경. 현재 계획/목업만 있는 차이와 native 선행 변경을 포함하므로 결함 수로 해석하지 않음 |
| 제품/검사 경로 차이 | apps/packages/infra/scripts/tests/.github/package.json/lockfile 대상 167파일. native 앱/서비스/검사와 웹 수정이 섞임 |

원격 branch가 나중에 이동하면 고정 SHA를 조용히 바꾸지 않고 추가 commit의 차이만 검토해 이 문서와 소비 Phase를 갱신한다. 원격 파일 행번호는 현재 로컬 파일의 행번호가 아니다.

## 관련 commit과 증거 강도

| 표기 | commit | 역할 |
|---|---|---|
| C1 | `cd87eb283ecaf5977a8bc9552f26bfa52f273f26` | 저장·탐색·목록·설정·반응형·휴지통 개선 |
| C2 | `a15271003e686995579ce3ddff26c4ac29c5dcbf` | PWA notice·회귀 fixture 보정 |
| 시각 기준 | `ee3647d` | 모바일 snapshot 갱신. snapshot 변경만으로 UI-08 해결 증거가 되지 않음 |
| C3 | `0375825fe004fc74869250eefa14add267c4b3ae` | 입력/IME·metadata·auth/lifecycle 등 추가 수정. 66파일에 걸쳐 있어 commit 통째 이식 금지 |
| 기록 | `c230c02` | C3의 CI·PC 인수와 미완료 gate를 문서화 |

[Actions 35706572465](https://github.com/parking-place/LyricsCloud/actions/runs/35706572465)의 원격 상태를 읽기 전용으로 확인했다. `0375825`에 대해 verify·Windows build·네 image publish가 success다. **annotated release tag 검사, 1.1.7a one-off 회귀, final candidate/sealed release contracts는 skipped**이며 정식 릴리스 gate 통과가 아니다.

[브랜치 runbook](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/docs/runbooks/1.1.8-web-stabilization.md)은 unit/integration 506 PASS·8 skip, beta DB 8 PASS, owner E2E 420 PASS·54 skip·0 flaky, release browser 10 PASS와 같은 SHA PC Docker 인수를 기록한다. 이번 비교에서는 그 수치를 재실행·로그 재집계하지 않았다. **최신 동일 SHA의 원격 개발 배포·공개 smoke는 문서상 미완료**이고 이전 `a7d8e45` 인수가 이를 대신하지 않는다. 물리 OS/IME/Google 로그인 완료·서명 등도 남아 있다. P4 review/P5 보류를 완료로 바꾸지 않는다.

## 0922 발견 22건의 차이

아래는 **원인 미변경 14 / 부분 대응 5 / 해결 후보 3**의 정적 비교다. 이 후보를 현재 코드에 적용하여 검증 완료한 항목은 **0건**이다. 브랜치 전체 CI 성공만으로 모든 0922 결함이 해결됐다고 보지 않는다.

| 0922 ID | 판정 | 원격 코드 근거·남은 범위 | 계획 소유 |
|---|---|---|---|
| `BE-01` | 미변경 | [packages/auth/src/oidc.ts:74](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/packages/auth/src/oidc.ts#L74) — 실패 Promise cache는 동일 blob. OAuth 왕복 뒤 만료 재검사는 별개다. | [1.2.3 P2](1.2.3/2phase.md) |
| `BE-02` | 미변경 | [apps/web/src/lib/page-auth.ts:9](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/lib/page-auth.ts#L9) — React request cache가 추가됐지만 resolveSession/renewed 조건과 cookie 갱신 불일치는 남는다. | [1.2.3 P2](1.2.3/2phase.md) |
| `BE-03` | 미변경 | [packages/database/src/public-lyric-sharing.ts:91](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/packages/database/src/public-lyric-sharing.ts#L91) — route/store 동일 blob. 상대 expiry를 절대 시각으로 매번 계산하는 hash 경계 유지. | [1.2.3 P3](1.2.3/3phase.md) |
| `BE-04` | 미변경 | [packages/domain/src/lifecycle-contract.ts:61](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/packages/domain/src/lifecycle-contract.ts#L61) — 삭제 영향 필드만 추가됐고 title.length > 200 조건은 유지. | [1.2.3 P3](1.2.3/3phase.md) |
| `ES-01` | 미변경 | [packages/editor/src/crdt.ts:138](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/packages/editor/src/crdt.ts#L138) — 태그 delete+reinsert와 raw occurrence 서버 거부 계약은 유지. projection 수렴 시험만으로 해소되지 않는다. | [1.2.2 P3](1.2.2/3phase.md) |
| `ES-02` | 해결 후보 | [packages/editor/src/crdt.ts:96](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/packages/editor/src/crdt.ts#L96) — C3 prefix/suffix 범위 치환·surrogate 보정과 crdt.test 동시/emoji/undo 회귀. 기준점 delta API와 모든 겹침/서버 인수는 미완료. | [1.2.2 P2](1.2.2/2phase.md) |
| `ES-03` | 부분 대응 | [apps/web/src/components/prompt-editor.tsx:163](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/prompt-editor.tsx#L163) — 문장형은 로컬 확정 뒤 queue 해제로 변경. 제목은 queued remote→오래된 제목 적용 순서가 남는다. 가사 ChangeSet mapping과 prompt를 혼동하지 않는다. | [1.2.2 P2](1.2.2/2phase.md) |
| `ES-04` | 해결 후보 | [apps/web/src/components/prompt-editor.tsx:217](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/prompt-editor.tsx#L217) — checkpoint 뒤 mode/plainText 재검사와 historical-sync E2E 후보. 양방향 변환·회수·unmount·연타·undo는 추가 인수. | [1.2.2 P4](1.2.2/4phase.md) |
| `ES-05` | 부분 대응 | [apps/web/src/components/rhyme-editor.tsx:335](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/rhyme-editor.tsx#L335) — 라임/prompt pending marker와 metadata 복구·guard 보강. 공통 registry 및 profile/PWA·전체 이탈 행렬은 남는다. | [1.2.1 P3](1.2.1/3phase.md) |
| `ES-06` | 미변경 | [packages/editor/src/browser-sync.ts:604](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/packages/editor/src/browser-sync.ts#L604) — selected/guest persist catch 뒤 pump·outbox 0→live 경계 유지. 새 guest revoke 테스트는 quota 실패 수용이 아니다. | [1.2.1 P2](1.2.1/2phase.md) |
| `ES-07` | 미변경 | [apps/web/src/components/shared-lyric-viewer.tsx:62](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/shared-lyric-viewer.tsx#L62) — shared viewer 동일 blob, write만으로 editable; 초기 transaction 거부와 callback 설치 간격 유지. | [1.2.1 P2](1.2.1/2phase.md) |
| `UI-01` | 부분 대응 | [apps/web/src/components/app-shell.tsx:113](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/app-shell.tsx#L113) — rail/tab/More/shortcut guarded client navigation. PWA는 data-pending-input만 보며 profile 등 전체 경계 인수 필요. | [1.2.1 P3](1.2.1/3phase.md) |
| `UI-02` | 부분 대응 | [apps/web/src/components/template-screen.tsx:43](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/template-screen.tsx#L43) — 형식별 raw draft와 locked radio 후보. type/target/selection 변경의 편집 폐기 보호는 남는다. | [1.2.2 P4](1.2.2/4phase.md) |
| `UI-03` | 부분 대응 | [apps/web/src/components/search-screen.tsx:42](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/search-screen.tsx#L42) — 곡/라임/prompt/search generation 후보. song-link-manager는 동일하며 오래된 query/type 응답 경쟁이 남는다. | [1.2.5 P2](1.2.5/2phase.md) |
| `UI-04` | 미변경 | [apps/web/src/components/template-screen.tsx:83](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/template-screen.tsx#L83) — source=user 복제 후 같은 source 목록 reload/insert가 없음. | [1.2.5 P3](1.2.5/3phase.md) |
| `UI-05` | 미변경 | [apps/web/src/components/template-screen.tsx:83](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/template-screen.tsx#L83) — duplicate/favorite/remove fetch rejection 처리 그대로. | [1.2.5 P3](1.2.5/3phase.md) |
| `UI-06` | 해결 후보 | [apps/web/src/components/search-screen.tsx:170](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/search-screen.tsx#L170) — grouped.flatMap 표시 순서와 keyboard ref index 공유. 실제 DOM/keyboard/AT와 삭제/추가 로딩 인수 필요. | [1.2.5 P3](1.2.5/3phase.md) |
| `UI-07` | 미변경 | [apps/web/src/components/quick-add.tsx:88](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/components/quick-add.tsx#L88) — quick-add 동일 blob. 오류가 modal sibling에 남으며 다른 dialog focus 개선과 별개. | [1.2.1 P3](1.2.1/3phase.md) |
| `UI-08` | 미변경 | [apps/web/src/app/styles.css:1535](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/app/styles.css#L1535) — editor toolbar 반응형 수정만 있으며 FAB fixed와 nav 문서 흐름의 공동 배치는 미해결. | [1.2.0 P2](1.2.0/2phase.md) |
| `OPS-01` | 미변경 | [infra/backup/backup.sh:29](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/infra/backup/backup.sh#L29) — backup 잠금 코드 동일. 환경 변수 검사 보강을 KILL 회복으로 세지 않는다. | [1.2.4 P2](1.2.4/2phase.md) |
| `OPS-02` | 미변경 | [apps/web/src/lib/request-security.ts:18](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/apps/web/src/lib/request-security.ts#L18) — IP header helper와 proxy 예시 동일. 실제 배포 신뢰 경계는 여전히 미확인. | [1.2.4 P3](1.2.4/3phase.md) |
| `OPS-03` | 미변경 | [infra/proxy/Caddyfile.example:7](https://github.com/parking-place/LyricsCloud/blob/c230c024aeb0297b1c130e3f3e8b507a43a7e871/infra/proxy/Caddyfile.example#L7) — proxy 본문 상한과 app multipart 계약 동일. | [1.2.4 P3](1.2.4/3phase.md) |

**ID 충돌 주의:** 원격 `historical-navigation-1.1.8.spec.ts`의 “UI-01 … accessible names”는 과거 rail 이름 결함이다. 0922 UI-01 프로필 이탈 손실의 검증으로 연결하지 않는다. source 날짜·문서+ID를 함께 기록한다.

## 재사용할 웹 수정 후보와 실제 작업 연결

WC ID는 이번 비교의 선택 인수 단위이며 신규 확정 결함 수가 아니다. 각 항목은 source 함수·타입·소비 UI·회귀를 함께 인수하고 원격 코드가 있다는 사실과 현재 후보 PASS를 구별한다. 원격 신규 파일 경로의 축약 이름은 해당 branch tree에서 확인하며 현재 파일이 있다고 가정하지 않는다.

| 후보 | 원격 변경·의존 파일 | 적용 작업·남은 수용 |
|---|---|---|
| `WC-01` metadata 초안·늦은 ACK·계정별 복구 | metadata-draft.ts, lyric-editor.tsx, rhyme-editor.tsx, account-cache.ts | [1.2.1 P2](1.2.1/2phase.md) `LC-RD-121-P2-01`. owner/kind/document/revision별 보관, offline 닫기→재진입·명시 복원·quota·계정 전환·다른 탭 revision/새 입력을 늦은 ACK가 지우지 않는지 확인한다. |
| `WC-02` 자동 저장 timer·가사/공유 IME ChangeSet | autosave.ts, browser-sync.ts, autosave.test.ts, lyric-sync.spec.ts | [1.2.2 P2](1.2.2/2phase.md) `LC-RD-122-P2-05`. 조합 중 timer/flush/retry/dispose가 preedit를 확정 저장하지 않고 remote 내부 삽입·local undo가 보존되는지 확인한다. prompt 제목 잔존 문제와 별도 경로로 인수한다. |
| `WC-03` guarded client navigation·shortcut | app-shell.tsx, shortcut-runtime.ts, pwa-shell-stabilization.test.ts | [1.2.1 P3](1.2.1/3phase.md) `LC-RD-121-P3-03`. 동일 URL no-op·modified click·editor veto를 유지하며 await 뒤 pending 상태를 재확인한다. profile/PWA·back/reload와 page-local 링크까지 누락 경계를 마무리한다. |
| `WC-04` 전역·가사 표시 설정 저장 응답 경쟁 | settings-screen.tsx, lyric-display-settings.tsx, settings-save-race.spec.ts, lyric-display-settings-race.spec.ts | [1.2.1 P3](1.2.1/3phase.md) `LC-RD-121-P3-02`. 제출 snapshot만 ACK하고 대기 중 새 draft/default/theme preview를 유지한다. reset conflict retry는 DELETE 의미와 최신 rowVersion을 보존한다. |
| `WC-05` Suno 수동 workspace 초안·생성 재시도 | suno-workspace-panel.tsx, song-dashboard.tsx, songs/[songId]/page.tsx, account-cache.ts | [1.2.1 P3](1.2.1/3phase.md) `LC-RD-121-P3-01`. owner namespace·legacy key 정리·동기 in-flight lock·응답 뒤 계속 입력 보존·ACK된 생성의 edit 전환을 한 묶음으로 검사한다. 자동 metadata 수집은 포함하지 않는다. |
| `WC-06` prompt 부분 치환·IME 순서·변환 재검사 | crdt.ts, prompt-editor.tsx, crdt.test.ts, historical-sync-1.1.8.spec.ts | [1.2.2 P2](1.2.2/2phase.md) `LC-RD-122-P2-01`은 ES-02/03, [P4](1.2.2/4phase.md) `LC-RD-122-P4-01`은 ES-04 담당. ES-02/04 후보를 재사용하되 ES-03 제목, 치환 구간 내부 remote, 복수 update·실제 OS IME·변환 권한/undo 잔여를 인수한다. |
| `WC-07` 목록 응답 세대·검색 표시/키보드 순서 | song/rhyme/prompt-list-screen.tsx, search-screen.tsx, list-response-races.test.ts | [1.2.5 P2](1.2.5/2phase.md) `LC-RD-125-P2-01`. 4화면 후보와 회귀를 선별한다. song-link-manager까지 확대하고 items/count/cursor/filterOptions/orderVersion/loading/error가 최신 query 소유인지 확인한다. |
| `WC-08` 목록 metadata·favorite·최근 검색·수동 순서 경쟁 | song-list-screen.tsx, favorites-screen.tsx, search-screen.tsx, library-order-controls.tsx, database/rhymes.ts | [1.2.5 P3](1.2.5/3phase.md) `LC-RD-125-P3-05`. 서로 다른 필드/항목의 성공을 실패 rollback이 덮지 않고 빠른 반전·동시 삭제/clear·오래된 move 실패를 처리한다. 비manual view anchor와 duplicate의 lock 순서/replay를 실제 DB로 검사한다. |
| `WC-09` 템플릿 형식별 원문 draft | template-screen.tsx, historical-ui-1.1.8.test.ts | [1.2.2 P4](1.2.2/4phase.md) `LC-RD-122-P4-03`. 형식 왕복 원문과 locked fieldset을 인수하되 type/target/selection 전환 보호·UI-04/05는 별도로 구현한다. |
| `WC-10` 곡 부분 저장·가사 복제 응답 유실 | song-form.tsx, lyric-editor.tsx, historical-ui-1.1.8.test.ts, historical-editor-1.1.8.spec.ts | [1.2.6 P2](1.2.6/2phase.md) `LC-RD-126-P2-02`. 곡 다단계 저장의 성공 필드/미완료를 구별하고 새 입력을 보존한다. 가사 duplicate는 checkpoint 전 lock·동일 requestId replay·대기 중 metadata 변경 시 중단을 확인한다. |
| `WC-11` 중첩 modal·도구막대·preview·복사 | dialog-focus.ts, styles.css, prompt-editor.tsx, editor/copy.ts, editor-responsive-toolbar.spec.ts | [1.2.6 P3](1.2.6/3phase.md) `LC-RD-126-P3-05`. Escape가 최상단만 닫고 touch focus가 복귀하며 도구가 잘리지 않는지 코발트에서 확인한다. Extend 공백 marker·원문/선택 copy와 preview 설정 회귀를 유지한다. UI-07/08 해결로 간주하지 않는다. |
| `WC-12` Service Worker 다중 build·명시 업데이트 | public/sw.js, pwa-manager.tsx, service-worker.test.ts, pwa-shell-stabilization.test.ts | [1.2.8 P4](1.2.8/4phase.md) `LC-RD-128-P4-01`. 1.2.0 P1/P4에서 먼저 보존 gate로 인수한다. 구 탭 lazy chunk·unknown client/worker restart·탭별 승인·offline activation·private/no-store/Set-Cookie 배제·중복 fetch를 검사한다. 1.2.1 guard가 reload를 소비한다. |
| `WC-13` OAuth/DB 잠금 뒤 만료·beta index key 방어 | auth/service.ts, database/beta-signup.ts, database/beta-access.ts, beta-signup.integration.test.ts | [1.2.3 P2](1.2.3/2phase.md) `LC-RD-123-P2-05`. provider 왕복과 intent/code/identity lock 뒤 live clock을 확인해 만료 시 session/grant/code 소비가 남지 않는지 시험한다. 다른 kid와 동일 kid bytes 변경의 운영 제약·tombstone을 유지하고 BE-01/02와 구별한다. |
| `WC-14` 협업 projection 재시도 공정성 | collaboration/server.ts, store.ts, store.integration.test.ts | [1.2.4 P4](1.2.4/4phase.md) `LC-RD-124-P4-05`. 지속 실패 20개 뒤 정상 문서가 굶지 않는 keyset/wrap·trash 제외·timer 재진입 방지·Y.Doc cleanup·timestamp/오류 marker 보존을 검사한다. worker purge M-04 완료와 구별한다. |
| `WC-15` guest 회수 뒤 서버 상태·authoredText 분리 | browser-sync.ts, public-guest-sync.test.ts, new-feature-1.1.3.spec.ts | [1.2.7 P2](1.2.7/2phase.md) `LC-RD-127-P2-05`. 회수/epoch-stale 시 서버 수용 body/cache로 복귀하고 작성 원문만 복구함에 둔다. 재연결·재허용 뒤 거절 입력 자동 재생이 없으며 ES-06 실패 보관과 충돌하지 않는지 실제 WS/DB로 인수한다. |
| `WC-16` export v1 검증·휴지통 결과·삭제 영향 | export-contract.ts, database/export.ts, lifecycle.ts, lifecycle-contract.ts, trash-screen.tsx, trash-refresh-result.spec.ts | [1.2.7 P3](1.2.7/3phase.md) `LC-RD-127-P3-04`. 과거 v1 사진 필드 부재·새 Suno/photo 참조·owner 격리와 실제 export→validator를 검사한다. mutation 성공/refresh 실패를 분리하고 deletion batch 복원 수와 전체 cascade 자식 수를 구별한다. BE-04는 별도다. |
| `WC-17` 환경 값·allowlist 날짜 도구 | check-environment.mjs, provision-auth-allowlist-keys.mjs, hmac-allowlist.mjs | [1.2.4 P1](1.2.4/1phase.md) `LC-RD-124-P1-05`. 제공된 optional env의 안전 정수/공백·backup 값과 offset deadline의 ISO UTC 정규화를 인수한다. import-safe main guard/test를 함께 가져오며 실제 secret/keyring을 복사하거나 회전하지 않는다. |
| `WC-18` 엄격한 release tag gate·build 설정 | .github/workflows/ci.yml, p6-historical-release-tag-gate.mjs, next.config.ts | [1.2.8 P3](1.2.8/3phase.md) `LC-RD-128-P3-03`. annotated release gate와 fileURLToPath 의도를 검토하되 windows-native needs/assertion·1.1.8 build ID와 분리한다. native 재개 없이 같은 정책 의미를 유지하고 1.2.0 P1 metadata/6 Phase 지원을 재사용한다. |

WC-12의 서비스워커 자산 수명과 WC-02 입력 보존, WC-03/11 탐색·focus는 **1.2.0 전환 전 보존 gate**에서도 인수한다. 1.2.8 소유는 잔여 검증/구조 개선이며 기존 탭 파손이나 입력 유실을 뒤 버전까지 허용하는 배정이 아니다. 각 후속 계획에서 선해결된 코드는 재구현하지 않는다.

## 디자인·UX·운영 제안 비교

| 범위 | 원격 변화 | 계획 반영 |
|---|---|---|
| D-01/02/03/06/08/09/11/14 | 핵심 제안 미변경 | 홈/프로필/깊은 복귀/연결 tabs/quick-add/인증·토큰 책임 계획 유지 |
| D-04/05/07/12/13 | 관련 상태 경쟁·초안·dialog/toolbar 일부 개선 | sheet 명시 저장·목록 정보 위계·mobile preview·skip link/landmark·전체 문구/타이포는 잔여 |
| D-10 | mutation 성공과 refresh 실패 분리 후보·전용 E2E | WC-16을 1.2.7 P3에서 채택 후 재검증 |
| UX-03/04/06/11/12/15/20/21/22/24 | 위 WC 후보로 일부 개선 | 사용자 여정 전체 성공·이해도는 미측정. 연결된 원인과 남은 과제 인수 |
| UX-07/08/10/18/19 | 편집/guest 일부 후보; ES-01/06/07 핵심 미해결 | UI 문구·가사 경로 수정으로 prompt/selected 저장 준비 문제를 닫지 않음 |
| UX-01/02/05/09/13/14/16/17/23 | 해당 여정 전체의 해결 증거 없음 | 1.2.3/6/7 계약·사용성 과제 유지 |
| OPS-01~03, M-04/05 | backup/proxy/worker/health 구현 미변경 | 1.2.4 유지; 협업 projection WC-14는 worker purge와 별개 |
| M-01/02/03/06/07/08/09/10 | 테스트·목록 계약 일부 보강; 구조/의미 lint/metadata 통합 미완료 | M-09 후보 인수, M-08 원인 회귀 재사용, 나머지는 1.2.0/8 잔여만 |

## 통째 병합을 피할 의존성과 보류 경계

1. `apps/windows/**`, native auth/store·17 API route·native session/schema·1150 migration이 포함된다. `auth-context.ts` 전체 복사는 NativeAuthService/PostgresNativeAuthStore를 일반 웹 context에 끌어온다. 웹 수정에 필요하다고 확인되지 않은 native 항목은 인수 목록에서 제외한다.
2. CI publish가 `[verify, windows-native]`에 의존하고 일부 gate 회귀가 그 문자열과 결합된다. policy 의미를 유지한 채 웹 branch 의존으로 재구성하며 필수 검사를 삭제해서 통과시키지 않는다.
3. package·runtime·production validator·Compose·Next build ID·Playwright·CI의 1.1.8/p4 값은 현재 계획의 실제 실행 metadata로 다시 맞춰야 한다. 기능 후보와 버전 전환을 분리한다.
4. 원격 `config/migrations.1.1.8.json`은 latestSchema1150이며 1151을 열거하지 않지만 실제 runtime/PC 기록은1151이다. 이 역사 manifest를 그대로 통합 후보에 쓰지 않는다. native1150은 최신 schema 문자열1151 뒤에 숨을 수 있으므로 migration 파일 목록 자체를 대조한다. 기존 이력 재번호화는 금지다.
5. 원격 STATUS는 1.1.8 review이며 현재 계획/코발트 목업보다 이전 계열이다. 문서 전체를 복사해 1.2.0 우선순위·native 보류·현재 1.1.7a 실행 이력을 되돌리지 않는다.

## 실제 통합 절차와 중단 조건

1. 1.2.0 P1에서 C1~C3/WC 목록과 최신 remote SHA를 확인하고, 필요한 release blocker의 범위/담당/소비 Phase를 PLAN-CHANGE에 기록한다.
2. 각 WC별 최소 코드·타입·호출자·fixture의 의존표를 만든다. native·version·migration·권한·저장 포맷이 섞이면 의미 단위로 분리하며 기계적인 전체 merge/cherry-pick을 하지 않는다.
3. 코발트 셸에 **동작 계약**을 옮긴다. 이전 B1 JSX/CSS 전체 복사나 snapshot 일괄 수용으로 리디자인을 덮지 않는다.
4. 0922 원래 실패 입력과 원격 신규 회귀를 새 통합 SHA에서 확인한다. ES-03 제목, song-link-manager, profile/PWA, UI-04/05/07/08, OPS 미변경 경계는 명시적으로 남긴다.
5. 실제 Phase 완료는 새 source SHA의 필수 CI·image·동일 SHA 개발 배포·공개 smoke로 인수한다. 원격 C3 성공을 포팅 후보 PASS로 승계하지 않는다. 제품 적용은 아직 수행하지 않았다.
6. 실패하면 기능별 port commit을 되돌리고 초안/outbox·계정 namespace·raw/projection·기존 migration 이력을 유지한다. native 의존을 제거하다 권한/저장 계약을 깨면 범위를 다시 정한다. 필요한 계약/실기기/외부 gate가 없으면 review로 남긴다.
