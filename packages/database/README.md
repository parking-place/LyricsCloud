# Database package boundary

PostgreSQL schema, 순서가 있는 SQL migration, transaction, query와 사용자 소유권 강제를 담당합니다. ADR-0003에 따라 Drizzle의 `node-postgres` adapter를 사용하고 migration은 advisory lock, checksum, transaction으로 보호합니다.

`pnpm migrate`는 적용된 파일의 변경을 거부합니다. 0000 baseline은 검색에 사용할 `pg_trgm` 확장을 준비하고, 0100은 내부 사용자·OIDC 거래·외부 신원 매핑·opaque session 해시를 준비합니다. 0101은 profile과 `SET LOCAL` 사용자 context·강제 RLS 역할을 준비합니다. 0200은 공통 resource와 첫 subtype인 song의 1:1 무결성, validation, 목록 index, owner RLS와 soft delete를 준비합니다. `rollback/` SQL은 자동 실행 대상이 아닌 장애 복구 참고 자료입니다.

`fixtures/0200_resources_songs.sql`은 합성 UUID만 쓰는 disposable `*_test` DB 전용 대표 자료다. `pnpm test:migration:0200`은 별도 임시 DB에서 전체 migration 2회, fixture, 0200 rollback과 재적용을 검증한다.

readiness는 인증 실패, 시간 초과, 연결 불가, schema 미적용, 기타 query 실패를 안정된 코드로 구분하며 driver message나 connection URL을 공개하지 않습니다.
