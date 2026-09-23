# 1.2.5 수용 기준 — 목록·검색·템플릿 비동기 안정성

> 2026-09-23 순서 개정: [1.1.7b 통합](../1.1.7.b/README.md)과 1.2.0 인수가 선행한다. WC 후보의 최초 포팅은 b가 소유하며 이 문서의 같은 작업은 b 해결 SHA·회귀 인수와 남은 범위만 수행한다. 미완료 원격 코드를 완료로 간주하지 않는다.

**계획 기준이며 아래 항목의 실행 결과는 모두 미확인이다.** 테스트 이름/명령은 실제 착수 시 현행 manifest와 대조해 정한다. 존재하지 않는 script가 이미 있다고 가정하지 않는다.

[버전 계획](README.md) · [공통 gate](../QUALITY-GATES.md) · [추적표](../REVIEW-TRACEABILITY.md)

| 수용 ID | 대상 | 통과 기준 | 상태 |
|---|---|---|---|
| `AC-RD-125-01` | 요청 세대 | A query 더 보기 지연→B query 첫 페이지 성공→A 응답 도착에서 B 결과가 오염되지 않는다. 검색/필터/정렬을 세 번 빠르게 변경해도 최신 loading/error만 표시하고 stale 응답을 버린다. | planned / 미실행 |
| `AC-RD-125-02` | 커서·재시도 | 다음 페이지 network/non2xx 실패는 재시도 cursor와 기존 목록을 보존한다. 중복 클릭·같은 cursor 응답·unmount 뒤 응답에서 중복/누락/잘못된 append가 없다. | planned / 미실행 |
| `AC-RD-125-03` | 템플릿 작업 | source=user에서 내 템플릿 복제 뒤 새 항목이 보이고 중복 생성되지 않는다. 복제/즐겨찾기/삭제 rejection·권한 변경·대상 삭제에 오류/재시도/초안 보존이 제공된다. | planned / 미실행 |
| `AC-RD-125-04` | 검색 접근 순서 | 서로 다른 자료형이 교차한 fixture에서 시각 그룹 순서와 DOM/방향키/Tab의 실제 링크 focus 순서가 일치한다. 기존 링크를 근거 없이 listbox 같은 복합 widget으로 바꾸지 않는다. loading/empty/error를 구별하고 실제 AT 인수는 별도 기록한다. | planned / 미실행 |
| `AC-RD-125-05` | 복귀 맥락 | 40번째 결과에서 문서 열기→back 시 query/type/filter·복원할 anchor와 필요한 페이지를 안전하게 회복한다. anchor 삭제·권한 소멸이면 현재 위치와 대안을 안내하고 stale 내용을 부활시키지 않는다. | planned / 미실행 |

## 판정과 증거

각 항목마다 `source SHA / 시험 계층 / 환경 / 합성 fixture / 실행 명령 / 실패 전 결과 / 수정 뒤 결과 / 증거 위치 / 남은 실기기·외부 gate / 담당`을 기록한다. REPRODUCED나 재현 스크립트 exit 0은 결함 발생 증거이며 수정 PASS가 아니다.

실제 구현은 정상·빈·오류·권한 없음·offline·모바일 중 영향받는 상태를 포함한다. 단위 fixture, 실제 HTTP/DB, 브라우저, 물리 OS/AT, 공개 개발 smoke를 서로 대체하지 않는다. 개인정보 없는 합성 입력을 사용하며 비공개 원문 로그는 공개 계획에 복사하지 않는다.

## 중단·되돌림 기준

공통 요청 helper는 소비 화면별로 점진 적용한다. rollback에서도 generation/cursor 보호를 제거하지 않으며 query cache로 다른 계정 자료를 보여주지 않는다. 새 index/keyset/preview API는 실제 측정과 별도 호환 근거가 있을 때만 추가한다.

원문 유실·거짓 저장·권한 확대·복구 불가가 확인되면 release blocker로 남긴다. 미실행 필수 검사를 PASS로 바꾸거나 후속 버전에 배정해 완료시키지 않는다. 실제 Phase 완료 절차는 공통 gate와 Agent.md를 함께 따른다.

## 비교 브랜치 추가 인수

아래 항목도 구현 완료 기준에 포함하며 현재는 모두 계획/미실행이다. 원격 PASS를 새 통합 SHA에 자동 승계하지 않는다.

- **[WC-07 — 목록 응답 세대·검색 표시/키보드 순서](../BRANCH-COMPARISON-118-P4.md)**: 4화면 후보와 회귀를 선별한다. song-link-manager까지 확대하고 items/count/cursor/filterOptions/orderVersion/loading/error가 최신 query 소유인지 확인한다.

- **[WC-08 — 목록 metadata·favorite·최근 검색·수동 순서 경쟁](../BRANCH-COMPARISON-118-P4.md)**: 서로 다른 필드/항목의 성공을 실패 rollback이 덮지 않고 빠른 반전·동시 삭제/clear·오래된 move 실패를 처리한다. 비manual view anchor와 duplicate의 lock 순서/replay를 실제 DB로 검사한다.
