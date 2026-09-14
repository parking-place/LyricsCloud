# UX Phase 5 — 디자인 승인·1.1.5 구현 인계

- 상태: **완료** (`complete`)
- 단계 목적: 승인된 디자인만 다음 구현 단계에 넘긴다.
- 적용 범위: 설계·목업 마일스톤 (런타임 미배포)

> 구현 담당자는 승인된 범위 안에서 작업별 실패 재현→최소 수정→회귀 성공→검토 가능한 commit을 수행한다. 이 계획 작성만으로 다음 Phase를 선행 구현하거나 실제 배포하지 않는다.

## 목표

승인된 디자인만 다음 구현 단계에 넘긴다.

## 선행조건

- [UX P4](4phase.md)의 실제 인수와 현재 작업 경로의 담당자 충돌 확인.
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
| `docs/ux (신규 제안)` | 이 Phase의 관련 계약/구현/검증만. 실제 파일 존재·담당 경계를 착수 때 재확인 |

**입력:** 선행 Phase의 정확한 SHA·승인된 계약·합성 fixture·미해결 목록. **출력:** 아래 산출물과 테스트/문서·현재 동작 차이·다음 소비자가 유지할 인터페이스. 구체 API/타입은 해당 P1/기반 Phase에서 승인해 기록하고 소비자가 임의 변경하지 않는다.

## 작업 체크리스트

- [x] `LC-DESIGN-UX-P5-01` 선택안·유지/변경 기능·토큰·screen matrix·검토 증거를 design manifest로 동결한다.
- [x] `LC-DESIGN-UX-P5-02` 사용자의 디자인 승인 여부와 조건을 기록하고 미승인안은 Proposed로 유지한다.
- [x] `LC-DESIGN-UX-P5-03` 1.1.5의 컴포넌트별 전환 순서·호환 계약·visual baseline·rollback 계획을 인계한다.
- [x] `LC-DESIGN-UX-P5-04` 문서 링크·목업 자산 출처·기능 추적·기존 원본 보존을 검증한다.
- [x] `LC-DESIGN-UX-P5-05` 이 작업은 제품 버전 없는 문서/설계 마일스톤이므로 runtime VERSION·Docker release tag·운영 UI를 변경하지 않는다.
- [x] `LC-DESIGN-UX-P5-06` 미결정 디자인과 Future_Feature 선택을 구현 완료로 처리하지 않는다.

## 구체적 검증

1. 명시적인 디자인 승인 전에는 1.1.5 구현을 시작하지 않는다.
2. 문서-only 완료는 deploy 완료와 다른 양식으로 기록한다.

## 실행·증거 기록

- P4 merge `f2b2b8f37c2be0c17bc599e5ed4a8b8f9cb12a19`를 기준으로 [승인 디자인 manifest](../../../../docs/ux/ux-p5-approved-design-manifest.md)와 [1.1.5 구현 인계](../../../../docs/ux/ux-p5-to-1.1.5-handoff.md)를 artifact commit `8ce1dab07625174b10637b8b06c5f708e99bfd53`에 고정했다. 승인 new_Mock-up tree는 `a3a0250fba5250e7e20092a25dd5bd5e064b2256`이다.
- 2026-09-14 사용자가 직전 B-1 확인 질문에 `1.1.14까지 달렷`이라고 답한 것을 B-1 선택과 UX P3~P5·계획된 후속 실행의 승인으로 기록했다. P4 수정은 mobile layout 세부 조정뿐이며 구조·morphism·기능 범위를 바꾸지 않아 재선택 없이 최종 구현 인수로 소비했다.
- PROD-NF-006을 B-1 점진 구현에 Accepted로 전환했다. 기능 삭제 없음, URL/API/DB·CodeMirror/Yjs·IME/selection/undo·draft/outbox·권한/복구 유지, 1.1.5 token/shell/list/workspace와 1.1.6 editor/detail 분리를 승인 조건으로 명시했다.
- 1.1.5의 P1 조사·실패 입력→P2 token/surface/flag→P3 navigation/list/workspace→P4 실제 DB/browser/복구→P5 문서·CI·동일 SHA 개발 인수 순서, visual baseline, feature flag와 중단/rollback 조건을 인계했다.
- Node 24 문서 validator, 링크·범위·Future inventory/hash, 보호된 old Mock-up diff를 검증했다. 앱/runtime VERSION·Docker tag·DB·개발/릴리스 서버를 변경하지 않았고 P3/P4 자동 목업 결과를 제품 배포나 실제 OS/IME/AT PASS로 표시하지 않았다.

## 완료 조건

- [x] 모든 작업 ID와 구체적 수용 기준에 실제 산출물/증거가 있다.
- [x] 원문·인가·복구·기존 사용자 동작을 손상시키지 않는 B-1 조건을 사용자가 승인했다.
- [x] 검사하지 못한 항목·외부 제한·남은 위험을 manifest와 인계서에 기록했다.
- [x] 현재 문서와 체크 상태·담당 경로·정확한 artifact/tree SHA가 일치한다.
- [x] 설계-only UX P5의 문서·디자인 승인과 1.1.5 인계를 완료했다.
- [x] release/main/production·앱/runtime/DB 변경을 수행하지 않았다.

## 산출물

- 승인 design manifest·1.1.5 인계서
- 작업 ID별 검증/변경 파일·migration·미실행·남은 위험 기록.

## 다음 Phase 인계

[1.1.5 P1](../../1.1.5/1phase.md)에 승인 계약·source SHA·현재 데이터/동작 호환·실제 테스트 증거·남은 결함과 중단 조건을 전달한다. UX P5는 디자인 승인 인수만 수행하며 제품 release를 발행하지 않는다. 이후 1.1.5 구현의 모든 Phase와 별도 release go/no-go가 필요하다. 다음 구현 시작은 선행 인수와 사용자의 범위 승인에 따른다.
