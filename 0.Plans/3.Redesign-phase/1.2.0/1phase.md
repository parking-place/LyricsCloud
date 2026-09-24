# 1.2.0 Phase 1 — 기준·기능 보존·전환 계약

상태: **완료** (`complete`). 1.1.7b 문서 인수 `e8ce777fcee83396166d0afcf76ecbd932440406`에서 `phase/1.2.0-p1-contract-baseline`을 분기해 요구 `RD-REQ-001~006`의 계약을 담당한다. 제품 출발 기능 SHA는 `acd2bd99876740debf426c401fe7157713f8b854`다. 사용자 선택은 코발트 Chroma Dock으로 확정됐으며 같은 선택을 다시 요청하지 않는다.

## 목표와 선행조건

[1.1.7b 최종 인계](../1.1.7.b/HANDOFF-TO-1.2.0.md)의 실제 기능·동작을 빠짐없이 새 화면에 대응시키고 안전한 점진 전환을 설계한다. b P5 인수가 선행하며, v1.1.7a는 목업/원 리뷰의 출처다. [전환 결정](../PLAN-CHANGE.md), [실행 STATUS](<../../1. Dev-phase/STATUS.md>), [버전 규칙](../../2.Patch-phase/VERSIONING.md), 현재 checkout·미커밋 변경·담당자를 확인한다. 원 리뷰 SHA는 `fc2463cdb47d9fd7d0042779f602c6ddb7d734cf`이고 구현 기준 SHA는 실제 완료된 b 인계에서 채운다. 아직 없는 b SHA를 만들어 쓰지 않는다. 미완료 Windows 코드가 있는 다른 개발선을 무조건 병합하지 않는다. [웹 안정화 비교](../BRANCH-COMPARISON-118-P4.md)의 고정 원격 SHA와 [0922 선행 차단 목록](../QUALITY-GATES.md)을 먼저 인수한다.

## 작업

- [x] `LC-RD-120-P1-01` 기준 source SHA·기존 route/화면/저장/권한 계약을 인수하고 실행 STATUS에 실제 착수와 책임 경로를 기록한다. 1.1.8 선행 진행과 보류 범위는 별도 이력으로 남긴다. 원격 C1~C3/WC 후보별 최소 코드·타입·소비 UI·회귀 의존표와 22개 원인 비교를 인수하고 release blocker의 선해결/잔여를 기록한다.
- [x] `LC-RD-120-P1-02` 목업의 207개 기능 설명 ID를 실제 제품 컴포넌트·route·상태·새 화면과 1:1 대조한다. 라임·프롬프트·자료 4탭·메모·공유·기록·복구·프로필 누락을 차단하고 제품/시연 차이를 적는다.
- [x] `LC-RD-120-P1-03` [색상·효과 명세](DESIGN-SPEC.md)를 공통 토큰과 semantic 상태·typography·spacing·focus·density에 대응시킨다. 실제 blur/gradient 대비와 저성능/동작·투명도 감소 fallback의 측정 기준을 정한다.
- [x] `LC-RD-120-P1-04` 기존 CodeMirror/Yjs·draft/outbox·IME·selection/undo를 유지하는 셸/자료 패널 경계를 정한다. 기존 route/return·저장 이탈 보호와 테마 설정 이행·이전 UI 복귀 전략을 문서화한다. WC-02/03/11/12의 입력·focus·구 build 탭/PWA 자산 수명을 전환 gate에 포함하고, 필요한 최소 수정의 현재 버전 편입은 PLAN-CHANGE에 경계/담당/호환을 기록한다.
- [x] `LC-RD-120-P1-05` [수용표](ACCEPTANCE.md)의 실제 재현 fixture·브라우저·실기기·접근성·성능 예산과 시험 담당을 정한다. 목업 GSAP/Draggable의 제품 채택 필요성·번들/CSP/lifecycle·권리와 기존 라이브러리 대안을 검토한다.
- [x] `LC-RD-120-P1-06` b P1에서 인수한 정확한 a/b 매핑·3.Redesign-phase 경로·선언된 Phase 수·dev/정식 도구 지원과 회귀 SHA를 확인한다. 이 기반을 재구현하지 않고 실제 VERSION/runtime/STATUS를 1.2.0 P1로 전환해 현재 후보의 CI/발행 기대값을 검증한다. 1.2.2의 6 Phase·기존 a/b·잘못된 값 거부를 보존하고 P2/P3 파일 소유자와 rollback을 인계한다.

## 책임 경로와 산출물

이 버전의 계획/명세/수용표와 실제 실행 STATUS가 계약 기록의 소유 위치다. 읽기 기준은 `apps/web/src/components/app-shell.tsx`, `lyric-editor.tsx`, `lyric-resource-panel.tsx`, `rhyme-editor.tsx`, `prompt-editor.tsx`, `profile-settings.tsx`, `settings-screen.tsx`, 기존 스타일·editor/domain 저장 계약·릴리스 도구다. 새 API·migration·패키지 도입은 이 Phase의 기본 범위가 아니다.

P1의 실행 준비 예외는 [release-phase-state.mjs](../../../scripts/release-phase-state.mjs)와 그 소비 도구·회귀 검사다. 현재 경로 검증은 `2.Patch-phase`까지만 허용하므로, 새 실행 STATUS만 먼저 바꾸고 도구 지원을 P5로 미루면 P1 CI가 막힌다. 이 최초 지원은 b P1로 앞당겼다. 여기의 P1-06은 b 지원의 실제 인수와 1.2.0 전환만 담당하며, 이번 계획 작성 중에는 제품 도구·버전을 변경하지 않는다.

## 검증과 완료

기능 ID 누락·중복, 불명확한 상태/반응형 대응, 링크/출처, 토큰 대비 기준, 이전 UI 복귀·미저장 입력 보호 계약을 검토한다. 새 기능 테스트를 했다고 기록하지 않는다. 실제 P1 완료는 계약 확인 외에도 [Agent.md](../../../Agent.md)의 Phase 완료·Future 검수·Git/CI·같은 SHA 개발 인수 규칙을 따른다. 기록 없는 구현·기기·서버 검사는 미실행으로 남긴다.

다음 입력: [P2 공통 셸](2phase.md), [P3 편집·보조 화면](3phase.md). 본문 보존이나 권한 의미가 모호하면 해당 구현을 시작하기 전에 계약을 해결한다.

## 2026-09-24 실제 P1 인수

기능·계약 SHA `84761ae1ca25f1b5e5dd808e772d1a062066cd57`의 [push Actions 36004281225](https://github.com/parking-place/LyricsCloud/actions/runs/36004281225)는 전체 verify·네 signed dev image/provenance PASS, [PR #158 Actions 36004313192](https://github.com/parking-place/LyricsCloud/actions/runs/36004313192)는 verify PASS다. Unit/DB **509 PASS/8 조건부 skip**, owner Chromium **432 PASS/54 조건부 skip**, release browser matrix **10 PASS**. 이미지 digest는 web `ed1bb83e8cc47c4af3722c7d64fd2ba6e877d6de5ef4f3e41465b7a89f7d0030`, collaboration `b6ecea010521b0b0bdc9ecfe36c2c5d87b0cd7de364240fc2fb8b2b2d6b32230`, worker `5dc355b9072f0f2e4baad6caad47ed75a50050c8f2bbe1abf6b3233901d35b2b`, migrate `d79b8a6db08de44ef17110d15e6876f73e5b9751506f2757135e7dc7d95ebe7c`다. PR은 draft이며 main에 병합하지 않았다.

로컬 `validate-120-feature-map`은 고유 207 ID·기존 컴포넌트 대상 전수 PASS, 1002/1004·버전 경계 4건·config unit 18건·config typecheck/architecture 경계 PASS다. `validate-1005`는 P5의 최종 추적/릴리스 문서가 없어 P1에서 미실행/미통과이며, P5 완료 증거로 대체하지 않는다. 개발 서버 배포 스크립트가 같은 SHA로 정상 종료했고 checkout/BUILD_ID/공개 live·ready는 `1.2.0/dev/p1`, schema 1152, 네 서비스 healthy다. 공개 `/auth` 200·정확한 build label·production CSS 자산 PASS. 첫 CSS probe는 첫 파일만 검사한 시험 조건 오류로 FAIL이었고 모든 CSS 파일을 확인하도록 고쳐 재실행 PASS했다. 기존 DB·volume/secret 보존, 새 migration/API/화면 기능 없음. 물리 기기·OS IME·AT는 사용자 보류/미실행이다. P2의 opt-in Chroma 구현·실측 성능 기준과 P3/P4 기능/접근성 인수는 아직 PASS가 아니다.
