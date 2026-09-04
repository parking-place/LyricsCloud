# Architecture Decision Records

기술 ADR과 제품·운영 결정의 책임 구분은 [`Decision-Ownership.md`](<../../0.Plans/1. Dev-phase/Decision-Ownership.md>)를 기준으로 합니다.

## 상태

`Proposed → Accepted → Superseded` 순서로 관리합니다. 번호는 다시 사용하지 않습니다. 결정에는 맥락, 검토 대안, 선택, 결과, 검증 방법, 되돌림 비용을 포함합니다.

## 0.0.0에서 먼저 결정할 항목

| ADR | 결정 대상 | 권고안 | 상태 |
|---|---|---|---|
| [ADR-0001](./ADR-0001-runtime-topology.md) | 자체 운영 애플리케이션 토폴로지와 workspace | pnpm workspace, Next.js standalone, collaboration·worker 분리 | Accepted |
| [ADR-0002](./ADR-0002-auth-session.md) | Google OIDC, 세션, 초대·허용 목록 | openid-client, 서버 DB session, provider token 비저장 | Accepted |
| [ADR-0003](./ADR-0003-database-access.md) | PostgreSQL 접근·migration·소유권/RLS | Drizzle query builder + 검토 가능한 SQL migration | Accepted |
| [ADR-0004](./ADR-0004-collaboration-scope.md) | 자동 병합의 사용자 범위와 CRDT 문서 의미 | 같은 owner의 기기·탭만, resource당 문서 하나 | Accepted |
| [ADR-0005](./ADR-0005-crdt-persistence.md) | CRDT transport·영속화·평문 투영·snapshot | Yjs + y-codemirror.next, 전용 WebSocket protocol | Accepted |
| [ADR-0006](./ADR-0006-proxy-tls.md) | 프록시, TLS, WebSocket 전달, 운영 지역 | Caddy TLS 종료·reverse proxy | Accepted |
| [ADR-0007](./ADR-0007-pwa-local-data.md) | PWA와 계정별 로컬 저장·업데이트 | Workbox + Dexie, dirty 문서 update gate | Accepted |
| [ADR-0008](./ADR-0008-backup-restore.md) | 백업 암호화·보관·복원 환경 | pg_dump custom + age, 별도 저장소 30일 | Accepted |
| [ADR-0009](./ADR-0009-observability.md) | 오류·성능 관측과 창작물 본문 제거 | OpenTelemetry server allowlist, browser 비활성 시작 | Accepted |

ADR가 Accepted 되기 전에는 해당 선택에 종속되는 package manifest나 운영 설정을 확정하지 않습니다.

2026-09-04 사용자가 9개 권고안을 검토 후 계속 진행하도록 승인하여 모두 `Accepted`로 확정했습니다.
