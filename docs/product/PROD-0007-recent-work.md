# PROD-0007 — 최근 작업과 마지막 편집 위치

- 상태: Accepted
- 결정 Phase: 0.7.0 Phase 3
- 승인 근거: 사용자의 1.0.0까지 단계별 진행 지시, 2026-09-07

## 해결할 질문

최근 수정과 단순 열람을 어떻게 구분·정렬하고, 가사 본문이 바뀌거나 다른 크기의 기기에서 다시 열릴 때 마지막 cursor·송폼·scroll 중 무엇을 우선 복원할지 확정한다.

## 검토한 대안

- `resources.updated_at`만 사용한다. 수정 이력은 정확하지만 단순히 열어 본 작업과 마지막 편집 위치를 표현하지 못한다.
- 모든 열람·cursor 이동을 이벤트로 누적한다. 상세 분석은 가능하지만 개인 창작 행동 로그가 불필요하게 쌓이고 쓰기·보관 비용이 커진다.
- owner·resource당 최근 상태 한 행만 유지하고 수정 시각과 열람 시각을 분리한다.

## 선택과 이유

- 최근 작업은 active 곡·가사·라임 노트·프롬프트를 대상으로 한다. 활동 시각은 `max(updated_at, last_opened_at)`이고 동률은 자료 유형과 ID로 안정 정렬한다.
- 화면은 활동 시각과 함께 `최근 수정` 또는 `최근 열람`을 명시해 단순 열람이 자료 수정으로 보이지 않게 한다. 열람은 `resources.updated_at`이나 `row_version`을 변경하지 않는다.
- 별도 행동 이력은 남기지 않고 owner·resource당 `recent_items` 한 행만 upsert한다. soft delete 자료, 삭제된 부모 곡의 가사, 다른 owner 자료는 목록과 복원에서 제외한다.
- 가사 위치는 cursor offset, 송폼 label·동일 label의 occurrence, editor scroll offset, 저장 viewport 종류만 보관한다. 제목·본문·메모나 주변 문자열은 위치 행과 로그에 넣지 않는다.
- 같은 viewport 종류에서는 유효 범위로 clamp한 cursor와 scroll을 우선 복원한다. 모바일과 PC처럼 viewport 종류가 달라졌거나 본문이 바뀐 경우에는 label+occurrence가 일치하는 송폼 시작을 우선하고, 없으면 clamp한 cursor로 대체한다.
- 검색 `find` 딥링크처럼 사용자가 이번 탐색에서 명시한 위치는 저장 위치보다 우선한다.
- cursor·송폼·scroll 변화는 client에서 2초 debounce, 연속 변화 중 최대 15초 간격으로 병합하고 page hide·화면 전환 때 마지막 상태를 flush한다. 한 문서의 저장은 직렬화하며 실패가 편집·자동 저장을 막지 않는다.
- 곡 카드는 작업 메모 존재 여부, 가사 카드는 가사 메모 존재 여부만 표시하고 원문을 최근 작업 응답에 포함하지 않는다. 가사는 소속 곡을 표시하며 라임·프롬프트는 활성 연결 곡이 있으면 대표 곡과 추가 연결 수를 표시한다.

## 영향과 검증

- 영향 작업: `LC-070-P3-01`~`LC-070-P3-09`, `recent_items`, 최근 작업 API/UI, 가사 CodeMirror 위치 adapter.
- 열람 전후 `resources.updated_at` 불변, owner RLS·soft delete·부모 삭제 제외, 100회 빠른 위치 변화의 병합 횟수, 본문 단축 clamp, viewport 교차 송폼 복원을 검증한다.
- 최근 작업 응답·오류·성능 기록에 본문·메모가 포함되지 않는지 계약 테스트와 secret/artifact 검사에서 확인한다.

## 되돌림 비용

정렬 의미를 바꾸면 최근 화면 query와 사용자 기대가 함께 바뀌므로 새 제품 결정을 기록한다. 이벤트 분석이 필요해져도 현재 한 행 상태를 행동 로그로 소급 해석하지 않고 별도 동의·보존 정책과 schema를 둔다.

관련 결정: [PROD-0003](./PROD-0003-songform.md), [PROD-0004](./PROD-0004-lyric-versions.md), [ADR-0003](../adr/ADR-0003-database-access.md), [ADR-0009](../adr/ADR-0009-observability.md)
