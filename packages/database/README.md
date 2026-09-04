# Database package boundary

PostgreSQL schema, 순서가 있는 SQL migration, transaction, query와 사용자 소유권 강제를 담당합니다. ADR-0003에 따라 Drizzle의 `node-postgres` adapter를 사용하고 migration은 advisory lock, checksum, transaction으로 보호합니다.

`pnpm migrate`는 적용된 파일의 변경을 거부합니다. 0000 baseline은 검색에 사용할 `pg_trgm` 확장만 준비하며 업무 테이블은 만들지 않습니다.

readiness는 인증 실패, 시간 초과, 연결 불가, schema 미적용, 기타 query 실패를 안정된 코드로 구분하며 driver message나 connection URL을 공개하지 않습니다.
