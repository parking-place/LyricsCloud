# UX P4 B-1 사용성·접근성 검토

## 판정

B-1의 통합 workspace+Flat-depth 의미와 기능 보존 경계는 유지됐다. P4에서 mobile editor label과 320px 검색 field 두 가지 layout 문제를 수정했고, 선택을 다시 받아야 할 구조·morphism 변경은 없다. 실제 제품 구현 승인과 runtime 검증은 UX P5 및 1.1.5 이후 Phase에 남는다.

기준은 P3 merge 3ea75152266c93f1cc881b39e8b1f82094a1de25다. 합성 목업만 검토했으며 제품 앱·DB·서버를 실행하거나 변경하지 않았다.

## 같은 사용자 과제 비교

| 과제 | 1.1.4 현행 관찰 | B-1 결과 | 안전·복구 |
|---|---|---|---|
| 가입→첫 창작 | 최소 6단계, 다음 위치가 분산 | 단계 수를 거짓 축소하지 않고 작업공간 첫 칸에 가사 이어쓰기/새 가사를 고정 | code 실패 시 미소비·입력 보존 문장 유지 |
| 곡→가사 편집 | PC/mobile editor 고정 도구 9개 이상 | 고정 4개, 나머지는 더보기/context로 이동 | editor instance·selection·undo·IME·draft 유지가 구현 gate |
| 라임/프롬프트 삽입 | 독립 route와 editor panel 역할이 약함 | 오른쪽 작업 자료와 mobile 별도 진입으로 현재 가사 문맥 표시 | cursor 삽입 위치·exact copy 유지 |
| 최근 작업 재개 | rail/tab/mobile More 목적지 중복 | viewport별 primary navigation 하나 | 유효 owner/resource/cursor만 복귀 |
| 공유·회수 | 한 dialog에 설명과 역할이 누적 | 현재 범위→사람별 권한→회수/복구 순서 | private memo/연결 자료 비공개, rejected input 자동 replay 금지 |

## 자동 검토 행렬

- Playwright 1.62.1 Chromium에서 18화면×양 theme×11 viewport/platform 문맥 = 396페이지를 검사했다.
- viewport는 iOS/Android 각 320·360·390·768px, Windows/Linux/macOS 각 1440px이다. 320px reflow는 1280px 화면의 200% 확대 대리 조건으로 사용했으며 실제 OS zoom은 아니다.
- 144개 Axe 검사에서 serious/critical 0건, 72개 keyboard 순서/focus-visible 검사에서 문제 0건, 전 396페이지 horizontal overflow 0건이다.
- 보이는 조작 요소는 WCAG 2.2의 24×24 CSS pixel 최소를 충족했고 최종 최소 변은 26px이었다. 제품의 일반 button/input은 40px 높이 원칙을 유지하며 26px은 짧은 compact segmented control의 폭이다.
- reduced-motion+forced-colors 조합에서 skeleton animation none, system border 복원, media query 활성화를 확인했다. B-1은 backdrop-filter·SVG/CSS distortion·element filter를 쓰지 않아 reduced-transparency에서도 불투명 surface 의미를 유지한다.
- 공통 CSS+JS는 37,415 bytes, 최대 DOM 145 nodes, 외부 요청 0건이었다. 로컬 headless p95 42ms는 **저사양 실기기 성능이 아닌 정적 prototype 대리 측정**이다.

## 집중 검토

- 중복 navigation은 viewport별 하나로 줄었고, 숨겨진 rail/mobile nav는 focus 순서에서 제외된다.
- mobile editor는 4개 고정 행동을 유지하면서 한 줄 label로 수정했다. PC context panel과 mobile 별도 진입의 제품 focus 복귀는 [interaction 계약](../../0.Plans/2.Patch-phase/new_Mock-up/interaction-contract.md)을 따른다.
- portal/theme/sheet/keyboard는 정적 HTML이 실제 동작을 제공하지 않으므로 PASS로 꾸미지 않았다. focus trap·Escape·trigger 복귀·visual viewport/safe-area·theme 상속을 구현 수용 기준으로만 고정했다.
- 긴 글쓰기 본문은 mobile 420px 이상 편집 영역과 sticky tool dock을 유지한다. fixed bottom navigation만으로 본문·저장·복구 action을 가리지 않는지 실제 visual viewport에서 다시 확인해야 한다.

## 변경·삭제·노출 위험

- 기능 삭제: 없음. 9개 고정 도구 중 5개는 삭제가 아니라 더보기/context로 이동한다.
- 원문/데이터 변경: 없음. 모든 표시 자료는 합성이고 저장/OAuth/ACL/사전 요청은 없다.
- 권한 위험: sharing UI가 capability를 추측하면 안 되며 서버 결과만 소비한다.
- 동선 위험: 새 navigation을 한 번에 교체하면 deep link/focus 회귀가 날 수 있어 feature flag와 화면 묶음별 rollout이 필요하다.

## 구현 비용·feature flag·rollback

1. ux_b1_tokens: semantic token과 opaque surface만 적용, 기존 layout 즉시 rollback 가능.
2. ux_b1_shell: 한 primary navigation과 route focus 적용. deep link/back/keyboard 회귀 시 기존 shell로 되돌린다.
3. ux_b1_workspace: 목록·dashboard·상태 panel을 이동한다. API response/state는 그대로 둔다.
4. ux_b1_editor_shell: editor 바깥 panel/tool 위치만 변경하며 CodeMirror/Yjs instance key를 유지한다. remount/IME/undo/draft 손실이면 즉시 flag off.
5. ux_b1_sharing: capability 기반 read/write/recovery 표현만 전환한다. ACL·epoch·guest 경계 불일치면 즉시 flag off.

flag는 서버 capability나 DB schema를 바꾸지 않고 동일 component tree의 표현 선택에만 사용한다. 두 UI가 서로 다른 draft key/outbox를 만들면 전환을 중단한다.

## 미실행·남은 gate

NVDA·VoiceOver·TalkBack, 실제 Windows/macOS/Linux/iOS/Android, Microsoft IME·IBus/Fcitx·Apple 입력기·Gboard/Samsung Keyboard, 물리 touch/safe-area/keyboard, 실제 200% OS zoom, 저사양 GPU/배터리는 실행하지 않았다. P4 자동 결과를 이 항목의 PASS로 확대하지 않는다. native SDK·서명·스토어 조건은 각 1.1.8~1.1.14 계획에 남는다.
