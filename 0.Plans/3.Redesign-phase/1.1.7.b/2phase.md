# 1.1.7b Phase 2 — 편집·저장·탐색·PWA 웹 코드 통합

**상태: 착수 (`in_progress`)**. P1 기능 SHA `a04bbcb6358aa1682e57fb48491e53be3f87f5d1`의 인수를 기반으로 WC-01~06/09/10(가사)/12를 통합한다. P2 코드·검증·개발 인수는 아직 미완료다. [수용 기준](ACCEPTANCE.md) · [통합 맵](SOURCE-MAP.md) · [차단 목록](BLOCKERS.md).

## 목표·진입

작성 중 입력과 이전 탭을 보존하는 원격 수정 및 회귀를 기존 화면에 통합한다.

선행: [P1](1phase.md)의 실제 인수 SHA·실행/미실행 기록. 실제 착수 전에 실행 STATUS에 담당·시작 시각·작업 ID·source SHA·수정 경로를 등록하고 미커밋 변경과 다른 작업자의 결과를 보존한다. 현재 문서는 실제 착수나 완료 기록이 아니다.

## 작업

- [ ] `LC-RD-117B-P2-01` WC-01 metadata 초안을 owner/kind/document/revision별로 통합한다. lyric/rhyme 제목·메모의 늦은 ACK가 새 입력/다른 탭 revision을 삭제하지 않는지와 offline 종료→재진입·명시 복원·quota·계정 전환을 검사한다.
- [ ] `LC-RD-117B-P2-02` WC-02 autosave timer와 가사/selected/guest ChangeSet 보존 수정을 함께 인수한다. composition 시작·flush/retry/dispose의 preedit 확정 금지와 치환 범위 내부 remote 삽입·local undo를 검사하며 prompt 경로까지 해결됐다고 확장하지 않는다.
- [ ] `LC-RD-117B-P2-03` WC-06 중 prompt 부분 범위 치환·surrogate 경계·문장형 IME 순서 후보를 통합한다. ES-03 제목 잔존과 기준점/겹침 연산 한계를 분리 기록하고 원래 실패 입력·복수 update·undo/재연결 회귀를 유지한다.
- [ ] `LC-RD-117B-P2-04` WC-06 checkpoint 이후 source 재검사와 WC-09 형식별 template raw draft/locked fieldset을 함께 인수한다. stale preview·확인 연타·권한 종료·unmount·변환 undo와 type/target/selection 이탈 잔여를 별도 판정한다.
- [ ] `LC-RD-117B-P2-05` WC-03 guarded client navigation·shortcut·같은 URL no-op·modified click·await 뒤 pending 재검사를 기존 셸에 통합한다. profile/PWA·back/reload·page-local 링크의 누락을 추적하고 필요 최소 보호를 보완한다.
- [ ] `LC-RD-117B-P2-06` WC-04 전역/문서별 표시 설정의 제출 snapshot ACK·현재 draft/default/theme 유지와 reset conflict의 DELETE/rowVersion 의미를 인수한다. 늦은 응답이 이후 입력을 덮지 않는지 실제 브라우저로 확인한다.
- [ ] `LC-RD-117B-P2-07` WC-05 Suno 수동 workspace 초안의 owner namespace·legacy key 정리·동기 in-flight lock·생성 ACK 뒤 edit 전환을 dashboard의 owner 전달까지 통합한다. 원격 metadata 자동 수집은 포함하지 않는다.
- [ ] `LC-RD-117B-P2-08` WC-10의 가사 복제 부분을 인수한다. checkpoint 전 command lock·응답 유실 뒤 같은 requestId·기다리는 동안 metadata 변경 시 중단을 검사하고 곡 다단계 저장은 P3에 넘긴다.
- [ ] `LC-RD-117B-P2-09` WC-12 서비스워커/PWA의 구 build cache·lazy chunk·unknown client/worker restart·탭별 명시 update를 함께 통합한다. private/no-store/Set-Cookie 응답 제외·중복 fetch·offline activation과 미전송 입력의 reload 차단을 확인한다.

## 책임 경로·산출물

packages/editor, web editor/metadata-draft/account-cache/app-shell/settings/Suno/PWA, public/sw.js 및 대응 tests. 현재/원격 경로는 SOURCE-MAP과 실제 착수 SHA에서 확인한다. 공유 파일은 한 작성자가 담당하고 새 파일/타입을 가져올 때 호출자와 회귀 시험을 함께 검토한다.

산출물에는 작업별 원본 commit → 채택 변경 → 현재 후보 SHA를 연결하고, 변경 파일·계약·테스트 입력/결과·제외 사유·미실행·다음 담당을 기록한다. raw 로그·실제 창작물·token·서버 비밀은 공개 문서에 넣지 않는다.

## 검증·실패 조건

AC-RD-117B-01~06/09/10(가사)/12. 새 함수·회귀만 복사하지 말고 실제 UI→저장/서버 호출자까지 같은 후보로 확인한다.

실제 함수 fixture·HTTP/DB·브라우저·물리 기기/AT·공개 개발 smoke의 검증 수준을 구별한다. 원격 0375825의 성공은 선행 증거이며 새 b tree의 PASS가 아니다. 테스트는 실제 경계의 수정 전 실패 → 수정 후 성공을 확인하며, 통과를 위해 검사를 삭제하거나 완화하지 않는다.

## 완료·중단·되돌림

[Agent](../../../Agent.md)와 [품질 gate](../QUALITY-GATES.md)의 각 Phase 완료 절차를 적용한다. 필수 CI·동일 SHA 개발 인수 전에는 완료 체크를 하지 않는다. 해당 Phase의 필수 검사 미실행, 새로 도입하거나 악화한 원문 손실·거짓 저장·권한/복구 위반은 `review`로 두고 다음 Phase로 넘기지 않는다. P1에 등록한 기존 차단은 담당 수정 Phase와 인수 조건을 명시해 추적한다. 전체 잔여를 확인하는 P4/P5에서는 필수 차단이 모두 해소되어야 하며 1.2.0으로 넘기지 않는다. 중간 개발 인수가 정식 사용자 공개 승인을 뜻하지 않으며, 기존 위험의 노출을 통제할 수 없으면 앞 단계에서도 중단한다.

되돌림은 [수용표의 환경별 절차](ACCEPTANCE.md)를 따른다. native 1150 down/drop·기존 migration 재작성·초안/outbox 삭제·a 태그 이동은 금지한다. 제품 동작을 바꾸지 않은 문서 수정은 문서 검증으로 기록한다.

다음: [P3](3phase.md).

## 2026-09-23 착수 기록

- 담당 Codex, 작업 `LC-RD-117B-P2-01~09`. 기준은 P1 기능 SHA `a04bbcb6358aa1682e57fb48491e53be3f87f5d1`과 문서 인수 commit이며, source head `c230c024aeb0297b1c130e3f3e8b507a43a7e871`/기능 `0375825fe004fc74869250eefa14add267c4b3ae`를 재확인한다.
- 책임 경로는 packages/editor, web editor/metadata-draft/account-cache/app-shell/settings/Suno/PWA, `public/sw.js`와 대응 시험이다. 기존 보호 계획 자료·native 1150·원격 운영 서버는 수정 대상이 아니다.
- 현재는 P1 증거를 인수한 상태일 뿐 P2 수용을 PASS로 주장하지 않는다. 구현 전 worktree/remote source 이동과 실제 의존 파일을 다시 확인한다.

## 2026-09-23 로컬 통합 후보 — 원격 인수 전

- `phase/1.1.7b-p2-editing-save-pwa`는 P1 문서 인수 commit `cad03d5191ad3fedb91d913ee1eb16ae4b683481`에서 분기했다. 1.1.8 source 기능 SHA `0375825fe004fc74869250eefa14add267c4b3ae`의 WC-01/02/03/04/05/06/09/10(가사)/12 경로를 선택적으로 통합했다. source head `c230c024aeb0297b1c130e3f3e8b507a43a7e871`는 재조회에서도 그대로다. 1.1.8 native·버전·migration, WC-08 목록 경쟁, WC-10 곡 부분 저장, WC-15 guest 권한 회수와 UI 접근성 정리는 P2에 섞지 않았다.
- P2 최소 보정은 프롬프트 제목의 queued remote/IME 병합(`ES-03`), PWA 갱신에서 프로필 미저장 상태 차단이다. 둘 다 source C3의 단순 복사가 아니라 b 후보에서 추가한 수정이다. 제목은 조합 시작 원문과 확정 범위를 기준으로 원격 삽입을 매핑하며, 가사/공유/guest ChangeSet 경로와 같은 순서 계약을 사용한다.
- Docker Node 24.20.0/pnpm 11.25.0의 `pnpm check`와 production web build PASS. 전체 일반 Unit **326 PASS / DB 조건부 122 skip**, 새 관련 fixture/단위와 서비스워커·Suno·템플릿 경계를 포함한다. 격리 PostgreSQL 18의 현재 웹 migration 적용 후 관련 display/Suno/prompt/lyric DB **19 PASS**다. Docker에는 Git metadata가 없어 버전 shell guard 단독 시험 1건이 실패했지만, 실제 Git checkout에서 동일 4건 PASS; 컨테이너 실패를 PASS로 소급하지 않는다.
- 격리 DB와 production build를 쓰는 Chromium desktop P2 브라우저 **9 PASS**, mobile **8 PASS / desktop-only PWA 1 skip**. offline metadata 복구·응답 유실 duplicate·client navigation/history·두 build 캐시·문장/제목 IME·표시/전역 설정 지연 ACK를 포함한다. 기존 Suno 재진입과 템플릿 저장 잠금 desktop **2 PASS**를 별도로 확인했다. Linux Chromium 대리 결과이지 실제 OS 한글 IME·물리 기기/AT 증거가 아니다.
- 현재 결과는 **로컬 후보**다. source 전체 잔여 원인, P2 후보의 필수 원격 CI PASS·네 signed dev image·동일 SHA 개발 서버/public smoke는 아직 없다. 해당 gate 전에는 위 작업 체크박스와 실행 STATUS를 완료로 바꾸지 않는다. 기존 `BE/ES/UI/OPS` 개별 최종 판정은 P4 책임이고, P2의 알려진 잔여는 차단 목록에서 open으로 계속 추적한다.

## 2026-09-23 전체 브라우저 회귀 보정 — 재검증 중

- 첫 원격 후보 `e5dea948113f4771f7cf24755cf9613e7dbcaf50`는 [PR #154](https://github.com/parking-place/LyricsCloud/pull/154)에 push했다. 로컬 전체 Chromium 454항목은 **406 PASS / 44 skip / 4 FAIL**이었다. 실패는 복구본 복사 형식의 옛 기대값 PC·mobile 2건과 P2 PWA 연결 상태 안내가 반영되지 않은 mobile 셸·템플릿 시각 기준 2건이다. 첫 후보의 PR Actions `35857173854`와 push Actions `35857139787`는 실패 확인 뒤 취소했으며 PASS나 image 발행 근거가 아니다.
- 복구본 검사는 현재 제목·본문·메모를 포함하는 정확한 JSON을 비교하게 보정했다. 모바일 시각 기준 2장은 변경된 연결 상태 안내만 확인하고 새 이미지로 갱신했으며, 허용 픽셀 비율은 변경하지 않았다. 집중 PC·mobile 6건 PASS 뒤 두 번째 로컬 전체 검사는 **409 PASS / 44 skip / 1 FAIL**이었다.
- 마지막 1건은 삭제된 가사의 라임 삽입에서 서버 검증 전 동기화가 먼저 실패하면 안전한 일반 안내가 나오는 경로다. 삭제 판정과 동기화 실패의 두 정확한 안내를 구별하고, 복구 원문이 정확하며 삭제된 가사에 삽입되지 않음을 추가 검사했다. 수정된 경계 10회 반복 PASS. 최종 로컬 Chromium **410 PASS / 44 skip / 0 FAIL**(무재시도, 15.1분), `CI=true` 영향 집중 **7 PASS / desktop-only 1 skip**, 수정 후 Docker `pnpm check`와 production web build PASS. 새 SHA의 원격 필수 CI·signed image·개발 공개 인수는 아직 미완료이며 P2 완료로 기록하지 않는다.
- 후보 `c9e0cb4189a11311918f50753832d584eb68304f`의 PR Actions `35862852788`은 **409 PASS / 44 skip / 1 FAIL**로 종료했다. 모바일 즐겨찾기 빈 상태의 옛 시각 기준은 P2 PWA 연결 안내 때문에 CI에서 픽셀 차이 7%로 허용 6%를 넘었고 재시도도 실패했다. 같은 SHA의 push Actions `35862846539` attempt 1은 저장 성능 p95 9.05ms·오류 0이지만 라운드 변동률 112.696%가 허용 75%를 넘어 FAIL; attempt 2는 성능을 통과했으나 PR 시각 실패 확인 뒤 E2E 중 취소했다. 실패/취소를 PASS나 image 발행으로 소급하지 않는다.
- 모바일 최근 작업·즐겨찾기·검색 로딩/빈/오류 기준 5장을 PWA 안내가 있는 현행 화면으로 강제 재생성해 각각 시각 확인했다. 스냅샷 허용 비율과 제품 UI는 바꾸지 않았고 `CI=true` 탐색 집중 desktop/mobile **2 PASS**다. 최종 로컬 전체 410 PASS는 제품 코드가 같은 직전 SHA의 증거이며, 새 스냅샷 SHA의 원격 필수 검사·image·개발 인수는 여전히 미완료다.
