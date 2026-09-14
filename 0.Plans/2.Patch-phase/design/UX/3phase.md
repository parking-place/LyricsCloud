# UX Phase 3 — new_Mock-up·상태별 프로토타입

- 상태: **완료** (`complete`)
- 단계 목적: 보호된 과거 목업과 분리된 새 화면안을 만든다.
- 적용 범위: 설계·목업 마일스톤 (런타임 미배포)

> 구현 담당자는 승인된 범위 안에서 작업별 실패 재현→최소 수정→회귀 성공→검토 가능한 commit을 수행한다. 이 계획 작성만으로 다음 Phase를 선행 구현하거나 실제 배포하지 않는다.

## 목표

보호된 과거 목업과 분리된 새 화면안을 만든다.

## 선행조건

- UX P2의 사용자 시안 선택이 기록돼 있어야 new_Mock-up을 만든다.

- [UX P2](2phase.md)의 실제 인수와 현재 작업 경로의 담당자 충돌 확인.
- 소비할 ADR/PROD/OPS가 Accepted인지 확인. P1에서 만드는 결정은 해당 P1 종료 전에 승인한다.
- 현재 runtime/DB/문서 SHA와 미커밋 변경을 읽고 기존 사용자 데이터·P6 개선을 보존한다.
- [품질 게이트](../../QUALITY-GATES.md)의 격리 환경·지원 버전·실제 기기 조건 확보.

## 기준 링크

- [설계 범위](README.md) / [세부 계약](../../contracts/DESIGN-NATIVE.md)
- [요구사항](../../Requirements-Traceability.md) / [결정 권한](../../Decision-Ownership.md)
- [버전 정책](../../VERSIONING.md) / [release 정책](../../RELEASE-POLICY.md)
- [현재 계획 상태](../../STATUS.md) / [기존 규정 인수](../../GOVERNANCE-INTEGRATION.md)

## 포함 범위

이번 설계 단계는 아래 작업 체크리스트와 연결된 요구만 수행한다. 기술 spike·승인·문서 작업과 실제 제품 구현/배포를 구분한다.

## 제외 범위

이 설계 작업에서 production UI 재작성·runtime 버전 증가·운영 배포는 하지 않는다. 다른 Phase의 기능·사용자 미선택 아이디어·운영 무단 변경은 제외한다.

## 수정 책임 경로와 입출력

| 경로/영역 | 책임 |
|---|---|
| `0.Plans/2.Patch-phase/new_Mock-up` | 이 Phase의 관련 계약/구현/검증만. 실제 파일 존재·담당 경계를 착수 때 재확인 |

**입력:** 선행 Phase의 정확한 SHA·승인된 계약·합성 fixture·미해결 목록. **출력:** 아래 산출물과 테스트/문서·현재 동작 차이·다음 소비자가 유지할 인터페이스. 구체 API/타입은 해당 P1/기반 Phase에서 승인해 기록하고 소비자가 임의 변경하지 않는다.

## 작업 체크리스트

- [x] `LC-DESIGN-UX-P3-01` new_Mock-up 아래 각 화면 README·light/dark·PC/모바일 목업 및 전체 index를 만든다.
- [x] `LC-DESIGN-UX-P3-02` 가입 code 실패·IME 조합·미전송 초안·권한 철회 등 안전성 상태를 목업에 포함한다.
- [x] `LC-DESIGN-UX-P3-03` 리스트/세 grid·송폼subtag·Extend·문장형 prompt·공유 상태를 누락 없이 반영한다.
- [x] `LC-DESIGN-UX-P3-04` 정적 목업과 동작 prototype을 명시적으로 구분하고 없는 서버 기능을 완료로 표시하지 않는다.
- [x] `LC-DESIGN-UX-P3-05` 합성 콘텐츠와 검증된 자산 출처만 사용하고 실제 사용자 screenshot은 넣지 않는다.
- [x] `LC-DESIGN-UX-P3-06` 컴포넌트 단위 구현 매핑과 기존 state/API를 유지하는 전환 초안을 작성한다.

- [x] `LC-DESIGN-UX-P3-07` PC(Windows/Linux/macOS 차이)·iOS·Android 목업을 구분하고 공유 presence/cursor·사전 tooltip·폰트·오류/철회/복구 상태를 선택안으로 구체화한다.

## 구체적 검증

1. 화면/테마/viewport/상태 행렬의 누락이 없으며 기존 source mockup은 그대로다.
2. 입력 원문·선택·저장 표시의 안전성 시나리오가 표현된다.

## 실행·증거 기록

- P2 merge `7e290c145833eb9cd7092b516f2f462b8b42a435`에서 시작해 B-1 목업 산출물 commit `ad1acedf6c9b86f4b8dcc89bcb340c61a97ec5fd`를 만들었다. [new_Mock-up index](../../new_Mock-up/index.html), 18개 화면별 README/HTML, [상태 행렬](../../new_Mock-up/screen-matrix.md), [토큰](../../new_Mock-up/design-tokens.md), [제품 전환 매핑](../../new_Mock-up/component-mapping.md)을 연결했다.
- Node 24에서 공통 JS와 index inline script syntax를 통과했고, Playwright 1.62.1 Chromium에서 18화면×5 플랫폼 문맥×2 theme 180조합과 안전 상태 17×PC/iOS/Android 51조합, 총 231조합을 검사했다. horizontal overflow 0건, serious/critical Axe 위반 0건이다. 첫 실행의 label/select-name/color-contrast/aria-prohibited 40건은 label 연결·cursor 대비·loading role을 수정한 뒤 같은 전수 행렬에서 0건으로 재검증했다.
- 대표 7개 화면 capture와 기계 판독 summary는 ignored private evidence에 보존했다. 가사 IME·미전송, mobile dashboard, 라임 사전 미연결, 공유 철회/복구를 육안 대조했다. 전부 합성 fixture이며 실제 창작물·실제 계정·외부 업로드를 사용하지 않았다.
- prototype 상단에 `서버 저장 없음 · 합성 콘텐츠`를 고정하고 README/매핑에서 OAuth·저장·사전·공유 연결을 수행하지 않는다고 명시했다. 사전 tooltip은 1.0.13 provider no-go를 유지하며 실제 정의처럼 표시하지 않는다.
- 보호된 `0.Plans/Mock-up/**` diff는 0이고 앱/runtime `VERSION`·DB·서버는 변경하지 않았다. 실제 Windows/Linux/macOS/iOS/Android, OS IME, NVDA/VoiceOver/TalkBack, 물리 touch/safe-area/keyboard, 저사양 GPU는 실행하지 않았으며 P4의 수행/미수행 행렬로 넘긴다.

## 완료 조건

- [x] 모든 작업 ID와 구체적 수용 기준에 실제 산출물/증거가 있다.
- [x] 원문·인가·복구·기존 사용자 동작을 손상시키지 않았고 B-1의 기능 보존 전환을 명시했다.
- [x] 검사하지 못한 항목·외부 제한·남은 위험을 숨기지 않고 기록했다.
- [x] 현재 문서와 체크 상태·담당 경로·정확한 산출물 SHA가 일치한다.
- [x] 설계-only P3의 문서·목업·자동 접근성/반응형 검토를 완료했다.
- [x] release/main/production·앱/runtime/DB 변경을 수행하지 않았다.

## 산출물

- 신규 목업 세트·컴포넌트 매핑
- 작업 ID별 검증/변경 파일·migration·미실행·남은 위험 기록.

## 다음 Phase 인계

[UX P4](4phase.md)에 승인 계약·source SHA·현재 데이터/동작 호환·실제 테스트 증거·남은 결함과 중단 조건을 전달한다. UX P5는 디자인 승인 인수만 수행하며 제품 release를 발행하지 않는다. 이후 1.1.5 구현의 모든 Phase와 별도 release go/no-go가 필요하다. 다음 구현 시작은 선행 인수와 사용자의 범위 승인에 따른다.
