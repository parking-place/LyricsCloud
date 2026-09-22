# 1.2.4 — 백업·프록시·운영 복구와 관측

**상태: 계획 / 구현 미착수 (`planned`)** · 작성일 2026-09-22.

비정상 종료 뒤 백업을 다시 실행할 수 있게 하고, 프록시 신뢰/요청 크기와 worker·health의 실제 운영 계약을 검증한다.

리뷰 근거는 2026-09-22의 `v1.1.7a` (`fc2463cdb47d9fd7d0042779f602c6ddb7d734cf`)이며 이 버전 후보에서 재현한 결과가 아니다. 실제 P1에서 선행 인수 SHA에 다시 대조한다. [전체 순서](../ROADMAP.md) · [항목 추적](../REVIEW-TRACEABILITY.md) · [공통 품질·완료 계약](../QUALITY-GATES.md).

## 범위·선행조건

- 리뷰 연결: **OPS-01, OPS-02, OPS-03, M-04, M-05; 코드 리뷰 §5.3/5.5 운영 제안**.
- 선행 입력: 선행 버전 인수, 승인된 환경/runbook. OPS-02는 실제 배포 경계 확인 전 조건부 위험이며 OPS-100-001 기존 외부 백업 예외를 자동 해소하지 않는다.
- 1.2.0에서 이미 해결된 문제는 해결 SHA·실제 회귀를 인수한다. 미해결 P1을 후속 배정만으로 출시 허용하지 않는다.
- 실제 구현 순서는 앞 버전과 앞 Phase의 인수 뒤 진행한다. 이 문서는 제품 구현·main 병합·릴리스 서버 변경 승인이 아니다.
- 1.1.8~1.1.14 네이티브 계획은 계속 보류한다. 기존 승인·완료·발행 기록을 유지한다.

## Phase별 계획

| Phase | 목적 | 작업 수 |
|---|---|---:|
| [P1 — 환경·조건부 위험·연결 예산 계약](1phase.md) | 실제로 배포할 토폴로지와 장애 판정 근거를 먼저 확인한다. | 5 |
| [P2 — 비정상 종료 잠금·격리 복원](2phase.md) | 백업 재개와 정상 동시 배제를 함께 지킨다. | 5 |
| [P3 — 프록시 신뢰·업로드 경계](3phase.md) | 실제 경유 요청에서 헤더와 본문 상한을 확인한다. | 5 |
| [P4 — worker·health·연결 수와 장애 신호](4phase.md) | 정상 ping 뒤에 숨은 작업 실패를 드러내고 비용을 측정한다. | 5 |
| [P5 — 운영 절차·최종 개발 인수](5phase.md) | 설정 예시와 실제 검증 상태를 구분해 인계한다. | 5 |

총 **5 Phase / 25개 작업**. 모든 구현 체크는 미완료다. [수용 기준](ACCEPTANCE.md)은 각 구현 Phase에서 먼저 검증하고 마지막 Phase에서 증거를 봉인한다.

## 예상 책임 경로

현재 기준 경로이며 착수 SHA에서 실제 파일과 담당자를 다시 확인한다. 경로 열거는 해당 폴더 전체 리팩터링 허가가 아니다.

- [infra/backup](../../../infra/backup)
- [infra/proxy](../../../infra/proxy)
- [apps/worker/src](../../../apps/worker/src)
- [packages/database/src](../../../packages/database/src)
- [apps/web/src/lib/request-security.ts](../../../apps/web/src/lib/request-security.ts)
- [apps/web/src/proxy.ts](../../../apps/web/src/proxy.ts)
- [packages/observability/src](../../../packages/observability/src)
- [scripts/tests](../../../scripts/tests)

## 데이터·권한·되돌림

백업 잠금을 단순 시간 경과로 삭제하지 않는다. 잠금 구현과 파일시스템 보장을 검증하고 rollback 때 진행 중 백업의 소유권을 침범하지 않는다. 프록시 변경은 승인된 개발 환경에서 검증 후 적용하며 실패 시 직전 검증 설정으로 복구한다. 기존 archive·DB volume·외부 백업 예외는 그대로 보존한다.

DB/API/protocol 변경이 필요한 경우 P1에서 이전 client·populated schema·반복 migration·application rollback을 구체화한다. 파괴 migration과 기존 자료 삭제는 이 계획으로 승인하지 않는다. 창작물은 순수 텍스트로 유지하고 로그/관측에 본문·제목·검색어·token·사진을 넣지 않는다.

## 인계

[실행 STATUS](<../../1. Dev-phase/STATUS.md>)의 현재 버전은 이 계획 작성으로 바꾸지 않는다. 실제 착수 시 owner/source SHA/Phase 경계를 등록하고 수용표의 실행 환경·fail→pass·미실행을 기록한다. 날짜나 기간을 임의로 약속하지 않고 gate 충족 순서로 진행한다.

## 1.1.8 P4 웹 안정화 후보 인수

[브랜치 비교표](../BRANCH-COMPARISON-118-P4.md)의 WC-14, WC-17를 해당 Phase 작업과 수용표에 포함한다. 이미 존재하는 수정 후보를 출발점으로 삼되 필요한 의존성만 가져오고 새 1.2.x SHA에서 인수한다. native/1.1.8 metadata와 이전 계획 문서를 통째로 가져오지 않는다.
