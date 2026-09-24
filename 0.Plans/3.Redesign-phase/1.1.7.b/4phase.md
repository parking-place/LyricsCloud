# 1.1.7b Phase 4 — 통합 회귀·잔여 차단·DB 호환·되돌림

**상태: 완료 (`complete`, 실제 기기 검증은 사용자 보류)**. P3 문서 인수 SHA `cc4fc5646a395023f1e95b04985ec9da1759c74b`에서 전용 브랜치를 분기했다. 기능 인수 SHA는 `ddc1d7c50a64f8e8467b7aee64627f2dfe13da7d`이며 아래 최종 기록과 [수용 기준](ACCEPTANCE.md) · [통합 맵](SOURCE-MAP.md) · [차단 목록](BLOCKERS.md)을 따른다.

## 목표·진입

b가 안전한 리디자인 출발점인지 독립 경계 시험으로 판정한다.

선행: [P3](3phase.md)의 실제 인수 SHA·실행/미실행 기록. 실제 착수 전에 실행 STATUS에 담당·시작 시각·작업 ID·source SHA·수정 경로를 등록하고 미커밋 변경과 다른 작업자의 결과를 보존한다. 현재 문서는 실제 착수나 완료 기록이 아니다.

## 작업

- [x] `LC-RD-117B-P4-01` 원래 0922 입력과 원격 신규 회귀를 새 b SHA에서 실행해 22개 원인을 선해결/재현/미확인으로 판정한다. 원격 CI 성공이나 후보 코드 존재를 현재 PASS로 쓰지 않는다.
- [x] `LC-RD-117B-P4-02` ES-01 raw move/move·move/remove→store ACK, ES-03 제목/조합, ES-05 volatile guard, ES-06 selected/guest quota latch·원문 복구, ES-07 빈 캐시 bootstrap의 잔여를 검증한다. 현재 재현되는 손실/거짓 저장은 최소 보정과 같은 입력 회귀로 닫고 범위가 커지면 인수를 중단한다.
- [x] `LC-RD-117B-P4-03` BE-01 최초 discovery 실패→회복을 필수로 확인하고 BE-02 SSR/cookie, BE-03 동일 POST expiry/replay, BE-04 Unicode 삭제 확인은 실제 API 결과로 판정한다. 상태/권한/파괴 작업에 영향을 주는 잔여는 차단표에 기록하며 후속 번호만으로 면제하지 않는다.
- [x] `LC-RD-117B-P4-04` OPS-01 KILL 뒤 잠금 회복, 실제 환경에 적용되는 OPS-02 신뢰 proxy와 UI-01/02 입력 보존을 인수 차단으로 확인한다. OPS-03 업로드 경계 등 P2도 영향·재현·후속을 명시하고 OPS-100-001 예외와 코드 결함을 분리한다. 필요한 최소 수정/검사만 b에 편입한다.
- [x] `LC-RD-117B-P4-05` 새 웹 DB·populated 1.1.7a DB·기존 1150+1151 DB의 migration 집합/checksum·native 객체/권한·RLS·원문/사진/export를 검사한다. ready 1151만으로 동등성을 주장하지 않으며 native 1150을 down/drop/재번호화하지 않는다.
- [x] `LC-RD-117B-P4-06` 서비스 재시작·offline 재연결·다중탭/계정 전환·권한 회수·두 build 동시 사용·unknown SW client에서 원문/outbox·cache 비공개·반영 상태를 검사한다. owner/selected/guest 수명과 과거 ACK를 구별한다.
- [x] `LC-RD-117B-P4-07` 자동화 지원 브라우저·크기/테마·확대/forced colors/reduced motion·성능을 인수하고 실제 기기·OS IME·AT는 사용자 지시로 미실행/후속 보류한다.
- [x] `LC-RD-117B-P4-08` 일회용 환경별 application rollback을 검증하고 기존 웹 a 이미지와 native 포함 PC 이미지를 구분한다. 실제 PC 설치물/개발 서버의 강제 downgrade는 미실행으로 명시한다.

## 책임 경로·산출물

통합된 제품 경계의 필요한 최소 보정, tests/격리 DB/브라우저, BLOCKERS/ACCEPTANCE/통합 기록. 현재/원격 경로는 SOURCE-MAP과 실제 착수 SHA에서 확인한다. 공유 파일은 한 작성자가 담당하고 새 파일/타입을 가져올 때 호출자와 회귀 시험을 함께 검토한다.

산출물에는 작업별 원본 commit → 채택 변경 → 현재 후보 SHA를 연결하고, 변경 파일·계약·테스트 입력/결과·제외 사유·미실행·다음 담당을 기록한다. raw 로그·실제 창작물·token·서버 비밀은 공개 문서에 넣지 않는다.

## 검증·실패 조건

AC-RD-117B-19~24 및 WC별 기존 수용. 입력 손실·거짓 저장·인가 확대·복구 불가와 필수 gate 미완료는 P5/1.2.0 진입을 막는다.

실제 함수 fixture·HTTP/DB·브라우저·물리 기기/AT·공개 개발 smoke의 검증 수준을 구별한다. 원격 0375825의 성공은 선행 증거이며 새 b tree의 PASS가 아니다. 테스트는 실제 경계의 수정 전 실패 → 수정 후 성공을 확인하며, 통과를 위해 검사를 삭제하거나 완화하지 않는다.

## 완료·중단·되돌림

[Agent](../../../Agent.md)와 [품질 gate](../QUALITY-GATES.md)의 각 Phase 완료 절차를 적용한다. 필수 CI·동일 SHA 개발 인수 전에는 완료 체크를 하지 않는다. 해당 Phase의 필수 검사 미실행, 새로 도입하거나 악화한 원문 손실·거짓 저장·권한/복구 위반은 `review`로 두고 다음 Phase로 넘기지 않는다. P1에 등록한 기존 차단은 담당 수정 Phase와 인수 조건을 명시해 추적한다. 전체 잔여를 확인하는 P4/P5에서는 필수 차단이 모두 해소되어야 하며 1.2.0으로 넘기지 않는다. 중간 개발 인수가 정식 사용자 공개 승인을 뜻하지 않으며, 기존 위험의 노출을 통제할 수 없으면 앞 단계에서도 중단한다.

되돌림은 [수용표의 환경별 절차](ACCEPTANCE.md)를 따른다. native 1150 down/drop·기존 migration 재작성·초안/outbox 삭제·a 태그 이동은 금지한다. 제품 동작을 바꾸지 않은 문서 수정은 문서 검증으로 기록한다.

다음: [P5](5phase.md).

## 2026-09-24 최신 로컬 회귀·잔여 (최종 인수 아님)

## 2026-09-24 P4 최종 인수 — 기능 SHA `ddc1d7c50a64f8e8467b7aee64627f2dfe13da7d`

이 절은 아래의 날짜별 **당시 진행 기록**보다 나중에 확정한 결과다. 이전의 `review`/미실행 서술을 소급 수정하지 않는다. `BLOCKERS.md`의 22행은 동일 SHA의 국소 회귀·격리 DB·브라우저와 공개 경계 증거로 최종 재판정했다. BE/ES 필수 원문·인가·복구 및 OPS-01/02 적용 개발 경계의 미해결 P0/P1은 0건이다. UI-04/05/07의 기존 P2 UX·중복 복제 결함은 실제 재현되었으며 해결로 표시하지 않고 후속 1.2.5/1.2.1로 유지한다. 새 원문 손실·권한 확대 근거가 나타나면 이 분류를 다시 연다.

- 로컬: 격리 PostgreSQL 전체 Vitest **509 PASS/8 조건부 skip/0 FAIL**, production Chromium **432 PASS/54 조건부 skip/0 FAIL**, 교차 엔진 PC/mobile 합성 IME/지연 HTTP **20 PASS**, `pnpm check`·production build PASS. 1152를 새 웹·populated a·native 1150+1151 복제 DB에 적용·반복하고 migration checksum, native 객체 2개, 역할/RLS/FK, 프롬프트 원문/사진/export 및 복원 DB 계정 cascade를 확인했다. 이전 a/native 포함 image가 b 작성 자료를 읽는 application-first rollback도 일회용 환경에서 PASS했다. 실제 PC 설치물·개발 서버 image downgrade는 위험을 늘리지 않기 위해 실행하지 않았다.
- 원격: [P4 push Actions 35990242886](https://github.com/parking-place/LyricsCloud/actions/runs/35990242886)의 verify 및 web/collaboration/worker/migrate 네 이미지 발행·서명/provenance 모두 SUCCESS, [PR #156 Actions 35991662815](https://github.com/parking-place/LyricsCloud/actions/runs/35991662815)의 verify SUCCESS다. PR에서 publish skip은 정상이고 발행 PASS로 합산하지 않는다. 네 SHA 태그 digest는 순서대로 `066bd4a5f31b35368b67c10a97ce5eee9398d4fb639bac150a212b0c028703de`, `6647f39c5c62eb4525ce300f37412077bd7a0b07994a1b32c8adf6a7fc07afd4`, `0403e674873d77e0b8642d9702e4f2697b232db7259b97211aad418d7a54a386`, `d00667115431a2dd48b94fed63d3bdede9a374c09ce65e302ad1633b509bd4c1`이다.
- 개발: 배포 전 tracked clean·SHA `1626c754d1ebc581f01c4d29873319827be0b6fd`·migration 31건/native 1150·4서비스 healthy를 읽기 전용 확인했다. runbook의 개발 대상에만 위 기능 SHA를 배포했고 checkout/BUILD_ID/공개 live·ready가 `1.1.7b/dev/p4`·schema `1152_prompt_dictionary_cascade.sql`로 일치한다. migration 32건/웹 manifest 31건 checksum 일치, native 1150 객체 2개 보존, prompt dictionary FK `NO ACTION DEFERRABLE INITIALLY DEFERRED`, 네 서비스 healthy·tracked clean이다. 공개 합성 owner의 prompt POST 201/원문 GET 200·타 계정 GET 404, PC 1440/mobile 390 제목·원문 일치, SW 200을 확인했다. 서비스 web/collaboration/worker 재시작 후 healthy·동일 SHA·합성 프롬프트 원문 재조회 200을 다시 확인했다.
- 실제 공개 edge: user-supplied XFF를 바꿔도 공개 읽기 제한과 게스트 세션 제한이 각각 429에 도달해 유지됐다. 사용자가 `CF-Connecting-IP`를 직접 위조한 요청은 Cloudflare가 앱 도달 전에 403으로 막았으므로 이를 앱 429 검증과 혼동하지 않는다. 개발 경로는 Tunnel→loopback web이라 Caddy 예시 업로드 상한은 적용되지 않는다. 릴리스 proxy/운영 timer·백업 저장소는 미검증이며 별도 운영 인수 대상이다.
- 공개 합성 계정 두 개 삭제 과정에서 정리 스크립트가 SQL의 완료 문구를 ID로 오인해 자체 종료 코드 1을 냈으나, 별도 읽기 전용 재조회에서 두 계정·session·resource·prompt **모두 0건**을 확인했다. 임시 테스트 스크립트와 일회용 clone DB/container를 정리했다. 사용자/운영 자료와 기존 DB volume은 삭제하지 않았다.
- 사용자 보류: 물리 Windows/iOS/Android, 실제 OS IME·가상 키보드·AT는 **미실행**이고 자동화 결과를 PASS로 대체하지 않는다. 외부 Google 장애, 실제 PC 앱 rollback, 개발 서버 live downgrade, 운영 backup/timer, 장기 부하도 미실행이다. 이들은 정식 발행 승인이 아니며 P5 인계와 후속 환경 검증에 남긴다.

따라서 P4 기능 SHA의 로컬·원격·개발 공개 필수 gate를 완료하고 P5에 인계한다. 문서 전용 후속 SHA는 기능 SHA와 별도 기록한다. `main`·정식 tag/image·릴리스 서버·native migration을 변경하지 않았다.

- `AC-RD-117B-20/23` 복원 안전성: native 1150+1151 이력이 있는 일회용 DB를 `pg_dump`/복원하자 기존 `0500`의 prompt-token→dictionary `ON DELETE RESTRICT DEFERRABLE` 외래키가 sibling account cascade보다 먼저 검사되어, 프롬프트 토큰이 남은 합성 계정 삭제가 실패했다. 원본 이행 DB의 같은 합성 입력은 삭제 성공했으며 복원 DB의 전체 Vitest는 본문 509 PASS이나 5개 suite 정리 실패여서 전체 FAIL이다. 첫 DB 이름 가드 거부와 ACL 누락 복제의 권한 실패도 fixture 실패로 별도 보존한다.
- 기존 `0500` 파일/checksum을 고치지 않고 forward `1152_prompt_dictionary_cascade.sql`에서 참조 제약을 `NO ACTION DEFERRABLE INITIALLY DEFERRED`로 재생성한다. 참조 중 dictionary 단독 삭제는 계속 23503, 계정 삭제 시 토큰·dictionary의 함께 cascade는 성공했다. populated 1151→1152·반복 migration 회귀 PASS, 복원 native DB의 migrator 2회 PASS, native 1150 테이블 2개·migration 32건 보존 및 전체 DB Vitest **509 PASS/8 조건부 skip/0 FAIL**; 합성 사용자·토큰·dictionary는 0건이다. 새 웹 DB도 1152 적용·반복 PASS. 같은 복원 DB에서 새 b 웹 image가 만든 프롬프트를 이전 a 웹 image가 원문 그대로 조회·ZIP JSON export해 application-first rollback PASS했고 합성 계정·session·자료 0건으로 정리했다. 첫 웹 시작의 OIDC 시험 설정 누락 503은 PASS 아님. 별도 1152 native 복제 DB에서는 이전 native 포함 `0375825` 웹 image readiness/native session 200, b image readiness 200/native route 404, b에서 만든 프롬프트를 이전 native image가 제목·원문·토큰 2개 그대로 조회했다. 합성 계정 삭제 후 관련 자료 0건·32 migration/native 테이블 2개 보존, 시험 DB/컨테이너/키 파일 정리. 첫 UI variant 500, 누락 ACL POST 503, 짧은 native token 401은 fixture 실패이며 최종 PASS가 아니다. 실제 PC 설치물 rollback·개발 DB migration은 미실행이다.
- 현재 후보의 readiness/latest manifest는 1152로 올렸고 b dev 후보 validator 1002·check·production web build PASS. 1005 최종 validator는 P5 추적 문서 부재로 ENOENT 실패했으므로 P4 PASS로 쓰지 않는다. 이전 P1~P3 1151 공개 결과는 당시 이력으로 유지하고 새 후보의 CI·signed image·동일 SHA 개발 인수 전에 현재 개발 DB를 변경하지 않는다.
- 1152를 적용한 일회용 웹 DB와 production web image의 전체 Chromium E2E는 **432 PASS/54 조건부 skip/0 FAIL**(486건, 14.8분)이다. 합성 브라우저/DB 결과이며 실제 공개 proxy·OS IME/기기/AT·동일 SHA 개발 서버 인수를 대체하지 않는다.

- `ES-03`/동시 탭 상태: 서버의 정확한 문장 원문 반영 뒤에도 다른 탭이 공유 IndexedDB outbox 삭제를 통지받지 못해 `동기화 중`에 머무는 간헐 실패를 재현했다. prompt 문서 채널의 ACK 삭제 통지와 비동기 `report()` 세대 검사를 추가한 뒤 desktop/mobile 집중 40회 PASS. 최신 제품 코드의 전체 production Chromium은 **430 PASS/54 조건부 skip/0 FAIL**(484건)이다.
- `ES-05`: 가로챈 라임 metadata PATCH가 완료될 때까지 업데이트 적용·beforeunload를 막고 회복 뒤 재허용, 프롬프트 IndexedDB quota 오류 뒤 메모리 원문/실패 표시·업데이트 적용·beforeunload 차단·서버 원문 불변을 PC/mobile **2 PASS**로 확인했다. 첫 실행 2 FAIL은 `times: 1` 가로채기가 GET에 소모된 시험 fixture 오류이며 제품 FAIL로 판정하지 않는다.
- `UI-03` 연결 관리 지연 HTTP와 위 두 회귀를 포함한 Chromium/Firefox/WebKit PC·모바일 대리 **5-project 20 PASS**. 첫 매트릭스의 Firefox 합성 조합 2 FAIL은 Playwright `fill()`이 `compositionend`를 자동 발생시켜 조합 유지 조건이 깨진 것으로 이벤트 로그에서 확인했다. 원격 조합 경쟁을 유지하는 input 이벤트 fixture로 바꿔 동일 기대값 20 PASS했다. 물리 기기·실제 OS IME·AT PASS가 아니다.
- 최신 제품 후보의 Docker 격리 DB 전체 Vitest **509 PASS/8 조건부 skip**, check·production build PASS. PWA 신규 검사와 합성 IME fixture를 포함한 최종 정확한 tree의 원격 전체 CI·서명 image·개발 공개 인수는 미실행이다. 22행 최종 판정, 세 DB의 전체 앱 계약, 실제 proxy·서비스 재시작/두 build/PWA/rollback이 남아 P4 `review`다.

## 2026-09-24 추가 구현 후보·검증 경계

### 2026-09-24 공동 작성 선진입·저장 실패·환경 rollback 추가

- native 1150+1151 일회용 DB는 1.1.8 C3 migrator 31건 적용→b migrator 반복이 PASS했다. b `7da5235` 웹 image에서 만든 합성 가사를 native 포함 이전 웹 image `0375825`가 그대로 조회·export했고 native session API 200/b native route 404를 확인했다. b의 합성 프로필 사진도 이전 웹 image owner 200/외부 계정 404·프로필 참조 보존 PASS. 합성 계정·session·photo 0건으로 정리하고 시험 컨테이너를 중지했다. 첫 시도의 beta key 파일 누락 503과 두 번째 시험 토큰 해시 인코딩 401은 fixture/환경 오류이며 최종 성공으로 소급하지 않는다. 실제 PC 설치물 rollback·개발 서버 이전 image 전환은 미실행이다.
- `UI-03`: 연결 관리에서 라임 HTTP 응답을 늦춘 뒤 프롬프트로 전환한 PC/mobile production Chromium 2 PASS; 오래된 목록·결과 수·오류가 새 유형에 침입하지 않았다. 기존 컴포넌트 단위 역순/페이지 경계 3 PASS와 별도 증거다.

- `OPS-02`: 개발 proxy는 Caddy가 아니라 Cloudflare Tunnel→loopback web임을 확인했다. 공개 읽기·게스트 세션 IP 제한의 `X-Forwarded-For` 우선순위를 기존 공통 함수의 `CF-Connecting-IP` 우선순위로 정렬했다. 임의 XFF/고정 CF-IP 30+20회 뒤 429인 격리 HTTP desktop 1 PASS(모바일 조건부 skip), production web build와 check PASS. [Cloudflare 헤더 문서](https://developers.cloudflare.com/fundamentals/reference/http-headers/)의 edge 값 계약에 의존하며 실제 공개 edge의 header rewrite·운영 proxy는 미검증이다.

- `ES-07`: 소유자가 `/lyrics`를 먼저 열지 않은 신규 공유 가사에서 작성자가 선진입하면 협업 문서 미생성으로 편집 준비가 끝나지 않는 실제 PC/mobile 재현을 확인했다. 유효 grant·가사/삭제 상태를 actor RLS로 먼저 확인하고 owner 문서를 생성한 후 actor 권한을 재검사하도록 최소 보정했다. 격리 PostgreSQL의 grant 전/후/회수 후·원문 snapshot 1 PASS, 선진입 브라우저 PC/mobile 2 PASS다. 최종 동일 tree 전체 인수 전에는 해결 완료로 표시하지 않는다.
- `ES-06`: IndexedDB `put` quota 오류를 선택 작성자 PC/mobile 2건과 공개 게스트 PC/mobile 2건에 실제 주입했다. 서버 원문 미변경·복구 내용/복사 버튼·편집 잠금·저장소 복원 후 재시도 반영을 확인했다. 첫 게스트 2건은 선택 작성자 문구를 게스트 화면에 적용한 검사 기대 오류로 FAIL, 게스트 고유 실패 문구를 검증하도록 수정한 후 2 PASS다. 실제 OS/기기 저장소 오류는 미실행이다.
- b 웹 image에서 만든 합성 가사를 a 웹 image로 읽은 일회용 DB의 application-first rollback은 동일 원문 조회·export PASS, 합성 계정/자료 0건 정리했다. native 포함 이전 웹 image 검사는 위 추가 결과와 같고 실제 PC 설치물/개발·운영 서버 전환은 미실행이다. 개발 DB의 31 migration 지문/native 객체·FK/RLS/역할은 읽기 전용 확인했지만 세 DB 유형의 전체 앱 수용, 실제 proxy 위조 헤더, 최종 CI/서명 image/동일 SHA 개발 공개 인수는 남는다.

- 사용자는 1.2.0까지 진행하고 **실제 기기 검증만 후속으로 보류**하도록 지시했다. Windows/iOS/Android 물리 기기·OS IME·AT는 미실행으로 남기고 자동화 브라우저를 대체 PASS로 기록하지 않는다. 다른 필수 gate는 그대로다.
- `OPS-01`: 백업의 stale `mkdir` 잠금을 kernel `flock`으로 전환하고 영구 `.backup.lock` symlink로 구/신 실행을 상호 배제했다. legacy 잠금 디렉터리가 이미 존재하면 자동 제거 없이 fail closed·운영 사전 확인을 요구한다. SIGKILL/동시 시도/회복 및 백업 shell **22 PASS**, 이미지 안 `flock` 존재 확인. 실제 암호화 backup/restore와 운영 환경 전환은 미실행이다.
- `ES-01`: raw Y.Array 동시 이동/이동-삭제의 first-occurrence projection을 화면·서버에서 공유하고 실제 PostgreSQL store ACK/projection 테스트를 추가했다. `ES-03`은 문장 조합 종료를 제목과 같이 기준 문자열+원격 queue의 delta 병합으로 변경했다. `ES-06/07`은 selected/guest 저장 실패 latch·메모리 복구 표시와 선택 공유 첫 snapshot 전 편집 불허 후보를 추가했다. 단위·DB 수렴은 통과했으나 실제 브라우저/재연결/권한 경쟁의 최종 수용 전이다.
- `BE-02`: 쿠키를 발급할 수 없는 SSR page 조회가 세션 갱신을 소비하지 않도록 하고 갱신 가능한 API 순서를 단위 회귀로 고정했다. `BE-03`: 공개 링크의 요청 identity에서 매 시도 달라지는 절대 만료 시각을 분리하고 기존 receipt 호환·주소 원문 유실 안내를 추가했다. 실제 같은 HTTP POST 시간차 재시도는 테스트를 추가했으나 아직 실행하지 않았다. `UI-02`: 템플릿 형식별 draft 보존에 더해 유형/목록/새 작성/취소의 명시 폐기 확인을 추가했으며 브라우저 수용 전이다.
- 현재 후보 전체 Docker Node 24.20.0/pnpm 11.25.0 `pnpm check` PASS, 일회용 `lyricscloud_test`의 전체 Vitest **505 PASS/8 조건부 skip**, 백업 shell **22 PASS**, `git diff --check` PASS. 조건부 skip은 beta 환경 검사이며 PASS로 합산하지 않는다. 실제 HTTP/UI/백업·세 DB 유형/rollback·22원인 행별 최종 판정·전체 원격 CI/네 signed image/동일 SHA 개발 공개 인수는 남았다. 따라서 P4 `review`, P5·1.2.0 미착수다.

## 2026-09-24 추가 격리 HTTP·브라우저·백업·proxy 결과

- 중간 보존 SHA `e3d38d25b4b65f775dc4086a53f07d589e749c99`를 `[skip ci]`로 P4 원격 브랜치에 push하고 원격 SHA 일치를 확인했다. 이는 P4 최종 CI가 아니다. 동일 코드의 production web build PASS.
- 일회용 PostgreSQL `lyricscloud_test`와 격리 Chromium에서 공개 링크 동일 POST 재시도 PC/mobile **4 PASS/2 조건부 skip**(replay URL null·이전 link ID 유지), 템플릿 mode/취소/유형 전환 입력 보존 **2 PASS**, selected/guest 기존 권한·복구 **2 PASS/2 조건부 skip**, prompt editor **16 PASS**, profile/홈 경계 **6 PASS**. 합계 **30 PASS/4 조건부 skip**이며 새 공유 저장 실패·첫 snapshot 지연 주입과 실제 OS IME는 별도 미실행이다. 첫 브라우저 실행은 시험 채널 변수 누락으로 서버가 시작하지 못했고 설정 보정 후 위 결과를 얻었다.
- `OPS-01`: 일회용 source/restore DB·합성 자료·age key를 사용한 암호화 backup/restore script가 최종 **PASS**: 예약 backup 2개, 보존/RPO, 저장소·용량·손상·잘못된 key 실패, owner 격리·검색·CRDT 지문·제품 smoke. 첫 두 시도는 짧은 이미지 별칭 `BUILD_ID`가 production runtime의 40자리 SHA 규칙에 맞지 않아 readiness 503이었고, 동일 image를 실제 commit SHA로 태그한 최종 재실행에서 PASS했다. 실제 운영 저장소/timer/재부팅은 검증하지 않았다.
- `OPS-02/03`: Caddy 예시는 호출자 제공 `CF-Connecting-IP`·`X-Real-IP`를 upstream에서 제거하고 Caddy 정규화 `X-Forwarded-For`를 사용하도록 보정했다. 일반 2MB와 avatar PATCH 2,200,000-byte 상한을 분리했고 Caddy 2.10.2 `adapt --validate` PASS. 실제 개발/릴리스 proxy 설정과 공개 위조 헤더 요청은 확인하지 않았으므로 OPS-02 실제 적용성·OPS-03 운영 동작은 미판정이다.
- populated 1140→1151 반복, legacy/provider 분리·사진 RLS·application-first rollback/recovery를 일회용 DB에서 PASS했다. 로컬 기본 DB는 읽기 전용으로 migration 20개·최대 1000임을 확인했고 1150/1151 DB가 아니므로 변경하지 않았다. 기존 native 1150+1151 환경과 세 DB 유형 전체 비교는 남았다.

## 2026-09-24 전체 브라우저 재검사·UI 잔여 최소 보정

- 일회용 `lyricscloud_test`의 첫 전체 Chromium은 **421 PASS/49 조건부 skip/2 FAIL**이었다. 실패 두 건은 기존 PWA 회귀가 UI-02의 새 템플릿 취소 확인창을 승인하지 않아 PC·모바일에서 이전 기대를 적용한 것이다. 확인창을 명시적으로 승인하도록 검사 입력을 갱신했고 같은 PC·모바일 집중 **2 PASS**했다. 첫 실패를 PASS로 소급하지 않는다.
- UI-03의 남은 `song-link-manager`에 query 세대 검사·전환 중 추가 로드 잠금과 오래된 성공/오류 무시를 추가했다. 유형/필터/검색 debounce 역순 응답의 실제 컴포넌트 단위 **3 PASS**. 아직 해당 연결 관리의 실제 HTTP 지연 주입 브라우저 수용은 별도다.
- UI-08의 현재 B-1 모바일 6칸 nav에서 고정 FAB가 잘못된 프롬프트 칸을 가로채는 조건을 최소 CSS로 보정했다. 실제 production 브라우저에서 문서 하단 scroll 후 320/360/390/430px×light/dark **8조합의 겹침 0·프롬프트 끝 hit-test PASS**(mobile 프로젝트 1 PASS/desktop 조건부 1 skip). 이는 실제 iOS/Android·OS 확대/가상 키보드 검증을 대체하지 않는다.
- 수정 후보의 전체 Chromium은 **424 PASS/50 조건부 skip/0 FAIL**(474개)이다. 이 build 뒤 UI-03 effect unmount 세대 정리 1줄을 추가했으므로 완전히 같은 최종 tree의 전체 CI 인수는 아직 남았다. 최신 코드의 격리 DB 포함 전체 Vitest는 **508 PASS/8 조건부 skip**, `pnpm check`·production web build PASS다. SSR page→API 세션 쿠키/DB 갱신 순서 집중 HTTP는 desktop **1 PASS/mobile 조건부 1 skip**이다.
- UI-04/05의 템플릿 복제 표시·네트워크 reject는 별도 1.2.5 범위로 유지하며 b 완료로 기록하지 않는다. OPS-02/03의 실제 배포 proxy, 기존 1150+1151 DB와 환경별 rollback, 공유 저장 실패·재연결 최종 주입, 22개 행별 판정, 최종 CI·네 signed image·동일 SHA 개발 인수는 남아 P4 `review`다.

## 2026-09-24 착수 기록

- 담당 Codex, 작업 `LC-RD-117B-P4-01~08`. P3 문서 인수 SHA `cc4fc5646a395023f1e95b04985ec9da1759c74b`에서 `phase/1.1.7b-p4-regression-blockers`를 분기했고 tracked worktree는 깨끗했다. 기능 기준 SHA는 `1626c754d1ebc581f01c4d29873319827be0b6fd`다.
- 원래 `.private/0922` review 재현 입력과 공개 BLOCKERS 22개를 현재 b 코드에서 다시 판정한다. 사용자 제공 실기기/OS IME/AT 증거는 현재 없으며 대리 자동화로 PASS 처리하지 않는다. `main`·정식 tag/image·릴리스 서버·native 1150/1151·보호 계획 문서는 변경하지 않는다.

## 2026-09-24 부분 보정·중단 증거

- `BE-01`: 새 로컬 OIDC provider가 첫 discovery 503을 반환한 뒤 같은 adapter의 재시도가 실패하는 수정 전 회귀 **1 FAIL**. 실패 Promise만 해제하고 진행 중 요청·성공 구성은 공유하도록 고친 후 OIDC 집중 **3 PASS**. 실제 Google 제공자 장애/복구는 실행하지 않았으며 전체 CI·개발 인수 전 해결 확정이 아니다.
- `BE-04`: code point 101/UTF-16 202인 정상 프롬프트 제목이 trash parser에서 거부되는 수정 전 회귀 **1 FAIL**. 정확한 제목 비교는 그대로 두고 길이 단위만 맞춘 후 domain 집중 **4 PASS**. 격리 PostgreSQL/production Chromium에서 프롬프트 생성→soft delete→틀린 제목 409→정확한 제목 영구 삭제 200→조회 404가 desktop/mobile **2 PASS**. 첫 HTTP 시도의 곡 101자 제목 생성 400은 프롬프트 결함을 검사하지 못한 fixture 오류로 PASS에 포함하지 않는다.
- Docker Node 24.20.0/pnpm 11.25.0 `pnpm check`·production web build PASS, 일반 Unit **376 PASS/128 DB 조건부 skip**. `OPS-01` 격리 백업 shell SIGKILL 후 재시도 두 번 exit 1·잠금 잔존으로 **재현**, 실제 DB dump/암호화·운영 backup을 실행한 결과는 아니다. 단순 lockfile 교체는 구/신 실행 혼용 배제를 증명하지 못하므로 적용하지 않았다.
- 나머지 22개 원인별 최종 판정·필수 P0/P1 해소, 세 DB 환경·application rollback, 실제 OS IME/Windows/iOS/Android 물리 기기/AT는 미실행이다. 사용자가 실기기/증거를 현재 제공하기 어렵다고 답했다. 전체 P4 CI·signed image·같은 SHA 개발 서버 인수도 하지 않았다. 이 상태는 `review`이며 체크박스·P5·1.2.0을 완료로 진행하지 않는다. P3 기능 SHA `1626c754d1ebc581f01c4d29873319827be0b6fd`가 개발 서버에 유지된다.
