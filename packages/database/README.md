# Database package boundary

PostgreSQL schema, 순서가 있는 SQL migration, transaction, query와 사용자 소유권 강제를 담당합니다. ADR-0003에 따라 Drizzle의 `node-postgres` adapter를 사용하고 migration은 advisory lock, checksum, transaction으로 보호합니다.

`pnpm migrate`는 적용된 파일의 변경을 거부합니다. 0000 baseline은 검색에 사용할 `pg_trgm` 확장을 준비하고, 0100은 내부 사용자·OIDC 거래·외부 신원 매핑·opaque session 해시를 준비합니다. 0101은 profile과 `SET LOCAL` 사용자 context·강제 RLS 역할을 준비합니다. 0200은 공통 resource와 첫 subtype인 song의 1:1 무결성, validation, 목록 index, owner RLS와 soft delete를 준비합니다. `rollback/` SQL은 자동 실행 대상이 아닌 장애 복구 참고 자료입니다.

`fixtures/0200_resources_songs.sql`은 합성 UUID만 쓰는 disposable `*_test` DB 전용 대표 자료다. `pnpm test:migration:0200`은 별도 임시 DB에서 전체 migration 2회, fixture, 0200 rollback과 재적용을 검증한다.

readiness는 인증 실패, 시간 초과, 연결 불가, schema 미적용, 기타 query 실패를 안정된 코드로 구분하며 driver message나 connection URL을 공개하지 않습니다.

0300은 독립 가사와 활성 부모 곡의 owner FK·강제 RLS, 본문 100,000 codepoint·메모 10,000 제한, 생성/복제 공통 멱등 키와 삭제 작업 UUID를 추가합니다. `PostgresLyricStore`는 부모 row lock 후 현재 가사 row lock을 취해 곡 삭제·생성·복제·현재본 저장을 직렬화합니다. 저장은 `rowVersion` CAS로 보호하며 stale 요청은 `LyricConflictError`입니다. metadata와 subtype이 함께 변경되면 token은 한 요청에서 여러 번 증가할 수 있으므로 연속 번호가 아닌 불투명한 증가 token으로 사용합니다.

`rollback/0300_lyrics.sql`은 가사 또는 삭제 작업 UUID가 하나라도 남아 있으면 중단합니다. 비어 있는 테스트 DB만 down/reapply하고, 자료가 있는 환경은 스키마를 보존한 수정 migration을 우선합니다. 백업 복구가 필요하면 별도 DB에 검증된 전체 백업을 복원해 owner·본문·가사 수·삭제 batch를 확인한 후 runbook에 따라 전환하며 원본 DB를 지우지 않습니다.

0400은 `rhyme_note` resource의 1:1 본문 subtype, owner별 Unicode NFC·공백·대소문자 정규화 태그, owner-safe 태그와 곡 N:M 연결, 생성·복제 멱등 요청을 추가합니다. 공통 resource의 pin·favorite·color·row version을 그대로 사용하고 soft delete는 원본 subtype·태그·곡 연결을 보존한 채 일반 조회와 새 연결에서 숨깁니다. `PostgresRhymeStore`는 생성·수정·복제·삭제와 태그·곡 연결/해제를 owner transaction과 강제 RLS 아래 수행합니다.

`sync_documents.resource_type`은 0400부터 `lyrics | rhyme_note`이며 기존 0.3.1 snapshot·raw update·receipt·revision 저장 구조를 공유합니다. `rollback/0400_rhyme_notes.sql`은 라임·태그·곡 연결·라임 sync 자료가 하나라도 있으면 중단합니다. `pnpm test:migration:0400`은 빈 임시 DB에서 전진 적용, 정규화·owner FK, populated rollback guard, 기존 가사 보존과 재적용을 검사합니다.

0500은 `prompt` resource의 1:1 평문 subtype, owner별 토큰 dictionary와 순서형 무중복 읽기 projection, 생성·복제·업데이트 멱등 요청을 추가합니다. CRDT의 중복 occurrence는 사용자 정리 전까지 보존하지만 `prompt_tokens`는 정규화 키별 첫 표시 값만 유지합니다. dictionary의 사용 횟수·최근 사용은 owner별 자동완성에만 사용하며, prompt soft delete 뒤에도 과거 사용 이력은 보존합니다. `sync_documents.resource_type`은 `prompt`까지 확장됩니다.

0501은 프롬프트 전체 복사·재사용 횟수와 최근 사용 시각을 owner RLS 아래 원자적으로 기록합니다. 목록 query는 제목·평문 토큰·활성 연결 곡의 문자 그대로 부분 검색, 즐겨찾기·사용 이력·곡 조합 필터, 핀 우선 정렬과 서명된 offset cursor를 제공하며 다른 owner와 soft delete 자료를 count·후보에서도 제외합니다. `rollback/0501_prompt_usage.sql`은 사용 기록이 하나라도 있으면 중단합니다.
