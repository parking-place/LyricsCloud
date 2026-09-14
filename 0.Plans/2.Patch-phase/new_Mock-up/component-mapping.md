# B-1 제품 컴포넌트 전환 매핑

이 문서는 UI 위치와 표현의 전환 초안이다. API·DB schema·route·권한·Yjs protocol을 새로 정의하지 않는다.

| B-1 영역 | 현행 소비 대상 | 반드시 유지할 state/API | 구현 중단 조건 |
|---|---|---|---|
| Primary rail/mobile nav | 현행 route/navigation shell | URL·back/forward·focus 복귀 | route 또는 deep link 변경 필요 |
| Song cards/view selector | 곡 list/grid와 view preference | rank·view mode·pending/error | 저장된 보기 선택 유실 |
| Song workspace | song dashboard, link card, memo | owner 검사·Suno 수동 link·memo 격리 | 자료 간 권한 혼합 |
| Editor shell | CodeMirror 6 + Yjs + draft/outbox | selection·undo·IME·owner/document key·projection | editor remount 또는 원문 유실 |
| Context panel | 라임/프롬프트/다른 가사 | current cursor insertion·copy payload | insertion 위치/원문 변경 |
| Save strip/recovery | durable save + local draft + outbox | bounded/drained queue·재진입·계정 격리 | 저장 성공 오표시·교차 계정 노출 |
| Rhyme/prompt cards | 기존 세 크기 grid·pin/favorite/rank | raw span·mode·copy·reorder conflict | 표시가 원문을 변형 |
| Dictionary tooltip | 1.0.13 provider no-go | 미연결 명시·원문 복사만 | 실제 정의처럼 표시/외부 전송 |
| Sharing surfaces | 1.1.0~1.1.4 ACL/capability/presence | owner/actor/grant·read/write·revoke·guest 경계 | ACL 우회·private memo 노출 |
| Theme/font settings | 기존 preference와 1.0.14 font | light/dark·glyph/fallback·OFL 출처 | 저장 preference 또는 fallback 손상 |

## 단계적 적용 원칙

1. 새 token과 공통 surface를 기존 컴포넌트 외곽부터 적용한다.
2. navigation을 하나로 합치되 route와 keyboard 순서를 먼저 회귀한다.
3. 목록·dashboard를 옮긴 뒤 각 빈/오류/offline 상태를 확인한다.
4. editor는 마지막에 외곽만 바꾸고 CodeMirror/Yjs instance를 재생성하지 않는다.
5. 공유 read/write는 capability 결과를 그대로 소비하며 client 표시로 권한을 추측하지 않는다.
6. 매 단계에서 old UI fallback과 rollback 지점을 유지하고, P5 승인 뒤 1.1.5/1.1.6 Phase별로 나눠 적용한다.

실제 component/file 이름은 1.1.5 P1에서 최신 main을 다시 조사해 고정한다. 이 P3 prototype의 HTML 문자열을 제품 DOM으로 복사하지 않는다.
