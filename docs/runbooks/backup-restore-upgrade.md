# 암호화 backup·격리 restore·upgrade·rollback runbook

기준은 Accepted [`ADR-0008`](../adr/ADR-0008-backup-restore.md)과 [`OPS-0002`](../operations/OPS-0002-artifact-verification.md)다. 모든 명령은 대상 environment와 SHA를 먼저 확인하고 실행한다. 실제 제목·본문·검색어·사용자 식별자를 출력하지 않는다.

## 1. 설치와 경계

1. checkout·PostgreSQL volume과 다른 호스트 또는 별도 마운트에 `/mnt/lyricscloud-backup`을 준비한다. DB host 상실과 같은 사건으로 사라지는 로컬 Docker volume은 허용하지 않는다.
2. 저장소 root에 mode `0600`인 `.lyricscloud-backup-storage-id`를 만들고 `/etc/lyricscloud/backup.env`의 `BACKUP_STORAGE_ID`와 같은 안전한 식별자를 기록한다. `docker compose -f compose.yaml -f compose.backup.yaml --profile backup run --rm --entrypoint id backup`으로 확인한 container uid/gid에만 저장소 쓰기 권한을 부여한다.
3. `/etc/lyricscloud/secrets/postgres_backup_password`와 public age recipient를 mode `0400`으로 둔다. age private identity는 이 호스트, backup 저장소, Git, image에 두지 않고 복구 담당자의 별도 시스템에 mode `0600` 이하로 보관한다.
4. `.env.example`의 backup 변수를 운영 환경 파일에 옮긴다. `BACKUP_REPOSITORY_PATH`는 외부 저장소 절대 경로, 보존은 30일, RPO는 24시간으로 유지한다.
5. `infra/backup/systemd/`의 unit·timer를 `/etc/systemd/system/`에 설치하고 `systemctl daemon-reload && systemctl enable --now lyricscloud-backup.timer`를 실행한다. `systemctl list-timers lyricscloud-backup.timer`에서 다음 일 1회 실행을 확인한다.

중단 조건은 경로 marker 불일치, 저장소 쓰기 불가, secret 누락·권한 과다, 사용 가능 공간 하한 미달, DB readiness 실패다. 이 경우 backup은 부분 파일을 제거하고 기존 정상 archive를 보존한다.

## 2. 수동 backup과 RPO 확인

검증된 정확한 checkout에서 다음을 실행한다.

```bash
docker compose --env-file .env -f compose.yaml -f compose.backup.yaml --profile backup run --rm backup
docker compose --env-file .env -f compose.yaml -f compose.backup.yaml --profile backup run --rm --entrypoint /usr/local/bin/lyricscloud-check-rpo backup
```

성공하면 `lyricscloud-<UTC>-<run>.dump.age`, 같은 이름의 manifest, `last-success.json`이 원자적으로 생긴다. manifest에는 schema version, 생성 시각, ciphertext 크기·SHA-256, 도구·application version만 포함한다. `backup_age_seconds <= 86400`, `backup_checksum_verified=1`을 확인한다. 30일보다 오래된 archive와 manifest는 성공 backup 뒤 멱등 삭제되고 삭제 건수만 기록된다.

`backup_failed`, 24시간 RPO 초과, 크기 급감 또는 checksum 실패 시 신규 배포를 중단한다. 원문을 열지 말고 storage mount·용량·DB readiness·recipient 파일 순서로 확인한 후 단일 재시도한다. 자세한 경보 절차는 [`observability-alerts.md#backup-failure`](./observability-alerts.md#backup-failure)를 따른다.

### rpo-exceeded

`BACKUP_RPO_EXCEEDED`가 발생하면 마지막 성공 시각과 현재 시각만 대조한다. 저장소 또는 DB 장애를 먼저 해소하고 수동 backup과 checksum 검증을 통과할 때까지 upgrade·release를 중단한다.

## 3. 빈 격리 환경 restore 훈련

월 1회 application/DB 자격 증명과 volume을 공유하지 않는 별도 host 또는 disposable network에서 PostgreSQL 18의 새 `<name>_restore` DB를 만든다. 운영 DB를 restore target으로 지정하지 않는다.

1. 최신 archive와 manifest를 읽기 전용으로 연결한다.
2. 복구 담당자가 private identity를 임시 read-only secret으로 주입한다. 저장소나 checkout으로 복사하지 않는다.
3. `RESTORE_CONFIRM=empty-disposable`, 별도 DB password, archive basename을 설정해 `/usr/local/bin/lyricscloud-restore`를 실행한다.
4. 도구가 ciphertext checksum, 복호화, `pg_restore --list`, 빈 target, schema version, table counts, 4개 검색 index, forced RLS, CRDT 관계를 모두 확인해야 한다.
5. 같은 owner의 합성 session으로 web·collaboration smoke를 실행하고 원본/복원 CRDT snapshot과 평문 projection fingerprint가 일치하는지 확인한다. 결과에는 fingerprint와 count만 남긴다.
6. 훈련 종료 후 disposable container·network·DB만 제거한다. 운영 archive와 private identity는 제거 대상이 아니다.

손상 archive, 잘못된 key, 비어 있지 않은 DB, `_restore`가 아닌 DB 이름은 실패가 정상이다. 실패 뒤 target을 재사용하지 말고 새 빈 DB를 만든다. 목표 restore RTO는 300초다.

## 4. digest 승인과 upgrade

네 application image마다 CI 성공 SHA의 digest를 승인 목록에 기록한다. 각 digest에서 아래를 확인한다.

```bash
cosign verify \
  --certificate-identity "https://github.com/parking-place/LyricsCloud/.github/workflows/ci.yml@refs/heads/<approved-branch>" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "parkingplace/lyricscloud-<service>@sha256:<approved-digest>"
docker buildx imagetools inspect "parkingplace/lyricscloud-<service>@sha256:<approved-digest>" --format '{{json .Provenance.SLSA.buildDefinition.externalParameters}}'
```

현재 SHA·version·schema와 정상 backup/RPO를 확인한다. 기존 app container를 중지하되 DB volume은 유지하고, 승인한 `migrate@sha256`를 한 번 실행한다. 성공한 뒤 web·collaboration·worker를 모두 승인 digest로 시작한다. container health, 공개 live/ready, 인증 session, 목록·검색·편집·동기화 합성 smoke를 통과한 뒤 이전 app image를 정리한다.

migration은 transaction과 advisory lock을 사용한다. 중간 실패 시 새 app을 시작하지 않고 실패 transaction이 rollback되었는지 schema migration 행과 합성 canary로 확인한다. destructive down migration은 실행하지 않는다.

## 5. rollback과 roll-forward

새 image health/smoke가 실패했지만 schema가 이전 RC와 호환되면 web·collaboration·worker를 함께 중지하고 `config/release-operations.0915.json`의 직전 RC digest로 되돌린다. DB는 그대로 두고 readiness·합성 data canary를 다시 확인한다. 목표 application rollback RTO는 180초다.

schema가 호환되지 않거나 migration commit 뒤 데이터 무결성이 실패하면 현재 DB를 덮어쓰거나 down migration하지 않는다. 신규 쓰기를 중단하고 최신 유효 archive를 **새 빈 DB**에 복원·검증한 후 연결 대상을 전환한다. private identity와 운영 DB password는 공유하지 않는다. 원인 수정 후에는 같은 절차로 새 digest를 다시 승인하고 roll-forward한다.

rollback 완료 기록에는 environment, 이전/실패/복구 SHA와 digest, schema version, 시작·종료 시각, RTO, health/smoke 결과, 익명 error code만 남긴다. 본문·사용자·secret은 남기지 않는다.
