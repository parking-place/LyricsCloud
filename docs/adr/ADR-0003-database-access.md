# ADR-0003 — PostgreSQL 접근, migration과 소유권

- 상태: Accepted
- 승인자·일시: 사용자, 2026-09-04
- 결정 Phase: 0.0.0 Phase 2

## 대안

1. 직접 SQL만 사용: 통제력은 높지만 반복 mapping과 타입 드리프트 부담이 크다.
2. Drizzle query builder + 명시적 SQL migration: 타입 지원과 SQL 검토 가능성을 함께 얻는다.
3. active-record ORM 자동 동기화: 편하지만 migration·RLS·복잡 검색이 숨겨질 수 있다.
4. DB 없이 파일 저장: 관계·검색·동시성·복구 요구를 충족하지 못한다.

## 권고 결정

`drizzle-orm`의 `node-postgres` adapter를 사용하되 schema 변경은 순서가 있는 SQL migration만 허용한다. 애플리케이션 transaction 시작 직후 `SET LOCAL app.user_id`를 설정하고 모든 사용자 자료는 `owner_id` 검사와 PostgreSQL RLS를 함께 적용한다. worker의 purge 같은 privileged 작업은 별도 DB role과 명령 경계를 사용한다.

각 migration은 forward SQL, 가능한 rollback 또는 복구 절차, clean-DB 재적용 테스트를 가진다. 자동 schema push를 preview/production에서 금지하며 migration runner는 PostgreSQL advisory lock으로 한 번만 실행한다.

## 검증·보안·철회

- 사용자 A/B 교차 ID, 검색, join, WebSocket projection을 pgTAP과 통합 테스트로 차단한다.
- transaction·savepoint·unique idempotency key와 migration rollback 예제를 둔다.
- Drizzle 교체 시 application repository port와 SQL migration은 유지한다.
