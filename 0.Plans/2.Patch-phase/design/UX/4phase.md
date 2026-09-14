# UX Phase 4 — 사용성·접근성 검토·안 수정

- 상태: **완료** (`complete`)
- 단계 목적: 미려함뿐 아니라 실제 작업 가능성을 확인한다.
- 적용 범위: 설계·목업 마일스톤 (런타임 미배포)

> 구현 담당자는 승인된 범위 안에서 작업별 실패 재현→최소 수정→회귀 성공→검토 가능한 commit을 수행한다. 이 계획 작성만으로 다음 Phase를 선행 구현하거나 실제 배포하지 않는다.

## 목표

미려함뿐 아니라 실제 작업 가능성을 확인한다.

## 선행조건

- [UX P3](3phase.md)의 실제 인수와 현재 작업 경로의 담당자 충돌 확인.
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

- [x] `LC-DESIGN-UX-P4-01` 동일 사용자 과제로 기존안/새안의 단계·오류·재개 가능성을 비교한다.
- [x] `LC-DESIGN-UX-P4-02` 키보드 순서·focus trap/복귀·대비·텍스트 확대·reduced motion을 검토한다.
- [x] `LC-DESIGN-UX-P4-03` collapsed sidebar·portal/theme·sheet/keyboard 겹침과 긴 글쓰기 영역을 집중 검토한다.
- [x] `LC-DESIGN-UX-P4-04` 기능 삭제·동선 변경·원문 노출의 위험을 별도 change log에 기록한다.
- [x] `LC-DESIGN-UX-P4-05` 검토 의견을 수정하고 각 수용 기준에 대응되는 화면 증거를 남긴다.
- [x] `LC-DESIGN-UX-P4-06` 개발 비용/회귀 범위·점진 전환 단계와 rollback 가능한 feature flag 계획을 정리한다.

- [x] `LC-DESIGN-UX-P4-07` reduced-motion·reduced transparency·increased contrast 및 저사양 모바일 예산을 검증한다. 효과 fallback에서도 정보·입력·focus·원문이 보존돼야 한다.

## 구체적 검증

1. 핵심 창작/복구/인가 기능이 개편안에서 빠지지 않는다.
2. 목업 검토와 실제 production 구현 테스트를 구분해 기록한다.

## 실행·증거 기록

- P3 merge `3ea75152266c93f1cc881b39e8b1f82094a1de25`에서 [P4 사용성·접근성 검토](../../../../docs/ux/ux-p4-usability-accessibility-review.md), [interaction 계약](../../new_Mock-up/interaction-contract.md), [검토 변경 기록](../../new_Mock-up/review-changelog.md)을 만들고 목업 수정 commit `0177c841445bf55888d33f29ee766dd76fe652da`에 고정했다.
- 18화면×양 theme×11 viewport/platform 문맥 396페이지에서 horizontal overflow 0건, 144 Axe serious/critical 0건, 72 keyboard/focus-visible 검사 0건을 확인했다. iOS/Android 320·360·390·768px와 Windows/Linux/macOS 1440px을 사용했다. 첫 320px 공유 editor 6px overflow는 dock gap/padding을 수정한 뒤 같은 전수 행렬에서 0건으로 재검증했다.
- reduced-motion+forced-colors에서 animation 제거·system border·media 활성화를 확인했다. backdrop/filter·외부 요청은 0, 공통 CSS+JS 37,415 bytes, 최대 DOM 145, 로컬 headless p95 42ms였다. 이는 저사양 실기기 성능 PASS가 아닌 정적 prototype 대리 예산이다.
- 현행/B-1의 가입·창작·라임/프롬프트·최근 재개·공유/회수 과제를 대조하고 기능 삭제 없음, 9개 고정 editor 행동을 4개+더보기/context로 이동, viewport별 primary navigation 하나를 기록했다. mobile editor label 줄바꿈과 320px 검색 field 압축을 수정했다.
- 정적 prototype에 없는 portal/sheet focus trap·Escape·trigger 복귀·keyboard/safe-area·theme 상속은 구현 계약으로만 고정하고 실제 PASS로 표시하지 않았다. feature flag를 token→shell→workspace→editor shell→sharing 순으로 분리하고 editor remount/IME/undo/draft 또는 ACL 불일치를 즉시 rollback 조건으로 삼았다.
- 실제 NVDA/VoiceOver/TalkBack·OS/물리 기기·실제 IME·OS zoom·GPU/배터리는 미실행이다. 앱/runtime/DB/server와 보호된 `0.Plans/Mock-up/**`는 변경하지 않았다.

## 완료 조건

- [x] 모든 작업 ID와 구체적 수용 기준에 실제 산출물/증거가 있다.
- [x] 원문·인가·복구·기존 사용자 동작을 손상시키지 않았고 B-1 의미 안의 layout 수정만 수행했다.
- [x] 검사하지 못한 항목·외부 제한·남은 위험을 숨기지 않고 기록했다.
- [x] 현재 문서와 체크 상태·담당 경로·정확한 산출물 SHA가 일치한다.
- [x] 설계-only P4의 사용성·자동 접근성/반응형 검토와 수정 회귀를 완료했다.
- [x] release/main/production·앱/runtime/DB 변경을 수행하지 않았다.

## 산출물

- 사용성 검토·수정안
- 작업 ID별 검증/변경 파일·migration·미실행·남은 위험 기록.

## 다음 Phase 인계

[UX P5](5phase.md)에 승인 계약·source SHA·현재 데이터/동작 호환·실제 테스트 증거·남은 결함과 중단 조건을 전달한다. UX P5는 디자인 승인 인수만 수행하며 제품 release를 발행하지 않는다. 이후 1.1.5 구현의 모든 Phase와 별도 release go/no-go가 필요하다. 다음 구현 시작은 선행 인수와 사용자의 범위 승인에 따른다.
