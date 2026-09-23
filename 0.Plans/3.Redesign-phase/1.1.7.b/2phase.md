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
