# 1.1.7b Phase 3 — API·데이터·목록·복구·UI 통합

**상태: 착수 (`in_progress`)**. P2 문서 인수 SHA `dcfa2b894e04b988076df08d490874af34195eb9`에서 전용 브랜치를 분기했다. P3 구현·검증·개발 인수는 아직 미완료다. [수용 기준](ACCEPTANCE.md) · [통합 맵](SOURCE-MAP.md) · [차단 목록](BLOCKERS.md).

## 목표·진입

나머지 웹 수정의 타입·API·DB·화면·시험을 의존성 단위로 완성한다.

선행: [P2](2phase.md)의 실제 인수 SHA·실행/미실행 기록. 착수 시 실행 STATUS에 담당·시작 날짜·작업 ID·source SHA·수정 경로를 등록하고 미커밋 변경과 다른 작업자의 결과를 보존한다. 현재 문서는 완료 기록이 아니다.

## 작업

- [ ] `LC-RD-117B-P3-01` WC-07 곡/라임/prompt/search의 query generation·cursor commit·stale error와 표시 순서 기반 실제 링크 focus를 통합한다. song-link-manager의 미변경 범위는 UI-03 잔여로 구분하고 새 listbox를 도입하지 않는다.
- [ ] `LC-RD-117B-P3-02` WC-08 목록 필드/항목별 metadata·favorite 빠른 반전·최근 검색 삭제/clear·수동 순서 경쟁을 통합한다. rhyme duplicate lock 순서를 library order→resource로 맞춘 코드와 실제 DB replay/두 owner 회귀를 함께 인수한다.
- [ ] `LC-RD-117B-P3-03` WC-10 곡 다단계 저장의 confirmed snapshot·savedSongId·성공/남은 필드 안내와 재시도를 인수한다. 새 입력을 보존하며 이미 성공한 단계를 무조건 반복하지 않고 응답 유실·부분 성공을 시험한다.
- [ ] `LC-RD-117B-P3-04` WC-11 중첩 dialog focus/Escape·touch 복귀·도구막대/preview 잘림·쓰기 설정·공백 Extend marker copy를 기존 B1/classic 기준에 통합한다. 코발트 layout/CSS를 아직 적용하지 않으며 UI-07 오류 위치·UI-08 FAB 겹침과는 별도 판정한다.
- [ ] `LC-RD-117B-P3-05` WC-13 OAuth 왕복 및 DB intent/code/identity lock 뒤 live clock 재검사·beta index key fail-closed를 인수한다. 만료 시 session/grant/code 소비가 남지 않고 tombstone 보존·다른 kid/같은 kid secret 교체 제약이 유지되는지 검사한다. BE-01/02 잔여를 별도로 둔다.
- [ ] `LC-RD-117B-P3-06` WC-14 협업 projection retry의 stable keyset/wrap·trash 제외·timer 중첩 방지·Y.Doc cleanup·실패 관측을 통합한다. 지속 실패 20개 뒤 정상 문서의 처리·timestamp/marker 보존을 확인하고 worker purge M-04와 혼동하지 않는다.
- [ ] `LC-RD-117B-P3-07` WC-15 guest 회수/epoch-stale 뒤 서버 수용 body/cache 복귀와 authoredText 분리를 통합한다. 재연결/권한 재허용 뒤 거부 입력 재생이 없고 private snapshot을 노출하지 않는지 확인하며 ES-06 persist 실패 보관과 함께 인수한다.
- [ ] `LC-RD-117B-P3-08` WC-16 export v1의 Suno/photo section·참조/owner 검증과 lifecycle/domain/trash의 삭제 영향·mutation 성공/refresh 실패 분리를 한 묶음으로 인수한다. 과거 v1 사진 필드 부재 호환, 오래전 삭제한 자식 cascade 수와 실제 결과를 검사한다.
- [ ] `LC-RD-117B-P3-09` 통합 경계의 현행 목록/복사/프로필/설정/공유/복구 수용과 API 오류·권한·합성 두 계정 검사를 수행한다. 기존 fixture의 1.1.8 기대값은 b로 의미 있게 변경하고 원격 snapshot을 검토 없이 승인하지 않는다.

## 책임 경로·산출물

apps/collaboration, packages/auth/database/domain/editor copy, web list/search/template/song/trash/dialog/style 및 대응 tests. 현재/원격 경로는 SOURCE-MAP과 실제 착수 SHA에서 확인한다. 공유 파일은 한 작성자가 담당하고 새 파일/타입을 가져올 때 호출자와 회귀 시험을 함께 검토한다.

산출물에는 작업별 원본 commit → 채택 변경 → 현재 후보 SHA를 연결하고, 변경 파일·계약·테스트 입력/결과·제외 사유·미실행·다음 담당을 기록한다. raw 로그·실제 창작물·token·서버 비밀은 공개 문서에 넣지 않는다.

## 검증·실패 조건

AC-RD-117B-07/08/10(곡)/11/13~16. 목록/서버/DB·실제 오류 복구의 경계 증거와 모든 WC의 미해결 항목을 P4에 전달한다.

실제 함수 fixture·HTTP/DB·브라우저·물리 기기/AT·공개 개발 smoke의 검증 수준을 구별한다. 원격 0375825의 성공은 선행 증거이며 새 b tree의 PASS가 아니다. 테스트는 실제 경계의 수정 전 실패 → 수정 후 성공을 확인하며, 통과를 위해 검사를 삭제하거나 완화하지 않는다.

## 완료·중단·되돌림

[Agent](../../../Agent.md)와 [품질 gate](../QUALITY-GATES.md)의 각 Phase 완료 절차를 적용한다. 필수 CI·동일 SHA 개발 인수 전에는 완료 체크를 하지 않는다. 해당 Phase의 필수 검사 미실행, 새로 도입하거나 악화한 원문 손실·거짓 저장·권한/복구 위반은 `review`로 두고 다음 Phase로 넘기지 않는다. P1에 등록한 기존 차단은 담당 수정 Phase와 인수 조건을 명시해 추적한다. 전체 잔여를 확인하는 P4/P5에서는 필수 차단이 모두 해소되어야 하며 1.2.0으로 넘기지 않는다. 중간 개발 인수가 정식 사용자 공개 승인을 뜻하지 않으며, 기존 위험의 노출을 통제할 수 없으면 앞 단계에서도 중단한다.

되돌림은 [수용표의 환경별 절차](ACCEPTANCE.md)를 따른다. native 1150 down/drop·기존 migration 재작성·초안/outbox 삭제·a 태그 이동은 금지한다. 제품 동작을 바꾸지 않은 문서 수정은 문서 검증으로 기록한다.

다음: [P4](4phase.md).

## 2026-09-23 착수 기록

- 담당 Codex, 작업 `LC-RD-117B-P3-01~09`. `phase/1.1.7b-p3-data-lists-recovery`를 P2 문서 인수 SHA `dcfa2b894e04b988076df08d490874af34195eb9`에서 분기했고 시작 시 tracked worktree는 깨끗했다.
- source head `c230c024aeb0297b1c130e3f3e8b507a43a7e871`/기능 `0375825fe004fc74869250eefa14add267c4b3ae`의 WC-07/08/10(곡)/11/13~16 경로를 선택 비교한다. 기존 P2 개발 배포·DB·native 1150/1151, 보호 계획 문서, `main`·정식 tag/image·릴리스 서버는 변경하지 않는다.
- 착수 당시 코드·로컬 수용·필수 원격 CI·네 signed dev image·동일 SHA 개발 공개 인수는 미실행이었다. 아래 로컬 후보 기록과 원격 인수 결과를 분리한다.

## 2026-09-23 로컬 통합 후보

- source 기능 SHA `0375825fe004fc74869250eefa14add267c4b3ae`의 WC-07/08/10(곡)/11/13~16을 현재 b 웹 경계에 선택 이식했다. 목록 응답 세대·metadata/즐겨찾기/순서, 곡 부분 저장, dialog/도구막대/복사, 인증 만료·beta key, 협업 projection, guest 회수, export/trash 계약과 호출자·회귀를 포함한다. P2의 prompt 제목 IME·PWA profile dirty·가사 안전 복사 수정은 유지했다. native route/1150 migration·Windows CI·1.1.8 버전/manifest는 가져오지 않았다.
- Node 24.20.0/pnpm 11.25.0 Docker에서 `pnpm check`와 production web build PASS, 일반 Unit **374 PASS / DB 조건부 128 skip**이다. `AUTH_DATABASE_INTEGRATION=true`의 별도 `lyricscloud_test`에서 관련 DB **21 PASS / beta 조건부 8 skip**, `BETA_SIGNUP_DATABASE_INTEGRATION=true`에서 beta DB **8 PASS**다. 첫 시도의 다른 이름인 `lyricscloud_p3_test` DB는 fixture의 정확한 이름 제한으로 beforeAll 4 FAIL/29 skip이었고 제품 PASS로 세지 않는다.
- 격리 `lyricscloud_p3_test`의 production Chromium 핵심 P3 PC/mobile **12 PASS / 조건부 6 skip**, 전체 무재시도 **419 PASS / 조건부 49 skip / 0 FAIL**(468건, 14.5분)이다. 첫 집중 실행의 `APP_PHASE`만 준 설정 오류는 `APP_CHANNEL=dev`를 함께 전달해 바로잡았으며 PASS로 소급하지 않는다. 실제 PostgreSQL owner 분리·공유 guest·가사 저장·목록·export/trash의 기존 전체 회귀도 포함한다.
- source 원본의 수정 전 실패→수정 후 결과는 선행 증거이며, 현재 b tree에서는 선택 이식 후 결과만 검증했다. 실제 OS IME/물리 기기/AT, 외부 OAuth 왕복·proxy 조건, 세 DB 유형/rollback 및 22개 원인 최종 판정은 P4/P5에 남는다. **원격 CI·signed image·같은 SHA 개발 공개 인수 전 P3는 `in_progress`이며 아래 체크를 완료로 바꾸지 않는다.**
