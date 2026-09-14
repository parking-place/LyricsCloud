# UX P2 정보 구조·morphism 비교 — 1.1.5 선택 전

## 선택 축

사용자는 정보 구조와 표현 방식을 각각 하나씩 선택한다.

### 정보 구조

| 안 | 유지/변경 | 장점 | 비용·위험 | 권고 |
|---|---|---|---|---|
| A 보수적 shell | 기존 rail·상단 tab·mobile bottom nav를 유지하고 중복·밀도만 줄임 | 이행/회귀 비용이 가장 낮고 익숙한 위치 보존 | destination 중복과 dashboard 왕복이 일부 남음 | 빠른 안정화가 최우선일 때 |
| B 통합 workspace | viewport별 primary nav 하나, editor+자료 context panel, mobile 핵심 3행동+More | 현재 작업·저장 상태·자료를 한 화면에 연결, mobile dock 붕괴 해소 | shell/route transition 회귀 범위가 더 큼 | **권고**. feature flag와 editor 비재마운트 계약 필수 |

### 표현 방식

| 번호 | 방식 | 특징 | 장점 | 위험/비용 | 권고 |
|---:|---|---|---|---|---|
| 1 | Flat-depth | 불투명 semantic surface, 선·간격·4단계 elevation | 가장 읽기 쉽고 빠르며 Windows/Android/WebKit 편차가 작음 | 시각적 새로움은 절제됨 | **기본 권고** |
| 2 | Glass | header/panel에만 고정 blur와 반투명 material | 브랜드의 미래감과 문맥 유지 균형 | backdrop 조합별 대비·GPU 검사 필요 | 선택 가능, 불투명 fallback 필수 |
| 3 | Neumorphism | surface와 동색의 양방향 shadow | 차분하고 촉각적인 인상 | 경계·focus·disabled 구분이 약하고 dark에서 탁해짐 | 핵심 작업 UI에는 비권고 |
| 4 | Clay | 두꺼운 radius·돌출 surface·명확한 색 블록 | 친근하고 touch target이 커 보임 | 가사 도구의 전문적/dense 성격과 충돌, 긴 화면 증가 | 로그인/empty 보조 표현에 한정 |
| 5 | Liquid Glass | control/navigation만 동적 translucent material, saturation/refraction 강조 | 가장 독특하고 Apple 최신 디자인 언어와 가까움 | 웹 브라우저별 SVG/background sampling 차이, 대비·저사양 GPU·motion 비용 최고 | 선택 시 **control layer에만 제한** |

## 공통 정보 구조 계약

- PC: 좌측 primary rail 하나 + 현재 자료 breadcrumb/save state + 가사 본문 + 필요할 때만 보이는 context panel.
- mobile: 곡/라임/프롬프트/검색/더보기 5개 primary nav, editor dock은 `구조`, `라임`, `프롬프트`, `더보기` 최대 4개.
- `버전`, `표시`, `공유`, `복제`, `삭제`는 More 안에서 기능별 group으로 나누고 destructive action은 마지막 별도 group.
- sidebar/panel/theme/effect 전환은 CodeMirror/Yjs instance를 재마운트하지 않는다.
- 저장/동기화 상태는 `서버에 저장됨 · 대기 0건`, `오프라인 · 이 기기에 보관 중`, `권한 종료 · 원문 복구 가능`처럼 색+icon+문장을 함께 쓴다.
- modal/sheet를 닫으면 호출 control로 focus를 되돌리고, 중첩 modal은 금지하며 confirmation은 같은 surface 안의 단계 전환으로 표시한다.

## 토큰 초안

| 범주 | 계약 |
|---|---|
| 색 | `canvas`, `panel`, `surface`, `surface-raised`, `ink`, `muted`, `line`, `accent`, `danger`, `focus`; light/dark 각 실제 contrast 검증 |
| 간격 | 4/8/12/16/24/32px, dense control은 최소 36px 높이, 일반 touch control은 44px 목표 |
| 타이포 | 12 status, 14 body/control, 16 section, 20 screen title, editor는 사용자 설정 유지 |
| radius | 8 control, 12 compact surface, 16 panel, 999 status pill; 선택 morphism은 시각 반경만 조절 |
| elevation | `base`, `raised`, `overlay`, `modal` 4단계; shadow만으로 state를 전달하지 않음 |
| focus | 3px solid focus + 3px offset을 기본으로 하되 움직이는/유리 배경에서도 3:1 변화와 인접 대비 유지 |
| motion | 120–180ms opacity/transform만 기본, navigation/content 재배치는 220ms 이내; reduced-motion은 즉시 전환 |
| transparency | reduced-transparency 지원 브라우저는 불투명 surface, 미지원 브라우저도 앱 설정/성능 gate로 강제 불투명 가능 |

## 접근성 판정선

- WCAG 2.2 AA를 제품 gate로 유지한다. 320 CSS px reflow, 24×24 CSS px 최소 pointer target을 하한으로 삼고 주요 mobile action은 44px를 목표로 한다.
- glass/liquid의 움직이는 배경 위 focus는 2색 outline이나 불투명 focus backplate로 안정시킨다.
- 현재 자동 Axe/keyboard/200% 검사를 유지하되 실제 NVDA/VoiceOver/TalkBack과 iOS/Android keyboard/safe-area는 P4의 별도 미실행/실행 증거로 기록한다.
- 효과 fallback은 정보·입력·focus·원문·저장 상태를 바꾸면 안 된다.

## Liquid Glass 조사

- Apple HIG는 Liquid Glass를 content가 아니라 control/navigation의 별도 기능 layer에 제한하고, custom control에는 절제해 사용하라고 안내한다. 텍스트가 많거나 대비가 필요한 sidebar/popover는 regular 계열을 권고한다.
- 웹의 `backdrop-filter`는 background sampling·stacking context와 결합되며, SVG `feDisplacementMap`은 browser별 조합 차이가 있어 필수 정보나 hit target을 distortion 결과에 의존시키지 않는다.
- 사용자 참고용 public CodePen은 현재 CodePen 정책상 MIT이지만, 실제 채택 시 각 Pen의 public 상태·author·license를 manifest에 고정하고 attribution/copyright notice를 보존한다. private Pen은 묵시적 license가 없다.
- GSAP 표준 license는 현재 일반 commercial use와 기존 유료 plugin을 무상 허용하지만, 법적 조건은 채택 시점의 공식 license를 다시 고정한다. 이번 비교 목업은 GSAP 없이 CSS만 사용한다.
- 구현 단계의 우선 순위는 CSS-only opacity/blur/shadow → 지원되는 경우 선택적 SVG distortion → 정말 필요한 interaction에만 animation library다. 모든 단계에 opaque/no-distortion/no-motion fallback을 둔다.

## 1차 기술 판정

- 외부 디자인/Figma 계정 연결: 불필요. repository-native HTML/CSS 정적 비교와 Playwright 캡처로 충분하다.
- Context7: 설치 불필요. W3C/Apple/MDN/GSAP/CodePen 공식 문서를 직접 고정한다.
- 신규 runtime dependency: P2에서는 없음. Liquid 선택 시에도 P3 mockup은 CSS/vanilla JS 우선이며 실제 1.1.5 P1에서 별도 승인한다.
- 비교 구현: [P2 interactive concept](./prototypes/p2-concept-comparison.html)에서 두 shell×다섯 morphism×light/dark×PC/mobile을 동일 합성 가사로 검토한다. 보호된 기존 Mock-up과 P3 `new_Mock-up`을 수정하지 않는 별도 P2 비교 산출물이다.

## 출처

- Apple HIG Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple Liquid Glass overview: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- W3C WCAG 2.2 Focus Appearance: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- W3C WCAG 2.2 Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C WCAG 2.2 Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- W3C Filter Effects 1: https://www.w3.org/TR/filter-effects-1/
- MDN backdrop-filter: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
- MDN prefers-reduced-transparency: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency
- GSAP Standard License: https://gsap.com/community/standard-license/
- CodePen licensing: https://blog.codepen.io/docs/pens/licensing/
- CodePen Liquid Glass collection: https://codepen.io/spark/453


## 사용자 선택 기록

- 상태: **선택 완료**
- 승인 시각: 2026-09-14, 사용자 응답 ``1.1.14까지 달렷``을 직전 질문의 권고안 `B-1` 승인과 실행 범위 확대로 기록했다.
- 정보 구조: `B` 통합 workspace.
- 표현 방식: `1` Flat-depth.
- 기능 계약: 기존 기능을 삭제하지 않고 viewport별 primary navigation 하나, mobile editor 핵심 4행동 이하, 나머지 기능별 More group으로 재배치한다. CodeMirror/Yjs·IME·selection·undo·미전송 초안·권한/복구 의미를 보존한다.
- 범위: P3~P5 설계 인수 뒤 1.1.5부터 1.1.14까지 계획된 Phase를 순서대로 진행한다. P5 최종 디자인 승인과 각 버전의 조건부 기술·실기기·서명 gate는 실제 증거 없이 PASS로 간주하지 않는다.
