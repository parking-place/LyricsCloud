# 1.0.5 Phase 5 — 문서·개발 인수·후속 연결

- 상태: **완료** (`complete`, 후보 인수 완료·정식 릴리스 승인)
- 단계 목적: 서브 송폼·가사 3,000자 경고의 문서·개발 인수·후속 연결을 완료하고 다음 단계에 검증 가능한 입력을 전달한다.
- 문서 작성과 구현/배포 완료는 별개다.

> 구현 담당자는 승인된 범위에서 실패 재현→최소 구현→관련 회귀→검토 가능한 commit을 수행한다. 로컬 Codex의 기존 수정·초안·운영 데이터를 덮어쓰지 않는다.

## 목표

서브 송폼의 주 태그 탐색과 덜 강조된 부태그 표시를 추가하고 전체 복사 길이를 안내한다. 이번 Phase는 아래 작업 체크리스트의 책임만 가진다.

## 선행조건

- [1.0.5 P4](4phase.md)의 산출물·검증/승인과 실제 최종 SHA 인수.
- 현재 실행 STATUS·Agent/AGENTS·수정 파일 담당자 충돌 확인.
- [품질 게이트](../QUALITY-GATES.md)의 격리 환경·지원 런타임·필수 물리 기기 확보.

## 기준 링크

[버전 목표·수용 사례](README.md) · [세부 계약](../contracts/EDITOR-COPY.md) · [요구사항](../Requirements-Traceability.md) · [결정 권한](../Decision-Ownership.md) · [버전 규칙](../VERSIONING.md) · [릴리스 규칙](../RELEASE-POLICY.md)

## 포함 범위

`NF-REQ-024`, `NF-REQ-025`. 아래 작업에서 다루는 현재 패치의 범위만 수행한다. 여러 버전에 걸친 요구는 이 패치의 부분 범위를 검증한 것으로 기록한다.

## 제외 범위

다른 패치의 기능·사용자가 선택하지 않은 Future 아이디어·승인 없는 기술 교체·운영 변경은 제외한다.

## 수정 책임 경로와 인터페이스

- `packages/domain/src`
- `packages/editor/src`
- `apps/web/src/components`
- `docs/product/PROD-0003-songform.md`

경로는 책임 영역이다. 신규 제안 표시는 아직 생성된 파일이 아니며 실제 이름·runner·package export는 P1 인수에서 확정한다. 디렉터리 전체를 리팩터링하라는 권한이 아니다. **입력**은 선행 계약·source SHA·fixture·권한 문맥이고 **출력**은 현 단계의 코드/설계·실행 증거·후속 호환 계약이다.

## 작업 체크리스트

- [x] `LC-NF-1.0.5-P5-01` 1.0.5의 요구 범위와 각 수용 사례를 정확한 source SHA·변경 파일·migration·실행 명령·결과에 연결한다.
- [x] `LC-NF-1.0.5-P5-02` 사용자 가이드·README·지원·보안·자가호스팅·현재 계획/결정 문서를 서브 송폼·가사 3,000자 경고의 실제 동작에 맞춰 갱신하고 과거 검증 기록은 보존한다.
- [x] `LC-NF-1.0.5-P5-03` 원격 CI와 허용된 개발 산출물·동일 SHA의 개발 환경을 확인한다. 문서-only 결과면 문서 승인만 기록하고 앱 배포 성공을 주장하지 않는다.
- [x] `LC-NF-1.0.5-P5-04` 확인된 P0/P1, 원문 유실, 인증 우회, 무음 저장 실패가 없음을 실제 범위에서 판정한다. 신규 범위의 필수 안전성을 다음 안정화 패치로 미루지 않는다.
- [x] `LC-NF-1.0.5-P5-05` 다섯 Phase 후보 인수 이후에만 별도 release go/no-go를 요청할 수 있다. main 병합·정식 별칭·app.example.test 배포는 현재 승인 범위를 확인하고 실행한다.
- [x] `LC-NF-1.0.5-P5-06` 후속 패치에 계약·미해결/보류·실기기/운영 증거·중단/복구 조건을 인계한다. 같은 제품 계열을 유지하고 빈 릴리스·자동 minor 승격을 만들지 않는다.

## 구체적 검증

| 수용 ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.0.5-01` | [Verse: whisper] 뒤 가사 | 탐색은 Verse, 복사는 [Verse: whisper] 전체를 보존한다. |
| `AC-1.0.5-02` | [Verse: a:b] | 주 태그는 Verse이며 나머지 콜론과 내용이 손실되지 않는다. |
| `AC-1.0.5-03` | 최종 복사 2999·3000·3001자 | 3001만 경고하며 저장과 복사는 항상 가능하다. |
| `AC-1.0.5-04` | 부태그 조합 중 다른 탭 업데이트 | 한글 자모·cursor·undo가 깨지지 않는다. |

P1은 위 기대 결과와 실제 구현 가능 경계를 승인하는 단계다. P2/P3은 관련 재현·수정과 사용자 흐름을 실행하며, P4에서 전체 교차 검증하고 P5에서 실제 결과를 인수한다. 표가 있다는 이유로 테스트 완료로 처리하지 않는다.

## 실행·증거 기록

[공통 명령·검증](../QUALITY-GATES.md)을 먼저 읽는다. 기존 runner의 영향받은 검사를 우선 사용하고 필요할 때만 회귀를 보강한다. 지원 환경에서 관련 DB/E2E를 선택하며 동일 변경의 full suite는 로컬/CI 중 한 곳과 필수 게이트만 따른다. native은 승인된 SDK/플랫폼 명령을 기록한다. 없는 도구·실제 IME·물리 기기 검증을 모사 결과로 통과시켰다고 표시하지 않는다. 문서-only Phase는 링크·범위·결정·설계 검토로 별도 인수한다.

- 후보 SHA: `78b3f1bc4c240bbceaddcab33e56af1ae0048aae`
- 원격: PR [#43](https://github.com/parking-place/LyricsCloud/pull/43), Actions push run [34487251707](https://github.com/parking-place/LyricsCloud/actions/runs/34487251707) 전체 verify와 web·collaboration·migrate·worker 개발 image 게시/서명 PASS
- 개발 인수: 같은 후보 SHA, `version=1.0.5`, `channel=dev`, `phase=p5`, `schema=1000_prompt_modes.sql`, PostgreSQL·web·collaboration·worker healthy와 공개 live/ready PASS
- 기능 smoke: 공개 `[Verse: whisper]`·`[Verse: a:b]` suffix와 주 이름 탐색, 3,001 code point exact 자동 복사·비차단 안내, collaboration 재시작 전후 같은 document key·DB 원문 보존 PASS. 합성 자료는 즉시 제거했다.
- 경계: 신규 P0/P1·원문 유실·인증 우회·교차 owner 노출·무음 저장 실패 0건. 실제 Windows/iOS/Android 물리 입력은 이번 후보에서 새로 수행하지 않았고 `OPS-100-001` 외부 backup 예외를 유지한다.

## 완료 조건

- [x] 작업 ID마다 코드/설계·실행/검토 증거·정확한 SHA가 연결되어 있다.
- [x] 현재 패치의 원문·권한·복구·오류 처리가 정상 동작과 함께 검증되었다.
- [x] 미실행·남은 결함·외부 차단·보류한 기술 결정이 숨김없이 기록되었다.
- [x] 현재 상태/담당/변경 파일·관련 문서가 실제 수행 내용과 일치한다.
- [x] 구현 Phase는 CI·동일 SHA 개발 인수를, 설계-only는 승인 증거를 갖췄다.
- [x] main·Release·운영 변경은 별도 현재 승인 범위를 확인해 실행한다.

## 산출물

- 1.0.5 P5의 검토 가능한 변경/계약과 수용 사례 증거.
- 변경 파일·추가 migration·실행 명령/환경·결과·미실행/잔여 위험의 인수 기록.
- 후속 소비자가 유지할 API·데이터·copy·권한·UI 상태 계약.

## 다음 Phase 인계

[1.0.6 P1](../1.0.6/1phase.md)에 첫 콜론 주 이름·lossless suffix·비차단 copy 계약과 미실행 물리 기기·`OPS-100-001` 예외를 넘긴다. 현재 사용자 승인은 1.0.5 정식 릴리스까지이며, 다음 버전은 자동 진행하지 않는다.
