# 1.2.2 — 프롬프트 동시 편집·IME·태그 무결성

**상태: 계획 / 구현 미착수 (`planned`)** · 작성일 2026-09-22.

전체 문자열 치환, IME 원격 대기열, 태그 동시 이동과 변환 확인 경쟁을 별도 경계로 고쳐 원문과 서버 수용 계약을 맞춘다. CRDT 호환 작업을 분리하기 위해 이 버전은 6 Phase로 구성한다.

리뷰 근거는 2026-09-22의 `v1.1.7a` (`fc2463cdb47d9fd7d0042779f602c6ddb7d734cf`)이며 이 버전 후보에서 재현한 결과가 아니다. 실제 P1에서 선행 인수 SHA에 다시 대조한다. [전체 순서](../ROADMAP.md) · [항목 추적](../REVIEW-TRACEABILITY.md) · [공통 품질·완료 계약](../QUALITY-GATES.md).

## 범위·선행조건

- 리뷰 연결: **ES-01, ES-02, ES-03, ES-04, UI-02; UX-08/10/11; M-08 일부**.
- 선행 입력: 1.2.1의 입력 보관·readiness·실패 상태 API와 1.2.0 CodeMirror/Yjs 보존 계약. 새 라이브러리나 저장 프로토콜 교체는 기본 범위가 아니다.
- 1.2.0에서 이미 해결된 문제는 해결 SHA·실제 회귀를 인수한다. 미해결 P1을 후속 배정만으로 출시 허용하지 않는다.
- 실제 구현 순서는 앞 버전과 앞 Phase의 인수 뒤 진행한다. 이 문서는 제품 구현·main 병합·릴리스 서버 변경 승인이 아니다.
- 1.1.8~1.1.14 네이티브 계획은 계속 보류한다. 기존 승인·완료·발행 기록을 유지한다.

## Phase별 계획

| Phase | 목적 | 작업 수 |
|---|---|---:|
| [P1 — 연산·충돌·호환 계약](1phase.md) | 편집 기준점과 서버의 raw 수용 규칙을 먼저 확정한다. | 5 |
| [P2 — 문장·제목 부분 연산과 IME](2phase.md) | 일반 타이핑을 기준점에 연결한 변경 연산으로 처리한다. | 5 |
| [P3 — 태그 이동 수렴·기존 거절 문서 복구](3phase.md) | 클라이언트가 만든 원본을 서버가 일관되게 받아들이도록 한다. | 5 |
| [P4 — 안전한 형식 전환·템플릿 초안](4phase.md) | 미리보기와 실제 변환 사이에 원문이 바뀌면 재확인을 요구한다. | 5 |
| [P5 — 동시성·실제 입력·호환 종합 인수](5phase.md) | 실패 재현을 브라우저·서버·실기기 경계로 확장한다. | 5 |
| [P6 — 호환 문서·최종 인수·후속 연결](6phase.md) | CRDT 변경을 되돌리거나 이어받을 수 있는 근거를 남긴다. | 5 |

총 **6 Phase / 30개 작업**. 모든 구현 체크는 미완료다. [수용 기준](ACCEPTANCE.md)은 각 구현 Phase에서 먼저 검증하고 마지막 Phase에서 증거를 봉인한다.

## 예상 책임 경로

현재 기준 경로이며 착수 SHA에서 실제 파일과 담당자를 다시 확인한다. 경로 열거는 해당 폴더 전체 리팩터링 허가가 아니다.

- [packages/editor/src](../../../packages/editor/src)
- [packages/domain/src](../../../packages/domain/src)
- [apps/collaboration/src](../../../apps/collaboration/src)
- [packages/database/src](../../../packages/database/src)
- [apps/web/src/components](../../../apps/web/src/components)
- [tests/e2e](../../../tests/e2e)

## 데이터·권한·되돌림

CRDT 원본·snapshot·기존 outbox와 구 클라이언트 update 호환을 먼저 고정한다. 포맷 변경 시 순방향 migration/호환 reader와 application rollback을 검증하고 불가역 변환은 별도 결정 전 실행하지 않는다. 서버 validator를 완화하거나 remote update를 버려 되돌리지 않는다.

DB/API/protocol 변경이 필요한 경우 P1에서 이전 client·populated schema·반복 migration·application rollback을 구체화한다. 파괴 migration과 기존 자료 삭제는 이 계획으로 승인하지 않는다. 창작물은 순수 텍스트로 유지하고 로그/관측에 본문·제목·검색어·token·사진을 넣지 않는다.

## 인계

[실행 STATUS](<../../1. Dev-phase/STATUS.md>)의 현재 버전은 이 계획 작성으로 바꾸지 않는다. 실제 착수 시 owner/source SHA/Phase 경계를 등록하고 수용표의 실행 환경·fail→pass·미실행을 기록한다. 날짜나 기간을 임의로 약속하지 않고 gate 충족 순서로 진행한다.

## 1.1.8 P4 웹 안정화 후보 인수

[브랜치 비교표](../BRANCH-COMPARISON-118-P4.md)의 WC-02, WC-06, WC-09를 해당 Phase 작업과 수용표에 포함한다. 이미 존재하는 수정 후보를 출발점으로 삼되 필요한 의존성만 가져오고 새 1.2.x SHA에서 인수한다. native/1.1.8 metadata와 이전 계획 문서를 통째로 가져오지 않는다.
