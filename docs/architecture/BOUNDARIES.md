# 모듈 경계와 의존 방향

ADR-0001~0009가 승인한 0.0.0 기준선이다.

```text
apps/web ───────────┐
apps/collaboration ─┼─> application ports ─> packages/domain
apps/worker ────────┘          │
                               ├─> packages/database (PostgreSQL adapter)
                               ├─> auth/collaboration/local-store adapters
                               └─> packages/config

packages/ui ─> packages/domain의 표시용 타입만 소비
packages/editor ─> packages/domain의 문서 타입만 소비
infra ─> apps의 실행·health 계약만 소비
```

`domain`은 Next.js, PostgreSQL driver, Drizzle, OIDC, Yjs, Dexie, Workbox, Caddy를 import하지 않는다. 앱과 adapter가 domain port를 구현하며 인프라 교체가 도메인 규칙을 바꾸지 않게 한다. `scripts/check-boundaries.mjs`가 금지 import를 검사한다.

## 실행 단위

| 단위 | 책임 | liveness | readiness |
|---|---|---|---|
| web | 반응형 UI, HTTP, OIDC callback | `/api/health/live` | `/api/health/ready` |
| collaboration | 인증된 문서 WebSocket 경계 | `/health/live` | `/health/ready` |
| worker | purge·revision·projection 작업 경계 | `/health/live` | `/health/ready` |
| postgres | 최신본, update, revision, 검색 projection | `pg_isready` | migration version query |

## 환경 실패 계약

필수 키 누락, URL 형식 오류, 허용되지 않은 환경 이름은 프로세스 시작 전에 `CONFIG_INVALID`와 잘못된 **키 이름만** 반환한다. 값은 오류·로그에 포함하지 않는다. liveness는 프로세스가 요청을 처리하면 200이고, readiness는 DB 연결 또는 migration 준비가 안 되면 503이다.
