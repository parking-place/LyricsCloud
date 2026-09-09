# UX Phase 2 — 정보 구조·토큰·약 5개 morphism 시안과 사용자 선택

- 상태: **검토** (`review`, 계획 미착수)
- 단계 목적: 기존 계약을 유지하는 디자인 선택을 제안한다.
- 적용 범위: 설계·목업 마일스톤 (런타임 미배포)

> 구현 담당자는 승인된 범위 안에서 작업별 실패 재현→최소 수정→회귀 성공→검토 가능한 commit을 수행한다. 이 계획 작성만으로 다음 Phase를 선행 구현하거나 실제 배포하지 않는다.

## 목표

기존 계약을 유지하는 디자인 선택을 제안한다.

## 선행조건

- [UX P1](1phase.md)의 실제 인수와 현재 작업 경로의 담당자 충돌 확인.
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

- [ ] `LC-DESIGN-UX-P2-01` 보수적 shell 개선안과 통합 workspace 개편안을 같은 사용자 과제로 비교한다. 그 구조 비교 위에서 flat-depth/glass/neumorphism/clay/liquid glass 약 5개 morphism 시안을 제시한다.
- [ ] `LC-DESIGN-UX-P2-02` light/dark 색상·공간·타이포·아이콘·focus·overlay·motion·dense list 토큰을 정의한다.
- [ ] `LC-DESIGN-UX-P2-03` 저장/오프라인/동기화/공유 권한을 색상 외 문장·상태로 전달하는 UI 규칙을 만든다.
- [ ] `LC-DESIGN-UX-P2-04` 반응형 메뉴·닫힌 sidebar·자료 패널·modal/sheet의 stacking과 키보드 복귀 규칙을 정의한다.
- [ ] `LC-DESIGN-UX-P2-05` 필요한 디자인/Figma·문서/Context7·브라우저 테스트 도구를 TOOLS-AND-SKILLS.md에서 설치 필요/선택/권한으로 분류한다.
- [ ] `LC-DESIGN-UX-P2-06` 접근성 기준과 사용자의 시안 선택을 P3 착수 전에 기록하고 기존 기능 제거가 있다면 명시 승인 대상으로 분리한다.

- [ ] `LC-DESIGN-UX-P2-07` 사용자 Liquid Glass Effect/Toggle 및 Apple motion 출처를 비교하고 blur·saturation·shadow·SVG distortion·GSAP 후보의 권리·지원·비용·fallback을 설명한다. 도구 설치와 실제 구현은 이 문서 작성 범위가 아니다.

## 구체적 검증

1. 약 5개 시안을 같은 과제/자료/PC·iOS·Android viewport로 비교하고 사용자 선택을 기록한 뒤 P3를 시작한다.
2. 새 도구 필요 여부를 기록하되 이 계획이 계정 연결·설치 승인은 아니다.

## 실행·증거 기록

현재 명령은 [QUALITY-GATES.md](../../QUALITY-GATES.md)를 따른다. 작업별 실제 test 파일/명령·환경·실패/성공 수·SHA를 인수 로그에 기록한다. DB/E2E는 전용 테스트 DB에서만 수행한다. 실제 IME/기기/Google 설정 검증을 synthetic 이벤트나 이전 PASS로 대체하지 않는다. 문서-only Phase는 링크/범위/결정/목업 검토를 수행하며 앱 테스트 결과를 꾸미지 않는다.

## 완료 조건

- [ ] 모든 작업 ID와 구체적 수용 기준에 실제 산출물/증거가 있다.
- [ ] 원문·인가·복구·기존 사용자 동작을 손상시키지 않았고 확인된 차이는 승인됐다.
- [ ] 검사하지 못한 항목·외부 제한·남은 위험을 숨기지 않고 기록했다.
- [ ] 현재 문서와 체크 상태·담당 경로·정확한 SHA가 일치한다.
- [ ] 구현 Phase는 CI·정확한 SHA의 개발 인수를, 설계-only는 검토/승인을 완료했다.
- [ ] release/main/production 변경은 별도 승인 없이 실행하지 않았다.

## 산출물

- 정보 구조·디자인 토큰·대안 비교
- 작업 ID별 검증/변경 파일·migration·미실행·남은 위험 기록.

## 다음 Phase 인계

[UX P3](3phase.md)에 승인 계약·source SHA·현재 데이터/동작 호환·실제 테스트 증거·남은 결함과 중단 조건을 전달한다. UX P5는 디자인 승인 인수만 수행하며 제품 release를 발행하지 않는다. 이후 1.1.5 구현의 모든 Phase와 별도 release go/no-go가 필요하다. 다음 구현 시작은 선행 인수와 사용자의 범위 승인에 따른다.
