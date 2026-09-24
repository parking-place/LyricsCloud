# 1.1.7b Phase 5 — 최종 증거·동일 SHA 개발 인수·1.2.0 인계

**상태: 완료 (`complete`, 실제 기기 검증은 사용자 보류)**. P4 문서 인수 `53ed14f45f063919d87cc59e8e4213863222c7e4`에서 전용 브랜치를 시작했고 최종 기능 SHA `acd2bd99876740debf426c401fe7157713f8b854`를 인수했다. [수용 기준](ACCEPTANCE.md) · [통합 맵](SOURCE-MAP.md) · [차단 목록](BLOCKERS.md).

## 목표·진입

완료된 통합 SHA를 리디자인의 유일한 실행 출발점으로 봉인한다.

선행: [P4](4phase.md)의 실제 인수 SHA·실행/미실행 기록. 실제 착수 전에 실행 STATUS에 담당·시작 시각·작업 ID·source SHA·수정 경로를 등록하고 미커밋 변경과 다른 작업자의 결과를 보존한다. 현재 문서는 실제 착수나 완료 기록이 아니다.

## 작업

- [x] `LC-RD-117B-P5-01` WC-01~18을 빠짐없이 채택/수정 후 채택/선행 해결/근거 있는 제외로 판정한다. 각 원본 SHA→최소 코드/시험 의존→새 통합 commit→회귀 결과를 연결하고 제외로 원문 보존이나 필수 웹 수정을 빠뜨리지 않는다.
- [x] `LC-RD-117B-P5-02` 정확한 b runtime/package/schema/Phase·manifest·Docker 채널과 a/일반 버전 회귀를 봉인한다. dev 문서에 과거 productionAuthorized=true나 a 전용 release 예외를 복사하지 않고 정식 발행 미승인을 사실대로 기록한다.
- [x] `LC-RD-117B-P5-03` 필요한 전체 unit/DB/브라우저/production·보안/라이선스·성능과 최종 mandatory CI, 서비스별 signed image·digest/provenance를 같은 b 후보로 인수한다. 동일 SHA 성공 근거를 재사용하며 skip/cancel을 PASS로 표시하지 않는다.
- [x] `LC-RD-117B-P5-04` 승인된 개발 대상의 실제 배포 SHA·DB 유형·이전 rollback 이미지/자료 보존을 확인한 뒤 같은 b SHA를 배포한다. tracked 변경·secret 누락·알 수 없는 migration 차이가 있으면 덮어쓰지 않는다. PC나 릴리스 서버를 자동 갱신하지 않는다.
- [x] `LC-RD-117B-P5-05` 개발 공개 live/ready·버전/phase/schema·저장/재진입·IME/공유 회수·목록/설정·trash/export·구탭PWA 핵심 smoke와 필요 서비스 재시작을 수행하고 합성 자료를 정리한다. 합성 브라우저와 실제 OS IME·기기를 구별한다.
- [x] `LC-RD-117B-P5-06` 통합/사용자/지원 문서와 release 경로의 승인 상태·실기기/외부backup/RPO 잔여·rollback을 기록한다. a의 별도 release branch 승인이나 기존 main 통합을 b의 정식 발행 권한으로 승계하지 않는다.
- [x] `LC-RD-117B-P5-07` HANDOFF-TO-1.2.0의 기준 source/CI/image/DB/웹 회귀/원래 review 잔여/디자인 보존 표를 실제값으로 완성한다. 1.2.0은 이 인수된 b SHA에서 시작하고 a나 원격 1.1.8 전체 tree에서 재시작하지 않는다.
- [x] `LC-RD-117B-P5-08` 현재 버전/Phase 완료·Future 검수·검증 증거·후속 단계 담당을 실행STATUS에 기록하고 다음 계획을 1.2.0 P1로 넘긴다. 후속 41 Phase/205개 작업은 b에서 해결된 부분을 재구현하지 않게 근거/잔여로 정리하고 native 보류는 유지한다.

## 책임 경로·산출물

계획/통합 수용 기록, docs/실행 STATUS/현재 manifest·릴리스 도구, 승인된 개발 환경 인수. 현재/원격 경로는 SOURCE-MAP과 실제 착수 SHA에서 확인한다. 공유 파일은 한 작성자가 담당하고 새 파일/타입을 가져올 때 호출자와 회귀 시험을 함께 검토한다.

산출물에는 작업별 원본 commit → 채택 변경 → 현재 후보 SHA를 연결하고, 변경 파일·계약·테스트 입력/결과·제외 사유·미실행·다음 담당을 기록한다. raw 로그·실제 창작물·token·서버 비밀은 공개 문서에 넣지 않는다.

## 검증·실패 조건

18 WC 판정·22개 원인 차단 목록·24개 수용 기준과 동일 SHA 개발 인수가 완료되어야 한다. 정식 tag/image/릴리스 서버는 별도 현재 승인 없으면 미실행으로 인계한다.

실제 함수 fixture·HTTP/DB·브라우저·물리 기기/AT·공개 개발 smoke의 검증 수준을 구별한다. 원격 0375825의 성공은 선행 증거이며 새 b tree의 PASS가 아니다. 테스트는 실제 경계의 수정 전 실패 → 수정 후 성공을 확인하며, 통과를 위해 검사를 삭제하거나 완화하지 않는다.

## 완료·중단·되돌림

[Agent](../../../Agent.md)와 [품질 gate](../QUALITY-GATES.md)의 각 Phase 완료 절차를 적용한다. 필수 CI·동일 SHA 개발 인수 전에는 완료 체크를 하지 않는다. 해당 Phase의 필수 검사 미실행, 새로 도입하거나 악화한 원문 손실·거짓 저장·권한/복구 위반은 `review`로 두고 다음 Phase로 넘기지 않는다. P1에 등록한 기존 차단은 담당 수정 Phase와 인수 조건을 명시해 추적한다. 전체 잔여를 확인하는 P4/P5에서는 필수 차단이 모두 해소되어야 하며 1.2.0으로 넘기지 않는다. 중간 개발 인수가 정식 사용자 공개 승인을 뜻하지 않으며, 기존 위험의 노출을 통제할 수 없으면 앞 단계에서도 중단한다.

되돌림은 [수용표의 환경별 절차](ACCEPTANCE.md)를 따른다. native 1150 down/drop·기존 migration 재작성·초안/outbox 삭제·a 태그 이동은 금지한다. 제품 동작을 바꾸지 않은 문서 수정은 문서 검증으로 기록한다.

다음: [1.2.0 인계 계약](HANDOFF-TO-1.2.0.md). 실제 b 완료 SHA를 기준으로 리디자인을 시작한다.

## 2026-09-24 P5 최종 인수 — 기능 SHA `acd2bd99876740debf426c401fe7157713f8b854`

- `WC-01~18`은 [SOURCE-MAP](SOURCE-MAP.md)의 C1/C2/C3 원본 commit→P1/P2/P3 포트 SHA→P4 회귀·최종 후보로 전수 추적한다. P5는 사용자·지원·정식 미승인 문서와 1004/1005 validator의 b 고유 수용 ID/쿼리 링크 경계를 보정했다. native/Windows route/job·1.1.8 runtime/STATUS 전체 이식은 제외하고 기존 native 1150 이력은 보존했다. 22원인/24 수용은 [BLOCKERS](BLOCKERS.md)/[ACCEPTANCE](ACCEPTANCE.md)를 따른다.
- 로컬 `1002`·`1004`·`1005` 개발 후보 검증과 a/b 버전 회귀 4건·strict tag 회귀 2건 PASS. `1005 --require-release`는 승인 false·annotated `v1.1.7b` 부재·개발 Phase 상태 때문에 예상대로 FAIL했고 이를 릴리스 PASS로 기록하지 않는다. Docker 로컬 `pnpm check` 시도는 기존 modules 저장소와 컨테이너의 pnpm 설치 상태 차이로 시험 시작 전 중단되어 PASS가 아니다. 같은 SHA의 원격 필수 verify가 이 항목을 다시 실행했다.
- [P5 push Actions 35997349571](https://github.com/parking-place/LyricsCloud/actions/runs/35997349571)은 verify·web/collaboration/worker/migrate 발행/서명/provenance 모두 SUCCESS, [PR #157 Actions 35997369606](https://github.com/parking-place/LyricsCloud/actions/runs/35997369606)은 verify SUCCESS이고 PR publish skip은 정상이다. 원격 Unit/DB **509 PASS/8 조건부 skip**, production Chromium **432 PASS/54 조건부 skip**, release browser matrix **10 PASS**와 보안/라이선스/성능/백업·rollback job이 성공했다. 네 SHA 태그와 `dev-1.1.7b-p5` 태그의 digest는 web `sha256:656921046aa7e3f5c9a534f80e85225a6aac74bc7ef50a08e1b217c742ca5db7`, collaboration `sha256:39a93958386fa2051308af4c8f006ffd6abdd711c54e70fcd660cf90a226e1f8`, worker `sha256:5ec1bbd589b49a9d3615a590975a6ab8d180b3b4ff790a1543f3acfd5433f7be`, migrate `sha256:8c8b72fb5bc3f47ccc9ac30985c96670af6aef72768a697ede57b986d9696036`으로 각각 동일하다. 네 발행 job의 `Sign and verify exact image artifact` SUCCESS를 확인했다.
- 개발 배포 전 P4 SHA·tracked clean·필수 환경 파일·네 healthy·ready 1152를 확인한 뒤 runbook으로 P5 **정확한 SHA**를 배포했다. 배포 명령 exit 0·migration 완료, 개발 checkout/BUILD_ID/공개 HTTPS live·ready가 `1.1.7b/dev/p5`·schema 1152로 일치하고 네 서비스 healthy·tracked clean이다. DB 32 migrations/native 1150 이력 1건·native 객체 2개·1152 1건 및 prompt dictionary `NO ACTION/DEFERRABLE/INITIALLY DEFERRED`를 읽기 전용 확인했다. 첫 DB 확인 SQL의 char 형변환 오류는 도구 오류이며 수정한 재조회만 PASS다.
- 공개 합성 owner/other로 곡·가사·프롬프트 POST 201, 프롬프트 원문 GET 200, 타 계정 곡/프롬프트 404, 선택 공유 읽기 200→owner 회수 뒤 404, owner export 200, 프롬프트 trash 200/활성 조회 404, PC 1440/mobile 390 제목·원문 표시 및 `/sw.js` 200을 확인했다. web/collaboration/worker 재시작 후 healthy·동일 SHA·합성 곡 공개 재조회 200/정확 제목을 재확인했다. 합성 두 계정·session·resource·prompt는 삭제 후 **모두 0건**이고 임시 시험 스크립트도 제거했다. 공개 화면에서 실제 OS IME 입력·구 build 탭을 재현한 것은 아니며 같은 SHA CI의 합성 브라우저/PWA 회귀와 P4 격리 검사를 별도 근거로 사용한다.
- 실제 Windows/iOS/Android 물리 기기·OS IME·AT는 사용자 지시로 **미실행/후속 보류**다. 외부 Google 장애, 운영 backup/timer·릴리스 proxy, 실제 PC 설치물/개발 live downgrade 역시 미실행이다. UI-04/05/07 P2와 `OPS-100-001`은 정식 릴리스 완료로 바꾸지 않는다. `main`·정식 tag/image·릴리스 서버는 변경하지 않았다.

P5 기능 SHA의 필수 gate와 개발 공개 인수를 완료했다. 문서 전용 후속 SHA는 별도로 기록하며 [1.2.0 인계](HANDOFF-TO-1.2.0.md)의 이 기능 SHA에서만 다음 Phase를 시작한다.
