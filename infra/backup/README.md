# Backup boundary

[`ADR-0008`](../../docs/adr/ADR-0008-backup-restore.md)에 따라 `pg_dump --format=custom` stdout을 age recipient로 바로 암호화한다. 평문 dump는 파일로 만들지 않는다.

- `backup.sh`: 일관된 논리 dump, age 암호화, ciphertext SHA-256 manifest, 원자 발행, 30일 멱등 정리
- `restore.sh`: ciphertext와 manifest 검증, 별도 빈 `_restore` DB 복원, schema·행·RLS·검색 index·CRDT 관계 검사
- `check-rpo.sh`: 마지막 성공 백업의 24시간 RPO와 크기·checksum 상태를 내용 없는 metric으로 확인
- `Dockerfile`: digest 고정 Go 1.26.8로 공식 age 1.3.2 source를 빌드해 PostgreSQL 18 client와 담은 non-root 실행 이미지
- `systemd/`: 매일 실행하는 oneshot service와 persistent timer 기준

`compose.backup.yaml`은 `BACKUP_REPOSITORY_PATH`를 host bind로 받는다. 이 경로는 checkout, PostgreSQL volume, Docker의 `backup_data` volume이 아니라 운영자가 별도로 마운트한 외부 저장소여야 한다. `.lyricscloud-backup-storage-id`의 값이 환경의 `BACKUP_STORAGE_ID`와 일치하지 않으면 쓰기를 거부한다.

age recipient는 DB 호스트에 둘 수 있지만 private identity는 둘 수 없다. identity는 복구 담당자의 별도 시스템에 mode `600` 이하로 보관하고 restore 때만 읽기 전용으로 주입한다. PostgreSQL password, recipient, identity 원문을 image·Git·로그·manifest에 기록하지 않는다. 상세 설치·훈련·실패·rollback 순서는 [`backup-restore-upgrade.md`](../../docs/runbooks/backup-restore-upgrade.md)를 따른다.
