# ADR-0005 — CRDT transport, 영속화와 평문 projection

- 상태: Accepted
- 승인자·일시: 사용자, 2026-09-04
- 결정 Phase: 0.0.0 Phase 2
- 입력: DEC-03-A, DEC-04-A, DEC-06-C, DEC-07-A

## 대안

1. Yjs + CodeMirror binding + 전용 WebSocket protocol: 검증된 editor binding과 update API가 있다.
2. Automerge: 문서 모델은 강하지만 현재 CodeMirror 직접 결합과 서버 생태계가 더 작다.
3. 자체 OT 또는 마지막 저장 우선: 구현 위험이 높거나 DEC-06-C를 충족하지 못한다.

## 권고 결정

Yjs `Y.Doc`/`Y.Text`와 `y-codemirror.next`를 사용한다. collaboration 서비스는 인증된 WebSocket endpoint와 awareness를 제공하되 awareness는 영속화하지 않는다. raw update는 순서와 중복에 안전하게 PostgreSQL에 append하고 정기 compact snapshot을 만든다.

서버가 적용한 문서 상태에서 UTF-8 평문 projection을 생성해 같은 transaction/outbox 경계로 검색 테이블에 반영한다. 검색 projection 지연은 상태로 노출하며 CRDT 원본을 덮어쓰지 않는다. revision은 CRDT update log가 아니라 사용자 복구용 immutable snapshot이다.

## 검증·보안·철회

- 한글 IME, 두 탭 동시 입력, 오프라인 재연결, duplicate/out-of-order update, server restart 후 수렴을 시험한다.
- update 크기·속도 제한, owner 확인, 최대 문서 크기와 compaction budget을 둔다.
- Yjs 교체 전 평문과 portable snapshot을 export하고 adapter contract test를 통과해야 한다.

## 2026-09-06 구현 대조

현행 구현은 Yjs와 CodeMirror의 transaction adapter를 직접 연결하며 `y-codemirror.next`를 설치하지 않는다. Phase 5는 기존 adapter의 한글 조합·같은 owner 병합·복구 계약을 검증하고 유지한다. 초기 권고의 binding 패키지 서술과 실제 구현을 구분한 기록이며 새 라이브러리 교체 승인을 뜻하지 않는다. awareness/presence도 현재 프로토콜에 없고 같은 owner의 본문 동기화만 제공한다. [실제 인터페이스와 인수 경계](../architecture/0.3.1-SYNC-ADAPTER-HANDOFF.md)를 따른다.
