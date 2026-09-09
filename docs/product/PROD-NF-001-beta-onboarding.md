# PROD-NF-001 — 가입 동선·code 소비·관리자 화면 밖 CLI

- 상태: **Accepted**
- 작성일: 2026-09-09
- 결정 Phase: 1.0.1 P1
- 승인자/시각: **사용자 / 2026-09-09T17:55:11+09:00**
- 범위 원본: 사용자의 1.0.1 필수 및 후속 1.x 계획 요청.

## 해결할 질문

code+메일 입력과 Google 신원 확인 중 언제 코드를 소비하고 사용자 접근권을 부여할 것인가?

## 검토한 대안

### 1. 메일 입력/로그인 시도 때 소비

취소·다른 계정·응답 유실이 초대권을 태우거나 임의 메일을 허용하므로 거부한다.

### 2. 검증된 callback에서 원자 소비

사용자 의도와 검증 identity를 일치시키고 단일사용을 보장하는 권장안이다.

### 3. 관리자 수동 최종 승인 추가

운영통제는 높지만 요청한 자동 가입 동선과 달라 별도 선택 기능이다.

## 권장 선택과 이유

검증된 callback 원자 소비를 권장한다. 기존 allowed 계정은 code 없이 로그인하고 refresh는 미사용 초대만 폐기한다.

## 승인 기록

사용자가 1.0.1 계획 전체 실행을 승인해 대안 2를 선택했다. 가입은 `코드+메일 입력 → Google 신원 검증 → 동일 메일 확인 → 코드 소비·grant·receipt 원자 commit` 순서로 고정한다. 기존 허용 계정은 code 없이 로그인하며 취소·wrong account·검증 실패에는 code나 grant 상태를 변경하지 않는다.

## 영향받는 작업·화면·schema·운영

NF-REQ-007~015·signup UI·CLI help·동시 소비/refresh·세션 복구·메일/코드 안내.

## 자동·수동 검증 기준

n=7·한번사용·미사용ls·refresh·wrongaccount/cancel/replay·이전계정/blocked계정·새 Google 계정 실제 smoke.

## 되돌림 또는 대체 비용

가입 flag를 끄면 새 초대만 중단한다. 기존 정상 grant와 사용자 자료를 삭제하지 않는다.

## 범위 밖과 관련 결정

이 문서 생성은 구현/배포 또는 과거 결정의 자동 폐기 승인이 아니다. 원문/기존 사용자·이력·major1 정책을 보존한다. 기존 ADR/PROD/OPS의 해당 범위만 새 Accepted 기록으로 대체한다.

- [세부 계약](../../0.Plans/2.Patch-phase/contracts/BETA-ACCESS.md)
- [결정 권한과 소비 시점](../../0.Plans/2.Patch-phase/Decision-Ownership.md)
- [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)
- [버전 정책](../../0.Plans/2.Patch-phase/VERSIONING.md)

## 승인 기록 규칙

승인 시 선택 대안·승인자·시각·정확한 적용 범위·미해결 위험·추가 테스트를 기록한다. 계획 승인과 코드/운영 배포 승인은 별개다. 대체 시 새 ID와 사유를 연결하고 기존 Accepted 원문을 덮어쓰지 않는다.
