# 1.1.7 Phase 5 — 웹 인수·플랫폼 개발안 인계

상태: **완료** (`complete`). P4 완료 merge `bdc7eecb3e4f681108e6683a31308de6a13f923a`를 기준으로 `NF-REQ-039`의 이번 Phase 범위만 수행했다. 후보 `b1a1e2c17b4385ed2d9acb267664197692186897`의 두 필수 CI·네 signed dev image·동일 SHA 개발 공개 인수를 완료했다. 실제 SDK/OS/기기·서명/스토어 gate는 별도 증거 없이 완료로 표시하지 않는다.

## 선행조건과 담당 경계

[P4](4phase.md)의 실제 산출물과 [결정 권한](../Decision-Ownership.md)을 인수한다. [세부 계약](../contracts/DESIGN-NATIVE.md)을 따른다. 정확한 파일·SDK·명령은 착수 때 기존 구조 안에서 확정한다. 입력은 승인 범위·source SHA·fixture·실제 환경, 출력은 아래 산출물·수용 증거·미실행과 다음 단계 조건이다. 공통 파일은 한 작성자만 맡는다.

## 작업 체크리스트

- [x] `LC-NF-1.1.7-P5-01` 현재 사용자 안내와 PC/iOS/Android별 목업 상태·탐색 문서를 갱신한다. — user guide와 new_Mock-up 행렬/interaction에 exact 복귀·query·focus·접근성 fallback과 browser 대리/native 미실행 경계를 연결했다.
- [x] `LC-NF-1.1.7-P5-02` CI·동일 SHA 개발 공개 smoke로 동선 인수를 마무리한다. — Actions `34900342849`·`34900363577`, 네 signed dev image와 exact SHA 개발 서버에서 공개 저장·복귀·접근성 fallback·서비스 재시작 영속성을 PASS했다.
- [x] `LC-NF-1.1.7-P5-03` Windows/Linux/macOS/Android/iOS 개발안의 공통 계약과 OS별 차이를 인계하되 SDK/패키징/스토어를 자동 확정하지 않는다. — 공통 CodeMirror/Yjs·URL·저장/권한/복구 계약과 플랫폼별 최초 결정·실제 gate를 `1.1.7-PLATFORM-HANDOFF.md`에 분리했다.

## 수용 기준

`AC-1.1.7-05`: 승인 UI 동선이 네이티브 개발안의 입력으로 명확히 연결된다.

## 로컬 후보 증거

- P4 제품 source `66f2f79967828ca40237a0d7a241d6da54094d37`와 완료 merge `bdc7eecb3e4f681108e6683a31308de6a13f923a`를 입력으로 삼았고 P5에서 제품 UI/API/DB/migration 동작을 바꾸지 않았다.
- 1.1.7 release environment, 29개 migration checksum, dependency/Noto Sans KR license와 digest-only image placeholder를 네 artifact에 봉인했다.
- Node 24.20.0에서 architecture boundary, release artifact/final/document/environment 검증, 11 workspace package TypeScript와 production build를 통과했다. 1.1.7 계약 6건도 PASS했다.
- 후보 `b1a1e2c17b4385ed2d9acb267664197692186897`의 push/PR Actions `34900342849`·`34900363577`가 전체 PASS했다. 실제 PostgreSQL Vitest 376 PASS·4 조건부 skip, Chromium 전체 E2E 379 PASS·43 조건부 skip, release browser matrix 10 PASS였다. push 첫 시도의 migration DB pool 종료 정리 `57P01`은 제품/데이터 실패 없이 같은 SHA failed job 재실행에서 통과했다.
- 네 개발 image digest는 web `sha256:561af3d1e1cb94ffcff6a3c6124155e4a850ee8ce39b4b2aff4980acffbdf25e`, collaboration `sha256:f17f63533769217aed613520b995c06fcea6fc2f74aebf1cf6cc894bc3b1de9b`, worker `sha256:fe8941b11d946d4c1c0a85a78f3f1c1d0d25aa966651061f6c99e786b96028fa`, migrate `sha256:62a40617494fcb66e801804bc13bedc77bd4283aee2b479808034656f117e895`다. 서비스별 source SHA·`dev-1.1.7-p5`·`Dev`·`Dev-latest`가 같은 digest이며 signature/provenance를 검증했다.
- 같은 SHA 개발 서버의 `1.1.7/dev/p5`, schema `1140_sharing_stability.sql`, B-1 root와 네 서비스 healthy를 확인했다. 공개 Chromium에서 reduced motion·720px reflow·forced colors·dialog focus·4배 CPU mobile 저장을 PASS했고 web/collaboration/worker 재시작 뒤 API·CRDT·revision exact 원문·목록 복귀·build/schema를 재확인했다. 합성 fixture를 제거했으며 DB volume·secret·allowlist를 보존했다.
- 실제 native SDK·앱·OS/기기·IME/AT/zoom·패키징·서명·스토어는 실행하지 않았고 Chromium/WebKit mobile을 native PASS로 표시하지 않는다.

## 검증·완료·인계

- [x] 위 작업과 수용 기준에 실제 증거·환경·SHA를 연결하고 실패/미실행을 기록했다.
- [x] 원문·인가·복구·기존 사용자 계약을 유지하고 [품질 게이트](../QUALITY-GATES.md)의 영향 검사만 수행했다. 같은 성공 결과를 반복하지 않았다.
- [x] 설계/문서 단계는 검토와 결정 증거로, 구현 단계는 필수 CI·동일 SHA 개발 공개 smoke로 인수하고 플랫폼별 실제 앱은 미실행으로 분리했다.
- [x] [Future 검수](../FUTURE-INTAKE.md)를 push 전/Phase 완료 시 대조하고 같은 변경은 이전 기록을 참조했다.
- [x] SDK/외부 제공·실제 OS/기기·서명/스토어·release gate의 상태를 숨기지 않았다.

[1.1.8](../1.1.8/README.md)에 산출물·지원 범위·계약·남은 gate를 전달한다. 모든 배정 Phase 인수 뒤에도 main/release 서버 변경은 [릴리스 정책](../RELEASE-POLICY.md)의 별도 현재 승인을 따른다.
