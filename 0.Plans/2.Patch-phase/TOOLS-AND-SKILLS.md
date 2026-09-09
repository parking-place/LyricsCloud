# 새 작업의 도구·스킬·MCP 필요 계획

도구 이름이 아래에 있다고 사용자가 설치/연결/과금/외부 전송을 승인했다는 뜻은 아니다. 새 프로젝트 기술은 기존 승인 스택과 별도 결정 없이 교체하지 않는다.

| 영역 | 우선 사용 | 추가 필요/조건 | 데이터 경계 |
|---|---|---|---|
| 저장소/PR/증거 | 현재 GitHub 연결, 로컬 Git/Codex | CI read/write·branch protection 권한은 실제 확인 | secret·실제 사용자 자료 push 금지 |
| 설계/TDD/리뷰 | 설치된 superpowers의 brainstorming/writing-plans/TDD/debugging/verification | Codex에서 로컬 실행 계획에 적용 | 본문 없는 증거/합성 fixture |
| 최신 라이브러리 문서 | Context7 또는 공식 문서 | 관련 library별 실제 버전 조회 | 비밀 config를 query로 보내지 않음 |
| 화면/브랜드 원안 | Figma MCP 또는 로컬 SVG/이미지 제작 도구, 이미지 생성은 명시 디자인 작업 시 | 편집 가능한 layer/source와 승인 필요 | 합성 창작 내용, 자산 사용권 기록 |
| 시각/접근성 회귀 | repo Playwright·Axe·브라우저 devtools | 실제 지원 브라우저/기기 설치 | 실제 계정/본문 screenshot 금지 |
| Windows IME | 실제 Windows + Microsoft 한국어 IME + Chrome/Edge | OS 입력 자동화/수동 인수, 관리자 권한 최소화 | 입력 이벤트 기록은 합성문장만 |
| Android IME | 실제 Android + Gboard/Samsung Keyboard, emulator 보조 | 기기 연결·ADB 권한/설치 승인 | 기기 개인 자료/계정 추출 금지 |
| Windows native | 승인 후 Windows App SDK/.NET/WinUI 또는 대안 | Windows runner·signing·패키지 테스트 환경 | private signing key는 승인 secret store |
| Android native | 승인 후 Android Studio/Gradle/Kotlin/Compose | SDK/API level·keystore·실기기·배포 계정 | keystore·실제 token을 소스/로그에 넣지 않음 |
| 외부 metadata | 승인된 공식 provider/표준 문서 | API 존재·이용 범위·rate/SSRF 증명 선행 | 사용자 Suno token·cookie·private URL 로그 금지 |

새 MCP/skill이 정말 필요하면 이름·기능·대안·권한·송신 정보·설치 위치·비용·제거/rollback을 문서에 적고 승인받는다. 단순 공식 문서 조회나 코드 분석을 위해 무관한 외부 서비스를 추가하지 않는다. 네이티브 개발에 필요한 OS 환경이 없으면 그 검증을 미실행으로 기록하며 브라우저 시뮬레이션을 실기기 검증이라고 부르지 않는다.


## 이번 보강에 필요한 도구 계획

| 작업 | 도구/스킬 후보 | 결정·인수 조건 |
|---|---|---|
| 주 로고/아이콘·약 5개 morphism 시안 | imagegen 스킬/이미지 생성 도구, Figma의 figma-use·generate-design MCP 또는 기존 로컬 SVG 도구 | 사용자 시안 선택·원본/사용권·재현 가능한 자산, 현재 설치/생성 미실행 |
| 선택안 new_Mock-up | Figma MCP·로컬 프로토타입, 브라우저/Playwright | PC/iOS/Android 구분·light/dark·a11y·reduced-motion, MCP 접근 시 해당 스킬 선행 |
| liquid glass/motion | 기존 CSS/Web Animations 우선, GSAP/SVG filter는 후보 | 공식 지원·라이선스·번들 비용·저사양 성능 확인 뒤 채택 |
| 사전 제공·폰트 권리 확인 | 공식 제공자 문서·브라우저/Context7(해당 시) | NAVER 백과사전을 사전 API로 간주하지 않음, 폰트별 고지/서브셋 검증 |
| Linux | 승인 toolkit/SDK와 배포판 VM/실기기 | X11/Wayland·IBus/Fcitx·패키징/secret storage |
| macOS/iOS | 승인 뒤 Apple SDK/Xcode·실제 Mac/iPhone/iPad, SwiftUI 관련 작업 시 해당 스킬 | IME·수명주기·Keychain·서명/배포 권한 별도 |

설치·계정 연결·외부 업로드는 이번 문서 범위 밖이다. 도구가 있다는 이유로 도입하거나 가상의 성공 증거를 기록하지 않는다.
