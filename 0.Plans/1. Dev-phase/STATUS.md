# LyricsCloud 개발 상태

```yaml
current_version: "1.0.14"
current_phase: "../2.Patch-phase/1.0.14/5phase.md"
state: "complete"
owner: "Codex"
started_at: "2026-09-11"
updated_at: "2026-09-12"
next_action: "1.0.14 정식 릴리스 완료. OPS-NF-002 owner/actor 권한 모델의 명시적 승인 전에는 1.1.0 공유를 시작하지 않는다"
```

## 승인과 기준

2026-09-11 사용자가 1.0.14까지 모든 버전을 실행하고 각 버전을 개별 정식 릴리스하도록 명시적으로 승인했다. 현재 실행 범위는 1.0.6부터 1.0.14까지 각 버전의 계획된 Phase, Phase별 개발 서버 인수, 버전별 main 병합·annotated tag·정식 image·릴리스 서버 migrate/배포/공개 smoke다. 각 P1의 기존 권장안은 최초 소비 전에 범위·실패·복구 경계를 문서로 확정하며, 외부 제공 조건이 충족되지 않는 기능은 우회 구현하거나 완료로 가장하지 않는다. 기존 DB volume·secret과 사용자가 승인한 `OPS-100-001` 위험 예외를 보존한다.

1.0.5는 main/tag SHA `4411bc1eb74c90a6a1c47f7e3315de2d5ff39edb`, annotated tag `v1.0.5`, 정식 image와 릴리스 서버 동일 SHA 배포·공개 smoke까지 완료됐다.

2026-09-10 사용자가 선행 릴리스와 1.0.5 Phase 5까지의 실행 및 후속 정식 릴리스를 명시적으로 승인했다. 현재 선행 릴리스는 완료된 1.0.3 P1~P5를 main·annotated tag·정식 image·릴리스 서버에 반영하는 범위이며, 이후 1.0.5의 명시적 의존성인 1.0.4 P1~P5를 먼저 완료하고 1.0.5 P1~P5와 최종 릴리스를 수행한다. 기존 DB volume·secret과 `OPS-100-001` 위험 예외를 보존한다.

2026-09-10 사용자가 1.0.2 정식 릴리스 배포와 그 완료 뒤 1.0.3 P1~P5 실행을 명시적으로 승인했다. 1.0.2의 현재 승인 범위는 main 병합·annotated tag·정식 Docker image·릴리스 서버 migrate/배포/공개 smoke이며, 기존 DB volume·secret과 `OPS-100-001` 위험 예외를 보존한다.

2026-09-10 사용자가 다음 버전의 마지막 Phase까지 실행하도록 지시했다. 현재 범위는 1.0.2 P1~P5와 Phase별 개발 서버 인수이며, 계획에 명시된 별도 gate에 따라 main 병합·정식 Release 별칭·릴리스 서버 변경은 포함하지 않는다.

2026-09-09 사용자가 1.0.1 계획의 모든 Phase 실행과 전체 완료 후 릴리스 서버 배포를 승인했다. `ADR-NF-001`, `PROD-NF-001`, `OPS-NF-001`의 권장 대안을 Accepted로 확정했다. 릴리스 서버 변경 권한은 P1~P10 완료와 최종 후보 검증 뒤에만 소비하며, 그 전에는 Phase별 개발 서버 인수만 수행한다.

사용자가 1.0.1 이전의 1.0.0 P6 안정화와 GitHub 반영을 승인했다. 착수 기준 SHA는 `9e362f60f183b6adedfe358554b077334645ed0c`, 당시 전용 브랜치는 `phase/1.0.0-p6-stabilization`이다. 2026-09-09 사용자가 PR #11을 P5에 병합하고 원격 P6 브랜치를 삭제했다. 현재 병합 기준 `7c3930b5bc2be4f25f8f7586b7ce3f02b039af99`는 후보 `405e535`와 동일 tree다. 후보 CI 통과와 별개로 병합 CI의 performance round CV 실패는 조사 중이며, [인수 출발점](../2.Patch-phase/CODEX-HANDOFF.md)에 증거를 연결했다. 운영 배포·정식 태그 재발행·다른 개발자의 작업 덮어쓰기는 승인에 포함하지 않는다.

## 기존 기록 보존

P5 당시 STATUS 전체는 [STATUS-1.0.0-P5.md](./STATUS-1.0.0-P5.md)에 **원본 blob `5492cb6eececa27ac9202eedb5aeb0a108f00286` 그대로** 보존했다. 모든 버전 진행표·승인·활성 작업 이력·완료 기록을 삭제하지 않고 같은 디렉터리로 옮겨 상대 링크를 유지한다. 현재 상태와 과거 증거를 분리하기 위한 변경이며 P1~P5 완료 기록을 소급 변경하지 않는다.

## 진행표

| 범위 | 상태 | 근거 |
|---|---|---|
| 0.0.0~1.0.0 P5 | 당시 완료 기록 보존 | 위 원본 STATUS와 기존 Phase 문서 |
| 1.0.0 P6 | review | 일부 코드 후보·격리 회귀, 전체 인수 미완료 |
| 1.0.1 P1 | 완료 | 사용자 재현·최초 손실 경계·베타/가입/릴리스 계약 확정 |
| 1.0.1 P2 | complete | `0900`·CLI·관리 컨테이너와 동일 SHA 개발 인수 완료 |
| 1.0.1 P3 | complete | 환경별 HMAC 이행·암호화 rollback·key rotation과 동일 SHA 개발 인수 완료 |
| 1.0.1 P4 | complete | 실제 Google 신규 가입·원자 code 소비·grant와 동일 SHA 개발 인수 완료 |
| 1.0.1 P5 | complete | Windows Chrome·Edge 실제 IME와 동일 SHA 개발 저장 무손실 인수 완료 |
| 1.0.1 P6 | complete | 동일 SHA 공개 light/dark·새 가사·연결 관리·모바일/rail 인수 완료 |
| 1.0.1 P7 | complete | 주 로고·아이콘 자산군과 runtime/health 공통 build metadata 공개 인수 완료 |
| 1.0.1 P8 | complete | README·현재 문서·1.0.1 runtime·가변 Phase와 dev/release tag 격리의 동일 SHA 개발 인수 완료 |
| 1.0.1 P9 | complete | 전체 브라우저·DB 경쟁·production image·복원·rollback·성능과 동일 SHA 개발 인수 완료 |
| 1.0.1 P10 | complete | 최종 후보 전체 CI·네 dev image·동일 SHA 개발 공개 인수 완료, 승인된 release 실행 gate 개방 |
| 1.0.2 P1 | complete | v1.0.1 source 조사·수용 입력표·호환/rollback·파일 담당 경계를 설계-only로 고정 |
| 1.0.2 P2 | complete | 가입 응답 유실 멱등·volatile 저장 이탈 guard·build별 PWA 경계와 동일 SHA 개발 인수 완료 |
| 1.0.2 P3 | complete | 저장 실패 exact-copy·가입 로그인/재시도/취소·PC/mobile 50건과 동일 SHA 개발 인수 완료 |
| 1.0.2 P4 | complete | 네 수용 사례·실제 PostgreSQL·267건 전체 E2E·5-browser·production restart·동일 SHA 개발 인수 완료 |
| 1.0.2 P5 | complete | Actions 전체 verify·네 dev image·동일 SHA 개발 공개 인수와 후속 연결 완료 |
| 1.0.3 P1 | complete | mode/raw 저장·구버전 capability·원자 projection·rollback·파일 담당 계약을 설계-only로 확정 |
| 1.0.3 P2 | complete | mode/raw schema·store·CRDT·복제/검색/내보내기·구버전 차단과 동일 SHA 개발 인수 완료 |
| 1.0.3 P3 | complete | PC·모바일 mode 선택·문장 raw·명시 변환/undo·revision v1/v2와 동일 SHA 개발 인수 완료 |
| 1.0.3 P4 | complete | 실제 PostgreSQL·Chromium/Firefox/WebKit·offline/두 탭/구버전/권한·collaboration 재시작과 동일 SHA 개발 인수 완료 |
| 1.0.3 P5 | complete | Actions 전체 verify·네 dev image 게시/서명·동일 SHA 개발 공개 인수와 후속 연결 완료 |
| 1.0.4 P1 | complete | U+002E lossless span·최종 payload code point·비차단 1,000자 경고·담당/rollback 계약을 설계-only로 확정 |
| 1.0.4 P2 | complete | lossless span parser·공통 final-payload code point/1,000자 안내 builder와 단위·장문 회귀 완료 |
| 1.0.4 P3 | complete | 목록·편집기·자료 패널의 lossless span·공통 길이/비차단 경고와 PC·모바일 Chromium 수용 흐름 완료 |
| 1.0.4 P4 | complete | 실제 PostgreSQL 263건·Chromium 279건·5-project 기능 10건과 권한·offline·재접속 회귀 완료 |
| 1.0.4 P5 | complete | Actions `34476629460` 전체 verify·네 dev image·동일 SHA 개발 공개 인수와 1.0.5 연결 완료 |
| 1.0.5 P1 | complete | 첫 콜론 주 이름·lossless suffix·최종 LF payload 3,000 code point 경고·호환/rollback 계약 확정 |
| 1.0.5 P2 | complete | 주 이름/suffix projection·반복 occurrence 안정성·최종 LF payload code point builder와 동일 SHA 개발 인수 완료 |
| 1.0.5 P3 | complete | 편집기/목차 suffix 저강조·전체 copy 3,000자 비차단 경고·PC/mobile와 동일 SHA 공개 개발 인수 완료 |
| 1.0.5 P4 | complete | PostgreSQL 270건·Chromium 284건·5-project 신규 기능 11건과 권한·offline·IME·재시작 동일 SHA 개발 인수 완료 |
| 1.0.5 P5 | complete | Actions `34487251707` 전체 verify·네 dev image·동일 SHA 개발 공개 기능·collaboration 재시작 인수 완료 |
| 1.0.6 P1 | complete | Extend 원문/전체 copy 분리·상대 위치 송폼 삽입·IME/undo·담당/rollback 계약 확정 |
| 1.0.6 P2 | complete | Extend Suno payload filter·부분 copy 원문·단일 source marker·CRDT 상대 위치 삽입 기반과 동일 SHA 개발 인수 완료 |
| 1.0.6 P3 | complete | 우클릭·키보드·모바일 삽입 메뉴·Extend 안내/원문 copy·IME/Escape/undo와 동일 SHA 공개 개발 인수 완료 |
| 1.0.6 P4 | complete | PostgreSQL 275건·Chromium 292건·5-project 신규 17건과 exact export/revision·권한·offline·재시작 동일 SHA 개발 인수 완료 |
| 1.0.6 P5 | complete | Actions `34511266182` 전체 verify·네 dev image·동일 SHA 공개 revision/export/restart 인수 완료 |
| 1.0.7 P1 | complete | owner+자료유형 별도 보기 설정·독립 CAS·필터/순서 불변·좁은 화면 접근성 계약 확정 |
| 1.0.7 P2 | complete | 단위 200건·실제 PostgreSQL 5건·1001 migration/RLS/rollback·동일 SHA 공개 설정 API 인수 완료 |
| 1.0.7 P3 | complete | 세 목록 네 보기·개인/유형 저장·실패 원복·320px/200%와 PC/mobile 10건·저장/IME 30건·동일 SHA 공개 UI 인수 완료 |
| 1.0.7 P4 | complete | PostgreSQL 283건·Chromium 전체 340건·5-project 신규 30건·stale/offline/재시작 동일 SHA 개발 인수 완료 |
| 1.0.7 P5 | complete | Actions `34533353553` 전체 verify·네 dev image·동일 SHA 공개 설정 저장/재시작 인수 완료 |
| 1.0.8 P1 | complete | owner+song 별도 rank·visible anchor·CAS/idempotency·핀/복원/paging·rollback 계약을 설계-only로 확정 |
| 1.0.8 P2 | complete | 1002 migration/RLS·anchor move/CAS/idempotency·manual cursor, Actions `34551269832` 전체 CI와 동일 SHA 공개 개발 API 인수 완료 |
| 1.0.8 P3 | complete | drag handle·버튼/키보드 대안·manual 전환·실패 원복/재시도·numeric rank 연속 이동, Actions `34554545058` 전체 CI와 동일 SHA 공개 개발 UI 인수 완료 |
| 1.0.8 P4 | complete | 실제 PostgreSQL 298건·Chromium 316건·5-project 기능 30건, Actions `34558503310` 전체 CI·네 dev image와 동일 SHA 공개 재시작/순서 복원 인수 완료 |
| 1.0.8 P5 | complete | Actions `34560691621` 전체 CI·네 dev image 게시/서명·동일 SHA 공개 desktop/mobile 이동/재진입 인수 완료 |
| 1.0.9 P1 | complete | 기존 1002를 재사용한 owner+라임/프롬프트 독립 순서·고정 type API·CAS/idempotency·copy/gesture·복구 계약 확정 |
| 1.0.9 P2 | complete | 라임·프롬프트 독립 rank/state/request·고정 type API, Actions `34568930374` 전체 CI·네 dev image·동일 SHA 공개 API 인수 완료 |
| 1.0.9 P3 | complete | 라임·프롬프트 drag/버튼·copy gesture 분리·numeric rank 연속 이동, Actions `34575779766` 전체 CI·네 dev image·동일 SHA 공개 UI 인수 완료 |
| 1.0.9 P4 | complete | 실제 DB 309건·Chromium 322건·5-project 기능 15건, Actions `34580072855` 전체 CI·네 dev image와 동일 SHA 공개 재시작 인수 완료 |
| 1.0.9 P5 | complete | Actions `34583462005` 전체 CI·네 dev image 게시/서명·동일 SHA 공개 desktop/mobile 이동·재진입·재시작 인수 완료 |
| 1.0.10 P1 | complete | 수동 모델명·복수 Suno 링크의 입력 제한·owner/parent·멱등 aggregate·삭제/복원/export·새 탭 계약 확정 |
| 1.0.10 P2 | complete | 1003 schema·domain/store/API·export, 실제 DB·전체 CI와 동일 SHA 공개 개발 API 인수 완료 |
| 1.0.10 P3 | complete | 모델/복수 링크 UI·새 탭 보호·탭 초안/실패 복구, 전체 CI와 공개 desktop/mobile 인수 완료 |
| 1.0.10 P4 | complete | 실제 DB 7건·5-project 기능 20건, Actions `34610699744` 전체 CI·네 dev image와 동일 SHA 공개 재시작 인수 완료 |
| 1.0.10 P5 | complete | Actions `34614794684` 전체 CI·네 dev image 게시/서명·동일 SHA 공개 저장/재진입·삭제복원·재시작 인수 완료 |
| 1.0.10 Release | complete | main/tag `c15387f`, main CI `34617948504`·tag CI `34621241499`, exact digest 운영 배포·공개 재시작/영속성 smoke·GitHub Release 완료 |
| 1.0.11 P1 | complete (no-go) | 공식 Platform은 생성 API만 공개 안내하며 기존 링크 metadata 계약은 확인되지 않음. 약관상 scraping 우회 금지, `AC-1.0.11-04` PASS |
| 1.0.11 P2~P4 | blocked | 공식 provider 계약·표시/재배포 권한·rate limit/비용 확보 전 착수 금지. `NF-REQ-032` 미완료 |
| 1.0.11 P5/no-go | complete | 공식 근거·미완료 요구·재개 조건·1.0.12 인계 기록. 제품 변경이 없어 빈 `v1.0.11` tag·image·운영 배포 미발행 |
| 1.0.12 P1 | complete | 세 목록 O(n²) group position 계산을 확인하고 2,500/10,000개 baseline·선형 후보 exact-equivalence, 불변 API/DB/권한과 rollback 계약 확정 |
| 1.0.12 P2 | complete | 공통 O(n) position map·세 목록 memoized 소비, 전체 CI 두 run·네 dev image·동일 SHA 공개 manual 목록 인수 완료 |
| 1.0.12 P3 | complete | 전체 CI 두 run·동일 SHA 개발 공개 desktop/mobile 수직 흐름, 재진입·exact copy·Suno 새 탭·owner/실패 UI 인수 완료 |
| 1.0.12 P4 | complete | 실제 PostgreSQL 330건·PWA/성능 계약·전체 CI 두 run·공개 desktop/mobile·owner 격리·서비스 재시작 인수 완료 |
| 1.0.12 P5 | complete | 후보 `13a4870`, Actions `34635992205`·`34636003640`, 네 dev image, 동일 SHA 공개 수직 흐름·owner 격리·서비스 재시작 인수 완료 |
| 1.0.12 Release | complete | main/tag `b051d5d`, main CI `34638724606`·tag CI `34641693226`, exact digest 운영 배포·공개 재시작/영속성 smoke·GitHub Release 완료 |
| 1.0.13 P1 | complete (no-go) | 공식 NAVER 공개 목록에 세 언어 사전 뜻풀이 경로가 없고 신청·출처·캐시 권리를 확인할 수 없어 구현 보류, `AC-1.0.13-01` PASS |
| 1.0.13 P2~P4 | blocked | 공식 provider 계약·표시/캐시/재배포 권리·비용/rate limit 확보 전 API·tooltip·실제 언어/기기 수용 착수 금지 |
| 1.0.13 P5/no-go | complete | 공식 근거·미완료 요구·재개 조건·1.0.14 인계 기록. 제품 변경이 없어 빈 `v1.0.13` tag·image·운영 배포 미발행 |
| 1.0.14 P1 | complete | Noto Sans KR 2.004 Regular 공식 OTF·OFL·해시, 한글/자모/Kana/선별 Han+system fallback, cold 1건/4.7MB 예산 승인 |
| 1.0.14 P2 | complete | 공식 hash OTF/OFL·swap/system fallback·immutable/PWA cache, Actions 두 run과 동일 SHA 공개 개발 인수 완료 |
| 1.0.14 P3 | complete | 후보 `ffcf97f`, Actions `34649606547`·`34649610060`, 네 dev image와 동일 SHA 공개 저장/재진입·세 편집기 family·undo/원문·overflow 인수 완료 |
| 1.0.14 P4 | complete | 후보 `1753ee0`, Actions `34656715638`·`34656718443`, Chromium 340 PASS·네 dev image·동일 SHA 공개 200줄/차단 font 저장·재진입 인수. 실제 세 OS 폰트 전환 미실행 위험 명시 |
| 1.0.14 P5 | complete | 후보 `a11e1b5`, Actions `34658944912`·`34658954668`, 네 dev image·동일 SHA 공개 장문/차단 font 인수와 OFL 봉인, OPS-NF-002 공유 NO-GO 완료 |
| 1.0.14 Release | complete | main/tag `d093ff2`, main CI `34660678199`·tag CI `34662523402`, exact digest 운영 배포·공개 재시작/영속성 smoke·GitHub Release 완료 |

## 활성 작업

| 담당자 | 버전/Phase | 작업 ID | 수정 경로 | 의존성 | 시작 시각 | 상태 |
|---|---|---|---|---|---|---|
| Codex | 1.0.14/Release | 승인된 release gate | main CI·annotated tag·정식 image·릴리스 서버 exact digest·공개 smoke | 1.0.14 P5 `a11e1b5` | 2026-09-12T09:10:00+09:00 | complete |
| Codex | 1.0.14/P5 | LC-NF-1.0.14-P5-01~03 | OFL/지원·fallback 고지·최종 봉인·OPS-NF-002 공유 진입 판정 | 1.0.14 P4 `1753ee0` | 2026-09-12T08:35:00+09:00 | complete |
| Codex | 1.0.14/P4 | LC-NF-1.0.14-P4-01~03 | 실제/합성 IME 경계·slow/offline·저사양 성능·개인 흐름 통합 회귀 | 1.0.14 P3 `ffcf97f` | 2026-09-12T06:53:00+09:00 | complete |
| Codex | 1.0.14/P3 | LC-NF-1.0.14-P3-01~03 | 선택 영속·다국어 preview·세 편집기 적용·cursor/undo/IME·모바일 overflow | 1.0.14 P2 `1c97f4c` | 2026-09-12T06:45:00+09:00 | complete |
| Codex | 1.0.14/P2 | LC-NF-1.0.14-P2-01~03 | OTF/OFL hash 자산·lazy loading·PWA cache·fallback 실패 회귀 | 1.0.14 P1 | 2026-09-12T05:55:00+09:00 | complete |
| Codex | 1.0.14/P1 | LC-NF-1.0.14-P1-01~03 | 폰트 공식 출처·OFL/재배포·글리프·용량·fallback 후보·예산 | 1.0.13 no-go | 2026-09-12T05:45:00+09:00 | complete |
| Codex | 1.0.13/P5 | LC-NF-1.0.13-P5-01~03 | provider no-go·미완료 요구·재개 조건·1.0.14 인계 | 1.0.13 P1 no-go | 2026-09-12T05:35:00+09:00 | complete |
| Codex | 1.0.13/P1 | LC-NF-1.0.13-P1-01~03 | 공식 NAVER 사전 제공 경로·권리/캐시·tooltip 대안·go/no-go 증거 | v1.0.12 release `b051d5d` | 2026-09-12T05:25:00+09:00 | complete (no-go) |
| Codex | 1.0.12/P5 | LC-NF-1.0.12-P5-01~06 | 요구 추적·사용자/지원/보안/자가호스팅·봉인 artifact·최종 CI·개발/정식 인수 | 1.0.12 P4 `a4e0910` | 2026-09-12T03:50:00+09:00 | complete |
| Codex | 1.0.12/P4 | LC-NF-1.0.12-P4-01~06 | 실제 DB·수용 사례·권한/계정·offline/reconnect·PWA·재시작·지원 browser 교차 회귀 | 1.0.12 P3 `9b891a8` | 2026-09-12T03:20:00+09:00 | complete |
| Codex | 1.0.12/P3 | LC-NF-1.0.12-P3-01~06 | 곡→가사→라임 삽입→문장 prompt→copy→Suno open 수직 흐름·PC/mobile 재진입 | 1.0.12 P2 `73c1671` | 2026-09-12T02:50:00+09:00 | complete |
| Codex | 1.0.12/P2 | LC-NF-1.0.12-P2-01~06 | position map 실패 시험·공통 선형 precompute·세 목록 소비·DB/단위 회귀 | 1.0.12 P1 `db02084` | 2026-09-12T01:50:00+09:00 | complete |
| Codex | 1.0.12/P1 | LC-NF-1.0.12-P1-01~06 | 통합 회귀 입력·장문 목록 성능 측정·호환/rollback·담당 경계 | 1.0.11 no-go `a75c88a` | 2026-09-12T01:30:00+09:00 | complete |
| Codex | 1.0.11/P1 | LC-NF-1.0.11-P1-01~06 | 공식 Suno metadata 제공/허가 경로·실패 입력·go/no-go 증거 | v1.0.10 release `c15387f` | 2026-09-12T01:05:00+09:00 | complete (no-go) |
| Codex | 1.0.10/P5 | LC-NF-1.0.10-P5-01~06 | 요구 추적·사용자/지원/보안/자가호스팅 문서·봉인 artifact·최종 CI·개발/정식 인수 | 1.0.10 P4 `386c37a` | 2026-09-11T23:57:00+09:00 | complete |
| Codex | 1.0.10/P4 | LC-NF-1.0.10-P4-01~06 | 실제 DB·수용 사례·권한/오프라인/재접속·서비스 재시작·지원 browser 회귀 | 1.0.10 P3 `fdfb6da` | 2026-09-11T22:40:00+09:00 | complete |
| Codex | 1.0.10/P3 | LC-NF-1.0.10-P3-01~06 | song dashboard·Suno model/link panel·draft/실패 복구·PC/mobile E2E | 1.0.10 P2 `fa402c2` | 2026-09-11T22:05:00+09:00 | complete |
| Codex | 1.0.10/P2 | LC-NF-1.0.10-P2-01~06 | domain parser·1003 migration/RLS·aggregate store/API·export·DB 회귀 | 1.0.10 P1 / v1.0.9 `07efeb0` | 2026-09-11T21:00:00+09:00 | complete |
| Codex | 1.0.10/P1 | LC-NF-1.0.10-P1-01~06 | Suno 수동 모델/링크 결정·계약·수용 입력·P2/P3 담당 경계 | v1.0.9 release `07efeb0` | 2026-09-11T20:47:48+09:00 | complete |
| Codex | 1.0.9/P5 | LC-NF-1.0.9-P5-01~06 | 요구 추적·현재/사용자/지원 문서·환경 schema·봉인 artifact·최종 CI·개발/정식 인수 | 1.0.9 P4 `86d8e4c` | 2026-09-11T18:10:00+09:00 | complete |
| Codex | 1.0.9/P4 | LC-NF-1.0.9-P4-01~06 | 실제 DB·세 유형 독립성·핀/삭제복원·권한/실패·지원 browser·개발 서비스 재시작 회귀 | 1.0.9 P3 `0236ee3` | 2026-09-11T17:30:00+09:00 | complete |
| Codex | 1.0.9/P3 | LC-NF-1.0.9-P3-01~06 | 라임/프롬프트 drag handle·버튼/키보드 이동·copy gesture 분리·오류 원복·PC/mobile E2E | 1.0.9 P2 `ade5d08` | 2026-09-11T15:00:00+09:00 | complete |
| Codex | 1.0.9/P1 | LC-NF-1.0.9-P1-01~06 | 라임/프롬프트 사용자정렬 계약·실패 입력·domain/database/web 담당·호환/rollback 경계 | 1.0.8 main/tag `5388bbf` | 2026-09-11T14:04:00+09:00 | complete |
| Codex | 1.0.9/P2 | LC-NF-1.0.9-P2-01~06 | domain 고정 type 계약·기존 1002 store/API·프롬프트 copy·권한/복구 회귀 | 1.0.9 P1 `44f3a11` | 2026-09-11T14:10:00+09:00 | complete |
| Codex | 1.0.8/P5 | LC-NF-1.0.8-P5-01~06 | 요구 추적·현재/사용자/지원 문서·환경 schema·봉인 validator·최종 CI·개발/정식 인수 | 1.0.8 P4 `72af9f9` | 2026-09-11T12:55:00+09:00 | complete |
| Codex | 1.0.8/P4 | LC-NF-1.0.8-P4-01~06 | 실제 DB·두 탭/응답 역전·offline/reconnect·지원 browser·개발 서비스 재시작 회귀 | 1.0.8 P3 `fd8b44b` | 2026-09-11T12:15:00+09:00 | complete |
| Codex | 1.0.8/P3 | LC-NF-1.0.8-P3-01~06 | 곡 drag handle·버튼/키보드 이동·manual URL·실패 원복/409 최신화·PC/mobile E2E | 1.0.8 P2 `0f9e61a` | 2026-09-11T10:50:00+09:00 | complete |
| Codex | 1.0.8/P2 | LC-NF-1.0.8-P2-01~06 | domain 계약·1002 rank/state/request migration·song store/API·DB/단위 회귀 | 1.0.8 P1 `994070d` | 2026-09-11T09:50:00+09:00 | complete |
| Codex | 1.0.8/P1 | LC-NF-1.0.8-P1-01~06 | 곡 사용자정렬 계약·실패 입력·domain/database/web 담당·호환/rollback 경계 | v1.0.7 release `a7bf38c` | 2026-09-11T09:45:00+09:00 | complete |
| Codex | 1.0.7/P4 | LC-NF-1.0.7-P4-01~06 | stale/실패·기존 목록 layout 회귀·실제 DB·지원 browser·개발 서비스 재시작 | 1.0.7 P3 `6f0a556` | 2026-09-11T06:00:00+09:00 | complete |
| Codex | 1.0.7/P5 | LC-NF-1.0.7-P5-01~06 | 최종 추적·사용자/운영 문서·봉인 artifact·전체 CI·동일 SHA 개발 인수 | 1.0.7 P4 `f096bb5` | 2026-09-11T06:20:00+09:00 | complete |
| Codex | 1.0.7/P3 | LC-NF-1.0.7-P3-01~06 | 공통 보기 selector/hook·세 목록 grid/CSS·PC/mobile E2E·runtime metadata | 1.0.7 P2 `eef83ec` | 2026-09-11T05:40:00+09:00 | complete |
| Codex | 1.0.7/P2 | LC-NF-1.0.7-P2-01~06 | domain contract·1001 migration/RLS·store/API·runtime metadata·DB/단위 회귀 | 1.0.7 P1 `ff25d13` | 2026-09-11T05:24:00+09:00 | complete |
| Codex | 1.0.7/P1 | LC-NF-1.0.7-P1-01~06 | 보기 설정 계약·실패 입력·domain/database/web 담당·호환/rollback 경계 | v1.0.6 release `f314768` | 2026-09-11T05:21:03+09:00 | complete |
| Codex | 1.0.6/P5 | LC-NF-1.0.6-P5-01~06 | 요구 추적·현재 문서·환경 schema·검증기·최종 CI·개발/정식 인수 | 1.0.6 P4 `0d19330` | 2026-09-11T02:43:00+09:00 | complete |
| Codex | 1.0.6/P4 | LC-NF-1.0.6-P4-01~06 | 실제 DB·권한·export/revision·offline/reconnect·지원 브라우저·restart 회귀 | 1.0.6 P3 `4ef7d7f` | 2026-09-11T02:05:00+09:00 | complete |
| Codex | 1.0.6/P3 | LC-NF-1.0.6-P3-01~06 | CodeMirror context/key hook·lyric editor PC/mobile 메뉴·안내·E2E | 1.0.6 P2 `7f87b8a` | 2026-09-11T01:00:00+09:00 | complete |
| Codex | 1.0.6/P2 | LC-NF-1.0.6-P2-01~06 | editor copy·marker source·CRDT 상대 삽입·단위 회귀 | 1.0.6 P1 / v1.0.5 `4411bc1` | 2026-09-11T00:15:00+09:00 | complete |
| Codex | 1.0.6/P1 | LC-NF-1.0.6-P1-01~06 | Extend/copy·송폼 삽입 계약·실패 입력·editor/UI/E2E 담당·호환/rollback 경계 | v1.0.5 release `4411bc1` | 2026-09-11T00:00:00+09:00 | complete |
| Codex | 1.0.5/P5 | LC-NF-1.0.5-P5-01~06 | 요구 추적·현재 문서·환경 schema·검증기·최종 CI·개발/정식 인수 | 1.0.5 P4 `d0ad04d` | 2026-09-10T23:10:00+09:00 | complete |
| Codex | 1.0.5/P4 | LC-NF-1.0.5-P4-01~06 | 실제 DB·권한·offline/재접속·IME·지원 브라우저·restart 회귀 | 1.0.5 P3 `c010d3f` | 2026-09-10T22:30:00+09:00 | complete |
| Codex | 1.0.5/P3 | LC-NF-1.0.5-P3-01~06 | CodeMirror decoration·lyric editor/list/copy feedback·PC/mobile E2E | 1.0.5 P2 `3b12d0a` | 2026-09-10T22:15:00+09:00 | complete |
| Codex | 1.0.5/P2 | LC-NF-1.0.5-P2-01~06 | editor parser/index·copy builder·단위 회귀·runtime metadata | 1.0.5 P1 `29180cf` | 2026-09-10T22:08:00+09:00 | complete |
| Codex | 1.0.5/P1 | LC-NF-1.0.5-P1-01~06 | songform/copy 계약·실패 입력·editor/UI/E2E 담당·호환/rollback 경계 | 1.0.4 P5 `508833e` | 2026-09-10T21:52:00+09:00 | complete |
| Codex | 1.0.4/P5 | LC-NF-1.0.4-P5-01~06 | 요구 추적·현재 문서·검증기·최종 CI·개발 인수·1.0.5 인계 | 1.0.4 P4 `3ed2770` | 2026-09-10T21:10:00+09:00 | complete |
| Codex | 1.0.4/P4 | LC-NF-1.0.4-P4-01~06 | 실제 DB·권한·offline/두 탭·지원 브라우저·restart 회귀 | 1.0.4 P3 `7136897` | 2026-09-10T20:50:00+09:00 | complete |
| Codex | 1.0.4/P3 | LC-NF-1.0.4-P3-01~06 | web prompt 목록·편집기·자료 패널·copy fallback·PC/mobile E2E | 1.0.4 P2 `c8b18f7` | 2026-09-10T20:35:00+09:00 | complete |
| Codex | 1.0.4/P2 | LC-NF-1.0.4-P2-01~06 | domain lossless span·prompt copy payload/count/warning·단위/장문 회귀 | 1.0.4 P1 `93a0704` | 2026-09-10T20:08:00+09:00 | complete |
| Codex | 1.0.4/P1 | LC-NF-1.0.4-P1-01~06 | prompt display/copy 계약·수용 입력·domain/UI/E2E 담당·호환/rollback 경계 | 1.0.3 P5 main `859c41e` | 2026-09-10T19:45:00+09:00 | complete |
| Codex | 1.0.3/P5 | LC-NF-1.0.3-P5-01~06 | 요구 추적·사용자/지원/보안/자가호스팅 문서·환경 schema·최종 CI·개발 인수 | 1.0.3 P4 동일 SHA 개발 인수 `611eab0` | 2026-09-10T18:15:00+09:00 | complete |
| Codex | 1.0.3/P4 | LC-NF-1.0.3-P4-01~06 | prompt mode 수용·권한·offline/reconnect·server restart·지원 브라우저 회귀 | 1.0.3 P3 동일 SHA 개발 인수 `30dfef7` | 2026-09-10T17:45:00+09:00 | complete |
| Codex | 1.0.3/P3 | LC-NF-1.0.3-P3-01~06 | prompt 신규·편집·목록·템플릿 UI, editor draft/CRDT, PC/mobile E2E | 1.0.3 P2 동일 SHA 개발 인수 `62e3d58` | 2026-09-10T17:10:00+09:00 | complete |
| Codex | 1.0.3/P2 | LC-NF-1.0.3-P2-01~06 | domain·database·editor·collaboration의 prompt mode/raw·migration·검증 | 1.0.3 P1 계약 `698e2d6` | 2026-09-10T17:00:00+09:00 | complete |
| Codex | 1.0.3/P1 | LC-NF-1.0.3-P1-01~06 | prompt mode/raw 계약·수용 입력·migration/API/CRDT/capability/rollback 경계 | v1.0.2 release `b4cfd665feb72612122253a26f336e5816bfb28c` | 2026-09-10T16:19:00+09:00 | complete |
| Codex | 1.0.2/P5 | LC-NF-1.0.2-P5-01~06 | 요구 추적·현재 문서·최종 CI·동일 SHA 개발 인수·후속 연결 | P4 동일 SHA 개발 인수 | 2026-09-10T13:07:30+09:00 | complete |
| Codex | 1.0.2/P4 | LC-NF-1.0.2-P4-01~06 | 가입 응답 유실·저장/PWA·계정·재접속·서버 재시작 교차 회귀 | P3 동일 SHA 개발 인수 | 2026-09-10T12:42:00+09:00 | complete |
| Codex | 1.0.2/P3 | LC-NF-1.0.2-P3-01~06 | 저장·가입 안내·복구 경로·작은 화면·PC/mobile 회귀 | P2 동일 SHA 개발 인수 | 2026-09-10T12:23:38+09:00 | complete |
| Codex | 1.0.2/P2 | LC-NF-1.0.2-P2-01~06 | 실패 fixture·가입 멱등·저장 guard·build별 PWA·CLI/schema 회귀 | P1 설계-only 계약 | 2026-09-10T12:03:37+09:00 | complete |
| Codex | 1.0.2/P1 | LC-NF-1.0.2-P1-01~06 | 안정화 계약·관련 구현/테스트 조사·담당 경계·인수 문서 | v1.0.1 main/release `194dc4217e5a45e9e55c82c43e30afffcb5e1984` | 2026-09-10T11:57:03+09:00 | complete |
| Codex | 1.0.1/P10 | LC-NF-1.0.1-P10-01~06 | 요구 추적·최종 CI·release manifest·main/image/운영 배포 | P9 동일 SHA 개발 인수 | 2026-09-10 | complete |
| Codex | 1.0.1/P9 | LC-NF-1.0.1-P9-01~05 | 통합 회귀·DB 경쟁·image/secret·backup/restore·성능 | P8 동일 SHA 개발 인수 | 2026-09-10 | complete |
| Codex | 1.0.1/P8 | LC-NF-1.0.1-P8-01~04 | README·현재 문서·version·release tooling | P7 공개 brand/build metadata 인수 | 2026-09-10 | complete |
| Codex | 1.0.1/P7 | LC-NF-1.0.1-P7-01~03 | public logo/icon 자산·navigation·build metadata | P6 공개 양 테마 UI 인수 | 2026-09-10 | complete |
| Codex | 1.0.1/P6 | LC-NF-1.0.1-P6-01~03 | web components·공통 UI·스타일·portal | P5 Windows 실제 IME·공개 개발 HTTPS | 2026-09-10 | complete |
| Codex | 1.0.1/P5 | LC-NF-1.0.1-P5-01~05 | lyric editor IME·저장 drain·재진입 복구 | P4 실제 Google 가입·기존 P6 회귀 | 2026-09-09 | complete |
| Codex | 1.0.1/P4 | LC-NF-1.0.1-P4-01~05 | signup UI·OIDC callback·auth/DB grant | P3 HMAC bootstrap·0900 상태 | 2026-09-09 | complete |
| Codex | 1.0.1/P3 | LC-NF-1.0.1-P3-01~03 | test-user reader/import·config·키 운영 runbook | P2 환경·키 계약 | 2026-09-09 | complete |
| Codex | 1.0.1/P2 | LC-NF-1.0.1-P2-01~05 | 관리 CLI·auth/DB 코드 상태·설치 경로 | P1 Accepted 계약·PostgreSQL | 2026-09-09 | complete |
| Codex | 1.0.1/P1 | LC-NF-1.0.1-P1-01~08 | 계약·인수 문서, editor/auth/UI 원인 경로 | P6 회귀·실제 Windows IME·공개 개발 HTTPS | 2026-09-09T17:55:11+09:00 | complete |
| ChatGPT | 1.0.0/P6 | LC-100-P6-01, LC-100-P6-04, LC-100-P6-05, LC-100-P6-06 | CI·scripts·backup·observability·export·settings·P6 문서 | 별도 DB/브라우저 및 원격 CI 검증 | 2026-09-09 | review |
| Codex | 1.0.0/P6 | LC-100-P6-01, LC-100-P6-03, LC-100-P6-04, LC-100-P6-08 | CI·Compose·기동 검증·탈퇴 E2E·초안/PWA·P6 인계 문서 | Chromium/DB 회귀 및 로컬 5개 서비스 확인, 원격 CI·실제 환경 인수 | 2026-09-09 | review |
| Astra (astra_worker, 문서 단일 작성자) | 1.0.0/P6 인계·1.0.1 P1 준비 | LC-100-P6-08 | 0.Plans/2.Patch-phase·docs/adr/product/operations/planning·문서 색인·Agent/AGENTS | 문서 인계: 29버전·제품150 Phase+UX5·846 task·요구48, 원래730 task와 후보129 체크/설명/예시 보존. 문서 validator PASS(686 MD/15화면), 범위 링크/ID 검사 이상 없음. 원본 193파일/ZIP SHA256 일치는 부모 확인, 재승인 삭제도 자동 검토 blocked by policy로 거부되어 원본/백업 보존·commit 제외. 구현/원격 작업은 부모 인수 | 2026-09-09 | review |

## 인계

1.0.14는 PR #86 merge 뒤 main과 annotated `v1.0.14`가 `d093ff2a472e59499eebcf151f549f15e9535baa`를 가리킨다. main Actions `34660678199`와 tag Actions `34662523402`의 전체 verify, unit 334 PASS·beta 4 조건부 skip, Chromium 340 PASS·36 skip, release matrix 10 PASS와 네 정식 image 서명·provenance·SBOM을 통과했다. 같은 exact digest를 릴리스 서버에 migrate→서비스 순서로 배포해 `1.0.14`·`release`·phase `null`, schema `1004_web_font_selection.sql`, 네 서비스 healthy를 확인했다. 공개 가사·문장 원문, 연결 자료, owner 격리, Suno workspace, font hash/cache·설정 저장/재진입과 실제 서비스 재시작 지속성이 PASS했고 합성 fixture를 제거했다. 기존 DB volume·secret·HMAC allowlist는 보존했다. `OPS-100-001` backup 예외와 실제 Windows/Android/iOS 폰트 전환 미실행을 유지하며, `OPS-NF-002` 승인 전 1.1.0 공유는 시작하지 않는다.

1.0.14 P5 후보 `a11e1b5cb9b58cc195a0b2c9f2c148f868d74dee`는 OFL·저작권·재배포·지원 문자/fallback·문제 해결 고지와 24개 migration·Noto asset license·환경·release manifest 봉인을 추가하고 `OPS-NF-002` 공유 진입을 NO-GO로 재판정했다. Actions push `34658944912`과 PR `34658954668`의 전체 verify, Chromium 340 PASS·36 skip, release matrix 10 PASS, 네 dev image 게시/서명을 통과했다. 같은 SHA 개발 서버의 `1.0.14`·`dev`·`p5`, schema `1004_web_font_selection.sql`, 네 서비스 healthy와 font hash/크기/cache를 확인하고 공개 계정 font·200줄 composition·차단 fallback 저장/재진입·overflow를 PASS한 뒤 fixture를 제거했다. 실제 Windows/Android/iOS 폰트 전환·물리 저사양 기기와 `OPS-100-001` backup 예외를 숨기지 않은 채 승인된 정식 릴리스로 이동한다.

1.0.14 P4 후보 `1753ee047e2afaa73cc09c50e354d7729e8850ba`는 font cold/slow/blocked/offline, 2,000줄·4배 CPU·heap, 200줄 합성 composition과 기존 개인 창작 흐름을 교차 검증했다. Actions push `34656715638`과 PR `34656718443`의 전체 verify, Chromium 340 PASS·36 skip, release browser matrix 10 PASS와 네 dev image 게시/서명을 통과했다. 같은 SHA 개발 서버는 schema `1004_web_font_selection.sql`, 네 서비스 healthy, 공개 폰트 승인 hash/크기/immutable 응답과 일치했다. 공개 desktop/mobile에서 계정 폰트와 200줄 입력 저장·재진입, editor DOM 유지, font 차단 fallback·추가 입력 exact 저장·reload, overflow 부재가 PASS했고 fixture를 제거했다. 최초 공개 하네스의 편집기 활성화 전 입력 경합은 `contenteditable=true` 대기로 교정하고 200줄 exact DB 회귀로 고정했다. 실제 Windows/Android/iOS의 1.0.14 폰트 전환과 물리 저사양 기기는 미실행이며 P5 release 위험으로 인계한다.

1.0.14 P3 후보 `ffcf97f5e51a7228895079f4a600ef9133682237`은 공용 Noto Sans KR 선택을 계정 기본값과 가사별 override에 영속하고 CSS 변수로 가사·라임·프롬프트 편집기에 적용한다. 실제 PostgreSQL 1004 migration·rollback, 전체 Vitest 334 PASS·전용 beta 4 skip, Chromium desktop/mobile 336 PASS·조건부 36 skip을 로컬에서 통과했고 Actions push `34649606547`과 PR `34649610060`의 전체 verify, 네 dev image 게시/서명을 통과했다. 같은 SHA 개발 서버는 schema `1004_web_font_selection.sql`, 네 서비스 healthy, 공개 폰트 승인 hash/크기/immutable 응답과 일치했다. 공개 합성 계정의 기본/가사별 저장·재진입, live 전환 뒤 undo·원문 보존, 세 편집기 family·overflow가 PASS했으며 fixture를 제거했다. 실제 Windows/Android/iOS 물리 입력과 slow/offline·저사양 성능은 P4에 남긴다.

1.0.10 P5 후보 `49b32010571dd33e2a0668dc632e7e54fc054680`는 GitHub Actions push run `34614794684`의 verify 21분·Chromium desktop/mobile 전체 회귀·release matrix·보안/복구 검사와 네 dev image 게시/서명을 통과했다. 같은 SHA 개발 서버의 `1.0.10`·`dev`·`p5`, schema `1003_song_suno_workspaces.sql`, 네 서비스 healthy를 확인하고 공개 desktop/mobile 사용자 지정 모델·링크 3개 저장/재진입·새 탭 보호·한글 순차 입력 초안 복구·좁은 화면, owner 차단·soft-delete/restore·web/collaboration/worker 재시작 지속성을 PASS한 뒤 fixture를 제거했다. 신규 제품 P0/P1·원문 유실·인증 우회·무음 저장 실패는 0건이다. 실제 물리 기기는 새로 실행하지 않았고 `OPS-100-001`은 사용자 승인 예외로 유지하며 승인된 정식 main/tag/image/릴리스 서버 절차로 이동한다.

1.0.10 P4 제품 후보 `386c37ac1b4bf0e54b7ff008179a5384273c020e`는 CI `APP_PHASE`가 P2에 남은 표시 결함을 P4로 바로잡고 제품 기능은 P3와 동일하게 유지했다. 실제 PostgreSQL 계약/store/export 7건, 5-project Suno 기능 20건, 로컬 0.9.1 성능 예산을 통과했고 Actions push run `34610699744`의 verify 21분 29초·Chromium desktop/mobile 330 PASS·환경 조건부 36 skip·release matrix 10 PASS와 네 dev image 게시/서명을 통과했다. 같은 SHA 개발 서버의 `1.0.10`·`dev`·`p4`, schema `1003_song_suno_workspaces.sql`, 네 서비스 healthy를 확인하고 공개 링크 3개·owner 차단·soft-delete/restore 뒤 web·collaboration·worker 실제 재시작에도 workspace가 유지됨을 확인했으며 fixture를 제거했다. 최초 `b0c2e29` run의 짧은 save/revision CV만 환경 편차로 실패했고 같은 제품 tree의 로컬·최종 단독 CI에서 통과했다. 실제 물리 기기는 새로 실행하지 않았고 `OPS-100-001`은 사용자 승인 예외로 유지한다.

1.0.10 P3 제품 후보 `55f1b9918a2e21d4bcb3768271f637d4fd52a232`와 완료 SHA `fdfb6dabf551f6419679658c2863ffaec7031c2a`는 곡 대시보드에 미지정·제안·사용자 지정 모델 selector와 최대 20개 수동 링크의 추가·수정·순서·제거 UI를 추가했다. 외부 링크는 `_blank`와 `noopener noreferrer`로 열고 제거 확인은 LyricsCloud 항목만 제거하며 Suno 원곡을 건드리지 않음을 명시한다. 서버 validation·CAS 충돌·네트워크 실패를 숨기지 않고 sessionStorage 탭 초안을 유지한다. Node 24 전체 typecheck·production build, desktop/mobile 신규 8건과 dashboard/accessibility 관련 10건이 PASS했고 Actions push run `34604293119`의 전체 verify·네 dev image 게시/서명 및 PR run `34604299718`의 20분 52초 단독 전체 verify를 통과했다. 완료 SHA를 개발 서버에 다시 배포한 뒤 공개 custom model·3개 링크 저장/재진입·새 탭 보호·mobile 한글 순차 입력 초안 복구·overflow 없음과 fixture 제거도 다시 PASS했다. 자동화 viewport를 실제 물리 기기로 기록하지 않으며 P4가 owner·삭제복원·offline/reconnect·재시작과 지원 엔진 회귀를 담당한다.

1.0.10 P2 구현·CI 후보 `fa402c2ceecdee500db866c4ace4562cfbfb9d91`와 같은 제품 tree의 Phase 완료 SHA `779dc623a9fff0e864ee0d150978e6a7bdcce023`는 공통 model/URL parser, `1003_song_suno_workspaces.sql`, owner RLS·aggregate CAS/idempotency store와 GET/POST API, soft-delete/restore/export 연결을 완성했다. Node 24 단위·실제 PostgreSQL·migration fresh/repeat/upgrade/RLS/rollback, production build와 보안 inventory를 통과했으며 GitHub Actions run `34600374457` 재실행에서 환경 변동으로 최초 실패했던 성능 CV와 Docker Hub 연결 재설정 한 건을 재시도해 전체 verify와 네 dev image 게시·서명을 통과했다. 완료 SHA 개발 서버와 공개 합성 두 owner로 3개 링크·custom model·멱등 replay·stale/소유권·삭제복원·fixture 제거가 PASS했다. P3는 저장 계약을 유지한 채 desktop/mobile UI와 새 탭 보호·draft/오류 상태를 담당한다. 실제 물리 기기와 UI gesture는 아직 실행하지 않았고 main·정식 image·릴리스 서버는 P2에서 변경하지 않았다.

1.0.9 P5 후보 `d0dff173995298a4d617d7494b7c2cc9f32bd542`는 GitHub Actions push run `34583462005`의 전체 verify와 네 dev image 게시·서명을 통과했다. 개발 서버 checkout/build metadata는 같은 SHA의 `1.0.9`, `dev`, `p5`, schema `1002_library_manual_order.sql`, 네 서비스 healthy였다. 공개 desktop/mobile 라임·프롬프트 이동·재진입, prompt 원문 불변, touch copy 분리, 좁은 화면 overflow 없음과 web·collaboration·worker 실제 재시작 뒤 순서 지속성이 PASS했고 합성 자료를 제거했다. 신규 제품 P0/P1·원문 유실·인증 우회·무음 저장 실패는 0건이며 실제 물리 기기는 새로 수행하지 않았다. `OPS-100-001`은 사용자 승인 예외로 유지하며 승인된 정식 main/tag/image/릴리스 서버 절차로 이동한다.

1.0.9 P4 후보 `86d8e4c09757a3593c69017982e60a8356f30866`는 P3의 numeric rank 수정과 P4 회귀를 통합한 뒤 GitHub Actions run `34580072855`의 전체 verify와 네 dev image 게시·서명을 통과했다. 실제 PostgreSQL 전체 309건, Chromium desktop/mobile 322 PASS·조건부 36 skip, Chromium/Firefox/WebKit 5-project 기능 15건이 PASS했다. 개발 서버 checkout/build metadata는 같은 SHA의 `1.0.9`, `dev`, `p4`, schema `1002_library_manual_order.sql`, 네 서비스 healthy였고 공개 이동 뒤 web·collaboration·worker 실제 재시작 후에도 라임 `C-A-B`, 프롬프트 `B-C-A` 순서와 prompt 원문이 유지됐다. 첫 서버 내부 HTTPS 폴링 시간 초과는 같은 시각 외부 ready·사후 순서가 정상인 측정 문제였으며, 컨테이너 health와 외부 HTTPS로 분리한 재실행이 모두 PASS했다. 합성 자료는 제거했고 실제 물리 기기는 새로 수행하지 않았다. `OPS-100-001`은 사용자 승인 예외로 유지한다.

1.0.9 P3 후보 `0236ee3018e00b65d634ea6ad928f60cec7d2732`는 GitHub Actions run `34575779766` 재실행의 전체 verify와 네 dev image 게시·서명을 통과했다. 첫 실행의 기존 1.0.8 HTML5 drag 1건 timing 실패는 같은 후보의 로컬 6회와 동일 SHA 전체 재실행에서 통과했고 새 1.0.9 검사는 두 실행 모두 PASS였다. 공개 개발 인수에서 공유 조회의 `sort_rank::text` 별칭이 숫자 rank 정렬을 문자열로 가로채 두 번째 연속 선두 이동을 무효화하던 결함을 재현해 qualified numeric 열 정렬과 갱신 행 확인, 실제 PostgreSQL 회귀로 닫았다. 개발 서버 checkout/build metadata는 같은 SHA의 `1.0.9`, `dev`, `p3`, schema `1002_library_manual_order.sql`, 네 서비스 healthy였고 공개 desktop/mobile 라임·프롬프트 연속 이동→재진입, prompt 원문 불변, long-press/drag 분리, overflow 없음이 PASS했다. 합성 자료는 제거했으며 실제 물리 기기 입력은 새로 수행하지 않았다.

1.0.9 P2 후보 `6bf29c18f86f3d63bed3f9d2954340d3c2d48e04`는 unit/실제 PostgreSQL 305건, migration 19개, Chromium desktop/mobile 316건과 5-project 릴리스 행렬 10건, production image·복원·rollback·보안 검증을 통과했다. GitHub Actions run `34568930374`의 전체 verify와 네 dev image 게시·서명이 PASS했고 개발 서버 checkout/build metadata는 같은 SHA의 `1.0.9`, `dev`, `p2`, schema `1002_library_manual_order.sql`, 네 서비스 healthy였다. 공개 합성 두 owner로 라임·프롬프트 이동/재조회·멱등 replay·stale 409·foreign anchor 404·프롬프트 copy 불변을 확인하고 자료를 제거했다. 실제 물리 기기와 UI gesture는 P3/P4에서 담당한다.

1.0.8 P3 후보 `72370f07b33525b03507a61dfdaf065e547de641`은 실제 PostgreSQL 곡 순서 5건, check·production build, 관련 Chromium PC/mobile 32건과 공개 desktop/mobile 이동·재접속·manual URL·overflow smoke를 통과했다. 공개 연속 선두 이동에서 `sort_rank::text` 출력 별칭이 numeric rank 정렬을 문자열로 가로채던 결함을 재현해 실제 column 정렬과 DB 회귀로 닫았다. GitHub Actions run `34554545058` 재실행은 unit/DB 294 PASS·4 skip, Chromium 316 PASS·36 skip, 5-project 10 PASS와 migration/image/restore/rollback/scans, 네 dev image 게시·서명을 모두 통과했다. 첫 실행의 기존 mobile lyric-flow 1건 timing 실패는 같은 후보의 로컬 6회와 동일 SHA 전체 재실행에서 통과했고 신규 1.0.8 12건은 두 실행 모두 PASS였다. 개발 서버 checkout/build metadata는 후보와 일치했고 `1.0.8`, `dev`, `p3`, schema `1002_library_manual_order.sql`, 네 서비스 healthy였다. 실제 물리 기기는 새로 실행하지 않았으며 P4가 전체 DB·두 탭/오프라인/재시작·지원 브라우저 회귀를 담당한다.

1.0.3 P2 구현 후보 `5e6c7d0fcfec5ae20aaf17807fcf20e6213eadd7`은 전체 unit 176건 PASS(DB 필요 84건은 별도 실행), PostgreSQL 18 관련 28건, migration 빈 설치·반복·legacy upgrade·RLS·차단 rollback, typecheck와 production build를 통과했다. 개발 서버 원격 branch·checkout·환경 `BUILD_ID`가 일치했고 공개 `1.0.3`, `dev`, `p2`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. 합성 공개 smoke에서 문장 raw·mode 저장/복제/검색, 소유권, 구버전 capability 차단과 신규 연결이 PASS였고 합성 자료를 제거했다. P3는 일반 보기/입력에서 원문을 변환하지 않고 명시 변환에서만 preview/confirm/undo를 제공한다.

1.0.1 P1의 자동 P6 감사 100건과 개발 서버·공개 live/ready/auth 기준은 [P1 인수 기록](../../docs/runbooks/1.0.1-phase1-intake.md)에 연결했다. 사용자 PC의 기존 Compose는 healthy지만 앱 `0.7.0`·schema `0701_recent_searches.sql`로 오래되어 현재 결함 판정에서 제외했고, source 갱신 전 DB custom archive와 목록 판독을 확인했다. 사용자가 실제 Windows 입력·재진입 손실과 `+ 새 가사`·`연결 관리` 테마 오류 화면을 제출했다. 최초 손실 경계는 이탈 시 취소되는 지연 composition commit, 테마 원인은 정의되지 않은 `primary-button` selector로 판정했다. P5 후보 `fa06b0ba1c74c314345dbe4eb2fb873ca1d7cb00`의 공개 서버 영구 저장 smoke와 Windows Chrome·Edge 실제 입력이 PASS였다. 양 테마·버튼은 P6에서 같은 후보 SHA로 닫는다.

[현재 Phase](./1.0.0/6phase.md), [검증 수준과 잔여 사항](../../docs/runbooks/1.0.0-phase6-stabilization.md)을 따른다. REVIEW-01~05·07·10의 초안·재시도·취소·템플릿·PWA 경로를 수정했으며 Chromium PC/모바일 회귀와 기존 복구 흐름을 확인했다. 전체 의미 기반 품질/성능/의존성 감사와 실제 기기 인수는 미완료다. 미해결 P0/P1을 0으로 선언하지 않는다.

사용자 요청에 따라 GitHub P6를 사용자 PC로 가져왔다. `.change`의 30개 경로/blob이 원격 후보와 일치함을 확인한 뒤 허가된 폴더만 삭제했다. 로컬 Docker 갱신은 기존 PostgreSQL 볼륨과 비공개 설정을 보존하며 DB 백업 후 진행한다. 공용 개발/운영 서버와 향후 버전 계획은 이번 PC 작업 대상이 아니다.

로컬은 `lyricscloud-local` 한 그룹의 postgres·web·collaboration·worker가 healthy이고 migrate가 exit 0이다. 임시 컨테이너는 제거했으며 live/ready·인증 화면·정적 asset·Google OAuth 시작을 확인했다. PC도 production 웹 빌드를 사용하며, 기존 HTTP OAuth 주소는 명시적인 loopback 전용 opt-in으로 유지한다. 공용/LAN origin은 여전히 HTTPS가 필수다. 실제 로그인 완료는 사용자가 기존 브라우저에서 확인한다.

P6 push 자동 발행은 차단하며 수동 candidate도 공용 tag를 변경하지 않는다. 기존 `v1.0.0`, release manifest, migration, lockfile은 보존한다. `OPS-100-001` 운영 외부 백업 미구축은 별도 승인·실제 복원 인수까지 계속 열려 있다.

P8 구현 후보 `17aa226abe48acee9642d6c539809b915362a28e`은 원격 PR #20과 개발 서버 checkout·build metadata가 일치한다. 공개 ready는 `1.0.1`, channel `dev`, phase `p8`, schema `0901_beta_signup.sql`을 반환했고 postgres·web·collaboration·worker가 모두 healthy였다. dev 발행에서 숫자·Release 계열을 제외하고 승인 tag release에서만 `Release`·`latest`·`Release-latest`를 같은 서비스 build에 묶는 30개 경계 검사를 통과했다. 필수 원격 통합 CI는 저장소 정책대로 P10 후보에서 실행한다.

P9 구현 후보 `565ed50335197855b7d3c14f3ea9e5519e1f838f`는 unit·실제 PostgreSQL integration 250건, 순차 브라우저 회귀 263건과 의도적 제외 31건, release browser matrix, production image·암호화 복원·upgrade/rollback·secret·취약점·관측·성능 예산을 통과했다. 인수 기록을 포함한 `3b05a34468874877043b3c36abdacf216a092565`는 원격 PR #21·개발 서버 checkout·공개 build metadata와 일치하며 channel `dev`, phase `p9`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. `OPS-100-001`은 사용자의 현재 위험 승인 예외로 계속 열어 둔다.

P10 후보 `869e32b8a15c2e1e7524a75ab4d8b4428a925c79`는 원격 CI run `34394222604`의 전체 verify와 네 dev image 발행을 통과했다. 개발 서버 checkout/build metadata가 같은 SHA였고 `1.0.1`, channel `dev`, phase `p10`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. 공개 합성 smoke에서 가사·라임·프롬프트 즉시 이탈·재진입 저장, light/dark의 `＋ 새 가사`·`연결 관리`, 테마 저장, 키보드/focus, 320/390px 모바일, CSP·CSS·service worker가 PASS였고 합성 자료를 제거했다. 사용자 확인 `P4 Google signup PASS`, `P5 Windows Chrome PASS, Edge PASS`, `iOS update PASS, Android update PASS`를 실제 환경 증거로 동결했다. P10은 완료됐으며 사용자가 승인한 main·정식 image·릴리스 서버 실행으로 이동한다. `OPS-100-001`은 명시적 예외로 계속 열려 있다.

1.0.2 P2 구현 후보 `4a8dd97562fe0d1ac400b1799aacbced3285eabf`는 Node 24 unit/typecheck/build, PostgreSQL 18 가입 멱등·관리 CLI·fresh/repeat migration, desktop/mobile Chromium 38건을 통과했다. 원격 PR #24와 개발 서버 checkout/build metadata가 일치했고 공개 live·ready·auth HTTP 200, version `1.0.2`, channel `dev`, phase `p2`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. 완료 문서 자체를 포함한 최종 commit은 동일 절차로 재배포하고 정확한 SHA를 비공개 서버 인벤토리에 남긴다. 중간 원격 CI는 정책대로 생략했으며 필수 전체 CI는 P5 최종 후보에서 실행한다.

1.0.2 P3 후보 `8d01441b6043898ef83745b307fc7f4e814c2a72`는 Node 24 check·production build와 desktop/mobile Chromium의 새 수용 4건·인증/가사/라임 46건을 통과했다. 원격 PR #25와 개발 서버 checkout/build metadata가 일치했고 공개 live·ready·auth·정적 경로, version `1.0.2`, channel `dev`, phase `p3`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. 공개 가입 오류 복귀 동선도 합성 query로 확인했으며 실제 사용자 자료는 사용하지 않았다.

1.0.2 P4 후보 `f67cc3a22168a3f7adfd774604b7c877c03a85c3`는 PostgreSQL 18 migration 2회·unit/integration 248건·beta 4건·관리 CLI, Chromium desktop/mobile 전체 267건과 의도적 31 skip, Chromium/Firefox/WebKit 5-project 10건을 통과했다. 네 production image에서 DB·collaboration 재시작과 durable pending projection·중복 ACK·복원·owner-only logout이 PASS였다. 원격 PR #26과 개발 서버 checkout/build metadata가 일치했고 공개 version `1.0.2`, channel `dev`, phase `p4`, schema `0901_beta_signup.sql`, 네 서비스 healthy였다.

1.0.2 P5 후보 `8d55ddc2a5b2383bc7388a248bb7d66f13a5bd0b`는 GitHub Actions run `34436900678`의 전체 verify와 web·collaboration·migrate·worker 개발 image 게시를 통과했다. 원격 PR #27과 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.2`, channel `dev`, phase `p5`, schema `0901_beta_signup.sql`, 네 서비스 healthy를 확인했다. `/auth`, production 정적 asset, CSP·private no-store·nosniff가 PASS했고 Docker 정리 뒤 volume과 실행 서비스를 보존했다. P1~P5 후보 인수는 완료됐으며 `main`·`v1.0.2`·정식 image 별칭·릴리스 서버는 별도 현재 go/no-go까지 변경하지 않는다.

1.0.3 P4 구현 후보 `611eab02ccd3ba7279a1627e93d92436876657d7`은 실제 PostgreSQL unit/integration 261건, migration 1000, Chromium 전체 306건 중 274 PASS·의도적 31 skip과 발견 후 보정한 접근성 대비 1건의 재감사 PASS를 통과했다. 새 기능은 Chromium PC/mobile 8건, Firefox 4건, WebKit mobile 4건을 통과했다. 원격 PR #32와 개발 서버 checkout/build metadata가 같은 SHA였고 공개 `1.0.3`, channel `dev`, phase `p4`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다. 실제 collaboration container 재시작 전후 capability 연결·동일 document 재접속·문장 raw 조회/복제를 확인하고 합성 사용자를 제거했다. P5는 문서·환경 schema·최종 CI와 같은 SHA 개발 인수를 담당하며 1.0.3 main·정식 image·릴리스 서버는 변경하지 않는다.

1.0.3 P5 후보 `5092d12fc67c83b165bf83cf83210b49d62b4e4a`는 GitHub Actions run `34460759490`의 전체 verify와 web·collaboration·migrate·worker 개발 image 게시·서명을 통과했다. 원격 PR #33과 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.3`, channel `dev`, phase `p5`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. 실제 collaboration 재시작 전후 capability 연결·동일 document 재접속·연속 공백/구두점/줄바꿈 raw 조회·복제가 PASS했고 합성 사용자를 제거했다. P1~P5 후보 인수는 완료됐으며 1.0.3 main·tag·정식 image·릴리스 서버는 별도 release go/no-go 전까지 변경하지 않는다.

1.0.4 P3 구현 후보 `f8b5fb67cd3fefdabfb6e0b6874002b2db78976d`는 Node 24 전체 check·production build와 Chromium PC/mobile 4건을 통과했다. 목록·편집기·가사 자료 패널의 동일 최종 payload, lossless 문장 span, 1,001자 자동/수동 copy 경고를 확인했다. HTML textarea의 CRLF 표시 정규화와 달리 API·자동 clipboard payload는 원본 CRLF 그대로임을 별도로 검증했다. 권한·offline·collaboration restart·지원 브라우저 전체 교차 회귀는 P4에서 수행한다.

1.0.4 P4 후보 `dd638e70051acd74486b4056d66503caffe26311`은 깨끗한 격리 PostgreSQL 18에서 migration 반복과 unit/integration 263건을 통과했고 기존 별도 beta signup 4건만 의도적으로 skip했다. Chromium PC/mobile 전체 310건 중 279 PASS·환경 조건 31 skip, 새 기능 Chromium/Firefox/WebKit 5-project 10건을 통과했다. 첫 교차 실행에서 릴리스 모바일 프로젝트명을 기본 `mobile`로만 판별한 test harness 결함을 찾아 `*-mobile`로 보정했으며 제품 동작이나 assertion은 완화하지 않았다. 실제 물리 기기는 새로 수행하지 않았다.

1.0.4 P5 후보 `6c0aedca7d01270293d14e90dd6912cffe937cff`은 GitHub Actions run `34476629460`의 전체 verify와 네 dev image 게시·서명을 통과했다. 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.4`, channel `dev`, phase `p5`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. collaboration 재시작 전후 같은 문서 재접속과 CRLF·emoji raw 일치가 PASS했고 합성 자료를 제거했다. 최초 CI의 임시 DB 강제 삭제 정리 경쟁은 일반 drop 재시도로 수정해 로컬 3회와 최종 CI에서 닫았다. 1.0.4 P1~P5는 별도 정식 tag 없이 1.0.5의 선행 기준으로 인수한다.

1.0.5 P1은 출발 SHA `508833e5aee43ebcc9d7aecaae1592b655a5460a`에서 기존 line parser·incremental index·CodeMirror decoration·목차/resume·전체/구간 copy·feedback 경로를 조사했다. 첫 콜론 앞의 trimmed 주 이름, 콜론부터 닫는 대괄호 전까지 lossless suffix, 빈 주 이름의 기존 label 호환, occurrence와 resume의 주 이름 사용, LF 직렬화 뒤 최종 payload Unicode code point `> 3000` 비차단 경고를 승인했다. DB/API/CRDT/schema는 바꾸지 않으며 P2가 순수 parser/copy builder 실패 fixture와 구현을 담당한다.

1.0.5 P2 후보 `6dce2e363155ebd0da578a30c9c8185bf12564d5`는 첫 콜론 주 이름과 lossless suffix/range, 빈 주 이름의 기존 인식, suffix-only 편집의 occurrence/id 안정성, CRLF를 LF로 직렬화한 최종 payload의 Unicode code point 2999/3000/3001 경계를 구현했다. 관련 29건과 전체 unit 186건이 PASS했고 DB 필요 84건은 격리 PostgreSQL 검증으로 분리했다. check·production build·migration 2회가 PASS했으며 원격 PR #40, 개발 서버 checkout/build metadata가 같은 SHA였다. 공개 live/ready는 `1.0.5`, channel `dev`, phase `p2`, schema `1000_prompt_modes.sql`과 네 서비스 healthy를 반환했다. 실제 물리 기기·UI 교차 브라우저는 P3/P4에서 수행한다.

1.0.6 P2 후보 `7f87b8af1a5118c2d5eda3a07948e89c1696a215`는 exact-case Extend 정식 marker 줄만 Suno 전체 payload에서 제외하고 부분/송폼 copy·raw 저장 경로를 분리했다. 기본 송폼 단일 source와 독립 줄 change builder, remote prefix 뒤 Yjs 상대 caret·한 transaction/undo·invalid 무변경을 추가했다. 구현 전 copy 2건과 누락 module suite 실패를 확인한 뒤 관련 19건과 전체 unit 195건이 PASS했고 DB 필요 84건은 후속 실제 PostgreSQL 검증으로 분리했다. boundaries·typecheck·production build가 PASS했으며 원격 PR #45와 개발 서버 checkout/build metadata가 같은 SHA였다. 공개 live/ready는 `1.0.6`, channel `dev`, phase `p2`, schema `1000_prompt_modes.sql`과 네 서비스 healthy를 반환했다. UI·지원 브라우저·실제 IME는 P3/P4에서 수행한다.

1.0.6 P3 후보 `4ef7d7f48f43e6259705467bdafbaad68935d4d5`는 CodeMirror 우클릭·메뉴키/`Shift+F10` 요청과 lyric editor의 공통 상대 selection 삽입 명령, 모바일 보이는 버튼, 양 theme 메뉴, Suno/원문 copy 안내를 연결했다. typecheck·production build·Chromium PC/mobile 신규 흐름 7건이 PASS했고 조건별 3건은 의도적으로 skip됐다. 정상·빈 상태·10만 자 실패·비인증·로딩·remote prefix·IME·Escape·단일 undo·서버 reload를 확인했다. 원격 PR #46과 개발 서버 checkout/build metadata가 같은 SHA였고 공개 다크 PC·라이트 모바일 기능 smoke 뒤 합성 자료를 제거했다. 공개 live/ready는 `1.0.6`, `dev`, `p3`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다. 전체 DB/export/revision/offline/지원 엔진/restart는 P4에서 수행한다.

1.0.6 P4 후보 `0d19330f9c8ba800e89b275a22fedf1b9e955693`은 격리 PostgreSQL 18 migration 반복과 unit/integration 275건을 통과했고 별도 beta signup 4건만 조건상 skip했다. Chromium PC/mobile 전체 328건 중 292 PASS·조건부 36 skip, Chromium/Firefox/WebKit 5-project 신규 기능 17 PASS·조건부 13 skip, 접근성 재검증 3건을 통과했다. 이전 metadata 고정 기대값 4건과 dark disabled danger 대비를 최소 수정한 뒤 최종 전체 회귀를 다시 통과했으며 중단한 실행은 PASS로 기록하지 않았다. 원격 PR #47과 개발 서버 checkout/build metadata가 같은 SHA였고 공개 revision·ZIP export exact Extend 원문과 collaboration 재시작 전후 동일 document key·원문을 확인한 뒤 합성 자료를 제거했다. 공개 live/ready는 `1.0.6`, `dev`, `p4`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다. 실제 물리 기기는 새로 실행하지 않았고 최종 원격 CI·dev image는 P5에서 수행한다.

1.0.6 P5 후보 `a37a41dde72974fb37e025788ace768f9d5b6b04`는 GitHub Actions run `34511266182`의 전체 verify와 네 dev image 게시·서명을 통과했다. 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.6`, channel `dev`, phase `p5`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. 공개 revision·ZIP JSON/TXT의 exact Extend 원문과 collaboration 재시작 전후 같은 document key·원문 보존이 PASS했고 합성 자료를 제거했다. 신규 P0/P1·원문 유실·인증 우회·교차 owner 노출·무음 저장 실패는 0건이며, 실제 물리 기기 미실행과 `OPS-100-001` 예외를 유지한 채 승인된 정식 릴리스로 이동한다.

1.0.5 P3 후보 `3649d014163c91b8f74d5b30d0460757bc97ab1c`는 CodeMirror 콜론 이후 범위와 desktop/mobile 목차의 suffix를 저강조하고 주 이름의 접근 가능한 탐색·occurrence를 유지했다. 공통 lyric copy view가 최종 LF payload의 3,001자 안내를 자동·단축키·저장 복구·수동 dialog에 연결했다. 관련 unit 16건, check·production build, Chromium PC/mobile 4건이 PASS했고 suffix 편집/undo/reload, 구간·전체 exact copy, clipboard 거부와 비인증 권한 경계를 확인했다. 원격 PR #41과 개발 서버 checkout/build metadata가 같은 SHA였고 공개 합성 smoke에서 suffix 표시·주 이름 탐색·3,001자 exact copy/비차단 경고가 PASS한 뒤 자료를 제거했다. 공개 live/ready는 `1.0.5`, `dev`, `p3`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다.

1.0.5 P4 후보 `d0ad04d9e74e393809318b05134fe4ef0b54ad33`은 격리 PostgreSQL migration·unit/integration 270건, Chromium PC/mobile 전체 316건 중 284 PASS·조건부 32 skip, Chromium/Firefox/WebKit 신규 기능 11건을 통과했다. 최초 전체 실행에서 구 metadata 기대값·mobile copy 접근 이름·공유 IndexedDB test harness 결함 7건을 찾아 최소 수정했고 같은 전체 회귀를 다시 통과했다. 합성 IME 자동화는 실제 조합 상태가 유지되는 Chromium desktop에 한정했으며 실제 물리 기기는 새로 실행하지 않았다. 원격 PR #42와 개발 서버 checkout/build metadata가 같은 SHA였고 공개 suffix·주 이름 탐색·3,001자 exact copy와 collaboration 재시작 전후 document key·DB 원문 보존을 확인한 뒤 합성 자료를 제거했다. 공개 live/ready는 `1.0.5`, `dev`, `p4`, schema `1000_prompt_modes.sql`, 네 서비스 healthy였다.

1.0.5 P5 후보 `78b3f1bc4c240bbceaddcab33e56af1ae0048aae`는 GitHub Actions push run `34487251707`의 전체 verify와 네 dev image 게시·서명을 통과했다. 개발 서버 checkout·환경 `BUILD_ID`·공개 live/ready가 같은 SHA였고 `1.0.5`, channel `dev`, phase `p5`, schema `1000_prompt_modes.sql`, 네 서비스 healthy를 확인했다. 공개 suffix·주 이름 탐색·3,001자 exact copy와 collaboration 재시작 전후 같은 document key·DB 원문 보존이 PASS했고 합성 자료를 제거했다. 신규 P0/P1·원문 유실·인증 우회·교차 owner 노출·무음 저장 실패는 0건이며, 실제 물리 기기 미실행과 `OPS-100-001` 예외를 유지한 채 승인된 정식 릴리스로 이동한다.
