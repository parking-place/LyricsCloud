# ADR-0008 — 암호화 논리 백업과 복원

- 상태: Accepted
- 승인자·일시: 사용자, 2026-09-04
- 결정 Phase: 0.0.0 Phase 2
- 입력: DEC-12-A

## 대안

1. `pg_dump -Fc` + age recipient encryption + 별도 저장소: 단순하고 복원 선택성이 높다.
2. 파일시스템 volume snapshot만 사용: DB 일관성과 이식성이 약하다.
3. 백업 없음: DEC-12-A를 충족하지 못한다.

## 권고 결정

worker와 분리된 backup job이 하루 1회 `pg_dump --format=custom`을 실행하고 stdout을 즉시 age recipient로 암호화한다. 평문 dump를 디스크에 남기지 않는다. 암호화 파일과 manifest(schema version, 생성 시각, checksum, tool version)을 DB 호스트와 다른 저장소에 30일 보존한다.

복호화 private key는 저장소·DB 호스트와 분리하고 복구 담당자가 관리한다. 월 1회 별도 PostgreSQL 환경에 restore하여 migration version, row count, owner 격리, CRDT snapshot→평문 projection, 검색을 확인한다. 목표 RPO는 24시간이며 RTO는 첫 복원 훈련에서 측정 후 OPS 결정으로 확정한다.

## 검증·보안·철회

- DB 호스트 상실, backup 저장소 상실, key 상실을 별도 사건으로 다룬다.
- checksum·복호화·`pg_restore --list`·전체 smoke가 모두 성공해야 유효 백업이다.
- 다른 암호화/저장소로 이관할 때 겹치는 보존 기간과 실제 복원 검증을 둔다.
