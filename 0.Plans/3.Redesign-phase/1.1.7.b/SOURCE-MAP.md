# 1.1.7b 웹 수정 통합 맵

[원격 정적 비교](../BRANCH-COMPARISON-118-P4.md)의 source SHA와 22개 원인 판정은 보존한다. 2026-09-23 사용자 지시로 **18 WC의 최초 코드 통합은 이 b 계획이 담당**한다. 기존 1.2.x 작업 ID는 잔여 보정·확장 수용·코발트 전환 회귀에 유지한다. 아래 표는 계획상 소유권이며 실제 진행은 하단의 P1/P2 SHA별 기록을 따른다.

## 후보별 최초 통합과 후속

| 후보 | 포함할 동작·회귀 | 1.1.7b 작업 | 이후 담당/잔여 |
|---|---|---|---|
| `WC-01` metadata 초안·늦은 ACK·계정별 복구 | owner/kind/document/revision별 보관, offline 닫기→재진입·명시 복원·quota·계정 전환·다른 탭 revision/새 입력을 늦은 ACK가 지우지 않는지 확인한다. | [P2](2phase.md) `LC-RD-117B-P2-01` | [1.2.1 P2](../1.2.1/2phase.md) `LC-RD-121-P2-01`: b 증거 인수 후 잔여만 |
| `WC-02` 자동 저장 timer·가사/공유 IME ChangeSet | 조합 중 timer/flush/retry/dispose가 preedit를 확정 저장하지 않고 remote 내부 삽입·local undo가 보존되는지 확인한다. prompt 제목 잔존 문제와 별도 경로로 인수한다. | [P2](2phase.md) `LC-RD-117B-P2-02` | [1.2.2 P2](../1.2.2/2phase.md) `LC-RD-122-P2-05`: b 증거 인수 후 잔여만 |
| `WC-03` guarded client navigation·shortcut | 동일 URL no-op·modified click·editor veto를 유지하며 await 뒤 pending 상태를 재확인한다. profile/PWA·back/reload와 page-local 링크까지 누락 경계를 마무리한다. | [P2](2phase.md) `LC-RD-117B-P2-05` | [1.2.1 P3](../1.2.1/3phase.md) `LC-RD-121-P3-03`: b 증거 인수 후 잔여만 |
| `WC-04` 전역·가사 표시 설정 저장 응답 경쟁 | 제출 snapshot만 ACK하고 대기 중 새 draft/default/theme preview를 유지한다. reset conflict retry는 DELETE 의미와 최신 rowVersion을 보존한다. | [P2](2phase.md) `LC-RD-117B-P2-06` | [1.2.1 P3](../1.2.1/3phase.md) `LC-RD-121-P3-02`: b 증거 인수 후 잔여만 |
| `WC-05` Suno 수동 workspace 초안·생성 재시도 | owner namespace·legacy key 정리·동기 in-flight lock·응답 뒤 계속 입력 보존·ACK된 생성의 edit 전환을 한 묶음으로 검사한다. 자동 metadata 수집은 포함하지 않는다. | [P2](2phase.md) `LC-RD-117B-P2-07` | [1.2.1 P3](../1.2.1/3phase.md) `LC-RD-121-P3-01`: b 증거 인수 후 잔여만 |
| `WC-06` prompt 부분 치환·IME 순서·변환 재검사 | ES-02/04 후보를 재사용하되 ES-03 제목, 치환 구간 내부 remote, 복수 update·실제 OS IME·변환 권한/undo 잔여를 인수한다. | [P2](2phase.md) `LC-RD-117B-P2-03`; [P2](2phase.md) `LC-RD-117B-P2-04` | [1.2.2 P2](../1.2.2/2phase.md) `LC-RD-122-P2-01`; [1.2.2 P4](../1.2.2/4phase.md) `LC-RD-122-P4-01`: b 증거 인수 후 잔여만 |
| `WC-07` 목록 응답 세대·검색 표시/키보드 순서 | 4화면 후보와 회귀를 선별한다. items/count/cursor/filterOptions/orderVersion/loading/error가 최신 query 소유인지 확인한다. 미변경 song-link-manager는 UI-03 잔여로 판정하고 1.2.5의 확대 범위와 연결한다. | [P3](3phase.md) `LC-RD-117B-P3-01` | [1.2.5 P2](../1.2.5/2phase.md) `LC-RD-125-P2-01`: b 증거 인수 후 잔여만 |
| `WC-08` 목록 metadata·favorite·최근 검색·수동 순서 경쟁 | 서로 다른 필드/항목의 성공을 실패 rollback이 덮지 않고 빠른 반전·동시 삭제/clear·오래된 move 실패를 처리한다. 비manual view anchor와 duplicate의 lock 순서/replay를 실제 DB로 검사한다. | [P3](3phase.md) `LC-RD-117B-P3-02` | [1.2.5 P3](../1.2.5/3phase.md) `LC-RD-125-P3-05`: b 증거 인수 후 잔여만 |
| `WC-09` 템플릿 형식별 원문 draft | 형식 왕복 원문과 locked fieldset을 인수하되 type/target/selection 이탈의 입력 손실은 b에서 차단한다. UI-04/05 전체 UX는 1.2.5의 별도 범위다. | [P2](2phase.md) `LC-RD-117B-P2-04` | [1.2.2 P4](../1.2.2/4phase.md) `LC-RD-122-P4-03`: b 증거 인수 후 잔여만 |
| `WC-10` 곡 부분 저장·가사 복제 응답 유실 | 곡 다단계 저장의 성공 필드/미완료를 구별하고 새 입력을 보존한다. 가사 duplicate는 checkpoint 전 lock·동일 requestId replay·대기 중 metadata 변경 시 중단을 확인한다. | [P2](2phase.md) `LC-RD-117B-P2-08`; [P3](3phase.md) `LC-RD-117B-P3-03` | [1.2.6 P2](../1.2.6/2phase.md) `LC-RD-126-P2-02`: b 증거 인수 후 잔여만 |
| `WC-11` 중첩 modal·도구막대·preview·복사 | Escape가 최상단만 닫고 touch focus가 복귀하며 도구가 잘리지 않는지 현행 B1/classic에서 확인하고 1.2.0에 전환 회귀를 넘긴다. Extend 공백 marker·원문/선택 copy와 preview 설정 회귀를 유지한다. UI-07/08 해결로 간주하지 않는다. | [P3](3phase.md) `LC-RD-117B-P3-04` | [1.2.6 P3](../1.2.6/3phase.md) `LC-RD-126-P3-05`: b 증거 인수 후 잔여만 |
| `WC-12` Service Worker 다중 build·명시 업데이트 | b P2/P4에서 먼저 인수하고 1.2.0은 전환 회귀를 담당한다. 구 탭 lazy chunk·unknown client/worker restart·탭별 승인·offline activation·private/no-store/Set-Cookie 배제·중복 fetch를 검사한다. b의 guard가 미전송 입력이 있는 reload를 먼저 차단하고, 1.2.1은 확장 상태 계약과 잔여 경계를 담당한다. | [P2](2phase.md) `LC-RD-117B-P2-09` | [1.2.8 P4](../1.2.8/4phase.md) `LC-RD-128-P4-01`: b 증거 인수 후 잔여만 |
| `WC-13` OAuth/DB 잠금 뒤 만료·beta index key 방어 | provider 왕복과 intent/code/identity lock 뒤 live clock을 확인해 만료 시 session/grant/code 소비가 남지 않는지 시험한다. 다른 kid와 동일 kid bytes 변경의 운영 제약·tombstone을 유지하고 BE-01/02와 구별한다. | [P3](3phase.md) `LC-RD-117B-P3-05` | [1.2.3 P2](../1.2.3/2phase.md) `LC-RD-123-P2-05`: b 증거 인수 후 잔여만 |
| `WC-14` 협업 projection 재시도 공정성 | 지속 실패 20개 뒤 정상 문서가 굶지 않는 keyset/wrap·trash 제외·timer 재진입 방지·Y.Doc cleanup·timestamp/오류 marker 보존을 검사한다. worker purge M-04 완료와 구별한다. | [P3](3phase.md) `LC-RD-117B-P3-06` | [1.2.4 P4](../1.2.4/4phase.md) `LC-RD-124-P4-05`: b 증거 인수 후 잔여만 |
| `WC-15` guest 회수 뒤 서버 상태·authoredText 분리 | 회수/epoch-stale 시 서버 수용 body/cache로 복귀하고 작성 원문만 복구함에 둔다. 재연결·재허용 뒤 거절 입력 자동 재생이 없으며 ES-06 실패 보관과 충돌하지 않는지 실제 WS/DB로 인수한다. | [P3](3phase.md) `LC-RD-117B-P3-07` | [1.2.7 P2](../1.2.7/2phase.md) `LC-RD-127-P2-05`: b 증거 인수 후 잔여만 |
| `WC-16` export v1 검증·휴지통 결과·삭제 영향 | 과거 v1 사진 필드 부재·새 Suno/photo 참조·owner 격리와 실제 export→validator를 검사한다. mutation 성공/refresh 실패를 분리하고 deletion batch 복원 수와 전체 cascade 자식 수를 구별한다. BE-04는 별도다. | [P3](3phase.md) `LC-RD-117B-P3-08` | [1.2.7 P3](../1.2.7/3phase.md) `LC-RD-127-P3-04`: b 증거 인수 후 잔여만 |
| `WC-17` 환경 값·allowlist 날짜 도구 | 제공된 optional env의 안전 정수/공백·backup 값과 offset deadline의 ISO UTC 정규화를 인수한다. import-safe main guard/test를 함께 가져오며 실제 secret/keyring을 복사하거나 회전하지 않는다. | [P1](1phase.md) `LC-RD-117B-P1-06` | [1.2.4 P1](../1.2.4/1phase.md) `LC-RD-124-P1-05`: b 증거 인수 후 잔여만 |
| `WC-18` 엄격한 release tag gate·build 설정 | annotated release gate와 fileURLToPath 의도를 검토하되 windows-native needs/assertion·1.1.8 build ID와 분리한다. native 재개 없이 같은 정책 의미를 유지하고 b P1에서 정확한 버전/경로와 가변 Phase 지원을 준비하고 1.2.0 P1은 이를 재사용한다. | [P1](1phase.md) `LC-RD-117B-P1-04`; [P1](1phase.md) `LC-RD-117B-P1-05` | [1.2.8 P3](../1.2.8/3phase.md) `LC-RD-128-P3-03`: b 증거 인수 후 잔여만 |


WC-06의 범위 치환/IME와 checkpoint 변환은 b P2-03/P2-04, WC-10의 가사 복제와 곡 부분 저장은 P2-08/P3-03으로 나눈다. WC-18의 버전/도구 준비와 CI 승인 gate는 P1-04/P1-05가 나누어 담당한다. 의존성을 무시하고 미래 Phase 코드를 편의상 가져오지 않는다.

## 선택 통합의 실제 절차

1. 고정한 source의 차이를 확인해 일반 웹 수정·native 기반·version/CI·문서/시각 기준을 구분한다. Git ancestry 합병 자체가 통합의 완료 조건은 아니다.
2. 파일명만 선택하지 말고 함수/타입/호출자/시험의 의존표를 작성한다. 예: metadata helper ↔ account cleanup ↔ editor, lifecycle type ↔ DB count ↔ trash, export contract ↔ generator ↔ 과거 fixture, SW ↔ client build report ↔ PWA guard.
3. 원격의 새 회귀가 실제 모듈/동작을 검사하는지 확인하고 버전/fixture 기대값을 b 환경에 맞춘다. 이름이 같은 역사 UI-01과 0922 프로필 UI-01을 같은 결함으로 묶지 않는다.
4. source commit을 참조한 작은 통합 commit으로 나눈다. C3는 66개 파일이 섞인 commit이므로 의존성 분리 없이 전체 cherry-pick하지 않는다. 자동 충돌 선택 ours/theirs로 동작을 잃지 않는다.
5. 각 WC에 `planned → ported → verified` 진행과 새 SHA를 기록한다. 제외는 이유/동등 동작 근거/영향/결정자를 남긴다. 18개 중 하나라도 미판정이면 P5 인수를 닫지 않는다.

## P1 source freeze와 최소 파일 묶음

2026-09-23 P1에서 원격 `phase/1.1.8-p4-web-stabilization`을 다시 조회한 head는 `c230c024aeb0297b1c130e3f3e8b507a43a7e871`, 마지막 기능 commit은 `0375825fe004fc74869250eefa14add267c4b3ae`로 계획 작성 때와 같다. `0375825..c230c024`는 STATUS·P4 계획·Future intake·원격 runbook 네 문서뿐이며 추가 제품 diff가 없다. 제품 기준은 `v1.1.7a`가 가리키는 `fc2463cdb47d9fd7d0042779f602c6ddb7d734cf`, 완료 릴리스 기록 기준은 `release/1.1.7a`의 `1db47751c55f45bea34551d603b9e4f67aabd9cc`, b 계획 overlay 시작은 `458030ada5474a53223b33cfb4337fefbdbb1b71`로 분리한다.

아래 묶음은 P2/P3에서 파일 전체를 복사하라는 뜻이 아니다. 각 행의 함수·호출자·시험을 함께 비교할 최소 탐색 범위다. C1=`cd87eb283ecaf5977a8bc9552f26bfa52f273f26`, C2=`a15271003e686995579ce3ddff26c4ac29c5dcbf`, C3=`0375825fe004fc74869250eefa14add267c4b3ae`다.

| WC | source commit | 코드·호출자·시험 최소 묶음 | b 최초 담당 |
|---|---|---|---|
| WC-01 | C3 | `metadata-draft.ts/test`, `account-cache.ts/test`, lyric/prompt/rhyme editors, `historical-data-1.1.8.spec.ts` | P2-01 |
| WC-02 | C1+C3 | editor `autosave`, `crdt`, `browser-sync`, lyric editor, public guest sync와 editor/sync E2E | P2-02 |
| WC-03 | C1+C3 | app shell, `shortcut-runtime`, `page-auth`, song form, historical shortcut/page-auth/navigation 시험 | P2-05 |
| WC-04 | C1+C3 | settings screen, lyric display settings, 두 save-race E2E와 historical UI 시험 | P2-06 |
| WC-05 | C3 | Suno workspace panel, metadata draft/account cache, song dashboard와 historical data E2E | P2-07 |
| WC-06 | C3 | prompt editor/list, editor `crdt`·`copy`와 단위/IME·historical editor 시험 | P2-03/04 |
| WC-07 | C1+C3 | song/rhyme/prompt/search/favorites 목록, `list-response-races.test.ts`, historical UI E2E | P3-01 |
| WC-08 | C3 | favorites, library order controls, song/rhyme/prompt 목록, rhymes DB와 historical data 시험 | P3-02 |
| WC-09 | C3 | template screen과 historical UI/data E2E | P2-04 |
| WC-10 | C1+C3 | song page/form/dashboard, lyric editor, metadata draft와 historical data/editor E2E | P2-08/P3-03 |
| WC-11 | C1+C3 | `dialog-focus`, editor `copy`, editors·responsive toolbar·styles와 copy/UI 시험 | P3-04 |
| WC-12 | C1+C2+C3 | `public/sw.js`, PWA manager, update safety, PWA/service-worker 단위·E2E | P2-09 |
| WC-13 | C3 | auth service, page auth, beta access/signup, 관련 historical auth·DB 시험 | P3-05 |
| WC-14 | C3 | collaboration server/store와 historical/integration store 시험 | P3-06 |
| WC-15 | C1+C3 | editor browser/public-guest sync, lyric editor, collaboration server와 guest/sync E2E | P3-07 |
| WC-16 | C1+C3 | export/lifecycle domain+DB, trash screen, export/lifecycle/trash 시험 | P3-08 |
| WC-17 | C3 | environment validator, allowlist provisioner, environment/HMAC 회귀 | P1-06 |
| WC-18 | C1+C3 | Next build tracing, CI strict tag gate, publication/final-release 회귀; windows-native 제외 | P1-04/05 |

P1은 WC-17과 WC-18을 기능 SHA `a04bbcb6358aa1682e57fb48491e53be3f87f5d1`에서 `ported → verified`했다. [P1](1phase.md)의 로컬 경계·원격 CI·네 signed dev image·동일 SHA 공개 개발 인수를 근거로 한다. P2는 WC-01/02/03/04/05/06/09/10 중 가사 복제/12를 기능 SHA `3915a71f5abd9116bdd097ee4cc45cc6c71eadf0`에서 `ported → verified`했다. [P2](2phase.md)의 전체 로컬 410 PASS, PR/push CI, 네 signed dev image, 같은 SHA 개발 서버·공개 PC/mobile smoke를 근거로 한다. P3는 WC-07/08/10 중 곡 부분 저장/11/13~16을 기능 SHA `1626c754d1ebc581f01c4d29873319827be0b6fd`에서 `ported → verified`했다. [P3](3phase.md)의 전체 로컬/원격 419 PASS, PR/push CI, 네 signed dev image와 같은 SHA 개발 공개 목록/export/trash smoke를 근거로 한다. 이는 P4의 22개 원인 최종 해소·실기기/DB/rollback PASS가 아니다. native 앱·17 native route·1150 파일·1.1.8 manifest/version/STATUS·Windows CI job은 묶음에서 제외한다.

## 충돌·제외 경계

| 경계 | 통합 정책 | 검증 |
|---|---|---|
| 현재 계획·STATUS | 현재 1.1.7a 실행 이력과 b → 1.2.0 순서 유지. 원격 1.1.8 review 문서를 통째로 복사하지 않음 | 현재/다음 버전과 실제 SHA 대조 |
| apps/windows, native 17 routes, native-auth/store | 웹 통합 범위 밖. 필요한 의존성이 보이면 웹 계약으로 분리하고 동등성 검사 | 웹 auth-context에 NativeAuthService가 유입되지 않고 native API가 노출되지 않음 |
| native 1150/source schema imports | 새 웹 기반에 자동 추가하지 않음. 이미 적용된 환경의 DB 객체/기록은 보존 | 새 웹/a DB/기존 1150 DB 행렬 |
| package/runtime/CI/buildId | 1.1.8/p4 전달 금지. 정확한 b와 현재 Phase로 정렬 | VERSION-CONTRACT의 allowlist/invalid/동일 SHA 시험 |
| ci.yml strict tag gate | 정책 의미와 웹 필수 job 유지. Windows needs/검사 문자열을 그대로 복사하지 않음 | dev의 release 별칭 보존, 정식 tag 검사·승인 경계 유지 |
| B1/classic CSS·스냅샷 | 동작/잘림/접근성 수정만 현행 UI로 인수. 코발트는 1.2.0 | 변경 화면의 육안/상호작용 검사·기존 threshold 유지 |
| draft/cache/outbox | owner/document/revision·guest 수명·구 build 보존 | 계정 전환/회수/rollback/종료 복구 |
| a의 공용 image/tag·release 승인 | 기록 보존. b 정식 발행 권한으로 자동 승계하지 않음 | 새 후보의 dev/정식 채널 계약과 승인 상태 |

## P5 최종 전수 봉인 — 2026-09-24

위 18행의 `WC-01~18`은 모두 원본 C1/C2/C3 기능 SHA `0375825fe004fc74869250eefa14add267c4b3ae`의 최소 웹 코드·호출자·시험 범위를 P1 `a04bbcb`/P2 `3915a71`/P3 `1626c75`에 선택 인수하고 P4 `ddc1d7c`의 차단·DB·브라우저 재검증을 거쳤다. P5 최종 기능 SHA `acd2bd99876740debf426c401fe7157713f8b854`의 509 DB/Unit·432 Chromium 및 네 signed image/동일 SHA 개발 공개 인수를 [P5 최종 기록](5phase.md)으로 연결한다. 원격 C3의 문서 head, native/Windows route·job·1150 웹 이식, 1.1.8 runtime/STATUS와 코발트 외형은 전체 cherry-pick에서 제외한 채 각각 별도 계약으로 유지한다. WC-06 실제 OS IME/물리 기기·AT는 사용자 보류/미실행, UI-04/05/07 P2는 미해결 후속이다. 새 원문 손실·인가 확대·복구 불능 근거가 있으면 이 판정을 다시 연다.

## 통합 기록 양식

```text
WC-ID / source head·기능 commit / 담당·Phase:
현재 기준 SHA / 가져온 코드·타입·소비자·시험:
native/version/schema 혼입 검토 / 수정·제외 이유:
새 통합 SHA / 실패→성공·검사 계층·환경:
실제 개발 배포 SHA·CI·image / 미실행·rollback:
0922 원인 판정 / 후속 1.2.x 잔여 작업:
```
