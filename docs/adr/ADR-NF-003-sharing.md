# ADR-NF-003 — owner·actor·capability 기반 공유

- 상태: **Accepted for 1.1.0 selected-read**
- 작성일: 2026-09-09
- 결정 Phase: 1.1.0 P1 (읽기), 1.1.2 P1 (쓰기 확장 재승인)
- 승인자/시각: **사용자, 2026-09-12 — owner 유지 + 별도 actor + resource grant 권장안을 1.1.0 지정 사용자 읽기에 승인.**
- 범위 원본: 사용자의 1.0.1 필수 및 후속 1.x 계획 요청.

## 해결할 질문

same-owner 전용 자료를 owner 경계 붕괴 없이 타인/guest와 공유하려면 어떤 인가가 필요한가?

## 검토한 대안

### 1. 기존 ownerId로 타인을 가장

구현은 쉬워 보여도 소유권·RLS·revision attribution을 무너뜨리므로 금지한다.

### 2. 명시 grant + actor + resource capability

개인 소유권 유지와 selected/public-link·철회를 명시할 수 있으나 모든 경로 재검증이 필요하다.

### 3. 팀 workspace로 전면 전환

장기 조직 기능에는 가능하나 현재 개별 자료 공유보다 큰 범위다.

## 권장 선택과 이유

두 번째 안을 권장한다. 읽기를 먼저 출시하고 writer/guest는 별도 위험·interop 승인 후 확장한다. W⊆R은 실제 집합으로 검사한다.

## 1.1.0 승인 범위

로그인한 지정 사용자에게 특정 가사만 읽게 하는 grant를 채택한다. 기존 owner-only 개인 API는 유지하며 공유 viewer의 HTTP·RLS·WebSocket만 `actor_id`와 활성 grant를 함께 검사한다. reader update, 공개 링크, writer와 guest는 승인 범위 밖이다. 필드·회수·호환·rollback 상세는 [P1 인수 기록](../runbooks/1.1.0-phase1-sharing-contract.md)을 따른다.

## 영향받는 작업·화면·schema·운영

ADR-0004/0005 후속 범위·RLS·HTTP·WebSocket·cache·search/export/revisions·공유 UI·개인정보 안내.

## 자동·수동 검증 기준

A/B/C/guest·9mode+set matrix·철회 중 socket·offline input 보존·linked private leakage·public-write abuse를 실제 환경에서 시험한다.

## 되돌림 또는 대체 비용

새 공유 flag를 끄되 자기 원본과 grant 이력을 보존한다. 기존에 외부로 복사된 내용 회수는 보장할 수 없다.

## 범위 밖과 관련 결정

이 문서 생성은 구현/배포 또는 과거 결정의 자동 폐기 승인이 아니다. 원문/기존 사용자·이력·major1 정책을 보존한다. 기존 ADR/PROD/OPS의 해당 범위만 새 Accepted 기록으로 대체한다.

- [세부 계약](../../0.Plans/2.Patch-phase/contracts/SHARING.md)
- [결정 권한과 소비 시점](../../0.Plans/2.Patch-phase/Decision-Ownership.md)
- [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)
- [버전 정책](../../0.Plans/2.Patch-phase/VERSIONING.md)

## 승인 기록 규칙

승인 시 선택 대안·승인자·시각·정확한 적용 범위·미해결 위험·추가 테스트를 기록한다. 계획 승인과 코드/운영 배포 승인은 별개다. 대체 시 새 ID와 사유를 연결하고 기존 Accepted 원문을 덮어쓰지 않는다.


## 후속 소비 보강

실제 다사용자 동시 편집·보기와 presence/cursor를 포함한다. ephemeral awareness에도 서버 actor·읽기 권한을 적용하고 초기 subscribe·재연결·권한 철회·문서 전환 때 재인가/제거한다. 같은 owner 멀티탭 동기화는 별도 기존 범위다. [상세 수용](../../0.Plans/2.Patch-phase/contracts/SHARING.md)과 [표시 계약](../product/PROD-NF-009-collaboration-presence.md)을 함께 승인한다.
