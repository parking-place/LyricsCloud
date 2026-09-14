# UX P5 → 1.1.5 구현 인계

## 시작 조건

1. 최신 main에서 Agent.md, 실행 STATUS, 1.1.5 P1~현재 Phase를 다시 읽는다.
2. 승인 manifest의 P4 merge와 new_Mock-up tree를 대조한다.
3. 실제 앱 component/test 경로와 변경 담당을 P1에 고정한다.
4. API·DB·route·Yjs protocol·draft key·권한을 바꾸지 않는 UI-only 전환임을 실패 입력표로 만든다.

## Phase별 소비

| 단계 | 변경 묶음 | 유지할 계약 | 우선 검증 |
|---|---|---|---|
| 1.1.5 P1 | 최신 component/route/test 조사·실패 입력·담당 | 현행 URL/API/DB/capability | deep link, 저장 중 navigation, rollback |
| 1.1.5 P2 | semantic token·공통 surface·feature flag 기반 | build metadata·server state 그대로 | 양 theme, portal 상속, old/new flag |
| 1.1.5 P3 | primary navigation·목록/grid·dashboard | filter/rank/view preference·focus | PC/mobile/320/200%, empty/error/loading |
| 1.1.5 P4 | 실제 DB/browser 실패·권한·복구 | owner/account draft·outbox·IME·selection/undo | offline/reconnect, 계정 전환, 서비스 재시작 |
| 1.1.5 P5 | 문서·CI·동일 SHA 개발 인수 | release 정책·정확 SHA | P0/P1 0 판정 뒤만 release go/no-go |

editor 외곽과 공유 상세 화면은 1.1.6 담당 범위를 침범하지 않는다. 1.1.5에서 필요한 navigation 연결 때문에 editor를 감싸더라도 CodeMirror/Yjs instance key를 바꾸거나 재마운트하지 않는다.

## feature flag와 rollback

ux_b1_tokens → ux_b1_shell → ux_b1_workspace 순으로 켠다. 1.1.5 범위에서 editor/sharing flag는 준비만 하고 활성화하지 않는다. deep link/back/focus, 저장 상태, view preference, 권한 표시 중 하나라도 달라지면 해당 flag만 끄고 기존 UI를 복귀시킨다.

두 UI는 같은 route/state/store/draft/outbox를 소비해야 한다. flag마다 다른 local key나 migration을 만들지 않는다. DB migration이 필요하다는 결론이 나오면 UI-only 계약 위반이므로 P1에서 중단하고 별도 결정을 요청한다.

## visual baseline

- desktop: Windows 1440 light의 곡 목록·작업공간, macOS 1440 dark의 라임 목록.
- mobile: iOS 390 light 곡 작업공간, Android 390 dark 곡 목록.
- 경계: iOS/Android 320 양 theme와 200% reflow 대리 조건.
- 상태: 목록 normal/loading/empty/error/offline, navigation current/focus, theme 전환.

prototype screenshot pixel 일치를 성공 기준으로 삼지 않는다. 정보 위계·토큰·행동 수·state 문구·focus/reflow를 비교하고 platform font rendering 차이를 허용한다.

## 중단 조건

- editor remount, IME/selection/undo/초안 유실 또는 저장 성공 오표시
- old deep link·filter·returnTo·최근 cursor 손실
- owner/actor/capability 표시 또는 account local storage 격리 변화
- 320px horizontal overflow, keyboard unreachable, 양 theme portal 누락
- P0/P1을 flag off로 숨기거나 실기기 미실행을 PASS로 기록하려는 경우

P5는 제품 버전 없는 설계 인계다. 제품 VERSION·Docker tag·개발/릴리스 서버는 바꾸지 않았고 1.1.5는 자체 다섯 Phase·CI·동일 SHA 개발 인수 뒤 별도 release 절차를 따른다.
