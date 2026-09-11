# PROD-NF-004 — 모델 표기·복수 작업 링크

- 상태: **Accepted for 1.0.10 manual workspace**. 1.0.11 자동 metadata provider는 `ADR-NF-002` 승인 전 Proposed다.
- 작성일: 2026-09-09
- 결정 Phase: 1.0.10 P1, 1.0.11 소비
- 승인: 사용자, 2026-09-11. 1.0.14까지 전체 Phase와 버전별 릴리스 실행 지시로 1.0.10 P1 권장안을 소비했다. 수동 model/link 원본·owner 격리·멱등 CAS·복구/export·안전한 새 탭만 승인하며 자동 외부 조회는 승인하지 않는다.

## 해결할 질문

수동 모델/링크와 자동 외부 metadata의 동작·소유권·실패를 어떻게 구분할 것인가?

## 검토한 대안

1. 현재 자료 계약을 재사용하되 새 동작의 경계를 명시한다.
2. 모든 상태/권한/형식을 일괄 교체한다. 영향·이행 비용이 크므로 사전 검증 없이 선택하지 않는다.
3. 외부 의존 또는 구현 가능성이 확인되지 않으면 범위를 숨기지 않고 사용자에게 대안·차단 이유를 제시한다.

## 권장 선택과 이유

1.0.10의 수동 원본을 우선 보존하고 1.0.11의 승인된 provider 결과를 별도 파생 정보로 추가한다. 공식 자동 취득을 못 하면 미완료/범위 승인을 분리한다. 저장 aggregate와 API·제한·rollback은 [P1 인수 기록](../runbooks/1.0.10-phase1-suno-manual-contract.md)에 고정한다.

## 영향과 검증

복수 링크·unknown 모델명 보존·새 탭 보호·URL allowlist·갱신 실패·private 자료 비노출. 수동 1.0.10은 outbound 요청이 없고, 자동 1.0.11의 SSRF/redirect/DNS/provider 경계는 `ADR-NF-002`가 별도로 소유한다. 실제 source SHA·변경 파일·schema·자동/수동 증거를 해당 Phase 인수표에 기록한다. 새 문서가 있다는 사실만으로 기존 Accepted 결정을 폐기하지 않는다.

## 되돌림·비용

새 기능을 중단해도 기존 원문·owner 데이터·정식 버전 기록을 유지한다. 형식/권한을 되돌릴 때 추가 쓰기·미전송 자료·구버전 client의 호환을 확인하고 destructive rollback은 별도 승인한다.

## 범위 밖

미선택 Future 아이디어·원문 외부 전송·운영 배포·메이저 증가의 자동 승인은 포함하지 않는다.

[상세 계약](../../0.Plans/2.Patch-phase/contracts/LIBRARY-SUNO.md) · [결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md) · [버전별 작업 계획](../../0.Plans/2.Patch-phase/ROADMAP.md)
