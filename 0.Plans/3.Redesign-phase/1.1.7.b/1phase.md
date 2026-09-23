# 1.1.7b Phase 1 — 기준 동결·통합 계약·1.1.7b 실행 기반

**상태: 완료 (`complete`)**. 기능 SHA `a04bbcb6358aa1682e57fb48491e53be3f87f5d1`의 원격 CI·네 signed dev image·동일 SHA 개발 인수를 완료했다. P2~P5의 통합·차단 해소는 별도 미완료다. [수용 기준](ACCEPTANCE.md) · [통합 맵](SOURCE-MAP.md) · [차단 목록](BLOCKERS.md).

## 목표·진입

현재 웹 기준과 원격 수정의 경계를 고정하고 첫 Phase CI 전에 정확한 b 버전·경로를 지원한다.

선행: [통합 README](README.md)와 사용자 계획 지시·기준 SHA. 실제 착수 전에 실행 STATUS에 담당·시작 시각·작업 ID·source SHA·수정 경로를 등록하고 미커밋 변경과 다른 작업자의 결과를 보존한다. 현재 문서는 실제 착수나 완료 기록이 아니다.

## 작업

- [x] `LC-RD-117B-P1-01` 현재 작업자·미커밋 변경·worktree·원격 ref를 확인하고 통합 기준을 v1.1.7a 제품 tree와 최신 계획 문서에서 분리 기록한다. 원격 head c230c02/기능 0375825 이후 변경이 있으면 추가 diff만 검토해 source를 다시 동결한다.
- [x] `LC-RD-117B-P1-02` WC-01~18별 원본 commit·실제 코드/타입/호출자/시험 경로와 최소 의존성 묶음을 SOURCE-MAP에 확정한다. native 앱/API/auth/1150 신규 적용·1.1.8 metadata·이전 STATUS와 코발트 적용은 통합 제외로 구분한다.
- [x] `LC-RD-117B-P1-03` VERSION-CONTRACT의 제품 1.1.7b / 폴더 1.1.7.b / private package 1.1.7을 정확한 단일 예외로 등록한다. 1.1.7a 역사와 숫자 버전은 유지하고 다른 임의 suffix·개행/경로 조작은 계속 거부한다.
- [x] `LC-RD-117B-P1-04` WC-18의 안전한 build 설정과 release-phase/image/tag/deploy validator 의도를 선별한다. 3.Redesign-phase 경로·가변 Phase·a/b 매핑을 지원하고 runtime/health/build ID/CI/Compose 기대값을 함께 정렬한다. 이 작업을 P5나 1.2.0까지 미루지 않는다.
- [x] `LC-RD-117B-P1-05` dev-candidate 검사와 정식 release 승인/봉인 검사를 분리한다. manifest 존재만으로 P5/productionAuthorized가 강제되는 경로를 명시적으로 보정하며, WC-18 strict tag 검사와 웹 필수 job 의존을 유지하되 windows-native를 도입하지 않는다.
- [x] `LC-RD-117B-P1-06` WC-17의 optional 환경 값/안전 정수/공백 검증·offset deadline 정규화·import-safe helper와 회귀를 함께 인수한다. 실제 keyring·secret·회전이나 backup 운영 설정 변경은 수행하지 않는다.
- [x] `LC-RD-117B-P1-07` BLOCKERS의 22개 원인과 DB 세 종류를 현재 후보에서 확인할 입력/담당/차단표로 등록한다. native 1150이 이미 적용된 환경의 보존·API 비노출·rollback 계약을 정하고 임의 down/drop을 금지한다.
- [x] `LC-RD-117B-P1-08` 기존 a/숫자 버전·b/새 경로·잘못된 값 거부·dev/정식 tag 격리 회귀와 실제 P1 runtime 빌드를 인수한다. 계약/도구 변경·Phase source SHA·CI/개발 인수 증거를 남기고 P2/P3 파일 작성자를 확정한다.

## 책임 경로·산출물

VERSION, package/lockfile, packages/config, scripts의 version/phase/image/deploy/manifest 도구, CI/Compose/Playwright metadata와 이 계획 문서. 현재/원격 경로는 SOURCE-MAP과 실제 착수 SHA에서 확인한다. 공유 파일은 한 작성자가 담당하고 새 파일/타입을 가져올 때 호출자와 회귀 시험을 함께 검토한다.

산출물에는 작업별 원본 commit → 채택 변경 → 현재 후보 SHA를 연결하고, 변경 파일·계약·테스트 입력/결과·제외 사유·미실행·다음 담당을 기록한다. raw 로그·실제 창작물·token·서버 비밀은 공개 문서에 넣지 않는다.

## 검증·실패 조건

AC-RD-117B-17/18/19/20; b를 명시 거부하던 기존 회귀의 승인된 기대값만 변경하고 a 보호·invalid 거부는 유지한다.

실제 함수 fixture·HTTP/DB·브라우저·물리 기기/AT·공개 개발 smoke의 검증 수준을 구별한다. 원격 0375825의 성공은 선행 증거이며 새 b tree의 PASS가 아니다. 테스트는 실제 경계의 수정 전 실패 → 수정 후 성공을 확인하며, 통과를 위해 검사를 삭제하거나 완화하지 않는다.

## 완료·중단·되돌림

[Agent](../../../Agent.md)와 [품질 gate](../QUALITY-GATES.md)의 각 Phase 완료 절차를 적용한다. 필수 CI·동일 SHA 개발 인수 전에는 완료 체크를 하지 않는다. 해당 Phase의 필수 검사 미실행, 새로 도입하거나 악화한 원문 손실·거짓 저장·권한/복구 위반은 `review`로 두고 다음 Phase로 넘기지 않는다. P1에 등록한 기존 차단은 담당 수정 Phase와 인수 조건을 명시해 추적한다. 전체 잔여를 확인하는 P4/P5에서는 필수 차단이 모두 해소되어야 하며 1.2.0으로 넘기지 않는다. 중간 개발 인수가 정식 사용자 공개 승인을 뜻하지 않으며, 기존 위험의 노출을 통제할 수 없으면 앞 단계에서도 중단한다.

되돌림은 [수용표의 환경별 절차](ACCEPTANCE.md)를 따른다. native 1150 down/drop·기존 migration 재작성·초안/outbox 삭제·a 태그 이동은 금지한다. 제품 동작을 바꾸지 않은 문서 수정은 문서 검증으로 기록한다.

다음: [P2](2phase.md).

## 2026-09-23 P1 후보 진행 기록

- 완료된 1.1.7a 릴리스 기록 `1db47751…`을 b 기준에 병합하고 제품 기준 `fc2463c…`, 계획 overlay `458030a…`, source head `c230c024…`/기능 `0375825…`를 분리 고정했다.
- 제품 `1.1.7b` / 계획 `3.Redesign-phase/1.1.7.b` / private package `1.1.7` 계약과 b P5·1.2.2 P6 metadata를 공통 validator에 등록했다. a·숫자 이력은 유지하고 c/개행/경로·branch/tag 불일치는 거부한다.
- dev 후보의 `productionAuthorized=false`와 명시적 `--require-release`를 분리했다. strict annotated tag gate는 웹 `verify`에 연결하고 windows-native job/needs는 가져오지 않았다.
- WC-17 optional backup 안전 정수·공백, offset deadline UTC 정규화, import-safe helper와 회귀를 C3에서 선별했다. secret/keyring은 읽거나 회전하지 않았다.
- 지원 Docker Node 24.20.0/pnpm 11.25.0에서 경계 Node 42 PASS, `pnpm check` PASS, production web image build PASS. 무 volume 격리 PostgreSQL 18에서 migration 2회와 Unit **393 PASS / 조건부 beta 5 skip**이다. 첫 경계 회귀의 6 FAIL은 branch parser가 `-pN-topic`까지 버전으로 잡은 시험 단계 결함이었고 정확한 숫자/a/b parser로 보정 후 42 PASS다.
- 후보 작성 당시에는 원격 CI·image·개발 인수가 미완료였으며, 아래 동일 SHA 증거로 완료했다.

## 2026-09-23 P1 완료 인수

- 기능 SHA `a04bbcb6358aa1682e57fb48491e53be3f87f5d1`을 원격 `phase/1.1.7b-p1-contract-runtime`과 PR [#153](https://github.com/parking-place/LyricsCloud/pull/153)에 고정했다. PR Actions [35849543496](https://github.com/parking-place/LyricsCloud/actions/runs/35849543496) 전체 verify PASS, push Actions [35849536417](https://github.com/parking-place/LyricsCloud/actions/runs/35849536417) attempt 2 전체 verify와 네 signed dev image/provenance PASS다. web `sha256:20e851cb04a5f08a3c365321b793f935a954fe594ad40f8ad46b89cef8b866a3`, collaboration `sha256:5d30e76136cebed311702067a57e05d036c2c879b4766b6face3aa965750b4d5`, worker `sha256:088e4006469658dded0bb735be3ad5cb528a734d65da9521d6796bd58171be52`, migrate `sha256:3dc41a4aef0055e7c2412244c369ec1f8c303de70d6bb16f5cda4bb879506a6c`다.
- 첫 push `2301605`의 Git 비밀 검사 실패는 공개 mockup source SHA-256 값을 key로 오인한 것이며, rule·파일·필드·해시 형식에 한정한 예외를 추가했다. 중간 `eba666e` push는 공개 링크 E2E가 작성자 서버 반영 전 재연결한 시험 경쟁으로 FAIL했고 같은 SHA PR은 PASS했다. 작성자 API의 실제 반영을 먼저 확인하도록 시험을 강화했다. 최종 push attempt 1의 과거 성능 라운드 편차 FAIL(절대 지연·오류율은 기준 내)도 PASS로 재분류하지 않으며, 기준 변경 없이 attempt 2를 통과했다.
- 개발 서버 배포 전 checkout `a7d8e4538c58202f4a1e39371517906e891ae1bf`의 네 서비스 healthy·공개 ready 200을 확인했다. 기능 SHA 배포 뒤 checkout·환경 BUILD_ID·공개 live/ready가 `a04bbcb6358aa1682e57fb48491e53be3f87f5d1`과 `1.1.7b/dev/p1`로 일치했다. 네 서비스 healthy, `/auth`와 공개 CSS 200, HMR 없음, 내부 production CSS 검사·Docker cleanup PASS다. migration 31건의 비밀 없는 지문 `42111a6b819fdb3a9a3282fefc566d409be9722342b8e8c5a0762c0fed02914a`와 native 1150 객체·profile 1151 이력은 배포 전후 동일하다. DB down/drop, 볼륨·secret 변경, main·정식 tag/image·릴리스 서버 변경 없음.
- 공개 smoke는 P1의 버전·health·정적 자산 경계다. 실제 owner 브라우저·외부 OAuth·물리 기기/IME/AT, populated a DB와 native 객체의 상세 권한·rollback은 미실행이며 P2~P5 수용 기준을 대신하지 않는다. `WC-01~16`과 22개 원인은 아직 해결/검증 완료가 아니므로 P2/P3 통합과 P4 차단 해소를 계속한다.
