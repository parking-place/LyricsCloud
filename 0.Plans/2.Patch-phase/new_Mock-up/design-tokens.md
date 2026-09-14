# B-1 디자인 토큰

## 구조

- `canvas → panel → surface → surface-raised`의 네 단계 불투명 표면만 사용한다.
- desktop은 220px primary rail 하나, mobile은 5개 bottom navigation 하나로 중복 navigation을 제거한다.
- editor는 본문과 320px 자료 panel을 나란히 두고 mobile에서 자료 panel을 별도 진입으로 접는다.
- radius는 control 8px, compact 12px, panel 16px로 제한한다.

## 의미 토큰

| 의미 | Light | Dark | 사용 |
|---|---|---|---|
| canvas | `#f4f7f9` | `#080b0f` | 페이지 배경 |
| panel | `#ffffff` | `#11161d` | 주요 작업 표면 |
| ink | `#17212b` | `#f5f8fa` | 본문 |
| muted | `#526170` | `#9ba8b7` | 보조 문구 |
| accent | `#426800` | `#c8ff3d` | 선택·주요 동작 |
| danger | `#982d24` | `#ff9f91` | 철회·삭제·실패 |
| warning | `#825400` | `#ffd06a` | offline·미전송·IME |
| focus | `#365eea` | `#9bb7ff` | 3px focus ring |

색은 보조 수단이다. 저장·미전송·권한·오류는 chip만 두지 않고 항상 제목과 복구 문장을 제공한다. reduced-motion에서는 animation을 제거하고 forced-colors에서는 control/panel 경계를 시스템 색으로 복원한다. glass, blur, distortion, 새 motion 의존성은 선택안에 포함하지 않는다.

## 타이포·입력

UI는 `Inter, Pretendard, Noto Sans KR, system-ui` fallback을 사용하고 편집 preview는 `LyricsCloud Noto Sans KR, ui-monospace, monospace` 순서다. P3는 font binary를 추가하지 않는다. 글꼴 설정 화면에서 한글·English·日本語 glyph를 함께 보여주며, 실제 지원/라이선스는 1.0.14 인수 기록을 소비한다.

control 최소 높이는 40px이고, mobile 주요 navigation은 64px+safe-area다. P4에서 실제 44×44 CSS pixel target 여부와 200% 확대/reflow를 별도 측정한다.
