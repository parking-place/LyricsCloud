# 1.1.8 Phase 4 — 실패·권한·복구 회귀

- 상태: **실제 Windows 인수 대기** (`review`, P3 merge main `b995ffe`, 공유 UI/cache 보정 기능 후보 `fe40556`의 두 CI·네 dev image·동일 SHA 개발 공개 인수 PASS)
- 단계 목적: Windows 네이티브 개발안·읽기와 복사의 실패·권한·복구 회귀을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

Windows 앱의 기술·인증·IME/CRDT 개발안을 먼저 승인받고, 승인된 경우 읽기·복사 중심의 최소 앱을 제공한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.1.8 P3](3phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
- 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임·필수 물리 기기 확보.
- 네이티브 개발안/기술 실험과 실제 구현 승인을 구분한다. 플랫폼별 사용자 승인이 없으면 P2로 진행하지 않는다.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/DESIGN-NATIVE.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-040`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

완전한 네이티브 편집·오프라인 쓰기는 다음 패치 범위다.

## 수정 책임 경로와 인터페이스

- `apps/windows (신규 제안)`
- `packages/domain/src`
- `packages/auth/src`
- `tests/native/windows (신규 제안)`
- `docs/adr/ADR-NF-004-windows-native.md`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [ ] `LC-NF-1.1.8-P4-01` `AC-1.1.8-01`: 네이티브 기술·범위 승인이 없음 상황을 재현하여 “개발안/실험 보고서만 전달하고 앱 구현·발행을 하지 않는다.”를 검증한다. 자동/실제 DB/브라우저/실기기 증거를 구분한다.
- [ ] `LC-NF-1.1.8-P4-02` `AC-1.1.8-02`: 시스템 브라우저 인증 취소/잘못된 callback 상황을 재현하여 “세션이 생성되거나 다른 앱으로 token이 전달되지 않는다.”를 검증한다. 자동/실제 DB/브라우저/실기기 증거를 구분한다.
- [ ] `LC-NF-1.1.8-P4-03` `AC-1.1.8-03`: 계정 전환·공유 회수 후 캐시 읽기 상황을 재현하여 “권한 없는 새 자료를 읽거나 다른 계정 cache를 보여주지 않는다.”를 검증한다. 자동/실제 DB/브라우저/실기기 증거를 구분한다.
- [ ] `LC-NF-1.1.8-P4-04` `AC-1.1.8-04`: 웹/Windows 동일 자료 복사 상황을 재현하여 “문장형·송폼·Extend·길이 경고 계약이 같다.”를 검증한다. 자동/실제 DB/브라우저/실기기 증거를 구분한다.
- [ ] `LC-NF-1.1.8-P4-05` 직전 버전·다른 계정·오프라인·재접속·서버 재시작·지원 브라우저/기기 회귀를 수행하고 미실행/skip의 원인을 기록한다.
- [ ] `LC-NF-1.1.8-P4-06` 발견된 원인을 최소 수정 후 같은 재현을 다시 실행한다. 성능 변경은 동일 입력·환경의 전후 값과 결과 동등성을 증명하고 테스트 삭제로 통과시키지 않는다.

- [ ] `LC-NF-1.1.8-P4-07` 해당 OS 실제 기기에서 권한 철회/reconnect/presence 제거·사전 오류·한글/다국어 폰트 fallback과 IME를 검증한다. 웹 성공을 native 성공으로 대신하지 않는다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.1.8-01` | 네이티브 기술·범위 승인이 없음 | 개발안/실험 보고서만 전달하고 앱 구현·발행을 하지 않는다. |
| `AC-1.1.8-02` | 시스템 브라우저 인증 취소/잘못된 callback | 세션이 생성되거나 다른 앱으로 token이 전달되지 않는다. |
| `AC-1.1.8-03` | 계정 전환·공유 회수 후 캐시 읽기 | 권한 없는 새 자료를 읽거나 다른 계정 cache를 보여주지 않는다. |
| `AC-1.1.8-04` | 웹/Windows 동일 자료 복사 | 문장형·송폼·Extend·길이 경고 계약이 같다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 2026-09-15 자동 검증·개발 인수 (P4 최종 완료 아님)

- 후보 `44d00e4d0497049c662105876fb35aadee3f19bd` / PR #144. Windows callback은 origin-form/exact path/단일 code·state/base64url·constant-time state만 수락하고 절대 URL/wrong state/중복 query를 거부한다. 로그아웃·origin/account 전환·401은 in-flight 목록/상세 요청을 무효화하고 visible copy/token/해당 계정 DPAPI cache를 비운다. `403/404`는 상세와 복사를 비우며 network 오류에서 다른 account/shared body를 새로 채우지 않는다. 새 토큰은 서버 read session 검증 후에만 기기에 저장한다. schema/migration/API/write 경계는 변경하지 않았다.
- 로컬 .NET 10 core **39 assertions PASS**와 Windows UI/recovery 정적 계약 PASS. Node 24 `pnpm check`·production build PASS. 격리 PostgreSQL 18의 migration 두 번·Vitest **385 PASS / 별도 beta 4 조건부 skip**, native HTTP desktop **3 PASS**. 처음 E2E는 migration-before-readiness 순서 문제, 첫 통합 DB 실행은 `lyricscloud_test` 이름 guard 위반으로 실패했으며 올바른 격리 DB로 재실행해 PASS했다. 실패한 실행을 PASS로 세지 않는다.
- 같은 후보의 push Actions `34926436515`와 PR Actions `34926460700` 전체 verify·Windows WinUI x64 build **PASS**. 개발 artifact `windows-x64-read-only-44d00e4d0497049c662105876fb35aadee3f19bd` (7일)은 서명 installer가 아니다. web/collaboration/worker/migrate의 개발 image 발행·signature/provenance도 모두 PASS.
- 같은 SHA를 개발 서버에 배포해 공개 live/ready `1.1.8/dev/p4`, schema `1150_native_read_sessions.sql`, native contract `lyricscloud.native.read.v1`·writes `false`, 비로그인 곡/가사 `401`, invalid callback `400`, 네 서비스 healthy를 확인했다. web/collaboration 실제 재시작 후 ready·health도 PASS했다. 재시작 직후 502/health warming은 비공개 검사 대기 순서를 보정해 재검증했다. 기존 DB volume·secret·allowlist를 보존했고 릴리스 서버는 변경하지 않았다.
- P4-01의 승인 없음 분기는 이번 실행 입력이 아니다: 사용자의 `1.1.8 Windows 권고안 승인`이 P1에서 먼저 기록됐다. P4-02~04의 자동 DB/API/fixture 증거는 확보했지만 네이티브 UI 실기기의 OAuth 취소/회수/cache/reconnect/copy를 실행하지 못했다. P4-05~07의 실제 Windows launch·process kill/DPAPI·clipboard·Microsoft 한국어 IME·다국어 font fallback·Narrator/high contrast·200% DPI/다중 monitor·권한/presence·서명 MSIX 설치/업데이트/제거는 **미실행**. 자동 Windows runner의 build와 웹 성공은 실제 OS PASS가 아니며 P4 체크박스/완료와 P5/정식 릴리스는 해당 증거 전까지 남긴다.

## 실행·증거 기록

2026-09-17 unpackaged 저장소 보정 SHA `f2a4424b95b0c56b3ac9d0b3e4811a6c4a652ff1`의 Actions [35167959741](https://github.com/parking-place/LyricsCloud/actions/runs/35167959741)은 전체 verify·Windows native contract/build·self-contained/framework-dependent artifact·네 개발 image 발행이 모두 PASS했다. 그러나 이 후보는 독립 예외 릴리스 `1.1.7a`의 닉네임/프로필 사진/홈 이동과 1151 schema를 아직 포함하지 않아 개발 서버 배포를 중단했다. P4 브랜치에서 `origin/release/1.1.7a`를 보존 통합하고 1150→1151 migration 순서와 1.1.8 runtime을 유지한 새 후보를 검증한다. 앞선 CI를 통합 후보의 PASS로 재사용하지 않으며 릴리스 서버는 변경하지 않는다.

2026-09-17 사용자 재개 요청 뒤 실행 실패 경계를 다시 조사했다. self-contained artifact 자체에는 .NET·Windows App SDK 파일이 포함됐지만, unpackaged 앱의 `MainWindow` 생성자와 token/cache 구현이 package identity가 필요한 `Windows.Storage.ApplicationData.Current`를 시작 직후 사용했다. Microsoft의 unpackaged app data 지침에 따라 `%LOCALAPPDATA%/LyricsCloud/Windows` 직접 파일 저장과 원자 교체로 origin/token/cache 위치를 옮기고, token/cache의 `LOCAL=user` DPAPI 보호·origin/account/resource namespace는 유지한다. 정적 회귀는 package-identity API 재도입을 거부한다. 이 수정은 실제 사용자 PC의 오류 로그가 없는 상태에서 확인한 구조적 launch 실패 후보이며, Windows CI build와 물리 PC 재실행 전에는 원인 확정이나 P4 PASS로 기록하지 않는다.

2026-09-16 03:15 KST 사용자 보고: Windows PC에서 앱이 실행되지 않아 Windows 앱은 일단 넘어가겠다고 했다. 실제 사용한 artifact·Windows 버전·오류 화면/로그는 아직 제공되지 않아 실패 원인이나 self-contained 배포 자체의 결함을 단정하지 않는다. 수동 Actions [34987340477](https://github.com/parking-place/LyricsCloud/actions/runs/34987340477)의 Windows job과 전체 `verify`는 최종 PASS였지만 `publish=false`의 네 개발 image job은 skip이며 사용자 PC 실패를 뒤집는 증거가 아니다. 사용자 요청에 따라 실기기 재시도·원인 수정은 보류한다. P4 `review`와 P5·main/Release·릴리스 서버 보류를 유지하며, [1.1.9](../1.1.9/README.md)는 1.1.8 P5, [1.1.10](../1.1.10/README.md)은 1.1.9 P5 인수가 선행조건이라 자동 건너뛰지 않는다. 비Windows 작업을 먼저 진행하려면 버전 범위/의존성 재계획을 별도로 결정해야 한다.

2026-09-16 사용자 인계: 별도 런타임 설치 없이 실행 가능한 Windows 빌드가 준비되면 사용자 PC에서 실행해 보겠다고 했고, 그 전 실기기 검증은 보류해 달라고 요청했다. 이 발언은 Windows 앱 launch/OAuth/DPAPI/clipboard/IME/AT/DPI·서명 설치/업데이트 PASS가 아니다. `P4-06`은 기존 framework-dependent 개발 artifact와 별개로 .NET/Windows App SDK runtime을 담는 unpackaged x64 시험 폴더를 CI에 추가했다. workflow YAML parse와 diff check는 PASS. P4 `review`, P5·main/Release·릴리스 서버 보류를 유지한다.

`3fecc85db02656bbb70bae6316f27c424754de72`의 수동 Actions [34987340477](https://github.com/parking-place/LyricsCloud/actions/runs/34987340477)에서 Windows 계약·WinUI x64 build와 별도 self-contained publish/upload가 PASS했다. CI는 EXE·`coreclr.dll`·`Microsoft.UI.Xaml.dll`·외부 .NET framework 참조 부재를 확인했고 GitHub artifact `windows-x64-self-contained-3fecc85db02656bbb70bae6316f27c424754de72`를 14일 보관한다. 이 시점 전체 저장소 verify는 진행 중이며 네 개발 image publish는 수동 입력 `publish=false`로 실행하지 않았다. 깔끔한 물리 Windows PC에서 별도 runtime 없이 실제 launch되는지, OAuth/DPAPI/cache/clipboard/IME/AT/DPI와 신뢰 서명 MSIX 설치/업데이트는 여전히 **미실행**이다.

2026-09-15 보정: 앞선 자동 인수 뒤 Windows 화면에서 선택 공유 가사를 여는 경로와 계정별 보호 캐시 읽기 경로가 실제로 연결되지 않은 결함을 발견했다. `fe4055626757458a4eecbff0bfa0b55bed3bc40d`에서 공유 UUID-only GET·권한 epoch 동등성/온라인 재검증 뒤 cache 노출·오프라인 공유 본문/복사 차단·회수 시 해당 cache 삭제·계정 전환 시 UUID/token/cache 정리·선택한 owner 가사의 계정별 DPAPI 오프라인 복구·공유 복사 직전/창 복귀 시 재확인을 구현했다. 합성 C# HTTP/복사/cache 계약 **48 assertions PASS**, 두 Windows 정적 validator PASS. 새 SHA의 push Actions `34929434984`와 PR Actions `34929437966` 모두 verify·Windows WinUI x64 build PASS, push에서 네 개발 image 발행 PASS. 동일 기능 SHA 개발 배포 `1.1.8/dev/p4`의 공개 live/ready·schema `1150_native_read_sessions.sql`·native `lyricscloud.native.read.v1`·writes false·anonymous 곡/가사 401·invalid callback 400, web/collaboration 재시작 후 postgres/web/collaboration/worker healthy PASS. 기존 개발 DB 볼륨·secret·allowlist를 보존했고 운영 서버는 변경하지 않았다. 실제 WinUI launch·DPAPI·공유 회수·IME/AT/설치 증거는 **미실행**, P4/P5 완료·main/Release는 아직 아니다. [실기기 수용 순서](../../../docs/runbooks/1.1.8-windows-installation.md)를 따른다.

`P4-07` 계획 범위 충돌: 승인된 1.1.8 native 앱은 읽기·복사 전용이며 presence 표시 연결은 [Windows ADR](../../../docs/adr/ADR-NF-004-windows-native.md)에서 선택 사항이다. 실제 앱에는 presence UI가 없으므로 “native presence 제거”를 실기기 PASS로 주장할 수 없다. 사전 provider는 `ADR-NF-006` NO-GO라 native 사전 요청·오류 UI도 없다. 두 항목은 미실행이자 현 native 제품에서 재현 불가로 기록하고, 기존 read/copy 범위를 임의로 확대하거나 빈 테스트로 통과시키지 않는다. 실제 Windows 권한/회수·재접속·폰트/IME 인수와 이 두 항목의 단계 해석(N/A 또는 이후 범위 이관)이 결정되기 전 P4 review를 유지한다.

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

## 완료 조건

- [ ] 작업 ID마다 코드/설계·실행/검토 증거·정확한 SHA가 연결되어 있다.
- [ ] 현재 패치의 원문·권한·복구·오류 처리가 정상 동작과 함께 검증되었다.
- [ ] 미실행·남은 결함·외부 차단·보류한 기술 결정이 숨김없이 기록되었다.
- [ ] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [ ] 구현 Phase는 CI·동일 SHA 개발 인수를, 설계-only는 승인 증거를 갖췄다.
- [ ] main·Release·운영 변경은 별도 현재 승인 없이 수행하지 않았다.

## 산출물

- 1.1.8 P4의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.1.8 P5](5phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.
