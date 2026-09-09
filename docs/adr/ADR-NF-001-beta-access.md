# ADR-NF-001 — 베타 가입·해시 seed·원자 grant

- 상태: **Proposed**
- 작성일: 2026-09-09
- 결정 Phase: 1.0.1 P1
- 승인자/시각: **미승인 — 해당 Phase에서 사용자/지정 결정권자의 승인을 기록한다.**
- 범위 원본: 사용자의 1.0.1 필수 및 후속 1.x 계획 요청.

## 해결할 질문

로그인 시도만으로 허용하지 않으면서 CLI·hash 파일·일회용 code를 어떻게 연결할 것인가?

## 검토한 대안

### 1. hash 파일만 runtime에 수정

관리 항목이 적지만 파일/DB 다중 쓰기와 동시 callback·refresh의 복구가 복잡하다.

### 2. hash seed + DB grant/receipt

기존 승인 계정을 보존하고 신규 가입의 원자성/멱등성·폐기를 DB에 모을 수 있다.

### 3. 별도 외부 관리 서비스

독립 관리 기능은 풍부하나 긴급 1.0.1 범위를 불필요하게 확장한다.

## 권장 선택과 이유

두 번째 안을 권장한다. .test_users는 HMAC seed이고 신규 grant는 DB가 권한 원본이다. ls 원문 복구에는 관리자 전용 AEAD가 필요하다.

## 영향받는 작업·화면·schema·운영

auth/config/database·추가 migration·CLI·signup/callback·환경 secret·OAuth와 backup runbook. 원문 메일·코드·키 로그 금지.

## 자동·수동 검증 기준

기존 계정·wrong verified email·2인1code·callback replay·refresh 경쟁·key 회전·DB commit 후 response loss·restart-safe limit을 실제 DB에서 검증한다.

## 되돌림 또는 대체 비용

새 grant/code를 손상시키지 않는 application-first rollback과 제한된 old kid 읽기 경로가 필요하다. 평문 allow-all fallback은 없다.

## 범위 밖과 관련 결정

이 문서 생성은 구현/배포 또는 과거 결정의 자동 폐기 승인이 아니다. 원문/기존 사용자·이력·major1 정책을 보존한다. 기존 ADR/PROD/OPS의 해당 범위만 새 Accepted 기록으로 대체한다.

- [세부 계약](../../0.Plans/2.Patch-phase/contracts/BETA-ACCESS.md)
- [결정 권한과 소비 시점](../../0.Plans/2.Patch-phase/Decision-Ownership.md)
- [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)
- [버전 정책](../../0.Plans/2.Patch-phase/VERSIONING.md)

## 승인 기록 규칙

승인 시 선택 대안·승인자·시각·정확한 적용 범위·미해결 위험·추가 테스트를 기록한다. 계획 승인과 코드/운영 배포 승인은 별개다. 대체 시 새 ID와 사유를 연결하고 기존 Accepted 원문을 덮어쓰지 않는다.
