# OPS-NF-001 — 1.x 버전·main release-only·Private Beta 발행

- 상태: **Proposed**
- 작성일: 2026-09-09
- 결정 Phase: 1.0.1 P1
- 승인자/시각: **미승인 — 해당 Phase에서 사용자/지정 결정권자의 승인을 기록한다.**
- 범위 원본: 사용자의 1.0.1 필수 및 후속 1.x 계획 요청.

## 해결할 질문

사용자의 major 고정·다자리 버전·main 병합·세 Docker aliases를 기존 검증 체계에 어떻게 연결할 것인가?

## 검토한 대안

### 1. 매 Phase main 병합/숫자tag dev 이동

이번 사용자 지시와 immutable release 추적에 맞지 않아 후속 정책으로 쓰지 않는다.

### 2. release 계열 Phase PR + 최종 main 검증

Phase dev 인수는 유지하고 승인 release 때 main/final SHA/aliases/prod를 분리한다.

### 3. P6/1.0.1에서 과거 v1.0.0 교체

이미 발행한 version 내용 교체이므로 금지한다.

## 권장 선택과 이유

두 번째 안. major1·다자리 숫자·main release-only는 사용자 제약이다. 현재 제품 단계의 수정/기능 추가/최적화/플랫폼 확장은 patch를 우선한다. 권한/사용자 모델이 실질적으로 전환되고 승인·인수가 있을 때만 minor를 검토한다. 현재 1.1.0은 공유 진입 후보이며 UI/native만으로 다음 minor를 예약하지 않는다. UX는 제품 번호 없는 설계다. 세부 릴리스 순서는 운영 인수 후 Accepted로 확정한다.

## 영향받는 작업·화면·schema·운영

Agent/AGENTS·STATUS·version parser·manifest/health/header·CI·DockerHub·dev/prod runbook·README·보호 branch 규칙.

## 자동·수동 검증 기준

1.0.9<1.0.10<1.1.0 및 1.9.0<1.10.0<1.12.91 숫자 tuple 정렬·branch/task parser·dev releasealias 차단·서비스별3alias digest·최종M SHA CI와 smoke.

## 되돌림 또는 대체 비용

실패 시 release 승격/운영 배포를 중단하고 검증된 이전 digest로 승인 rollback한다. 숫자 tag/기존 release 증거는 이동하지 않는다.

## 범위 밖과 관련 결정

이 문서 생성은 구현/배포 또는 과거 결정의 자동 폐기 승인이 아니다. 원문/기존 사용자·이력·major1 정책을 보존한다. 기존 ADR/PROD/OPS의 해당 범위만 새 Accepted 기록으로 대체한다.

- [세부 계약](../../0.Plans/2.Patch-phase/RELEASE-POLICY.md)
- [결정 권한과 소비 시점](../../0.Plans/2.Patch-phase/Decision-Ownership.md)
- [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)
- [버전 정책](../../0.Plans/2.Patch-phase/VERSIONING.md)

## 승인 기록 규칙

승인 시 선택 대안·승인자·시각·정확한 적용 범위·미해결 위험·추가 테스트를 기록한다. 계획 승인과 코드/운영 배포 승인은 별개다. 대체 시 새 ID와 사유를 연결하고 기존 Accepted 원문을 덮어쓰지 않는다.

## 구현 소비 보강

기본 5 Phase·업무량/의존성에 따른 추가 허용·1.0.1 10 Phase는 최신 사용자 범위다. 현행 `release-phase-state.mjs`의 1.0.0 P5/P6 전제를 새 경로·다자리 숫자·가변 Phase로 확장하는 실제 구현/검증은 1.0.1 P8이 맡는다. 모든 Phase 인수 뒤에만 Private Beta release 후보를 확정한다.
