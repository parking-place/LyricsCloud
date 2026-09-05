# 0.3.0 Phase 2 — CodeMirror 순수 텍스트 편집 기반

- 상태: **완료**
- 버전 상태: [../STATUS.md](../STATUS.md)

## 목표

CodeMirror 6을 순수 텍스트 가사 편집기로 연결하고, PC와 모바일에서 제목·본문 입력, 한글 IME, 선택·붙여넣기·실행 취소, 단일 편집 세션의 현재본 저장을 안정적으로 제공한다.

## 선행조건

- 0.3.0 Phase 1의 가사 CRUD와 현재본 저장 계약이 동작해야 한다.
- DEC-03-A와 편집기 관련 ADR이 Accepted 상태여야 한다.
- 0.3.1 전까지 같은 문서의 다중 장치 편집을 완료 기능으로 노출하지 않는다.

## 기준 문서

- [기능 기획](../../Sketch.md)
- [기술 선택과 결정 기록](../../Implementation-Stack.md)
- [가사 편집 화면 설명](../../Mock-up/05-lyrics-editor/README.md)
- [개발 버전 상태](../STATUS.md)

## 포함 범위

- CodeMirror 6 view와 React 생명주기 어댑터
- DB body와 editor document 사이의 순수 텍스트 왕복
- 가사 제목과 본문 기본 편집
- 한글 IME composition, 붙여넣기, 선택, undo·redo
- PC 중앙 편집 영역과 모바일 화면 중심 편집 영역
- composition 종료 후 직렬화된 현재본 저장
- 변경 있음, 저장 중, 저장됨, 저장 실패 상태
- 새로 열기·route 이동 때 editor 정리와 focus 복원

## 제외 범위

- CRDT 문서, awareness, 웹소켓 동기화
- 수정 기록·복원·버전 비교
- IndexedDB 오프라인 재전송 큐
- 송폼 decoration과 탐색
- 라임·프롬프트 우측 패널
- 사용자 글쓰기 표시 설정

## 작업 체크리스트

- [x] LC-030-P2-01 — CodeMirror 인스턴스를 route별 lyric ID와 연결하고 unmount 때 listener와 view를 해제한다.
- [x] LC-030-P2-02 — editor state의 document 문자열만 저장하며 DOM, decoration, selection을 body에 포함하지 않는다.
- [x] LC-030-P2-03 — initial body를 한 번 주입하고 데이터 재조회가 사용자의 미저장 입력을 덮지 않게 한다.
- [x] LC-030-P2-04 — compositionstart부터 compositionend까지 한글 조합 중간 상태로 서버 저장을 확정하지 않는다.
- [x] LC-030-P2-05 — 붙여넣기에서 서식 HTML을 버리고 줄바꿈을 포함한 plain text만 삽입한다.
- [x] LC-030-P2-06 — undo·redo가 서버 재조회나 제목 입력 때문에 초기화되지 않도록 editor transaction 경계를 분리한다.
- [x] LC-030-P2-07 — 마지막 확정 입력 후 짧은 지연으로 현재본 저장을 요청하고 같은 문서 요청을 순서대로 처리한다.
- [x] LC-030-P2-08 — 저장 응답이 해당 요청 이후 추가 변경까지 저장된 것처럼 상태를 표시하지 않게 sequence를 비교한다.
- [x] LC-030-P2-09 — PC에서는 읽기 좋은 최대 행 폭을, 모바일에서는 100dvh와 safe-area를 적용해 본문을 우선 표시한다.
- [x] LC-030-P2-10 — 저장 실패 시 현재 editor 내용을 유지하고 명시적 재시도 행동을 제공한다.

## 검증 방법

- 한글 자모 조합, 빠른 영한 전환, 이모지, 여러 줄 붙여넣기 후 저장·재열기를 확인한다.
- 느린 응답 두 개의 완료 순서를 뒤집어 최신 입력만 저장됨 상태가 되는지 확인한다.
- 같은 lyric route를 반복 이동하며 editor instance와 event listener가 누적되지 않는지 측정한다.
- 10만 자 fixture에서 입력 지연, 스크롤, 선택, 메모리 사용을 확인한다.
- 1440px PC와 390×844 모바일에서 가상 키보드가 제목·저장 상태·현재 줄을 가리지 않는지 확인한다.
- HTML을 붙여넣고 재조회해 태그가 실행되지 않고 텍스트 또는 제거된 서식으로 남는지 확인한다.

## 완료 조건

- [x] CodeMirror와 DB 사이에 순수 텍스트만 왕복한다.
- [x] PC·모바일 기본 편집 화면이 같은 Phase에서 동작한다.
- [x] 한글 IME, 붙여넣기, undo·redo에서 본문 손실이 없다.
- [x] 단일 세션 저장 요청이 직렬화되고 상태가 정확하다.
- [x] 실패 후 입력이 보존되고 재시도할 수 있다.
- [x] CRDT·수정 기록을 완료 기능처럼 표시하지 않는다.

## 산출물

- CodeMirror React 어댑터
- 기본 가사 편집 route의 PC·모바일 레이아웃
- 단일 세션 현재본 저장 controller
- 저장 상태 컴포넌트
- IME·붙여넣기·장문 테스트

## 다음 Phase 인계

Phase 3에 editor transaction 구독, 현재 document 문자열, visible range, scroll API, selection·cursor API와 장문 성능 기준을 전달한다. 송폼 parser는 editor 내부 DOM을 직접 수정하지 않는다.
