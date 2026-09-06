# PROD-0006 — 라임 선택과 열린 가사 삽입 대상

- 상태: Accepted
- 결정 Phase: 0.4.0 Phase 4
- 승인 근거: 사용자의 1.0.0까지 단계별 진행 지시, 2026-09-06

## 해결할 질문

라임 노트에서 선택한 표현을 어떤 가사 위치에 삽입할 수 있는지, source 선택이나 target cursor가 동시 편집으로 이동할 때 무엇을 전달하며 대상이 없거나 바뀌면 어떻게 실패할지 정한다.

## 선택과 이유

- 실제 삽입은 0.6.0의 통합 작업 화면에서 명시적으로 열려 있고 같은 owner로 검증된 가사 편집기만 대상으로 한다. 독립 라임 화면은 다른 탭이나 최근 가사를 추측하지 않는다.
- 요청은 클라이언트가 보낸 owner ID를 신뢰하지 않는다. 인증 session의 owner로 source 라임 resource, target 가사 resource와 두 sync document를 다시 확인한다.
- source 선택은 라임 resource ID·sync document key·anchor/head Yjs relative position으로 식별한다. payload의 순수 텍스트는 명령 시점 선택 내용의 immutable snapshot이다.
- target cursor는 가사 resource ID·sync document key·Yjs relative position으로 식별한다. 절대 문자 offset은 동시 편집 뒤 오래될 수 있으므로 계약에 넣지 않는다.
- request ID는 삽입 명령의 멱등 키다. 동일 요청 재시도는 한 번만 삽입하고, 같은 키의 다른 payload는 conflict다.
- target이 열려 있지 않으면 `no_open_target`, 삭제됐으면 `target_deleted`, resource/document/relative position이 달라졌거나 해석되지 않으면 `target_changed`로 구분한다. 세 경우 모두 가사를 변경하지 않고 동일한 선택 복사·수동 복사 대안을 제공한다.
- 빈 선택은 삽입·선택 복사를 실행하지 않고 먼저 본문 영역을 선택하라는 안내를 표시한다.

## 계약 형태

`RhymeInsertionRequest` version 1은 다음 정보만 가진다.

- `requestId`
- `source`: `resourceId`, `documentKey`, `anchorRelativePosition`, `headRelativePosition`
- `target`: `resourceId`, `documentKey`, `relativePosition`
- `text`: 줄바꿈을 LF로 정규화한 UTF-8 순수 텍스트 snapshot

상대 위치는 Yjs encoded relative position의 base64url 표현이며 최대 4,096자다. 본문 payload는 라임·가사 본문과 같은 100,000자 경계를 사용하고 HTML로 해석하지 않는다.

## 영향과 검증

- 0.4.0은 계약 parser, portable relative-position codec, 선택 복사와 target 없음 UI를 검증한다.
- 0.6.0은 실제 열린 가사 target의 lifecycle, owner/document 재검증, 멱등 삽입 transaction과 undo를 구현한다.
- 계약 테스트는 concurrent prefix 삽입 뒤 relative cursor가 같은 논리 위치로 이동하는지, malformed position·빈/초과 payload를 거부하는지 확인한다.

관련 결정: [ADR-0004](../adr/ADR-0004-collaboration-scope.md), [ADR-0005](../adr/ADR-0005-crdt-persistence.md), [PROD-0002](./PROD-0002-song-resource-links.md)
