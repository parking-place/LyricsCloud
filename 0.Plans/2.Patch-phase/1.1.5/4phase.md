# 1.1.5 Phase 4 — 실패·권한·복구 회귀

- 상태: **완료** (`complete`, 후보 CI·동일 SHA 개발 공개/재시작 인수 완료)
- 단계 목적: 승인 디자인 적용·탐색 셸의 실패·권한·복구 회귀을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

별도 UX 설계 승인안을 공통 셸·내비게이션·목록부터 점진적으로 적용한다. 마이너는 1.1을 유지한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.1.5 P3](3phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
- 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임·필수 물리 기기 확보.
- [UX 설계 P5](../design/UX/5phase.md)의 사용자 승인.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/DESIGN-NATIVE.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-037`, `NF-REQ-039`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

다른 패치의 기능·사용자가 선택하지 않은 Future 아이디어·승인 없는 기술 교체·운영 변경은 제외한다.

## 수정 책임 경로와 인터페이스

- `apps/web/src/components`
- `packages/ui/src`
- `apps/web/src/app`
- `tests/e2e`
- `0.Plans/2.Patch-phase/new_Mock-up`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.1.5-P4-01` `AC-1.1.5-01`: 저장 중 가사에서 sidebar/내비 전환 상황을 재현하여 “editor·IME·초안이 재생성되거나 지워지지 않는다.”를 검증한다. — 같은 CodeMirror 표식을 유지한 채 desktop rail/mobile More 조작→offline 한글 입력→reconnect→서버 exact body→reload를 검증했다.
- [x] `LC-NF-1.1.5-P4-02` `AC-1.1.5-02`: 이전 deep link·필터 URL·최근 작업 상황을 재현하여 “같은 자료와 문맥으로 들어간다.”를 검증한다. — `/recent?type=lyrics`에서 단일 owner 자료와 `returnTo` deep link·같은 편집 본문을 PC/mobile/지원 browser에서 확인했다.
- [x] `LC-NF-1.1.5-P4-03` `AC-1.1.5-03`: 양 테마의 접힌 sidebar·모바일 More 상황을 재현하여 “아이콘·툴팁·포커스·동작이 일치한다.”를 검증한다. — light 전환, desktop 최근 작업 title, mobile More의 최근 작업과 Escape focus 복귀를 검증했다.
- [x] `LC-NF-1.1.5-P4-04` `AC-1.1.5-04`: 새 디자인 승인 없음 상황을 재현하여 “연구 문서만 유지하고 runtime VERSION을 올리지 않는다.”를 검증한다. — 현재 B-1은 이미 사용자 승인됐으므로 미승인 새 morphism을 추가하지 않고 `data-ui-variant=b1`·runtime 1.1.5·classic rollback 계약을 유지했다.
- [x] `LC-NF-1.1.5-P4-05` 직전 버전·다른 계정·오프라인·재접속·서버 재시작·지원 브라우저/기기 회귀를 수행하고 미실행/skip의 원인을 기록한다. — 격리 PostgreSQL에서 다른 owner 404/빈 recent, offline/reconnect를 검증했고 5-browser 10 PASS. 실제 개발 서비스 재시작은 후보 CI·동일 SHA 배포 뒤 실행한다. 실제 물리 기기·OS IME/AT는 미실행으로 분리한다.
- [x] `LC-NF-1.1.5-P4-06` 발견된 원인을 최소 수정 후 같은 재현을 다시 실행한다. 성능 변경은 동일 입력·환경의 전후 값과 결과 동등성을 증명하고 테스트 삭제로 통과시키지 않는다. — 제품 결함은 발견되지 않아 앱 코드를 수정하지 않았고, P4 교차 회귀만 추가했다. P3 최초 CI의 숨김 링크 검증 대상 오류는 보이는 5개 대상으로 보정한 뒤 전체 CI에서 통과한 증거를 재사용한다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.1.5-01` | 저장 중 가사에서 sidebar/내비 전환 | editor·IME·초안이 재생성되거나 지워지지 않는다. |
| `AC-1.1.5-02` | 이전 deep link·필터 URL·최근 작업 | 같은 자료와 문맥으로 들어간다. |
| `AC-1.1.5-03` | 양 테마의 접힌 sidebar·모바일 More | 아이콘·툴팁·포커스·동작이 일치한다. |
| `AC-1.1.5-04` | 새 디자인 승인 없음 | 연구 문서만 유지하고 runtime VERSION을 올리지 않는다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

- 기준 source: P3 merge `924980a8613d03a0eb61f04927547279f8a2e104`; runtime 코드/API/DB/migration 변경 0, P4 테스트·인수 문서만 변경.
- 격리 PostgreSQL + production build의 P4 desktop/mobile: 4 PASS. 같은 editor DOM, online/offline 한글 원문, reconnect server exact body, reload, recent filter/deep link, light/focus, 다른 owner 404/빈 목록을 검증했다.
- Chromium desktop·Firefox desktop·WebKit desktop·Chromium mobile·WebKit mobile: 10 PASS. 실제 Windows/macOS/iOS/Android 브라우저가 아니라 Linux browser engine 자동 회귀이며 물리 기기·OS IME·screen reader·200% OS zoom을 대신하지 않는다.
- Node 24 `pnpm check`: PASS. 후보 `8fb03becfe27a95f019defb4cbdfee10b55f6812`의 push/PR Actions `34811056142`·`34811076974` 전체 PASS. Vitest 365 PASS·4 조건부 skip, 전체 Playwright 365 PASS·41 조건부 skip이며 네 dev image 게시·서명을 완료했다.
- 서비스별 source SHA·`dev-1.1.5-p4`·`Dev`·`Dev-latest`는 같은 digest다: web `sha256:49007db0606d1da85f02d933901e226582bbf64425a3d8d448ce660390d4cb2c`, collaboration `sha256:4855aeb8aa28ceb7f81d0b8521fba86d262bca3539281f13bcb442ddd027fb09`, worker `sha256:bc9c1818bf81bb117578dfdf4a0be2e078f295c9d879a2cca555ad29f59795ab`, migrate `sha256:d01ebaa813e7390a712f8768953abfe1d11309e2c04014ddea3be2758f591798`.
- 같은 SHA 개발 서버는 `1.1.5`·`dev`·`p4`, schema `1140_sharing_stability.sql`, B-1 root와 네 서비스 healthy다. 공개 PC/mobile×dark/light exact build·root·overflow를 통과했고, 합성 owner의 exact body를 서비스 재시작 전후 확인해 recent deep link까지 PASS한 뒤 fixture를 제거했다. 릴리스 서버는 변경하지 않았다.
- 실제 Windows/macOS/iOS/Android 물리 기기·OS IME·screen reader·200% OS zoom은 이번 Phase에서 실행하지 않았고 자동화 결과로 대체하지 않는다.

## 완료 조건

- [x] 작업 ID마다 코드/설계·실행/검토 증거·정확한 SHA가 연결되어 있다.
- [x] 현재 패치의 원문·권한·복구·오류 처리가 정상 동작과 함께 검증되었다.
- [x] 미실행·남은 결함·외부 차단·보류한 기술 결정이 숨김없이 기록되었다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [x] 구현 Phase는 CI·동일 SHA 개발 인수를, 설계-only는 승인 증거를 갖췄다.
- [x] main·Release·운영 변경은 별도 현재 승인 없이 수행하지 않았다.

## 산출물

- 1.1.5 P4의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.1.5 P5](5phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.
