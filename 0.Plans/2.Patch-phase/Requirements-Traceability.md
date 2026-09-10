# 사용자 요구사항 추적표

원래 NF-REQ-001~041을 유지하고 최신 필수 요구를 NF-REQ-042~048로 보강했다. 1.0.1의 NF-REQ-001~021은 [최종 요구 추적](../../docs/architecture/1.0.1-FINAL-TRACEABILITY.md), P1~P10 개발 인수와 `v1.0.1` 릴리스로 완료했다. 이후 요구는 계획 상태이며 여러 패치가 배정된 요구는 모든 담당 범위가 끝나야 전체 완료로 표시한다.

1.0.2가 재검증한 NF-REQ-001~008·011~012·014~015·019~021의 부분 범위와 AC-1.0.2-01~04 결과는 [1.0.2 후보 추적](../../docs/architecture/1.0.2-FINAL-TRACEABILITY.md)에 분리한다. 이는 이미 완료된 1.0.1 요구를 소급 변경하거나 1.0.2 정식 릴리스를 승인하지 않는다.

| ID | 요구 | 담당 버전·설계 | 대표 수용 결과 | 상태 |
|---|---|---|---|---|
| `NF-REQ-001` | Windows 한글 자모/받침 소실 수정 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 실제 IME로 바라봐·마냥·마땅한의 원문이 저장/재접속까지 보존 | 1.0.1 완료 |
| `NF-REQ-002` | 다른 입력 영역 확산 여부 검사 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 라임 이외 가사/prompt/제목/메모/태그/검색/template 검사 결과 | 1.0.1 완료 |
| `NF-REQ-003` | 개발 HTTPS의 버튼 클릭 불능 수정 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | dark mode·새 가사·연결 관리의 실제 공개 주소 smoke | 1.0.1 완료 |
| `NF-REQ-004` | 전 UI dark/light 누락 수정 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 새 가사·연결 관리·portal 포함 양 테마 검증 | 1.0.1 완료 |
| `NF-REQ-005` | UI 겹침 수정 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 모바일·PC·200% 확대에서 overlay/keyboard 겹침 회귀 | 1.0.1 완료 |
| `NF-REQ-006` | 닫힌 sidebar 아이콘 수정 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | viewBox/크기/flex/focus의 양 테마 회귀 | 1.0.1 완료 |
| `NF-REQ-007` | test user 파일 hash 기반 전환 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 평문 없는 .test_users 이행·키 분리·기존 계정 보존 | 1.0.1 완료 |
| `NF-REQ-008` | 서버 관리자 CLI 제공 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 호스트에서 LyricsCloud 명령 실행, 최소 권한과 배포 경로 | 1.0.1 완료 |
| `NF-REQ-009` | 베타코드 일괄 발급 -n | [1.0.1](1.0.1/README.md) | LyricsCloud betacode -n 7이 정확히 7개 발급 | 1.0.1 완료 |
| `NF-REQ-010` | 랜덤 영숫자 6자리 | [1.0.1](1.0.1/README.md) | CSPRNG A-Z0-9 6자리·유일성·남용 제한 | 1.0.1 완료 |
| `NF-REQ-011` | 베타코드 단일 사용 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 경쟁 소비 승자1·재사용불가·기존 계정 재로그인 | 1.0.1 완료 |
| `NF-REQ-012` | 미사용 베타코드 refresh | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 미사용 전체 폐기·가입 대기 무효화·기존 grant 보존 | 1.0.1 완료 |
| `NF-REQ-013` | 미사용 베타코드 ls | [1.0.1](1.0.1/README.md) | 관리자에게 실제 사용 가능한 코드 재조회 | 1.0.1 완료 |
| `NF-REQ-014` | Sign up→코드+메일→Google 동선 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 인증 전 입력과 검증된 identity를 구별한 UI | 1.0.1 완료 |
| `NF-REQ-015` | 앱 test user 자동 등록 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 검증된 Google callback에서 원자 grant 부여, Console 목록과 구분 | 1.0.1 완료 |
| `NF-REQ-016` | 메인 아이콘/로고 | [1.0.1](1.0.1/README.md) | 승인된 light/dark·favicon·PWA/maskable·출처 | 1.0.1 완료 |
| `NF-REQ-017` | 로고 옆 version/phase/channel | [1.0.1](1.0.1/README.md) | v1.0.1 Release 및 v1.1.12-p3 dev 형식 | 1.0.1 완료 |
| `NF-REQ-018` | 라임/prompt 버튼 옆 버전 제거 | [1.0.1](1.0.1/README.md) | 해당 navigation의 중복/하드코딩 버전 0 | 1.0.1 완료 |
| `NF-REQ-019` | GitHub README 최신화·미관 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | 승인 로고·실제 기능/설치/스크린샷/CI badge·목차 | 1.0.1 완료 |
| `NF-REQ-020` | 모든 현재 문서·버전 규칙 최신화 | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | major1·다자리minor/patch·과거 이력 보존·새 폴더 | 1.0.1 완료 |
| `NF-REQ-021` | 모든 10 Phase 인수 후 Private Beta release | [1.0.1](1.0.1/README.md), [1.0.2](1.0.2/README.md) | main은 release 시에만·3 aliases·app.example.test 별도 승인 배포 | 1.0.1 완료 |
| `NF-REQ-022` | 프롬프트 태그형↔문장형 | [1.0.3](1.0.3/README.md), [1.0.4](1.0.4/README.md), [1.0.12](1.0.12/README.md) | 모드 전환·ASCII . 분할 표시·원문/구두점 보존 | 1.0.3 mode/raw·1.0.4 표시 담당 완료, 1.0.12 통합 회귀 예정 |
| `NF-REQ-023` | 프롬프트 최종 copy 1000자 경고 | [1.0.4](1.0.4/README.md), [1.0.12](1.0.12/README.md) | 두 모드 모두 >1000 advisory, 입력/저장/복사 허용 | 1.0.4 기능 담당 완료, 1.0.12 통합 회귀 예정 |
| `NF-REQ-024` | 가사 최종 copy 3000자 경고 | [1.0.5](1.0.5/README.md), [1.0.12](1.0.12/README.md) | >3000 advisory, 입력/저장/복사 허용 | 1.0.5 P1 계약 완료, 구현·통합 회귀 대기 |
| `NF-REQ-025` | [TAG:sub tag] 송폼 | [1.0.5](1.0.5/README.md), [1.0.12](1.0.12/README.md) | TAG 탐색·suffix 덜 강조·copy에는 suffix 유지 | 1.0.5 P1 계약 완료, 구현·통합 회귀 대기 |
| `NF-REQ-026` | [Extend] metadata 제외 copy | [1.0.6](1.0.6/README.md), [1.0.12](1.0.12/README.md) | 원문에 보관, Suno용 전체 copy에서는 marker만 제외 | 계획됨 |
| `NF-REQ-027` | 가사 우클릭 송폼 추천 | [1.0.6](1.0.6/README.md), [1.0.12](1.0.12/README.md) | 기본 송폼 삽입·키보드/모바일 대안·IME/undo 보존 | 계획됨 |
| `NF-REQ-028` | 곡/라임/prompt 사용자 드래그 순서 | [1.0.8](1.0.8/README.md), [1.0.9](1.0.9/README.md), [1.0.12](1.0.12/README.md) | custom sort 자동 전환·필터/페이지/핀·동시 이동·영속 | 계획됨 |
| `NF-REQ-029` | 목록 네 보기 | [1.0.7](1.0.7/README.md), [1.0.12](1.0.12/README.md) | 리스트·소/중/대 그리드·유형별 저장·모바일 | 계획됨 |
| `NF-REQ-030` | 곡 Suno 모델 기록 | [1.0.10](1.0.10/README.md), [1.0.12](1.0.12/README.md) | 사용자 제시 모델값+확장 값 저장·unknown 보존 | 계획됨 |
| `NF-REQ-031` | 곡당 복수 Suno 링크 | [1.0.10](1.0.10/README.md), [1.0.12](1.0.12/README.md) | 여러 URL 저장/수정/삭제/순서·owner 격리 | 계획됨 |
| `NF-REQ-032` | Suno 링크 metadata 카드 | [1.0.11](1.0.11/README.md), [1.0.12](1.0.12/README.md) | 실제 제목/시간/thumb·출처·안전 조회·실패/수동 대안 | 계획됨 |
| `NF-REQ-033` | Suno 링크 새 탭 열기 | [1.0.10](1.0.10/README.md), [1.0.11](1.0.11/README.md), [1.0.12](1.0.12/README.md) | HTTPS 검증·noopener/noreferrer | 계획됨 |
| `NF-REQ-034` | 읽기 공유 3범위 | [1.1.0](1.1.0/README.md), [1.1.1](1.1.1/README.md), [1.1.4](1.1.4/README.md) | private 기본/selected 내부ID/public-link guest read | 계획됨 |
| `NF-REQ-035` | 쓰기 공유 3범위 | [1.1.2](1.1.2/README.md), [1.1.3](1.1.3/README.md), [1.1.4](1.1.4/README.md) | private/selected/public-link 및 guest 범위 명시 승인 | 계획됨 |
| `NF-REQ-036` | 쓰기 권한은 읽기의 부분집합 | [1.1.0](1.1.0/README.md), [1.1.1](1.1.1/README.md), [1.1.2](1.1.2/README.md), [1.1.3](1.1.3/README.md), [1.1.4](1.1.4/README.md) | 모드+실제 수신자 집합·서버/WS 검증·철회 | 계획됨 |
| `NF-REQ-037` | light/dark 디자인 개편안 | [UX 설계](design/UX/README.md), [1.1.5](1.1.5/README.md), [1.1.6](1.1.6/README.md), [NF-REQ-048의 시안 계약](contracts/DESIGN-NATIVE.md) | 대안·토큰·접근성·승인 후 점진 적용 | 계획됨 |
| `NF-REQ-038` | new_Mock-up·도구 필요 문서 | [UX 설계](design/UX/README.md) | 원본 목업 보존·새 화면/상태·skill/MCP 요구 | 계획됨 |
| `NF-REQ-039` | UI/UX 동선 개선·개편 | [UX 설계](design/UX/README.md), [1.1.5](1.1.5/README.md), [1.1.6](1.1.6/README.md), [1.1.7](1.1.7/README.md) | 현행 과제 관찰·설계 비교·비파괴 전환 | 계획됨 |
| `NF-REQ-040` | Windows 네이티브 개발안 | [1.1.8](1.1.8/README.md), [1.1.9](1.1.9/README.md) | 기술/IME/protocol 승인→구현/서명/실기기 인수 | 계획됨 |
| `NF-REQ-041` | Android 네이티브 개발안 | [1.1.10](1.1.10/README.md), [1.1.11](1.1.11/README.md) | Kotlin 등 비교·IME/수명주기·서명/실기기 인수 | 계획됨 |

| `NF-REQ-042` | 실제 여러 사용자 동시 보기·편집과 presence/cursor | [1.1.0](1.1.0/README.md)~[1.1.4](1.1.4/README.md) | 서로 다른 3계정·동시 한글 수렴·누가 어디 작업하는지·철회/재연결/구독 경계 | 계획됨 |
| `NF-REQ-043` | 라임 단어 NAVER 세 언어 사전 tooltip | [1.0.13](1.0.13/README.md) | 한국어/영어/일어·hover/keyboard/터치·오류/출처/권리·제공 조건 gate | 계획됨 |
| `NF-REQ-044` | 무료 웹폰트 추가·다국어 표시 | [1.0.14](1.0.14/README.md) | 나눔 등 폰트별 권리/고지·glyph·로딩/fallback·모바일 성능·실제 IME | 계획됨 |
| `NF-REQ-045` | Linux 개발안 | [1.1.12](1.1.12/README.md) | SDK/패키징·X11/Wayland/IME·협업/사전/폰트 검증 뒤 조건부 구현 | 계획됨 |
| `NF-REQ-046` | macOS 개발안 | [1.1.13](1.1.13/README.md) | SDK/패키징·IME·Keychain·서명/notarization 검증 뒤 조건부 구현 | 계획됨 |
| `NF-REQ-047` | iOS 개발안과 PC/iOS/Android 목업 | [1.1.14](1.1.14/README.md), [UX](design/UX/README.md) | iPhone/iPad·수명주기·플랫폼별 목업·실기기·서명/스토어 gate | 계획됨 |
| `NF-REQ-048` | 약 5개 morphism·Liquid Glass 시안 선택 | [UX P2](design/UX/2phase.md)~[P5](design/UX/5phase.md), [1.1.5](1.1.5/README.md)~[1.1.7](1.1.7/README.md) | 출처·glass/blur/saturation/shadow/SVG/GSAP 후보·사용자 시안 선택→new_Mock-up·a11y/성능 | 계획됨 |

## 범위 분할 기준

NF-REQ-022는 1.0.3의 mode/raw와 1.0.4의 마침표 표시가 모두 충족돼야 완료다. NF-REQ-028은 곡 1.0.8과 라임/프롬프트 1.0.9를 모두 검증한다. 읽기 공유는 1.1.0~1.1.1, 쓰기 공유는 1.1.2~1.1.3의 전체 요구를 포함한다. 네이티브는 우선 개발안 승인까지가 확정 문서 요구이고, 실제 앱 구현은 별도 승인으로 활성화한다.

[P6 인수](P6-AND-BUG-INTAKE.md)의 REVIEW/OPS/RC를 새 요구 ID로 덮어쓰지 않는다. [추가 기능 검수 인수](FUTURE-INTAKE.md)에서 체크·설명·범위 변경을 확인해도 위 요구를 대체·축소하지 않는다. 중복 대조와 차기 patch 배정 전에는 실제 로드맵에 포함하지 않는다.

[최신 요청별 정확한 Phase 배정](../../docs/planning/latest-requirements-mapping.md)에서 사용자 13개 요구와 후속 스티어링을 대조한다. 계획/미완료 상태는 모든 행에 유지하며 FF 선택과 구현 완료를 혼동하지 않는다.
