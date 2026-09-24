# LyricsCloud 개발 상태

```yaml
current_version: "1.2.0"
current_phase: "../3.Redesign-phase/1.2.0/3phase.md"
state: "in_progress"
owner: "Codex"
started_at: "2026-09-23"
updated_at: "2026-09-25"
next_planned_version: "1.2.0"
next_planned_phase: "../3.Redesign-phase/1.2.0/4phase.md"
next_action: "1.2.0 P3 편집·자료 4탭·설정·공유·복구 화면에 Chroma를 적용하고 기존 원문/저장/권한을 자동·공개 브라우저에서 검증한다; 실제 기기/OS IME/AT는 후속 미실행"
```

## 2026-09-23 현재 순서 — 1.1.7b 선행 통합

### 2026-09-25 — 1.2.0 P3 착수

P2 완료 문서 인수 `f68d9a56c8be7413e0de96bd5705233ed080502a`의 깨끗한 worktree에서 `phase/1.2.0-p3-editor-resources`를 분기했다. 담당 Codex, 작업 `LC-RD-120-P3-01~06`. 책임 경로는 기존 가사/라임/프롬프트 편집·자료 4탭·곡 대시보드/새 항목·설정/프로필·공유/기록/복구 컴포넌트의 Chroma 표현, `apps/web/src/app/chroma.css`와 관련 PC/mobile E2E다. CodeMirror/Yjs·원문/IME·draft/outbox·owner/role/capability·DB/API 계약은 유지한다. P3의 CI·signed image·정확한 SHA 개발 공개 인수 전에는 완료/P4 착수로 기록하지 않는다. 실제 기기·OS IME·AT는 사용자 지시로 미실행/후속 보류, main·정식 tag/image·릴리스 서버는 변경하지 않는다.

### 2026-09-25 — 1.2.0 P2 완료·P3 인계

기능 SHA `f4c95883ca885a6769539d34a93df3ec6b29a1d6`의 [push Actions 36025310880](https://github.com/parking-place/LyricsCloud/actions/runs/36025310880)은 verify·네 signed dev image/provenance SUCCESS, [PR #159 Actions 36025367395](https://github.com/parking-place/LyricsCloud/actions/runs/36025367395)는 verify SUCCESS다. 원격 branch SHA 일치, 로컬 Unit/DB **511 PASS/8 조건부 skip**, B1 전체 Chromium **432 PASS/62 조건부 skip**, Chroma 집중 **12 PASS**, 장문 기존 예산 **2 PASS**다. P2는 코발트 opt-in 토큰·공통 도크/모바일 더보기·실제 소유자 자료 홈과 목록/검색 표현을 구현했고 DB/API/편집 저장 계약은 변경하지 않았다. 구 B1 상단바 74px 단언의 Chroma 선택 실행 **1 FAIL**과 P2 전 성능 상대 기준 미실측은 숨기지 않고 P4 분리 인수로 남겼다.

같은 SHA의 개발 배포 뒤 첫 Chroma web 재생성은 health 단계 실패, B1 복귀 후 web 전용 `--no-deps` 재생성은 PASS했다. 현재 checkout/BUILD_ID/공개 live·ready는 `1.2.0/dev/p2`, schema 1152, 네 서비스 healthy·Chroma runtime이다. 공개 합성 계정 PC/mobile × light/dark의 홈·목록·검색 **4문맥/20 route**, 가로 넘침/브라우저 오류/HTTP 오류 0을 확인하고 합성 계정·session을 삭제했다. 최초 공개 검사 스크립트의 인벤토리 라벨·production 보안 쿠키 오용 실패는 최종 PASS에 합산하지 않는다. 기존 DB·볼륨·secret 보존. 실제 Windows/iOS/Android 기기·OS IME·AT는 사용자 지시로 후속 미실행, P3~P5 미완료이며 main·정식 tag/image·릴리스 서버 변경 없음.

### 2026-09-24 — 1.2.0 P2 착수

P1 문서 인수 `400416577490ee8e6a3bc64d6ce6688f0e9ce9b5`의 깨끗한 worktree에서 `phase/1.2.0-p2-chroma-shell-lists`를 분기했다. 담당 Codex, 작업 `LC-RD-120-P2-01~06`. 코발트 light/dark 토큰과 공통 PC 도크·모바일 탐색, 실제 데이터 홈·곡/라임/프롬프트 목록·검색/최근/즐겨찾기 등 P2 화면 스타일과 320~1440px/fallback 검증을 담당한다. P1 기능·계약 SHA `84761ae1ca25f1b5e5dd808e772d1a062066cd57`의 CI/동일 SHA 개발 인수를 기준으로 삼고 P2 CI·개발 인수 전에는 P2 완료/P3 착수로 기록하지 않는다. 편집기 저장·권한·DB/API 계약과 보호 목업·native 보류를 유지한다. 실제 물리 기기·OS IME·AT는 사용자 보류/미실행이며 main·정식 tag/image·릴리스 서버는 변경하지 않는다.

### 2026-09-24 — 1.2.0 P1 완료·P2 인계

기능·계약 SHA `84761ae1ca25f1b5e5dd808e772d1a062066cd57`의 [push Actions 36004281225](https://github.com/parking-place/LyricsCloud/actions/runs/36004281225)는 verify·네 signed dev image/provenance PASS, [PR #158 Actions 36004313192](https://github.com/parking-place/LyricsCloud/actions/runs/36004313192)는 verify PASS다. Unit/DB **509 PASS/8 조건부 skip**, owner Chromium **432 PASS/54 조건부 skip**, release browser matrix **10 PASS**. 207개 목업 기능 ID의 route/기존 컴포넌트 매핑, 코발트 토큰/전환/복귀 계약과 실제 제품/runtime/private package `1.2.0` 전환을 인수했다. 최종 P5 릴리스 문서 validator 1005는 아직 미통과이며 P1 PASS로 대체하지 않는다.

개발 서버의 배포 스크립트가 같은 SHA로 정상 종료했다. checkout/BUILD_ID/공개 live·ready `1.2.0/dev/p1`, schema 1152, 네 서비스 healthy, 공개 `/auth`·production CSS·build label PASS다. 첫 CSS 시험은 첫 asset만 검사하는 probe 문제로 FAIL이었고 전체 CSS를 대상으로 고친 재검사는 PASS했다. DB·volume·secret 및 기존 화면/저장/권한 계약을 변경하지 않았다. P2/P3의 코발트 실제 UI, P4 회귀/접근성/성능, P5 최종 인수는 아직 완료가 아니다. 실제 Windows/iOS/Android 기기·OS IME·AT는 사용자 보류/미실행이며 자동화 대리를 실기기 통과로 적지 않는다. main·정식 tag/image·릴리스 서버 변경 없음.

### 2026-09-24 — 1.2.0 P1 착수

1.1.7b 문서 인수 `e8ce777fcee83396166d0afcf76ecbd932440406`의 깨끗한 worktree에서 `phase/1.2.0-p1-contract-baseline`을 분기했다. 제품 동작 출발점은 [b HANDOFF](../3.Redesign-phase/1.1.7.b/HANDOFF-TO-1.2.0.md)의 기능 SHA `acd2bd99876740debf426c401fe7157713f8b854`이고 v1.1.7a/원격 C3는 출처로만 유지한다. 담당 Codex, 작업 `LC-RD-120-P1-01~06`; route/기능 207 ID 대응·코발트 토큰/셸 전환·입력/rollback·버전/Phase/manifest의 실제 1.2.0 전환을 담당한다. P1 CI/네 signed image/동일 SHA 개발 공개 인수 전에는 완료나 P2 착수로 기록하지 않는다. 실제 물리 기기·OS IME·AT는 사용자 지시로 미실행/후속 보류, native 1.1.8~1.1.14와 main·정식 tag/image·릴리스 서버는 변경하지 않는다.

### 2026-09-24 — 1.1.7b P5·웹 통합 완료, 1.2.0 P1 진입 대기

기능 SHA `acd2bd99876740debf426c401fe7157713f8b854`에서 18 WC의 선별 통합과 22원인/24 수용의 적용 개발 경계 판정을 봉인했다. [push Actions 35997349571](https://github.com/parking-place/LyricsCloud/actions/runs/35997349571)은 Unit/DB **509 PASS/8 조건부 skip**, Chromium **432 PASS/54 조건부 skip**, release matrix **10 PASS**와 verify·네 signed dev image/provenance SUCCESS, [PR #157 Actions 35997369606](https://github.com/parking-place/LyricsCloud/actions/runs/35997369606)은 verify SUCCESS다. 서비스별 digest·실패/미실행 구분은 [P5 최종 인수](../3.Redesign-phase/1.1.7.b/5phase.md)에 있다.

같은 SHA의 개발 checkout/BUILD_ID/공개 live·ready는 `1.1.7b/dev/p5`·schema 1152, 네 서비스 healthy·DB 32 migration/native 1150 이력·객체 2개 보존이다. 공개 합성 곡/가사/프롬프트 생성·원문·PC/mobile, 타 계정 404, 선택 공유 200→회수 404, export/trash/SW 200, 서비스 재시작 뒤 곡 원문 재조회 PASS다. 합성 두 계정·session/resource/prompt는 삭제 후 0건, 임시 검사 스크립트는 제거했다. 로컬 Docker `pnpm check`는 의존성 저장소 불일치로 시험 시작 전 중단됐고 원격 동일 SHA verify가 이를 대체 실행했다. 첫 DB 확인 SQL 형변환 오류도 수정한 읽기 전용 재조회 결과와 구분한다.

사용자 지시로 실제 Windows/iOS/Android 기기·OS IME·AT는 **미실행/후속 보류**다. UI-04/05/07 P2, 외부 Google 장애·운영 backup/timer·릴리스 proxy·실제 PC 설치물 rollback·`OPS-100-001`도 정식 발행 PASS가 아니다. `main`·annotated b tag·Release/latest·릴리스 서버는 변경하지 않았다. 1.2.0의 구현 시작점은 [HANDOFF](../3.Redesign-phase/1.1.7.b/HANDOFF-TO-1.2.0.md)의 위 기능 SHA이며, 뒤따르는 문서 전용 SHA는 구별한다.

### 2026-09-24 — 1.1.7b P5 착수

P4 문서 인수 `53ed14f45f063919d87cc59e8e4213863222c7e4`의 깨끗한 worktree에서 `phase/1.1.7b-p5-final-handoff`를 분기했다. 담당 Codex, 작업 `LC-RD-117B-P5-01~08`. P4 기능 SHA `ddc1d7c50a64f8e8467b7aee64627f2dfe13da7d`와 개발 배포를 기준으로 18 WC·22 원인·24 수용의 최종 증거, dev 후보/정식 미승인, release 문서·manifest와 1.2.0 인계를 검토한다. P5 코드/문서·필수 CI/서명 image·동일 SHA 개발 인수 전에는 b 완료 또는 1.2.0 착수로 표시하지 않는다. 사용자 보류 실제 기기/OS IME/AT와 `main`·정식 tag/image·릴리스 서버 비변경을 유지한다.

### 2026-09-24 — 1.1.7b P4 완료·P5 인계

기능 SHA `ddc1d7c50a64f8e8467b7aee64627f2dfe13da7d`의 로컬 격리 DB Vitest **509 PASS/8 조건부 skip**, production Chromium **432 PASS/54 조건부 skip**, 교차 엔진 **20 PASS**, `pnpm check`·production build PASS다. [push Actions 35990242886](https://github.com/parking-place/LyricsCloud/actions/runs/35990242886)는 verify·web/collaboration/worker/migrate signed image/provenance 전부 SUCCESS, [PR #156 Actions 35991662815](https://github.com/parking-place/LyricsCloud/actions/runs/35991662815)는 verify SUCCESS다. 네 image digest와 시험/실패 구분은 [P4 최종 인수](../3.Redesign-phase/1.1.7.b/4phase.md)에 기록했다.

같은 SHA를 개발 서버에 배포해 checkout/BUILD_ID/공개 live·ready `1.1.7b/dev/p4` 및 schema `1152_prompt_dictionary_cascade.sql`, migration 32건/웹 manifest checksum·native 1150 객체 2개·FK를 확인했다. 네 서비스 healthy, 공개 합성 owner prompt 저장/재조회·다른 계정 404·PC/mobile 화면 일치, 서비스 재시작 뒤 같은 원문 재조회 PASS다. 공개 edge에서 XFF 변경 중에도 읽기/게스트 429 제한이 적용됐고 임의 CF-IP 헤더는 Cloudflare 403으로 앱 도달 전에 거부됐다. 합성 계정 두 개와 관련 session/resource/prompt가 전부 0건임을 별도 읽기 전용 확인했다. 정리 스크립트의 반환 코드 1은 삭제 후 SQL 완료 문구를 오인한 검사 오류이며 데이터 잔존은 아니다.

22원인 최종 판정에서 적용 개발 경계의 필수 P0/P1 미해결 0건, UI-04/05/07의 기존 P2는 미해결/후속이다. 실제 Windows/iOS/Android·OS IME·AT는 사용자 지시로 **미실행/후속 보류**이고 외부 Google 장애·운영 backup/timer·릴리스 proxy·실제 PC 설치물/개발 image 강제 rollback도 PASS가 아니다. `main`·정식 tag/image·릴리스 서버는 변경하지 않았다. P5는 문서 봉인과 최종 계약/공개 smoke를 새 Phase에서 진행한다.

### 2026-09-24 — P4 최신 로컬 통합·교차 엔진 후보

프롬프트 두 탭의 원격 문장 병합 뒤 두 번째 탭이 공동 IndexedDB outbox의 ACK 삭제를 통지받지 못해 `동기화 중`에 머무는 간헐 오류를 재현했다. ACK 뒤 문서별 BroadcastChannel 알림과 오래된 비동기 상태 조회 결과 폐기를 보정했다. 서버의 정확한 원문 저장을 확인한 뒤 두 탭 모두 `방금 저장됨`이 되는 집중 desktop/mobile 40회 PASS, 같은 제품 코드의 전체 production Chromium **430 PASS/54 조건부 skip/0 FAIL**(484건)이다. 그 뒤 추가한 테스트 전용 PWA 휘발 입력 guard의 첫 실행은 GET이 일회성 요청 가로채기를 소비한 fixture 오류로 2 FAIL; 조건 수정 뒤 desktop/mobile **2 PASS**다. Firefox의 합성 IME 첫 매트릭스는 `fill()`이 조합 종료 이벤트를 자동 발생시켜 2 FAIL/18 PASS였고, 조합을 유지하는 입력 이벤트 fixture로 수정한 동일 5-project 매트릭스는 **20 PASS**다. 실제 OS IME/기기는 사용자 지시로 미실행이다.

최신 제품 후보의 Docker 전체 DB Vitest **509 PASS/8 조건부 skip**, `pnpm check`·production web build PASS. 새 시험 파일의 타입 검사와 최종 전체 CI는 별도 확인한다. 22개 원인 행별 최종 판정, 환경별 실제 proxy·세 DB의 전면 수용·서비스/PWA/rollback 교차, 필수 CI·네 signed image·동일 SHA 개발 공개 인수가 남아 있다. 따라서 P4 `review`, P5·1.2.0 미착수이며 개발 서버는 P3 SHA에 그대로 있다.

### 2026-09-24 — 백업 복원 DB의 계정 삭제 차단 발견·1152 순방향 보정 후보

native 1150+1151 일회용 DB를 `pg_dump`/복원한 독립 컨테이너에서 전체 시험 본문 **509 PASS**였으나, 기존 `0500`의 prompt dictionary `ON DELETE RESTRICT`가 복원된 외래키 생성 순서에서 합성 계정 cascade 삭제를 막아 5개 suite가 정리 실패했다. 같은 합성 계정/프롬프트 토큰으로 원본 이행 DB는 삭제 성공, 복원 DB는 실패를 재현했다. 기존 migration 수정·테이블/자료 삭제 없이 `1152_prompt_dictionary_cascade.sql`이 해당 FK를 `NO ACTION DEFERRABLE INITIALLY DEFERRED`로 바꾸도록 했다. 참조 중인 dictionary 단독 삭제는 계속 거부하고 계정 cascade는 허용한다. 별도 migration 회귀 **PASS**, native 이력 복원 DB에 1152 적용·반복 **PASS**, native 1150 테이블 2개와 32개 migration 보존, 그 DB의 전체 Vitest **509 PASS/8 조건부 skip/0 FAIL**, 합성 사용자·토큰·dictionary 0건이다. 첫 DB 이름 가드 실패와 ACL 생략 복제 실패, 수정 전 정리 실패는 최종 PASS에 포함하지 않는다.

현재 웹 기준 schema는 후보 `1152`이며 이전 P1~P3 개발 서버의 `1151` 기록은 당시 사실로 유지한다. 새 웹 DB에도 1152 적용·반복 PASS, `pnpm check`·production web build·개발 후보 manifest validator 1002 PASS. validator 1005는 실행했으나 P5 최종 추적 문서 부재로 ENOENT 실패했으며 P5 완료 검증이 아니다. 복원 DB에서는 새 b 웹 image가 만든 합성 프롬프트를 이전 a 웹 image가 동일 원문으로 조회하고 ZIP JSON export하여 application-first rollback PASS; 합성 사용자·세션·자료 0건 확인 후 일회용 웹/DB 컨테이너와 임시 export를 정리했다. 첫 웹 시작은 `OIDC_TEST_FIXTURE` 누락으로 인증 API 503이었고 올바른 시험 설정 뒤 결과만 PASS다. 1152 적용 일회용 웹 DB에서 전체 production Chromium E2E **432 PASS/54 조건부 skip/0 FAIL**(486건, 14.8분)을 완료했다. 실제 개발 migration/배포·최종 CI 전에는 P4 `review`다.

같은 날 별도 native 1150+1151 일회용 DB를 다시 복제해 1152 적용 후 이전 native 포함 `0375825` 웹 image와 새 b 웹 image를 병행했다. 두 readiness 200, 이전 native session 200/새 b native route 404, b가 만든 합성 프롬프트의 이전 native `GET` 200·제목/원문/토큰 2개 일치, 32 migration·native 테이블 2개 보존을 확인했다. 합성 계정 삭제 뒤 웹/native session·prompt·token·dictionary·resource 모두 0건이었고 시험 컨테이너·복제 DB·임시 synthetic key 파일을 제거했다. 첫 컨테이너의 잘못된 UI variant 500, ACL을 생략한 DB 복제의 POST 503, 짧은 native token 401은 fixture 실패로 별도 기록하며 최종 PASS에 포함하지 않는다. 실제 PC 설치물·개발 서버 이전 image 전환은 미실행이다.

22개 원인 행별 P4 중간 판정을 BLOCKERS에 기록했다. 별도 production Chromium/일회용 DB 진단에서 UI-04/05는 `source=user` 템플릿 복제 성공 응답 유실 후 재클릭 시 서버 복제본이 2개 생기고 화면에는 원본만 남는 결함으로 재현됐다(진단 1건; 제품 PASS 아님). 원문·권한은 바뀌지 않아 기존 P2/1.2.5 후속 배정을 유지하며, 필수 복구/인가 위반이 확인되면 P4 차단으로 승격한다. 진단용 합성 계정·템플릿 0건 및 임시 시험 파일 제거를 확인했다. 실제 proxy·서비스/PWA 교차·최종 CI·동일 SHA 개발 인수 전에는 P4 `review`다.

### 2026-09-24 — 공유 첫 진입·저장소 실패 주입과 rollback 추가 증거

UI-03 연결 관리의 실제 지연 HTTP를 주입해 라임 요청 중 프롬프트 전환 시 오래된 응답이 목록·결과 수·오류를 덮지 않음을 PC/mobile production Chromium **2 PASS**로 확인했다. `7da5235012264c5a72afea96a72108a72515f5a3` 중간 `[skip ci]` commit은 P4 원격 브랜치 SHA 일치를 확인했으며 필수 CI는 미실행이다.

native 1150+profile 1151을 포함한 별도 일회용 DB에 1.1.8 C3 migration 31건을 적용하고 현행 b migrator 반복을 PASS했다. 같은 DB에서 b 웹 image `7da5235`가 만든 합성 가사를 이전 native 포함 1.1.8 웹 image `0375825`가 원문 그대로 읽고 export했으며, native 읽기 세션 200과 b의 native API 404를 확인했다. b가 저장한 synthetic 프로필 사진도 이전 image에서 소유자 200/타 계정 404·프로필 참조 유지로 PASS했다. 합성 사용자·세션·사진은 cascade 후 0건이고 시험용 웹 컨테이너 2개를 중지했다. 최초 두 시도는 시험 환경의 beta key 파일 누락으로 API 503, 이어 시험용 토큰 해시 인코딩 오류로 401이었으며 설정/fixture를 바로잡은 최종 검사가 PASS다. 이 일회용 DB 검사는 실제 PC 앱 업데이트나 기존 개발 DB 배포가 아니다.

공개 공유 읽기·게스트 세션의 IP 속도 제한은 기존에 `X-Forwarded-For` 첫 값을 `CF-Connecting-IP`보다 먼저 사용했다. 개발 경로가 Caddy 없이 Cloudflare Tunnel→loopback 앱임을 읽기 전용으로 확인하고, 두 API를 기존 공통 클라이언트 키 함수의 Cloudflare 우선순위에 맞췄다. 임의로 바뀌는 전달 체인과 고정된 Cloudflare IP를 넣은 격리 HTTP에서 읽기 30회·게스트 세션 20회 다음 요청이 429인 **1 PASS/모바일 조건부 1 skip**, production web build·`pnpm check` PASS다. 이는 애플리케이션 헤더 선택 검사이며 공개 edge의 실제 헤더 정규화·운영 proxy 구성 PASS는 아니다. [Cloudflare의 헤더 설명](https://developers.cloudflare.com/fundamentals/reference/http-headers/)에 따라 실제 edge→origin 경계의 별도 확인을 남긴다.

P4의 선택 공동 작성자 선진입에서, 소유자가 편집기를 먼저 열지 않아 `sync_documents`가 아직 없는 경우 공유 화면이 편집 가능 상태로 진입하지 못하는 결함을 실제 브라우저로 재현했다. 활성 grant·가사 존재를 actor RLS로 검사한 뒤 owner 문서를 생성하고, 생성 후 actor 권한을 다시 확인하도록 보정했다. grant 전·회수 후 비공개와 최초 본문 snapshot을 일회용 PostgreSQL 통합 **1 PASS**, 작성자 선진입 PC/mobile **2 PASS**로 확인했다. 별도로 IndexedDB quota 실패를 PC/mobile 선택 작성자 **2 PASS**, 공개 게스트 **2 PASS**로 주입해 입력 복구 표시·읽기 전용 전환·서버 미반영·저장소 복원 후 재시도 반영을 확인했다. 첫 게스트 검사 2건은 선택 작성자용 상태 문구를 잘못 기대해 실패했고, 게스트 화면의 실제 실패 안내 문구로 수정한 동일 입력이 2 PASS다. 실기기·OS IME/AT 결과는 아니다.

추가로 Docker Node 24의 첫 검사용 이미지에서 `pnpm check` PASS, 전체 DB Vitest **506 PASS/8 조건부 skip**을 확인했다. 이 이미지에는 최근 연결 관리 단위 검사 3건이 없어 전체 원본을 다시 이미지로 만들고 `pnpm check`와 전체 DB Vitest **509 PASS/8 조건부 skip**을 확인했다. 그 뒤 공개 API IP 우선순위 2파일은 별도 check·production build·집중 HTTP PASS이며 최종 tree의 전체 CI는 아직 필요하다. 로컬 일회용 b→a application rollback은 b가 만든 합성 가사를 기존 a 웹 image가 같은 DB에서 읽고 export함을 확인하고 합성 자료를 제거했다. native 포함 이전 웹 image 검사는 위 추가 결과와 같고 실제 PC 설치물 rollback은 미실행이다. 개발 DB는 읽기 전용으로 31 migration·native 1150/프로필 1151 객체·RLS/역할을 확인했으나 세 유형의 전체 앱 수용과 실제 proxy 위조 헤더 검사는 남았다. 따라서 P4 `review`, P5·1.2.0 미착수다.

### 2026-09-24 — P4 전체 브라우저·DB 재검사와 남은 gate

`1.1.7b` P4의 일회용 PostgreSQL/production Chromium 전체 검사는 첫 **421 PASS/49 조건부 skip/2 FAIL**(새 템플릿 취소 확인을 기존 테스트가 승인하지 않음) 후 현재 계약에 맞는 PC·모바일 집중 2 PASS, 수정 후보 전체 **424 PASS/50 조건부 skip/0 FAIL**로 확인했다. UI-03 남은 연결 관리의 역순 응답 단위 3 PASS, UI-08 모바일 320/360/390/430px×양 테마 하단 nav/FAB 실제 브라우저 겹침·hit-test 8조합 PASS, BE-02 SSR page→API 세션 갱신 HTTP/DB 1 PASS다. 최신 worktree의 격리 DB 전체 Vitest **508 PASS/8 조건부 skip**, `pnpm check`·production web build PASS. 전체 브라우저 build 뒤 UI-03 unmount 정리 1줄이 추가됐으므로 최종 동일 tree CI/이미지 인수를 대체하지 않는다. 기존 native 1150+1151 DB·실제 proxy·공유 실패 주입·22원인 최종 판정·rollback·최종 CI/네 signed image/동일 SHA 개발 인수가 남아 `review`, P5·1.2.0 미착수다. 물리 기기/OS IME/AT는 사용자 보류의 미실행이다. `main`·릴리스 서버·개발 P3 배포는 유지한다. [P4 기록](../3.Redesign-phase/1.1.7.b/4phase.md)을 따른다.

### 2026-09-24 — 1.2.0까지 진행 지시·1.1.7b P4 추가 후보

사용자가 1.2.0까지 진행하되 실제 기기 검증은 나중으로 미루라고 명시했다. 이 예외는 물리 기기·실제 OS IME·AT의 **미실행 보류**이지 대리 자동화 PASS가 아니다. 다른 P4/P5 원인·DB/rollback·브라우저·CI/동일 SHA 개발 인수는 면제되지 않으므로 현재 `review`와 P5/1.2.0 미착수를 유지한다. 현재 브랜치의 미확정 후보로 OPS-01 kernel flock+구/신 잠금 fence, ES-01 raw prompt 동시 이동 store 수렴, ES-03 문장 조합 delta, ES-06/07 공유 편집 내구성·준비 상태, BE-02 SSR 읽기 전용 세션 조회, BE-03 안정된 공개 링크 요청 hash/재시도 안내, UI-02 템플릿 내부 이탈 확인을 보정했다. Docker Node 24/pnpm 11.25 전체 check, 일회용 PostgreSQL `lyricscloud_test` 전체 Unit/DB **505 PASS/8 조건부 skip**, OPS-01 shell **22 PASS**. 실제 HTTP/브라우저, 실제 암호화 backup/restore, 세 DB 유형·rollback, 22원인 최종 판정, 전체 CI·signed image·동일 SHA 개발 인수는 미완료다. 정식 제품 버전·개발 서버 P3 SHA·main·릴리스 서버는 변경하지 않았다.

같은 후보의 후속 격리 실행에서 production web build PASS, 공개 링크 동일 POST 재시도 desktop/mobile **4 PASS/2 조건부 skip**, 템플릿 draft desktop/mobile **2 PASS**, 공유 selected/guest 기존 수명 **2 PASS/2 조건부 skip**, prompt editor **16 PASS**, profile/홈 경계 **6 PASS**를 확인했다. Caddy 예시는 `CF-Connecting-IP`/`X-Real-IP` 제거와 avatar PATCH 전용 2,200,000-byte 제한으로 보정하고 Caddy 2.10.2 adapter 검증 PASS; 실제 배포 proxy의 헤더 신뢰 경계는 미확인이다. 일회용 DB에서 1151 populated 1140→1151 반복·application-first rollback/recovery PASS. 전체 암호화 backup→손상/잘못된 키 거부→restore→제품 smoke는 **최종 PASS**다. 첫 두 backup smoke 시도는 짧은 이미지 별칭을 production `BUILD_ID`로 전달해 readiness 503이었고, 40자리 동일 commit SHA로 이미지 태그를 바로잡은 뒤 PASS했다. 로컬 기본 DB는 읽기 전용 조회에서 migration 20개·최대 1000이며 1150/1151 환경이 아니므로 변경하지 않았다. 기존 native 1150+1151 실제 환경·세 유형 전체 동등성, 나머지 22원인, 원격 CI/개발 인수는 여전히 미완료다.

### 2026-09-24 — 1.1.7b P4 착수

P3 문서 인수 SHA `cc4fc5646a395023f1e95b04985ec9da1759c74b`의 깨끗한 worktree에서 `phase/1.1.7b-p4-regression-blockers`를 분기했다. 담당 Codex, 작업 `LC-RD-117B-P4-01~08`; 현재 b 기능 기준은 P3 SHA `1626c754d1ebc581f01c4d29873319827be0b6fd`, 원래 0922 review 입력과 BLOCKERS 22개를 독립 재판정한다. P4 코드·DB 환경 행렬·rollback·필수 CI·이미지·개발 인수는 아직 미완료다. 사용자는 실제 Windows/iOS/Android 기기·OS IME·AT 자료를 현재 제공하기 어렵다고 답했다. 자동화 대리 결과를 실기기 PASS로 쓰지 않으며 필수 gate가 남으면 P4 `review`에서 멈춘다.

### 2026-09-24 — 1.1.7b P4 부분 보정·review

BE-01 최초 OIDC discovery 503 뒤 같은 adapter의 재시도 실패, BE-04 생성 가능한 이모지 101자 프롬프트의 삭제 확인 거부를 현재 b tree의 신규 회귀에서 각각 수정 전 FAIL로 재현했다. 실패 Promise만 캐시에서 해제하고 동시 요청/성공 캐시는 유지하는 최소 수정, 삭제 확인 제목을 생성 정책과 같은 code-point 길이로 검사하는 최소 수정을 적용했다. 수정 후 집중 Unit 7 PASS, Docker `pnpm check`·production web build PASS, 일반 Unit **376 PASS/128 DB 조건부 skip**, BE-04 실제 격리 DB HTTP desktop/mobile **2 PASS**다. 최초 HTTP 시험은 원인 대상이 아닌 곡 제목 101자 fixture가 생성 400으로 거부된 것이며, 원래 리뷰 대상인 프롬프트로 정정한 실행만 PASS다. 실제 외부 Google 장애/복구는 미실행이다.

OPS-01은 현재 backup shell의 격리 SIGKILL 재현에서 뒤이은 실행 두 번 모두 실패하고 잠금이 남아 **여전히 재현**된다. 구/신 잠금 혼용·실행 중 백업 보호를 해결하지 않은 단순 파일 잠금 교체는 적용하지 않았다. 나머지 원인별 최종 판정, 세 DB 환경·rollback, 실제 OS IME/물리 기기/AT(사용자 현재 제공 어려움), 전체 P4 CI·signed image·동일 SHA 개발 인수는 미완료다. 따라서 P4는 `review`, P5와 1.2.0은 시작하지 않는다. [P4 부분 증거](../3.Redesign-phase/1.1.7.b/4phase.md)를 따른다. 기존 P3 개발 배포·DB·`main`·정식 tag/image·릴리스 서버는 유지했다.

### 2026-09-24 — 1.1.7b P3 완료·P4 진입 대기

P3 기능 SHA `1626c754d1ebc581f01c4d29873319827be0b6fd`의 [PR #155 Actions 35876265426](https://github.com/parking-place/LyricsCloud/actions/runs/35876265426) verify PASS, [push Actions 35876233972](https://github.com/parking-place/LyricsCloud/actions/runs/35876233972) verify·네 signed dev image PASS다. 원격 Unit/DB **494 PASS/8 조건부 skip**, Chromium **419 PASS/49 조건부 skip**, release browser matrix **10 PASS**와 네 서비스의 SHA·P3 dev/Dev 별칭 동일 digest·서명/provenance를 확인했다. 같은 SHA 개발 서버의 checkout·BUILD_ID·공개 live/ready `1.1.7b/dev/p3`, 네 서비스 health, migration 31건 지문/native 1150/profile 1151 보존을 확인했다. 공개 합성 owner로 PC 목록/즐겨찾기, owner export/비로그인 차단, 모바일 곡, 휴지통 smoke PASS 후 계정·자료를 제거했다. 첫 두 smoke의 selector 오류는 테스트 도구를 보정하고 최종 재실행으로 검증했으며 제품 PASS로 소급하지 않는다. P4/P5의 22개 원인 필수 해소, 세 DB 유형·rollback, 실제 OS IME/물리 기기/AT는 미완료이고 사용자는 현재 실기기 제공이 어렵다고 답했다. [P3 최종 증거](../3.Redesign-phase/1.1.7.b/3phase.md)를 따른다. `main`·정식 tag/image·릴리스 서버·native 파일은 변경하지 않았다.

### 2026-09-23 — 1.1.7b P3 착수

사용자 재개 지시로 P2 문서 인수 SHA `dcfa2b894e04b988076df08d490874af34195eb9`에서 `phase/1.1.7b-p3-data-lists-recovery`를 분기했다. 담당 Codex, 작업 `LC-RD-117B-P3-01~09`; source head `c230c024aeb0297b1c130e3f3e8b507a43a7e871`/기능 `0375825fe004fc74869250eefa14add267c4b3ae`를 기준으로 apps/collaboration, packages/auth/database/domain/editor copy, web list/search/song/trash/dialog/style 및 대응 시험을 검토한다. 착수 당시에는 P3 코드·CI·image·개발 인수가 미완료였다. 기존 P2 개발 SHA와 자료·보호 계획 문서·`main`·정식 tag/image·릴리스 서버를 보존한다.

### 2026-09-23 — 1.1.7b P3 로컬 후보

WC-07/08/10(곡)/11/13~16의 source 변경과 대응 시험을 선택 통합하고 P2 고유 보정은 유지했다. Docker check·production build, 일반 Unit **374 PASS/128 조건부 skip**, 격리 DB 관련 **21 PASS/8 조건부 skip + beta DB 8 PASS**, production Chromium PC/mobile 전체 **419 PASS/49 조건부 skip/0 FAIL**이다. 최초 DB 이름 제한 및 Playwright 채널 설정 오류는 수정한 실행 환경에서 재검증했고 제품 PASS로 소급하지 않는다. source의 red→green은 선행 증거이고 현재 b tree의 post-port 검증과 구별한다. 원격 CI·네 signed dev image·동일 SHA 개발 공개 smoke는 아직 미실행이므로 P3는 `in_progress`다. [P3 로컬 기록](../3.Redesign-phase/1.1.7.b/3phase.md)을 따른다.

사용자 지시로 다음 제품 계획을 **[1.1.7b 웹 안정화 통합](../3.Redesign-phase/1.1.7.b/README.md)**으로 변경했다. 실제 순서는 **1.1.7a → 1.1.7b → 1.2.0 → 1.2.1~1.2.8**이다. b에서 1.1.8 웹 안정화 코드·회귀를 먼저 통합하고 같은 SHA의 개발 인수까지 완료한 뒤, 그 b SHA에서 코발트 리디자인을 시작한다. 완료된 1.1.7a tag·운영 배포 기록은 유지한다. 2026-09-23 P1을 `phase/1.1.7b-p1-contract-runtime`의 기능 SHA `a04bbcb6358aa1682e57fb48491e53be3f87f5d1`에서 완료하고 P2를 착수했다. 1.1.8~1.1.14 네이티브 잔여 계획은 계속 보류한다.

### 2026-09-23 — 1.1.7b P2 완료, P3 착수 전 일시 중단

P2 기능 SHA `3915a71f5abd9116bdd097ee4cc45cc6c71eadf0`에서 WC-01~06/09/10(가사)/12를 통합했다. 최종 로컬 전체 Chromium **410 PASS / 44 skip / 0 FAIL**, 격리 DB 관련 19 PASS, check·production build PASS다. [PR #154 verify](https://github.com/parking-place/LyricsCloud/actions/runs/35866450768)와 [push verify·네 signed dev image](https://github.com/parking-place/LyricsCloud/actions/runs/35866445486)가 같은 SHA에서 PASS했다. 개발 checkout·BUILD_ID·공개 live/ready `1.1.7b/dev/p2`, 네 서비스 health, 기존 migration 31건 지문/native 1150/profile 1151 보존을 확인했다. 합성 owner로 공개 PC·모바일 가사 저장/재진입, Suno 수동 모델 재진입, PWA 온라인/모바일 넘침 없음 PASS 후 계정을 삭제·부재 확인했다. 이전 실패/취소 CI는 아래 이력처럼 PASS로 소급하지 않는다. 실제 OS IME·물리 기기/AT, 세 DB 유형·rollback·22개 원인 최종 판정과 P3~P5는 미완료다. 사용자 요청으로 **P3 브랜치·코드·배포는 시작하지 않고 여기서 멈춘다.** `main`·정식 tag/image·릴리스 서버는 변경하지 않았다. [P2 최종 증거](../3.Redesign-phase/1.1.7.b/2phase.md)를 따른다.

### 2026-09-23 — 1.1.7b P2 로컬 후보 (당시 기록)

P2는 전용 `phase/1.1.7b-p2-editing-save-pwa`에서 로컬 통합 후보를 만들었다. WC-01/02/03/04/05/06/09/10(가사)/12의 source `0375825`를 선택 인수하고 ES-03 제목 조합·PWA 프로필 dirty 경계를 추가 보정했다. Node 24/pnpm 11의 check·production web build, 일반 Unit **326 PASS / DB 조건부 122 skip**, 격리 DB 관련 19 PASS, 격리 Chromium desktop 9 PASS/mobile 8 PASS·desktop-only PWA 1 skip, 기존 Suno/템플릿 추가 브라우저 2 PASS다. 실제 OS IME/기기/AT와 P2 전체 CI·signed image·같은 SHA 개발 공개 인수는 미완료다. 따라서 P2 상태는 `in_progress`이고 P3로 넘어가지 않는다. [P2 로컬 증거](../3.Redesign-phase/1.1.7.b/2phase.md)를 따른다.

첫 전체 로컬 Chromium 검사는 **406 PASS / 44 skip / 4 FAIL**(옛 복구본 형식 기대 2, PWA 표시 전 모바일 기준 이미지 2)이었고, 해당 후보의 원격 PR·push Actions는 취소했다. 집중 6건 PASS 뒤 두 번째 전체 검사는 **409 PASS / 44 skip / 1 FAIL**(삭제된 가사의 선행 동기화 실패 안내 분기)이었다. 원문 직접 복사·비삽입 경계를 보강한 검사 10회 반복 PASS, 최종 전체 **410 PASS / 44 skip / 0 FAIL**(무재시도)이며 수정 후 `pnpm check`·production web build와 `CI=true` 집중 7 PASS/1 skip도 확인했다. 실패·취소를 PASS로 소급하지 않으며 새 SHA의 원격 필수 CI·네 signed image·동일 SHA 개발 공개 인수 전 P2는 미완료다.

후속 후보 `c9e0cb4189a11311918f50753832d584eb68304f`의 PR Actions `35862852788`은 모바일 즐겨찾기 빈 상태 옛 기준 이미지 차이 7%로 **409 PASS / 44 skip / 1 FAIL**이었다. push Actions `35862846539` attempt 1은 성능 라운드 편차로 FAIL·image skipped, attempt 2는 성능 통과 뒤 PR 실패 확인으로 취소했다. 실패/취소를 PASS로 바꾸지 않는다. PWA 안내가 반영되지 않았던 모바일 탐색 상태 5장만 시각 확인 후 재생성하고 `CI=true` PC·모바일 집중 **2 PASS**다. 새 후보의 전체 CI·image·개발 인수 전까지 상태는 `in_progress`다.

### 2026-09-23 — 1.1.7b P1 완료·P2 진입

P1의 제품 `1.1.7b`/계획 `1.1.7.b`/private package `1.1.7` 계약, WC-17/18, dev/정식 gate 분리를 기능 SHA `a04bbcb6358aa1682e57fb48491e53be3f87f5d1`에서 인수했다. 로컬 경계 42 PASS, `pnpm check`와 production web build PASS, 격리 PostgreSQL 18의 migration 2회·Unit 393 PASS/조건부 beta 5 skip이다. PR [#153](https://github.com/parking-place/LyricsCloud/pull/153)의 [Actions 35849543496](https://github.com/parking-place/LyricsCloud/actions/runs/35849543496) verify PASS; push [Actions 35849536417](https://github.com/parking-place/LyricsCloud/actions/runs/35849536417) attempt 2 verify·네 signed dev image/provenance PASS. 첫 push의 mockup 해시 오탐, 중간 후보의 공개 링크 재연결 시험 경쟁, 최종 push attempt 1의 성능 라운드 편차 FAIL은 각각 실패 이력으로 유지하고 PASS로 소급하지 않는다.

같은 기능 SHA로 개발 서버 checkout·BUILD_ID·공개 HTTPS live/ready가 `1.1.7b/dev/p1`에 일치하고 `/auth`·CSS 200, HMR 없음, 네 서비스 healthy, production CSS·Docker cleanup PASS다. 기존 개발 DB의 migration 31건 지문 `42111a6b819fdb3a9a3282fefc566d409be9722342b8e8c5a0762c0fed02914a`와 native 1150 객체·profile 1151 이력은 배포 전후 그대로다. P2~P5 웹 수정·22개 원인 해소와 세 DB 유형·물리 기기/AT·rollback 최종 인수는 아직 PASS가 아니다. `main`·정식 tag/image·릴리스 서버는 변경하지 않았다. [P1 세부 증거](../3.Redesign-phase/1.1.7.b/1phase.md)를 따른다.

아래 2026-09-22의 직접 1.2.0 지정은 당시 이력이며, 현재 착수 순서는 이 절과 위 next_planned 값을 따른다.

## 2026-09-22 다음 계획 지정

사용자 지시로 [3.Redesign-phase / 1.2.0](../3.Redesign-phase/1.2.0/README.md)을 다음 계획으로 정했다. 코발트 블루 Chroma Dock을 선택하고 1.1.8~1.1.14의 남은 작업을 보류한다. [전환 결정](../3.Redesign-phase/PLAN-CHANGE.md)을 따른다. 위 실행 `current_version/current_phase/state`와 아래 과거 완료/릴리스 증거는 유지한다. 실제 1.2.0 착수는 별도 실행 상태 인수 때 기록한다. 후속 사용자 요청에 따라 [1.2.1~1.2.8 계획](../3.Redesign-phase/ROADMAP.md)과 [새 1.1.8 P4 웹 안정화 비교](../3.Redesign-phase/BRANCH-COMPARISON-118-P4.md)를 추가했다. 비교 후보는 제품 적용 전이며 이 기록으로 native 보류나 현재 실행 버전을 바꾸지 않는다. 이 변경으로 이전 릴리스의 배포 결과를 새로 판정하지 않는다.

## 승인과 기준

P2 최종 기능 SHA `4c2a42ab3a2df08ec2a9833ef0ede5d06c39abf1`의 Actions [35026679109](https://github.com/parking-place/LyricsCloud/actions/runs/35026679109)은 전체 verify·네 signed dev image **PASS**다. Unit **393 PASS / 조건부 5 skip**, owner E2E **381 PASS / 조건부 43 skip**, release browser matrix **10 PASS**. 같은 SHA 개발 서버에서 1151 migration·네 production service health·CSS asset·Docker cleanup PASS, 공개 HTTPS live/ready는 `1.1.7a/dev/p2`와 정확한 SHA, ready schema `1151_profile_customization.sql`, `/auth` 200·비인증 사진 401이다. 합성 owner의 공개 인증 프로필 GET→닉네임 PATCH→재조회 영속→provider 복귀와 빈 사진 404 PASS 후 합성 자료를 삭제했다. 처음 로컬 쿠키 이름을 사용한 합성 probe 401은 HTTPS 보안 쿠키 이름으로 정정한 뒤 PASS했으며 제품 실패가 아니다. 이는 P2 저장·파일·소유권 계약의 완료이고 P3~P5 UI/전체 보안·릴리스 PASS를 의미하지 않는다. `main`·정식 tag/image·릴리스 서버 변경 없음.

P3 첫 기능 후보 `86db1b2e5e9e155cae3cc2705d99a32542235bdd`는 로컬 check·production build·PC/mobile E2E 6 PASS, 격리 PostgreSQL API/UI 저장·다른 탭·사진 업로드·320px 양 테마를 확인했다. 그러나 Actions [35032479652](https://github.com/parking-place/LyricsCloud/actions/runs/35032479652)는 기존 탈퇴 JSX 격리 fixture가 신규 프로필 자식 import를 허용하지 않아 P6 회귀 4 FAIL·image skipped로 종료했다. 신규 자식을 실행하지 않는 fixture stub을 추가하고 로컬 P6 회귀 PASS, verify runtime Phase를 p3로 정렬했다. 첫 CI는 PASS로 재분류하지 않으며 수정 SHA의 전체 CI·네 image·동일 SHA 개발 공개 인수 전에는 P3를 완료하지 않는다.

P3 두 번째 SHA `0f4d82d4074bcbd8160fb678611c8654ee5e01a8`의 Actions [35032673845](https://github.com/parking-place/LyricsCloud/actions/runs/35032673845)는 migration·393 통합 unit·생산 이미지/backup/rollback 단계를 진행했으나, 별도 로컬 전체 430건에서 **383 PASS / 4 FAIL / 조건부 43 skip**을 발견하여 이미지 scan 단계에서 취소했다. FAIL은 실제 desktop 상단 quick-add가 도움말을 가린 클릭 충돌 1, 신규 모바일 이름으로 모호해진 기존 계정 전환 선택자 1, 의도대로 변경된 모바일 셸/템플릿 화면의 과거 시각 기준 2다. 선택자 scope와 quick-add 위치를 보정하고 변경된 두 기준 이미지를 시각 확인 후 정확히 재생성했다. 실패/취소 실행을 PASS로 기록하지 않으며 수정 후 집중 5건 PASS, 전체 무재시도 로컬 회귀 재실행과 새 SHA CI/개발 인수는 진행 중이다.

P3 보정 뒤 격리 PostgreSQL/Chromium desktop·mobile **전체 430건 중 387 PASS / 조건부 43 skip / 0 FAIL**(무재시도, 12.5분), 집중 desktop 도움말·계정 전환·721~1440px 홈/설정/빠른 추가 클릭 3 PASS와 변경된 모바일 셸/템플릿 스냅샷 2 PASS다. 구버전 증거 PNG 90개는 시험 자동 출력으로 바뀌었을 뿐 기능 범위가 아니므로 기존 Git blob으로 정확히 복원했고 새 모바일 기준 2개만 후보에 포함한다. 이는 로컬 수용이며 원격 전체 CI·네 signed dev image·동일 SHA 개발 공개 인수 완료 전에는 P3 PASS/완료가 아니다.

P3 세 번째 SHA `388c9d9f7a021441f078c0cc5ad7c9f1c26a5236`의 Actions [35035083548](https://github.com/parking-place/LyricsCloud/actions/runs/35035083548)는 migration·393 통합 unit·production image/security 등은 통과했지만 owner E2E에서 **386 PASS / 1 FAIL / 조건부 43 skip**, 네 dev image skipped로 종료했다. 단일 FAIL은 변경된 모바일 두 줄 header가 반영되지 않은 과거 `recent-empty` 스냅샷의 CI 픽셀 차이 7%가 허용 6%를 넘은 것이다. 같은 Playwright Linux 이미지와 `CI=true`의 로컬 집중 test는 PASS했고, 모바일 탐색 시각 상태 5장의 기준 화면을 새 상단바에 맞춰 강제 재생성·시각 확인한 뒤 허용 비율을 바꾸지 않은 무재시도 test도 PASS했다. 실패 실행을 PASS로 분류하거나 이 SHA를 개발 서버에 배포하지 않는다. 새 후보의 원격 전체 CI·네 signed dev image·동일 SHA 공개 개발 인수까지 P3는 진행 중이다.

P3 최종 기능·시각 기준 SHA `675dbafa6716324f44e3c5a3c8e78663cec07122`의 PR [#148](https://github.com/parking-place/LyricsCloud/pull/148)과 Actions [35037281111](https://github.com/parking-place/LyricsCloud/actions/runs/35037281111)은 **전체 verify·네 signed dev image PASS**다. PostgreSQL 통합 unit **393 PASS / 조건부 5 skip**, owner Chromium E2E **387 PASS / 조건부 43 skip / 0 FAIL**, release browser matrix **10 PASS**다. 개발 서버 checkout·배포 SHA와 공개 HTTPS live/ready가 정확히 일치하고 `1.1.7a/dev/p3`, schema `1151_profile_customization.sql`, `/auth` 200·비인증 사진 401, 네 production service healthy, CSS asset·Docker 정리 PASS다. 공개 합성 계정 desktop에서 닉네임 저장→새로고침 영속, 사진 업로드→새로고침 영속, 우측 mark 홈·새 인사말, 모바일 320px에서 양 theme·사진 표시·dirty 홈 guard/취소 후 홈을 PASS했다. 합성 계정·세션·identity·프로필·사진은 삭제 후 각각 **0건**을 확인했다. 이 증거로 P3 UI/홈 Phase를 완료하며 P4 교차 권한·OAuth 변경·복구 및 P5 최종 릴리스는 아직 PASS가 아니다. `main`·정식 tag/image·릴리스 서버 변경 없음.

P3 완료 문서-only commit `50fac914c34522b809a361760808b1c6ba5637d8`은 기능 SHA의 검증 증거를 보존하고 중복 CI를 건너뛰도록 `[skip ci]`로 push했다. PR #148은 2026-09-16 `release/1.1.7a` merge `b4e5200c9c1d3b695ce6e505071390cc38dd49f8`에 통합됐고 `main`·미완료 1.1.8·릴리스 서버는 바꾸지 않았다. P4 Phase 브랜치는 이 merge SHA에서 분기한다.

P4 격리 PostgreSQL/Chromium 첫 신규 6건은 **4 PASS / 2 FAIL**이었다. 공유 가사 `/shared/lyrics/:id`는 셸 `active="home"` 분류 때문에 우측 mark가 실제 `/workspace`가 아닌데도 “이미 홈”이라고 막히는 제품 결함을 재현했다. 실제 URL만 홈인지 확인하도록 최소 수정하고 check·production build PASS. 같은 6건 재실행의 **4 PASS / 2 FAIL**은 새 테스트가 미저장 곡 폼의 기존 확인창 취소를 셸 문장으로 잘못 기대한 fixture 문제였다. 캡처 단계 확인창을 명시적으로 취소하고 URL·입력 보존을 검사하도록 고친 뒤 Chromium PC/모바일 **6 PASS**다. 실패 시도를 PASS로 재분류하지 않는다.

P4 첫 5-project Linux 대리 매트릭스는 **13 PASS / 2 FAIL**이었다. WebKit 정상 첫 사진 업로드·UI는 PASS였고, Playwright `route.fetch()`가 WebKit 스트리밍 multipart의 파일 본문을 캡처하지 못해 재전송 291바이트/서버 400이 된 시험 도구 제한이다. 독립 owner 요청으로 동일 사진을 서버에 커밋한 뒤 브라우저 ACK만 중단해 결과 유실을 엔진 중립적으로 재현하도록 바꿨다. WebKit 두 건 집중 **2 PASS**, 5-project 전체 **15 PASS**; 이후 우측 mark의 키보드 Enter·모바일 tap을 추가해 집중 **5 PASS**, 최신 전체 **15 PASS**다. Firefox/WebKit/Chromium Linux 대리 결과를 실제 Chrome/Edge/Windows/iOS/Android 기기 PASS로 적지 않는다.
후속 확대에서는 합성 owner가 실제 곡·가사·라임·프롬프트를 만든 뒤 목록·곡 대시보드·각 편집·공유 가사 등 9개 경로의 우측 mark를 확인했고, 키보드 Enter/모바일 tap 포함 5-project 집중 **5 PASS**, 최종 P4 전용 **15 PASS**다.

P4 기존 실제 PostgreSQL override·OAuth 제공값 갱신·사진 RLS/orphan/export와 사진 변환 단위 **14 PASS**. 전체 Chromium desktop/mobile 436건의 첫 실행은 디스크 여유 223MB로 산출물 실패가 예상돼 218건 뒤 중단했고 **PASS가 아니다**. 별도 16GB `/tmp` 임시 산출물로 처음부터 무재시도 다시 실행한 **436건 중 393 PASS / 조건부 43 skip / 0 FAIL**(12.8분)이 전체 로컬 수용이다. 테스트 자동 출력으로 바뀐 구버전 증거 PNG 정확히 90개는 변경 확장자·기존 Git 상태를 대조한 뒤 원래 blob으로 복원했다. P4 원격 전체 CI·네 signed dev image·동일 SHA 공개 개발 재시작/합성 계정 인수 전에는 P4 완료가 아니다.
후속 국소 재확인은 P6 회귀 **107 PASS**, `1.1.7a` 버전 경계 **4 PASS**, whole-tree syntax 감사 **0 error**이고, 전체 제품 코드 check·production web build는 공유 mark 보정 SHA 후보에서 PASS다.

P4 최종 기능 SHA `7621e8e2a41abeb220155d3fc632f8d0e1da3319`의 PR [#149](https://github.com/parking-place/LyricsCloud/pull/149)와 첫 Actions [35043201011](https://github.com/parking-place/LyricsCloud/actions/runs/35043201011)은 기존 revision 성능 측정 라운드 CV **83.327% > 75%**로 verify FAIL·네 image skipped였다. 절대 p95·오류 예산은 PASS했고, 허용치를 낮추거나 이 실패를 PASS로 분류하지 않았다. 같은 SHA·기준으로 수동 재실행한 Actions [35043634916](https://github.com/parking-place/LyricsCloud/actions/runs/35043634916)은 성능 포함 전체 verify·네 signed dev image **PASS**다. Unit **393 PASS / 조건부 5 skip**, owner E2E **393 PASS / 조건부 43 skip / 0 FAIL**, release browser matrix **10 PASS**다.

개발 서버 checkout과 배포 SHA `7621e8e2a41abeb220155d3fc632f8d0e1da3319`, 공개 HTTPS live/ready `1.1.7a/dev/p4`·schema `1151_profile_customization.sql`, `/auth` 200·익명 사진 401, 네 production service healthy·CSS asset·Docker cleanup가 일치한다. 공개 합성 A의 닉네임·사진 서버 저장→재진입, B의 A 사진 비공개, 최신 제공자 이름만 갱신한 뒤 override 유지, web 재시작·새 session 뒤 동일 저장값, PC·모바일 공유 가사 우측 홈 mark/icon 이동, 위장 사진 400 뒤 이전 사진 유지, 최신 Google 이름·기본 사진 명시 복귀 **PASS**다. 최종 probe 첫 실행은 사진 복귀 클릭 직후 ACK 전 읽기 200으로 실패했으나, 직후 DB의 `avatar_source=provider`·사진 참조 없음으로 제품 완료를 확인하고 ignored probe에 완료 대기를 추가해 stage→재시작→final 전체 PASS했다. 합성 사용자·세션·identity·프로필·사진은 각각 **0건**으로 삭제 확인했다. 실제 iOS/Android/Windows/Edge 물리 환경·OS IME·AT는 새로 검증하지 않았으며 P5 목록에 미실행으로 인계한다. P4 완료는 P5 최종 릴리스 인수 완료가 아니다. `main`·정식 tag/image·릴리스 서버 변경 없음.

P2 첫 기능 후보 `b7b968710983550d0f4bd51905828da75aa32dbe`는 PR [#147](https://github.com/parking-place/LyricsCloud/pull/147)과 같은 SHA 수동 Actions [35025390806](https://github.com/parking-place/LyricsCloud/actions/runs/35025390806)를 시작했으나, 사진 ID가 비공개 URL query와 프록시 접근 로그에 남을 수 있음을 검토 중 발견해 Actions가 migration 검증 중일 때 **cancelled** 처리했다. 이 실행은 CI/이미지 PASS가 아니며 개발 서버는 P1 SHA `38cced2`에 그대로 있다. 식별자 없는 owner 현재사진 전용 `/api/profile/avatar`로 좁히고 source/production build·desktop/mobile 실제 HTTP 2 PASS를 확인했다. 새 후보 전체 CI·네 image·동일 SHA 개발 공개 인수 전까지 P2는 `in_progress`다.

P2 두 번째 후보 `0d610198a0d9c5dacaa4a2c5f48f68e22afb2f75`의 Actions [35025801502](https://github.com/parking-place/LyricsCloud/actions/runs/35025801502)는 1151 migration/recovery·정적 검사·전체 Unit tests 이후 `validate-0912-security-hardening`의 당시 고정 HTTP 수 74와 신규 avatar route 75가 달라 **FAIL**했다. 네 dev image는 skipped이며 개발 서버는 P1 SHA 그대로다. 로컬 보정은 현행 75 route/68 Origin mutation/56 DB table 전량을 inventory와 실제 파일에 1:1 대조해 보안 감사 PASS였다. 추가로 일반 API 1 MiB body 제한은 유지하고 사진 PATCH에만 2 MiB 파일+50 KiB multipart 상한을 적용하여 synthetic 실제 1 MiB 초과 정상 PNG 업로드·과대 413·위장 400·일반 API 413을 desktop/mobile HTTP 2 PASS로 확인했다. 새 전체 CI 전에는 완료로 재분류하지 않는다.

P1 최종 기능 후보 `38cced2c2276d89a9a56a4aa7daa500ce8ca7305`의 Actions [35019632430](https://github.com/parking-place/LyricsCloud/actions/runs/35019632430)는 전체 verify와 네 signed dev image job이 모두 **PASS**였다. 전체 owner E2E는 **379 PASS / 조건부 43 skip**, release candidate browser matrix 10 PASS로 구분한다. 개발 서버는 첫 시도에서 기존 checkout의 구형 numeric-only 배포 스크립트가 목표 checkout으로 전환한 뒤 빌드 전 exit 6으로 중단됐고, 기존 `1.1.8` 런타임을 확인했다. 같은 SHA의 새 checkout 스크립트 재시도에서 production image build·migration·네 지속 서비스 health·static asset·Docker cleanup PASS. 공개 HTTPS live/ready가 `1.1.7a/dev/p1`과 전체 목표 SHA를 반환하고 ready schema `1140_sharing_stability.sql`, `/auth` 200이다. 기존 DB/volume/secret을 보존했다. 이는 P1 **설계·단일 버전 경계** 완료의 증거이고 P2~P5 닉네임·사진·홈 UI 구현 PASS는 아니다.

P1 후보 `b6031851ecea1361b39274cd6be6412c93f71311`의 Actions [35014698215](https://github.com/parking-place/LyricsCloud/actions/runs/35014698215)는 verify 중 `Auth and ownership E2E`에서 **FAIL**이었다. `playwright.config.ts`의 production webServer가 기존 `APP_VERSION=1.1.7`을 고정해 런타임의 정확한 `1.1.7a` 검증에 거부됐고, 발행 job은 skipped다. 개발 서버는 기존 `1.1.8` SHA `fe4055626757458a4eecbff0bfa0b55bed3bc40d`로 남아 있다. fixture와 browser health 기대값을 수정했지만 새 전체 CI·네 image·같은 SHA 개발 smoke 전까지 P1은 `review`다.

두 번째 후보 `6b62ad1503bbb76776512f0cd54db96e6c86392e`의 Actions [35016348844](https://github.com/parking-place/LyricsCloud/actions/runs/35016348844)는 1110 migration 검사 본문 성공 후 임시 DB의 `DROP ... FORCE`가 닫히는 pool에 `57P01`을 전달해 **FAIL**했고 publish는 다시 skipped다. 1110 verifier를 이미 검증된 UUID 전용 비강제 cleanup helper로 바꿔 원래 rollback/RLS 주장과 오류 전파를 유지했다. 로컬 별도 PostgreSQL 18.3 임시 컨테이너에서 1110 전체 복구 검사 PASS, cleanup 계약 7 PASS. 새 원격 검증 전에는 완료로 간주하지 않는다.

세 번째 후보 `a323cc6e5e2daf16ec4b3b421ed90f91b59f34f2`의 Actions [35016930875](https://github.com/parking-place/LyricsCloud/actions/runs/35016930875)는 1110을 포함한 migration·unit·production/복구 검사를 지나 전체 Playwright에서 **377 PASS / 2 FAIL / 43 skip**으로 종료됐다. 두 FAIL은 desktop/mobile 공통 `baseline.spec.ts`가 health version을 숫자-only `/^\d+\.\d+\.\d+$/`로 주장해 승인된 `1.1.7a`를 거부한 것으로, 제품/서버 오류가 아니다. 해당 baseline을 정확한 후보 버전 기대값으로 좁혀 별도 실제 PostgreSQL + browser에서 2 PASS를 확인했다. 전체 CI/발행은 새 SHA에서 다시 검증해야 하며 개발 서버는 기존 SHA에 머문다.

2026-09-16 사용자가 이번 한 번 `1.1.7a`를 그대로 제품 버전으로 사용하고 닉네임·프로필 사진 변경, 우측 상단 로고/아이콘 홈 이동을 P1~P5 및 릴리스까지 진행하도록 지시했다. 작업은 이미 발행된 `v1.1.7` SHA `edb8b4aca833fbf48a3111177db9060dceac42ba`에서 분기한 독립 후보로 수행하며 기존 tag/DB를 덮지 않는다. 현재 main의 미완료 `1.1.8` Windows P3가 릴리스에 섞이지 않도록 사용자가 **별도 `release/1.1.7a` 브랜치 PR/CI/tag 발행의 추가 예외를 승인**했다. 이 STATUS는 독립 후보 브랜치의 실행 상태이며 main/1.1.8 P4의 원본 상태를 소급 변경하지 않는다. 정확한 제품 버전은 `1.1.7a`, 계획 폴더는 `1.1.7.a`, private npm package version은 SemVer 제약으로 `1.1.7`을 유지한다.

2026-09-14 사용자가 직전 UX P2 권고안 `B-1` 확인 질문에 ``1.1.14까지 달렷``이라고 답했다. 이를 통합 workspace+Flat-depth의 명시 선택과 UX P3~P5, 1.1.5~1.1.14의 계획된 Phase·각 출시 가능한 버전의 정식 릴리스 실행 승인으로 기록한다. 기존 기능 삭제는 승인하지 않았으며 CodeMirror/Yjs·IME·selection/undo·초안·권한/복구·URL/API/DB 계약을 유지한다. 네이티브 SDK·실기기·서명·스토어 등 각 계획의 조건부 gate는 별도 실제 증거 없이 완료나 릴리스로 표시하지 않는다.

2026-09-12 사용자가 1.1.6까지 각 버전의 계획된 모든 Phase와 개별 정식 릴리스를 실행하도록 승인했다. 착수 전에 고지한 권장 모델에 따라 1.1.0은 owner를 유지하고 actor와 자료별 grant를 분리한 지정 사용자 읽기부터 시작한다. 공개 링크·선택/공개 쓰기·guest와 디자인 적용은 각 담당 버전 P1의 명시 계약과 실패/복구 경계를 먼저 확정한다. 버전별 P5와 동일 SHA 개발 인수가 끝난 뒤에만 main·annotated tag·정식 image·릴리스 서버 exact digest·공개 smoke·GitHub Release를 수행한다. 기존 DB volume·secret·beta allowlist와 사용자가 승인한 `OPS-100-001` 위험 예외를 보존한다.

2026-09-13 사용자가 ``비로그인 guest 쓰기 승인``이라고 명시했다. 1.1.3은 기존 공개 읽기 capability 안에서 owner의 별도 위험 확인을 거친 해당 가사 본문 쓰기만 허용하며, 서버 발급 익명 guest session·별도 write epoch·지속 남용 예산·owner write 중지·거부 원문 복구를 적용한다. 계정 가입·workspace/목록·메모/연결 자료·revision·ACL·metadata·삭제·소유권 권한은 포함하지 않는다. 세부 계약은 `docs/runbooks/1.1.3-phase1-public-write-contract.md`에서 최초 구현 전에 고정한다.

2026-09-11 사용자가 1.0.14까지 모든 버전을 실행하고 각 버전을 개별 정식 릴리스하도록 명시적으로 승인했다. 현재 실행 범위는 1.0.6부터 1.0.14까지 각 버전의 계획된 Phase, Phase별 개발 서버 인수, 버전별 main 병합·annotated tag·정식 image·릴리스 서버 migrate/배포/공개 smoke다. 각 P1의 기존 권장안은 최초 소비 전에 범위·실패·복구 경계를 문서로 확정하며, 외부 제공 조건이 충족되지 않는 기능은 우회 구현하거나 완료로 가장하지 않는다. 기존 DB volume·secret과 사용자가 승인한 `OPS-100-001` 위험 예외를 보존한다.

1.0.5는 main/tag SHA `4411bc1eb74c90a6a1c47f7e3315de2d5ff39edb`, annotated tag `v1.0.5`, 정식 image와 릴리스 서버 동일 SHA 배포·공개 smoke까지 완료됐다.

2026-09-10 사용자가 선행 릴리스와 1.0.5 Phase 5까지의 실행 및 후속 정식 릴리스를 명시적으로 승인했다. 현재 선행 릴리스는 완료된 1.0.3 P1~P5를 main·annotated tag·정식 image·릴리스 서버에 반영하는 범위이며, 이후 1.0.5의 명시적 의존성인 1.0.4 P1~P5를 먼저 완료하고 1.0.5 P1~P5와 최종 릴리스를 수행한다. 기존 DB volume·secret과 `OPS-100-001` 위험 예외를 보존한다.

2026-09-10 사용자가 1.0.2 정식 릴리스 배포와 그 완료 뒤 1.0.3 P1~P5 실행을 명시적으로 승인했다. 1.0.2의 현재 승인 범위는 main 병합·annotated tag·정식 Docker image·릴리스 서버 migrate/배포/공개 smoke이며, 기존 DB volume·secret과 `OPS-100-001` 위험 예외를 보존한다.

2026-09-10 사용자가 다음 버전의 마지막 Phase까지 실행하도록 지시했다. 현재 범위는 1.0.2 P1~P5와 Phase별 개발 서버 인수이며, 계획에 명시된 별도 gate에 따라 main 병합·정식 Release 별칭·릴리스 서버 변경은 포함하지 않는다.

2026-09-09 사용자가 1.0.1 계획의 모든 Phase 실행과 전체 완료 후 릴리스 서버 배포를 승인했다. `ADR-NF-001`, `PROD-NF-001`, `OPS-NF-001`의 권장 대안을 Accepted로 확정했다. 릴리스 서버 변경 권한은 P1~P10 완료와 최종 후보 검증 뒤에만 소비하며, 그 전에는 Phase별 개발 서버 인수만 수행한다.

사용자가 1.0.1 이전의 1.0.0 P6 안정화와 GitHub 반영을 승인했다. 착수 기준 SHA는 `9e362f60f183b6adedfe358554b077334645ed0c`, 당시 전용 브랜치는 `phase/1.0.0-p6-stabilization`이다. 2026-09-09 사용자가 PR #11을 P5에 병합하고 원격 P6 브랜치를 삭제했다. 현재 병합 기준 `7c3930b5bc2be4f25f8f7586b7ce3f02b039af99`는 후보 `405e535`와 동일 tree다. 후보 CI 통과와 별개로 병합 CI의 performance round CV 실패는 조사 중이며, [인수 출발점](../2.Patch-phase/CODEX-HANDOFF.md)에 증거를 연결했다. 운영 배포·정식 태그 재발행·다른 개발자의 작업 덮어쓰기는 승인에 포함하지 않는다.

P4 완료 문서-only `646c9a7c98b1984e6a4b647b8621e5556ba611df`는 `[skip ci]`로 push했고 PR #149는 승인된 `release/1.1.7a` merge `8d3ed3fdade28902957e7c5253c341edf8ded5c4`에 통합됐다. `main`·1.1.8·정식 tag/image·릴리스 서버는 그대로다. P5 전용 Phase 브랜치는 이 merge SHA에서 분기했다.

P5 최종 후보 `fd4d901a4c57626d193c88938c7889f035d69192`의 Actions [35047546033](https://github.com/parking-place/LyricsCloud/actions/runs/35047546033)은 verify와 네 signed dev image가 모두 **PASS**다. 전체 owner E2E **393 PASS / 조건부 43 skip**, release browser matrix **10 PASS**이며, 게시된 full-SHA/`dev-1.1.7a-p5` 이미지의 signature·provenance를 확인했다. 같은 SHA 개발 서버는 공개 live/ready `1.1.7a/dev/p5`·schema `1151_profile_customization.sql`, `/auth` 200·익명 사진 401, 네 서비스 healthy다. 합성 두 owner로 닉네임/사진 저장→재진입, 타 owner 사진 차단, web 재시작·새 session 지속, PC/mobile 홈 이동, 위장 파일 거부/기존 사진 유지, 최신 Google 값 복귀를 PASS했고 사용자·session·profile·photo를 각각 **0건**으로 정리했다. 첫 공개 probe는 root checkout의 로컬 `sharp` 미설치로 제품 요청 전에 중단됐고 설치된 P5 worktree 재실행은 PASS했으며 첫 시도를 PASS로 재분류하지 않았다. 실제 Windows Edge/iOS/Android/OS IME/AT는 미실행이고 `OPS-100-001` backup/RPO 예외는 사용자 승인대로 남는다. 미해결 제품 P0/P1은 0건이며 P5 gate를 완료했다. 아직 `v1.1.7a` tag·정식 image·릴리스 서버 변경은 없고 승인된 전용 release 절차로 인계한다.

PR #150은 전용 `release/1.1.7a` merge `fc2463cdb47d9fd7d0042779f602c6ddb7d734cf`에 통합됐고 reviewed tree와 동일하다. merge SHA Actions [35050125353](https://github.com/parking-place/LyricsCloud/actions/runs/35050125353)과 annotated `v1.1.7a` tag Actions [35052520619](https://github.com/parking-place/LyricsCloud/actions/runs/35052520619)은 전체 verify·네 signed image가 모두 **PASS**다. tag의 `1.1.7a`·full SHA·`Release`·`latest`·`Release-latest`는 서비스별 exact digest로 일치한다. 운영은 migrate 우선으로 29→30 migrations·schema 1140→1151을 적용하면서 기존 사용자 8명·session 14개를 보존한 뒤 앱 세 서비스를 exact digest로 전환했다. 공개 `1.1.7a/release`·exact SHA·phase 없음·네 health·`/auth` 200·익명 사진 401, 합성 두 owner 저장/사진 격리·web 재시작/새 session·PC/mobile 홈·위장 파일 보존을 PASS하고 합성 자료를 0건으로 삭제했다. 전역 `LyricsCloud betacode ls`와 GitHub Release가 PASS이며 `main`·미완료 1.1.8은 변경하지 않았다. 실제 OS/기기·IME/AT와 `OPS-100-001` backup 위험은 미실행/승인 예외로 남는다.

P5 로컬 후보는 실제 frozen lockfile과 production license 65개 package group/버전 일치, Node 24 계열 check·production web build, 1151 populated 1140→1151/반복/RLS/application-first rollback, release validator 1001/1002/1004/1005/101, 격리 PostgreSQL profile/photo **14 PASS**, Linux 5-project 영향 브라우저 **15 PASS**, 한 번짜리 버전 경계 **4 PASS**다. 첫 격리 migration/E2E 컨테이너는 `APP_CHANNEL` 누락으로 기본 release와 시험용 `APP_PHASE`가 충돌해 시작 실패했고, dev 채널 명시 재실행에서 PASS했다. Docker Git worktree 메타데이터 미마운트로 oneoff shell guard 1건이 실패했으나 로컬 Git 환경의 같은 4건은 PASS했다. 이 실패 시도는 PASS가 아니다. P4 제품 코드·전체 E2E 393 PASS는 해당 P4 SHA의 선행 근거로만 계승하고 P5 새 후보 SHA의 필수 CI·네 signed dev image·동일 SHA 개발 공개 인수 전에는 P5를 완료하지 않는다.

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
| 1.1.0 P1 | complete | 기준 `6d4921f`, owner/actor/resource grant·최소 공개 필드·reader presence·회수/rollback을 selected-read 범위로 승인 |
| 1.1.0 P2 | complete | 후보 `046a98c`, Actions `34675587605`·`34675589373`, grant/RLS·owner API·reader read-only WS/presence와 동일 SHA 개발 인수 완료 |
| 1.1.0 P3 | complete | 후보 `e315d4b`, Actions `34676721051`·`34676727416`, Chromium 342 PASS와 동일 SHA 공개 desktop/mobile grant·live·presence·회수 인수 완료 |
| 1.1.0 P4 | complete | 후보 `3e20728`, Actions `34679448133`·`34679450056`, 실제 DB 340 PASS·5-browser 5 PASS·동일 SHA 공개 restart/reconnect/offline revoke 인수 완료 |
| 1.1.0 P5 | complete | 후보 `aa4d07f`, Actions `34686935235`·`34686937113`, 네 dev image와 동일 SHA 공개 권한 격리·재시작/재연결·offline 회수 인수 완료 |
| 1.1.0 Release | complete | main/tag `068679d`, main CI `34688148947`·tag CI `34689321743`, exact digest 운영 배포·공개 권한/재시작/오프라인 smoke·GitHub Release 완료 |
| 1.1.1 P1 | complete | 기준 `068679d`, 256비트 fragment token·digest-only 저장·필드/만료/회수·fixed POST/WS·cache/noindex·호환/rollback 계약 승인 |
| 1.1.1 P2 | complete | 후보 `571398d`, Actions `34692185838`·`34692188575`, 1110 schema·digest-only capability·owner/public API·read-only WS와 동일 SHA 개발 인수 완료 |
| 1.1.1 P3 | complete | 후보 `175fd74`, Actions `34695985847`·`34695987903`, 5-browser 10 PASS·네 dev image와 동일 SHA 공개 owner/mobile/live/revoke/empty 인수 완료 |
| 1.1.1 P4 | complete | 후보 `b920049`, Actions `34697600730`·`34697608114`, 실제 DB·5-browser·동일 SHA 공개 restart/reconnect/revoke/private 격리 인수 완료 |
| 1.1.1 P5 | complete | 후보 `f013154`, Actions `34701755594`·`34701763143`, 네 dev image·26 migration 봉인·동일 SHA 공개 재시작/회수 인수 완료 |
| 1.1.1 Release | complete | main/tag `d4c82b3`, main CI `34703250472`·tag CI `34704609566`, exact digest 운영 배포·공개 링크/회수/재시작 smoke·GitHub Release 완료 |
| 1.1.2 P1 | complete | 기준 `d4c82b3`, active read grant의 write 상태·두 epoch·actor receipt·원자 ACK·rejected 복구함·presence/cursor·rollback 계약 승인 |
| 1.1.2 P2 | complete | 후보 `41db8ff`, Actions `34710725889`·`34710727914`, 1120 schema·원자 actor/epoch ACK·rejected queue·네 dev image와 동일 SHA 공개 개발 인수 완료 |
| 1.1.2 P3 | complete | 후보 `f8f2dbd`, Actions `34718575157`·`34718576675`, 실제 DB 8 PASS·5-browser 5 PASS·동일 SHA 공개 권한 토글/수렴/강등/재허용/회수 인수 완료 |
| 1.1.2 P4 | complete | 후보 `b797224`, Actions `34721549799`·`34721572892`, Vitest 353 PASS·E2E 347 PASS·5-browser 5 PASS·동일 SHA 공개 3계정/복구/재시작 인수 완료 |
| 1.1.2 P5 | complete | 후보 `8ec3cf9`, Actions `34723513936`·`34723521842`, 네 dev image·27 migration 봉인·동일 SHA 공개 3계정/복구/재시작 인수 완료 |
| 1.1.2 Release | complete | main/tag `eb949b5`, main CI `34724875009` 재실행·tag CI `34726392136`, exact digest 운영 배포·공개 공동 편집/복구/재시작 smoke·GitHub Release 완료 |
| 1.1.3 P1 | complete | 계약 `68f694e`, 사용자 승인·public read 안 body write·guest session/epoch·지속 제한·owner 중지·복구/rollback 확정; 문서 검증 PASS, runtime 미착수 |
| 1.1.3 P2 | complete | 후보 `e58dd9c`, Actions `34761752729`·`34761840822`, 1130 schema·guest session/지속 예산·owner kill switch와 동일 SHA 공개 guest write/격리/log 비노출 인수 완료 |
| 1.1.3 P3 | complete | 후보 `167ceb8`, Actions `34765577731`·`34765580164`, 네 dev image·동일 SHA 공개 두 guest 수렴/격리/offline 복구/비자동 replay/전체 회수 인수 완료 |
| 1.1.3 P4 | complete | 후보 `3fd9f0d`, Actions `34769556924`·`34769560151`, 실제 DB 358 PASS·5-browser 5/5·네 dev image와 동일 SHA 공개 재시작 전후 권한/복구 인수 완료 |
| 1.1.3 P5 | complete | 후보 `8abf21a`, Actions `34771639925`·`34771648925`, 네 dev image·28 migration 봉인·동일 SHA 공개 guest 권한/복구/재시작 인수 완료 |
| 1.1.3 Release | complete | main/tag `35fa482`, main CI `34773400193`·tag CI `34774978060`, exact digest 운영 배포·공개 guest 권한/복구/재시작 smoke·GitHub Release 완료 |
| 1.1.4 P1 | complete | 계약 source `6f35313`, restore/delete/reconnect 사건 순서·queue 상한·S0~S5 증거 등급·담당/rollback 계약 완료 |
| 1.1.4 P2 | complete | 후보 `3de111f`, Actions `34778131953`, 1140 delete fence·bounded queue·전체 CI·네 dev image·동일 SHA 공개 삭제/복원 인수 완료 |
| 1.1.4 P3 | complete | 후보 `375ea78`, Actions `34780761622`, actor별 저장/복구 안내·mobile focus·계정 전환 local 격리와 동일 SHA 공개 인수 완료 |
| 1.1.4 P4 | complete | 후보 `233afd2`, Actions `34783619444`, 실제 DB 364 PASS·E2E 353 PASS·5-browser·동일 SHA 공개 복원/offline 병합·queue·회수/계정 격리·재시작 인수 완료 |
| 1.1.4 P5 | complete | 후보 `081117d`, Actions `34786159783`, 네 dev image·동일 SHA 공개 복원/offline 병합·bounded queue·계정 격리·재시작 인수 완료 |
| 1.1.4 Release | complete | main/tag `5f8a045`, main CI `34789430853`·tag CI `34790980889` 최종 3차 실행, exact digest 운영 배포·공개 복원/offline 병합/격리/재시작 smoke·GitHub Release 완료 |
| UX P1 | complete | v1.1.4 `5f8a045` 기준 15화면+추가 흐름·60 viewport, responsive/accessibility/keyboard 12 PASS·4 조건부 skip, UX-GAP-01~06과 실제 AT/물리 기기 미실행 경계 기록 |
| UX P2 | complete | A/B shell×5 morphism·양 theme·320/390/1440px 60조합 Axe/overflow PASS, 사용자 `B-1` 통합 workspace+Flat-depth 선택과 기능 보존 조건 기록 |
| UX P3 | complete | B-1 18화면 README/HTML·index·상태 행렬·토큰·제품 매핑, 5 플랫폼 문맥×양 theme+안전 상태 총 231조합 Axe serious/critical 0·overflow 0, old Mock-up/app/runtime/DB/서버 무변경 |
| UX P4 | complete | B-1 사용자 과제/위험/interaction·feature-flag 검토, 396페이지 overflow 0·144 Axe 0·72 keyboard/focus 0, mobile editor/320px field 수정, 실제 AT/기기/IME 미실행 분리 |
| UX P5 | complete | 사용자 B-1·후속 실행 승인과 P4 의미 불변 수정 봉인, PROD-NF-006 Accepted, 승인 manifest/tree·1.1.5 Phase별 feature-flag/visual/rollback 인계, runtime/DB/서버 무변경 |
| 1.1.5 P1 | complete | main `107ec24` 실제 WorkspaceShell/token/list/route/test 조사, LC_UI_VARIANT classic/B-1·editor 비재마운트·API/DB 무변경·실패 입력/담당/rollback 계약 승인 |
| 1.1.5 P2 | complete | 후보 `43980ba`, Actions `34803929839`, 네 dev image tag 동일 digest·동일 SHA 개발 배포, 공개 PC/mobile×dark/light token과 저장→재진입·최근 복귀·deep link 인수 완료 |
| 1.1.5 P3 | complete | 후보 `24cef7e`, Actions `34808547591`·`34808550793`, 전체 E2E 361 PASS·네 dev image·동일 SHA 공개 B-1 context shell/mobile More와 저장·재진입 인수 완료 |
| 1.1.5 P4 | complete | 후보 `8fb03be`, Actions `34811056142`·`34811076974`, 전체 E2E 365 PASS·네 dev image·동일 SHA 공개 offline 저장/recent deep link·서비스 재시작 인수 완료 |
| 1.1.5 P5 | complete | 후보 `074782e`, Actions `34814063096`·`34814075649`, 네 dev image·동일 SHA 공개 PC/mobile×dark/light·저장/재시작 인수 완료 |
| 1.1.5 Release | complete | main/tag `17fb4a9`, main CI `34816897879`·tag CI `34819313816`, exact digest 운영 배포·공개 B-1/공유/복구/재시작·전역 beta CLI·GitHub Release 완료 |
| 1.1.6 P1 | complete | main 기록 `98c2a29`·제품 source `17fb4a9` 조사, editor/store/copy/security 생명주기·실패 입력·P2~P5 담당·classic/1.1.5 rollback 계약 완료; 문서-only, 실제 OS/물리 기기 미실행 |
| 1.1.6 P2 | complete | 후보 `a75f641`, Actions `34828840416`·`34828845357`, 네 dev image tag 동일 digest·동일 SHA 개발 배포, 10,000줄 editor 생명주기/heap·서버 저장 재진입·공개 양 theme/viewport 인수 완료 |
| 1.1.6 P3 | complete | 후보 `e6f9e8c`, Actions `34833243878`·`34833266060`, 네 dev image tag 동일 digest·동일 SHA 개발 배포, 생성/연결 양 theme·desktop/mobile·상태/focus·저장 재진입 인수 완료 |
| 1.1.6 P4 | complete | 후보 `25d7102`, Actions `34857969866`·`34857974913`, Vitest 369 PASS·E2E 370 PASS·5-browser·네 signed dev image·동일 SHA 공개 copy/export·저장 재진입·재시작 인수 완료 |
| 1.1.6 P5 | complete | 후보 `7f4ac5b`, Actions `34864142932`·`34864188502`, Vitest 369 PASS·E2E 370 PASS·네 signed dev image·동일 SHA 공개 생성/연결·저장 재진입·재시작 인수 완료 |
| 1.1.6 Release | complete | main/tag `f8d24c6`, main CI `34868654180`·tag CI `34871969616`, 네 signed exact digest 운영 배포·공개 생성/연결/공유/복구/재시작·전역 beta CLI·GitHub Release 완료 |
| 1.1.7 P1 | complete | runtime `f8d24c6`, release 기록 main `5a72780`, PC Chromium·Android 대리 Chromium mobile·iOS 대리 WebKit mobile 가입/수직 흐름 6 PASS, 정식 공유/복구 CI 재사용; 라임/프롬프트 returnTo P2 범위 확정 |
| 1.1.7 P2 | complete | 후보 `206b14f`, Actions `34881741352`·`34881745605`, 첫 후보의 기존 URL 14 FAIL 보정·네 signed dev image·동일 SHA 공개 quick-add 복귀/본문/focus/overflow 인수 완료 |
| 1.1.7 P3 | complete | 후보 `740b1e3`, Actions `34887398291`·`34887401584`, Vitest 264 PASS·5-browser P3 5 PASS·네 signed dev image·동일 SHA 공개 PC/mobile×dark/light 복귀/focus/새 탭/tooltip 인수 완료 |
| 1.1.7 P4 | complete | 후보 `66f2f79`, Actions `34894853203`·`34894869965`, 네 signed dev image·동일 SHA 공개 reduced motion/reflow/forced colors·4x CPU 저장·서비스 재시작 영속 인수 완료 |
| 1.1.7 P5 | complete | 후보 `b1a1e2c`, Actions `34900342849`·`34900363577`, Vitest 376 PASS·E2E 379 PASS·네 signed dev image·동일 SHA 공개 접근성 fallback/저장·복귀·서비스 재시작 영속 인수 완료 |
| 1.1.7a P1 | complete | `v1.1.7` source `edb8b4a`, 후보 `38cced2`, Actions `35019632430` verify·네 signed dev image·동일 SHA 공개 P1 계약/버전 경계 인수 완료 |
| 1.1.7a P2 | complete | 후보 `4c2a42a`, Actions `35026679109`, 네 signed dev image·동일 SHA 개발 1151 migration/합성 profile API 영속 인수 완료 |
| 1.1.7a P3 | complete | 후보 `675dbafa`, Actions `35037281111`, Unit 393/E2E 387/release 10 PASS·네 signed dev image·동일 SHA 공개 PC/mobile 닉네임·사진 저장/재진입·홈 guard 인수 완료 |
| 1.1.7a P4 | complete | 후보 `7621e8e`, 첫 CI `35043201011` performance CV FAIL 기록, 동일 SHA 재실행 `35043634916` Unit 393/E2E 393/release 10·네 signed dev image PASS·동일 SHA 공개 재시작/새 session·두 owner 격리·홈 guard 인수 완료. 실제 OS/기기·AT 미실행 |
| 1.1.7b P1 | complete | 기능 `a04bbcb`, PR `35849543496` verify·push `35849536417` attempt 2 verify/네 signed dev image PASS, 동일 SHA 개발 공개 live/ready·auth/CSS·네 health와 native 1150/1151 DB 지문 보존. P2~P5 작업은 미완료 |
| 1.1.7b P2 | complete | 기능 `3915a71`, PR `35866450768` verify·push `35866445486` verify/네 signed dev image PASS, 동일 SHA 개발 공개 live/ready·PC/mobile 가사/Suno/PWA smoke와 합성 계정 정리 완료. P3 착수 전 사용자 요청으로 일시 중단 |
| 1.1.7b P3 | complete | 기능 `1626c75`, PR/push Actions `35876265426`/`35876233972` verify·네 signed image PASS, 동일 SHA 개발 공개 PC/mobile·DB 1151 인수 |
| 1.1.7b P4 | complete | 기능 `ddc1d7c`, PR/push Actions `35991662815`/`35990242886` verify·네 signed image PASS, 1152/rollback·같은 SHA 개발 공개 저장/격리/재시작 인수; 실기기 사용자 보류 |
| 1.1.7b P5 | complete | 기능 `acd2bd9`, PR/push Actions `35997369606`/`35997349571` verify·네 signed image PASS, 같은 SHA 개발 공개 저장/공유 회수/export/trash·재시작 영속 인수, 합성 자료 0건; 정식 발행 미승인 |

## 활성 작업

| 담당자 | 버전/Phase | 작업 ID | 수정 경로 | 의존성 | 시작 시각 | 상태 |
|---|---|---|---|---|---|---|
| Codex | 1.1.7b/P5 | LC-RD-117B-P5-01~08 | 18 WC·22원인/24수용 봉인, 문서/validator·최종 CI·개발 인수·1.2.0 인계 | P4 문서 `53ed14f`, 기능 `acd2bd9`/Actions `35997349571`·`35997369606`; 실기기 사용자 보류 | 2026-09-24 | complete |
| Codex | 1.1.7b/P4 | LC-RD-117B-P4-01~08 | 회귀·차단·1152 DB 호환·application rollback·공개 개발 인수 | P3 문서 `cc4fc56`, 기능 `ddc1d7c`/Actions `35990242886`·`35991662815`; 실기기 사용자 보류 | 2026-09-24 | complete |
| Codex | 1.1.7b/P3 | LC-RD-117B-P3-01~09 | apps/collaboration, packages/auth/database/domain/editor copy, web list/search/song/trash/dialog/style와 대응 시험 | P2 인수 `dcfa2b8`, source head `c230c02`/기능 `0375825`; 기능 `1626c75` 동일 SHA 개발 인수 | 2026-09-23 | complete |
| Codex | 1.1.7b/P2 | LC-RD-117B-P2-01~09 | 편집·저장·탐색·PWA 코드/호출자/시험 통합 | P1 기능 `a04bbcb`, source `c230c02`/기능 `0375825`, 완료 기능 `3915a71`·동일 SHA 개발 공개 인수; 보호 계획 문서 불변 | 2026-09-23 | complete; P3 전 사용자 요청 일시 중단 |
| Codex | 1.1.7b/P1 | LC-RD-117B-P1-01~08 | 버전/source freeze·release/image/deploy validator·환경 경계·DB matrix·CI/개발 인수 | 기능 `a04bbcb`, PR/push Actions `35849543496`/`35849536417`와 동일 SHA 공개 개발 인수 완료 | 2026-09-23 | complete |
| Codex | 1.1.7b 선행 통합 계획 (구현 Phase 아님) | PLAN-RD-117B | 3.Redesign-phase/1.1.7.b, 후속 순서·후보 소유권·버전 정책·실행 STATUS의 다음 계획 | 사용자 1.1.8 웹 안정화 선행 통합 지시; source c230c02/기능0375825 | 2026-09-23T12:18+09:00 | documented (5 Phase·42작업·24수용 기준·18 WC 상세 계획 및 문서 검증; 제품 미착수) |
| Codex | 1.2.1 이후 계획 정비 (구현 Phase 아님) | PLAN-RD-12X | 3.Redesign-phase 후속 버전·추적·수용 계획, 계획 진입·Future 인수, 실행 STATUS의 계획 작업 기록 | 2026-09-22 사용자 요청; 0922 리뷰와 1.2.0 계획 인수; 네이티브 보류 유지 | 2026-09-22T19:22+09:00 | documented (8버전·41 Phase·205작업·리뷰/원격 비교 검증 완료; 제품 미착수) |
| Codex | 1.2.0 계획 정비 (구현 Phase 아님) | PLAN-RD-120 | 3.Redesign-phase 목업·계획, 2.Patch-phase 보류·진입 문서, 실행 STATUS 다음 계획 | 2026-09-22 사용자 코발트 Chroma Dock 선택·1.1.8 이후 보류 지시; v1.1.7a 기준 | 2026-09-22 | documented (계획·목업 검증 완료; 제품 Phase 미착수) |
| Codex | 1.1.7a/P5 | LC-PLAN-117A-P5-01~05 | 사용자/지원·요구 추적·30 migration/환경/license/manifest·최종 CI/동일 SHA 개발·승인된 전용 릴리스 | 후보 `fd4d901`, merge/tag `fc2463c`, Actions `35047546033`·`35050125353`·`35052520619`, 개발/운영 exact SHA·signed digest·공개 smoke·합성 자료 0건·GitHub Release PASS | 2026-09-16 | complete |
| Codex | 1.1.7a/P4 | LC-PLAN-117A-P4-01~06 | 두 계정·재로그인·Google 제공값·사진/RLS·ACK 유실·홈 이탈·PC/mobile 및 Linux 5-project 대리 회귀·상태/Future | P3 PR #148 merge `b4e5200`, 후보 `7621e8e`, Actions `35043634916` verify/네 signed dev image·동일 SHA 공개 재시작/두 owner 격리 PASS | 2026-09-16 | complete |
| Codex | 1.1.7a/P3 | LC-PLAN-117A-P3-01~05 | 설정 계정 프로필 UI·셸 avatar/닉네임·브랜드 `/workspace` 이동·저장 이탈 guard·PC/mobile E2E/상태/Future | 후보 `675dbafa`, PR #148 merge `b4e5200`, Actions `35037281111` verify/네 signed dev image·동일 SHA 개발 공개 합성 프로필 영속 PASS | 2026-09-16 | complete |
| Codex | 1.1.7a/P2 | LC-PLAN-117A-P2-01~05 | 1151 migration·owned/auth/beta/signup·profile/photo API·공유/export/lifecycle·관련 검증·상태/Future | PR #147 기능 `4c2a42a`, Actions `35026679109` verify/네 signed dev image PASS·동일 SHA 공개 live/ready/합성 owner GET→PATCH→재조회→복귀 PASS; P3 UI 인계 | 2026-09-16 | complete |
| Codex | 1.1.7a/P1 | LC-PLAN-117A-P1-01~06 | 계약·단일 버전 경계·P1 CI/개발 인수 | `v1.1.7` source `edb8b4a`; 후보 `38cced2`, Actions `35019632430` 전체 verify/네 signed dev image PASS·동일 SHA 공개 live/ready/auth/네 health PASS; 제품 기능은 P2~P5 인계 | 2026-09-16 | complete |
| Codex | 1.1.7/P5 | LC-NF-1.1.7-P5-01~03 | 사용자 안내·플랫폼 탐색/공통 계약·최종 artifact/CI·개발 공개 인수·상태/Future | 후보 `b1a1e2c`; Actions `34900342849`·`34900363577`; 네 signed dev image·동일 SHA 개발 공개 인수 완료, native gate 미실행 | 2026-09-15 | complete |
| Codex | 1.1.7/P4 | LC-NF-1.1.7-P4-01~03 | 1.1.7 회귀·접근성/성능 대리·협업/presence/font/IME 영향·상태/Future | 후보 `66f2f79`, 두 CI·네 signed dev image·동일 SHA 개발 공개 저장/재시작 인수 완료; 실제 OS/기기·AT·OS zoom은 별도 미실행 | 2026-09-15 | complete |
| Codex | 1.1.7/P3 | LC-NF-1.1.7-P3-01~03 | 목록/편집/공유/Suno 복귀·drag/context 대안·PC/mobile 회귀·상태/Future | 후보 `740b1e3`, 두 CI·네 signed dev image·동일 SHA 공개 PC/mobile×dark/light PASS; 실제 OS/기기·AT는 browser 대리와 분리 | 2026-09-15 | complete |
| Codex | 1.1.7/P2 | LC-NF-1.1.7-P2-01~03 | quick-add·rhyme/prompt new route/screen·returnTo 회귀·상태/Future | 후보 `206b14f`; Actions `34881741352`·`34881745605`; 네 signed dev image·동일 SHA 공개 인수 | 2026-09-15 | complete |
| Codex | 1.1.7/P1 | LC-NF-1.1.7-P1-01~03 | 실제 과제·동선 관찰·P1 문서·STATUS·요구 추적·Future | 1.1.6 release `f8d24c6`; 기록 main `5a72780` | 2026-09-15 | complete |
| Codex | 1.1.6/Release | 승인된 release gate | main CI·annotated tag·정식 image·릴리스 서버 exact digest·공개 smoke·전역 beta CLI | 1.1.6 P5 `7f4ac5b`; main/tag `f8d24c6` | 2026-09-15 | complete |
| Codex | 1.1.6/P5 | LC-NF-1.1.6-P5-01~06 | 요구 추적·사용자/지원/보안/자가호스팅·봉인 artifact·최종 CI·개발/정식 인수 | 후보 `7f4ac5b`; Actions `34864142932`·`34864188502`; 동일 SHA 개발 인수 | 2026-09-15 | complete |
| Codex | 1.1.6/P4 | LC-NF-1.1.6-P4-01~06 | editor/save/permission/copy/export/offline/reconnect/restart·지원 browser 회귀·상태/Future | 후보 `25d7102`; Actions `34857969866`·`34857974913`; 동일 SHA 개발 인수 | 2026-09-14 | complete |
| Codex | 1.1.6/P3 | LC-NF-1.1.6-P3-01~06 | editor/resource/auth/share/recovery PC·mobile flows·E2E·guide·상태/Future | 후보 `e6f9e8c`; Actions `34833243878`·`34833266060`; 동일 SHA 개발 인수 | 2026-09-14 | complete |
| Codex | 1.1.6/P2 | LC-NF-1.1.6-P2-01~06 | web editor/auth/share/recovery surfaces·editor contract·runtime metadata·tests·상태/Future | P1 `3e7eaa4`; 후보 `a75f641`; 두 CI·동일 SHA 개발 인수 | 2026-09-14 | complete |
| Codex | 1.1.6/P1 | LC-NF-1.1.6-P1-01~06 | P1 계획·편집/복구 계약·STATUS·요구 추적·Future 인수 | main 기록 `98c2a29`; 제품 source `17fb4a9`; B-1 승인 | 2026-09-14 | complete |
| Codex | 1.1.5/Release | 승인된 release gate | main CI·annotated tag·정식 image·릴리스 서버 exact digest·공개 smoke·전역 beta CLI | 1.1.5 P5 `074782e`; main/tag `17fb4a9` | 2026-09-14 | complete |
| Codex | 1.1.5/P5 | LC-NF-1.1.5-P5-01~06 | 요구 추적·사용자/지원/보안/자가호스팅·봉인 artifact·최종 CI·개발/정식 인수 | 후보 `074782e`; Actions `34814063096`·`34814075649`; 동일 SHA 개발 인수 | 2026-09-14 | complete |
| Codex | 1.1.5/P4 | LC-NF-1.1.5-P4-01~06 | 저장/복구·권한·offline/reconnect/restart·지원 browser 회귀·상태/요구/Future | 후보 `8fb03be`; Actions `34811056142`·`34811076974`; 동일 SHA 개발 인수 | 2026-09-14 | complete |
| Codex | 1.1.5/P3 | LC-NF-1.1.5-P3-01~06 | 공통 header·rail/mobile nav·목록/grid·곡 workspace·PC/mobile E2E·상태/요구/Future | 후보 `24cef7e`; Actions `34808547591`·`34808550793`; 동일 SHA 개발 인수 | 2026-09-14 | complete |
| Codex | 1.1.5/P2 | LC-NF-1.1.5-P2-01~06 | config/root layout/token/styles/version/compose·신규 PC/mobile 회귀·상태/요구/Future | 후보 `43980ba`; Actions `34803929839`; 동일 SHA 개발 인수 | 2026-09-14 | complete |
| Codex | 1.1.5/P1 | LC-NF-1.1.5-P1-01~06 | P1 계약·실제 shell/token/list/route/test 조사·상태/요구/Future | UX P5 merge `107ec24`; 승인 tree `a3a0250` | 2026-09-14 | complete |
| Codex | UX/P5 | LC-DESIGN-UX-P5-01~06 | 승인 manifest·1.1.5 인계·PROD-NF-006·UX P5 인수 | UX P4 merge `f2b2b8f`; 승인 artifact `8ce1dab` | 2026-09-14 | complete |
| Codex | UX/P4 | LC-DESIGN-UX-P4-01~07 | `new_Mock-up` 수정·interaction/change log·`docs/ux` P4 검토·P4 인수 | UX P3 merge `3ea7515`; 수정 `0177c84` | 2026-09-14 | complete |
| Codex | UX/P3 | LC-DESIGN-UX-P3-01~07 | `new_Mock-up` 18화면·index·상태/토큰/제품 매핑·P3 인수 | UX P2 merge `7e290c1`; 목업 `ad1aced` | 2026-09-14 | complete |
| Codex | UX/P2 | LC-DESIGN-UX-P2-01~07 | `docs/ux`·prototype·design/UX P2·TOOLS-AND-SKILLS·선택 기록 | UX P1 merge `99dd580`; 사용자 `B-1` 선택 | 2026-09-14 | complete |
| Codex | UX/P1 | LC-DESIGN-UX-P1-01~06 | `docs/ux`·design/UX P1·현행 15화면/동선/상태/반응형/접근성 감사 | v1.1.4 `5f8a045`, 감사 `99c1e1e` | 2026-09-14 | complete |
| Codex | 1.1.4/Release | 승인된 release gate | main CI·annotated tag·정식 image·릴리스 서버 exact digest·공개 smoke | 1.1.4 P5 `081117d` | 2026-09-14 | complete |
| Codex | 1.1.4/P5 | LC-NF-1.1.4-P5-01~06 | 요구 추적·사용자/운영 문서·봉인 artifact·최종 CI·개발/정식 인수 | 후보 `081117d`, Actions `34786159783` | 2026-09-14 | complete |
| Codex | 1.1.4/P4 | LC-NF-1.1.4-P4-01~07 | 복원/offline writer·bounded queue·권한 회수/계정 격리·3계정/2 viewport·5-browser·실제 서비스 재시작 | 후보 `233afd2`, Actions `34783619444` | 2026-09-14 | complete |
| Codex | 1.1.4/P3 | LC-NF-1.1.4-P3-01~06 | actor 저장/복구 copy·계정 전환 local 격리·모바일 dialog/focus·PC/mobile E2E | 후보 `375ea78`, Actions `34780761622` | 2026-09-14 | complete |
| Codex | 1.1.4/P2 | LC-NF-1.1.4-P2-01~06 | 1140 delete fence·selected/public epoch·browser outbox/IME compact·DB/단위/복구 회귀 | 1.1.4 P1 `6f35313`, 후보 `3de111f` | 2026-09-14 | complete |
| Codex | 1.1.4/P1 | LC-NF-1.1.4-P1-01~06 | 사건 순서·queue 한도·증거 등급·입력표·호환/rollback·P2/P3/P4 담당 계약 | v1.1.3 `35fa482`, 계약 `6f35313` | 2026-09-14 | complete |
| Codex | 1.1.3/Release | 승인된 release gate | main CI·annotated tag·정식 image·릴리스 서버 exact digest·공개 smoke | 1.1.3 P5 `8abf21a` | 2026-09-14 | complete |
| Codex | 1.1.3/P5 | LC-NF-1.1.3-P5-01~06 | 요구 추적·현재/사용자/지원/보안/자가호스팅 문서·봉인 artifact·최종 CI·개발/정식 인수 | 1.1.3 P4 `3fd9f0d`, 후보 `8abf21a` | 2026-09-14 | complete |
| Codex | 1.1.3/P4 | LC-NF-1.1.3-P4-01~07 | read/write 불일치·token 자료 격리·지속 제한/owner 중지·offline/reconnect·restart·지원 browser 회귀 | 1.1.3 P3 `167ceb8`, 후보 `3fd9f0d` | 2026-09-14 | complete |
| Codex | 1.1.3/P3 | LC-NF-1.1.3-P3-01~06 | owner 공개 read/write 비교·위험 확인, guest CodeMirror·분리 복구함·저장 상태·PC/mobile E2E | 1.1.3 P2 `e58dd9c`, 후보 `167ceb8` | 2026-09-13 | complete |
| Codex | 1.1.3/P2 | LC-NF-1.1.3-P2-01~06 | 1130 schema·guest session/지속 예산·owner access API·public write ACK·migration/권한 회귀 | 1.1.3 P1 `68f694e`, 후보 `e58dd9c` | 2026-09-13 | complete |
| Codex | 1.1.3/P1 | LC-NF-1.1.3-P1-01~06 | 승인 증거·W⊆R·guest session/epoch·지속 제한·owner 중지·복구·호환/rollback 계약 | v1.1.2 `eb949b5`, 계약 `68f694e` | 2026-09-13 | complete |
| Codex | 1.1.2/Release | 승인된 release gate | main CI·annotated tag·정식 image·릴리스 서버 exact digest·공개 smoke | 1.1.2 P5 `8ec3cf9` | 2026-09-13 | complete |
| Codex | 1.1.2/P5 | LC-NF-1.1.2-P5-01~06 | 요구 추적·현재 문서·봉인 artifact·최종 CI·동일 SHA 개발 인수·정식 release gate | 1.1.2 P4 `b797224` | 2026-09-13 | complete |
| Codex | 1.1.2/P4 | LC-NF-1.1.2-P4-01~07 | W⊆R·3계정 동시 편집·epoch 경쟁·권한/복구·offline/reconnect·서비스 재시작 | 1.1.2 P3 `f8f2dbd` | 2026-09-13 | complete |
| Codex | 1.1.2/P3 | LC-NF-1.1.2-P3-01~07 | owner access UI·writer CodeMirror/상태·rejected 복구·selection/IME/undo·PC/mobile | 1.1.2 P2 `41db8ff` | 2026-09-13 | complete |
| Codex | 1.1.2/P2 | LC-NF-1.1.2-P2-01~07 | 1120 schema·W⊆R·actor/epoch 원자 update/ACK·local rejected queue·awareness 기반 | 1.1.2 P1, 기준 `d4c82b3` | 2026-09-13 | complete |
| Codex | 1.1.2/P1 | LC-NF-1.1.2-P1-01~07 | selected write W⊆R·writer 경계·epoch/ACK/attribution·undo/복구·presence/cursor 계약 | v1.1.1 `d4c82b3` | 2026-09-13 | complete |
| Codex | 1.1.1/Release | 승인된 release gate | main CI·annotated tag·정식 image·릴리스 서버 exact digest·공개 smoke | 1.1.1 P5 `f013154` | 2026-09-13 | complete |
| Codex | 1.1.1/P5 | LC-NF-1.1.1-P5-01~06 | 요구 추적·사용자/지원/보안/자가호스팅·봉인 artifact·최종 CI·개발/정식 인수 | 1.1.1 P4 `b920049` | 2026-09-13 | complete |
| Codex | 1.1.1/P4 | LC-NF-1.1.1-P4-01~07 | AC 전체·revision/메모 차단·offline/reconnect·restart·public presence·지원 browser 회귀 | 1.1.1 P3 `175fd74` | 2026-09-12 | complete |
| Codex | 1.1.1/P3 | LC-NF-1.1.1-P3-01~06 | owner 공개 링크 관리·비로그인 reader·fragment 제거·read-only live·PC/mobile E2E | 1.1.1 P2 `571398d` | 2026-09-12 | complete |
| Codex | 1.1.1/P2 | LC-NF-1.1.1-P2-01~06 | 실패 계약·1110 schema·capability·owner/public API·read-only WS·cache/log 경계 | 1.1.1 P1, 기준 `068679d` | 2026-09-12 | complete |
| Codex | 1.1.1/P1 | LC-NF-1.1.1-P1-01~06 | public-link read capability·token·회수·cache/OG·호환/rollback·담당 경계 | v1.1.0 `068679d` | 2026-09-12 | complete |
| Codex | 1.1.0/Release | 승인된 release gate | main CI·annotated tag·정식 image·릴리스 서버 exact digest·공개 smoke | 1.1.0 P5 `aa4d07f` | 2026-09-12 | complete |
| Codex | 1.1.0/P5 | LC-NF-1.1.0-P5-01~06 | 요구 추적·사용자/운영 문서·봉인 artifact·최종 CI·개발/정식 인수 | 1.1.0 P4 `3e20728` | 2026-09-12 | complete |
| Codex | 1.1.0/P4 | LC-NF-1.1.0-P4-01~06 | AC 전체·다른 계정·offline/reconnect·restart·지원 browser 권한/복구 회귀 | 1.1.0 P3 `e315d4b` | 2026-09-12 | complete |
| Codex | 1.1.0/P3 | LC-NF-1.1.0-P3-01~07 | owner 공유 관리·reader view·auth return·read-only sync/presence·PC/mobile E2E | 1.1.0 P2 `046a98c` | 2026-09-12 | complete |
| Codex | 1.1.0/P2 | LC-NF-1.1.0-P2-01~07 | migration·DB store·HTTP grant/viewer·collaboration actor/read 권한·계약 시험 | 1.1.0 P1, 기준 `6d4921f` | 2026-09-12 | complete |
| Codex | 1.1.0/P1 | LC-NF-1.1.0-P1-01~06 | sharing 계약·결정 문서·수용 입력·담당/rollback | v1.0.14 + evidence `6d4921f` | 2026-09-12 | complete |
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

1.1.7 P5 후보 `b1a1e2c17b4385ed2d9acb267664197692186897`은 사용자/목업 탐색과 Windows/Linux/macOS/Android/iOS 공통 CodeMirror/Yjs·URL·저장/권한/복구 계약, 29개 migration·환경·license·release artifact를 봉인했다. Node 24 로컬 artifact/final/document/environment·11 workspace typecheck/build·1.1.7 계약 6건과 push/PR Actions `34900342849`·`34900363577` 전체 PASS, 실제 PostgreSQL Vitest 376 PASS/4 조건부 skip, Chromium 전체 E2E 379 PASS/43 조건부 skip, release matrix 10 PASS를 통과했다. push 첫 시도의 migration DB pool 종료 정리 `57P01`은 같은 SHA failed job 재실행에서 통과했다. 네 signed dev image의 SHA/P5/Dev tag가 서비스별 동일 digest이고, 같은 SHA 개발 서버 `1.1.7/dev/p5`, schema `1140_sharing_stability.sql`, 네 서비스 healthy에서 공개 reduced motion·720px reflow·forced colors·focus·4배 CPU mobile 저장과 서비스 재시작 뒤 API/CRDT/revision exact 원문·목록 복귀를 PASS했다. fixture를 제거하고 DB volume·secret·allowlist를 보존했다. 신규 P0/P1·원문 유실·인가 우회·무음 저장 실패는 0건이다. 실제 native SDK·앱·OS/물리 기기·IME/AT/zoom·서명/스토어는 미실행이며 승인된 main/tag/image/릴리스 서버 gate로 이동한다.

1.1.7 P2 후보 `206b14feb20c6c050662c2eda29c53bfba19e0bb`는 quick-add의 현재 가사 경로를 새 라임·프롬프트에 명시적 `returnTo`로 전달하고 생성 성공·편집 back에서 같은 경로로 복귀시킨다. 첫 후보 `5ae6f30`의 기본 목록 query가 깨뜨린 기존 직접 생성·template·offline recovery 14건을 CI에서 확인하고 명시적 입력에만 query를 붙여 기존/신규 16 PASS로 보정했다. push/PR Actions `34881741352`·`34881745605`, 네 signed dev image와 서비스별 SHA/Phase/Dev tag 동일 digest를 통과했다. 같은 SHA 개발 서버 `1.1.7/dev/p2`, schema `1140_sharing_stability.sql`, B-1 root와 네 서비스 healthy에서 공개 1440/390px×light/dark 새 라임·프롬프트 생성→중첩 가사 URL·exact 한글 본문 복귀, focus·overflow를 PASS하고 fixture를 제거했다. API·DB·migration·권한·copy 변화는 0이며 실제 Android/iOS 앱·물리 기기·OS IME·AT·zoom은 미실행이다. P3는 이 경계를 유지하며 플랫폼별 목록→편집→공유·Suno 복귀와 보이는 drag/context 대안을 검토한다.

1.1.7 P1은 정식 runtime `f8d24c610ce24a1ff926e77204783473b936da88`에서 가입→곡/가사→라임 삽입→문장 프롬프트 exact copy→Suno→재진입을 PC Chromium과 Android/iOS browser 대리에서 6 PASS하고 tag CI `34871969616`의 공유/복구 행렬을 재사용했다. 화면 전환과 control 조작을 분리해 기록했으며, 이미 연결된 자료 삽입/copy는 짧지만 quick-add의 새 라임·프롬프트가 현재 `returnTo`를 전달하지 않아 자동 생성 뒤 원래 가사 문맥을 잃는 막힘을 확인했다. P2는 기존 `safeWorkspaceReturnTo`로 query를 전달하고 생성 성공/취소/back만 원래 문맥으로 복귀시키며 API·DB·권한·resource/draft key는 바꾸지 않는다. 외부 NAVER 사전은 1.0.13 no-go이고 실제 Android/iOS/OS IME/AT/zoom 및 이번 Google callback은 미실행이다. P1은 문서-only라 runtime/image/dev/release 배포를 수행하지 않았다.

1.1.6은 PR #133 merge 뒤 main과 annotated `v1.1.6`이 `f8d24c610ce24a1ff926e77204783473b936da88`을 가리킨다. main Actions `34868654180`와 tag Actions `34871969616`의 전체 verify와 네 정식 image 발행·서명/provenance/SBOM을 통과했다. 서비스별 `1.1.6`·source SHA·`Release`·`latest`·`Release-latest` 동일 digest를 확인하고 릴리스 서버에 migrate 우선 exact digest로 배포해 `1.1.6/release`, phase 없음, schema `1140_sharing_stability.sql`, 네 서비스 healthy를 확인했다. 공개 PC/mobile×dark/light 생성·연결·저장/재진입과 3계정 공유/복구·offline writer 병합·bounded queue·권한 회수·계정/메모 격리, 실제 서비스 재시작 뒤 exact body 지속성이 PASS했고 fixture를 제거했다. 기존 DB volume·secret·HMAC allowlist·beta code와 `/usr/local/bin/LyricsCloud betacode ls`를 보존하고 GitHub Release를 발행했다. 실제 OS/물리 기기·OS IME/AT/OS zoom 미실행과 `OPS-100-001` backup 예외를 유지하며 1.1.7 P1로 이동한다.

1.1.6 P4 후보 `25d71022184c4873d97bd432d3f31a53e803bb60`은 classic/B-1 exact copy/export, 720/390px sheet 경계와 editor focus 복귀를 보강하고 presence/undo 검사의 실제 비동기 상태를 안정적으로 기다리게 했다. Node 24 실제 DB Vitest 369 PASS/4 조건부 skip, collaboration·undo 재현 각 10회, PR/push Actions `34857974913`·`34857969866` 전체 PASS와 네 OCI 1.1 signed dev image tag 동일 digest를 통과했다. push 첫 성능 측정은 revision p95 6.073ms로 예산 안이었으나 runner round 편차만 기준을 넘어 같은 SHA failed job을 전체 범위로 재실행했다. 동일 SHA 개발 서버 `1.1.6/dev/p4`, schema `1140_sharing_stability.sql`, 네 서비스 healthy에서 공개 desktop/mobile×light/dark 생성/연결/focus/overflow, server ACK→재진입 exact body와 실제 서비스 재시작 뒤 저장 보존을 PASS하고 fixture를 제거했다. 릴리스 서버는 변경하지 않았고 실제 OS/물리 기기·OS IME/AT/OS zoom은 P5의 미실행 경계로 인계한다.

1.1.6 P3 후보 `e6f9e8c266d3d61c7016aa51519ff4fc5703fdbe`는 새 가사·라임·프롬프트와 곡 연결 관리에 B-1 semantic surface를 명시하고 light/dark·desktop/mobile의 입력·loading/empty/error/retry·mobile sheet·focus 복귀를 고정했다. 가입 코드 오류·공유 권한 회수/guest 복구·탈퇴 재인증·라임/프롬프트 초안과 10,000줄 editor 연속성은 관련 40 PASS/6 조건부 skip에서 함께 확인했다. Node 24 check/build·Vitest 258 PASS/115 조건부 skip, push/PR Actions `34833243878`·`34833266060` 전체 PASS와 네 서명 dev image tag 동일 digest를 통과했다. 같은 SHA 개발 서버 `1.1.6/dev/p3`, schema `1140_sharing_stability.sql`, 네 서비스 healthy에서 공개 화면 행렬과 server ACK 저장→API 재진입 exact 한글 본문이 PASS했고 합성 fixture를 제거했다. API/DB/migration/capability/copy 변경은 0이며 릴리스 서버는 변경하지 않았다. 실제 OS IME·AT·물리 기기/OS zoom은 P4/P5 gate로 유지한다.

1.1.6 P2 후보 `a75f64166b5a80e077ac7f458b6eb86668a7d957`은 편집기 visual shell과 resource navigation effect를 CodeMirror 생명주기에서 분리하고 lyric/rhyme/prompt save strip·자료 panel/mobile sheet·auth/share/recovery flat surface를 적용했다. 기존 API·DB schema/migration·권한·copy는 바꾸지 않았다. 10,000줄 동일 editor DOM·theme/panel/viewport·undo·서버 저장·GC heap 회귀와 전체 unit/build/DB/E2E를 통과했고, 기존 save 성능 7표본 p95가 최댓값이던 CI 변동은 기준을 완화하지 않고 save만 21표본으로 안정화해 연속 3회 예산을 통과했다. push/PR Actions `34828840416`·`34828845357`, 네 서명 dev image와 동일 SHA 개발 서버 `1.1.6/dev/p2`를 인수했으며 공개 create/save/reopen/recent/deep link와 1440/1024/mobile×dark/light가 PASS했다. 합성 fixture 제거, DB volume·secret·allowlist 보존, 릴리스 서버 무변경이다. 실제 OS IME·AT·물리 기기/OS zoom은 P4/P5 gate로 유지하며 P3는 화면군 정상·빈 상태·실패·권한·focus와 사용자 가이드를 완성한다.

1.1.6 P1은 1.1.5 정식 릴리스 기록 main `98c2a29566b6d8382f19ddbc44560a28fcaaebf2`와 실제 제품/tag source `17fb4a9377584c477220092ed91317182f112c8b`를 기준으로 가사·라임·프롬프트 편집기, 자료 패널, 가입/beta, 공유·회수, 탈퇴·복구와 modal focus의 B-1 적용 경계를 계약했다. 같은 resource의 CodeMirror DOM과 CRDT/selection/undo/scroll/IME/outbox를 시각 전환 중 재생성하지 않고, 최신 ACK 전에는 저장 완료를 표시하지 않으며 actor/resource/capability/epoch 복구 격리와 copy payload를 보존한다. API·DB·migration·URL·local store key는 변경하지 않고 classic flag 또는 1.1.5 exact image의 application-first rollback을 사용한다. P1은 문서-only라 앱 CI·image·개발/릴리스 서버 배포를 수행하지 않았고, 실제 OS/물리 기기·OS IME/AT/OS zoom은 P4/P5 미실행 gate로 유지한다. P2는 `tests/new-feature/1.1.6.contract.test.ts`의 실패 우선 계약부터 시작한다.

1.1.5는 PR #127 merge 뒤 main과 annotated `v1.1.5`가 `17fb4a9377584c477220092ed91317182f112c8b`를 가리킨다. main Actions `34816897879`와 tag Actions `34819313816`의 전체 verify와 네 정식 image 서명·provenance·SBOM을 통과했다. 서비스별 `1.1.5`·source SHA·`Release`·`latest`·`Release-latest` 동일 digest를 확인하고 릴리스 서버에 migrate 우선 exact digest로 배포해 `1.1.5/release`, phase 없음, schema `1140_sharing_stability.sql`, 네 서비스 healthy를 확인했다. 공개 PC/mobile×dark/light B-1·3계정 복원/offline writer 병합·bounded/drained outbox·권한 회수·계정/메모 격리와 실제 서비스 재시작 뒤 exact body·recent deep link가 PASS했고 fixture를 제거했다. 기존 DB volume·secret·HMAC allowlist·beta code와 `/usr/local/bin/LyricsCloud betacode ls`를 보존하고 GitHub Release를 발행했다. 실제 OS/물리 기기·OS IME/AT/OS zoom 미실행과 `OPS-100-001` backup 예외를 유지하며 1.1.6 P1로 이동한다.

1.1.5 P5 후보 `074782e8de24b96b7a9bab2fecff90ce2c2a1c6e`는 29개 불변 migration·B-1/classic environment·license·release manifest와 요구/사용자/운영 문서를 봉인했다. Node 24 check와 push/PR Actions `34814063096`·`34814075649` 전체 PASS, Vitest 365 PASS·4 skip, 전체 E2E 365 PASS·41 skip, 1.1.0~1.1.4·release browser matrix를 통과했다. 네 dev image의 SHA·`dev-1.1.5-p5`·`Dev`·`Dev-latest`가 서비스별 동일 digest이고, 같은 SHA 개발 서버의 `1.1.5/dev/p5`, schema `1140_sharing_stability.sql`, 네 서비스 healthy를 확인했다. 공개 PC/mobile×dark/light B-1 root·overflow와 실제 서비스 재시작 뒤 exact body·recent deep link·접근 격리가 PASS했고 합성 fixture를 제거했다. 신규 P0/P1·원문 유실·인증 우회·무음 저장 실패는 0건이다. 실제 OS/물리 기기·OS IME/AT/OS zoom 미실행과 `OPS-100-001` backup 예외를 유지하며 승인된 main/tag/image/릴리스 서버 gate로 이동한다.

1.1.5 P4 후보 `8fb03becfe27a95f019defb4cbdfee10b55f6812`는 B-1 shell 조작 중 같은 CodeMirror DOM, offline 한글 원문→reconnect server exact body→reload, recent filter/deep link, 양 theme/focus와 다른 owner 격리를 회귀로 고정했다. Node 24 check, 격리 PostgreSQL PC/mobile 4 PASS, 5-browser engine 10 PASS와 push/PR Actions `34811056142`·`34811076974` 전체 PASS를 통과했다. Vitest 365 PASS·4 조건부 skip, 전체 Playwright 365 PASS·41 조건부 skip이며 네 dev image의 source/P4/Dev tag 동일 digest·서명도 완료했다. 같은 SHA 개발 서버의 `1.1.5`·`dev`·`p4`, schema `1140_sharing_stability.sql`, B-1 root와 네 서비스 healthy를 확인하고 공개 PC/mobile×dark/light 및 서비스 재시작 전후 exact body·recent deep link를 PASS한 뒤 fixture를 제거했다. 앱/API/DB/migration 변경은 0이며 실제 OS IME·screen reader·물리 기기/OS zoom은 미실행으로 유지한다. P5는 이 후보를 문서·artifact에 봉인하고 최종 CI·동일 SHA 개발 인수 뒤 승인된 정식 릴리스 gate로 이동한다.

1.1.5 P3 최종 후보 `24cef7eee5c6d6c77689f47cbd4c740287ab511d`는 승인 B-1의 context header, rail tooltip/current state, mobile 5개 주 내비+More, flat list/workspace를 적용하면서 기존 route/filter/order와 동일 CodeMirror/store/draft/outbox를 유지한다. push/PR Actions `34808547591`·`34808550793` 전체 PASS, 네 개발 image의 source/P3/Dev tag 동일 digest·서명과 같은 SHA 개발 서버의 공개 PC/mobile×dark/light root/overflow, 합성 저장→API 재진입→최근 복귀→인증 deep link를 통과했고 fixture를 제거했다. API/DB/migration/capability 변경은 0이며 실제 OS IME·screen reader·물리 200% zoom은 P4에서 자동 증거와 구분해 남긴다. P4는 저장 중 shell 전환·deep link/filter/recent·양 theme/focus·다른 계정/offline/reconnect/restart/지원 browser 회귀만 수행한다.

1.1.5 P2 후보 `43980ba70d388897a0c8c42552b44d34462c24b9`는 `LC_UI_VARIANT`가 승인된 `classic|b1`만 받고 미지정 시 B-1이 되도록 실패 테스트부터 구현했다. server-rendered `<html data-ui-variant>`와 dark/light semantic token alias만 추가해 같은 component child/store/draft/outbox를 유지하며, classic에는 기존 cascade를 추가로 적용하지 않는다. VERSION·package·compose·CI·Playwright metadata는 1.1.5로 일치한다. Actions `34803929839` 전체 verify와 네 개발 image 발행/서명이 PASS했고 각 서비스의 SHA·`dev-1.1.5-p2`·`Dev`·`Dev-latest` tag가 서비스별 동일 digest다. 같은 SHA 개발 서버의 네 서비스 healthy, schema `1140_sharing_stability.sql`, 공개 PC/mobile×dark/light root/token/overflow와 합성 곡·가사 생성→서버 저장→API 재진입→최근 복귀→인증 deep link가 PASS했으며 합성 계정·자료는 제거했다. API/DB/migration/capability 변화는 0이다. P3는 이 child/store를 유지한 채 shell/list/workspace 구조만 전환한다.

1.1.5 P1은 main `107ec24237cb2633f0e3d0d4ea6e78dd5265e8bd`의 WorkspaceShell/root layout/token/styles, 세 목록·dashboard, returnTo/filter route와 기존 회귀를 조사해 B-1 shell 계약을 승인했다. P2는 server-rendered `LC_UI_VARIANT=classic|b1`와 root data attribute, semantic token/surface만 구현하고 P3가 중복 workspace tab·목록/workspace를 전환한다. 두 variant는 같은 child/store/draft/outbox를 쓰며 API/DB/migration/capability 변경은 0이다. editor remount·IME/selection/undo/draft 유실·거짓 저장·교차 계정 노출은 즉시 중단/classic rollback 조건이다. P1은 문서-only라 실제 앱/DB/browser/dev 배포를 수행하지 않았다.

UX P5는 사용자의 B-1 통합 workspace+Flat-depth 선택과 1.1.14까지의 계획된 실행 승인을 P4 의미 불변 수정 뒤 최종 구현 인수로 봉인했다. 승인 artifact `8ce1dab07625174b10637b8b06c5f708e99bfd53`, new_Mock-up tree `a3a0250fba5250e7e20092a25dd5bd5e064b2256`와 제품 기준 v1.1.4 source, P1~P4 merge를 manifest에 연결하고 PROD-NF-006을 Accepted로 전환했다. 1.1.5는 token→shell→list/workspace feature flag, 실제 app 경로 재조사, deep link/view preference/focus, editor 비재마운트, 실제 DB/browser 복구, 동일 SHA 개발 인수 순서로 착수한다. UX는 runtime/DB/server를 바꾸지 않았으며 실제 OS/IME/AT/물리 기기·native SDK/서명 gate는 통과로 간주하지 않는다.

UX P4는 B-1과 현행의 가입→창작, 편집, 라임/프롬프트, 최근 재개, 공유/회수 과제를 대조하고 기능 삭제/원문/API/권한 변경 없이 mobile editor label·320px 검색 field·공유 editor 6px overflow를 수정했다. 최종 18화면×양 theme×11 viewport/platform 396페이지 overflow 0, 144 Axe serious/critical 0, 72 keyboard/focus 0이며 reduced-motion/forced-colors·불투명 fallback·외부 요청 0을 확인했다. token→shell→workspace→editor→sharing feature flag와 rollback 조건, portal/sheet focus 계약을 고정했다. 실제 AT·OS/물리 기기·IME·OS zoom·저사양 GPU는 미실행이고 B-1 의미가 바뀌지 않아 P2 선택 재확인 대상은 아니다. P5는 이 결과와 사용자의 B-1·1.1.14 실행 승인을 design manifest로 봉인하고 1.1.5 P1에 넘긴다.

UX P3는 B-1 통합 workspace+Flat-depth를 18개 화면별 README/HTML과 전체 index, light/dark·Windows/Linux/macOS/iOS/Android 문맥, 정상/빈/로딩/오류와 코드 만료·IME·offline·미전송·권한 철회·자기 입력 복구 상태로 구체화했다. 231조합의 horizontal overflow와 serious/critical Axe 위반이 0건이고 보호된 old Mock-up diff는 0이다. prototype은 서버 저장/OAuth/ACL/collaboration/사전 호출을 하지 않으며 모든 콘텐츠가 합성임을 화면 상단과 문서에 고정했다. 실제 OS·IME·screen reader·물리 기기·GPU는 미실행이므로 P4는 320/360/390/tablet/desktop·200% reflow·keyboard/focus·reduced motion/forced colors를 자동 검토하고 실제 수행/미수행을 분리한다.

UX P2는 A 보수적 shell/B 통합 workspace와 Flat-depth/Glass/Neumorphism/Clay/Liquid Glass를 같은 가사 편집 과제, 양 theme, 320/390/1440px에서 비교했다. 60조합의 serious/critical Axe 위반과 horizontal overflow가 0건이었고 외부 계정·Figma·image generation·GSAP·신규 runtime dependency 없이 repository-native prototype으로 고정했다. 사용자는 `B-1` 통합 workspace+Flat-depth를 선택하고 실행 범위를 1.1.14까지 확대했다. 기능 삭제는 승인되지 않았고 Liquid/Glass는 선택되지 않았으므로 P3는 불투명 semantic surface·한 primary navigation·mobile 핵심 4행동 이하를 기준으로 PC·iOS·Android 상태별 new_Mock-up을 만든다.

UX P1은 정식 v1.1.4 source `5f8a04512c005cb7c211630dc8bf43f42787b60f`의 기존 15화면과 beta/Suno/read-write 공유·탈퇴·복구 흐름을 route/component/state에 연결하고 가입→창작→copy→재개 및 공유/회수의 단계·막힘을 감사했다. 격리 PostgreSQL production build의 responsive/accessibility/shortcut 12 PASS·조건부 4 skip과 15화면×320/390/768/1440px 60장 합성 캡처를 대조해 mobile editor 9개 dock label 붕괴, dashboard 긴 card stack, PC navigation 중복 등 `UX-GAP-01~06`을 우선순위화했다. 실제 NVDA/VoiceOver/TalkBack·물리 touch/safe-area·OS zoom/IME는 미실행으로 명시했고 앱/runtime/DB/기존 목업/운영을 변경하지 않았다. P2는 보수적 shell과 통합 workspace, flat-depth/glass/neumorphism/clay/liquid glass를 같은 과제로 비교하고 사용자의 명시 선택 전 P3 new_Mock-up을 시작하지 않는다.

1.1.4는 PR #116 merge 뒤 main과 annotated `v1.1.4`가 `5f8a04512c005cb7c211630dc8bf43f42787b60f`을 가리킨다. main Actions `34789430853`과 tag Actions `34790980889` 최종 3차 실행의 전체 verify와 네 정식 image 서명·provenance·SBOM을 통과했다. 첫 tag 실행은 절대 성능 예산을 통과한 초단기 revision 측정 CV 노이즈, 두 번째는 기존 collaboration WebSocket 시험 한 건의 15초 제한 초과였고, 실제 PostgreSQL 집중 재검증 4/4와 불변 tag 전체 재실행 PASS로 일시 오류임을 확인했다. 서비스별 `1.1.4`·source SHA·`Release`·`latest`·`Release-latest`의 동일 digest를 확인하고 운영 서버에 migrate 우선 exact digest 배포해 `1.1.4`·`release`·phase `null`, schema `1140_sharing_stability.sql`, 네 서비스 healthy를 확인했다. 공개 3계정·2 viewport에서 owner 복원과 offline writer 병합, bounded/drained outbox, reader 회수, 계정 전환 local store·본문·권한·메모 격리와 실제 서비스 재시작 지속성이 PASS했고 합성 fixture를 0건으로 제거했다. 기존 DB volume·secret·HMAC allowlist·beta code를 보존하고 GitHub Release를 발행했다. 실제 장시간·OS/물리 기기·OS IME/절전 미실행과 `OPS-100-001` backup 예외를 유지하며 UX P1 현행 경험 감사로 이동한다.

1.1.3은 PR #110 merge 뒤 main과 annotated `v1.1.3`이 `35fa482e31b13a96ed0f4b53754ebe672d23634d`을 가리킨다. main Actions `34773400193`과 tag Actions `34774978060`의 전체 verify와 네 정식 image 서명·provenance·SBOM을 통과했으며 서비스별 `1.1.3`·`Release`·`latest`·`Release-latest`의 동일 digest를 확인했다. 운영 서버에 migrate 우선 exact digest 배포해 `1.1.3`·`release`·phase `null`, schema `1130_public_lyric_guest_write.sql`, 네 서비스 healthy를 확인했다. 공개 운영에서 selected/public 충돌과 ACL 보존, 두 guest live 수렴, guest scope·private API/메모/연결 자료 격리, presence, offline rejected-only 복구·비자동 replay, 전체 회수와 서비스 재시작 지속성이 PASS했고 합성 fixture를 제거했다. 기존 DB volume·secret·HMAC allowlist·beta code를 보존하고 GitHub Release를 발행했다. 실제 OS/물리 기기 미실행과 `OPS-100-001` backup 예외를 유지하며 1.1.4 P1 공유 안정화 계약 검토로 이동한다.

1.1.2는 PR #103 merge 뒤 main과 annotated `v1.1.2`가 `eb949b59022cdd3185dae7349570439eca96b879`을 가리킨다. main Actions `34724875009`은 최초 실행의 performance 절대 예산은 통과했으나 짧은 microbenchmark revision round CV가 일시적으로 기준을 넘었고, 코드 변경 없는 재실행 전체 PASS로 분류했다. tag Actions `34726392136`의 전체 verify와 네 정식 image 서명·provenance·SBOM을 통과했으며 서비스별 `1.1.2`·`Release`·`latest`·`Release-latest`의 동일 digest를 확인했다. 운영 서버에 migrate 우선 exact digest 배포해 `1.1.2`·`release`·phase `null`, schema `1120_selected_lyric_write.sql`, 네 서비스 healthy를 확인했다. 공개 운영에서 owner/writer/reader live 수렴, writer 강등 뒤 읽기, reader/writer 회수, ACL·메모 격리, offline rejected 복구·재허용 비자동 적용과 서비스 재시작 지속성이 PASS했고 합성 fixture를 제거했다. 기존 DB volume·secret·HMAC allowlist·beta code를 보존하고 GitHub Release를 발행했다. 실제 OS/물리 기기 미실행과 `OPS-100-001` backup 예외는 유지한다. 1.1.3은 비로그인 guest를 포함하는 public-link write 정책을 사용자가 명시 승인하기 전에는 구현하지 않는다.

1.1.2 P4 후보 `b79722428c5836e794b74c38c63c404114e00b62`는 W⊆R 불일치 거부·ACL 불변, owner/writer 동시 한글·reader live 보기, actor/epoch duplicate ACK와 stale write 거부, writer 강등 뒤 읽기 유지·local rejected 복구, reader 완전 회수·재접속 차단, collaboration 재시작 수렴을 회귀로 고정했다. Node 24 check/build, 실제 PostgreSQL 집중 5 PASS, 5-browser 5 PASS를 통과했다. Actions push `34721549799`와 PR `34721572892`의 전체 verify에서 Vitest 353 PASS/4 skip, E2E 347 PASS/38 skip, selected-read 5 PASS, public-link 11 PASS/4 skip, selected-write 5 PASS, release matrix 10 PASS와 네 dev image 게시/서명을 완료했다. 같은 SHA 개발 서버의 `1.1.2`·`dev`·`p4`, schema `1120_selected_lyric_write.sql`, 네 서비스 healthy를 확인했다. 공개 4계정의 live·강등·회수·ACL·offline 복구·재허용 비자동 적용·메모 격리와 실제 서비스 재시작 뒤 writer/read 지속성이 PASS했고 fixture를 제거했다. 실제 물리 기기는 새로 실행하지 않았으며 P5가 문서·봉인·최종 release 위험을 담당한다.

1.1.2 P3 후보 `f8f2dbda5ac8924f9a5c5b70fdcf48adcaf5ebba`는 owner read/write 토글, writer CodeMirror와 저장/연결 상태, actor/epoch durable outbox, 강등·회수 뒤 local-only rejected 복구함, 동시 한글·undo, 서버 인증 presence/selection·idle·중복 탭을 완성했다. 서버 snapshot보다 앞선 복원 cursor가 durable update 채널을 닫던 경계를 pending awareness로 보류하고 ACK 뒤 재전송하도록 수정했다. Node 24 check/build·Vitest 247 PASS/109 skip, 실제 PostgreSQL 8 PASS, 오프라인 desktop/mobile 6/6 반복, 5-browser 5 PASS와 관련 편집/동기화 34 PASS를 통과했다. Actions push `34718575157`과 PR `34718576675`의 전체 verify와 네 dev image 게시/서명을 통과했고 같은 SHA 개발 서버의 `1.1.2`·`dev`·`p3`, schema `1120_selected_lyric_write.sql`, 네 서비스 healthy를 확인했다. 공개 합성 owner/writer/stranger의 권한 토글·저장 수렴·강등·ACL 차단·재허용·회수·메모 격리가 PASS했고 fixture를 제거했다. 실제 물리 기기는 새로 실행하지 않았으며 P4가 W⊆R·3계정·epoch 경합·offline/reconnect·서비스 재시작 회귀를 담당한다.

1.1.2 P2 후보 `41db8ff9385a329dc960695eb054acb7c617a8b9`는 1120 additive schema, active read 안의 owner-only write 전환, actor/epoch별 원자 update·receipt·commit ACK, 중복 ACK 복구, read 강등/회수와 local-only rejected 원문, server-auth presence/selection 기반을 완성했다. Node 24 관련 계약·실제 PostgreSQL·migration/rollback·security·전체 Vitest 351 PASS·4 조건부 skip, PWA 2 PASS와 5-browser selected-read 5 PASS를 통과했다. Actions push `34710725889`와 PR `34710727914`의 전체 verify, 네 dev image 게시/서명을 통과했고 같은 SHA 개발 서버의 `1.1.2`·`dev`·`p2`, schema `1120_selected_lyric_write.sql`, 네 서비스 healthy를 확인했다. 공개 합성 read 기본·owner write 승격·writer projection/discovery·read 강등·revoke·stranger 격리가 PASS했고 fixture를 제거했다. 실제 물리 기기는 새로 실행하지 않았으며 P3가 owner/writer UI·IME/undo·복구함을 담당한다.

1.1.1은 PR #97 merge 뒤 main과 annotated `v1.1.1`이 `d4c82b30fb54e2a50b92b167c017aa44f7e6bbd6`을 가리킨다. main Actions `34703250472`와 tag Actions `34704609566`의 전체 verify와 네 정식 image 서명·provenance·SBOM을 통과했다. 최초 tag verify에서 기존 selected-reader presence 시험 한 건이 첫 순간 snapshot 순서 경합으로 실패했으나 같은 시험의 실제 PostgreSQL 로컬 5회 연속 PASS와 불변 tag 실패 job 재실행 전체 PASS로 분류했다. 서비스별 `1.1.1`·`Release`·`latest`·`Release-latest`의 동일 digest를 확인하고 운영 서버에 migrate 우선 exact digest 배포해 `1.1.1`·`release`·phase `null`, schema `1110_public_lyric_read_links.sql`, 네 서비스 healthy를 확인했다. 공개 운영에서 collaboration 재시작 뒤 공개 projection 지속·회수·private API 차단과 owner 확인·일회 링크·fragment 제거·mobile 비로그인 읽기·live update·빈 가사 최초 공개가 PASS했고 합성 fixture를 제거했다. 기존 DB volume·secret·HMAC allowlist와 beta code를 보존하고 GitHub Release를 발행했다. 실제 OS/물리 기기 미실행과 `OPS-100-001` backup 예외는 유지한다.

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

1.1.4 P2 후보 `3de111fdaf4f0b79d02b51d311b0c7293e02b67f`는 실제 PostgreSQL 364 unit/integration, 반복 migration/rollback, production build와 Actions `34778131953` 전체 verify·네 dev image 발행/서명을 통과했다. 개발 서버 checkout·공개 live/ready가 같은 SHA였고 `1.1.4`, channel `dev`, phase `p2`, schema `1140_sharing_stability.sql`, 네 서비스 healthy였다. 공개 selected/public 삭제 fence·epoch 증가·trash 복원 뒤 old capability 비부활과 owner 본문 복원을 확인하고 합성 자료를 제거했다. outbox/IME queue는 64건 또는 1 MiB에서 lossless compact하며 S1 가속 측정을 실제 장시간·물리 기기 결과로 취급하지 않는다.

1.1.4 P3 후보 `375ea78f6925f5032dd90b848286c3f0b351168e`는 owner/selected writer/reader/public guest별 서버 ACK·기기/탭 보관·권한 종료 복구 안내와 mobile dialog focus/viewport, 다른 로그인 계정 전환 시 이전 owner-hash local store·본문·권한 비노출을 구현했다. 실제 PostgreSQL 364건, 관련 공유 Chromium 5건, sync/revision/logout 17건, production build와 Actions `34780761622` 전체 verify·네 dev image 발행/서명을 통과했다. 개발 서버 checkout·공개 live/ready가 같은 SHA였고 `1.1.4`, channel `dev`, phase `p3`, schema `1140_sharing_stability.sql`, 네 서비스 healthy였다. 공개 owner/writer/guest 안내·모바일 시트·계정 전환 격리가 PASS했고 합성 계정·자료를 제거했다. 자동화 IME·viewport를 실제 물리 기기/OS IME/장시간 증거로 승격하지 않는다.

1.1.4 P5 최종 후보 `081117d264aff2c4507e9992908a1f2b8fbe89eb`는 Actions `34786159783` 전체 verify 29분 14초와 네 dev image 게시·서명을 통과했다. 개발 서버 checkout·공개 live/ready가 같은 SHA였고 `1.1.4`, channel `dev`, phase `p5`, schema `1140_sharing_stability.sql`, 네 서비스 healthy였다. 공개 3계정·PC/모바일에서 owner 복원+offline writer 병합, outbox 64건 이하/ACK 뒤 0건, reader 회수, 계정 전환 local store·본문·권한 및 private memo 격리와 실제 서비스 재시작을 PASS했고 합성 계정·자료가 0건임을 확인했다. 신규 P0/P1·원문 유실·인증 우회·무음 저장 실패는 0건이며 실제 장시간·물리 기기·OS IME/절전 미실행과 `OPS-100-001` 예외를 유지한 채 승인된 정식 릴리스로 이동한다.
