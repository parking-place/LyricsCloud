# 1.1.6 Phase 2 — 핵심 기반·저장과 서버

- 상태: **진행 중** (`in_progress`, 로컬 수용 완료·후보 CI/동일 SHA 개발 인수 대기)
- 단계 목적: 승인 디자인 적용·편집과 복구 화면의 핵심 기반·저장과 서버을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

창작 편집기·자료 패널·가입/공유/복구 화면에 승인 디자인을 적용하고 전 기능을 다시 검증한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [x] [1.1.6 P1](1phase.md)의 산출물·검증/승인과 원격 SHA `3e7eaa44d5c991111fc95909afb7ef2687ec2a8f` 인수.
- [x] 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [x] [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임 확인. 실제 물리 기기·OS IME/AT/OS zoom은 P4/P5 gate로 유지한다.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/DESIGN-NATIVE.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-037`, `NF-REQ-039`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

다른 패치의 기능·사용자가 선택하지 않은 Future 아이디어·승인 없는 기술 교체·운영 변경은 제외한다.

## 수정 책임 경로와 인터페이스

- `apps/web/src/components`
- `packages/editor/src`
- `packages/ui/src`
- `tests/e2e`
- `docs/user`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.1.6-P2-01` 구현 전 `1.1.6` 수용 사례의 실패 테스트를 작성한다. `tests/new-feature/1.1.6.contract.test.ts` 최초 실행은 구현 표면 부재로 2 FAIL/1 PASS였고 구현 뒤 동일 입력이 3 PASS다.
- [x] `LC-NF-1.1.6-P2-02` 편집기 wrapper·패널 상태·모바일 sheet를 승인된 구조로 이행한다. lyric/rhyme/prompt의 저장 strip과 B-1 flat panel, 320px급 context·responsive sheet를 적용했다.
- [x] `LC-NF-1.1.6-P2-03` 이벤트 중복 등록·effect 정리·timer·portal stacking의 회귀를 먼저 고정한다. CodeMirror 생성 effect를 resource identity에만 결합하고 navigation effect를 분리했으며 listener 정리 대칭과 모바일 dialog focus를 고정했다.
- [x] `LC-NF-1.1.6-P2-04` copy payload·송폼 파서·권한 검사·저장 완료 판단은 기존 계약을 재사용한다. 10,000줄 Unicode/Extend copy와 기존 B-1 저장·소유권 E2E를 변경 없이 통과했다.
- [x] `LC-NF-1.1.6-P2-05` 성능 전후 비교에서 장문 입력 지연과 메모리 회수를 확인하고 근거 있는 최적화만 적용한다. 실제 Chromium 10,000줄 mount·theme/panel/viewport·undo·서버 재저장과 GC 뒤 32 MiB heap 증가 상한을 통과했다.
- [x] `LC-NF-1.1.6-P2-06` 추가 schema가 있으면 실제 테스트 DB의 빈 설치·이전 schema 업그레이드·권한·되돌림을 검사한다. schema/migration은 추가하지 않았고 격리 PostgreSQL에 전체 migration을 두 번 적용한 뒤 관련 E2E를 통과했다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.1.6-01` | 10,000줄 편집 중 화면 폭/테마/패널 변경 | 현재 IME·selection·undo·초안이 유지된다. |
| `AC-1.1.6-02` | 서버 저장 실패/권한 회수/새로고침 경고 | 안내와 실제 저장/접근 상태가 일치한다. |
| `AC-1.1.6-03` | 동일 자료를 이전/새 UI에서 복사·내보내기 | 결과가 디자인과 무관하게 동일하다. |
| `AC-1.1.6-04` | 필수 화면의 키보드·mobile·확대 조작 | 우회 없는 버튼 불능과 겹침이 없다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

- 기준 source는 main `033620d872deecbb8a94b869caa2d8d291f2bb41`이며 `1.1.6` runtime 후보로 올렸다. API·DB schema·migration·권한·copy 형식은 변경하지 않았다.
- 실패 우선 계약은 2 FAIL/1 PASS에서 시작했고 구현 후 계약/config 21 PASS, 전체 unit 66 files·257 PASS·115 SKIP, typecheck와 production build를 통과했다.
- 격리 PostgreSQL에서 migration을 두 번 적용했다. 기존 B-1 desktop/mobile 12 PASS, 편집/자료 panel 회귀 4 PASS, 기존 10,000줄 편집·저장·수동 copy 1 PASS, 신규 동일 editor DOM·theme/panel/1024/900px sheet·undo·heap 회수 1 PASS다.
- 최초 신규 CSS는 mobile에서 `desktop-open` 숨김 우선순위로 dialog를 감춰 3 PASS/1 FAIL이었다. desktop panel의 961~1080px 접근 경로를 유지하고 960px 이하 desktop-only 숨김과 mobile sheet 표시를 분리한 뒤 동일 4건이 모두 PASS했다.
- 첫 후보 `89a39c478ce3bcaca22a85621c22dc048f5bc53d`의 PR 전체 verify는 PASS했지만 branch push verify는 같은 SHA에서 두 번 모두 기존 0.9.1 성능 측정의 save 3-round p95 CV만 각각 77.551%·114.241%로 실패했다(예산 75%, save p95 6.074ms·9.738ms/120ms, 오류율 0%). 7표본 p95가 라운드 최댓값이 되는 원인을 고치기 위해 save만 라운드당 21표본으로 늘리고 3라운드·p95·75%·모든 시간/오류 예산은 유지했다. concurrent purge probe는 기존 7표본을 유지하며 격리 PostgreSQL에서 계약 검사와 전체 성능 예산을 연속 3회 PASS했다(save CV 7.576%·9.996%·2.809%, purge 1065.060ms·1107.319ms·1037.080ms/2000ms).
- Chromium 합성 composition/브라우저 회귀는 실제 OS IME·물리 기기·AT·OS zoom을 대체하지 않는다. 해당 실제 gate와 전체 교차 회귀는 P4/P5 미실행 항목으로 유지한다.
- 보정 후보 원격 SHA·Actions·네 dev image digest·동일 SHA 개발 배포·공개 smoke는 아직 대기 중이며 완료 조건을 선표시하지 않는다.

## 완료 조건

- [ ] 작업 ID마다 코드/설계·실행/검토 증거·정확한 SHA가 연결되어 있다.
- [ ] 현재 패치의 원문·권한·복구·오류 처리가 정상 동작과 함께 검증되었다.
- [ ] 미실행·남은 결함·외부 차단·보류한 기술 결정이 숨김없이 기록되었다.
- [ ] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [ ] 구현 Phase는 CI·동일 SHA 개발 인수를, 설계-only는 승인 증거를 갖췄다.
- [ ] main·Release·운영 변경은 별도 현재 승인 없이 수행하지 않았다.

## 산출물

- 1.1.6 P2의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.1.6 P3](3phase.md)에 입력·실행 결과·호환 및 중단 조건을 넘긴다. 다음 단계의 승인이 없거나 선행 증거가 부족하면 자동 진행하지 않는다. 문서 작성으로 runtime version을 바꾸지 않는다.
