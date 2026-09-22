# 1.2.3 — 인증·세션·API 재시도 계약

**상태: 계획 / 구현 미착수 (`planned`)** · 작성일 2026-09-22.

일시 로그인 장애의 회복, 세션과 cookie 수명 일치, 공개 링크 발급 재시도와 Unicode 삭제 확인을 실제 HTTP 계약까지 마무리한다.

리뷰 근거는 2026-09-22의 `v1.1.7a` (`fc2463cdb47d9fd7d0042779f602c6ddb7d734cf`)이며 이 버전 후보에서 재현한 결과가 아니다. 실제 P1에서 선행 인수 SHA에 다시 대조한다. [전체 순서](../ROADMAP.md) · [항목 추적](../REVIEW-TRACEABILITY.md) · [공통 품질·완료 계약](../QUALITY-GATES.md).

## 범위·선행조건

- 리뷰 연결: **BE-01, BE-02, BE-03, BE-04; UX-01/17/23; 코드 리뷰 §5.2 오류 분류 후보**.
- 선행 입력: 선행 버전 인수와 기존 auth/owner/RLS/receipt 계약. BE-01은 다른 편집 변경과 기술적으로 독립적이며 1.2.0 차단 재확인에서 먼저 해소될 수 있다.
- 1.2.0에서 이미 해결된 문제는 해결 SHA·실제 회귀를 인수한다. 미해결 P1을 후속 배정만으로 출시 허용하지 않는다.
- 실제 구현 순서는 앞 버전과 앞 Phase의 인수 뒤 진행한다. 이 문서는 제품 구현·main 병합·릴리스 서버 변경 승인이 아니다.
- 1.1.8~1.1.14 네이티브 계획은 계속 보류한다. 기존 승인·완료·발행 기록을 유지한다.

## Phase별 계획

| Phase | 목적 | 작업 수 |
|---|---|---:|
| [P1 — 인증·응답·receipt 계약 인수](1phase.md) | 네 재현과 추가 확인 후보를 실제 endpoint 기대값으로 분리한다. | 5 |
| [P2 — 로그인 자동 회복·세션 연장](2phase.md) | 같은 프로세스와 실제 응답 경로에서 인증 복구를 확인한다. | 5 |
| [P3 — 공개 링크 재시도·Unicode·오류 응답](3phase.md) | 생성/재시도/삭제의 논리 입력 의미를 일관되게 만든다. | 5 |
| [P4 — 실제 HTTP·DB 경쟁·브라우저 인수](4phase.md) | 대역에서 발견한 문제를 실제 저장/응답으로 닫는다. | 5 |
| [P5 — API 문서·최종 인수·UX 인계](5phase.md) | 재시도 가능성과 복구 행동을 호출자와 UI에 전달한다. | 5 |

총 **5 Phase / 25개 작업**. 모든 구현 체크는 미완료다. [수용 기준](ACCEPTANCE.md)은 각 구현 Phase에서 먼저 검증하고 마지막 Phase에서 증거를 봉인한다.

## 예상 책임 경로

현재 기준 경로이며 착수 SHA에서 실제 파일과 담당자를 다시 확인한다. 경로 열거는 해당 폴더 전체 리팩터링 허가가 아니다.

- [packages/auth/src](../../../packages/auth/src)
- [packages/database/src](../../../packages/database/src)
- [packages/domain/src](../../../packages/domain/src)
- [apps/web/src/lib](../../../apps/web/src/lib)
- [apps/web/src/app/api](../../../apps/web/src/app/api)
- [tests/e2e](../../../tests/e2e)

## 데이터·권한·되돌림

기존 receipt/hash·세션/쿠키 형식의 읽기 호환을 유지한다. replay를 위해 token 원문을 저장하거나 자동 회전하지 않는다. 캐시 무효화를 되돌릴 때 실패 고착을 재도입하지 않으며 세션 연장 경로가 사라지는 후보는 배포하지 않는다.

DB/API/protocol 변경이 필요한 경우 P1에서 이전 client·populated schema·반복 migration·application rollback을 구체화한다. 파괴 migration과 기존 자료 삭제는 이 계획으로 승인하지 않는다. 창작물은 순수 텍스트로 유지하고 로그/관측에 본문·제목·검색어·token·사진을 넣지 않는다.

## 인계

[실행 STATUS](<../../1. Dev-phase/STATUS.md>)의 현재 버전은 이 계획 작성으로 바꾸지 않는다. 실제 착수 시 owner/source SHA/Phase 경계를 등록하고 수용표의 실행 환경·fail→pass·미실행을 기록한다. 날짜나 기간을 임의로 약속하지 않고 gate 충족 순서로 진행한다.

## 1.1.8 P4 웹 안정화 후보 인수

[브랜치 비교표](../BRANCH-COMPARISON-118-P4.md)의 WC-13를 해당 Phase 작업과 수용표에 포함한다. 이미 존재하는 수정 후보를 출발점으로 삼되 필요한 의존성만 가져오고 새 1.2.x SHA에서 인수한다. native/1.1.8 metadata와 이전 계획 문서를 통째로 가져오지 않는다.
