# ADR-NF-005 — Android native 기술·수명주기·인증

- 상태: **Proposed**
- 작성일: 2026-09-09
- 결정 Phase: 1.1.10 P1
- 승인자/시각: **미승인 — 해당 Phase에서 사용자/지정 결정권자의 승인을 기록한다.**
- 범위 원본: 사용자의 1.0.1 필수 및 후속 1.x 계획 요청.

## 해결할 질문

모바일 OS가 앱을 중단해도 한글 입력·미전송 초안·권한을 안전하게 유지할 방법은 무엇인가?

## 검토한 대안

### 1. Kotlin/Jetpack Compose

플랫폼 UI·수명주기 통합에 적합한 우선 후보이나 CRDT/IME 검증이 필요하다.

### 2. 공통 cross-platform native 접근

Windows 재사용 가능성과 Android input/접근성/빌드 비용을 비교한다.

### 3. WebView/PWA 포장

기존 웹 재사용은 가능하지만 요구한 native 범위의 자동 충족으로 보지 않는다.

## 권장 선택과 이유

첫 번째를 우선 후보로 하며 실기기 keyboard·process recovery·protocol spike와 사용자 승인 후 선택한다.

## 영향받는 작업·화면·schema·운영

apps/android 신규 후보·native OAuth client/App Links·Keystore·로컬 DB·Gradle·서명 APK/AAB·지원기기 정책.

## 자동·수동 검증 기준

Gboard/Samsung·회전·Wi-Fi/LTE·process kill·배터리 제한·web/Windows interop·signed upgrade와 data migration을 시험한다.

## 되돌림 또는 대체 비용

구버전 앱/서버 compatibility matrix와 local 원문 export를 유지한다. 서버 major 변경으로 앱 회귀를 우회하지 않는다.

## 범위 밖과 관련 결정

이 문서 생성은 구현/배포 또는 과거 결정의 자동 폐기 승인이 아니다. 원문/기존 사용자·이력·major1 정책을 보존한다. 기존 ADR/PROD/OPS의 해당 범위만 새 Accepted 기록으로 대체한다.

- [세부 계약](../../0.Plans/2.Patch-phase/contracts/DESIGN-NATIVE.md)
- [결정 권한과 소비 시점](../../0.Plans/2.Patch-phase/Decision-Ownership.md)
- [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)
- [버전 정책](../../0.Plans/2.Patch-phase/VERSIONING.md)

## 승인 기록 규칙

승인 시 선택 대안·승인자·시각·정확한 적용 범위·미해결 위험·추가 테스트를 기록한다. 계획 승인과 코드/운영 배포 승인은 별개다. 대체 시 새 ID와 사유를 연결하고 기존 Accepted 원문을 덮어쓰지 않는다.

## 실행 활성화

개발안과 기술 실험을 문서화하는 것은 이번 요구 범위다. 실제 앱 구현·새 SDK/유료 계정·서명 키 사용·스토어 등록은 해당 플랫폼 승인 뒤에만 진행한다. 제품 마이너를 새로 올리는 근거로 네이티브 플랫폼 이름을 사용하지 않는다.
