# Architecture Decision Records

기술 ADR과 제품·운영 결정의 책임 구분은 [`Decision-Ownership.md`](<../../0.Plans/1. Dev-phase/Decision-Ownership.md>)를 기준으로 합니다.

## 상태

`Proposed → Accepted → Superseded` 순서로 관리합니다. 번호는 다시 사용하지 않습니다. 결정에는 맥락, 검토 대안, 선택, 결과, 검증 방법, 되돌림 비용을 포함합니다.

## 0.0.0에서 먼저 결정할 항목

| ADR | 결정 대상 | 반드시 만족할 선택 |
|---|---|---|
| ADR-0001 | 자체 운영 애플리케이션 토폴로지와 workspace | DEC-01-D, DEC-10-C |
| ADR-0002 | Google OIDC, 세션, 초대·허용 목록 | DEC-02-A, DEC-09-A |
| ADR-0003 | PostgreSQL 접근·migration·소유권/RLS | 모든 자료의 사용자 격리 |
| ADR-0004 | 자동 병합의 사용자 범위와 CRDT 문서 의미 | DEC-02-A, DEC-06-C |
| ADR-0005 | CRDT transport·영속화·평문 투영·snapshot | DEC-03-A, DEC-04-A, DEC-06-C, DEC-07-A |
| ADR-0006 | 프록시, TLS, WebSocket 전달, 운영 지역 | DEC-10-C |
| ADR-0007 | PWA와 계정별 로컬 저장·업데이트 | DEC-04-A |
| ADR-0008 | 백업 암호화·보관·복원 환경 | DEC-12-A |
| ADR-0009 | 오류·성능 관측과 창작물 본문 제거 | DEC-11-A |

ADR가 Accepted 되기 전에는 해당 선택에 종속되는 package manifest나 운영 설정을 확정하지 않습니다.
