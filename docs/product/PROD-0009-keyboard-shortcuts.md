# PROD-0009 — 키보드 단축키와 실행 문맥

- 상태: Accepted
- 결정 Phase: 0.8.0 Phase 3
- 승인 근거: 사용자의 1.0.0까지 단계별 진행 지시, 2026-09-07

## 해결할 질문

핵심 명령의 기본 키, Windows/Linux와 macOS 표기, 실행 가능한 화면, 브라우저·텍스트 편집·한글 IME 충돌 회피와 실행 뒤 초점·초안 보존 기준을 확정한다.

## 검토한 대안

- `Ctrl/Command+S`·`Ctrl/Command+F` 같은 익숙한 브라우저 키를 재사용한다. 기억하기 쉽지만 저장·찾기·탭·주소창 기본 동작을 가로챈다.
- 단일 문자 또는 `Alt`만 사용한다. 입력 중 오작동과 Windows의 AltGr·국제 입력 충돌 위험이 크다.
- 전역 이동은 `Ctrl/Command+Alt`, 편집기 명령은 기존 `Alt/Option+Shift` 조합을 사용하고 실행 문맥을 제한한다.

## 선택과 명령 표

| 명령 | Windows/Linux | macOS | 실행 문맥 | 화면 대안 |
|---|---|---|---|---|
| 새 가사 | `Ctrl+Alt+N` | `Command+Option+N` | 로그인한 화면, 입력·modal 밖 | 빠른 추가 → 새 가사 |
| 통합 검색 | `Ctrl+Alt+K` | `Command+Option+K` | 로그인한 화면, 입력·modal 밖 | 주 메뉴의 통합 검색 |
| 단축키 도움말 | `Ctrl+Alt+/` | `Command+Option+/` | 로그인한 화면, 입력·modal 밖 | 상단 도움말 버튼·설정의 키보드 영역 |
| 가사 전체 복사 | `Alt+Shift+C` | `Option+Shift+C` | 가사 편집기 | 전체 복사 버튼 |
| 집중 모드 전환 | `Alt+Shift+F` | `Option+Shift+F` | 가사 편집기 | 집중 모드 버튼 |
| 자료 패널 열기·닫기 | `Alt+Shift+P` | `Option+Shift+P` | 가사 편집기 | 자료 패널 버튼 |
| 이전 가사 | `Alt+Shift+[` | `Option+Shift+[` | 같은 곡의 가사 편집기 | 이전 가사 버튼 |
| 다음 가사 | `Alt+Shift+]` | `Option+Shift+]` | 같은 곡의 가사 편집기 | 다음 가사 버튼 |

## 충돌·보존 정책

- `Ctrl/Command+S`·`F`·`L`·`T`·`W`, Tab과 단독 방향키는 등록하지 않고 브라우저·텍스트 편집기에 맡긴다.
- 전역 이동 단축키는 `input`·`textarea`·`select`·contenteditable·CodeMirror와 열린 modal 안에서 실행하지 않는다. 가사 편집기 명령만 해당 편집기 문맥에서 허용한다.
- `compositionstart`부터 `compositionend`까지와 `KeyboardEvent.isComposing`이 참인 동안 모든 앱 단축키를 억제한다. `defaultPrevented` 이벤트도 다시 처리하지 않는다.
- 가사 전환·새 가사·검색 이동 전에는 제목 metadata, CRDT 본문, 최근 위치를 flush하고 `leave` checkpoint를 만든다. 실패하면 현재 화면과 초안을 유지하고 이유를 알린다.
- 집중 모드와 자료 패널 전환 뒤에는 기존 CodeMirror 문서·selection·scroll을 변경하지 않고 편집기로 초점을 돌린다.
- 전체 복사는 기존 순수 텍스트 복사와 선택 가능한 수동 복사 dialog를 그대로 사용한다.
- 도움말은 registry에서 생성하며 키와 설명으로 검색할 수 있다. Escape·닫기 버튼·초점 trap을 제공하고 닫으면 열었던 요소로 초점을 복원한다.

## 영향과 검증

- 영향 작업: `LC-080-P3-01`~`LC-080-P3-08`, 공통 명령 registry, `WorkspaceShell`, 설정 화면, 가사 편집기와 PC 중심 E2E.
- registry의 모든 항목·표기·실제 handler 문맥을 자동 대조하고, IME 조합 억제, 기본키 비가로채기, 전체 복사 실패 대안, 패널·집중 모드 selection/scroll, 미전송 초안의 이전·다음 이동을 검증한다.

## 되돌림 비용

기본 키를 바꾸면 registry·도움말·`aria-keyshortcuts`·E2E를 함께 변경한다. 사용자별 키 재지정이나 운영체제 전역 등록은 별도 제품·보안 결정 없이는 추가하지 않는다.

관련 결정: [PROD-0004](./PROD-0004-lyric-versions.md), [PROD-0005](./PROD-0005-quick-add.md), [PROD-0007](./PROD-0007-recent-work.md), [ADR-0004](../adr/ADR-0004-collaboration-scope.md)
