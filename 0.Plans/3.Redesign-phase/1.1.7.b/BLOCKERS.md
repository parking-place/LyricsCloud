# 1.1.7b 잔여 원인·출시/인수 차단

원격 안정화와 원래 0922 리뷰는 범위가 다르다. 정적 비교의 **미변경 14·부분 대응 5·해결 후보 3**을 현재 b 완료로 읽지 않는다. P3까지 웹 최초 통합은 마쳤으나 22개 원인의 **최종 b 판정은 P4 review로 미완료**다. 웹 코드 통합에서도 손실·거짓 저장·인가·복구 위반을 허용하지 않는다.

## 원인별 판정과 담당

| 원인 | 원격 정적 판정 | b에서 할 일 | 후속 세부 담당 |
|---|---|---|---|
| `BE-01` | 미변경 | P1에서 재현 계약 등록. 통합 후 P4/P5 전에 필수 차단 해소. 미해결이면 review 유지 | [1.2.3 P2](../1.2.3/2phase.md) |
| `BE-02` | 미변경 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.3 P2](../1.2.3/2phase.md) |
| `BE-03` | 미변경 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.3 P3](../1.2.3/3phase.md) |
| `BE-04` | 미변경 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.3 P3](../1.2.3/3phase.md) |
| `ES-01` | 미변경 | P1에서 재현 계약 등록. 통합 후 P4/P5 전에 필수 차단 해소. 미해결이면 review 유지 | [1.2.2 P3](../1.2.2/3phase.md) |
| `ES-02` | 해결 후보 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.2 P2](../1.2.2/2phase.md) |
| `ES-03` | 부분 대응 | P1에서 재현 계약 등록. 통합 후 P4/P5 전에 필수 차단 해소. 미해결이면 review 유지 | [1.2.2 P2](../1.2.2/2phase.md) |
| `ES-04` | 해결 후보 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.2 P4](../1.2.2/4phase.md) |
| `ES-05` | 부분 대응 | P1에서 재현 계약 등록. 통합 후 P4/P5 전에 필수 차단 해소. 미해결이면 review 유지 | [1.2.1 P3](../1.2.1/3phase.md) |
| `ES-06` | 미변경 | P1에서 재현 계약 등록. 통합 후 P4/P5 전에 필수 차단 해소. 미해결이면 review 유지 | [1.2.1 P2](../1.2.1/2phase.md) |
| `ES-07` | 미변경 | P1에서 재현 계약 등록. 통합 후 P4/P5 전에 필수 차단 해소. 미해결이면 review 유지 | [1.2.1 P2](../1.2.1/2phase.md) |
| `UI-01` | 부분 대응 | P1에서 재현 계약 등록. 통합 후 P4/P5 전에 필수 차단 해소. 미해결이면 review 유지 | [1.2.1 P3](../1.2.1/3phase.md) |
| `UI-02` | 부분 대응 | P1에서 재현 계약 등록. 통합 후 P4/P5 전에 필수 차단 해소. 미해결이면 review 유지 | [1.2.2 P4](../1.2.2/4phase.md) |
| `UI-03` | 부분 대응 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.5 P2](../1.2.5/2phase.md) |
| `UI-04` | 미변경 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.5 P3](../1.2.5/3phase.md) |
| `UI-05` | 미변경 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.5 P3](../1.2.5/3phase.md) |
| `UI-06` | 해결 후보 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.5 P3](../1.2.5/3phase.md) |
| `UI-07` | 미변경 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.1 P3](../1.2.1/3phase.md) |
| `UI-08` | 미변경 | 현행 UI 끝 scroll 오클릭 재확인. 필수 조작 실패면 최소 보정. 코발트 배치는 1.2.0 | [1.2.0 P2](../1.2.0/2phase.md) |
| `OPS-01` | 미변경 | P1에서 재현 계약 등록. 통합 후 P4/P5 전에 필수 차단 해소. 미해결이면 review 유지 | [1.2.4 P2](../1.2.4/2phase.md) |
| `OPS-02` | 미변경 | 실제 proxy 조건 확인. 적용되는 P1이면 차단하며, 조건 미해당은 구성 증거 필요 | [1.2.4 P3](../1.2.4/3phase.md) |
| `OPS-03` | 미변경 | 동일 입력 재판정·심각도/영향 기록. 실제 손실/인가/복구 위반이면 차단에 승격 | [1.2.4 P3](../1.2.4/3phase.md) |

## 최소 보정과 범위 변경

원격에 없는 결함의 큰 해결 설계를 자동으로 b에 모두 포함하지 않는다. P1에서 실제 동작/영향과 최소 필요 범위를 정하고 P2/P3의 연관 수정 또는 P4의 명시적 차단 해소 작업으로 해결한다. source·작업 ID·호환·검증·담당을 기록한다. 작은 보정으로 안전하게 해결할 수 없으면 b를 `review`로 두고 추가 계약/범위를 결정하며 1.2.0 착수를 앞당기지 않는다.

ES-03 제목의 queued remote, ES-06 quota/failure latch, ES-07 snapshot 전 수용, ES-01 raw 수렴은 원격의 관련 코드나 테스트 이름만으로 해결되지 않는다. UI-02의 mode draft는 type/target 전환 전체 보호가 아니며 UI-03의 네 목록 수정은 song-link-manager를 포함하지 않는다. PWA guard가 profile 등 모든 입력 상태를 확인하는지도 별도로 검증한다.

P1 심각도와 Phase 1은 다른 표현이다. UI-01의 원문 리뷰 우선순위는 P2지만 실제 입력 손실 조건은 차단이다. OPS-02는 운영 취약성 확정이 아닌 조건부 신뢰 경계 위험이므로 실제 구성의 적용성을 먼저 판정한다. 미확인이나 시험 환경 부재는 해결 근거가 아니다.

OPS-100-001의 외부 backup/RPO 예외는 OPS-01 잠금 코드 결함과 별도로 유지한다. 과거 a의 예외를 b 정식 릴리스에 자동 연장하지 않고 현행 릴리스 정책을 따른다. 원격 C3의 PC 인수와 선행 CI는 새 b의 개발 서버 공개 인수를 대체하지 않는다.

## 단계별 진행 조건

P1은 알려진 기존 결함의 재현 입력·담당 수정 Phase·중간 개발 환경의 노출 제한을 등록한다. P2/P3은 자기 범위의 통합 수용과 신규/악화 회귀를 닫고, 다른 담당 Phase의 등록된 기존 잔여를 근거와 함께 인계한다. 이를 이미 해결한 것으로 표시하지 않는다. P4는 전체 차단의 최종 해소, P5는 그 증거와 동일 SHA 개발 인수를 봉인한다. P4/P5 미해결을 후속 1.2.x에 배정해 통과시키지 않으며, 노출 통제가 불가능한 기존 위험은 해당 중간 Phase도 차단한다.

## P1 등록 결과

P1 후보에서 22개 원인을 모두 **open-at-entry**로 등록한다. source 정적 판정 14 unchanged/5 partial/3 candidate는 b 해결 판정이 아니다. 담당과 입력은 다음처럼 묶되, 각 ID의 최종 결과는 P4에서 행별로 다시 기록한다.

| 담당 | 원인·입력 | P1 차단 규칙 |
|---|---|---|
| P2 | ES-01~07, UI-01/02/07 일부 | 원문 손실·조합 중 확정 저장·늦은 ACK overwrite·복구 불능이 재현되면 다음 Phase 진입 금지 |
| P3 | BE-01~04, UI-03~06, 협업/수명주기 연관 | 인가 확대·중복 mutation·부분 저장 거짓 성공·삭제 영향 오판이면 다음 Phase 진입 금지 |
| P4 | UI-08, OPS-01~03 및 전 22개 재판정 | 실제 proxy/lock/재시작/기기 조건을 포함해 필수 P0/P1과 손실·인가·복구 위반 0건이 아니면 P5 금지 |
| P5 | 전 행의 증거 봉인 | 미확인·대역 시험을 실제 환경 PASS로 바꾸거나 후속 1.2.x로 면제하면 완료 금지 |

중간 개발 배포는 dev alias만 사용하고 정식 tag/Release/latest·릴리스 서버를 움직이지 않는다. native 1150이 있는 환경은 객체와 migration 기록을 보존하며 down/drop 없이 application-first rollback만 허용한다. P1 로컬 fresh DB에서는 디스크의 웹 30 migrations를 두 번 적용하고 통합 Unit 393 PASS/조건부 beta 5 skip을 확인했다. populated a DB와 1150+1151 PC/개발 DB의 실제 보존 검사는 아직 등록 상태이며 P4/P5 증거를 대체하지 않는다.

## 판정 기록

각 ID에 `b 후보 SHA / 재현 입력 / source 정적·함수·HTTP·DB·실기기 증거 / 해결 또는 조건 미해당 이유 / 최소 보정 commit / 수용 결과 / 남은 후속 task`를 기록한다. 필수 P0/P1 또는 손실·거짓 saved·인가·복구 위반이 0건이라는 결론은 시험 후에만 기록한다. 지금은 0건이라고 주장하지 않는다.

### 2026-09-24 P4 부분 판정

- `BE-01`: 현재 b에서 첫 synthetic OIDC discovery 503 뒤 같은 adapter 재시도 실패를 재현했다. 실패 Promise 캐시 해제 후보의 집중 3 PASS이나 실제 Google 장애/복구·전체 CI·개발 인수 미실행이므로 최종 `resolved` 아님.
- `BE-04`: 현재 b에서 생성 가능한 프롬프트 emoji 101자 제목의 삭제 확인 parser 거부를 재현했다. code-point 경계 보정 뒤 domain 4 PASS와 격리 DB/HTTP desktop/mobile 2 PASS이나 전체 CI·개발 인수 전 최종 `resolved` 아님.
- `OPS-01`: 현재 backup shell의 임시 폴더/SIGKILL 재현에서 재시도 2회 exit 1과 잠금 잔존. 여전히 **open blocker**. 구/신 lock 상호 배제·TERM/KILL/재부팅·실제 backup/restore를 함께 검증해야 한다. 나머지 ID는 이 부분 기록으로 해결 판정하지 않는다.

### 2026-09-24 P4 추가 후보 (최종 해결 판정 아님)

OPS-01의 위 **수정 전 재현** 뒤 kernel `flock`+영구 구/신 fence 후보의 shell 22건은 PASS했다. 실제 암호화 backup/restore·운영 전환은 남아 있다. ES-01 raw 중복의 화면/서버 first-occurrence 수렴과 ES-03 문장 IME delta, ES-06/07 공유 저장 실패·초기 편집 차단, BE-02 SSR 세션 비갱신, BE-03 공개 링크 시간차 replay, UI-02 템플릿 이탈 확인 후보를 추가했다. 일회용 DB 전체 Unit/통합 505 PASS/8 조건부 skip과 check는 현재 코드의 부분 증거다. 실제 HTTP/브라우저·권한/재접속·DB/rollback·전체 CI/동일 SHA 개발 검증 전에는 각 ID를 `resolved`로 바꾸지 않는다. 사용자의 실기기 보류 지시는 실제 OS IME/AT·물리 기기만 후속 미실행으로 남기며 다른 원인을 면제하지 않는다.

후속 격리 실행에서 공개 링크 POST replay PC/mobile 4 PASS/2 조건부 skip, 템플릿 입력 보존 2 PASS, selected/guest 기존 수명 2 PASS/2 조건부 skip, prompt 편집 16 PASS, profile/홈 6 PASS다. OPS-01 실제 합성 암호화 backup/restore·RPO·손상/key 거부·제품 smoke 최종 PASS(첫 두 시도는 짧은 `BUILD_ID` 설정 실패)이나 실제 운영 전환은 미실행이다. OPS-02/03의 Caddy 예시 헤더 제거·avatar 전용 상한은 adapter 검증 PASS, 실제 배포 proxy 적용성은 미확인이다. populated 1140→1151·반복·application rollback은 일회용 DB에서 PASS했고 native 1150+1151 실제 환경은 남았다. 이 결과로 P4 전체 원인 해결을 선언하지 않는다.

### 2026-09-24 UI/세션 추가 판정 — 최종 resolved 아님

- `AC-RD-117B-20/23` 신규 복원 차단: native 포함 일회용 DB를 `pg_dump`/복원하면 `0500`의 prompt dictionary `RESTRICT` FK 생성 순서로 합성 계정 삭제가 실패했다. 기존 이행 DB에서는 같은 입력이 성공했다. 데이터와 과거 checksum을 변경하지 않는 `1152` forward migration의 `NO ACTION DEFERRABLE` 뒤 복원 DB 전체 DB Vitest 509 PASS/8 조건부 skip·합성 계정 0건, 단독 dictionary 삭제 23503이다. 같은 DB에서 b image가 만든 프롬프트를 이전 a image가 원문 그대로 조회·export했으며 합성 자료 0건으로 정리했다. 별도 1152 native 복제 DB에서는 이전 native 포함 `0375825` image가 b 작성 프롬프트를 native session/API로 원문·토큰 일치 조회했고 b image의 native route는 404였다. 32 migration/native 테이블 2개 보존, 합성 사용자·세션·자료 0건 정리. 첫 UI variant/ACL/token fixture 실패는 PASS가 아니다. 이는 원래 22개 리뷰 ID에 새 번호를 끼워 넣은 것이 아니라 DB/rollback gate의 별도 발견이며, 실제 PC 설치물·개발 DB 공개 인수 전까지 `review`다.
- 1152 일회용 웹 DB의 전체 production Chromium 회귀는 **432 PASS/54 조건부 skip/0 FAIL**(486건)이다. 원래 22개 각 행의 인수·실제 공개 proxy/개발 서버·CI를 일괄 해결로 간주하지 않는다.

- 최신 추가 후보: 프롬프트 두 탭에서 서버 원문은 정확히 저장됐지만 두 번째 탭이 ACK로 비워진 공동 outbox를 알지 못해 `동기화 중`에 남는 간헐 상태를 재현했다. ACK 삭제 BroadcastChannel 통지와 오래된 상태 조회 폐기 뒤 집중 40회와 전체 Chromium 430 PASS/54 조건부 skip/0 FAIL이다. 이는 `ES-03` 원문·저장 표시 수용의 추가 근거이며 최종 SHA/CI/개발 인수 전에는 resolved가 아니다.
- `ES-05` 추가: 지연된 라임 metadata 저장과 프롬프트 로컬 quota 실패에서 PWA 적용·unload 차단, 메모리 원문 및 서버 미반영을 PC/mobile 2 PASS로 확인했다. 첫 2 FAIL은 GET에 소모된 일회성 test route fixture를 보정한 결과와 구분한다.
- `UI-03`/합성 IME 교차: 연결 관리 역순 HTTP와 문장·제목 조합 회귀를 포함한 5-project 20 PASS. 첫 Firefox 2 FAIL은 `fill()`의 자동 조합 종료로 시험 전제 위반을 이벤트 로그로 확인한 뒤 조합 유지 입력 이벤트로 수정했다. 실제 Firefox/OS IME 입력이나 물리 기기 검증은 아니다. 나머지 22행 최종 판정 및 실제 proxy/CI/개발 인수는 계속 남는다.

- `ES-07`: owner 첫 화면을 선행하던 기존 검사에서는 숨겨졌으나, 새 공유 가사에 작성자가 먼저 들어오면 협업 문서가 아직 없어 편집이 무기한 준비 상태인 것을 PC/mobile에서 재현했다. 활성 grant·가사/삭제 상태를 actor RLS로 확인→owner 문서 생성→actor grant 재확인 후보로 격리 DB 1 PASS, 선진입 브라우저 2 PASS. 최종 SHA·CI·개발 인수 전에는 `resolved`가 아니다.
- `ES-06`: 선택 작성자/공개 게스트 각각 PC/mobile IndexedDB quota 실패 실제 주입 2+2 PASS. 입력 복구·서버 미반영·복원 후 재시도 반영을 확인했다. 첫 게스트 검사 2 FAIL은 화면별 안내 문구 기대 오류이며 수정한 동일 입력 2 PASS다. 실제 기기 저장소 실패는 사용자 보류·미실행이다.
- `OPS-02`: 개발의 실제 경로는 Cloudflare Tunnel→loopback web이고 Caddy는 적용되지 않는다. 공개 읽기/게스트 세션 API의 임의 XFF 첫 값 우선 사용을 공통 Cloudflare IP 우선순위로 보정하고, 격리 HTTP 30+20 요청 뒤 429를 desktop 1 PASS로 확인했다. Cloudflare 실제 edge header와 릴리스 proxy의 적용 여부는 아직 확인하지 않았으며 이 결과로 최종 `resolved` 처리하지 않는다.
- `UI-03`: 연결 관리의 늦은 라임 HTTP 응답→프롬프트 전환을 PC/mobile Chromium에서 2 PASS로 확인했다. 오래된 목록·총수·오류가 표시되지 않는다. 전체 최종 SHA CI/개발 인수 전에는 최종 `resolved`가 아니다.
- native rollback/DB: 별도 일회용 native 1150+1151 DB에 31 migrations→b migrator 반복 PASS; b 합성 가사·export·사진을 이전 1.1.8 C3 웹 image가 보존했고 native session 200/b native route 404 및 사진 owner 200/타 계정 404를 확인했다. synthetic 계정·자료 0건 정리. 첫 beta key 누락 503·시험 해시 오류 401은 PASS 아님. 실제 PC 설치물/개발 배포 rollback과 공개 edge는 별도 미실행이다.
- `OPS-01/02/03` 환경 경계: 일회용 암호화 backup/restore PASS와 개발 proxy의 loopback web/tunnel 구성 확인은 운영 timer·실제 위조 헤더 rewrite PASS가 아니다. b→a 및 위 native 포함 이전 웹 image 일회용 rollback은 PASS이나 실제 PC 설치물·개발 서버 전환은 미실행이다. 실제 개발 DB native 1150+1151의 31 migration·객체/역할·RLS는 읽기 전용 확인했으며 세 환경 앱 수용은 계속 남는다.

- `BE-02`: 실제 SSR `/songs` 조회에서 renewal cookie와 DB 만료 갱신이 없고, 뒤이은 `/api/songs`에서 cookie·DB 만료가 함께 갱신됨을 격리 HTTP/DB desktop 1 PASS로 확인했다. 전체 후보 브라우저와 최종 CI/개발 인수 전까지 확정 아님.
- `UI-03`: 기존 네 목록의 세대 회귀 외에 남았던 연결 관리의 유형/필터/검색 debounce 경합을 최소 보정하고 컴포넌트 단위 3 PASS. 연결 관리 실브라우저 HTTP 역순 주입과 최종 CI는 남는다.
- `UI-08`: 현재 B-1 여섯 칸의 네 번째 예약 위치에 FAB를 맞춘 뒤 production Chromium 모바일 320/360/390/430px×양 테마에서 최하단 scroll·겹침 면적 0·프롬프트 오른쪽 hit-test 8조합 PASS. nav를 viewport 고정으로 바꾸는 코발트 설계가 아니며 실제 OS/키보드/safe-area는 사용자 보류·미실행이다.
- `UI-04/05`: 원래의 목록 복제 표시/네트워크 실패 문제는 b의 해결로 보지 않는다. 1.2.5 배정과 P2 영향 판정을 유지한다. 실제 중복·입력 손실 등 필수 차단으로 악화되면 이 배정만으로 면제하지 않는다.

### 2026-09-24 P4 행별 중간 판정 — 후보 `6994961`, 최종 봉인 아님

아래 `국소 통과`는 각 행의 명시한 대역·DB·브라우저 수준에만 해당한다. 22행 전체의 최종 CI·같은 SHA 개발 공개 인수 및 사용자 보류 실기기 검증을 뜻하지 않는다. `후속 P2`는 현재 원인이 남아 있음을 뜻하며 resolved 표기가 아니다.

| 원인 | 현재 동일 입력·영향 판정 | 남은 인수 |
|---|---|---|
| BE-01 | 첫 OIDC discovery 503→회복 재현 뒤 캐시 보정, adapter 3 PASS | 실제 Google 장애는 미실행; 최종 CI/공개 인수 |
| BE-02 | SSR의 세션 갱신 미소비→cookie 가능한 API 갱신을 HTTP/DB 1 PASS | 최종 CI/공개 인수 |
| BE-03 | 공개 링크 동일 POST 시간차 replay를 PC/mobile 4 PASS, URL 재발급·중복 생성 없음 | 최종 CI/공개 인수 |
| BE-04 | Unicode 제목 정확 일치 삭제를 실제 HTTP/DB PC/mobile 2 PASS | 최종 CI/공개 인수 |
| ES-01 | 동시 raw 이동/삭제의 first-occurrence 화면·서버 투영 및 DB store/ACK 국소 통과 | 실제 장기 네트워크 경쟁·최종 CI |
| ES-02 | 부분 치환·emoji·undo의 채택된 CRDT 회귀와 전체 브라우저 정상 통과 | 겹침 전 범위·실제 OS IME는 별도 |
| ES-03 | 제목/문장 합성 조합과 remote 삽입 5-project 20 PASS; 프롬프트 두 탭 ACK 표시 40회 PASS | 실제 OS IME 사용자 보류; 최종 CI/공개 인수 |
| ES-04 | checkpoint 후 변환 재검사와 기존 historical-sync 브라우저 회귀 통과 | 모든 변환/권한 회수 경쟁은 별도 |
| ES-05 | 라임 PATCH 지연·프롬프트 quota 메모리 입력의 PWA/unload 차단 PC/mobile 2 PASS | 서비스 업데이트 실제 공개 인수 |
| ES-06 | selected/guest 각각 PC/mobile quota 실패·복구·재시도 2+2 PASS | 실제 기기 저장소 실패 사용자 보류 |
| ES-07 | 신규 공유 가사 작성자 선진입 정지 재현→DB 1·PC/mobile 2 PASS | 공개 재연결·최종 CI |
| UI-01 | 프로필 이탈/홈 guard와 미저장 입력의 전체 브라우저 회귀 통과 | 실제 OS back/reload/PWA는 사용자 보류 또는 공개 재검증 |
| UI-02 | 템플릿 형식별 draft와 유형/목록/취소 이탈 확인 브라우저 2 PASS | 최종 CI/공개 인수 |
| UI-03 | 4목록과 song-link-manager query 세대, 지연 HTTP PC/mobile 2 PASS | 실제 공개 지연·후속 확대 UX |
| UI-04 | `source=user`에서 복제 뒤 새 ID가 목록에 나타나지 않고 원본 미리보기가 유지되는 production Chromium 결함 재현 1건. 원문 변경은 없음 | 1.2.5 P3; 신규 자료 선택·focus·정렬 보정 |
| UI-05 | 복제 성공 응답만 브라우저에서 끊은 뒤 재클릭하면 서로 다른 requestId로 서버 복제본이 2개 생성되며, 실패 안내 없이 화면 목록은 원본 1개뿐인 production Chromium 결함 재현 1건 | 1.2.5 P3; 동일 키 재시도·결과 조정·mutation 오류 표시 |
| UI-06 | 그룹 표시/키보드 동일 순서 코드 및 통합 검색 ArrowUp/Down/Enter 브라우저 회귀 통과 | 실제 AT 사용자 보류; 로딩 중 그룹 변동 추가 판정 |
| UI-07 | quick-add 오류가 modal sibling에 남는 source 경로 유지. 입력 손실·인가 확대의 증거는 없지만 오류 읽기 위치 문제는 unresolved P2 | 1.2.1 P3; 실제 AT 사용자 보류 |
| UI-08 | B-1 모바일 320/360/390/430px×양 테마 문서 끝 nav/FAB 겹침 0·hit-test 8조합 PASS | 실제 safe area/키보드 사용자 보류; 1.2.0 코발트 배치 별개 |
| OPS-01 | KILL/동시 잠금 shell 22 PASS, 일회용 암호화 backup/restore·RPO/손상/key 거부 PASS | 실제 timer/운영 전환·최종 CI |
| OPS-02 | 적용 개발 경로 Cloudflare Tunnel→loopback web 확인, 고정 CF-IP/변동 XFF HTTP 30+20회 뒤 429 | 공개 edge에서 spoof/rewrite·배포 SHA 확인 전 조건부 P1 open |
| OPS-03 | Caddy 예시 일반/사진 상한 분리와 `adapt --validate` PASS. 개발 경로에는 Caddy 미적용 | 실제 개발 업로드 경계·릴리스 경로는 별도 판정 |

특히 UI-04/05/07을 전체 b 해결로 쓰지 않는다. UI-04/05 재현은 합성 계정·일회용 DB의 원문을 바꾸거나 권한을 확대하지 않았고 원래 P2의 탐색·중복/오류 안내 영향이 확인됐다. 입력 손실·인가 확대·복구 불능으로 확대된 근거는 없으므로 1.2.5 후속 해결 배정은 유지하되, 새 근거가 나오면 P4 차단으로 승격한다. 이 진단 1건은 제품 통과 시험이 아니며 실행 후 합성 계정을 삭제하고 임시 시험 파일을 제거했다. 나머지 실제 proxy·서비스/PWA·CI/개발 인수 전에는 22행 최종 봉인이나 P5 진입을 선언하지 않는다.
