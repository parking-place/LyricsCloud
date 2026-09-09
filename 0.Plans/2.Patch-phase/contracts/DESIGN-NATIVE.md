# 디자인 개편과 Windows·Linux·macOS·Android·iOS 개발안

상태: **Proposed — 미래 기술/디자인 제안**. 현재 라이브러리/플랫폼을 교체하거나 앱 개발을 시작하는 문서가 아니다.

## 1. 디자인 범위

1.0.1의 메인 로고/아이콘은 Beta 출시의 필수 마감이고, 제품 버전 없는 UX의 전면 디자인 연구와 별개다. 이후 디자인 개편은 1.0.1 승인 자산을 입력으로 사용한다. light/dark·단색·작은favicon·maskable safe area·접근성 이름·자산 출처와 권리를 확인한다. 현재 작업에서 실제 로고 이미지를 생성했다는 뜻은 아니다.

기존 `0.Plans/Mock-up/**`는 보호한다. 새 안은 `0.Plans/2.Patch-phase/new_Mock-up/`에 둔다. 화면별 README, light/dark PC/mobile 자산, 상태 행렬, navigation flow, prototype 여부와 실제 구현 매핑을 포함한다. 15개 원래 화면 외 beta signup, link cards, read/write share, permission revoked, code error, recovery 화면도 등록한다.

UX (`design/UX/`)은 관찰→약 5개 morphism 대안/토큰과 사용자 시안 선택→선택안 new_Mock-up→사용성/접근성→최종 승인이다. **앱 코드나 runtime VERSION을 바꾸지 않는다.** 1.1.5~1.1.6은 승인안의 점진 적용이다. 무관한 API/데이터 설계 교체를 디자인 리팩터링으로 끼워 넣지 않는다. UI element의 외형을 바꾸면서 editor remount·focus/undo·초안을 잃지 않게 한다.

[WCAG 2.2](https://www.w3.org/TR/WCAG22/)의 keyboard·focus·contrast·reflow 원칙을 적용하고 실제 평가 기준을 기록한다. 자동 도구 점수만으로 접근성 완료를 보장하지 않는다.

## 2. 필요한 도구

현재 이용 가능한 Figma/GitHub/Context7 등은 [도구 및 스킬 계획](../TOOLS-AND-SKILLS.md)에서 선택적으로 검토한다. 사용자 창작물을 외부 도구로 전송하지 않는다. OS IME 테스트에는 Windows/Linux/macOS/Android/iOS 실제 실행 환경이 필요하며 ChatGPT의 Python/격리 테스트로 대체하지 않는다. SDK·driver·서명 키·store 등록은 각 native Phase의 승인된 환경에서 준비한다.

## 3. Windows 후보

권장 후보는 WinUI 3 + Windows App SDK/.NET이며 Avalonia 또는 일부 WebView editor 재사용과 비교한다. WinUI 3는 Microsoft의 native Windows UI framework지만 그것만 선택한다고 기존 CodeMirror/Yjs가 자동 호환되지는 않는다. 한국어 IME·selection·undo·장문·screen reader와 CRDT binary protocol interop를 **먼저 spike**한다.

선택적 WebView 편집기로 웹 editor를 재사용하는 방식은 비용을 줄일 수 있으나 '모든 화면/편집기 완전 native'와 다르다. 사용자 승인을 받기 전 이를 native 요구의 자동 충족으로 삼지 않는다. 기술 결정은 [ADR-NF-004](../../../docs/adr/ADR-NF-004-windows-native.md)에 기록한다.

## 4. Android 후보

권장 후보는 Kotlin/Jetpack Compose다. Gboard/Samsung Keyboard, 회전·메모리 회수·백그라운드 제한·키보드 inset·font scale·TalkBack·태블릿을 고려한다. Windows와 domain/API/copy golden fixtures는 공유하되 UI lifecycle은 그대로 복사하지 않는다. 현행 Yjs protocol과 동등성을 증명할 수 없는 native 라이브러리를 임의 선택하지 않는다. [ADR-NF-005](../../../docs/adr/ADR-NF-005-android-native.md)에 옵션·공백·승인을 남긴다.

## 5. native 인증·저장·release

선택한 OAuth 흐름은 외부 브라우저/PKCE와 검증된 callback을 사용한다. Android Google 로그인은 공식 플랫폼 Credential Manager 방식과 외부 브라우저 대안을 비교하고 서버에서 검증된 identity를 받는 계약을 승인한다. 웹 client secret을 native binary에 넣지 않고 기존 web 세션 발급 API를 임의 공개하지 않는다. Windows는 승인된 loopback/OS callback, Android는 검증된 App Links 또는 승인된 redirect를 사용한다. callback origin/app identity/state/nonce를 확인한다. embedded WebView Google 로그인은 만들지 않는다.

토큰은 OS 보호 저장소·Keystore 등 승인된 경계에 저장한다. 로컬 초안은 owner/document-scoped crash-safe DB/outbox로 관리한다. offline queue는 멱등이고 권한 철회·탈퇴·서버 protocol 변경을 존중한다. 암호화 key 유실/OS profile 변경/앱 제거 시 복구 한계를 고지한다.

copy/projection 형식은 언어별 구현이 서로 달라지지 않도록 golden fixtures로 대조한다. 구버전 앱이 신버전 서버의 새 자료를 지우지 않도록 capabilities·최소 지원 protocol을 분리한다. 제품 major1 고정이 무제한 프로토콜 호환을 자동 보장하는 것은 아니다.

Windows installer/MSIX와 Android APK/AAB는 정확한 source SHA·platform build·서명·SBOM·업그레이드/rollback 증거를 갖는다. store/서명 인증서·key 보관과 비용/계정은 별도 승인한다. 앱 출시가 서버 release 채널을 임의 이동시키지 않는다.

공식 참고: [WinUI 3](https://learn.microsoft.com/en-us/windows/apps/winui/winui3/), [Jetpack Compose](https://developer.android.com/compose), [RFC 8252 native OAuth](https://www.rfc-editor.org/rfc/rfc8252.html). SDK 지원 버전·정책은 실제 착수 시 최신 공식 자료로 재검증한다.

## 구현 승인과 작은 배포 단위

Windows 1.1.8, Android 1.1.10는 개발안·기술 실험을 P1에서 승인받은 뒤에만 실제 앱 기반/읽기·복사 구현으로 진행한다. 승인이 없으면 개발안으로 종료하고 제품 tag를 발행하지 않는다. 승인된 첫 앱은 읽기·복사 범위를 분명히 밝히고, 작성·오프라인 복구는 Windows 1.1.9·Android 1.1.11에서 검증한다. 개발안 문서 요청을 앱 제작·스토어 과금·서명 키 사용 승인으로 확대하지 않는다.


## 6. 약 5개 morphism 시안과 사용자 선택

glass/blur/saturation/shadow, SVG distortion, GSAP 등 motion 후보와 CSS liquid glass의 입체감을 비교한다. 약 5안의 예시는 기존 flat 기반 깊이 개선, glassmorphism, neumorphism, claymorphism, liquid glass다. 시안 수 자체를 품질 기준으로 삼지 않고 같은 창작 과제·PC/iOS/Android·light/dark로 비교한다. SVG filter/GSAP는 도입 확정이 아닌 구현 후보이며 브라우저 지원·의존성·성능 비용을 확인한다.

사용자 출처인 [Liquid Glass 모음](https://freefrontend.com/css-liquid-glass/)의 [Liquid Glass Effect](https://codepen.io/daftplug/pen/QwbaYGO)·[Liquid Toggle Switch](https://codepen.io/jh3y/pen/bNVWoBW), [Apple Liquid Glass motion](https://developer.apple.com/videos/play/wwdc2025/219/)을 참고한다. 부모가 2026-09-09 존재/요지를 검증했으며 코드·자산 재사용 라이선스나 전 브라우저 성능을 보증한 것은 아니다.

UX P2에서 사용자가 시안을 선택한 뒤 P3의 new_Mock-up으로 구체화한다. P4의 수정이 선택안 의미를 크게 바꾸면 다시 확인하고 P5에서 구현 인계를 최종 승인한다. 이번 문서 정비는 실제 시안 구현·이미지 생성·MCP/SDK 설치를 수행하지 않는다.

접근성은 keyboard/focus·텍스트 대비·투명 배경 판독성·색상 외 상태·200% 확대를 포함한다. reduced-motion, reduced transparency·increased contrast에 대응하는 단순 효과/불투명 fallback을 정의한다. 저사양 모바일의 frame/입력 지연·메모리·배터리/스크롤 비용을 기준안과 비교해 예산을 먼저 정한다. 효과를 줄여도 버튼·상태·협업 위치·사전 tooltip 의미는 유지돼야 한다. IME/selection/undo를 motion 때문에 재마운트하지 않는다.

## 7. 플랫폼과 목업 소비

| OS | 계획 | 검증·결정 |
|---|---|---|
| Windows | 1.1.8~1.1.9 | 기존 WinUI/대안 비교·Microsoft IME·프로토콜·인증·작성/복구 계획 재사용 |
| Android | 1.1.10~1.1.11 | 기존 Kotlin/Compose 대안·Gboard/Samsung·수명주기·작성/복구 재사용 |
| Linux | [1.1.12](../1.1.12/README.md) | toolkit·배포판/Wayland/X11·IBus/Fcitx·패키징·보호 저장소 검증 |
| macOS | [1.1.13](../1.1.13/README.md) | AppKit/SwiftUI/대안·IME·Keychain·서명/notarization·업데이트 검증 |
| iOS | [1.1.14](../1.1.14/README.md) | SwiftUI/UIKit/대안·iPhone/iPad 입력·수명주기·Keychain·배포 경계 검증 |

PC 목업에는 Windows/Linux/macOS의 창·메뉴·단축키 차이를, iOS와 Android 목업에는 플랫폼별 navigation/back·safe area·키보드·공유/복구를 각각 기록한다. 모든 개발안은 다사용자 협업·presence/cursor, 세 언어 사전 제공 gate, 무료 폰트·glyph/라이선스를 함께 소비한다. SDK/패키징은 검증/결정 뒤에만 적용하고 별도 major/minor 점프를 만들지 않는다.
