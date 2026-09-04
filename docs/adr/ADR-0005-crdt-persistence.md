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
