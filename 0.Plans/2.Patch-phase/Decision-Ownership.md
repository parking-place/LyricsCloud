# 후속 기술·제품·운영 결정 권한

상태는 Proposed/Accepted/Superseded를 사용한다. 사용자 원래 필수 기능과 메이저 고정·패치 우선 제약은 범위 원본이며, 세부 기술·공개 guest·플랫폼 선택은 최초 소비 Phase 전에 별도 승인한다. 새 문서 생성은 기술 승인이나 배포가 아니다.

| ID | 결정 대상 | 최초 결정/주요 소비 | 상태 | 문서 |
|---|---|---|---|---|
| `ADR-NF-001` | 베타 접근·해시 allowlist·원자 grant | 1.0.1 P1 | Accepted | [결정](../../docs/adr/ADR-NF-001-beta-access.md) |
| `ADR-NF-002` | 외부 metadata 취득·보안 경계 | 1.0.11 P1 | Deferred / no-go; 공식 계약 확보 시 재개 | [결정](../../docs/adr/ADR-NF-002-external-metadata.md) |
| `ADR-NF-003` | owner/actor·공유 protocol | 1.1.0 P1; 쓰기 확장 1.1.2~1.1.3 | Proposed | [결정](../../docs/adr/ADR-NF-003-sharing.md) |
| `ADR-NF-004` | Windows 기술·인증·편집 | 1.1.8 P1; 편집 인수 1.1.9 | Proposed | [결정](../../docs/adr/ADR-NF-004-windows-native.md) |
| `ADR-NF-005` | Android 기술·수명주기 | 1.1.10 P1; 편집 인수 1.1.11 | Proposed | [결정](../../docs/adr/ADR-NF-005-android-native.md) |
| `PROD-NF-001` | 가입·일회용 코드 동선 | 1.0.1 P1 | Accepted | [결정](../../docs/product/PROD-NF-001-beta-onboarding.md) |
| `PROD-NF-002` | 원문·mode·송폼·복사 경고 | 1.0.3 P1; 1.0.4~1.0.6 확장 | Accepted through 1.0.6 | [결정](../../docs/product/PROD-NF-002-editor-output.md) |
| `OPS-NF-001` | 번호·main·정식 별칭 | 1.0.1 P1 | Accepted | [결정](../../docs/operations/OPS-NF-001-version-release.md) |
| `PROD-NF-003` | 개인 순서·목록 보기 | 1.0.7 P1, 1.0.8 P1, 1.0.9 소비 | Accepted for 1.0.7 views and 1.0.8 song ordering; 1.0.9 ordering Proposed | [결정](../../docs/product/PROD-NF-003-library-order-views.md) |
| `PROD-NF-004` | 모델 표기·복수 작업 링크 | 1.0.10 P1, 1.0.11 소비 | 1.0.10 수동 workspace Accepted; 자동 metadata Deferred / no-go | [결정](../../docs/product/PROD-NF-004-suno-work-links.md) |
| `PROD-NF-005` | 공유 수신자와 공개 필드 | 1.1.0 P1, 1.1.1~1.1.3 확장 승인 | Proposed | [결정](../../docs/product/PROD-NF-005-sharing-scope.md) |
| `PROD-NF-006` | 디자인 승인·점진 적용 | UX P5, 1.1.5~1.1.6 소비 | Proposed | [결정](../../docs/product/PROD-NF-006-ui-transition.md) |
| `OPS-NF-002` | 제품 단계 전환·마이너 진입 | 1.0.12 점검; 1.0.14 P5, 1.1.0 P1 | Proposed | [결정](../../docs/operations/OPS-NF-002-minor-entry.md) |
| `ADR-NF-006` | 사전 제공 경로·권리·조회 경계 | 1.0.13 P1 | Proposed | [결정](../../docs/adr/ADR-NF-006-dictionary-provider.md) |
| `ADR-NF-007` | 웹폰트 자산·로딩·라이선스 | 1.0.14 P1 | Proposed | [결정](../../docs/adr/ADR-NF-007-web-fonts.md) |
| `PROD-NF-007` | 세 언어 단어 Tooltip | 1.0.13 P1 | Proposed | [결정](../../docs/product/PROD-NF-007-dictionary-tooltip.md) |
| `PROD-NF-008` | 무료 폰트 선택·다국어 표시 | 1.0.14 P1 | Proposed | [결정](../../docs/product/PROD-NF-008-web-fonts.md) |
| `PROD-NF-009` | 여러 사용자 동시 작업과 위치 표시 | 1.1.0 P1; 1.1.2 P1 확장 | Proposed | [결정](../../docs/product/PROD-NF-009-collaboration-presence.md) |
| `ADR-NF-008` | Linux 기술·패키징·수명주기 | 1.1.12 P1~P3 | Proposed | [결정](../../docs/adr/ADR-NF-008-linux-platform.md) |
| `ADR-NF-009` | macOS 기술·패키징·수명주기 | 1.1.13 P1~P3 | Proposed | [결정](../../docs/adr/ADR-NF-009-macos-platform.md) |
| `ADR-NF-010` | iOS 기술·패키징·수명주기 | 1.1.14 P1~P3 | Proposed | [결정](../../docs/adr/ADR-NF-010-ios-platform.md) |

## 기존 규정과 대체 범위

ADR-0002 인증·ADR-0004/0005 동일 owner 동기화·PROD-0003 송폼·기존 OPS 승인/서명/복구 계약을 유지한다. 새 정책이 특정 의미를 대체할 때 해당 구간과 migration/API/화면/테스트를 연결하고 과거 승인 원문을 덮어쓰지 않는다.

로컬 Codex가 같은 namespace를 사용했다면 파일을 덮어쓰지 않고 실제 미사용 ID를 담당자와 확정한다. ID 번호 자체가 제품 버전 자동 증가를 뜻하지 않는다. [규정 통합](GOVERNANCE-INTEGRATION.md)과 [소스 범위](SOURCES.md)를 따른다.
