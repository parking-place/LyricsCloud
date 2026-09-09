# ADR-NF-004 — Windows native 기술·편집기·인증

- 상태: **Proposed**
- 작성일: 2026-09-09
- 결정 Phase: 1.1.8 P1
- 승인자/시각: **미승인 — 해당 Phase에서 사용자/지정 결정권자의 승인을 기록한다.**
- 범위 원본: 사용자의 1.0.1 필수 및 후속 1.x 계획 요청.

## 해결할 질문

native 사용 경험과 기존 Yjs/CodeMirror의 데이터 계약을 어느 범위에서 함께 만족할 것인가?

## 검토한 대안

### 1. WinUI 3/.NET native UI/editor

Windows 통합성이 높으나 editor·CRDT interop를 실제 spike로 증명해야 한다.

### 2. Avalonia 등 다른 native UI

플랫폼 재사용 가능성과 Windows IME/접근성 비용을 비교해야 한다.

### 3. native shell + 승인된 WebView editor

editor 재사용이 가능하지만 완전 native editor와 다르고 별도 범위 승인이 필요하다.

## 권장 선택과 이유

첫 번째를 우선 후보로 비교하되 기술 확정은 실제 Microsoft IME·장문·protocol spike 및 사용자 승인 뒤로 둔다.

## 영향받는 작업·화면·schema·운영

apps/windows 신규 후보·desktop OAuth client·local DB·OS credential store·서명 installer·platform CI.

## 자동·수동 검증 기준

Windows 실제 OS IME·sleep/resume·process kill·offline·웹↔app shared edit·signed update/rollback을 시험한다.

## 되돌림 또는 대체 비용

앱 flag/배포 채널로 중단하고 서버/웹 계약은 유지한다. local data export·구버전 read 호환과 key 유실 한계를 기록한다.

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
